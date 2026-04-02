# 🚨 Git 히스토리 정리 가이드 (긴급)

## 📋 발견된 보안 문제

### **심각도: 🔴 매우 높음**

Git 히스토리에 다음 민감 정보가 포함되어 GitHub에 푸시되어 있습니다:

1. **실제 OpenAI API 키**
   - 키: `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`
   - 파일: `backend/.env`, `api-keys.txt`, `SET_NEW_API_KEY.md`
   - 커밋: `f3ea9fc`, `abc99fe`, `26a3373`, `38efaad`

2. **데이터베이스 비밀번호**
   - 비밀번호: `1111`
   - 파일: `backend/.env`, `docker-compose.yml`
   - 커밋: 다수

3. **Google Cloud 인증 파일 경로**
   - 파일명: `agrilog-490006-517d900a8a83.json`
   - 노출된 커밋: `f3ea9fc`

---

## 🎯 즉시 조치 사항

### **1단계: API 키 즉시 폐기 (지금 당장!)**

⚠️ **이 작업을 먼저 완료하세요!**

```bash
# OpenAI 대시보드 접속
# https://platform.openai.com/api-keys
# 
# 다음 키를 찾아서 "Revoke" 클릭:
# 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
```

### **2단계: 데이터베이스 비밀번호 변경**

```bash
# MySQL 접속 후 비밀번호 변경
mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED BY '새로운_강력한_비밀번호';
FLUSH PRIVILEGES;
```

---

## 🧹 Git 히스토리 정리 방법

### **방법 1: 새 리포지토리 생성 (가장 안전, 권장)**

이 방법은 히스토리를 완전히 제거하고 깨끗한 상태로 시작합니다.

```powershell
# 1. 현재 작업 디렉토리 백업
cd "c:\Users\msm03\Desktop\농기계 데이터 이력관리 플랫폼"
Copy-Item -Path "agri_log_project" -Destination "agri_log_project_backup" -Recurse

# 2. 프로젝트 디렉토리로 이동
cd agri_log_project

# 3. 민감한 파일 삭제 확인
Remove-Item -Path "api-keys.txt" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "SET_NEW_API_KEY.md" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "SECURITY_CLEANUP_SCRIPTS.md" -Force -ErrorAction SilentlyContinue

# 4. .git 폴더 삭제 (히스토리 완전 제거)
Remove-Item -Path ".git" -Recurse -Force

# 5. 새 Git 리포지토리 초기화
git init

# 6. 모든 파일 추가 (.gitignore가 자동으로 제외)
git add .

# 7. 초기 커밋
git commit -m "Initial commit - Clean codebase without sensitive data"

# 8. GitHub에 새 리포지토리 생성 후 연결
# GitHub에서 새 리포지토리 생성: agri_log_project_clean
git remote add origin https://github.com/evantscompany/agri_log_project_clean.git
git branch -M main
git push -u origin main
```

**장점:**
- ✅ 완전히 깨끗한 히스토리
- ✅ 민감 정보 100% 제거 보장
- ✅ 간단하고 확실함

**단점:**
- ❌ 기존 커밋 히스토리 손실
- ❌ 새 리포지토리 URL 필요

---

### **방법 2: BFG Repo-Cleaner 사용 (고급)**

기존 히스토리를 유지하면서 민감 정보만 제거합니다.

#### **준비 단계**

```powershell
# 1. BFG Repo-Cleaner 다운로드
# https://rtyley.github.io/bfg-repo-cleaner/
# bfg-1.14.0.jar 다운로드 후 프로젝트 루트에 저장

# 2. Java 설치 확인
java -version
# Java가 없으면 설치: https://www.java.com/download/

# 3. 리포지토리 백업
cd "c:\Users\msm03\Desktop\농기계 데이터 이력관리 플랫폼"
git clone --mirror https://github.com/evantscompany/agri_log_project.git agri_log_project_backup.git
```

#### **실행 단계**

```powershell
# 1. 제거할 문자열 목록 파일 생성
@"
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==>***REMOVED***
DB_PASSWORD=1111==>DB_PASSWORD=***REMOVED***
MYSQL_ROOT_PASSWORD:-1111==>MYSQL_ROOT_PASSWORD:***REMOVED***
agrilog-490006-517d900a8a83.json==>***REMOVED***.json
"@ | Out-File -FilePath "passwords.txt" -Encoding UTF8

# 2. BFG로 민감 정보 제거
java -jar bfg-1.14.0.jar --replace-text passwords.txt agri_log_project.git

# 3. 리포지토리 정리
cd agri_log_project.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 4. 강제 푸시 (⚠️ 주의: 되돌릴 수 없음!)
git push --force --all
git push --force --tags

# 5. 로컬 리포지토리 재클론
cd ..
Remove-Item -Path "agri_log_project" -Recurse -Force
git clone https://github.com/evantscompany/agri_log_project.git
```

