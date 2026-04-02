# backend/app/routers/maintenance.py
"""
정비 기록 관리 API 라우터 (정비사용)
- 정비 기록 저장
- maintenance_detail 추가
- machine_instance 동기화
- 부품 관련 기능
"""

from fastapi import APIRouter, HTTPException
from typing import List
from app.database import get_db_connection
from app.models.schemas import PartDetail, MaintenanceLogRequest, MaintenanceLogResponse, PartSearchResponse
import pymysql
from datetime import datetime

router = APIRouter(prefix="/api/v1/maintenance", tags=["Maintenance"])


# 모델은 schemas.py에서 import


# 부품 검색 API
@router.get("/parts/search", response_model=List[PartSearchResponse])
async def search_parts(query: str = ""):
    """부품 검색"""
    conn = get_db_connection()
    
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            if query:
                # 부품번호 또는 부품명으로 검색
                sql = """
                    SELECT part_id, part_number, part_name, 
                           system_group as category, base_price as unit_price
                    FROM part_list
                    WHERE part_number LIKE %s OR part_name LIKE %s
                    ORDER BY part_name
                """
                cursor.execute(sql, (f"%{query}%", f"%{query}%"))
            else:
                # 전체 부품 목록
                sql = """
                    SELECT part_id, part_number, part_name, 
                           system_group as category, base_price as unit_price
                    FROM part_list
                    ORDER BY part_name
                """
                cursor.execute(sql)
            
            parts = cursor.fetchall()
            
            # 가격 포맷팅
            for part in parts:
                part['unit_price'] = int(part['unit_price']) if part['unit_price'] else 0
            
            return parts
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"부품 검색 실패: {e}")
    finally:
        conn.close()


# 부품번호로 조회 API
@router.get("/parts/number/{part_number}", response_model=PartSearchResponse)
async def get_part_by_number(part_number: str):
    """부품번호로 부품 조회"""
    conn = get_db_connection()
    
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute(
                "SELECT part_id, part_number, part_name, system_group as category, base_price as unit_price FROM part_list WHERE part_number = %s",
                (part_number,)
            )
            part = cursor.fetchone()
            
            if not part:
                raise HTTPException(status_code=404, detail="부품을 찾을 수 없습니다.")
            
            part['unit_price'] = int(part['unit_price']) if part['unit_price'] else 0
            return part
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"부품 조회 실패: {e}")
    finally:
        conn.close()


# 샘플 부품 데이터 생성 API
@router.post("/parts/create-sample")
async def create_sample_parts():
    """샘플 부품 데이터 생성"""
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cursor:
            # 샘플 부품 데이터 (농기계 부품 식별 코드 체계 기반)
            sample_parts = [
                # 이앙기 부품 (실제 OCR 텍스트 기반)
                {"part_number": "DD-I-TM-0175", "part_name": "저압 콤바인 동력", "category": "동력전달", "unit_price": 399000},
                {"part_number": "DD-I-TM-0042", "part_name": "전방 콤바인 동력", "category": "동력전달", "unit_price": 376800},
                {"part_number": "DD-I-CM-0060", "part_name": "좌 콤바인 일반소", "category": "일반소모", "unit_price": 296400},
                {"part_number": "DD-I-EN-0009", "part_name": "우 콤바인 엔진계", "category": "엔진계통", "unit_price": 306200},
                
                # 추가 부품
                {"part_number": "DD-I-HY-0150", "part_name": "유압 펌프", "category": "유압작업", "unit_price": 250000},
                {"part_number": "DD-I-EL-0080", "part_name": "ECU 제어기", "category": "전기전장", "unit_price": 450000},
                {"part_number": "DD-I-TM-0200", "part_name": "클러치 디스크", "category": "동력전달", "unit_price": 180000},
                {"part_number": "DD-I-EN-0125", "part_name": "피스톤 링", "category": "엔진계통", "unit_price": 95000},
                {"part_number": "DD-I-CM-0300", "part_name": "에어 클리너", "category": "일반소모", "unit_price": 75000},
                {"part_number": "DD-I-HY-0250", "part_name": "유압 실린더", "category": "유압작업", "unit_price": 320000}
            ]
            
            created_count = 0
            for part in sample_parts:
                # 중복 확인
                cursor.execute("SELECT part_id FROM part_list WHERE part_number = %s", (part['part_number'],))
                existing = cursor.fetchone()
                
                if not existing:
                    cursor.execute("""
                        INSERT INTO part_list (part_number, part_name, category, unit_price, created_at)
                        VALUES (%s, %s, %s, %s, NOW())
                    """, (
                        part['part_number'],
                        part['part_name'],
                        part['category'],
                        part['unit_price']
                    ))
                    created_count += 1
            
            conn.commit()
            
            return {
                "message": f"샘플 부품 데이터 생성 완료",
                "total_parts": len(sample_parts),
                "created_parts": created_count
            }
            
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"샘플 부품 데이터 생성 실패: {e}")
    finally:
        conn.close()


