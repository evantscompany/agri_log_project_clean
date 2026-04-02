# 농기계 데이터 이력관리 플랫폼 전체 분석 문서

## 📋 프로젝트 개요

### 🎯 프로젝트명
**농기계 데이터 이력관리 플랫폼 (Agricultural Machinery Data Management Platform)**

### 🌟 프로젝트 정체성
농업 현장의 디지털 전환을 선도하는 **스마트 농기계 관리 솔루션**으로, 농기계의 전체 생애주기 데이터를 통합 관리하여 농업 생산성을 혁신하고 농가 소득 증대에 기여하는 것을 목표로 합니다.

### 📍 적용 분야
- **농가**: 개인 농기계 관리 및 정비 이력 추적
- **정비업체**: 전문적인 정비 서비스 및 부품 관리
- **농기계 제조사**: A/S 데이터 분석 및 제품 개선
- **정부/지자체**: 농기계 현황 파악 및 정책 수립 지원
- **농업 협동조합**: 단지 내 농기계 통합 관리

### 📅 개발 기간
- 시작: 2026년 3월 초
- 현재: 2026년 3월 27일 (진행 중)

### 🏗️ 아키텍처
- **마이크로서비스 아키텍처 (MSA)**
- **Docker 컨테이너 기반**
- **RESTful API 설계**

---

## 🏢 시스템 구성

### 🐳 Docker 컨테이너 구조

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   agri_mysql    │    │  agri_backend   │    │ agri_frontend   │
│   (Database)    │◄──►│   (FastAPI)     │◄──►│   (React)       │
│   Port: 3307    │    │   Port: 8000    │    │   Port: 80      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ agri_mobile     │
                    │ (React Native)  │
                    │ Port: 8081      │
                    └─────────────────┘
