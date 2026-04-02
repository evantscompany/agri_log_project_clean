@echo off
chcp 65001 >nul
echo ========================================
echo 농기계 데이터 이력관리 플랫폼 Docker 중지
echo ========================================
echo.

docker-compose down

if %errorlevel% equ 0 (
    echo.
    echo ✅ 모든 컨테이너가 중지되었습니다.
    echo.
) else (
    echo.
    echo ❌ 중지 실패
    echo.
)

pause
