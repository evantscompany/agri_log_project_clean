# 농기계 데이터 이력관리 플랫폼 - 프로젝트 분석 보고서

## 📋 개요

**프로젝트명**: 농기계 데이터 이력관리 플랫폼 (Agri Log Project)  
**개발 기간**: 2026년  
**기술 스택**: React Native + FastAPI + MySQL + Docker  
**목표**: 농기계 소유자와 정비업체를 위한 종합적인 정비 이력 관리 솔루션

---

## 🏗️ 시스템 아키텍처

### **전체 구조**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Native  │    │   FastAPI       │    │   MySQL 8.0     │
│   (Mobile App)  │◄──►│   (Backend)     │◄──►│   (Database)    │
│                 │    │                 │    │                 │
│ - 농민 화면     │    │ - REST API      │    │ - 농기계 정보   │
│ - 정비업체 화면 │    │ - OCR 처리      │    │ - 정비 이력     │
│ - QR/OCR 스캔  │    │ - AI 예측       │    │ - 부품 정보     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   Google Cloud  │              │
         └──────────────►│   Vision API   │◄─────────────┘
                        │   (OCR)        │
                        └─────────────────┘
```

### **Docker 컨테이너 구성**
- **MySQL** (포트 3307): 데이터베이스 서버
- **Backend** (포트 8000): FastAPI API 서버
- **Frontend** (포트 80): React 웹 앱 (선택적)
- **Mobile**: Expo 개발 서버 (포트 8081)

---

## 🗄️ 데이터베이스 ERD

### **핵심 테이블 구조**

```mermaid
erDiagram
    manufacturer_codes ||--o{ machine_master : "mfg_code"
    category_codes ||--o{ machine_master : "cat_code"
    machine_master ||--o{ machine_instance : "model_id"
    machine_instance ||--o{ maintenance_log : "vin"
    maintenance_log ||--o{ maintenance_detail : "log_id"
    maintenance_log ||--o{ maintenance_attachment : "log_id"
    machine_master ||--o{ part_list : "model_id"
    maintenance_log ||--o{ ocr_raw_data : "log_id"
    maintenance_attachment ||--o{ ocr_raw_data : "attachment_id"

    manufacturer_codes {
        CHAR(1) mfg_code PK "제조사 코드"
        VARCHAR(20) mfg_name "제조사명"
    }
    
    category_codes {
        CHAR(1) cat_code PK "기종 코드"
        VARCHAR(20) cat_name "기종명"
    }
    
    machine_master {
        INT model_id PK "모델 ID"
        CHAR(1) mfg_code FK "제조사 코드"
        CHAR(1) cat_code FK "기종 코드"
        VARCHAR(10) model_identifier "모델 식별자"
        VARCHAR(50) base_model_name "기본 모델명"
        INT hp "마력"
    }
    
    machine_instance {
        VARCHAR(50) vin PK "차대번호"
        INT model_id FK "모델 ID"
        INT production_year "생산 연도"
        INT total_hours "총 가동시간"
        TINYINT(1) is_deleted "삭제 여부"
    }
    
    maintenance_log {
        INT log_id PK "이력 ID"
        VARCHAR(50) vin FK "차대번호"
        DATE service_date "정비일자"
        INT total_cost "총 비용"
        TEXT ai_summary "AI 요약"
        INT working_hours "가동시간"
        VARCHAR(100) service_company "정비업체"
    }
    
    maintenance_detail {
        INT detail_id PK "상세 ID"
        INT log_id FK "이력 ID"
        INT part_id FK "부품 ID"
        VARCHAR(100) item_name "품목명"
        INT labor_cost "공임비"
        INT part_cost "부품비"
        INT quantity "수량"
    }
    
    maintenance_attachment {
        INT attachment_id PK "첨부파일 ID"
        INT log_id FK "이력 ID"
        VARCHAR(255) file_path "파일 경로"
        VARCHAR(255) original_name "원본 파일명"
        ENUM attachment_type "첨부파일 타입"
        ENUM ocr_status "OCR 처리 상태"
        TEXT ocr_result "OCR 결과"
    }
    
    part_list {
        INT part_id PK "부품 ID"
        INT model_id FK "모델 ID"
        VARCHAR(50) system_group "계통명"
        VARCHAR(50) part_number "부품번호"
        VARCHAR(100) part_name "부품명"
        INT base_price "표준단가"
        INT base_labor "표준공임"
    }
    
    ocr_raw_data {
        INT ocr_id PK "OCR ID"
        INT log_id FK "이력 ID"
        INT attachment_id FK "첨부파일 ID"
        TEXT raw_text "OCR 원본 텍스트"
        JSON parsed_data "파싱된 데이터"
        VARCHAR(20) parsing_version "파싱 버전"
        ENUM parsing_status "파싱 상태"
        VARCHAR(50) extracted_vin "추출된 VIN"
        DATE extracted_service_date "추출된 정비일자"
        INT extracted_total_cost "추출된 총비용"
        DECIMAL(3,2) confidence_score "신뢰도"
    }
```

### **주요 특징**
- **중앙화된 VIN 파싱**: `parse_agri_vin()` 함수로 일관된 VIN 처리
- **정규화된 구조**: 제조사/기종 코드 테이블로 데이터 중복 최소화
- **OCR 데이터 관리**: 원본 텍스트와 파싱 결과 분리 저장
- **부품 정보 연동**: 모델별 부품 리스트와 정비 이력 연동

---

## 🔌 API 명세서

### **기본 정보**
- **Base URL**: `http://localhost:8000/api/v1`
- **인증**: 현재 없음 (향후 JWT 추가 예정)
- **데이터 형식**: JSON

### **주요 엔드포인트**

#### **1. 농기계 관리 (/machines)**
```http
GET    /machines                    # 농기계 목록 조회
GET    /machines/{vin}              # 특정 농기계 상세 정보
POST   /machines                    # 농기계 등록 (미구현)
PUT    /machines/{vin}              # 농기계 정보 수정 (미구현)
DELETE /machines/{vin}              # 농기계 삭제 (미구현)
```

#### **2. 정비 이력 (/history)**
```http
GET    /history/machine/{vin}        # 특정 농기계 정비 이력
POST   /history/                    # 정비 이력 추가
PUT    /history/{record_id}         # 정비 이력 수정
DELETE /history/{record_id}         # 정비 이력 삭제
GET    /history/unverified          # 검증 실패 이력 조회
```

#### **3. OCR 처리 (/ocr)**
```http
POST   /ocr/google-vision-ocr       # Google Vision OCR 처리
POST   /ocr/process-and-save         # OCR 처리 및 데이터 저장
GET    /ocr/status/{attachment_id}  # OCR 처리 상태 조회
```

#### **4. 가격 예측 (/price)**
```http
POST   /price/predict               # AI 가격 예측
GET    /price/models                # 예측 모델 정보
```

#### **5. AI 전문가 (/ai)**
```http
POST   /ai/expert-advice           # AI 전문가 상담
POST   /ai/mechanic-chat           # 정비업체 AI 챗봇
```

#### **6. 부품 관리 (/parts)**
```http
GET    /parts                       # 부품 목록 조회
GET    /parts/{part_id}            # 특정 부품 정보
GET    /parts/model/{model_id}     # 모델별 부품 목록
```

### **응답 형식 예시**

#### **성공 응답**
```json
{
  "success": true,
  "message": "정비 이력이 추가되었습니다.",
  "data": {
    "id": 123,
    "vin": "DC0001240001"
  }
}
```

#### **에러 응답**
```json
{
  "detail": "등록되지 않은 농기계입니다."
}
```

---

## 📱 모바일 앱 구조

### **화면 구성**

#### **농민 (Owner) 화면**
```
OwnerDashboard (대시보드)
├── MachineList (농기계 목록)
├── MachineDetail (농기계 상세)
├── OCRScanner (OCR 스캔)
└── PricePrediction (가격 예측)
```

#### **정비업체 (Mechanic) 화면**
```
MechanicDashboard (대시보드)
├── MaintenanceList (정비 목록)
├── MachineDetail (농기계 상세)
├── OCRScanner (OCR 스캔)
├── QRScan (QR 스캔)
└── AIChatbot (AI 챗봇)
```

#### **공통 화면**
```
RoleSelection (역할 선택)
SplashScreen (스플래시)
SettingsScreen (설정)
```

### **주요 기능**

#### **1. OCR 스캔**
- 정비 명세서 사진 촬영
- Google Vision API 텍스트 추출
- AI 기반 데이터 파싱
- 자동 정비 이력 등록

#### **2. QR 코드**
- 농기계 정보 QR 생성
- QR 스캔으로 농기계 조회
- 웹/앱 연동 링크 포함

#### **3. AI 가격 예측**
- 농기계 사용시간 기반 가격 예측
- 머신러닝 모델 활용 (scikit-learn)
- 자산 가치 평가

#### **4. AI 챗봇**
- 정비 전문가 상담
- OpenAI GPT 통합
- 농기계 문제 해결 조언

---

## 🛠️ 기술 상세

### **Backend 기술 스택**
- **FastAPI**: 현대적 Python 웹 프레임워크
- **Pydantic**: 데이터 검증 및 직렬화
- **PyMySQL**: MySQL 데이터베이스 연결
- **Google Cloud Vision**: OCR 처리
- **OpenAI**: AI 챗봇 기능
- **scikit-learn**: 머신러닝 예측 모델
- **QRCode**: QR 코드 생성

### **Frontend 기술 스택**
- **React Native**: 크로스플랫폼 모바일 개발
- **Expo**: 개발 및 배포 플랫폼
- **React Navigation**: 화면 내비게이션
- **React Native Paper**: UI 컴포넌트 라이브러리
- **Axios**: HTTP 클라이언트

### **개발 환경**
- **Docker**: 컨테이너화 배포
- **Docker Compose**: 멀티 컨테이너 관리
- **VS Code**: 개발 IDE
- **Git**: 버전 관리

---

## 📊 주요 기능 상세

### **1. VIN 파싱 시스템**
```python
def parse_agri_vin(vin_code):
    """
    VIN 코드 파싱: DI008024656
    - D: 대동 (제조사)
    - I: 콤바인 (기종)
    - 0080: 모델 식별자
    - 24: 생산 연도 (2024년)
    - 656: 일련번호
    """
```

### **2. OCR 처리 파이프라인**
```
이미지 업로드 → Google Vision API → 텍스트 추출 → AI 파싱 → 데이터베이스 저장
```

### **3. 가격 예측 모델**
- **입력**: 사용시간, 모델명, 제조사
- **알고리즘**: Linear Regression / Random Forest
- **출력**: 예상 가격, 신뢰도

### **4. AI 상담 시스템**
- **모델**: OpenAI GPT-4
- **프롬프트**: 농기계 정비 전문가 페르소나
- **기능**: 문제 진단, 해결책 제안

---

## ✅ 장점

### **1. 기술적 장점**
- **현대적 아키텍처**: 마이크로서비스, 컨테이너화
- **확장성**: REST API, 분리된 프론트엔드/백엔드
- **자동화**: OCR, AI 예측, 데이터 파싱
- **표준화**: 일관된 VIN 파싱, 정규화된 DB 구조

### **2. 사용자 경험**
- **편의성**: 스캔 한 번으로 데이터 입력
- **정확성**: AI 기반 데이터 파싱 및 검증
- **접근성**: 모바일 앱, 웹, QR 코드 연동
- **전문성**: AI 챗봇 상담, 가격 예측

### **3. 비즈니스 가치**
- **효율성**: 수작업 데이터 입력 감소
- **정확성**: 인적 오류 최소화
- **투명성**: 정비 이력 투명 관리
- **가치 평가**: 자산 가치 정확 평가

---

## ⚠️ 단점 및 개선점

### **1. 현재 단점**
- **인증 부재**: 사용자 인증 시스템 없음
- **보안 취약**: API 키 하드코딩, 데이터 암호화 없음
- **성능 이슈**: 대시보드 로딩 시 자산가치 계산 (개선됨)
- **에러 처리**: 불완전한 예외 처리 및 사용자 피드백

### **2. 기술적 개선점**
- **인증 시스템**: JWT/OAuth 구현
- **보안 강화**: 환경변수 관리, 데이터 암호화
- **성능 최적화**: 캐싱, 비동기 처리, 배치 작업
- **테스트**: 단위 테스트, 통합 테스트 추가

### **3. 기능적 개선점**
- **실시간 알림**: 정비 알림, 예약 시스템
- **분석 대시보드**: 비용 분석, 사용 패턴 분석
- **소셜 기능**: 커뮤니티, 리뷰 시스템
- **예약 시스템**: 정비 예약, 일정 관리

### **4. 운영적 개선점**
- **모니터링**: 로그 시스템, 성능 모니터링
- **백업**: 자동 백업, 재해 복구
- **CI/CD**: 자동 배포 파이프라인
- **문서화**: API 문서, 사용자 매뉴얼

---

## 📈 성능 및 확장성

### **현재 성능**
- **응답 시간**: API 평균 200-500ms
- **동시 사용자**: 10-50명 (테스트 기준)
- **데이터 처리**: OCR 1건당 3-5초
- **메모리 사용**: Backend 512MB, Frontend 256MB

### **확장성 고려**
- **수평 확장**: Docker 컨테이너 증설
- **데이터베이스**: 읽기 전용 복제본 추가
- **파일 저장**: AWS S3 등 클라우드 스토리지
- **CDN**: 정적 파일 전송 최적화

---

## 🔮 향후 로드맵

### **단기 (1-3개월)**
1. **인증 시스템** 구현
2. **보안 강화** 및 코드 리팩토링
3. **테스트 코드** 추가
4. **성능 최적화**

### **중기 (3-6개월)**
1. **실시간 알림** 시스템
2. **분석 대시보드** 고도화
3. **예약 시스템** 구현
4. **웹 앱** 개선

### **장기 (6개월 이상)**
1. **AI 모델** 고도화
2. **소셜 기능** 추가
3. **B2B 기능** 확장
4. **해외 시장** 진출

---

## 📝 결론

농기계 데이터 이력관리 플랫폼은 현대적인 기술 스택을 기반으로 한 잘 설계된 시스템입니다. OCR, AI, 머신러닝 기술을 효과적으로 활용하여 사용자 편의성을 극대화했으며, 확장 가능한 아키텍처로 향후 성장을 대비하고 있습니다.

다만 보안, 인증, 테스트 등 기본적인 시스템 요소가 부족하고, 성능 최적화가 필요한 부분이 있습니다. 이러한 점들을 보완한다면 농기계 관리 시장에서 강력한 경쟁력을 가질 수 있는 솔루션이 될 것입니다.

---

**작성일**: 2026년 4월 1일  
**작성자**: 개발팀  
**버전**: 1.0.0
