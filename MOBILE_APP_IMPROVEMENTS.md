# 📱 모바일 앱 개선 사항

**작업 일시:** 2026년 4월 2일 15:10  
**작업 범위:** Splash 애니메이션, 이미지 로딩, API 네트워크 오류 해결

---

## ✅ 완료된 개선 사항

### **1. Splash 화면 애니메이션 추가** 🎨

**문제:**
- 단순한 초록색 화면만 표시
- 애니메이션 효과 부족

**해결:**
- ✅ 로고 회전 애니메이션 (3초 주기)
- ✅ 펄스 효과 (1초 주기로 확대/축소)
- ✅ 순차적 텍스트 등장 애니메이션
  - 로고 → 타이틀 → 서브타이틀 → 태그라인
- ✅ 농기계 이모지 아이콘 (🌾) 추가
- ✅ 전체 애니메이션 시간: 3.5초

**변경 파일:**
- `agri-mobile/src/screens/SplashScreen.js`

**주요 코드:**
```javascript
// 로고 회전 애니메이션
Animated.loop(
  Animated.timing(rotateAnim, {
    toValue: 1,
    duration: 3000,
    useNativeDriver: true,
  })
).start();

// 펄스 효과
Animated.loop(
  Animated.sequence([
    Animated.timing(pulseAnim, {
      toValue: 1.1,
      duration: 1000,
      useNativeDriver: true,
    }),
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }),
  ])
).start();

// 순차적 등장 애니메이션
Animated.sequence([
  Animated.parallel([
    Animated.timing(fadeAnim, { toValue: 1, duration: 800 }),
    Animated.spring(scaleAnim, { toValue: 1, friction: 4 }),
  ]),
  Animated.timing(titleFadeAnim, { toValue: 1, duration: 600 }),
  Animated.timing(subtitleFadeAnim, { toValue: 1, duration: 500 }),
  Animated.timing(taglineFadeAnim, { toValue: 1, duration: 500 }),
]).start();
```

---

### **2. 이미지 로딩 문제 해결** 🖼️

**문제:**
- 하드코딩된 IP 주소 (`192.168.0.30:8000`)
- 환경 변경 시 이미지 로딩 실패

**해결:**
- ✅ 환경변수 기반 이미지 URL 생성
- ✅ `API_CONFIG.BASE_URL` 사용
- ✅ localhost 자동 변환
- ✅ 상대 경로 및 절대 경로 모두 지원

**변경 파일:**
- `agri-mobile/src/screens/owner/MachineDetailScreen.js`

**주요 코드:**
```javascript
const handleImagePress = (imagePath) => {
  if (imagePath) {
    // API_CONFIG에서 BASE_URL 가져오기
    const baseUrl = API_CONFIG.BASE_URL.replace('/api/v1', '');
    
    // 이미 전체 URL인 경우와 상대 경로인 경우 모두 처리
    let fullImageUrl;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      // localhost를 실제 서버 URL로 변경
      fullImageUrl = imagePath.replace('http://localhost:8000', baseUrl);
    } else {
      fullImageUrl = `${baseUrl}${imagePath}`;
    }
    
    console.log('이미지 로딩 시작:', fullImageUrl);
    setSelectedImage(fullImageUrl);
    setImageModalVisible(true);
  }
};
```

**Import 추가:**
```javascript
import { API_CONFIG } from '../../config/api';
```

---

### **3. API 네트워크 오류 해결** 🔧

**문제:**
```
ERROR [API Error] Network Error
저장 실패: [AxiosError: Network Error]
```

**원인 분석:**
1. 타임아웃이 너무 짧음 (10초)
2. 에러 핸들링 부족
3. 네트워크 상태 확인 없음

**해결:**
- ✅ 타임아웃을 30초로 증가 (`API_CONFIG.TIMEOUT`)
- ✅ 상세한 에러 로깅 추가
- ✅ try-catch 블록으로 에러 핸들링 강화
- ✅ 에러 타입별 로깅 (response, request, config)

**변경 파일:**
- `agri-mobile/src/services/api.js`

