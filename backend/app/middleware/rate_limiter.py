# backend/app/middleware/rate_limiter.py
"""
Rate Limiting 미들웨어
- API 호출 횟수 제한
- DoS 공격 방지
"""

from fastapi import Request, HTTPException
from typing import Dict
import time

# 간단한 메모리 기반 Rate Limiter
# 프로덕션에서는 Redis 사용 권장
_request_counts: Dict[str, list] = {}
_cleanup_interval = 3600  # 1시간마다 정리
_last_cleanup = time.time()

def get_client_ip(request: Request) -> str:
    """클라이언트 IP 주소 추출"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def check_rate_limit(
    client_ip: str, 
    max_requests: int = 30, 
    window_seconds: int = 60
) -> bool:
    """
    Rate Limit 확인
    
    Args:
        client_ip: 클라이언트 IP
        max_requests: 시간 윈도우 내 최대 요청 수
        window_seconds: 시간 윈도우 (초)
    
    Returns:
        True if allowed, False if rate limited
    """
    global _request_counts, _last_cleanup
    
    # 주기적으로 오래된 데이터 정리
    current_time = time.time()
    if current_time - _last_cleanup > _cleanup_interval:
        _cleanup_old_requests()
        _last_cleanup = current_time
    
    # 클라이언트의 요청 기록 가져오기
    if client_ip not in _request_counts:
        _request_counts[client_ip] = []
    
    # 시간 윈도우 내의 요청만 유지
    cutoff_time = current_time - window_seconds
    _request_counts[client_ip] = [
        req_time for req_time in _request_counts[client_ip] 
        if req_time > cutoff_time
    ]
    
    # Rate Limit 확인
    if len(_request_counts[client_ip]) >= max_requests:
        return False
    
    # 현재 요청 기록
    _request_counts[client_ip].append(current_time)
    return True

def _cleanup_old_requests():
    """오래된 요청 기록 정리"""
    global _request_counts
    current_time = time.time()
    cutoff_time = current_time - 3600  # 1시간 이전 데이터 삭제
    
    for client_ip in list(_request_counts.keys()):
        _request_counts[client_ip] = [
            req_time for req_time in _request_counts[client_ip]
            if req_time > cutoff_time
        ]
        # 빈 리스트는 삭제
        if not _request_counts[client_ip]:
            del _request_counts[client_ip]

async def rate_limit_middleware(request: Request, call_next):
    """
    Rate Limiting 미들웨어
    AI 엔드포인트에 대해서만 적용
    """
    # AI 엔드포인트만 Rate Limit 적용
    if "/ai-expert/" in request.url.path:
        client_ip = get_client_ip(request)
        
        # AI 챗봇은 더 엄격한 제한 (분당 10회)
        if "/chat" in request.url.path:
            if not check_rate_limit(client_ip, max_requests=10, window_seconds=60):
                raise HTTPException(
                    status_code=429,
                    detail="요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
                )
        # 일반 AI 소견은 분당 30회
        else:
            if not check_rate_limit(client_ip, max_requests=30, window_seconds=60):
                raise HTTPException(
                    status_code=429,
                    detail="요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
                )
    
    response = await call_next(request)
    return response
