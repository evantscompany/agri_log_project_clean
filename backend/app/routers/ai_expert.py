# backend/app/routers/ai_expert.py
"""
AI 전문가 소견 API 라우터
- OpenAI API를 사용하여 농기계 전문가 소견 제공
"""

from fastapi import APIRouter, HTTPException
from app.services.ai_expert import ai_expert_service
from app.models.schemas import MessageResponse

router = APIRouter(prefix="/api/v1/ai-expert", tags=["AI Expert"])

@router.get("/opinion/{vin}")
async def get_expert_opinion(vin: str):
    """
    농기계 전문가 소견 조회
    
    Args:
        vin: 기대번호
    
    Returns:
        전문가 소견 (최대 500자)
    """
    try:
        print(f"[DEBUG] AI 전문가 소견 API 호출 - VIN: {vin}")
        
        # 전역 서비스 인스턴스 사용 (캐싱 유지)
        opinion = ai_expert_service.generate_expert_opinion(vin)
        print(f"[DEBUG] 생성된 소견: {opinion}")
        
        return {
            "success": True,
            "data": {
                "vin": vin,
                "opinion": opinion
            }
        }
    
    except Exception as e:
        print(f"[ERROR] 전문가 소견 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="전문가 소견 생성에 실패했습니다.")