@router.post("/log", response_model=MaintenanceLogResponse)
async def create_maintenance_log(request: MaintenanceLogRequest):
    """
    정비 기록 저장 (정비사용)
    
    Args:
        request: 정비 기록 정보
    
    Returns:
        - log_id: 생성된 정비 기록 ID
        - message: 저장 결과 메시지
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # 1. 농기계 존재 여부 확인
            cursor.execute("""
                SELECT vin, total_hours FROM machine_instance 
                WHERE vin = %s
            """, (request.vin,))
            
            machine = cursor.fetchone()
            if not machine:
                raise HTTPException(status_code=404, detail=f"농기계를 찾을 수 없습니다: {request.vin}")
            
            # 2. 정비 기록 저장
            cursor.execute("""
                INSERT INTO maintenance_log (
                    vin, service_date, service_company, 
                    working_hours, total_cost, ai_summary
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                request.vin,
                request.service_date,
                request.service_company,
                request.total_hours,
                request.total_cost,
                request.ai_summary
            ))
            
            log_id = cursor.lastrowid
            
            # 3. 부품 상세 정보 저장
            for part in request.parts:
                cursor.execute("""
                    INSERT INTO maintenance_detail (
                        log_id, part_id, item_name, quantity, part_cost
                    ) VALUES (%s, %s, %s, %s, %s)
                """, (
                    log_id,
                    part.part_id,
                    part.part_name,
                    part.quantity,
                    part.unit_cost
                ))
            
            # 4. 농기계 가동시간 업데이트
            if request.total_hours > machine['total_hours']:
                cursor.execute("""
                    UPDATE machine_instance 
                    SET total_hours = %s
                    WHERE vin = %s
                """, (request.total_hours, request.vin))
            
            conn.commit()
            
            return MaintenanceLogResponse(
                success=True,
                data={
                    "log_id": log_id,
                    "vin": request.vin,
                    "message": "정비 기록이 성공적으로 저장되었습니다.",
                    "updated_hours": request.total_hours > machine['total_hours']
                }
            )
    
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"정비 기록 저장 중 오류 발생: {str(e)}")
    finally:
        conn.close()