```

---

## 🗄️ 데이터베이스 구조

### 📊 주요 테이블

| 테이블명 | 설명 | 주요 필드 |
|---------|------|----------|
| `machine_master` | 농기계 마스터 정보 | vin, model_name, manufacturer, year |
| `machine_instance` | 농기계 인스턴스 | vin, total_hours, purchase_date |
| `maintenance_log` | 정비 이력 | log_id, vin, service_date, total_cost |
| `maintenance_detail` | 정비 상세 | detail_id, log_id, part_name, quantity |
| `ocr_raw_data` | OCR 원본 데이터 | id, vin, ocr_text, created_at |
| `part_list` | 부품 목록 | part_number, part_name, price |

---

## 🔧 백엔드 (FastAPI)

### 📁 디렉토리 구조

```
backend/
├── app/
│   ├── main.py              # FastAPI 애플리케이션 진입점
│   ├── database.py          # 데이터베이스 연결 설정
│   ├── models/              # Pydantic 모델
│   ├── routers/             # API 라우터
│   │   ├── history.py       # 정비 이력 API
│   │   ├── machine.py       # 농기계 정보 API
│   │   ├── ocr.py           # OCR 처리 API
│   │   ├── parts.py         # 부품 관리 API
│   │   ├── price_prediction.py # 가격 예측 API
│   │   └── ai_expert.py     # AI 전문가 API
│   ├── services/            # 비즈니스 로직
│   └── utils/               # 유틸리티 함수
├── ML/                      # 머신러닝 모델
├── credentials/             # Google Cloud 인증
├── uploads/                 # 파일 업로드 저장소
└── requirements.txt         # Python 의존성
```

### 🚀 주요 API 엔드포인트

| 경로 | 메서드 | 설명 |
|------|--------|------|
| `/api/v1/machines` | GET | 농기계 목록 조회 |
| `/api/v1/machines/{vin}` | GET | 특정 농기계 정보 조회 |
| `/api/v1/history` | GET/POST | 정비 이력 조회/생성 |
| `/api/v1/history/{id}` | GET/PUT/DELETE | 정비 이력 상세 관리 |
| `/api/v1/ocr/upload-image` | POST | 이미지 업로드 |
| `/api/v1/ocr/google-vision-ocr` | POST | Google Vision OCR 처리 |
| `/api/v1/parts` | GET/POST | 부품 목록 관리 |
| `/api/v1/price/predict` | POST | 가격 예측 |
| `/api/v1/ai/expert` | POST | AI 전문가 상담 |

---

## 🌐 프론트엔드 (React)

### 📁 디렉토리 구조

```
frontend/
├── src/
│   ├── components/          # React 컴포넌트
│   ├── pages/              # 페이지 컴포넌트
│   │   ├── Dashboard.jsx   # 대시보드
│   │   ├── MachineList.jsx # 기계 목록
│   │   ├── MachineDetail.jsx # 기계 상세
│   │   ├── OCRScanner.jsx  # OCR 스캐너
│   │   └── PricePrediction.jsx # 가격 예측
│   ├── services/           # API 서비스
│   ├── utils/              # 유틸리티 함수
│   └── App.jsx             # 메인 애플리케이션
├── Dockerfile              # Docker 빌드 설정
└── nginx.conf              # Nginx 설정
```

### 🎨 주요 기능

- **대시보드**: 농기계 현황, 정비 이력 요약
- **기계 관리**: 등록, 조회, 수정, 삭제
- **OCR 스캐너**: 정비 명세서 스캔 및 데이터 추출
- **가격 예측**: 머신러닝 기반 가격 예측
- **AI 전문가**: GPT 기반 정비 상담

---

## 📱 모바일 앱 (React Native)

### 📁 디렉토리 구조

```
agri-mobile/
├── src/
│   ├── components/         # 공통 컴포넌트
│   ├── config/             # 설정 파일
│   │   └── api.js          # API 설정
│   ├── context/            # React Context
│   ├── navigation/         # 네비게이션 설정
│   │   └── AppNavigator.js # 메인 네비게이터
│   ├── screens/            # 화면 컴포넌트
│   │   ├── owner/          # 소유자용 화면
│   │   │   ├── Dashboard.js
│   │   │   ├── MachineList.js
│   │   │   └── OCRScannerScreen.js
│   │   └── mechanic/       # 정비업체용 화면
│   │       ├── Dashboard.js
│   │       └── MachineDetailScreen.js
│   └── services/           # API 서비스
│       └── api.js          # API 호출 함수
├── package.json            # 의존성 설정
└── app.json               # Expo 설정
```

### 🎯 주요 기능

- **역할 기반 접근**: 소유자/정비업체 모드
- **OCR 스캔**: 카메라로 정비 명세서 스캔
- **데이터 추출**: VIN, 비용, 부품번호 자동 추출
- **정비 이력**: 실시간 이력 관리
- **가격 예측**: 모바일 가격 예측

---

## 🔍 OCR 처리 파이프라인

### 📸 처리 흐름

```
1. 이미지 업로드
   └─ /api/v1/ocr/upload-image
   
2. Google Vision API 처리
   └─ /api/v1/ocr/google-vision-ocr
   └─ 텍스트 추출 및 분석
   
3. 데이터 파싱
   └─ VIN 추출 (다양한 패턴)
   └─ 날짜 추출 (발행번호 포맷)
   └─ 비용 추출 (총비용, 부품비)
   └─ 부품번호 추출 (AA-B-CC-DDDD)
   └─ 정비업체 추출 (다양한 휴리스틱)
   
4. 데이터 저장
   └─ OCR 원본 데이터 저장
   └─ 정비 이력 자동 생성
