import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TextInput as RNTextInput, TouchableOpacity, Modal } from 'react-native';
import { Text, Button, Card, ActivityIndicator, ProgressBar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api';
import { API_CONFIG } from '../../config/api';

const OCRScannerScreen = ({ navigation }) => {
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
    vendor: '',
    partNumbers: [],
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      processOCR(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      processOCR(result.assets[0].uri);
    }
  };

  const extractReceiptInfo = (text) => {
    console.log('=== OCR 텍스트 파싱 시작 ===');
    console.log('원본 텍스트:', text);
    
    const lines = text.split('\n');
    const cleanedText = text.replace(/\s+/g, ' ').trim();
    
    // 기대번호 추출 (DI0060240001, DC008524384 등)
    let extractedVin = '';
    
    // 1. "기대번호" 라벨 다음에 오는 VIN 찾기
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
    
    // 금액 추출 - "수리비", "최종 합계" 또는 큰 금액 찾기
    let cost = '';
    
    // 1. 수리비 패턴: 수리비: 1000000
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
      
      const extracted = extractReceiptInfo(ocrData.text);
      
      setFormData({
        vin: extracted.vin || '',
        date: extracted.date || new Date().toISOString().split('T')[0],
        description: extracted.description || '',
        cost: extracted.cost || '',
        mileage: '',
        vendor: extracted.vendor || '',
        partNumbers: extracted.partNumbers || [],
        image_path: ocrData.image_path,
        image_url: ocrData.image_url,
      });
      
      setIsEditing(true);
      
    } catch (error) {
      console.error('OCR 처리 실패:', error);
      Alert.alert('오류', error.message || 'OCR 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePress = () => {
    if (formData.image_url || ocrResult?.image_url) {
      setImageModalVisible(true);
    }
  };

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
      
      console.log('=== 정비 이력 저장 시작 (processOCRAndSave 사용) ===');
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>📄 정비 명세서 스캔</Text>
          <Text style={styles.subtitle}>OCR로 자동 입력</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {!image ? (
          <Card style={styles.uploadCard}>
            <Card.Content>
              <Text style={styles.uploadTitle}>정비 명세서를 촬영하거나 업로드하세요</Text>
              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  icon="camera"
                  onPress={takePhoto}
                  style={styles.uploadButton}
                >
                  카메라로 촬영
                </Button>
                <Button
                  mode="outlined"
                  icon="image"
                  onPress={pickImage}
                  style={styles.uploadButton}
                >
                  갤러리에서 선택
                </Button>
              </View>
            </Card.Content>
          </Card>
        ) : (
          <>
            <Card style={styles.imageCard}>
              <Card.Content>
                <Image source={{ uri: image }} style={styles.previewImage} />
              </Card.Content>
            </Card>

            {loading && (
              <Card style={styles.progressCard}>
                <Card.Content>
                  <Text style={styles.progressText}>OCR 처리 중...</Text>
                  <ProgressBar progress={progress} color="#2E7D32" />
                </Card.Content>
              </Card>
            )}

            {isEditing && !loading && (
              <Card style={styles.formCard}>
                <Card.Content>
                  <Text style={styles.formTitle}>📝 추출된 정보 확인 및 수정</Text>
                  <Text style={styles.formSubtitle}>아래 정보를 확인하고 필요시 수정해주세요</Text>
                  
                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>기대번호 (VIN) *</Text>
                    <RNTextInput
                      style={[styles.input, styles.editableInput]}
                      value={formData.vin}
                      onChangeText={(text) => setFormData({ ...formData, vin: text })}
                      placeholder="예: DC008524384"
                      autoCapitalize="characters"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>정비 날짜</Text>
                    <RNTextInput
                      style={[styles.input, styles.editableInput]}
                      value={formData.date}
                      onChangeText={(text) => setFormData({ ...formData, date: text })}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>정비 내용</Text>
                    <RNTextInput
                      style={[styles.input, styles.textArea, styles.editableInput]}
                      value={formData.description}
                      onChangeText={(text) => setFormData({ ...formData, description: text })}
                      placeholder="정비 내용을 입력하세요"
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={4}
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>비용 (원)</Text>
                    <RNTextInput
                      style={[styles.input, styles.editableInput]}
                      value={formData.cost}
                      onChangeText={(text) => setFormData({ ...formData, cost: text })}
                      placeholder="0"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>주행거리 (km)</Text>
                    <RNTextInput
                      style={[styles.input, styles.editableInput]}
                      value={formData.mileage}
                      onChangeText={(text) => setFormData({ ...formData, mileage: text })}
                      placeholder="선택사항"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>서비스 업체</Text>
                    <RNTextInput
                      style={[styles.input, styles.editableInput]}
                      value={formData.vendor}
                      onChangeText={(text) => setFormData({ ...formData, vendor: text })}
                      placeholder="서비스 업체명"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {formData.partNumbers && formData.partNumbers.length > 0 && (
                    <>
                      <Text style={styles.label}>추출된 부품번호</Text>
                      <View style={styles.partNumbersContainer}>
                        {formData.partNumbers.map((partNum, index) => (
                          <View key={index} style={styles.partNumberChip}>
                            <Text style={styles.partNumberText}>{partNum}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

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

                  <Button
                    mode="contained"
                    icon="content-save"
                    onPress={handleSave}
                    style={styles.saveButton}
                    loading={loading}
                  >
                    저장하기
                  </Button>
                </Card.Content>
              </Card>
            )}
          </>
        )}
      </ScrollView>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  uploadCard: {
    margin: 16,
    borderRadius: 20,
    elevation: 2,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  uploadButton: {
    borderRadius: 12,
  },
  imageCard: {
    margin: 16,
    borderRadius: 20,
    elevation: 2,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  progressCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 20,
    elevation: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  formCard: {
    margin: 16,
    borderRadius: 20,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#F5F5F5',
  },
  editableInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#4CAF50',
    borderWidth: 2,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: '#2E7D32',
    borderRadius: 12,
  },
  partNumbersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  partNumberChip: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  partNumberText: {
    fontSize: 12,
    color: '#2E7D32',
  },
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
});

export default OCRScannerScreen;
