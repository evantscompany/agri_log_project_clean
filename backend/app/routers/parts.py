# backend/app/routers/parts.py
"""
부품 관리 API 라우터 (정비사용)
- 부품 검색 및 자동완성
- 부품 목록 조회
- 부품 상세 정보
"""

from fastapi import APIRouter, HTTPException, Query
from app.database import get_db_connection
from app.models.schemas import MessageResponse

router = APIRouter(prefix="/api/v1/parts", tags=["Parts"])


@router.get("/search")
async def search_parts(
    q: str = Query(..., description="검색어"),
    limit: int = Query(10, ge=1, le=50, description="최대 결과 수")
):
    """
    부품 검색 및 자동완성 (정비사용)
    
    Args:
        q: 검색어 (부품명)
        limit: 최대 결과 수 (기본값: 10)
    
    Returns:
        - parts: 부품 목록
        - total: 총 결과 수
    """
    if not q or len(q.strip()) < 1:
        raise HTTPException(status_code=400, detail="검색어를 입력해주세요.")
    
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # v_part_list_all 뷰에서 부품 검색
            search_query = f"%{q.strip()}%"
            
            cursor.execute("""
                SELECT 
                    part_id,
                    part_number as part_code,
                    part_name,
                    system_group as category,
                    base_price as standard_price,
                    base_labor as unit,
                    created_at
                FROM v_part_list_all
                WHERE part_name LIKE %s
                   OR part_number LIKE %s
                   OR system_group LIKE %s
                ORDER BY part_name
                LIMIT %s
            """, (search_query, search_query, search_query, limit))
            
            results = cursor.fetchall()
            
            # 총 결과 수 조회
            cursor.execute("""
                SELECT COUNT(*) as total
                FROM v_part_list_all
                WHERE part_name LIKE %s
                   OR part_number LIKE %s
                   OR system_group LIKE %s
            """, (search_query, search_query, search_query))
            
            total_result = cursor.fetchone()
            total = total_result['total']
            
            parts_data = [
                {
                    "part_id": row['part_id'],
                    "part_name": row['part_name'],
                    "part_code": row['part_code'],
                    "category": row['category'],
                    "standard_price": row['standard_price'],
                    "unit": row['unit'],
                    "manufacturer": None
                }
                for row in results
            ]
            
            return {
                "success": True,
                "data": {
                    "parts": parts_data,
                    "total": total,
                    "query": q.strip()
                }
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"부품 검색 중 오류 발생: {str(e)}")
    finally:
        conn.close()


@router.get("/categories")
async def get_part_categories():
    """
    부품 카테고리 목록 조회
    
    Returns:
        - categories: 카테고리 목록
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT DISTINCT system_group as category
                FROM v_part_list_all
                WHERE system_group IS NOT NULL AND system_group != ''
                ORDER BY system_group
            """)
            
            results = cursor.fetchall()
            
            return {
                "success": True,
                "data": {
                    "categories": [row['category'] for row in results]
                }
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"카테고리 조회 중 오류 발생: {str(e)}")
    finally:
        conn.close()


@router.get("/popular")
async def get_popular_parts(
    limit: int = Query(20, ge=1, le=50, description="최대 결과 수")
):
    """
    인기 부품 목록 조회 (자주 사용되는 부품)
    
    Args:
        limit: 최대 결과 수
    
    Returns:
        - parts: 인기 부품 목록
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # maintenance_detail에서 사용 빈도가 높은 부품 조회
            cursor.execute("""
                SELECT 
                    md.item_name as part_name,
                    COUNT(*) as usage_count,
                    AVG(md.part_cost) as avg_cost,
                    MAX(ml.service_date) as last_used
                FROM maintenance_detail md
                JOIN maintenance_log ml ON md.log_id = ml.log_id
                WHERE md.item_name IS NOT NULL AND md.item_name != ''
                GROUP BY md.item_name
                HAVING usage_count >= 2
                ORDER BY usage_count DESC, last_used DESC
                LIMIT %s
            """, (limit,))
            
            results = cursor.fetchall()
            
            return {
                "success": True,
                "data": {
                    "parts": [
                        {
                            "part_name": row['part_name'],
                            "usage_count": row['usage_count'],
                            "avg_cost": row['avg_cost'],
                            "last_used": row['last_used'].isoformat() if row['last_used'] else None
                        }
                        for row in results
                    ]
                }
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"인기 부품 조회 중 오류 발생: {str(e)}")
    finally:
        conn.close()


@router.get("/{part_id}")
async def get_part_detail(part_id: int):
    """
    부품 상세 정보 조회
    
    Args:
        part_id: 부품 ID
    
    Returns:
        - part: 부품 상세 정보
        - usage_history: 사용 이력 (최근 10개)
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="데이터베이스 연결 실패")
    
    try:
        with conn.cursor() as cursor:
            # 부품 기본 정보 조회
            cursor.execute("""
                SELECT 
                    part_id,
                    part_number as part_code,
                    part_name,
                    system_group as category,
                    base_price as standard_price,
                    base_labor as unit
                FROM v_part_list_all
                WHERE part_id = %s
            """, (part_id,))
            
            part = cursor.fetchone()
            
            if not part:
                raise HTTPException(status_code=404, detail="부품을 찾을 수 없습니다.")
            
            # 부품 사용 이력 조회
            cursor.execute("""
                SELECT 
                    md.item_name as part_name,
                    md.quantity,
                    md.part_cost as unit_cost,
                    md.total_cost,
                    ml.service_date,
                    ml.vin,
                    mi.model_name
                FROM maintenance_detail md
                JOIN maintenance_log ml ON md.log_id = ml.log_id
                LEFT JOIN machine_instance mi ON ml.vin = mi.vin
                LEFT JOIN machine_master mm ON mi.model_id = mm.model_id
                WHERE md.item_name = %s
                ORDER BY ml.service_date DESC
                LIMIT 10
            """, (part['part_name'],))
            
            usage_history = cursor.fetchall()
            
            return {
                "success": True,
                "data": {
                    "part": {
                        "part_id": part['part_id'],
                        "part_name": part['part_name'],
                        "part_code": part['part_code'],
                        "category": part['category'],
                        "standard_price": part['standard_price'],
                        "unit": part['unit']
                    },
                    "usage_history": [
                        {
                            "part_name": row['part_name'],
                            "quantity": row['quantity'],
                            "unit_cost": row['unit_cost'],
                            "total_cost": row['total_cost'],
                            "service_date": row['service_date'].isoformat() if row['service_date'] else None,
                            "vin": row['vin'],
                            "model_name": row['model_name']
                        }
                        for row in usage_history
                    ]
                }
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"부품 상세 조회 중 오류 발생: {str(e)}")
    finally:
        conn.close()