```

### 🧠 파싱 알고리즘

#### VIN 추출 패턴
- `[A-Z]{2}\d{9,13}` (기본 패턴)
- `DC\d{9}` (대동 기계)
- `DI\d{9}` (대동 이앙기)

#### 부품번호 패턴
- `DD-[A-Z]{2}-\d{4}-\d{3}` (대동 부품)
- `AA-B-CC-DDDD` (표준 부품)

#### 비용 추출
- 정규식: `[\d,]+원`
- 다음 라인 비용 추출
- 총비용/부품비 구분

---

## 🤖 AI 기능

### 🧠 머신러닝 모델

#### 가격 예측 모델
- **알고리즘**: Random Forest Regressor
- **특성**: 마력, 연식, 사용시간, 제조사
- **정확도**: 약 85%
- **모델 파일**: `ML/price_prediction_model.pkl`

#### 데이터 전처리
- 결측치 처리
- 범주형 변수 인코딩
- 특성 스케일링

### 🎯 GPT 기반 AI 전문가

#### 기능
- 정비 상담
- 기술 지원
- 부품 추천

#### 프롬프트 엔지니어링
- 역할 설정 (농기계 전문가)
- 컨텍스트 제공
- 구조화된 응답

---

## 🔐 보안 및 인증

### 🛡️ 보안 조치

1. **데이터베이스 보안**
   - 비밀번호 환경변수화
   - 컨테이너 간 네트워크 분리
   - 최소 권한 원칙

2. **API 보안**
   - CORS 설정
   - 요청 크기 제한
   - 에러 핸들링

3. **파일 보안**
   - 파일 크기 제한 (10MB)
   - 파일 타입 검증
   - 안전한 파일 저장

### 🔑 인증 방식
- 현재: 세션 기반 인증 (개발 중)
- 계획: JWT 토큰 인증

---

## 📊 성능 최적화

### ⚡ 백엔드 최적화

1. **데이터베이스**
   - 인덱스 최적화
   - 커넥션 풀링
   - 쿼리 튜닝

2. **API 성능**
   - 비동기 처리
   - 캐싱 전략
   - 로드 밸런싱

3. **파일 처리**
   - 스트리밍 업로드
   - 이미지 압축
   - 클라우드 저장 고려

### 📱 모바일 최적화

1. **네트워크**
   - API 타임아웃 설정 (10초)
   - 오프라인 모드 지원
   - 데이터 캐싱

2. **성능**
   - 이미지 최적화
   - 메모리 관리
   - 배경 처리

---

## 🚀 배포 및 운영

### 🐳 Docker 배포

#### 빌드 명령어
```bash
# 전체 서비스 시작
docker-compose --env-file .env.docker up -d

# 개별 서비스 재시작
docker-compose restart backend

# 로그 확인
docker-compose logs -f backend
```

#### 환경변수 설정
```bash
# 데이터베이스
MYSQL_ROOT_PASSWORD=1111
MYSQL_DATABASE=agrilog_db
MYSQL_USER=agri_user
MYSQL_PASSWORD=1111

# API 키
OPENAI_API_KEY=sk-...
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-credentials.json
```

### 📊 모니터링

#### 헬스체크
- MySQL: `mysqladmin ping`
- Backend: `curl -f http://localhost:8000/health`
- Frontend: `curl -f http://localhost`

#### 로그 관리
- 애플리케이션 로그
- 접근 로그
- 에러 로그

---

## 🔧 개발 환경 설정

### 📋 요구사항

1. **Docker & Docker Compose**
2. **Node.js 18+** (모바일 개발)
3. **Python 3.11+** (백엔드 개발)
4. **Expo CLI** (모바일 테스트)

### 🛠️ 개발 서버 시작

```bash
# 1. 백엔드/프론트엔드 시작
docker-compose --env-file .env.docker up -d

# 2. 모바일 개발 서버
cd agri-mobile
npm install
npm start

# 3. Expo Go 앱으로 접속
# QR 코드 스캔 또는 Expo Go 앱에서 수동 접속
```

### 🔧 API 테스트

```bash
# 농기계 목록 조회
curl http://localhost:8000/api/v1/machines

# OCR 테스트
curl -X POST -F "image=@test.jpg" http://localhost:8000/api/v1/ocr/upload-image
```

---

## 🐛 문제 해결

### 🔧 자주 발생하는 문제

1. **네트워크 연결 오류**
   - 원인: API URL 설정 오류
   - 해결: PC IP 주소 확인 및 설정

2. **데이터베이스 연결 실패**
   - 원인: 비밀번호 불일치
   - 해결: 환경변수 일치화

