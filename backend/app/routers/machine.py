# backend/app/routers/machine.py
"""
농기계 관리 API 라우터
- 농기계 목록 조회
- 농기계 상세 정보 조회 (VIN 기반)
- 농기계 등록
"""

from fastapi import APIRouter, HTTPException
from app.services.vin_parser import parse_agri_vin
from app.database import get_db_connection
from app.utils.qr_generator import generate_machine_qr_code, generate_simple_vin_qr
from app.models.schemas import MachineDetail, MachineList, MessageResponse, QRCodeResponse, QRCodeListResponse

router = APIRouter(prefix="/api/v1/machines", tags=["Machine"])


@router.get("/all-machines", response_model=MachineList)
async def get_all_machines_list():
    """
    가격 예측을 위한 모든 농기계 목록 조회 (소프트 삭제된 농기계 포함)
    
    Returns:
        - machines: 농기계 목록 (각 농기계의 기본 정보 + 통계)
        - total: 총 농기계 수
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # 모든 농기계 목록과 각 농기계의 통계 정보를 한 번에 조회 (삭제된 농기계 포함)
            sql = """
            SELECT 
                mi.vin,
                mm.base_model_name as model,
                mf.mfg_name as manufacturer,
                c.cat_name as category,
                mi.production_year as year,
                mi.total_hours,
                mi.is_deleted,
                mi.deleted_at,
                COUNT(ml.log_id) as total_records,
                COALESCE(SUM(ml.total_cost), 0) as total_cost,
                MAX(ml.service_date) as last_maintenance
            FROM machine_instance mi
            LEFT JOIN machine_master mm ON mi.model_id = mm.model_id
            LEFT JOIN manufacturer_codes mf ON mm.mfg_code = mf.mfg_code
            LEFT JOIN category_codes c ON mm.cat_code = c.cat_code
            LEFT JOIN maintenance_log ml ON mi.vin = ml.vin
            GROUP BY mi.vin, mm.base_model_name, mf.mfg_name, c.cat_name, mi.production_year, mi.total_hours, mi.is_deleted, mi.deleted_at
            ORDER BY mi.vin
            """
            cursor.execute(sql)
            results = cursor.fetchall()
            
            # 결과를 프론트엔드 형식에 맞게 변환
            machines = []
            for row in results:
                machines.append({
                    "id": row['vin'],  # 프론트엔드에서 id로 사용
                    "vin": row['vin'],
                    "name": row['category'] or "농기계",  # 기종을 이름으로 사용
                    "type": row['category'] or "기타",
                    "model": row['model'] or "알 수 없음",
                    "manufacturer": row['manufacturer'] or "알 수 없음",
                    "year": row['year'] or 0,
                    "image": f"https://images.unsplash.com/photo-1652938109589-3700f25e5659?w=400",  # 기본 이미지
                    "totalRecords": row['total_records'],
                    "totalCost": row['total_cost'],
                    "lastMaintenance": str(row['last_maintenance']) if row['last_maintenance'] else None,
                    "totalHours": row['total_hours'] or 0,
                    "is_deleted": row['is_deleted'] or False,
                    "deleted_at": str(row['deleted_at']) if row['deleted_at'] else None
                })
            
            return {
                "machines": machines,
                "total": len(machines)
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"조회 중 오류 발생: {str(e)}")
    finally:
        conn.close()


@router.get("", response_model=MachineList)
async def get_machines_list():
    """
    등록된 모든 농기계 목록 조회
    
    Returns:
        - machines: 농기계 목록 (각 농기계의 기본 정보 + 통계)
        - total: 총 농기계 수
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # 농기계 목록과 각 농기계의 통계 정보를 한 번에 조회
            sql = """
            SELECT 
                mi.vin,
                mm.base_model_name as model,
                mf.mfg_name as manufacturer,
                c.cat_name as category,
                mi.production_year as year,
                mi.total_hours,
                COUNT(ml.log_id) as total_records,
                COALESCE(SUM(ml.total_cost), 0) as total_cost,
                MAX(ml.service_date) as last_maintenance
            FROM machine_instance mi
            LEFT JOIN machine_master mm ON mi.model_id = mm.model_id
            LEFT JOIN manufacturer_codes mf ON mm.mfg_code = mf.mfg_code
            LEFT JOIN category_codes c ON mm.cat_code = c.cat_code
            LEFT JOIN maintenance_log ml ON mi.vin = ml.vin
            WHERE mi.is_deleted = FALSE OR mi.is_deleted IS NULL
            GROUP BY mi.vin, mm.base_model_name, mf.mfg_name, c.cat_name, mi.production_year, mi.total_hours
            ORDER BY mi.vin
            """
            cursor.execute(sql)
            results = cursor.fetchall()
            
            # 결과를 프론트엔드 형식에 맞게 변환
            machines = []
            for row in results:
                # 모델 정보가 없는 경우 표시
                model_name = row['model'] if row['model'] else "모델 정보 없음"
                manufacturer_name = row['manufacturer'] if row['manufacturer'] else "알 수 없음"
                category_name = row['category'] if row['category'] else "기타"
                
                machines.append({
                    "id": row['vin'],  # 프론트엔드에서 id로 사용
                    "vin": row['vin'],
                    "name": category_name,  # 기종을 이름으로 사용
                    "type": category_name,
                    "model": model_name,
                    "manufacturer": manufacturer_name,
                    "year": row['year'] or 0,
                    "image": f"https://images.unsplash.com/photo-1652938109589-3700f25e5659?w=400",  # 기본 이미지
                    "totalRecords": row['total_records'],
                    "totalCost": row['total_cost'],
                    "lastMaintenance": str(row['last_maintenance']) if row['last_maintenance'] else None,
                    "totalHours": row['total_hours'] or 0
                })
            
            return {
                "machines": machines,
                "total": len(machines)
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"조회 중 오류 발생: {str(e)}")
    finally:
        conn.close()


