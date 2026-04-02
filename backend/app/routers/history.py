# backend/app/routers/history.py
"""
정비 이력 관리 API 라우터
- 특정 농기계의 정비 이력 조회
- 정비 이력 추가
- 정비 이력 수정
- 정비 이력 삭제
"""

from fastapi import APIRouter, HTTPException
from typing import Optional
from app.database import get_db_connection
from app.models.schemas import MaintenanceHistoryResponse, MessageResponse, MaintenanceRecordCreate
import pymysql

router = APIRouter(prefix="/api/v1/history", tags=["History"])

@router.get("/unverified")
async def get_unverified_records():
    """
    기대번호 검증 실패한 정비 이력 조회 (MVP용)
    
    Returns:
        검증 실패한 정비 이력 목록
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            sql = """
            SELECT 
                log_id,
                vin,
                service_date,
                service_company,
                ai_summary,
                total_cost,
                working_hours,
                vin_validated,
                validation_error,
                created_at
            FROM maintenance_log
            WHERE vin_validated = FALSE
            ORDER BY created_at DESC
            """
            cursor.execute(sql)
            results = cursor.fetchall()
            
            return {
                "success": True,
                "count": len(results),
                "records": results
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"조회 실패: {str(e)}")
    finally:
        conn.close()

@router.get("/machine/{vin}", response_model=MaintenanceHistoryResponse)
async def get_maintenance_records(vin: str):
    """
    특정 농기계의 모든 정비 이력 조회
    
    Args:
        vin: 기대번호
    
    Returns:
        정비 이력 목록 (날짜 역순)
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            # 농기계 기본 정보 조회
            cursor.execute("""
                SELECT 
                    mi.vin,
                    mi.model_id,
                    mi.production_year,
                    mi.total_hours,
                    mm.base_model_name,
                    mf.mfg_name,
                    c.cat_name
                FROM machine_instance mi
                LEFT JOIN machine_master mm ON mi.model_id = mm.model_id
                LEFT JOIN manufacturer_codes mf ON mm.mfg_code = mf.mfg_code
                LEFT JOIN category_codes c ON mm.cat_code = c.cat_code
                WHERE mi.vin = %s
            """, (vin,))
            machine_info = cursor.fetchone()
            
            # 정비 이력 조회 (최신순)
            sql = """
            SELECT 
                log_id,
                vin,
                service_date,
                service_company,
                ai_summary,
                total_cost,
                working_hours
            FROM maintenance_log
            WHERE vin = %s
            ORDER BY service_date DESC, log_id DESC
            """
            cursor.execute(sql, (vin,))
            results = cursor.fetchall()
            
            # 결과를 프론트엔드 형식에 맞게 변환
            records = []
            for row in results:
                # 부품 상세 정보 조회
                cursor.execute("""
                    SELECT 
                        detail_id,
                        part_id,
                        item_name,
                        quantity,
                        part_cost,
                        labor_cost
                    FROM maintenance_detail
                    WHERE log_id = %s
                """, (row['log_id'],))
                
                details = cursor.fetchall()
                
                # 첨부파일 정보 조회
                cursor.execute("""
                    SELECT 
                        attachment_id,
                        file_path,
                        original_name
                    FROM maintenance_attachment
                    WHERE log_id = %s
                    LIMIT 1
                """, (row['log_id'],))
                
                attachment = cursor.fetchone()
                attachment_url = None
                if attachment and attachment['file_path']:
                    # 파일 경로를 URL로 변환 (Windows 경로 처리)
                    import os
                    # file_path에서 uploads 이후 경로 추출
                    file_path = attachment['file_path'].replace('\\', '/')
                    if 'uploads/' in file_path:
                        relative_path = file_path.split('uploads/')[-1]
                        attachment_url = f"http://localhost:8000/uploads/{relative_path}"
                    else:
                        filename = os.path.basename(attachment['file_path'])
                        attachment_url = f"http://localhost:8000/uploads/maintenance_images/{filename}"
                
                # ai_summary에서 작업 유형 추출 (간단한 키워드 매칭)
                description = row['ai_summary'] or ""
                record_type = "정비"  # 기본값
                
                if "유류" in description or "경유" in description or "주입" in description:
                    record_type = "유류"
                elif "교체" in description or "교환" in description:
                    record_type = "부품교체"
                elif "검사" in description or "점검" in description:
                    record_type = "검사"
                
                records.append({
                    "id": str(row['log_id']),
                    "vin": row['vin'],
                    "date": str(row['service_date']) if row['service_date'] else None,
                    "type": record_type,
                    "description": description,
                    "cost": row['total_cost'] or 0,
                    "mileage": row['working_hours'] or 0,
                    "service_date": str(row['service_date']) if row['service_date'] else None,
                    "service_company": row['service_company'] or '',
                    "ai_summary": description,
                    "total_cost": row['total_cost'] or 0,
                    "total_hours": row['working_hours'] or 0,
                    "parts_count": len(details),
                    "details": details,
                    "parts": details,
                    "attachment_url": attachment_url,
                    "image_path": attachment_url  # 프론트엔드 호환성을 위해 추가
                })
            
            # 농기계 기본 정보 포함하여 응답
            response = {
                "records": records,
                "total": len(records)
            }
            
            # 농기계 기본 정보 추가
            if machine_info:
                response["machine_info"] = {
                    "vin": machine_info['vin'],
                    "model": machine_info['base_model_name'] or "⚠️ 모델 정보 없음",
                    "manufacturer": machine_info['mfg_name'] or "알 수 없음",
                    "category": machine_info['cat_name'] or "기타",
                    "year": machine_info['production_year'] or 0,
                    "total_hours": machine_info['total_hours'] or 0
                }
            
            return response
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"조회 중 오류 발생: {str(e)}")
    finally:
        conn.close()