@router.put("/log/{log_id}", response_model=MaintenanceLogResponse)
async def update_maintenance_log(
    log_id: int, 
    request: MaintenanceLogRequest
):
    """
    정비 기록 수정
    
    Args:
        log_id: 정비 기록 ID
        request: 수정할 정비 기록 정보
    
    Returns:
        - message: 수정 결과 메시지
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # 1. 기존 정비 기록 확인
            cursor.execute("""
                SELECT vin, total_hours FROM maintenance_log 
                WHERE log_id = %s
            """, (log_id,))
            
            existing_log = cursor.fetchone()
            if not existing_log:
                raise HTTPException(status_code=404, detail="정비 기록을 찾을 수 없습니다.")
            
            # 2. 정비 기록 수정
            cursor.execute("""
                UPDATE maintenance_log 
                SET service_date = %s, service_company = %s,
                    working_hours = %s, total_cost = %s, ai_summary = %s
                WHERE log_id = %s
            """, (
                request.service_date,
                request.service_company,
                request.total_hours,
                request.total_cost,
                request.ai_summary,
                log_id
            ))
            
            # 3. 기존 부품 상세 정보 삭제
            cursor.execute("""
                DELETE FROM maintenance_detail WHERE log_id = %s
            """, (log_id,))
            
            # 4. 새로운 부품 상세 정보 저장
            for part in request.parts:
                cursor.execute("""
                    INSERT INTO maintenance_detail (
                        log_id, part_name, quantity, unit_cost, total_cost
                    ) VALUES (%s, %s, %s, %s, %s)
                """, (
                    log_id,
                    part.part_name,
                    part.quantity,
                    part.unit_cost,
                    part.quantity * part.unit_cost
                ))
            
            # 5. 농기계 가동시간 재계산 (가장 최신 값으로)
            cursor.execute("""
                SELECT MAX(working_hours) as max_hours 
                FROM maintenance_log 
                WHERE vin = %s
            """, (request.vin,))
            
            max_hours_result = cursor.fetchone()
            max_hours = max_hours_result['max_hours'] if max_hours_result else 0
            
            # 삭제된 기계도 가동시간 업데이트
            cursor.execute("""
                UPDATE machine_instance 
                SET total_hours = %s
                WHERE vin = %s
            """, (max_hours, request.vin))
            
            # 만약 기계가 삭제되었다면 복원
            cursor.execute("""
                UPDATE machine_instance 
                SET is_deleted = 0, deleted_at = NULL
                WHERE vin = %s AND is_deleted = 1
            """, (request.vin,))
            
            conn.commit()
            
            return MaintenanceLogResponse(
                success=True,
                data={
                    "log_id": log_id,
                    "vin": request.vin,
                    "message": "정비 기록이 성공적으로 저장되었습니다.",
                    "updated_hours": max_hours,
                    "restored": True
                }
            )
    
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"정비 기록 수정 중 오류 발생: {str(e)}")
    finally:
        conn.close()


@router.get("/machine/{vin}")
async def get_maintenance_logs(vin: str, limit: int = 10):
    """
    농기계별 정비 기록 목록 조회 (부품 정보 포함)
    
    Args:
        vin: 농기계 번호
        limit: 최대 결과 수
    
    Returns:
        - logs: 정비 기록 목록 (부품 정보 포함)
        - total: 총 기록 수
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            # 정비 기록 목록 조회 (부품 정보 포함)
            cursor.execute("""
                SELECT 
                    ml.log_id,
                    ml.vin,
                    ml.service_date,
                    ml.total_cost,
                    ml.working_hours,
                    ml.service_company,
                    ml.ai_summary
                FROM maintenance_log ml
                WHERE ml.vin = %s
                ORDER BY ml.service_date DESC, ml.log_id DESC
                LIMIT %s
            """, (vin, limit))
            
            logs = cursor.fetchall()
            
            # 각 로그에 대한 부품 상세 정보 조회
            for log in logs:
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
                """, (log['log_id'],))
                
                log['details'] = cursor.fetchall()
            
            # 총 기록 수 조회
            cursor.execute("""
                SELECT COUNT(*) as total FROM maintenance_log WHERE vin = %s
            """, (vin,))
            
            total_result = cursor.fetchone()
            total = total_result['total']
            
            return {
                "records": [
                    {
                        "id": log['log_id'],
                        "vin": log['vin'],
                        "service_date": log['service_date'].isoformat() if log['service_date'] else None,
                        "total_cost": log['total_cost'] or 0,
                        "total_hours": log['working_hours'] or 0,
                        "service_company": log['service_company'] or '',
                        "ai_summary": log['ai_summary'] or '',
                        "service_description": log['ai_summary'] or '',
                        "parts_count": len(log['details']),
                        "details": log['details'],
                        "parts": log['details']
                    }
                    for log in logs
                ],
                "total": total
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"정비 기록 조회 중 오류 발생: {str(e)}")
    finally:
        conn.close()


@router.get("/log/{log_id}/details")
async def get_maintenance_log_details(log_id: int):
    """
    정비 기록 상세 정보 조회
    
    Args:
        log_id: 정비 기록 ID
    
    Returns:
        - log: 정비 기록 정보
        - parts: 부품 상세 정보
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # 정비 기록 정보 조회
            cursor.execute("""
                SELECT 
                    ml.log_id,
                    ml.vin,
                    ml.service_date,
                    ml.total_cost,
                    ml.working_hours,
                    ml.service_company,
                    ml.ai_summary,
                    mm.base_model_name,
                    mf.mfg_name
                FROM maintenance_log ml
                LEFT JOIN machine_instance mi ON ml.vin = mi.vin
                LEFT JOIN machine_master mm ON mi.model_id = mm.model_id
                LEFT JOIN manufacturer_codes mf ON mm.mfg_code = mf.mfg_code
                WHERE ml.log_id = %s
            """, (log_id,))
            
            log = cursor.fetchone()
            
            if not log:
                raise HTTPException(status_code=404, detail="정비 기록을 찾을 수 없습니다.")
            
            # 부품 상세 정보 조회
            cursor.execute("""
                SELECT 
                    md.detail_id,
                    md.item_name as part_name,
                    md.quantity,
                    md.part_cost as unit_cost,
                    md.quantity * md.part_cost as total_cost
                FROM maintenance_detail md
                WHERE md.log_id = %s
                ORDER BY md.detail_id
            """, (log_id,))
            
            parts = cursor.fetchall()
            
            return {
                "success": True,
                "data": {
                    "log": {
                        "log_id": log['log_id'],
                        "vin": log['vin'],
                        "service_date": log['service_date'].isoformat() if log['service_date'] else None,
                        "total_cost": log['total_cost'],
                        "total_hours": log['working_hours'],
                        "service_company": log['service_company'],
                        "ai_summary": log['ai_summary'],
                        "model_name": log['base_model_name'],
                        "manufacturer": log['mfg_name']
                    },
                    "parts": [
                        {
                            "detail_id": part['detail_id'],
                            "part_name": part['part_name'],
                            "quantity": part['quantity'],
                            "unit_cost": part['unit_cost'],
                            "total_cost": part['total_cost']
                        }
                        for part in parts
                    ]
                }
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"정비 기록 상세 조회 중 오류 발생: {str(e)}")
    finally:
        conn.close()