@router.get("/{vin_code}", response_model=MachineDetail)
async def get_machine_detail(vin_code: str):
    """
    특정 농기계의 상세 정보 조회 (VIN 기반)
    - 모델 정보가 없어도 DB에 등록된 경우 조회 가능
    
    Args:
        vin_code: 기대번호 (VIN)
    
    Returns:
        농기계 상세 정보 (기본 정보 + 통계)
    """
    # VIN 길이 검증
    if len(vin_code) < 10:
        raise HTTPException(status_code=400, detail="기대번호가 너무 짧습니다.")
    
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # 농기계 인스턴스 정보 조회 (모델 정보 포함)
            sql = """
            SELECT 
                mi.vin,
                mi.model_id,
                mi.production_year,
                mi.total_hours,
                mm.base_model_name as model,
                mf.mfg_name as manufacturer,
                c.cat_name as category,
                COUNT(ml.log_id) as total_records,
                COALESCE(SUM(ml.total_cost), 0) as total_cost,
                MAX(ml.service_date) as last_maintenance
            FROM machine_instance mi
            LEFT JOIN machine_master mm ON mi.model_id = mm.model_id
            LEFT JOIN manufacturer_codes mf ON mm.mfg_code = mf.mfg_code
            LEFT JOIN category_codes c ON mm.cat_code = c.cat_code
            LEFT JOIN maintenance_log ml ON mi.vin = ml.vin
            WHERE mi.vin = %s
            GROUP BY mi.vin, mi.model_id, mi.production_year, mi.total_hours, mm.base_model_name, mf.mfg_name, c.cat_name
            """
            cursor.execute(sql, (vin_code,))
            instance = cursor.fetchone()
            
            if not instance:
                # DB에 없으면 VIN 파싱 시도
                result = parse_agri_vin(vin_code)
                if not result["success"]:
                    raise HTTPException(status_code=404, detail=result["message"])
                
                machine_data = result["data"]
                machine_data["id"] = vin_code
                machine_data["vin"] = vin_code
                machine_data["totalRecords"] = 0
                machine_data["totalCost"] = 0
                machine_data["lastMaintenance"] = None
                machine_data["totalHours"] = 0
                machine_data["hasModelInfo"] = True
                return machine_data
            
            # DB에 있는 경우
            if instance['model_id']:
                # 모델 정보가 있는 경우
                machine_data = {
                    "id": instance['vin'],
                    "vin": instance['vin'],
                    "model": instance['model'] or "알 수 없음",
                    "manufacturer": instance['manufacturer'] or "알 수 없음",
                    "category": instance['category'] or "기타",
                    "year": instance['production_year'] or 0,
                    "totalRecords": instance['total_records'],
                    "totalCost": instance['total_cost'],
                    "lastMaintenance": str(instance['last_maintenance']) if instance['last_maintenance'] else None,
                    "totalHours": instance['total_hours'] or 0,
                    "hasModelInfo": True
                }
            else:
                # 모델 정보가 없는 경우
                machine_data = {
                    "id": instance['vin'],
                    "vin": instance['vin'],
                    "model": "⚠️ 모델 정보 없음",
                    "manufacturer": "알 수 없음",
                    "category": "기타",
                    "year": instance['production_year'] or 0,
                    "totalRecords": instance['total_records'],
                    "totalCost": instance['total_cost'],
                    "lastMaintenance": str(instance['last_maintenance']) if instance['last_maintenance'] else None,
                    "totalHours": instance['total_hours'] or 0,
                    "hasModelInfo": False
                }
            
            return machine_data
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"조회 중 오류 발생: {str(e)}")
    finally:
        conn.close()


