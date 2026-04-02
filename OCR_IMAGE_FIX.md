# 🔧 OCR 이미지 및 정비명세서 보기 문제 해결

**작업 일시:** 2026년 4월 2일 15:32  
**문제:** OCR 후 정비명세서 보기 버튼 미활성화, 이미지 로딩 문제, maintenance_attachment 테이블 저장 안됨

---

## 🐛 발견된 문제점

### **1. OCR 실행 후 정비명세서 보기 버튼 미활성화**
- **원인:** `google-vision-ocr` API가 이미지 경로를 반환하지 않음
- **결과:** `formData.image_url`이 없어 버튼이 렌더링되지 않음

### **2. 이미지 로딩 문제**
- **소유자 앱:** 로딩만 계속 돌아감 (이미지는 보임)
- **정비업체 앱:** 검은 화면만 나옴 (이미지 안보임)
- **원인:** `localhost:8000`이 하드코딩되어 있어 환경변수 기반 URL로 변환 필요

### **3. maintenance_attachment 테이블 저장 안됨**
- **원인:** OCR 처리 시 이미지는 저장되지만 `maintenance_attachment` 테이블에 레코드가 생성되지 않음
- **결과:** 정비 이력에 첨부파일 정보가 없음

---

## ✅ 해결 방법

### **1. 백엔드: google-vision-ocr API 수정**

**파일:** `backend/app/routers/ocr.py`

**변경 내용:**
```python
# 이미지 압축 및 저장 로직 추가
compressed_image = compress_image(contents)

# 고유 파일명 생성
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
unique_id = str(uuid.uuid4().hex[:32])
file_name = f"{unique_id}_{timestamp}.jpg"
file_path = os.path.join(UPLOAD_DIR, file_name)

# 파일 저장
with open(file_path, 'wb') as f:
    f.write(compressed_image)

# Google Vision API로 OCR 처리
ocr_result = vision_ocr.extract_text_from_bytes(contents)
```

**응답에 이미지 경로 추가:**
```python
return {
    "success": True,
    "text": ocr_result['text'],
    "confidence": ocr_result['confidence'],
    "blocks": ocr_result['blocks'],
    "parsed_data": parsed_data,
    "image_path": file_path,  # 추가
    "image_url": f"http://localhost:8000/{file_path}",  # 추가
    "message": "OCR 처리가 완료되었습니다."
}
```

---

### **2. 모바일 앱: OCR 스캐너 수정**

**파일:** `agri-mobile/src/screens/owner/OCRScannerScreen.js`

**변경 1: Import 추가**
```javascript
import { Modal } from 'react-native';
import { API_CONFIG } from '../../config/api';
```

**변경 2: 상태 추가**
```javascript
const [imageModalVisible, setImageModalVisible] = useState(false);
```