@router.post("/", response_model=MessageResponse)
async def create_maintenance_record(record: MaintenanceRecordCreate):
    """
    새로운 정비 이력 추가
    
    Args:
        record: 정비 이력 생성 요청 데이터
    
    Returns:
        생성된 이력 ID
    """
    vin = record.vin
    service_date = str(record.service_date)
    description = record.description
    cost = record.cost
    mileage = record.mileage
    service_company = getattr(record, 'service_company', None)
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # 해당 농기계가 등록되어 있는지 확인
            cursor.execute("SELECT vin FROM machine_instance WHERE vin = %s", (vin,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="등록되지 않은 농기계입니다.")
            
            # 작업 유형 자동 결정
            record_type = "정비"
            if "유류" in description or "경유" in description or "주입" in description:
                record_type = "유류"
            elif "교체" in description or "교환" in description:
                record_type = "부품교체"
            elif "검사" in description or "점검" in description:
                record_type = "검사"
            
            # 작업 유형을 포함한 설명 생성
            full_description = f"[{record_type}] {description}"
            
            # service_company 컬럼이 있는지 확인하고 추가
            try:
                cursor.execute("SELECT service_company FROM maintenance_log LIMIT 1")
            except:
                cursor.execute("ALTER TABLE maintenance_log ADD COLUMN service_company VARCHAR(100) NULL")
            
            # working_hours 컬럼이 있는지 확인하고 추가
            try:
                cursor.execute("SELECT working_hours FROM maintenance_log LIMIT 1")
            except:
                cursor.execute("ALTER TABLE maintenance_log ADD COLUMN working_hours INT NULL")
            
            sql = """
            INSERT INTO maintenance_log (vin, service_date, total_cost, ai_summary, working_hours, service_company)
            VALUES (%s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (vin, service_date, cost, full_description, mileage, service_company))
            
            # 주행시간 업데이트 (mileage가 제공된 경우)
            if mileage is not None:
                cursor.execute("""
                    UPDATE machine_instance 
                    SET total_hours = %s 
                    WHERE vin = %s
                """, (mileage, vin))
            
            conn.commit()
            
            # 생성된 ID 반환
            record_id = cursor.lastrowid
            
            return MessageResponse(
                message="정비 이력이 추가되었습니다.",
                success=True
            )
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"추가 중 오류 발생: {str(e)}")
    finally:
        conn.close()


@router.put("/{record_id}", response_model=MessageResponse)
async def update_maintenance_record(
    record_id: int,
    date: Optional[str] = None,
    type: Optional[str] = None,
    description: Optional[str] = None,
    cost: Optional[int] = None,
    mileage: Optional[int] = None
):
    """
    기존 정비 이력 수정
    
    Args:
        record_id: 이력 ID
        date: 서비스 날짜 (선택)
        type: 서비스 유형 (선택)
        description: 서비스 설명 (선택)
        cost: 서비스 비용 (선택)
        mileage: 주행거리 (선택)
    
    Returns:
        수정 성공 메시지
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # 기존 이력 조회
            cursor.execute("""
                SELECT vin, service_date, total_cost, ai_summary 
                FROM maintenance_log 
                WHERE log_id = %s
            """, (record_id,))
            
            existing = cursor.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="해당 이력을 찾을 수 없습니다.")
            
            # 업데이트할 값 결정 (제공되지 않은 값은 기존 값 유지)
            new_date = date or existing['service_date']
            new_cost = cost if cost is not None else existing['total_cost']
            
            # 설명 업데이트
            if description and type:
                new_description = f"[{type}] {description}"
            elif description:
                new_description = description
            else:
                new_description = existing['ai_summary']
            
            # 정비 이력 업데이트
            cursor.execute("""
                UPDATE maintenance_log 
                SET service_date = %s, total_cost = %s, ai_summary = %s
                WHERE log_id = %s
            """, (new_date, new_cost, new_description, record_id))
            
            # 주행시간 업데이트
            if mileage is not None:
                cursor.execute("""
                    UPDATE machine_instance 
                    SET total_hours = %s 
                    WHERE vin = %s
                """, (mileage, existing['vin']))
            
            conn.commit()
            
            return MessageResponse(
                message="정비 이력이 수정되었습니다.",
                success=True
            )
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"수정 중 오류 발생: {str(e)}")
    finally:
        conn.close()


@router.delete("/{record_id}", response_model=MessageResponse)
async def delete_maintenance_record(record_id: int):
    """
    정비 이력 삭제
    
    Args:
        record_id: 이력 ID
    
    Returns:
        삭제 성공 메시지
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # 이력 존재 확인
            cursor.execute("SELECT log_id FROM maintenance_log WHERE log_id = %s", (record_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="해당 이력을 찾을 수 없습니다.")
            
            # 이력 삭제
            cursor.execute("DELETE FROM maintenance_log WHERE log_id = %s", (record_id,))
            conn.commit()
            
            return MessageResponse(
                message="정비 이력이 삭제되었습니다.",
                success=True
            )
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"삭제 중 오류 발생: {str(e)}")
    finally:
        conn.close()