@router.get("/parse-vin/{vin}")
async def parse_vin(vin: str):
    """
    기대번호(VIN)를 파싱하여 모델 정보 조회
    
    Args:
        vin: 기대번호
    
    Returns:
        모델명, 제조사, 연식 등의 정보
    """
    # VIN 파싱
    result = parse_agri_vin(vin)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("message", "유효하지 않은 기대번호입니다."))
    
    return {
        "success": True,
        "data": result["data"]
    }


@router.delete("/{vin_code}", response_model=MessageResponse)
async def delete_machine(vin_code: str):
    """
    농기계 소프트 삭제 (VIN 기반)
    - 기대번호와 모든 정보는 보존, 대시보드에서만 숨김 처리
    
    Args:
        vin_code: 기대번호 (VIN)
    
    Returns:
        삭제 결과 메시지
    """
    # VIN 길이 검증
    if len(vin_code) < 10:
        raise HTTPException(status_code=400, detail="기대번호가 너무 짧습니다.")
    
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # 농기계가 존재하는지 확인
            cursor.execute("SELECT COUNT(*) as count FROM machine_instance WHERE vin = %s", (vin_code,))
            machine_exists = cursor.fetchone()
            
            if machine_exists['count'] == 0:
                raise HTTPException(status_code=404, detail="삭제할 농기계를 찾을 수 없습니다.")
            
            # 관련 정비 이력 수 확인 (안내용)
            cursor.execute("SELECT COUNT(*) as count FROM maintenance_log WHERE vin = %s", (vin_code,))
            maintenance_count = cursor.fetchone()
            
            # 중요: 기대번호와 모든 정보를 보존, 대시보드에서만 숨김 처리
            # is_deleted 플래그 추가 (컬럼이 없으면 ALTER TABLE로 추가)
            try:
                cursor.execute("SELECT is_deleted FROM machine_instance WHERE vin = %s", (vin_code,))
            except:
                # is_deleted 컬럼이 없으면 추가
                cursor.execute("ALTER TABLE machine_instance ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE")
                cursor.execute("ALTER TABLE machine_instance ADD COLUMN deleted_at DATETIME NULL")
            
            # 소프트 삭제 처리
            cursor.execute("""
                UPDATE machine_instance 
                SET is_deleted = TRUE, deleted_at = NOW() 
                WHERE vin = %s
            """, (vin_code,))
            
            conn.commit()
            
            message = "농기계가 대시보드에서 삭제되었습니다."
            if maintenance_count['count'] > 0:
                message += f"\n✅ 정비 이력 {maintenance_count['count']}건과 기대번호 정보는 완전히 보존됩니다."
            message += "\n✅ 트랙터 모델 정보도 그대로 유지됩니다."
            
            return MessageResponse(
                message=message,
                success=True
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"농기계 삭제 중 오류 발생: {str(e)}")
    finally:
        conn.close()


@router.post("/register", response_model=MessageResponse)
async def register_machine(vin: str, production_year: int = None):
    """
    새로운 농기계 등록
    
    Args:
        vin: 기대번호
        production_year: 생산연식 (선택)
    
    Returns:
        등록 성공 메시지
    """
    # VIN 파싱으로 모델 정보 확인
    result = parse_agri_vin(vin)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail="유효하지 않은 기대번호입니다.")
    
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # 이미 등록된 농기계인지 확인 (소프트 삭제된 경우 제외)
            cursor.execute("""
                SELECT vin, is_deleted FROM machine_instance 
                WHERE vin = %s
            """, (vin,))
            existing_machine = cursor.fetchone()
            
            if existing_machine:
                # 소프트 삭제된 경우: 복구 처리
                if existing_machine['is_deleted'] == True:
                    cursor.execute("""
                        UPDATE machine_instance 
                        SET is_deleted = FALSE, deleted_at = NULL
                        WHERE vin = %s
                    """, (vin,))
                    
                    conn.commit()
                    
                    return MessageResponse(
                        message="농기계가 성공적으로 복구되었습니다. 기존 정비 이력을 확인할 수 있습니다.",
                        success=True
                    )
                # 활성 상태인 경우: 등록 불가
                else:
                    raise HTTPException(status_code=409, detail="이미 등록된 농기계입니다.")
            
            # model_id 조회 (VIN에서 추출한 정보로)
            vin_upper = vin.upper()
            mfg = vin_upper[0]
            cat = vin_upper[1]
            ident = vin_upper[2:6]  # 올바른 모델 코드 추출 (4자리)
            
            cursor.execute("""
                SELECT model_id FROM machine_master 
                WHERE UPPER(mfg_code) = %s 
                  AND UPPER(cat_code) = %s 
                  AND UPPER(model_identifier) = %s
            """, (mfg, cat, ident))
            
            model_result = cursor.fetchone()
            if not model_result:
                raise HTTPException(status_code=404, detail="모델 정보를 찾을 수 없습니다.")
            
            model_id = model_result['model_id']
            
            # 생산연식이 없으면 VIN에서 추출
            if production_year is None:
                year_code = vin_upper[-6:-4]
                production_year = 2000 + int(year_code)
            
            # 농기계 인스턴스 등록
            cursor.execute("""
                INSERT INTO machine_instance (vin, model_id, production_year, total_hours)
                VALUES (%s, %s, %s, 0)
            """, (vin, model_id, production_year))
            
            conn.commit()
            
            return MessageResponse(
                message="농기계가 성공적으로 등록되었습니다.",
                success=True
            )
    
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"등록 중 오류 발생: {str(e)}")
    finally:
        conn.close()


