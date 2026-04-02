# backend/app/routers/price_prediction.py
"""
중고 농기계 시세 예측 API
머신러닝 모델을 활용한 가격 예측 기능
"""

import pandas as pd
import numpy as np
import re
import joblib
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import get_db_connection

# 라우터 초기화
router = APIRouter(prefix="/api/v1/price", tags=["가격 예측"])

# 모델 파일 경로
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "ML", "daedong_model.pkl")

# 전역 변수로 모델 캐싱
_model_data = None

def load_model():
    """학습된 모델 로드"""
    global _model_data
    if _model_data is None:
        try:
            _model_data = joblib.load(MODEL_PATH)
            print("가격 예측 모델 로드 완료")
        except Exception as e:
            print(f"모델 로드 실패: {e}")
            _model_data = None
    return _model_data

def get_machine_horsepower(vin: str) -> int:
    """데이터베이스에서 농기계 마력 정보 가져오기"""
    try:
        conn = get_db_connection()
        if not conn:
            print("데이터베이스 연결 실패")
            return 50  # 기본값
        
        with conn.cursor() as cursor:
            # VIN으로 모델 정보 조회
            sql = """
            SELECT mm.horsepower
            FROM machine_instance mi
            JOIN machine_master mm ON mi.model_id = mm.model_id
            WHERE mi.vin = %s
            """
            cursor.execute(sql, (vin,))
            result = cursor.fetchone()
            
            if result and result['horsepower']:
                return int(result['horsepower'])
            else:
                print(f"VIN {vin}에 대한 마력 정보를 찾을 수 없음")
                return 50  # 기본값
                
    except Exception as e:
        print(f"마력 정보 조회 실패: {e}")
        return 50  # 기본값
    finally:
        if 'conn' in locals():
            conn.close()

class PricePredictionRequest(BaseModel):
    """가격 예측 요청 모델"""
    vin: str  # 기대번호 (예: DT4351240001)
    working_hours: float  # 사용시간

class PricePredictionResponse(BaseModel):
    """가격 예측 응답 모델"""
    predicted_price: int  # 예상 가격 (만원 단위)
    vin: str
    working_hours: float
    machine_type: Optional[str] = None
    confidence: Optional[str] = None

@router.post("/predict", response_model=PricePredictionResponse)
async def predict_price(request: PricePredictionRequest):
    """
    중고 농기계 가격 예측
    
    - **vin**: 기대번호 (예: DT4351240001)
    - **working_hours**: 사용시간
    
    반환값:
    - **predicted_price**: 예상 가격 (만원 단위)
    """
    try:
        # 모델 로드
        model_data = load_model()
        if model_data is None:
            raise HTTPException(status_code=500, detail="모델을 로드할 수 없습니다.")
        
        trained_models = model_data.get('trained_models', {})
        standard_year = model_data.get('standard_year', 2026)
        
        # VIN 파싱
        vin = str(request.vin).upper().strip()
        
        # VIN 형식 검증 (최소 9자리 이상)
        if len(vin) < 9:
            raise HTTPException(status_code=400, detail="유효하지 않은 기대번호 형식입니다.")
        
        # 기종 파싱: D/T/I + 4자리 모델코드 + 2자리 연도 + 3자리 일련번호
        if len(vin) >= 9:
            m_type = vin[1]  # T, I, C
            m_code = vin[2:6] if len(vin) >= 6 else "0000"
            year_short = vin[6:8] if len(vin) >= 8 else "00"
        else:
            raise HTTPException(status_code=400, detail="유효하지 않은 기대번호 형식입니다.")
        
        # 연차(age) 계산
        try:
            prod_year = 2000 + int(year_short)
            age = standard_year - prod_year
        except ValueError:
            raise HTTPException(status_code=400, detail="연도 파싱에 실패했습니다.")
        
        # 기종별 모델 확인
        machine_type_names = {'T': '트랙터', 'I': '이앙기', 'C': '콤바인'}
        machine_type_name = machine_type_names.get(m_type, '알수없음')
        
        if m_type not in trained_models:
            raise HTTPException(
                status_code=400, 
                detail=f"지원하지 않는 기종입니다: {machine_type_name} ({m_type})"
            )
        
        # 해당 기종 모델 로드
        model_obj = trained_models[m_type]['model']
        features = trained_models[m_type]['features']
        
        # 마력 정보 (데이터베이스에서 가져오기)
        hp = get_machine_horsepower(vin)
        print(f"VIN {vin}의 마력 정보: {hp}")
        
        # 입력 데이터 생성 (One-Hot Encoding 대응)
        input_data = pd.DataFrame(columns=features)
        input_data.loc[0] = 0
        
        input_data['마력'] = hp
        input_data['age'] = age
        input_data['가동시간_hr'] = request.working_hours
        
        # 모델코드 더미 변수 활성화
        target_col = f'm_{m_code}'
        if target_col in input_data.columns:
            input_data[target_col] = 1
        
        # 가격 예측
        predicted = model_obj.predict(input_data)[0]
        
        # 10만원 단위 반올림
        predicted_price = round(predicted, -1)
        
        # 기종별 최소 가격 설정 (만원 단위)
        minimum_prices = {
            'T': 200,   # 트랙터 최소 500만원
            'I': 100,   # 이앙기 최소 300만원
            'C': 200    # 콤바인 최소 800만원
        }
        
        # 최소 가격 보장
        min_price = minimum_prices.get(m_type, 20)  # 기본 최소 200만원
        final_price = max(min_price, int(predicted_price))
        
        # 신뢰도 판단 (개선된 로직)
        if final_price > min_price * 2:
            confidence = "높음"
        elif final_price > min_price:
            confidence = "보통"
        else:
            confidence = "낮음"
        
        print(f"예측 결과 - VIN: {vin}, 마력: {hp}, 연식: {age}, 사용시간: {request.working_hours}, 예측가격: {predicted_price}만원, 최종가격: {final_price}만원 (최소: {min_price}만원)")
        
        return PricePredictionResponse(
            predicted_price=final_price,  # 최소 가격 보장 적용
            vin=request.vin,
            working_hours=request.working_hours,
            machine_type=machine_type_name,
            confidence=confidence
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"가격 예측 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail=f"가격 예측에 실패했습니다: {str(e)}")

@router.get("/model-status")
async def get_model_status():
    """모델 상태 확인"""
    try:
        model_data = load_model()
        if model_data is None:
            return {
                "status": "not_loaded",
                "message": "모델을 로드할 수 없습니다."
            }
        
        trained_models = model_data.get('trained_models', {})
        available_types = list(trained_models.keys())
        
        return {
            "status": "loaded",
            "version": model_data.get('version', 'unknown'),
            "standard_year": model_data.get('standard_year', 2026),
            "available_machine_types": available_types,
            "model_path": MODEL_PATH
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"모델 상태 확인 실패: {str(e)}")
