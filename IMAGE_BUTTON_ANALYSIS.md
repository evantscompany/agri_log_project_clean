# 🔍 정비명세서 보기 버튼 전체 분석 및 수정

**작업 일시:** 2026년 4월 2일 15:41  
**문제:** OCR 후 정비명세서 보기 버튼이 활성화되지 않음

---

## 📊 현재 상태 분석

### **1. 소유자 앱 (owner)**

#### **OCRScannerScreen.js**
**현재 상태:**
- ✅ 정비명세서 보기 버튼 코드 존재 (537-546번 줄)
- ❌ `handleSave`가 `saveMaintenanceRecord` 호출 (로그 확인)
- ❌ `processOCRAndSave` 호출하지 않음
- ❌ `formData.image_url`이 설정되지 않아 버튼 조건 불만족

**문제:**
```javascript
// 로그에서 확인된 실제 호출
await apiService.saveMaintenanceRecord({
  vin: formData.vin,
  service_date: formData.date,
  description: formData.description,
  cost: parseInt(formData.cost) || 0,
  mileage: parseInt(formData.mileage) || 0,
  service_company: formData.vendor || '직접 입력',
});
// ❌ image_path, ocr_text 누락
```

**버튼 조건:**
```javascript
{(formData.image_url || ocrResult?.image_url) && (
  <Button>정비명세서 보기</Button>
)}
```
- `formData.image_url` = undefined
- `ocrResult?.image_url` = undefined
- **결과:** 버튼 렌더링 안됨 ❌

#### **MachineDetailScreen.js**
**현재 상태:**
- ✅ 정비 내역서 보기 버튼 존재 (192-203번 줄)
- ✅ `handleImagePress` 함수 존재
- ⚠️ 하드코딩된 IP (192.168.0.30:8000)

**버튼 조건:**
```javascript
{(item.image_path || item.attachment_url) && (
  <TouchableOpacity onPress={() => handleImagePress(imageUrl)}>
    <Text>정비 내역서 보기</Text>
  </TouchableOpacity>
)}
```

---

### **2. 정비업체 앱 (mechanic)**

#### **OCRScannerScreen.js**
**현재 상태:**
- ✅ `processOCRAndSave` 사용 (431번 줄)
- ✅ `image_path`, `ocr_text` 포함
- ❌ 정비명세서 보기 버튼 없음

**저장 로직:**
```javascript
const saveData = {
  vin: formData.vin.toUpperCase(),
  date: formData.date,
  description: formData.description,
  cost: Number(formData.cost),
  image_path: image,  // ✅
  ocr_text: ocrResult?.text,  // ✅
};
await apiService.processOCRAndSave(saveData);  // ✅
```

#### **MachineDetailScreen.js**
**현재 상태:**
- ✅ 정비 명세서 보기 버튼 존재 (292-301번 줄)
- ✅ `handleImagePress` 함수 존재
- ⚠️ 하드코딩된 IP (192.168.0.30:8000)

**버튼 조건:**
```javascript
{(selectedRecord.image_path || selectedRecord.attachment_url) && (
  <TouchableOpacity onPress={() => handleImagePress(...)}>
    <Text>📄 정비 명세서 보기</Text>
  </TouchableOpacity>
)}
```

---

## 🐛 문제 원인

### **핵심 문제**
1. **소유자 OCRScannerScreen**: `handleSave`가 `saveMaintenanceRecord` 호출
   - `image_path`, `ocr_text` 전달 안됨
   - `maintenance_attachment` 테이블에 저장 안됨
   - 버튼 조건 불만족

2. **OCR 처리 후 이미지 정보 누락**
   - `processOCR`에서 `image_path`, `image_url` 설정
   - 하지만 `handleSave`에서 전달 안됨

3. **하드코딩된 IP 주소**
   - 양쪽 앱 모두 `192.168.0.30:8000` 하드코딩
   - 환경변수 사용 필요

---

## ✅ 수정 방안

### **1. 소유자 OCRScannerScreen.js 수정**

**파일:** `agri-mobile/src/screens/owner/OCRScannerScreen.js`

**수정 1: handleSave 함수 (341-390번 줄)**
```javascript
const handleSave = async () => {
  console.log('=== handleSave 함수 호출됨 ===');
  console.log('formData:', formData);
  
  if (!formData.vin) {
    console.log('VIN 없음 - 알림 표시');
    Alert.alert('알림', '기대번호를 입력해주세요.');
    return;
  }

  try {
    setLoading(true);
    
    console.log('=== 정비 이력 저장 시작 ===');
    console.log('저장 데이터:', {
      vin: formData.vin,
      date: formData.date,
      description: formData.description,
      cost: parseInt(formData.cost) || 0,
      mileage: parseInt(formData.mileage) || 0,
      image_path: formData.image_path,
      ocr_text: ocrResult?.text,
    });
    
    // process-ocr API 사용하여 이미지 경로와 OCR 텍스트 포함하여 저장
    await apiService.processOCRAndSave({
      vin: formData.vin,
      date: formData.date,
      description: formData.description,
      cost: parseInt(formData.cost) || 0,
      mileage: parseInt(formData.mileage) || 0,
      image_path: formData.image_path,
      ocr_text: ocrResult?.text,
    });
    
    console.log('=== 정비 이력 저장 성공 ===');

    Alert.alert('성공', '정비 이력이 저장되었습니다.', [
      {
        text: '확인',
        onPress: () => navigation.goBack(),
      },
    ]);
  } catch (error) {
    console.error('저장 실패:', error);
    Alert.alert('오류', '저장 중 오류가 발생했습니다.');
  } finally {
    setLoading(false);
  }
};
```

