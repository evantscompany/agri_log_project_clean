# 🚀 Docker 빠른 시작 가이드

Docker를 처음 사용하시는 분들을 위한 5분 빠른 시작 가이드입니다.

---

## ⚡ 3단계로 시작하기

### 1️⃣ Docker Desktop 설치

**Windows 사용자:**
1. https://www.docker.com/products/docker-desktop/ 접속
2. "Download for Windows" 클릭
3. 설치 파일 실행 후 재시작
4. Docker Desktop 실행 (작업 표시줄에 고래 아이콘 확인)

**설치 확인:**
```bash
docker --version
```

### 2️⃣ 환경변수 설정

`.env.docker` 파일을 열어 다음 항목만 수정:

```bash
# MySQL 비밀번호 (원하는 비밀번호로 변경)
MYSQL_ROOT_PASSWORD=your_password_here
MYSQL_PASSWORD=your_password_here

# OpenAI API 키 (있으면 입력, 없으면 나중에)
OPENAI_API_KEY=sk-proj-xxxxx
```

### 3️⃣ 실행!

**방법 A: 배치 파일 사용 (가장 쉬움)**
```
docker-start.bat 더블클릭
```

**방법 B: 명령어 사용**
```bash
docker-compose --env-file .env.docker up -d
```

---

## 🌐 접속하기

실행 후 1-2분 대기 후 접속:

- **웹사이트**: http://localhost
- **API 문서**: http://localhost:8000/docs

---

## 🛑 중지하기

**방법 A: 배치 파일**
```
docker-stop.bat 더블클릭
```

**방법 B: 명령어**
```bash
docker-compose down
```

---

## 📊 상태 확인

```bash
# 컨테이너 상태
docker-compose ps

# 로그 보기
docker-compose logs -f
```

---

## ❓ 문제 발생 시

### "port is already allocated" 오류
→ 다른 프로그램이 포트 사용 중. 해당 프로그램 종료 후 재시도

### MySQL 연결 실패
→ 1-2분 대기 후 재시도 (MySQL 초기화 시간 필요)

### 더 자세한 가이드
→ `DOCKER_DEPLOYMENT_GUIDE.md` 참고

---

## 🎯 핵심 명령어

```bash
# 시작
docker-compose --env-file .env.docker up -d

# 중지
docker-compose down

# 재시작
docker-compose restart

# 로그 확인
docker-compose logs -f backend

# 상태 확인
docker-compose ps
```

---

**그게 다입니다! 🎉**

더 자세한 내용은 `DOCKER_DEPLOYMENT_GUIDE.md`를 참고하세요.
