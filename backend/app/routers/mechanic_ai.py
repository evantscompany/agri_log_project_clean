# backend/app/routers/mechanic_ai.py
"""
정비사 전용 AI 소견 API 라우터
- 기술적 분석 소견
- 정비 예측
- 대고객 상담 조언
"""

from fastapi import APIRouter, HTTPException
from app.services.mechanic_ai_advisor import MechanicAIAdvisor
from app.models.schemas import AIAdviceRequest, AIAdviceResponse

router = APIRouter(prefix="/api/v1/mechanic-ai", tags=["Mechanic AI"])

# AI 어드바이저 인스턴스
ai_advisor = MechanicAIAdvisor()

@router.post("/advice", response_model=AIAdviceResponse)
async def get_mechanic_advice(request: AIAdviceRequest):
    """
    정비사 전용 AI 기술 소견 생성
    
    Args:
        request: AI 소견 요청 정보
    
    Returns:
        - advice: AI 기술 소견 (600자 이내)
        - analysis_data: 분석에 사용된 데이터
    """
    try:
        # AI 소견 생성
        advice = ai_advisor.generate_mechanic_advice(request.vin, request.current_hours)
        
        # 분석 데이터 수집
        history = ai_advisor.get_maintenance_history(request.vin)
        parts_analysis = ai_advisor.analyze_parts_usage_pattern(history)
        predictions = ai_advisor.predict_next_maintenance(history, request.current_hours)
        
        return AIAdviceResponse(
            success=True,
            data={
                "vin": request.vin,
                "current_hours": request.current_hours,
                "advice": advice,
                "analysis_data": {
                    "maintenance_count": len(history),
                    "parts_frequency": parts_analysis.get('frequent_parts', {}),
                    "next_maintenance_hours": predictions.get('next_maintenance_hours'),
                    "urgency_level": predictions.get('urgency_level', 'low'),
                    "recommended_parts": predictions.get('recommended_parts', [])
                }
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 소견 생성 중 오류 발생: {str(e)}")


@router.post("/consultation")
async def get_consultation_advice(request: AIAdviceRequest):
    """
    대고객 상담용 조언 생성
    
    Args:
        request: 상담 조언 요청 정보
    
    Returns:
        - advice: 상담용 조언 (3가지 항목)
        - cost_info: 비용 관련 정보
    """
    try:
        # 상담 조언 생성
        advice = ai_advisor.generate_customer_consultation_advice(request.vin, request.current_hours)
        
        # 비용 정보 계산
        history = ai_advisor.get_maintenance_history(request.vin)
        
        if history:
            total_cost = sum(record['total_cost'] for record in history)
            avg_cost = total_cost / len(history)
            last_cost = history[0]['total_cost']
        else:
            total_cost = 0
            avg_cost = 0
            last_cost = 0
        
        return {
            "success": True,
            "data": {
                "vin": request.vin,
                "current_hours": request.current_hours,
                "consultation_advice": advice,
                "cost_info": {
                    "total_maintenance_cost": total_cost,
                    "average_cost": avg_cost,
                    "last_maintenance_cost": last_cost,
                    "maintenance_count": len(history)
                }
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"상담 조언 생성 중 오류 발생: {str(e)}")


@router.get("/analysis/{vin}")
async def get_maintenance_analysis(vin: str):
    """
    정비 이력 분석 데이터 조회
    
    Args:
        vin: 농기계 번호
    
    Returns:
        - parts_analysis: 부품 사용 패턴 분석
        - predictions: 정비 예측 정보
        - statistics: 통계 정보
    """
    try:
        # 정비 이력 조회
        history = ai_advisor.get_maintenance_history(vin)
        
        if not history:
            raise HTTPException(status_code=404, detail="정비 이력을 찾을 수 없습니다.")
        
        # 현재 가동시간
        current_hours = history[0]['total_hours'] if history else 0
        
        # 분석 데이터 생성
        parts_analysis = ai_advisor.analyze_parts_usage_pattern(history)
        predictions = ai_advisor.predict_next_maintenance(history, current_hours)
        
        # 통계 정보
        total_cost = sum(record['total_cost'] for record in history)
        service_companies = list(set(record['service_company'] for record in history if record['service_company']))
        
        return {
            "success": True,
            "data": {
                "vin": vin,
                "current_hours": current_hours,
                "maintenance_count": len(history),
                "total_cost": total_cost,
                "service_companies": service_companies,
                "parts_analysis": parts_analysis,
                "predictions": predictions,
                "statistics": {
                    "average_cost": total_cost / len(history) if history else 0,
                    "cost_per_hour": total_cost / current_hours if current_hours > 0 else 0,
                    "most_frequent_part": max(parts_analysis['frequent_parts'].items(), key=lambda x: x[1])[0] if parts_analysis['frequent_parts'] else None
                }
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 데이터 조회 중 오류 발생: {str(e)}")


@router.get("/parts-recommendation/{vin}")
async def get_parts_recommendation(vin: str):
    """
    부품 교체 추천 정보 조회
    
    Args:
        vin: 농기계 번호
    
    Returns:
        - recommended_parts: 추천 부품 목록
        - replacement_schedule: 교체 일정
        - cost_estimate: 비용 예상
    """
    try:
        # 정비 이력 조회
        history = ai_advisor.get_maintenance_history(vin)
        
        if not history:
            raise HTTPException(status_code=404, detail="정비 이력을 찾을 수 없습니다.")
        
        # 현재 가동시간
        current_hours = history[0]['total_hours'] if history else 0
        
        # 예측 정보
        predictions = ai_advisor.predict_next_maintenance(history, current_hours)
        
        # 부품 추천
        recommended_parts = predictions.get('recommended_parts', [])
        
        # 부품별 비용 정보
        parts_cost_info = {}
        for record in history:
            for part in record['parts']:
                part_name = part['part_name']
                total_cost = part['quantity'] * part['unit_cost']
                
                if part_name not in parts_cost_info:
                    parts_cost_info[part_name] = []
                parts_cost_info[part_name].append(total_cost)
        
        # 평균 비용 계산
        parts_cost_estimate = {}
        for part_name, costs in parts_cost_info.items():
            parts_cost_estimate[part_name] = sum(costs) / len(costs)
        
        # 추천 부품 상세 정보
        detailed_recommendations = []
        for part_name in recommended_parts:
            avg_cost = parts_cost_estimate.get(part_name, 0)
            detailed_recommendations.append({
                "part_name": part_name,
                "estimated_cost": int(avg_cost),
                "recommendation_reason": f"과거 {len(parts_cost_info.get(part_name, []))}회 교체 이력",
                "urgency": "high" if part_name in recommended_parts[:2] else "medium"
            })
        
        return {
            "success": True,
            "data": {
                "vin": vin,
                "current_hours": current_hours,
                "recommended_parts": detailed_recommendations,
                "next_maintenance_hours": predictions.get('next_maintenance_hours'),
                "urgency_level": predictions.get('urgency_level', 'low'),
                "total_estimated_cost": sum(item['estimated_cost'] for item in detailed_recommendations)
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"부품 추천 정보 조회 중 오류 발생: {str(e)}")


@router.get("/health")
async def health_check():
    """
    AI 서비스 상태 확인
    
    Returns:
        - status: 서비스 상태
        - model_info: 모델 정보
    """
    try:
        # 간단한 테스트 요청
        test_response = ai_advisor.generate_mechanic_advice("TEST123", 100)
        
        return {
            "success": True,
            "data": {
                "status": "healthy",
                "model": "gpt-3.5-turbo",
                "service": "mechanic-ai-advisor",
                "test_response_length": len(test_response)
            }
        }
    
    except Exception as e:
        return {
            "success": False,
            "data": {
                "status": "unhealthy",
                "error": str(e)
            }
        }
