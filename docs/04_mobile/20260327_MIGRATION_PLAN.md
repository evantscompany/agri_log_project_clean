# React Native 앱 기능 이식 계획

## 📋 웹 프론트엔드 주요 기능 분석

### 1. 농민용 포탈 (Owner)
- ✅ **Dashboard** - 농기계 목록 및 통계 (기본 구현 완료)
- ✅ **MachineDetail** - 농기계 상세 정보 (기본 구현 완료)
- ⚠️ **OCRScanner** - 정비명세서 스캔 및 OCR 처리 (미구현)
- ⚠️ **PricePrediction** - AI 가격 예측 (미구현)
- ⚠️ **MachinePricePrediction** - 전체 농기계 가격 예측 (미구현)
- ⚠️ **AddMachine** - 농기계 추가 (미구현)
- ⚠️ **AddRecord** - 정비 기록 추가 (미구현)

### 2. 정비사용 포탈 (Mechanic)
- ✅ **MechanicDashboard** - 정비사 대시보드 (기본 구현 완료)
- ⚠️ **MechanicQRScan** - QR 코드 스캔 (미구현)
- ⚠️ **MechanicMachineDetail** - 상세 정보 + OCR + AI 소견 (미구현)
  - OCR 스캔 및 파싱
  - 부품 자동 매칭
  - AI 정비 소견 생성
  - 정비 기록 저장
- ⚠️ **MechanicServiceEntry** - 정비 기록 입력 (미구현)
- ⚠️ **MechanicChatbot** - AI 챗봇 (OpenAI API) (미구현)

### 3. 핵심 API 기능
- ✅ 농기계 목록 조회 (`/api/v1/machines`)
- ✅ 농기계 상세 조회 (`/api/v1/machines/{vin}`)
- ✅ 정비 이력 조회 (`/api/v1/history/machine/{vin}`)
- ⚠️ OCR 처리 (`/api/v1/ocr/google-vision-ocr`) - 미연동
- ⚠️ 정비 기록 생성 (`/api/v1/maintenance/log`) - 미연동
- ⚠️ 가격 예측 (`/api/v1/price/predict`) - 미연동
- ⚠️ AI 전문가 소견 (`/api/v1/expert/opinion/{vin}`) - 미연동
- ⚠️ 챗봇 (OpenAI API 직접 호출) - 미연동

---

## 🎯 이식 우선순위

### Phase 1: 핵심 기능 (정비사용)
1. **OCR 스캐너 화면** ⭐⭐⭐
   - expo-camera로 카메라 촬영
   - expo-image-picker로 갤러리 선택
   - Google Vision API 연동
   - OCR 결과 파싱 및 표시
   - 정비 기록 자동 생성

2. **정비사 농기계 상세 화면 개선** ⭐⭐⭐
   - OCR 스캔 버튼 추가
   - 부품 자동 매칭 기능
   - AI 정비 소견 생성
   - 정비 이력 상세 표시

3. **QR 코드 스캔** ⭐⭐
   - expo-barcode-scanner 사용
   - VIN 자동 인식
   - 농기계 상세로 이동

### Phase 2: AI 기능
4. **AI 챗봇** ⭐⭐
   - OpenAI API 연동
   - 정비 전문가 챗봇
   - 실시간 질의응답

5. **AI 가격 예측** ⭐⭐
   - ML 모델 기반 가격 예측
   - 전체 농기계 일괄 예측
   - 결과 시각화

### Phase 3: 추가 기능
6. **농기계 추가/수정** ⭐
   - 농기계 등록 폼
   - VIN 파싱
   - 이미지 업로드

7. **정비 기록 수동 입력** ⭐
   - 폼 기반 입력
   - 부품 선택
   - 비용 계산

### Phase 4: UI/UX 개선
8. **레이아웃 및 스타일 개선** ⭐⭐⭐
   - 현대적인 디자인
   - 애니메이션 추가
   - 사용성 향상
   - 다크 모드 지원

---

## 🛠️ 기술 스택

### React Native 패키지
- ✅ `expo-camera` - 카메라 촬영
- ✅ `expo-image-picker` - 갤러리 선택
- ✅ `expo-barcode-scanner` - QR/바코드 스캔
- ✅ `@react-navigation/native` - 네비게이션
- ✅ `react-native-paper` - UI 컴포넌트
- ✅ `axios` - API 통신
- ⚠️ `react-native-chart-kit` - 차트 (필요시 추가)
- ⚠️ `react-native-svg` - SVG 아이콘 (필요시 추가)

### API 연동
- ✅ FastAPI 백엔드 (`http://192.168.0.30:8000`)
- ⚠️ Google Vision API (OCR)
- ⚠️ OpenAI API (챗봇, AI 소견)
- ⚠️ ML 모델 (가격 예측)

---

## 📝 구현 상세

### 1. OCR 스캐너 (우선순위 1)

**파일:** `src/screens/mechanic/OCRScannerScreen.js`

**기능:**
- 카메라로 정비명세서 촬영
- 갤러리에서 이미지 선택
- Google Vision API로 OCR 처리
- 텍스트 파싱 (VIN, 날짜, 비용, 부품 등)
- 추출된 데이터 검증 및 수정
- 정비 기록 자동 생성

