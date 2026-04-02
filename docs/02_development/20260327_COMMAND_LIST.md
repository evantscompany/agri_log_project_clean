가상환경 생성: 터미널에서 python -m venv venv 실행.

가상환경 활성화: .\venv\Scripts\activate (윈도우 기준).

# 시작
docker-compose --env-file .env.docker up -d

# 중지
docker-compose down

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f backend

# 재시작
docker-compose restart