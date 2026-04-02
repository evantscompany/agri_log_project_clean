# backend/app/routers/ocr.py
"""
OCR 및 이미지 업로드 API 라우터
- 정비명세서 이미지 업로드 및 압축
- OCR 처리 및 결과 저장
- 이미지 첨부 파일 관리
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from typing import Optional
from datetime import datetime
import os
import uuid
import re
from PIL import Image
import io
from app.database import get_db_connection
from app.services.vin_parser import parse_agri_vin
from app.services.google_vision_ocr import get_vision_ocr_client
from app.services.ocr_parser import parse_maintenance_details, extract_working_hours, parse_service_company

router = APIRouter(prefix="/api/v1/ocr", tags=["OCR"])

# Google Vision OCR 클라이언트 초기화
# .env 파일의 GOOGLE_APPLICATION_CREDENTIALS 환경변수 사용
try:
    credentials_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    vision_ocr = get_vision_ocr_client(credentials_path)
    VISION_API_AVAILABLE = True
except Exception as e:
    print(f"Google Vision API 초기화 실패: {e}")
    vision_ocr = None
    VISION_API_AVAILABLE = False

# 이미지 저장 경로 설정
UPLOAD_DIR = "uploads/maintenance_images"
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}

# 업로드 디렉토리 생성
os.makedirs(UPLOAD_DIR, exist_ok=True)


def compress_image(image_bytes: bytes, max_size_kb: int = 500) -> bytes:
    """
    이미지를 압축하여 용량 줄이기
    
    Args:
        image_bytes: 원본 이미지 바이트
        max_size_kb: 최대 크기 (KB)
    
    Returns:
        압축된 이미지 바이트
    """
    img = Image.open(io.BytesIO(image_bytes))
    
    # RGBA를 RGB로 변환 (PNG 투명도 처리)
    if img.mode in ('RGBA', 'LA', 'P'):
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
        img = background
    
    # 이미지 크기 조정 (긴 쪽 기준 1920px)
    max_dimension = 1920
    if max(img.size) > max_dimension:
        ratio = max_dimension / max(img.size)
        new_size = tuple(int(dim * ratio) for dim in img.size)
        img = img.resize(new_size, Image.Resampling.LANCZOS)
    
    # 압축 품질 조정
    output = io.BytesIO()
    quality = 85
    
    while quality > 20:
        output.seek(0)
        output.truncate()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        
        if output.tell() <= max_size_kb * 1024:
            break
        quality -= 5
    
    return output.getvalue()


@router.post("/upload-image")
async def upload_maintenance_image(
    file: UploadFile = File(...),
    vin: Optional[str] = Form(None),
    log_id: Optional[int] = Form(None)
):
    """
    정비명세서 이미지 업로드 및 압축
    
    Args:
        file: 업로드할 이미지 파일
        vin: 기대번호 (선택)
        log_id: 정비 이력 ID (선택, 기존 이력에 첨부 시)
    
    Returns:
        업로드된 파일 정보 및 경로
    """
    # 파일 확장자 검증
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"지원하지 않는 파일 형식입니다. 허용: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    try:
        # 파일 읽기
        contents = await file.read()
        
        # 파일 크기 검증
        if len(contents) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail="파일 크기가 너무 큽니다. (최대 10MB)")
        
        # 이미지 압축
        compressed_image = compress_image(contents, max_size_kb=500)
        
        # 고유 파일명 생성
        unique_filename = f"{uuid.uuid4().hex}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # 압축된 이미지 저장
        with open(file_path, 'wb') as f:
            f.write(compressed_image)
        
        # 파일 정보
        file_info = {
            "original_name": file.filename,
            "saved_path": file_path,
            "file_size": len(compressed_image),
            "compressed": True,
            "upload_time": datetime.now().isoformat()
        }
        
        # log_id가 제공된 경우 DB에 첨부 파일 정보 저장
        if log_id:
            conn = get_db_connection()
            try:
                with conn.cursor() as cursor:
                    # 정비 이력 존재 확인
                    cursor.execute("SELECT log_id FROM maintenance_log WHERE log_id = %s", (log_id,))
                    if not cursor.fetchone():
                        raise HTTPException(status_code=404, detail="해당 정비 이력을 찾을 수 없습니다.")
                    
                    # 첨부 파일 정보 저장
                    cursor.execute("""
                        INSERT INTO maintenance_attachment 
                        (log_id, file_path, original_name, file_size, attachment_type, ocr_status)
                        VALUES (%s, %s, %s, %s, 'INVOICE', 'READY')
                    """, (log_id, file_path, file.filename, len(compressed_image)))
                    
                    conn.commit()
                    attachment_id = cursor.lastrowid
                    file_info["attachment_id"] = attachment_id
            finally:
                conn.close()
        
        return {
            "success": True,
            "message": "이미지가 성공적으로 업로드되었습니다.",
            "file_info": file_info
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 업로드 중 오류 발생: {str(e)}")


@router.post("/process-ocr")
async def process_ocr_and_save(
    vin: str = Form(...),
    date: str = Form(...),
    description: str = Form(...),
    cost: int = Form(...),
    mileage: Optional[int] = Form(None),
    image_path: Optional[str] = Form(None),
    ocr_text: Optional[str] = Form(None)
):
    """
    OCR로 추출한 데이터를 검증하고 DB에 저장
    
    Args:
        vin: 기대번호 (필수, 검증됨)
        date: 작업 날짜
        description: 작업 내용
        cost: 비용
        mileage: 주행시간 (선택)
        image_path: 업로드된 이미지 경로 (선택)
        ocr_text: OCR 원본 텍스트 (선택)
    
    Returns:
        저장된 정비 이력 정보
    """
    # 기대번호 검증 (실패해도 계속 진행 - MVP용)
    vin_result = parse_agri_vin(vin)
    vin_validated = vin_result["success"]
    validation_error = None if vin_validated else vin_result.get('message', '기대번호 형식 오류')
    
    if not vin_validated:
        print(f"⚠️ 기대번호 검증 실패 (저장은 계속): {vin} - {validation_error}")
    
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # 농기계 인스턴스 존재 확인
            cursor.execute("SELECT vin FROM machine_instance WHERE vin = %s", (vin,))
            machine_exists = cursor.fetchone()
            
            # 농기계가 없으면 자동 등록 시도 (VIN 검증 여부와 무관하게 시도)
            if not machine_exists:
                try:
                    # parse_agri_vin 함수를 사용하여 VIN 파싱
                    vin_parse_result = parse_agri_vin(vin)
                    
                    if vin_parse_result['success']:
                        # VIN 파싱 성공 - 모델 정보 있음
                        model_id = vin_parse_result['data']['model_id']
                        production_year = vin_parse_result['data']['production_year']
                        
                        cursor.execute("""
                            INSERT INTO machine_instance (vin, model_id, production_year, total_hours)
                            VALUES (%s, %s, %s, %s)
                        """, (vin, model_id, production_year, mileage or 0))
                        print(f"✅ 농기계 자동 등록 성공 (모델 정보 있음): {vin} - {vin_parse_result['data']['model_name']}")
                    else:
                        # VIN 파싱 실패 - 모델 정보 없음
                        # 연식만이라도 추출 시도
                        production_year = None
                        try:
                            if len(vin) >= 8:
                                year_code = vin[6:8]
                                production_year = 2000 + int(year_code)
                        except:
                            pass
                        
                        cursor.execute("""
                            INSERT INTO machine_instance (vin, model_id, production_year, total_hours)
                            VALUES (%s, NULL, %s, %s)
                        """, (vin, production_year, mileage or 0))
                        print(f"⚠️ 농기계 등록 성공 (모델 정보 없음): {vin} - {vin_parse_result.get('message', 'VIN 파싱 실패')}")
                        validation_error = f"{validation_error or ''} | 모델 정보 없음: {vin_parse_result.get('message', '')}".strip(' |')
                        
                except Exception as e:
                    print(f"⚠️ 농기계 자동 등록 실패 (저장은 계속): {vin} - {str(e)}")
                    validation_error = f"{validation_error or ''} | 자동 등록 실패: {str(e)}".strip(' |')
            
            # OCR 텍스트에서 가동시간 추출 (mileage가 없는 경우)
            extracted_hours = mileage
            service_company = None
            if not extracted_hours and ocr_text:
                extracted_hours = extract_working_hours(ocr_text)
                if extracted_hours:
                    print(f"OCR에서 가동시간 추출: {extracted_hours}시간 (VIN: {vin})")
            
            # OCR 텍스트에서 정비업체 추출
            if ocr_text:
                service_company = parse_service_company(ocr_text)
                if service_company:
                    print(f"OCR에서 정비업체 추출: {service_company} (VIN: {vin})")
            
            # 정비 이력 저장 (OCR로 추출된 가동시간 및 정비업체 포함)
            # working_hours 컬럼이 없으면 동적으로 추가
            try:
                cursor.execute("SELECT working_hours FROM maintenance_log LIMIT 1")
                has_working_hours_column = True
            except:
                # working_hours 컬럼이 없으면 추가
                cursor.execute("ALTER TABLE maintenance_log ADD COLUMN working_hours INT NULL")
                has_working_hours_column = False
            
            # service_company 컬럼이 없으면 동적으로 추가
            try:
                cursor.execute("SELECT service_company FROM maintenance_log LIMIT 1")
                has_service_company_column = True
            except:
                # service_company 컬럼이 없으면 추가
                cursor.execute("ALTER TABLE maintenance_log ADD COLUMN service_company VARCHAR(100) NULL")
                has_service_company_column = False
            
            # vin_validated 컬럼이 없으면 동적으로 추가
            try:
                cursor.execute("SELECT vin_validated FROM maintenance_log LIMIT 1")
            except:
                cursor.execute("ALTER TABLE maintenance_log ADD COLUMN vin_validated BOOLEAN DEFAULT TRUE")
                cursor.execute("ALTER TABLE maintenance_log ADD COLUMN validation_error TEXT NULL")
                print("✅ maintenance_log 테이블에 검증 상태 컬럼 추가 완료")
            
            cursor.execute("""
                INSERT INTO maintenance_log 
                (vin, service_date, total_cost, ai_summary, working_hours, service_company, vin_validated, validation_error)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (vin, date, cost, description, extracted_hours, service_company, vin_validated, validation_error))
            
            log_id = cursor.lastrowid
            
            # 주행시간 업데이트 (OCR로 추출된 시간이 더 크면 업데이트)
            if extracted_hours is not None:
                cursor.execute("""
                    UPDATE machine_instance 
                    SET total_hours = GREATEST(total_hours, %s)
                    WHERE vin = %s
                """, (extracted_hours, vin))
            
            # 이미지가 있으면 첨부 파일 정보 저장
            if image_path and os.path.exists(image_path):
                file_size = os.path.getsize(image_path)
                original_name = os.path.basename(image_path)
                
                # OCR 결과 JSON 생성 (한글 인코딩 문제 해결)
                ocr_result_json = None
                if ocr_text:
                    import json
                    ocr_result_json = json.dumps({
                        "raw_text": ocr_text
                    }, ensure_ascii=False)
                
                cursor.execute("""
                    INSERT INTO maintenance_attachment 
                    (log_id, file_path, original_name, file_size, attachment_type, ocr_status, ocr_result)
                    VALUES (%s, %s, %s, %s, 'INVOICE', 'DONE', %s)
                """, (log_id, image_path, original_name, file_size, ocr_result_json))
            
            # OCR 텍스트에서 정비 상세 내역 추출 및 저장
            attachment_id = None
            if image_path and os.path.exists(image_path):
                attachment_id = cursor.lastrowid
            
            if ocr_text:
                try:
                    details = parse_maintenance_details(ocr_text)
                    
                    # OCR 원본 파싱 데이터 저장 (향후 파싱 로직 개선용)
                    import json
                    parsed_data_json = json.dumps({
                        "vin": vin,
                        "service_date": date,
                        "total_cost": cost,
                        "description": description,
                        "working_hours": extracted_hours,
                        "service_company": service_company,
                        "parts": details
                    }, ensure_ascii=False)
                    
                    parsing_status = 'SUCCESS' if len(details) > 0 else 'PARTIAL'
                    confidence_score = min(1.0, len(details) / 5.0) if details else 0.5
                    
                    cursor.execute("""
                        INSERT INTO ocr_raw_data 
                        (log_id, attachment_id, raw_text, parsed_data, image_path, parsing_version, 
                         parsing_status, extracted_vin, extracted_service_date, 
                         extracted_total_cost, extracted_parts_count, confidence_score)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        log_id, attachment_id, ocr_text, parsed_data_json, image_path, "2.0",
                        parsing_status, vin, date, cost, len(details), confidence_score
                    ))
                    
                    print(f"OCR 원본 데이터 저장 완료 (파싱 버전: 2.0, 부품: {len(details)}개)")
                    
                    # 추출된 부품 정보를 maintenance_detail 테이블에 저장
                    for detail in details:
                        # part_list 매칭된 정보 우선 사용
                        item_name = detail.get('matched_part_name', 
                                       f"{detail.get('part_number', '')} {detail.get('part_name', '')}".strip())
                        part_cost = detail.get('base_price', detail.get('total_price', 0))
                        
                        cursor.execute("""
                            INSERT INTO maintenance_detail 
                            (log_id, part_id, item_name, part_cost, quantity, labor_cost)
                            VALUES (%s, %s, %s, %s, %s, %s)
                        """, (
                            log_id,
                            detail.get('part_id'),  # part_id 저장 (None일 수 있음)
                            item_name,
                            part_cost,
                            detail.get('quantity', 1),
                            detail.get('base_labor', 0)  # base_labor 저장
                        ))
                    
                    print(f"정비 상세 내역 {len(details)}건 저장 완료 (part_list 매칭 적용)")
                except Exception as e:
                    print(f"정비 상세 내역 파싱 오류: {e}")
                    # 파싱 실패 시에도 OCR 원본 데이터는 저장
                    import json
                    cursor.execute("""
                        INSERT INTO ocr_raw_data 
                        (log_id, attachment_id, raw_text, image_path, parsing_status, 
                         extracted_vin, extracted_service_date, extracted_total_cost, 
                         extracted_parts_count, error_message)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (log_id, attachment_id, ocr_text, image_path, "FAILED", 
                          vin, date, cost, 0, str(e)))
                    print(f"OCR 원본 데이터 저장 완료 (파싱 실패, 오류 기록됨)")
                    # 파싱 실패해도 메인 이력은 저장되도록 계속 진행
            
            conn.commit()
            
            return {
                "success": True,
                "message": "정비 이력이 성공적으로 저장되었습니다.",
                "log_id": log_id,
                "vin": vin,
                "machine_info": vin_result["data"]
            }
    
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"저장 중 오류 발생: {str(e)}")
    finally:
        conn.close()