**웹 코드 참고:**
- `frontend/src/pages/OCRScanner.jsx` (715줄)
- `frontend/src/pages/MechanicMachineDetail.jsx` (OCR 모달 부분)

**주요 로직:**
```javascript
// 1. 이미지 업로드
const uploadResult = await uploadMaintenanceImage(file);

// 2. Google Vision OCR 처리
const ocrData = await processGoogleVisionOCR(file);

// 3. 텍스트 파싱
const extracted = extractReceiptInfo(ocrData.text);
// - VIN 추출: /[A-Z]{2}\d{9,13}/
// - 날짜 추출: /(\d{4}[-./]\d{2}[-./]\d{2})/
// - 금액 추출: 수리비, 최종 합계 라인
// - 작업 내용: 정비사 소견, 키워드 기반

// 4. 부품 매칭 (백엔드 API)
const matchedParts = await matchParts(extracted.parts);

// 5. 정비 기록 저장
await createMaintenanceRecord({
  vin, service_date, service_company,
  total_cost, parts: matchedParts
});
```

### 2. 정비사 농기계 상세 화면 개선

**파일:** `src/screens/mechanic/MechanicMachineDetailScreen.js`

**추가 기능:**
- OCR 스캔 버튼 (카메라 아이콘)
- OCR 결과 모달
- 부품 목록 표시 (OCR + DB)
- AI 정비 소견 생성 버튼
- 정비 이력 상세 모달

**웹 코드 참고:**
- `frontend/src/pages/MechanicMachineDetail.jsx` (1368줄)

### 3. QR 코드 스캔

**파일:** `src/screens/mechanic/QRScanScreen.js`

**기능:**
- expo-barcode-scanner 사용
- QR 코드에서 VIN 추출
- 자동으로 농기계 상세 화면으로 이동

**코드 예시:**
```javascript
import { BarCodeScanner } from 'expo-barcode-scanner';

const handleBarCodeScanned = ({ type, data }) => {
  // VIN 검증
  if (isValidVIN(data)) {
    navigation.navigate('MechanicMachineDetail', { vin: data });
  }
};
```

### 4. AI 챗봇

**파일:** `src/components/MechanicChatbot.js`

**기능:**
- OpenAI API 연동 (gpt-4o-mini)
- 정비 전문가 시스템 프롬프트
- 실시간 채팅 인터페이스
- 농기계 정보 컨텍스트 제공

**웹 코드 참고:**
- `frontend/src/components/MechanicChatbot.jsx` (243줄)

### 5. AI 가격 예측

**파일:** `src/screens/owner/PricePredictionScreen.js`

**기능:**
- 단일 농기계 가격 예측
- 전체 농기계 일괄 예측
- 예측 결과 시각화
- 신뢰도 표시

**웹 코드 참고:**
- `frontend/src/pages/PricePrediction.jsx` (235줄)
- `frontend/src/pages/MachinePricePrediction.jsx` (468줄)

---

## 🎨 UI/UX 개선 계획

### 현재 문제점
- 기본 레이아웃만 구현됨
- 스타일링 부족
- 애니메이션 없음
- 사용성 낮음

### 개선 방향
1. **디자인 시스템**
   - 일관된 색상 팔레트
   - 타이포그래피 정의
   - 간격 및 여백 표준화

2. **컴포넌트 개선**
   - 카드 디자인 개선
   - 버튼 스타일 통일
   - 입력 폼 개선
   - 로딩 인디케이터

3. **애니메이션**
   - 화면 전환 애니메이션
   - 리스트 아이템 페이드인
   - 버튼 피드백
   - 스켈레톤 로딩

4. **사용성**
   - 터치 영역 확대
   - 에러 메시지 개선
   - 성공 피드백
   - 오프라인 지원

---

## 📅 일정

### Week 1: 핵심 기능 (OCR + 정비사 화면)
- Day 1-2: OCR 스캐너 구현
- Day 3-4: 정비사 상세 화면 개선
- Day 5: QR 코드 스캔 구현

### Week 2: AI 기능
- Day 1-2: AI 챗봇 구현
- Day 3-4: AI 가격 예측 구현
- Day 5: 테스트 및 버그 수정

### Week 3: 추가 기능 + UI/UX
- Day 1-2: 농기계 추가/수정 기능
- Day 3-4: UI/UX 개선
- Day 5: 전체 테스트 및 최적화

---

## ✅ 완료 체크리스트

### Phase 1: 핵심 기능
- [ ] OCR 스캐너 화면
- [ ] 정비사 농기계 상세 화면 개선
- [ ] QR 코드 스캔

### Phase 2: AI 기능
- [ ] AI 챗봇
- [ ] AI 가격 예측

### Phase 3: 추가 기능
- [ ] 농기계 추가/수정
- [ ] 정비 기록 수동 입력

### Phase 4: UI/UX
- [ ] 디자인 시스템 적용
- [ ] 애니메이션 추가
- [ ] 사용성 개선
- [ ] 다크 모드

### Phase 5: 테스트
- [ ] 단위 테스트
- [ ] 통합 테스트
- [ ] 사용자 테스트
- [ ] 성능 최적화