**장점:**
- ✅ 커밋 히스토리 유지
- ✅ 기존 리포지토리 URL 유지
- ✅ 민감 정보만 선택적 제거

**단점:**
- ❌ 복잡한 과정
- ❌ Java 설치 필요
- ❌ 강제 푸시로 인한 협업자 영향

---

### **방법 3: git filter-repo 사용 (권장 - 고급)**

```powershell
# 1. git filter-repo 설치
pip install git-filter-repo

# 2. 백업 생성
cd "c:\Users\msm03\Desktop\농기계 데이터 이력관리 플랫폼"
Copy-Item -Path "agri_log_project" -Destination "agri_log_project_backup" -Recurse

# 3. 민감한 파일 히스토리에서 완전 제거
cd agri_log_project
git filter-repo --path backend/.env --invert-paths
git filter-repo --path api-keys.txt --invert-paths
git filter-repo --path SET_NEW_API_KEY.md --invert-paths

# 4. 민감한 문자열 교체
git filter-repo --replace-text <(echo "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==>***REMOVED***")

# 5. 원격 리포지토리 재설정
git remote add origin https://github.com/evantscompany/agri_log_project.git

# 6. 강제 푸시
git push --force --all
git push --force --tags
```

---

## 📋 정리 후 체크리스트

### **즉시 확인 사항**
- [ ] OpenAI API 키 폐기 완료
- [ ] 새 OpenAI API 키 발급
- [ ] 데이터베이스 비밀번호 변경
- [ ] 로컬에서 민감 파일 삭제 (`api-keys.txt`, `SET_NEW_API_KEY.md`)

### **Git 히스토리 정리 후**
- [ ] GitHub 리포지토리에서 민감 정보 제거 확인
- [ ] 모든 브랜치 확인
- [ ] `.env` 파일이 Git에 추적되지 않는지 확인
- [ ] `.gitignore` 설정 재확인

### **새 환경 설정**
- [ ] `.env` 파일 생성 (Git 제외)
- [ ] 새 API 키 및 비밀번호 설정
- [ ] Docker Compose 환경변수 설정
- [ ] 애플리케이션 정상 작동 테스트

---

## 🔒 향후 보안 조치

### **1. Pre-commit Hook 설정**

```bash
# .git/hooks/pre-commit 파일 생성
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh

# API 키 패턴 검사
if git diff --cached | grep -E "sk-[a-zA-Z0-9]{20,}"; then
    echo "❌ Error: API key detected in commit!"
    echo "Please remove API keys before committing."
    exit 1
fi

# .env 파일 검사
if git diff --cached --name-only | grep -E "\.env$"; then
    echo "❌ Error: .env file detected in commit!"
    echo ".env files should not be committed."
    exit 1
fi

exit 0
EOF

chmod +x .git/hooks/pre-commit
```

### **2. GitHub Secret Scanning 활성화**

1. GitHub 리포지토리 → Settings
2. Security → Code security and analysis
3. "Secret scanning" 활성화
4. "Push protection" 활성화

### **3. 정기 보안 감사**

- 월 1회: 코드베이스 보안 스캔
- 분기 1회: API 키 교체
- 반기 1회: 전체 보안 감사

---

## ⚠️ 중요 경고

1. **강제 푸시는 되돌릴 수 없습니다**
   - 반드시 백업 생성 후 진행
   - 팀원들에게 사전 공지

2. **협업 중인 경우**
   - 모든 팀원이 로컬 리포지토리 재클론 필요
   - 작업 중인 브랜치 백업 필수

3. **GitHub에 이미 노출된 경우**
   - API 키는 즉시 폐기 (히스토리 정리와 무관)
   - GitHub Secret Scanning이 이미 감지했을 수 있음

---

## 📞 문제 발생 시

1. 백업에서 복원
2. 보안팀 또는 GitHub Support 문의
3. 새 리포지토리 생성 (최후의 수단)

---

**작성일:** 2026년 4월 2일  
**긴급도:** 🔴 최우선  
**예상 소요 시간:** 30분 ~ 1시간