@router.get("/{vin}/qr-code", response_model=QRCodeResponse)
async def generate_machine_qr(vin: str):
    """
    특정 농기계의 QR 코드 생성
    
    Args:
        vin: 기대번호
    
    Returns:
        QR 코드 이미지 (base64)와 농기계 정보
    """
    # VIN 파싱으로 모델 정보 확인
    result = parse_agri_vin(vin)
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail="유효하지 않은 기대번호입니다.")
    
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # 농기계 인스턴스 정보 조회
            cursor.execute("""
                SELECT mi.vin, mi.total_hours, mi.production_year,
                       mm.base_model_name, mf.mfg_name, c.cat_name
                FROM machine_instance mi
                LEFT JOIN machine_master mm ON mi.model_id = mm.model_id
                LEFT JOIN manufacturer_codes mf ON mm.mfg_code = mf.mfg_code
                LEFT JOIN category_codes c ON mm.cat_code = c.cat_code
                WHERE mi.vin = %s
            """, (vin,))
            
            machine_instance = cursor.fetchone()
            
            if machine_instance:
                # 인스턴스 정보로 QR 코드 생성
                machine_info = {
                    "base_model_name": machine_instance['base_model_name'],
                    "mfg_name": machine_instance['mfg_name'],
                    "cat_name": machine_instance['cat_name'],
                    "production_year": machine_instance['production_year'],
                    "total_hours": machine_instance['total_hours']
                }
                qr_code = generate_machine_qr_code(vin, machine_info)
            else:
                # 인스턴스가 없으면 파싱 정보로 QR 코드 생성
                machine_info = result["data"]
                qr_code = generate_simple_vin_qr(vin)
            
            return QRCodeResponse(
                vin=vin,
                qr_code=qr_code,
                machine_info=machine_info if machine_instance else result["data"]
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"QR 코드 생성 중 오류 발생: {str(e)}")
    finally:
        conn.close()


