# backend/app/services/vin_parser.py
from app.database import get_db_connection
import pymysql

def parse_agri_vin(vin_code: str):
    # 0. 입력값을 무조건 대문자로 변환 (대소문자 구분 안 하고 불러오기 핵심)
    vin_code = vin_code.upper() 

    # 1. 기대번호 쪼개기 (대동 형식: [제조사][기종][모델4자리][연도2자리][시리얼])
    mfg = vin_code[0]          # 'D' (대동)
    cat = vin_code[1]          # 'I' (이앙기), 'C' (콤바인), 'T' (트랙터)
    ident = vin_code[2:6]      # 모델 식별 코드 (4자리)
    year_code = vin_code[6:8]  # 생산 연도 (2자리)
    serial = vin_code[8:]       # 시리얼 번호 
    
    # ... 이하 로직 동일 ...
    full_year = 2000 + int(year_code)
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # 모델 식별 코드 매칭 (3자리 또는 4자리)
            # 예: '060' → '060' 또는 '0060' 모두 매칭
            sql = """
            SELECT m.base_model_name, mf.mfg_name, c.cat_name, m.model_id
            FROM machine_master m
            JOIN manufacturer_codes mf ON m.mfg_code = mf.mfg_code
            JOIN category_codes c ON m.cat_code = c.cat_code
            WHERE UPPER(m.mfg_code) = %s 
              AND UPPER(m.cat_code) = %s 
              AND (
                UPPER(m.model_identifier) = %s 
                OR UPPER(m.model_identifier) = %s
              )
            """
            # 3자리와 4자리(앞에 0 추가) 모두 시도
            ident_padded = ident.zfill(4)  # '060' → '0060'
            cursor.execute(sql, (mfg, cat, ident, ident_padded))
            result = cursor.fetchone()
            
            if result:
                return {
                    "success": True,
                    "data": {
                        "model_id": result['model_id'],
                        "model_name": result['base_model_name'],
                        "manufacturer_name": result['mfg_name'],
                        "category_name": result['cat_name'],
                        "production_year": full_year,
                        "vin": vin_code,
                        # 하위 호환성을 위한 기존 키
                        "제조사": result['mfg_name'],
                        "기종": result['cat_name'],
                        "모델명": result['base_model_name'],
                        "연식": f"{full_year}년식",
                        "기대번호": vin_code
                    }
                }
            else:
                return {
                    "success": False,
                    "message": f"❌ 일치하는 모델 정보를 찾을 수 없습니다. (식별코드: {ident} 또는 {ident_padded})"
                }
    except Exception as e:
        return {"success": False, "message": f"❌ 실행 에러: {str(e)}"}
    finally:
        conn.close()