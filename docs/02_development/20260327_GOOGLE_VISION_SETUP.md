# Google Vision API 설정 가이드

Google Cloud Vision API를 사용하여 OCR 기능을 구현했습니다.

## 📋 사전 준비사항

### 1. Google Cloud 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. 프로젝트 이름: `agri-log-ocr` (원하는 이름 사용 가능)

### 2. Cloud Vision API 활성화

1. 좌측 메뉴 → **API 및 서비스** → **라이브러리**
2. 검색창에 `Cloud Vision API` 입력
3. **Cloud Vision API** 선택
4. **사용 설정** 클릭

### 3. 서비스 계정 생성 및 키 다운로드

1. 좌측 메뉴 → **API 및 서비스** → **사용자 인증 정보**
2. **사용자 인증 정보 만들기** → **서비스 계정** 선택
3. 서비스 계정 정보 입력:
   - **서비스 계정 이름**: `agri-log-vision-ocr`
   - **서비스 계정 ID**: 자동 생성됨
   - **설명**: `농기계 이력관리 OCR 서비스`
4. **만들기 및 계속하기** 클릭
5. **역할 선택**:
   - `Cloud Vision API 사용자` 또는
   - `편집자` (테스트용)
6. **완료** 클릭
7. 생성된 서비스 계정 클릭
8. **키** 탭 → **키 추가** → **새 키 만들기**
9. **JSON** 선택 → **만들기**
10. JSON 키 파일이 자동으로 다운로드됩니다

---

## 🔧 프로젝트 설정

### 1. JSON 키 파일 배치

다운로드한 JSON 키 파일을 프로젝트 폴더에 저장합니다:

```
agri_log_project/
├── backend/
│   ├── credentials/
│   │   └── google-vision-key.json  ← 여기에 저장
│   ├── app/
│   └── .env
```

**보안 주의사항:**
- JSON 키 파일은 절대 Git에 커밋하지 마세요!
- `.gitignore`에 `credentials/` 폴더 추가 권장

### 2. .env 파일 수정

`backend/.env` 파일을 열고 다음 내용을 수정합니다:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=1111
DB_NAME=agrilog_db

# Google Vision API 설정
# 서비스 계정 JSON 키 파일 경로 (절대 경로 또는 상대 경로)
GOOGLE_APPLICATION_CREDENTIALS=credentials/google-vision-key.json
```

**경로 옵션:**
- **상대 경로** (권장): `credentials/google-vision-key.json`
- **절대 경로**: `C:/Users/msm03/Desktop/농기계 데이터 이력관리 플랫폼/agri_log_project/backend/credentials/google-vision-key.json`

### 3. 환경변수 로드 확인

백엔드 서버가 `.env` 파일을 자동으로 로드하도록 설정되어 있습니다.

---

## 🚀 사용 방법

### API 엔드포인트

**Google Vision OCR 처리**
```
POST /api/v1/ocr/google-vision-ocr
Content-Type: multipart/form-data

파라미터:
- file: 이미지 파일 (jpg, jpeg, png, webp)

응답:
{
  "success": true,
  "text": "추출된 전체 텍스트",
  "confidence": 95.5,  // 신뢰도 (0-100)
  "blocks": [
    {
      "text": "텍스트 블록 1",
      "confidence": 0.98
    }
  ],
  "message": "OCR 처리가 완료되었습니다."
}
```

### 프론트엔드 사용

OCRScanner 컴포넌트에서 자동으로 Google Vision API를 사용합니다:

1. 사용자가 이미지 촬영/업로드
2. 서버에 이미지 업로드 및 압축
3. **Google Vision API로 OCR 처리** (자동)
4. 추출된 데이터 표시 및 편집
5. DB 저장

---

## 🧪 테스트

### 1. 백엔드 서버 재시작

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

서버 시작 시 콘솔 확인:
- ✅ 정상: 에러 메시지 없음
- ❌ 실패: `Google Vision API 초기화 실패` 메시지 표시

### 2. API 테스트 (Postman 또는 curl)

```bash
curl -X POST "http://localhost:8000/api/v1/ocr/google-vision-ocr" \
  -F "file=@정비명세서_샘플.png"
```

### 3. 웹 애플리케이션 테스트

1. 프론트엔드 접속: `http://localhost:5174`
2. "영수증 스캔" 클릭
3. 이미지 업로드
4. OCR 결과 확인 (Google Vision 사용)

---

## ⚠️ 문제 해결

### 인증 오류

**증상:**
```
Google Vision API 초기화 실패: Could not automatically determine credentials
```

**해결 방법:**
1. JSON 키 파일 경로 확인
2. `.env` 파일의 `GOOGLE_APPLICATION_CREDENTIALS` 경로 확인
3. 파일 권한 확인 (읽기 권한 필요)

### API 할당량 초과

**증상:**
```
OCR 처리 실패: Quota exceeded
```

**해결 방법:**
1. [Google Cloud Console](https://console.cloud.google.com/) → **API 및 서비스** → **할당량**
2. Cloud Vision API 할당량 확인
3. 필요시 할당량 증가 요청 또는 결제 설정

### 비용 관련

- **무료 할당량**: 월 1,000건 무료
- **초과 시**: 이미지당 $1.50 / 1,000건
- 자세한 내용: [Vision API 가격 정책](https://cloud.google.com/vision/pricing)

---

## 📊 Tesseract vs Google Vision 비교

| 항목 | Tesseract.js | Google Vision API |
|------|--------------|-------------------|
| **정확도** | 낮음 (60-70%) | 높음 (90-98%) |
| **한글 인식** | 보통 | 우수 |
| **처리 속도** | 느림 (10-30초) | 빠름 (1-3초) |
| **비용** | 무료 | 월 1,000건 무료 |
| **오프라인** | 가능 | 불가능 |
| **설정** | 간단 | 인증 필요 |

---

## 🔄 Tesseract로 되돌리기

Google Vision API 사용이 어려운 경우 Tesseract로 되돌릴 수 있습니다:

1. `frontend/src/pages/OCRScanner.jsx` 파일 열기
2. 주석 처리된 Tesseract 코드 활성화
3. Google Vision 코드 주석 처리
4. `import { createWorker } from 'tesseract.js';` 주석 해제

---

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. Google Cloud Console에서 API 활성화 상태
2. 서비스 계정 권한 설정
3. JSON 키 파일 경로 및 권한
4. 백엔드 서버 콘솔 로그

**Google Vision API 공식 문서:**
- [Cloud Vision API 개요](https://cloud.google.com/vision/docs)
- [OCR 가이드](https://cloud.google.com/vision/docs/ocr)