@router.get("/qr-codes/all", response_model=QRCodeListResponse)
async def get_all_machine_qr_codes():
    """
    모든 등록된 농기계의 QR 코드 목록 조회
    
    Returns:
        농기계별 QR 코드 정보 목록
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # 등록된 모든 농기계 조회
            cursor.execute("""
                SELECT mi.vin, mi.total_hours, mi.production_year,
                       mm.base_model_name, mf.mfg_name, c.cat_name
                FROM machine_instance mi
                LEFT JOIN machine_master mm ON mi.model_id = mm.model_id
                LEFT JOIN manufacturer_codes mf ON mm.mfg_code = mf.mfg_code
                LEFT JOIN category_codes c ON mm.cat_code = c.cat_code
                ORDER BY mi.vin
            """)
            
            machines = cursor.fetchall()
            qr_codes = []
            
            for machine in machines:
                vin = machine['vin']
                machine_info = {
                    "base_model_name": machine['base_model_name'],
                    "mfg_name": machine['mfg_name'],
                    "cat_name": machine['cat_name'],
                    "production_year": machine['production_year'],
                    "total_hours": machine['total_hours']
                }
                
                qr_code = generate_machine_qr_code(vin, machine_info)
                qr_codes.append({
                    "vin": vin,
                    "qr_code": qr_code,
                    "machine_info": machine_info
                })
            
            return QRCodeListResponse(
                qr_codes=qr_codes,
                total=len(qr_codes)
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"QR 코드 목록 조회 중 오류 발생: {str(e)}")
    finally:
        conn.close()


@router.get("/qr-codes/{vin}")
async def get_machine_by_qr_scan(vin: str):
    """
    QR 코드 스캔을 통한 농기계 정보 조회 (정비사용)
    
    Args:
        vin: 농기계 번호 (VIN)
    
    Returns:
        - machine_info: 농기계 기본 정보
        - maintenance_history: 최근 정비 이력 (최대 5개)
        - ai_summary: AI 전문가 소견
        - parts_status: 부품 상태 정보
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # 1. 농기계 기본 정보 조회
            cursor.execute("""
                SELECT 
                    mi.vin,
                    mi.total_hours,
                    mi.production_year,
                    mi.is_deleted,
                    mm.base_model_name,
                    mm.base_model_name as model_name,
                    mf.mfg_name,
                    c.cat_name,
                    mm.hp
                FROM machine_instance mi
                LEFT JOIN machine_master mm ON mi.model_id = mm.model_id
                LEFT JOIN manufacturer_codes mf ON mm.mfg_code = mf.mfg_code
                LEFT JOIN category_codes c ON mm.cat_code = c.cat_code
                WHERE mi.vin = %s
            """, (vin,))
            
            machine = cursor.fetchone()
            
            if not machine:
                raise HTTPException(status_code=404, detail=f"농기계를 찾을 수 없습니다: {vin}")
            
            # 2. 최근 정비 이력 조회 (최대 5개)
            cursor.execute("""
                SELECT 
                    ml.log_id,
                    ml.service_date,
                    ml.total_cost,
                    ml.working_hours as total_hours,
                    ml.service_company,
                    ml.ai_summary,
                    COUNT(md.detail_id) as parts_count
                FROM maintenance_log ml
                LEFT JOIN maintenance_detail md ON ml.log_id = md.log_id
                WHERE ml.vin = %s
                GROUP BY ml.log_id
                ORDER BY ml.service_date DESC
                LIMIT 5
            """, (vin,))
            
            maintenance_history = cursor.fetchall()
            
            # 3. 부품 상태 정보 조회
            cursor.execute("""
                SELECT 
                    md.item_name as part_name,
                    md.quantity,
                    md.part_cost as unit_cost,
                    ml.service_date
                FROM maintenance_detail md
                JOIN maintenance_log ml ON md.log_id = ml.log_id
                WHERE ml.vin = %s
                ORDER BY ml.service_date DESC
                LIMIT 20
            """, (vin,))
            
            parts_status = cursor.fetchall()
            
            # 4. 통계 정보 계산
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_maintenance,
                    COALESCE(SUM(total_cost), 0) as total_cost,
                    COALESCE(AVG(total_cost), 0) as avg_cost,
                    MAX(service_date) as last_maintenance
                FROM maintenance_log
                WHERE vin = %s
            """, (vin,))
            
            stats = cursor.fetchone()
            
            return {
                "success": True,
                "data": {
                    "machine_info": {
                        "vin": machine['vin'],
                        "model_name": machine['model_name'] or machine['base_model_name'],
                        "manufacturer": machine['mfg_name'],
                        "category": machine['cat_name'],
                        "production_year": machine['production_year'],
                        "total_hours": machine['total_hours'],
                        "hp": machine['hp'],
                        "is_deleted": machine['is_deleted']
                    },
                    "maintenance_history": [
                        {
                            "log_id": row['log_id'],
                            "service_date": row['service_date'].isoformat() if row['service_date'] else None,
                            "total_cost": row['total_cost'],
                            "total_hours": row['total_hours'],
                            "service_company": row['service_company'],
                            "ai_summary": row['ai_summary'],
                            "parts_count": row['parts_count']
                        }
                        for row in maintenance_history
                    ],
                    "parts_status": [
                        {
                            "part_name": row['part_name'],
                            "quantity": row['quantity'],
                            "unit_cost": row['unit_cost'],
                            "service_date": row['service_date'].isoformat() if row['service_date'] else None
                        }
                        for row in parts_status
                    ],
                    "statistics": {
                        "total_maintenance": stats['total_maintenance'],
                        "total_cost": stats['total_cost'],
                        "avg_cost": stats['avg_cost'],
                        "last_maintenance": stats['last_maintenance'].isoformat() if stats['last_maintenance'] else None
                    }
                }
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"QR 코드 조회 중 오류 발생: {str(e)}")
    finally:
        conn.close()