3. **OCR 처리 타임아웃**
   - 원인: 이미지 크기过大
   - 해결: 이미지 압축 및 크기 제한

4. **모바일 저장 실패**
   - 원인: API 경로 중복 (/api/v1/api/v1/)
   - 해결: 경로 정리

### 📝 디버깅 팁

1. **백엔드 로그 확인**
   ```bash
   docker logs agri_backend --tail 20
   ```

2. **모바일 콘솔 로그**
   - Expo 개발자 도구 사용
   - 네트워크 탭에서 API 호출 확인

3. **데이터베이스 상태 확인**
   ```bash
   docker exec agri_mysql mysql -u agri_user -p1111 agrilog_db
   ```

---

## 📈 향후 개발 계획

### 🎯 단기 목표 (1개월)

1. **인증 시스템 구축**
   - JWT 토큰 인증
   - 역할 기반 접근 제어

2. **알림 시스템**
   - 정비 예약 알림
   - 정비 주기 알림

3. **성능 개선**
   - API 응답 속도 개선
   - 모바일 최적화

### 🚀 중기 목표 (3개월)

1. **실시간 기능**
   - WebSocket 채팅
   - 실시간 상태 업데이트

2. **분석 대시보드**
   - 정비 통계
   - 비용 분석

3. **클라우드 마이그레이션**
   - AWS/GCP 배포
   - 확장성 개선

### 🌟 장기 목표 (6개월)

1. **AI 기능 확장**
   - 예측 정비
   - 자동화 시스템

2. **모바일 앱 출시**
   - App Store/Play Store 배포
   - 사용자 피드백 반영

3. **B2B 서비스**
   - 정비업체 관리 시스템
   - 부품 공급망 연동

---

## 📚 기술 스택

### 🏗️ 백엔드
- **FastAPI**: Python 웹 프레임워크
- **PyMySQL**: MySQL 데이터베이스 커넥터
- **Pydantic**: 데이터 검증
- **Google Vision API**: OCR 처리
- **OpenAI API**: AI 전문가 시스템
- **scikit-learn**: 머신러닝

### 🎨 프론트엔드
- **React**: UI 라이브러리
- **React Router**: 라우팅
- **Axios**: HTTP 클라이언트
- **Vite**: 빌드 도구
- **Nginx**: 웹 서버

### 📱 모바일
- **React Native**: 모바일 프레임워크
- **Expo**: 개발 플랫폼
- **React Navigation**: 네비게이션
- **React Native Paper**: UI 컴포넌트
- **Axios**: HTTP 클라이언트

### 🐳 인프라
- **Docker**: 컨테이너화
- **Docker Compose**: 멀티 컨테이너 관리
- **MySQL**: 데이터베이스
- **Nginx**: 리버스 프록시

---

## 👥 팀 구성 및 역할

### 🎯 개발팀
- **백엔드 개발자**: API 개발, 데이터베이스 설계
- **프론트엔드 개발자**: 웹 UI/UX 개발
- **모바일 개발자**: React Native 앱 개발
- **AI 엔지니어**: 머신러닝 모델 개발
- **DevOps 엔지니어**: 인프라 관리, 배포

### 🔄 협업 도구
- **Git**: 버전 관리
- **Docker**: 개발 환경 통일
- **VS Code**: 코드 에디터
- **Postman**: API 테스트

---

## � 프로젝트 비전과 활용 방향

### 🎯 핵심 가치 제안

#### 💰 경제적 가치
- **농가 소득 증대**: 정비 예측으로 고장 방지, 생산성 향상
- **비용 절감**: 최적의 정비 시기 알림, 불필요한 비용 감소
- **자산 가치 극대화**: 체계적인 관리로 농기계 잔존 가치 유지

#### 🌱 사회적 가치
- **농업 생산성 향상**: 가동률 증대로 수확량 증가
- **식량 안보 기여**: 안정적인 농업 생산 지원
- **디지털 농업 전환**: 농업 현장의 기술 수준 향상

