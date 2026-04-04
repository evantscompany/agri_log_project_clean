import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Alert, ScrollView, TextInput, TouchableOpacity, Modal } from 'react-native';
import { Text, Button, Card, ActivityIndicator, ProgressBar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api';
import { API_CONFIG } from '../../config/api';
import colors from '../../theme/colors';

const OCRScannerScreen = ({ navigation, route }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    vin: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    cost: '',
    mileage: '',
  });
  const [vinError, setVinError] = useState(null);
  const [vinWarning, setVinWarning] = useState(null);
  const [existingMachine, setExistingMachine] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      processOCR(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      processOCR(result.assets[0].uri);
    }
  };

  const processOCR = async (imageUri) => {
    try {
      setLoading(true);
      setProgress(0);
      
      // Google Vision OCR 처리
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
      
      // 텍스트 파싱
      const extracted = extractReceiptInfo(ocrData.text);
      
      // 폼 데이터 자동 채우기
      setFormData({
        vin: extracted.vin || '',
        date: extracted.date || new Date().toISOString().split('T')[0],
        description: extracted.description || '',
        cost: extracted.cost || '',
        mileage: '',
        image_path: ocrData.image_path,
        image_url: ocrData.image_url,
      });
      
      // 자동으로 편집 모드 활성화
      setIsEditing(true);
      
    } catch (error) {
      console.error('OCR processing failed:', error);
      Alert.alert('오류', error.message || 'OCR 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // OCR 텍스트에서 정보 추출 (소유자 로직 기반 개선)
  const extractReceiptInfo = (text) => {
    console.log('=== OCR 텍스트 파싱 시작 ===');
    console.log('원본 텍스트:', text);
    
    const lines = text.split('\n');
    const cleanedText = text.replace(/\s+/g, ' ');
    
    // 기대번호 추출 (다단계)
    let extractedVin = '';
    
    // 1. "기대번호" 라벨 찾기
    for (const line of lines) {
      const vinLabelMatch = line.match(/기대번호\s*[:\s]*([A-Z]{2}\d{9,12})/i);
      if (vinLabelMatch) {
        extractedVin = vinLabelMatch[1].toUpperCase();
        break;
      }
    }
    
    // 2. 패턴 매칭으로 VIN 찾기
    if (!extractedVin) {
      const vinMatch = cleanedText.match(/[Dd][IiCcTt]\d{10}/);
      if (vinMatch) {
        extractedVin = vinMatch[0].toUpperCase();
      } else {
        const altVinMatch = cleanedText.match(/[A-Z]{2}\d{9,13}/i);
        if (altVinMatch) {
          extractedVin = altVinMatch[0].toUpperCase();
        }
      }
    }
    
    // 3. 공백 포함 패턴
    if (!extractedVin) {
      const vinMatchWithSpace = text.match(/([A-Z]{2})\s*(\d{9,13})/i);
      if (vinMatchWithSpace) {
        extractedVin = vinMatchWithSpace[1].toUpperCase() + vinMatchWithSpace[2];
      }
    }
    console.log('추출된 기대번호:', extractedVin);
    
    // 날짜 추출 개선 (발행번호에서 추출)
    let extractedDate = '';
    
    // 1. 발행번호 형식: INV-26-01-01 → 2026-01-01
    for (const line of lines) {
      const invMatch = line.match(/INV[-\s]*(\d{2})[-\s]*(\d{2})[-\s]*(\d{2})/i);
      if (invMatch) {
        const year = '20' + invMatch[1];
        const month = invMatch[2].padStart(2, '0');
        const day = invMatch[3].padStart(2, '0');
        extractedDate = `${year}-${month}-${day}`;
        console.log('발행번호에서 날짜 추출:', extractedDate);
        break;
      }
    }
    
    // 2. 일반 날짜 형식
    if (!extractedDate) {
      const dateMatch = cleanedText.match(/(20\d{2})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/);
      if (dateMatch) {
        const year = dateMatch[1];
        const month = dateMatch[2].padStart(2, '0');
        const day = dateMatch[3].padStart(2, '0');
        const monthNum = parseInt(month);
        const dayNum = parseInt(day);
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
          extractedDate = `${year}-${month}-${day}`;
        }
      }
    }
    
    // 3. 날짜가 없으면 오늘 날짜
    if (!extractedDate) {
      extractedDate = new Date().toISOString().split('T')[0];
    }
    console.log('추출된 날짜:', extractedDate);
    
    // 금액 추출 개선
    let cost = '';
    
    // 부품번호 추출 (DD-C-HY-0083 형식)
    const partNumbers = [];
    const partNumberPattern = /[A-Z]{2}-[A-Z]-[A-Z]{2}-\d{4}/g;
    const allPartNumbers = text.match(partNumberPattern) || [];
    const uniquePartNumbers = [...new Set(allPartNumbers)];
    console.log('추출된 부품번호:', uniquePartNumbers);
    
    // 서비스업체 추출
    let vendor = '';
    
    // 1. "정비업체" 라벨 다음에 오는 업체명
    for (const line of lines) {
      const vendorMatch = line.match(/정비업체\s*[|\s]*([^|\n]+?)(?:\||사업자번호|$)/);
      if (vendorMatch) {
        vendor = vendorMatch[1].trim();
        break;
      }
    }
    
    // 2. (주)대동 대구서비스센터 형식
    if (!vendor) {
      const serviceCenterMatch = cleanedText.match(/\(주\)(.+?)서비스/);
      if (serviceCenterMatch) {
        vendor = '(주)' + serviceCenterMatch[1].trim() + '서비스';
      }
    }
    
    // 3. "농기계 수리소", "서비스센터" 등 키워드 포함
    if (!vendor) {
      const repairShopMatch = cleanedText.match(/([가-힣\s]+(?:농기계|서비스센터|수리소|정비소))/);
      if (repairShopMatch) {
        vendor = repairShopMatch[1].trim();
      }
    }
    
    // 4. 너무 긴 경우 자르기 (최대 50자)
    if (vendor && vendor.length > 50) {
      vendor = vendor.substring(0, 50).trim();
    }
    console.log('추출된 서비스업체:', vendor);
    
    // 작업 내용 추출 - "정비사 소견" 또는 키워드 포함 라인
    let description = '';
    
    // 1. [정비사 소견] 섹션 찾기
    const opinionMatch = text.match(/\[정비사\s*소견\]\s*(.+?)(?:\n|$)/i);
    if (opinionMatch) {
      description = opinionMatch[1].trim();
      console.log('정비사 소견 (패턴1):', description);
    }
    
    // 2. 여러 라인에 걸쳐 있는 경우
    if (!description) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('정비사 소견') || line.includes('[정비사')) {
          const remainingLines = lines.slice(i + 1).filter(l => {
            const trimmed = l.trim();
            return trimmed.length > 0 && !/^\d+$/.test(trimmed);
          });
          if (remainingLines.length > 0) {
            description = remainingLines.join(' ').trim();
            console.log('정비사 소견 (패턴2):', description);
            break;
          }
        }
      }
    }
    
    // 3. "해당 ... 기종의 ..." 패턴 직접 찾기
    if (!description) {
      const summaryMatch = text.match(/해당\s+[가-힣]+\s+기종의\s+[^\n]+/);
      if (summaryMatch) {
        description = summaryMatch[0];
        console.log('정비사 소견 (패턴3):', description);
      }
    }
    
    // 4. 앞부분의 불필요한 숫자 제거
    if (description) {
      description = description.replace(/^\d+\s+/, '').trim();
    }
    
    // 5. 소견이 없으면 키워드 기반 추출
    if (!description) {
      const keywords = ['정비', '수리', '교체', '교환', '점검', '오일', '필터', '타이어', '부품', '동력', '유압'];
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && keywords.some(kw => trimmedLine.includes(kw)) && trimmedLine.length > 5) {
          description = trimmedLine;
          console.log('키워드에서 추출:', description);
          break;
        }
      }
    }
    
    // 1. 수리비 패턴
    for (const line of lines) {
      if (line.includes('수리비') || line.includes('비용') || line.includes('금액')) {
        const match = line.match(/(\d{1,3}(?:,\d{3})+|\d{6,})/);
        if (match) {
          cost = match[1].replace(/,/g, '');
          console.log('수리비에서 추출:', cost);
          break;
        }
      }
    }
    
    // 2. 최종 합계 라인 찾기
    if (!cost) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('최종') && line.includes('합계')) {
          console.log('최종 합계 라인 발견:', line);
          
          // 현재 라인에서 금액 찾기
          let amounts = line.match(/(\d{1,3}(?:,\d{3})+)/g);
          if (amounts && amounts.length > 0) {
            cost = amounts[amounts.length - 1].replace(/,/g, '');
            console.log('현재 라인에서 추출:', cost);
            break;
          }
          
          // 다음 라인에서 금액 찾기
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            amounts = nextLine.match(/(\d{1,3}(?:,\d{3})+)/g);
            if (amounts && amounts.length > 0) {
              cost = amounts[amounts.length - 1].replace(/,/g, '');
              console.log('다음 라인에서 추출:', cost);
              break;
            }
          }
        }
      }
    }
    
    // 3. 가장 큰 금액 찾기 (6자리 이상)
    if (!cost) {
      const allAmounts = text.match(/(\d{1,3}(?:,\d{3})+|\d{6,})/g);
      if (allAmounts && allAmounts.length > 0) {
        const validAmounts = allAmounts.filter(amount => amount.replace(/,/g, '').length >= 6);
        if (validAmounts.length > 0) {
          cost = validAmounts[validAmounts.length - 1].replace(/,/g, '');
          console.log('가장 큰 금액 추출:', cost);
        }
      }
    }
    
    const result = {
      vin: extractedVin,
      date: extractedDate,
      cost: cost,
      description: description,
      vendor: vendor,
      partNumbers: uniquePartNumbers,
    };
    
    console.log('=== 최종 추출 결과 ===', result);
    return result;
  };

  // 폼 입력값 변경 처리
  const handleFormChange = async (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 기대번호 변경 시 기존 농기계 확인
    if (field === 'vin') {
      setVinError(null);
      setVinWarning(null);
      setExistingMachine(null);
      
      if (value && value.length >= 10) {
        try {
          const machineData = await apiService.getMachineDetail(value);
          if (machineData && machineData.machine) {
            setExistingMachine(machineData.machine);
            setVinWarning(`이미 등록된 농기계입니다: ${machineData.machine.model_name || '모델명 없음'}`);
          }
        } catch (error) {
          console.log('새로운 농기계입니다.');
        }
      }
    }
  };

  // 기대번호 검증
  const validateVIN = (vin) => {
    if (!vin || vin.length < 10) {
      return '기대번호가 너무 짧습니다. (최소 10자)';
    }
    const vinPattern = /^[A-Z]{2}[A-Z0-9]+$/i;
    if (!vinPattern.test(vin)) {
      return '기대번호 형식이 올바르지 않습니다.';
    }
    return null;
  };

  // 데이터 저장 처리
  const handleSave = async () => {
    if (!formData.vin.trim()) {
      Alert.alert('오류', '기대번호를 입력해주세요.');
      return;
    }
    
    const vinValidationError = validateVIN(formData.vin);
    if (vinValidationError) {
      setVinError(vinValidationError);
      Alert.alert('경고', `${vinValidationError}\n\n그래도 저장하시겠습니까?`, [
        { text: '취소', style: 'cancel' },
        { text: '저장', onPress: () => proceedSave() },
      ]);
      return;
    }
    
    await proceedSave();
  };

  const proceedSave = async () => {
    if (!formData.description.trim()) {
      Alert.alert('오류', '작업 내용을 입력해주세요.');
      return;
    }
    
    if (!formData.cost || Number(formData.cost) <= 0) {
      Alert.alert('오류', '비용을 입력해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      
      const saveData = {
        vin: formData.vin.toUpperCase(),
        date: formData.date,
        description: formData.description,
        cost: Number(formData.cost),
        image_path: formData.image_path || image,
        ocr_text: ocrResult?.text,
      };
      
      if (formData.mileage && Number(formData.mileage) > 0) {
        saveData.mileage = Number(formData.mileage);
      }
      
      const result = await apiService.processOCRAndSave(saveData);
      
      Alert.alert('성공', '정비 이력이 성공적으로 저장되었습니다!', [
        { text: '확인', onPress: () => {
          resetForm();
          navigation.goBack();
        }}
      ]);
      
    } catch (error) {
      console.error('저장 실패:', error);
      Alert.alert('오류', error.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setImage(null);
    setOcrResult(null);
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>카메라 권한 확인 중...</Text></View>;
  }

  if (hasPermission === false) {
    return <View style={styles.container}><Text>카메라 권한이 필요합니다.</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[colors.mechanic.dark, colors.mechanic.main]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>OCR 스캔</Text>
          <Text style={styles.subtitle}>정비 영수증을 스캔하세요</Text>
        </View>
      </LinearGradient>

      {!image && (
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={takePhoto}
            style={[styles.button, styles.cameraButton]}
            icon="camera"
            disabled={loading}
            contentStyle={styles.buttonContent}
          >
            카메라로 촬영
          </Button>
          <Button
            mode="contained"
            onPress={pickImage}
            style={[styles.button, styles.galleryButton]}
            icon="image"
            disabled={loading}
            contentStyle={styles.buttonContent}
          >
            갤러리에서 선택
          </Button>
        </View>
      )}

      {image && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#1976D2" />
              <Text style={styles.loadingText}>이미지 분석 중...</Text>
              <ProgressBar progress={progress} color="#1976D2" style={styles.progressBar} />
              <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
            </View>
          )}
        </View>
      )}

      {ocrResult && !loading && (
        <Card style={styles.resultCard}>
          <Card.Content>
            <Text style={styles.resultTitle}>✅ 스캔 완료!</Text>
            <Text style={styles.confidenceText}>
              정확도: {Math.round(ocrResult.confidence || 0)}%
            </Text>
          </Card.Content>
        </Card>
      )}

      {isEditing && ocrResult && (
        <Card style={styles.editCard}>
          <Card.Content>
            <Text style={styles.editTitle}>📝 데이터 확인 및 수정</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>기대번호 (VIN) *</Text>
              <TextInput
                style={[styles.input, vinError && styles.inputError]}
                value={formData.vin}
                onChangeText={(value) => handleFormChange('vin', value.toUpperCase())}
                placeholder="예: DT123456789024"
                autoCapitalize="characters"
              />
              {vinError && (
                <Text style={styles.errorText}>⚠️ {vinError}</Text>
              )}
              {vinWarning && !vinError && (
                <Text style={styles.warningText}>ℹ️ {vinWarning}</Text>
              )}
              {existingMachine && (
                <View style={styles.machineInfo}>
                  <Text style={styles.machineInfoText}>
                    제조사: {existingMachine.manufacturer_name || '-'} | 
                    연식: {existingMachine.production_year || '-'}년
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>작업 날짜 *</Text>
              <TextInput
                style={styles.input}
                value={formData.date}
                onChangeText={(value) => handleFormChange('date', value)}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>작업 내용 *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(value) => handleFormChange('description', value)}
                placeholder="예: 엔진 오일 교환, 필터 교체"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>비용 (원) *</Text>
              <TextInput
                style={styles.input}
                value={formData.cost}
                onChangeText={(value) => handleFormChange('cost', value)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>주행시간 (선택)</Text>
              <TextInput
                style={styles.input}
                value={formData.mileage}
                onChangeText={(value) => handleFormChange('mileage', value)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </Card.Content>
        </Card>
      )}

      {ocrResult && (
        <View style={styles.actionButtons}>
          {(formData.image_url || ocrResult?.image_url) && (
            <Button
              mode="outlined"
              icon="file-document"
              onPress={() => setImageModalVisible(true)}
              style={[styles.button, styles.viewImageButton]}
            >
              정비명세서 보기
            </Button>
          )}
          <Button
            mode="outlined"
            onPress={resetForm}
            style={[styles.button, styles.resetButton]}
            disabled={loading}
          >
            다시 촬영
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            style={[styles.button, styles.saveButton]}
            icon="content-save"
            disabled={loading}
          >
            {loading ? '저장 중...' : '저장'}
          </Button>
        </View>
      )}

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

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.white,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.white,
    opacity: 0.9,
  },
  buttonContainer: {
    padding: 16,
    gap: 12,
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    height: 56,
  },
  cameraButton: {
    backgroundColor: '#1976D2',
  },
  galleryButton: {
    backgroundColor: '#4CAF50',
  },
  imageContainer: {
    height: 300,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    width: 200,
    marginTop: 16,
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
  },
  resultCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#E8F5E9',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#2E7D32',
  },
  confidenceText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  editCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    elevation: 2,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1976D2',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
  warningText: {
    color: '#1976D2',
    fontSize: 12,
    marginTop: 4,
  },
  machineInfo: {
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  machineInfoText: {
    fontSize: 12,
    color: '#1565C0',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    flexWrap: 'wrap',
  },
  viewImageButton: {
    flex: 1,
    minWidth: '100%',
    borderColor: '#2E7D32',
  },
  resetButton: {
    flex: 1,
    borderColor: '#666',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
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
});

export default OCRScannerScreen;