**주요 코드:**
```javascript
// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT || 30000,  // 30초
  headers: {
    'Content-Type': 'application/json',
  },
});

// 정비 이력 저장 - 개선된 에러 핸들링
saveMaintenanceRecord: async (data) => {
  console.log('=== API 호출 시작 ===');
  console.log('BASE_URL:', API_CONFIG.BASE_URL);
  console.log('URL: POST /history/');
  console.log('데이터:', data);
  
  try {
    const response = await apiClient.post('/history/', {
      vin: data.vin,
      service_date: data.service_date,
      description: data.description,
      cost: data.cost,
      mileage: data.mileage,
      service_company: data.service_company || '직접 입력',
    });
    
    console.log('=== API 응답 수신 ===');
    console.log('응답:', response.data);
    return response.data;
  } catch (error) {
    console.error('=== API 호출 실패 ===');
    console.error('에러 타입:', error.constructor.name);
    console.error('에러 메시지:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    } else if (error.request) {
      console.error('요청 전송됨, 응답 없음');
    } else {
      console.error('요청 설정 오류:', error.message);
    }
    throw error;
  }
}
```

---

## 🔍 추가 확인 사항

### **환경변수 설정 확인**

`.env` 파일이 올바르게 설정되어 있는지 확인하세요:

```bash
# agri-mobile/.env
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.90:8000/api/v1
EXPO_PUBLIC_API_TIMEOUT=30000
```

**IP 주소 확인 방법:**
```powershell
# Windows
ipconfig

# 현재 PC의 IP 주소를 확인하고 .env 파일에 설정
```

---

## 🚀 테스트 방법

### **1. Splash 애니메이션 테스트**
```bash
cd agri-mobile
npm start
# 앱을 재시작하여 Splash 화면 확인
```

**확인 사항:**
- ✅ 로고가 회전하는가?
- ✅ 펄스 효과가 보이는가?
- ✅ 텍스트가 순차적으로 나타나는가?
- ✅ 전체 애니메이션이 부드러운가?

### **2. 이미지 로딩 테스트**
1. 농기계 상세 화면 진입
2. 정비 이력의 이미지 클릭
3. 이미지 모달이 정상적으로 표시되는지 확인

**로그 확인:**
```
LOG  이미지 로딩 시작: http://192.168.0.90:8000/uploads/...
```

### **3. API 네트워크 테스트**
1. OCR 스캐너에서 정비 명세서 스캔
2. 정보 입력 후 저장 버튼 클릭
3. 성공 메시지 확인

**로그 확인:**
```
LOG  === API 호출 시작 ===
LOG  BASE_URL: http://192.168.0.90:8000/api/v1
LOG  === API 응답 수신 ===
```

---

## ⚠️ 문제 해결

### **Network Error가 계속 발생하는 경우**

**1. IP 주소 확인**
```powershell
ipconfig
# IPv4 주소 확인
```

**2. .env 파일 업데이트**
```bash
EXPO_PUBLIC_API_BASE_URL=http://[실제IP주소]:8000/api/v1
```

**3. 앱 재시작**
```bash
# Expo 서버 중지 (Ctrl+C)
npm start
# 캐시 클리어
npm start --clear
```

**4. Docker 백엔드 확인**
```powershell
docker ps
# agri_backend가 실행 중인지 확인

docker logs agri_backend --tail 20
# 백엔드 로그 확인
```

**5. 방화벽 확인**
- Windows 방화벽에서 포트 8000 허용
- 같은 네트워크에 연결되어 있는지 확인

---

## 📊 변경 파일 요약

| 파일 | 변경 내용 | 상태 |
|------|-----------|------|
| `SplashScreen.js` | 애니메이션 추가 | ✅ 완료 |
| `MachineDetailScreen.js` | 이미지 URL 환경변수화 | ✅ 완료 |
| `api.js` | 타임아웃 증가, 에러 핸들링 개선 | ✅ 완료 |

---

## 🎯 다음 단계

1. **앱 재시작**
   ```bash
   cd agri-mobile
   npm start
   ```

2. **테스트 진행**
   - Splash 애니메이션 확인
   - 이미지 로딩 테스트
   - OCR 및 정비 이력 저장 테스트

3. **문제 발생 시**
   - 로그 확인
   - IP 주소 재확인
   - Docker 백엔드 상태 확인

---

**작업 완료 시간:** 2026년 4월 2일 15:10  
**상태:** ✅ 모든 개선 사항 적용 완료
