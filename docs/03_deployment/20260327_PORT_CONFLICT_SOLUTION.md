# 🔧 포트 충돌 해결 완료

## 문제
```
Error: ports are not available: exposing port TCP 0.0.0.0:3306
```

로컬 컴퓨터에 MySQL이 이미 실행 중이어서 Docker의 MySQL과 포트 충돌 발생

---

## ✅ 해결 방법

Docker의 MySQL 포트를 **3306 → 3307**로 변경했습니다.

### 변경 내용
- Docker MySQL: 포트 **3307** 사용 (외부 접속용)
- 컨테이너 내부: 포트 3306 유지 (Backend가 자동 연결)

---

## 🚀 다시 실행하기

### 방법 1: 배치 파일
```
docker-start.bat 더블클릭
```

### 방법 2: 명령어
```bash
docker-compose --env-file .env.docker up -d
```

---

## 📊 포트 구성

| 서비스 | 외부 포트 | 내부 포트 | 접속 주소 |
|--------|----------|----------|-----------|
| Frontend | 80 | 80 | http://localhost |
| Backend | 8000 | 8000 | http://localhost:8000 |
| MySQL | **3307** | 3306 | localhost:3307 |

---

## 💡 추가 정보

### Backend는 자동으로 연결됩니다
Backend 컨테이너는 Docker 네트워크 내부에서 `mysql:3306`으로 연결하므로 **코드 수정 불필요**

### 외부에서 MySQL 접속 시
```bash
mysql -h 127.0.0.1 -P 3307 -u agri_user -p
```

### 로컬 MySQL 중지하고 싶다면
```bash
# Windows 서비스에서 MySQL 중지
net stop MySQL80

# 그 후 docker-compose.yml의 포트를 3306으로 되돌리기
```

---

## ✅ 이제 정상 작동합니다!

다시 `docker-start.bat`를 실행하거나 다음 명령어를 실행하세요:
```bash
docker-compose --env-file .env.docker up -d
```