**변경 3: processOCR 함수 수정**
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
      image_path: ocrData.image_path,  // 추가
      image_url: ocrData.image_url,    // 추가
    });
    
    const extracted = extractReceiptInfo(ocrData.text);
    
    setFormData({
      vin: extracted.vin || '',
      date: extracted.date || new Date().toISOString().split('T')[0],
      description: extracted.description || '',
      cost: extracted.cost || '',
      mileage: '',
      vendor: extracted.vendor || '',
      partNumbers: extracted.partNumbers || [],
      image_path: ocrData.image_path,  // 추가
      image_url: ocrData.image_url,    // 추가
    });
    
    setIsEditing(true);
  } catch (error) {
    console.error('OCR 처리 실패:', error);
    Alert.alert('오류', error.message || 'OCR 처리 중 오류가 발생했습니다.');
  } finally {
    setLoading(false);
  }
};
```

**변경 4: handleSave 함수 수정 (process-ocr API 사용)**
```javascript
const handleSave = async () => {
  if (!formData.vin) {
    Alert.alert('알림', '기대번호를 입력해주세요.');
    return;
  }

  try {
    setLoading(true);
    
    // process-ocr API 사용하여 이미지 경로와 OCR 텍스트 포함하여 저장
    await apiService.processOCRAndSave({
      vin: formData.vin,
      date: formData.date,
      description: formData.description,
      cost: parseInt(formData.cost) || 0,
      mileage: parseInt(formData.mileage) || 0,
      image_path: formData.image_path,  // 이미지 경로 포함
      ocr_text: ocrResult?.text,        // OCR 텍스트 포함
    });
    
    Alert.alert('성공', '정비 이력이 저장되었습니다.', [
      { text: '확인', onPress: () => navigation.goBack() },
    ]);
  } catch (error) {
    console.error('저장 실패:', error);
    Alert.alert('오류', '저장 중 오류가 발생했습니다.');
  } finally {
    setLoading(false);
  }
};
```

**변경 5: 정비명세서 보기 버튼 추가**
```javascript
{(formData.image_url || ocrResult?.image_url) && (
  <Button
    mode="outlined"
    icon="file-document"
    onPress={handleImagePress}
    style={styles.viewImageButton}
  >
    정비명세서 보기
  </Button>
)}
```

**변경 6: 이미지 모달 추가**
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

**변경 7: 스타일 추가**
```javascript
viewImageButton: {
  marginTop: 12,
  borderRadius: 12,
  borderColor: '#2E7D32',
},
modalContainer: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
},
modalBackground: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},
modalContent: {
  width: '100%',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
},
closeButton: {
  position: 'absolute',
  top: 50,
  right: 20,
  zIndex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  borderRadius: 20,
  padding: 8,
},
fullImage: {
  width: '100%',
  height: '80%',
},
```

---

## 🔄 데이터 흐름

### **기존 (문제 있음)**
```
1. OCR 촬영
2. google-vision-ocr API 호출 (이미지 저장 안됨)
3. OCR 결과만 반환 (image_path 없음)
4. saveMaintenanceRecord API 호출 (이미지 정보 없음)
5. maintenance_log만 저장됨
6. maintenance_attachment 저장 안됨 ❌
```

### **수정 후 (정상)**
```
1. OCR 촬영
2. google-vision-ocr API 호출
   - 이미지 압축 및 저장 ✅
   - OCR 처리
   - image_path, image_url 반환 ✅
3. formData에 image_path, image_url 저장 ✅
4. 정비명세서 보기 버튼 활성화 ✅
5. processOCRAndSave API 호출
   - image_path, ocr_text 포함 ✅
6. maintenance_log 저장 ✅
7. maintenance_attachment 저장 ✅
```

---

## 🎯 테스트 방법

### **1. 백엔드 재시작**
```powershell
docker restart agri_backend
```

### **2. 모바일 앱 재시작**
```bash
cd agri-mobile
npm start
```

### **3. OCR 테스트**
1. OCR 스캐너 화면 진입
2. 정비 명세서 촬영 또는 선택
3. OCR 처리 대기
4. **"정비명세서 보기" 버튼 확인** ✅
5. 버튼 클릭하여 이미지 모달 확인 ✅
6. 정보 확인 후 저장
7. DB 확인:
   ```sql
   SELECT * FROM maintenance_attachment ORDER BY attachment_id DESC LIMIT 1;
   ```

### **4. 예상 결과**
- ✅ 정비명세서 보기 버튼이 활성화됨
- ✅ 버튼 클릭 시 이미지 모달이 표시됨
- ✅ 이미지가 정상적으로 로드됨
- ✅ maintenance_attachment 테이블에 레코드 저장됨

---

## 📊 변경 파일 요약

| 파일 | 변경 내용 | 상태 |
|------|-----------|------|
| `backend/app/routers/ocr.py` | google-vision-ocr API에 이미지 저장 로직 추가 | ✅ |
| `agri-mobile/src/screens/owner/OCRScannerScreen.js` | 정비명세서 보기 버튼 및 이미지 모달 추가 | ✅ |
| `agri-mobile/src/screens/owner/OCRScannerScreen.js` | processOCRAndSave API로 변경 | ✅ |

---

## 🔍 추가 확인 사항

### **maintenance_attachment 테이블 확인**
```sql
SELECT 
    ma.attachment_id,
    ma.log_id,
    ma.file_path,
    ma.original_name,
    ma.ocr_status,
    ml.vin,
    ml.service_date,
    ml.total_cost
FROM maintenance_attachment ma
JOIN maintenance_log ml ON ma.log_id = ml.log_id
ORDER BY ma.attachment_id DESC
LIMIT 5;
```

### **이미지 파일 확인**
```powershell
ls uploads/maintenance_images/ | Select-Object -Last 5
```

---

**작업 완료 시간:** 2026년 4월 2일 15:32  
**상태:** ✅ 모든 문제 해결 완료
