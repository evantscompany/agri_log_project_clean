# backend/app/main.py
"""
농기계 데이터 이력관리 플랫폼 메인 API 서버
FastAPI 기반 RESTful API
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import machine, history, ocr, price_prediction, ai_expert, parts, maintenance, mechanic_ai
import os

# FastAPI 앱 초기화
app = FastAPI(
    title="농기계 데이터 이력관리 플랫폼 API",
    version="1.0.0",
    description="농기계 정보 조회 및 정비 이력 관리 API"
)

# CORS 설정: 프론트엔드(React)와의 통신 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",  # Docker Frontend (포트 80)
        "http://localhost:80",  # Docker Frontend (명시적)
        "http://localhost:5173",  # Vite 기본 포트
        "http://localhost:5174",  # Vite 대체 포트
        "http://localhost:8080",  # 랜딩페이지
        "http://127.0.0.1:8080",  # 랜딩페이지 (127.0.0.1)
        "http://127.0.0.1:5500",  # Live Server
        "http://localhost:5500",  # Live Server
        "http://192.168.0.30:8000",  # 로컬 네트워크 IP
        "http://192.168.0.30:8081",  # Expo 개발 서버
        "https://agri-backend-yxxq.onrender.com",  # Render 배포 URL
        "exp://",  # Expo Go 앱
        "null"  # 로컬 파일 직접 열기
    ],
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)

# 라우터 등록
app.include_router(machine.router)
app.include_router(history.router)
app.include_router(ocr.router)
app.include_router(price_prediction.router)
app.include_router(ai_expert.router)
app.include_router(parts.router)
app.include_router(maintenance.router)
app.include_router(mechanic_ai.router)

# 정적 파일 서빙 설정 (uploads 폴더)
uploads_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
if os.path.exists(uploads_path):
    app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

@app.get("/")
def read_root():
    """API 서버 상태 확인"""
    return {
        "message": "농기계 데이터 이력관리 플랫폼 API 서버 작동 중",
        "version": "1.0.0",
        "status": "healthy"
    }