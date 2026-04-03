# backend/app/routers/ai_expert.py
"""
AI 전문가 소견 API 라우터
- OpenAI API를 사용하여 농기계 전문가 소견 제공
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import re
from app.services.ai_expert import ai_expert_service
from app.models.schemas import MessageResponse

router = APIRouter(prefix="/api/v1/ai-expert", tags=["AI Expert"])

class ChatMessage(BaseModel):
    role: str = Field(..., regex="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=2000)

class ChatRequest(BaseModel):
    vin: Optional[str] = Field(None, regex="^[A-Z0-9]{17}$|^[가-힣0-9]{4,20}$")
    message: str = Field(..., min_length=1, max_length=1000)
    history: List[ChatMessage] = Field(default=[], max_items=10)
    
    @validator('message')
    def validate_message(cls, v):
        # XSS 방지: HTML 태그 제거
        if '<' in v or '>' in v:
            raise ValueError('메시지에 HTML 태그를 포함할 수 없습니다.')
        return v.strip()

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
        # VIN 입력 검증
        if not re.match(r'^[A-Z0-9]{17}$|^[가-힣0-9]{4,20}$', vin):
            raise HTTPException(status_code=400, detail="올바르지 않은 VIN 형식입니다.")
        
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
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 전문가 소견 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="전문가 소견 생성에 실패했습니다.")

@router.post("/chat")
async def chat_with_expert(request: ChatRequest):
    """
    AI 전문가와 대화
    
    Args:
        request: 채팅 요청 (메시지, VIN, 대화 이력)
    
    Returns:
        AI 응답 메시지
    """
    try:
        print(f"[DEBUG] AI 챗봇 API 호출 - VIN: {request.vin}, Message: {request.message}")
        
        # AI 전문가 서비스를 통해 대화 응답 생성
        response_message = ai_expert_service.chat_with_expert(
            vin=request.vin,
            message=request.message,
            history=request.history
        )
        
        return {
            "success": True,
            "message": response_message
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] AI 챗봇 응답 생성 실패: {e}")
        # 보안: 내부 에러 정보 노출 방지
        raise HTTPException(
            status_code=500, 
            detail="AI 챗봇 응답 생성에 실패했습니다. 잠시 후 다시 시도해주세요."
        )