#### 🌍 환경적 가치
- **자원 효율화**: 불필요한 부품 교체 감소
- **에너지 절약**: 최적 운전으로 연료 효율 개선
- **지속가능한 농업**: 장기적인 데이터 기반 의사결정 지원

### 📈 시장 확장 전략

#### 🎯 단기 목표 (1년)
- **국내 시장 선점**: 국내 농기계 관리 시장의 30% 점유
- **파트너십 구축**: 주요 농기계 제조사와 A/S 데이터 연동
- **서비스 고도화**: AI 기반 예측 정비 기능 완성

#### 🌏 중기 목표 (3년)
- **해외 시장 진출**: 동남아시아 농업 국가로 수출
- **플랫폼 확장**: 농업용 드론, 스마트팜 장비 연동
- **데이터 상용화**: 빅데이터 분석 서비스 런칭

#### 🌟 장기 목표 (5년)
- **글로벌 리더십**: 세계 농기계 관리 솔루션 표준화
- **생태계 구축**: 농업 IoT 플랫폼으로 확장
- **지속가능성**: ESG 경영 실천 및 사회적 책임 다하기

### 🔄 비즈니스 모델

#### 💳 수익 모델
1. **SaaS 구독**: 월별/연간 구독료 (농가, 정비업체)
2. **API 라이선스**: 제조사용 데이터 연동 API 제공
3. **데이터 분석**: 정부/연구기관용 빅데이터 판매
4. **광고 및 제휴**: 부품 판매, 보험 상품 연동

#### 🤝 파트너십 전략
- **제조사**: 새 농기계 출시 시 데이터 연동
- **보험사**: 농기계 보험료 할인 프로그램
- **금융기관**: 농기계 담보 대출 심사 지원
- **정부기관**: 농업 정책 데이터 제공

### 🚀 기술 혁신 방향

#### 🤖 AI/ML 고도화
- **예측 정비**: 고장 가능성 95% 예측
- **최적 운전**: 작업 조건별 최적 운전 모드 추천
- **자동화**: 정비 일정 자동 생성 및 부품 주문

#### 📱 모바일 확장
- **오프라인 기능**: 인터넷 없이도 데이터 동기화
- **음성 인식**: 음성으로 정비 기록 입력
- **AR 기능**: 스마트글라스로 정비 가이드 제공

#### 🔗 블록체인 적용
- **데이터 위변조 방지**: 정비 이력 블록체인 저장
- **부품 추적**: 가품 부품 방지 시스템
- **거래 투명성**: 중고 농기계 거래 신뢰도 향상

### 🌍 사회적 영향

#### 👥 농업 인구 지원
- **고령화 대응**: 경험 없는 청년 농부도 쉽게 사용
- **후계양성**: 매력적인 디지털 농업 환경 제공
- **교육 프로그램**: 농업 기술 교육 플랫폼 연동

#### 🏘️ 지역 사회 기여
- **일자리 창출**: 디지털 농업 전문가 양성
- **지역 경제 활성화**: 정비업체 역량 강화
- **농촌 혁신**: 스마트농업 시범 마을 조성

---

## �📞 문의 및 지원

### 📧 연락처
- **프로젝트 관리자**: [이메일]
- **기술 지원**: [이메일]
- **버그 리포트**: [GitHub Issues]

### 📖 추가 자료
- **API 문서**: http://localhost:8000/docs
- **데이터베이스 스키마**: `/backend/DATABASE_STRUCTURE.md`
- **Docker 배포 가이드**: `/DOCKER_DEPLOYMENT_GUIDE.md`

---

## 📝 라이선스

### 📄 저작권
- © 2026 농기계 데이터 이력관리 플랫폼 개발팀
- 모든 권리 보유

### 🔓 오픈소스 라이선스
- MIT License (자체 코드)
- 각 라이브러리별 라이선스 준수

---

*이 문서는 프로젝트의 현재 상태(2026년 3월 27일)를 기준으로 작성되었으며, 지속적으로 업데이트됩니다.*