@router.post("/google-vision-ocr")
async def process_google_vision_ocr(
    file: UploadFile = File(...)
):
    """
    Google Vision API를 사용한 OCR 처리
    
    Args:
        file: 업로드할 이미지 파일
    
    Returns:
        OCR 결과 (텍스트, 신뢰도, 블록 정보)
    """
    if not VISION_API_AVAILABLE or vision_ocr is None:
        raise HTTPException(
            status_code=503,
            detail="Google Vision API를 사용할 수 없습니다. 인증 정보를 확인해주세요."
        )
    
    # 파일 확장자 검증
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 파일 형식입니다. 허용: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    try:
        # 파일 읽기
        contents = await file.read()
        
        # 파일 크기 검증
        if len(contents) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail="파일 크기가 너무 큽니다. (최대 10MB)")
        
        # 이미지 압축 및 저장
        compressed_image = compress_image(contents)
        
        # 고유 파일명 생성
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4().hex[:32])
        file_name = f"{unique_id}_{timestamp}.jpg"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        
        # 파일 저장
        with open(file_path, 'wb') as f:
            f.write(compressed_image)
        
        # Google Vision API로 OCR 처리
        ocr_result = vision_ocr.extract_text_from_bytes(contents)
        
        if not ocr_result['success']:
            raise HTTPException(
                status_code=500,
                detail=f"OCR 처리 실패: {ocr_result.get('error', '알 수 없는 오류')}"
            )
        
        # OCR 텍스트 파싱
        ocr_text = ocr_result['text']
        parsed_data = {}
        
        try:
            # 줄바꿈을 공백으로 변환하여 파싱 용이하게 처리
            text_for_parsing = ocr_text.replace('\n', ' ').replace('\r', ' ')
            lines = ocr_text.split('\n')
            
            # 기대번호 추출 (여러 패턴 시도)
            vin = None
            
            # 패턴 1: 기대번호와 같은 라인에 있는 경우
            vin_match = re.search(r'기대번호[:\s]*([A-Z]{2}\d{9,13})', text_for_parsing, re.IGNORECASE)
            if vin_match:
                vin = vin_match.group(1).upper()
            else:
                # 패턴 2: 기대번호 다음 라인에 있는 경우
                for i, line in enumerate(lines):
                    if '기대번호' in line and i + 1 < len(lines):
                        next_line = lines[i + 1].strip()
                        # 다음 라인에서 기대번호 형식 찾기
                        vin_match = re.search(r'([A-Z]{2}\d{9,13})', next_line, re.IGNORECASE)
                        if vin_match:
                            vin = vin_match.group(1).upper()
                            break
                        # 공백 포함 패턴 (Di 0060240001)
                        vin_match = re.search(r'([A-Z]{2})\s*(\d{9,13})', next_line, re.IGNORECASE)
                        if vin_match:
                            vin = (vin_match.group(1) + vin_match.group(2)).upper()
                            break
            
            # 패턴 3: 전체 텍스트에서 기대번호 형식 찾기
            if not vin:
                vin_match = re.search(r'\b([A-Z]{2}\d{9,13})\b', ocr_text, re.IGNORECASE)
                if vin_match:
                    vin = vin_match.group(1).upper()
            
            if vin:
                parsed_data['vin'] = vin
                print(f"[파싱] 기대번호 추출: {vin}")
            
            # 가동시간 추출
            hours = extract_working_hours(ocr_text)
            if hours:
                parsed_data['working_hours'] = hours
                print(f"[파싱] 가동시간 추출: {hours}h")
            
            # 정비업체 추출
            company = parse_service_company(ocr_text)
            if company:
                parsed_data['service_company'] = company
                print(f"[파싱] 정비업체 추출: {company}")
            
            # 총비용 추출 (개선된 로직)
            total_cost = None
            
            # 패턴 1: 최종 합계, 합계 등의 키워드 찾기
            cost_patterns = [
                r'최종[\s]*합계[:\s]*([\d,]+)',
                r'합계[:\s]*([\d,]+)',
                r'총액[:\s]*([\d,]+)',
            ]
            for pattern in cost_patterns:
                match = re.search(pattern, text_for_parsing, re.IGNORECASE)
                if match:
                    cost_str = match.group(1).replace(',', '')
                    total_cost = int(cost_str)
                    print(f"[파싱] 총비용 추출 (키워드): {total_cost:,}원")
                    break
            
            # 패턴 2: 라인별로 찾기
            if not total_cost:
                for i, line in enumerate(lines):
                    if any(keyword in line for keyword in ['최종', '합계', '총액']):
                        # 현재 라인에서 금액 찾기
                        amounts = re.findall(r'([\d,]+)', line)
                        if amounts:
                            for amount in reversed(amounts):
                                cost_str = amount.replace(',', '')
                                if len(cost_str) >= 4:  # 최소 4자리
                                    total_cost = int(cost_str)
                                    print(f"[파싱] 총비용 추출 (라인): {total_cost:,}원")
                                    break
                        if total_cost:
                            break
                        
                        # 다음 라인에서 금액 찾기
                        if i + 1 < len(lines):
                            next_line = lines[i + 1]
                            amounts = re.findall(r'([\d,]+)', next_line)
                            if amounts:
                                for amount in reversed(amounts):
                                    cost_str = amount.replace(',', '')
                                    if len(cost_str) >= 4:
                                        total_cost = int(cost_str)
                                        print(f"[파싱] 총비용 추출 (다음 라인): {total_cost:,}원")
                                        break
                            if total_cost:
                                break
            
            if total_cost:
                parsed_data['total_cost'] = total_cost
            
            # 부품 정보 파싱
            parts = parse_maintenance_details(ocr_text)
            if parts:
                parsed_data['parts'] = parts
                print(f"[파싱] 부품 정보 추출: {len(parts)}개")
            
            print(f"[파싱 완료] VIN: {parsed_data.get('vin', 'N/A')}, 비용: {parsed_data.get('total_cost', 'N/A')}, 부품: {len(parsed_data.get('parts', []))}개")
            
        except Exception as e:
            print(f"파싱 오류: {e}")
            import traceback
            traceback.print_exc()
            parsed_data = {}
        
        return {
            "success": True,
            "text": ocr_result['text'],
            "confidence": ocr_result['confidence'],
            "blocks": ocr_result['blocks'],
            "parsed_data": parsed_data,
            "image_path": file_path,
            "image_url": f"http://localhost:8000/{file_path}",
            "message": "OCR 처리가 완료되었습니다."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR 처리 중 오류 발생: {str(e)}")


@router.get("/attachments/{log_id}")
async def get_maintenance_attachments(log_id: int):
    """
    특정 정비 이력의 첨부 파일 목록 조회
    
    Args:
        log_id: 정비 이력 ID
    
    Returns:
        첨부 파일 목록
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    attachment_id,
                    file_path,
                    original_name,
                    file_size,
                    attachment_type,
                    ocr_status,
                    created_at
                FROM maintenance_attachment
                WHERE log_id = %s
                ORDER BY created_at DESC
            """, (log_id,))
            
            attachments = cursor.fetchall()
            
            return {
                "attachments": [
                    {
                        "id": att['attachment_id'],
                        "file_path": att['file_path'],
                        "original_name": att['original_name'],
                        "file_size": att['file_size'],
                        "type": att['attachment_type'],
                        "ocr_status": att['ocr_status'],
                        "created_at": str(att['created_at'])
                    }
                    for att in attachments
                ],
                "total": len(attachments)
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"조회 중 오류 발생: {str(e)}")
    finally:
        conn.close()
