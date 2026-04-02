@echo off
chcp 65001 >nul
echo ========================================
echo 농기계 데이터 이력관리 플랫폼 Docker 실행
echo ========================================
echo.

REM Docker Desktop 실행 확인
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker가 설치되지 않았거나 실행 중이 아닙니다.
    echo    Docker Desktop을 실행해주세요.
    pause
    exit /b 1
)

echo ✅ Docker 확인 완료
echo.

REM .env.docker 파일 확인
if not exist ".env.docker" (
    echo ❌ .env.docker 파일이 없습니다.
    echo    .env.docker 파일을 생성하고 설정해주세요.
    pause
    exit /b 1
)

echo ✅ 환경변수 파일 확인 완료
echo.

echo 🚀 Docker Compose 실행 중...
docker-compose --env-file .env.docker up -d

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ 배포 완료!
    echo ========================================
    echo.
    echo 📍 접속 주소:
    echo    Frontend: http://localhost
    echo    Backend API: http://localhost:8000
    echo    API 문서: http://localhost:8000/docs
    echo.
    echo 📊 상태 확인: docker-compose ps
    echo 📋 로그 확인: docker-compose logs -f
    echo 🛑 중지: docker-compose down
    echo.
) else (
    echo.
    echo ❌ 배포 실패
    echo    로그를 확인하세요: docker-compose logs
    echo.
)

pause
