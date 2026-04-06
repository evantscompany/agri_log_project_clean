# backend/app/services/part_list_manager.py
"""
OCR로 추출된 부품 정보를 part_list 테이블에 저장하는 서비스
"""

from typing import Dict, Optional
from app.database import get_db_connection


def save_part_to_list(part_info: Dict) -> Optional[int]:
    """
    OCR로 추출된 부품 정보를 part_list 테이블에 저장
    
    Args:
        part_info: {
            'part_number': '부품번호',
            'part_name': '부품명',
            'unit_price': 단가,
            'quantity': 수량,
            'total_price': 금액,
            'system_group': '계통명' (선택)
        }
    
    Returns:
        저장된 part_id 또는 None
    """
    try:
        conn = get_db_connection()
        if not conn:
            return None
        
        with conn.cursor() as cursor:
            part_number = part_info.get('part_number')
            part_name = part_info.get('part_name')
            unit_price = part_info.get('unit_price', 0)
            system_group = part_info.get('system_group')
            
            # 필수 정보 확인
            if not part_number or not part_name:
                print(f"⚠️ 부품 정보 불충분: {part_info}")
                return None
            
            # 부품번호로 model_id 추출 (DD-T-EN-0125 → T는 트랙터)
            model_id = extract_model_id_from_part_number(part_number, cursor)
            
            if not model_id:
                print(f"⚠️ model_id 추출 실패: {part_number}")
                return None
            
            # 중복 확인
            cursor.execute("""
                SELECT part_id FROM part_list 
                WHERE model_id = %s AND part_number = %s
            """, (model_id, part_number))
            
            existing = cursor.fetchone()
            if existing:
                print(f"✅ 부품 이미 존재: {part_number} (part_id: {existing['part_id']})")
                return existing['part_id']
            
            # 새 부품 저장
            cursor.execute("""
                INSERT INTO part_list 
                (model_id, system_group, part_number, part_name, base_price, base_labor)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                model_id,
                system_group or extract_system_group_from_part_number(part_number),
                part_number,
                part_name,
                unit_price,
                0  # base_labor는 기본값 0
            ))
            
            part_id = cursor.lastrowid
            conn.commit()
            
            print(f"✅ 새 부품 저장: {part_number} → {part_name} (part_id: {part_id})")
            return part_id
            
    except Exception as e:
        print(f"❌ 부품 저장 오류: {e}")
        return None
    finally:
        if 'conn' in locals():
            conn.close()


def extract_model_id_from_part_number(part_number: str, cursor) -> Optional[int]:
    """
    부품번호에서 model_id 추출
    
    예: DD-T-EN-0125 → T (트랙터) → machine_master에서 트랙터 model_id 조회
    
    Args:
        part_number: 부품번호 (DD-T-EN-0125)
        cursor: DB 커서
    
    Returns:
        model_id 또는 None
    """
    try:
        # 부품번호 파싱: DD-T-EN-0125
        parts = part_number.split('-')
        if len(parts) < 2:
            return None
        
        mfg_code = parts[0][0]  # D (대동)
        cat_code = parts[1]     # T (트랙터)
        
        # machine_master에서 해당 제조사/기종의 model_id 조회
        cursor.execute("""
            SELECT model_id FROM machine_master 
            WHERE mfg_code = %s AND cat_code = %s
            LIMIT 1
        """, (mfg_code, cat_code))
        
        result = cursor.fetchone()
        if result:
            return result['model_id']
        
        # machine_master에 없으면 새로 생성
        cursor.execute("""
            INSERT INTO machine_master (mfg_code, cat_code, model_identifier)
            VALUES (%s, %s, %s)
        """, (mfg_code, cat_code, f"{mfg_code}{cat_code}-AUTO"))
        
        model_id = cursor.lastrowid
        print(f"✅ 새 모델 생성: {mfg_code}{cat_code} (model_id: {model_id})")
        return model_id
        
    except Exception as e:
        print(f"❌ model_id 추출 오류: {e}")
        return None


def extract_system_group_from_part_number(part_number: str) -> Optional[str]:
    """
    부품번호에서 계통명 추출
    
    예: DD-T-EN-0125 → EN (엔진계통)
    
    Args:
        part_number: 부품번호
    
    Returns:
        계통명 또는 None
    """
    try:
        parts = part_number.split('-')
        if len(parts) < 3:
            return None
        
        system_code = parts[2]  # EN, TM, HY, EL, CM
        
        system_map = {
            'EN': '엔진계통',
            'TM': '동력전달',
            'HY': '유압작업',
            'EL': '전기전장',
            'CM': '일반소모'
        }
        
        return system_map.get(system_code, system_code)
        
    except Exception as e:
        print(f"❌ 계통명 추출 오류: {e}")
        return None


def save_ocr_parts_to_list(parts: list) -> Dict[str, int]:
    """
    OCR로 추출된 여러 부품을 part_list에 일괄 저장
    
    Args:
        parts: 부품 정보 리스트
    
    Returns:
        {part_number: part_id} 매핑
    """
    part_id_map = {}
    
    for part in parts:
        part_number = part.get('part_number')
        if not part_number:
            continue
        
        part_id = save_part_to_list(part)
        if part_id:
            part_id_map[part_number] = part_id
    
    print(f"✅ 총 {len(part_id_map)}개 부품 저장 완료")
    return part_id_map