---

### **2. 소유자 MachineDetailScreen.js 수정**

**파일:** `agri-mobile/src/screens/owner/MachineDetailScreen.js`

**수정: handleImagePress 함수 (64-87번 줄)**
```javascript
import { API_CONFIG } from '../../config/api';

const handleImagePress = (imagePath) => {
  console.log('handleImagePress 호출:', { imagePath, hasImage: !!imagePath });
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
    console.log('이미지 URL 생성:', fullImageUrl);
    setSelectedImage(fullImageUrl);
    setImageModalVisible(true);
  }
};
```

---

### **3. 정비업체 OCRScannerScreen.js 수정**

**파일:** `agri-mobile/src/screens/mechanic/OCRScannerScreen.js`

**추가: 정비명세서 보기 버튼 및 모달**

**Import 추가:**
```javascript
import { Modal } from 'react-native';
import { API_CONFIG } from '../../config/api';
```

**상태 추가:**
```javascript
const [imageModalVisible, setImageModalVisible] = useState(false);
```

**processOCR 함수 수정 (이미지 정보 저장):**
```javascript
const processOCR = async (imageUri) => {
  try {
    setLoading(true);
    setProgress(0);
    
    setProgress(0.6);
    const ocrData = await apiService.processGoogleVisionOCR(imageUri);
    
    setProgress(1.0);
    setOcrResult({
      text: ocrData.text,
      confidence: ocrData.confidence,
      blocks: ocrData.blocks || [],
      image_path: ocrData.image_path,
      image_url: ocrData.image_url,
    });
    
    // formData에도 이미지 정보 저장
    setFormData(prev => ({
      ...prev,
      image_path: ocrData.image_path,
      image_url: ocrData.image_url,
    }));
    
    // ... 나머지 로직
  } catch (error) {
    console.error('OCR 처리 실패:', error);
    Alert.alert('오류', error.message || 'OCR 처리 중 오류가 발생했습니다.');
  } finally {
    setLoading(false);
  }
};
```

**버튼 추가 (저장 버튼 위에):**
```javascript
{(formData.image_url || ocrResult?.image_url) && (
  <Button
    mode="outlined"
    icon="file-document"
    onPress={() => setImageModalVisible(true)}
    style={styles.viewImageButton}
  >
    정비명세서 보기
  </Button>
)}
```

**모달 추가:**
```javascript
<Modal
  visible={imageModalVisible}
  transparent={true}
  onRequestClose={() => setImageModalVisible(false)}
>
  <View style={styles.modalContainer}>
    <TouchableOpacity 
      style={styles.modalBackground}
      onPress={() => setImageModalVisible(false)}
    >
      <View style={styles.modalContent}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setImageModalVisible(false)}
        >
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
        {(formData.image_url || ocrResult?.image_url) && (
          <Image 
            source={{ 
              uri: (formData.image_url || ocrResult?.image_url).replace(
                'http://localhost:8000',
                API_CONFIG.BASE_URL.replace('/api/v1', '')
              )
            }} 
            style={styles.fullImage}
            resizeMode="contain"
          />
        )}
      </View>
    </TouchableOpacity>
  </View>
</Modal>
```

---

### **4. 정비업체 MachineDetailScreen.js 수정**

**파일:** `agri-mobile/src/screens/mechanic/MachineDetailScreen.js`

**수정: handleImagePress 함수 (54-67번 줄)**
```javascript
import { API_CONFIG } from '../../config/api';

const handleImagePress = (imagePath) => {
  if (imagePath) {
    const baseUrl = API_CONFIG.BASE_URL.replace('/api/v1', '');
    
    let fullImageUrl;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      fullImageUrl = imagePath.replace('http://localhost:8000', baseUrl);
    } else {
      fullImageUrl = `${baseUrl}${imagePath}`;
    }
    setSelectedImage(fullImageUrl);
    setImageModalVisible(true);
  }
};
```

---

## 📋 수정 체크리스트

### **소유자 앱**
- [ ] OCRScannerScreen.js - handleSave 수정 (processOCRAndSave 사용)
- [ ] MachineDetailScreen.js - handleImagePress 수정 (API_CONFIG 사용)

### **정비업체 앱**
- [ ] OCRScannerScreen.js - 정비명세서 보기 버튼 추가
- [ ] OCRScannerScreen.js - 이미지 모달 추가
- [ ] OCRScannerScreen.js - processOCR에서 이미지 정보 저장
- [ ] MachineDetailScreen.js - handleImagePress 수정 (API_CONFIG 사용)

### **공통**
- [ ] 백엔드 재시작
- [ ] 모바일 앱 재시작
- [ ] 양쪽 앱에서 테스트

---

## 🎯 테스트 시나리오

### **소유자 앱**
1. OCR 스캐너 진입
2. 정비 명세서 촬영
3. OCR 처리 대기
4. **정비명세서 보기 버튼 확인** ✓
5. 버튼 클릭하여 이미지 확인 ✓
6. 저장 후 정비 이력 목록 확인
7. **정비 내역서 보기 버튼 확인** ✓

### **정비업체 앱**
1. OCR 스캐너 진입
2. 정비 명세서 촬영
3. OCR 처리 대기
4. **정비명세서 보기 버튼 확인** ✓
5. 버튼 클릭하여 이미지 확인 ✓
6. 저장 후 정비 이력 목록 확인
7. **정비 명세서 보기 버튼 확인** ✓

---

**작업 시작:** 2026년 4월 2일 15:41  
**상태:** 분석 완료, 수정 진행 중
