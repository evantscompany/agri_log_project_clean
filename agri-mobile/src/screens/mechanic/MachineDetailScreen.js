import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, RefreshControl, Modal as RNModal, Image } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip, FAB, Portal, Modal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api';
import MechanicChatbot from '../../components/MechanicChatbot';

const MachineDetailScreen = ({ navigation, route }) => {
  const { vin } = route.params;
  
  const [machine, setMachine] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  useEffect(() => {
    loadMachineData();
  }, [vin]);

  const loadMachineData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [machineData, historyData] = await Promise.all([
        apiService.getMachineDetail(vin),
        apiService.getMaintenanceHistory(vin)
      ]);
      
      // historyData에서 machine_info 가져오기 (우선순위)
      const machineInfo = historyData.machine_info || machineData.machine || machineData;
      setMachine(machineInfo);
      setRecords(historyData.records || []);
      
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      setError(err.message || '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMachineData();
  };

  const handleImagePress = (imagePath) => {
    if (imagePath) {
      // 이미 전체 URL인 경우와 상대 경로인 경우 모두 처리
      let fullImageUrl;
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        // localhost를 실제 IP로 변경
        fullImageUrl = imagePath.replace('http://localhost:8000', 'http://192.168.0.30:8000');
      } else {
        fullImageUrl = `http://192.168.0.30:8000${imagePath}`;
      }
      setSelectedImage(fullImageUrl);
      setImageModalVisible(true);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    Alert.alert(
      '삭제 확인',
      '이 정비 이력을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteMaintenanceRecord(recordId);
              Alert.alert('성공', '정비 이력이 삭제되었습니다.');
              loadMachineData();
              setShowRecordModal(false);
            } catch (error) {
              console.error('삭제 실패:', error);
              Alert.alert('오류', '삭제 중 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  const handleOCRScan = () => {
    navigation.navigate('OCRScanner', { vin });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0원';
    return `${Number(amount).toLocaleString()}원`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>데이터 로딩 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <Button mode="contained" onPress={loadMachineData} style={styles.retryButton}>
          다시 시도
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{machine?.model_name || '농기계 상세'}</Text>
          <Text style={styles.headerSubtitle}>{vin}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 농기계 정보 카드 */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>📋 기본 정보</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>모델명:</Text>
              <Text style={styles.infoValue}>{machine?.model || machine?.model_name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>제조사:</Text>
              <Text style={styles.infoValue}>{machine?.manufacturer || machine?.manufacturer_name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>연식:</Text>
              <Text style={styles.infoValue}>{machine?.year || machine?.production_year || 'N/A'}년</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>가동시간:</Text>
              <Text style={styles.infoValue}>{machine?.total_hours || 0}시간</Text>
            </View>
          </Card.Content>
        </Card>

        {/* 정비 이력 */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>🔧 정비 이력</Text>
              <Chip mode="outlined" compact>
                {records.length}건
              </Chip>
            </View>

            {records.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>정비 이력이 없습니다</Text>
                <Text style={styles.emptySubtext}>OCR 스캔으로 정비 기록을 추가하세요</Text>
              </View>
            ) : (
              records.map((record, index) => (
                <TouchableOpacity
                  key={record.id || index}
                  style={styles.recordItem}
                  onPress={() => {
                    setSelectedRecord(record);
                    setShowRecordModal(true);
                  }}
                >
                  <View style={styles.recordHeader}>
                    <Text style={styles.recordDate}>{formatDate(record.service_date)}</Text>
                    <Text style={styles.recordCost}>{formatCurrency(record.total_cost)}</Text>
                  </View>
                  <Text style={styles.recordDescription} numberOfLines={2}>
                    {record.service_description || record.description || '정비 내역'}
                  </Text>
                  <View style={styles.recordFooter}>
                    <Chip mode="outlined" compact textStyle={styles.chipText}>
                      {record.service_company || '정비소'}
                    </Chip>
                    {record.details && record.details.length > 0 && (
                      <Chip mode="outlined" compact textStyle={styles.chipText}>
                        부품 {record.details.length}개
                      </Chip>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </Card.Content>
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* OCR 스캔 FAB */}
      <FAB
        icon="camera"
        label="OCR 스캔"
        style={styles.fab}
        onPress={handleOCRScan}
      />

      {/* 정비 이력 상세 모달 */}
      <Portal>
        <Modal
          visible={showRecordModal}
          onDismiss={() => setShowRecordModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>정비 이력 상세</Text>
              <TouchableOpacity onPress={() => setShowRecordModal(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedRecord && (
              <View style={styles.modalContent}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>날짜:</Text>
                  <Text style={styles.modalValue}>{formatDate(selectedRecord.service_date)}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>정비소:</Text>
                  <Text style={styles.modalValue}>{selectedRecord.service_company || 'N/A'}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>총 비용:</Text>
                  <Text style={[styles.modalValue, styles.costValue]}>
                    {formatCurrency(selectedRecord.total_cost)}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>가동시간:</Text>
                  <Text style={styles.modalValue}>{selectedRecord.total_hours || 0}시간</Text>
                </View>

                <View style={styles.divider} />

                <Text style={styles.modalSectionTitle}>작업 내용</Text>
                <Text style={styles.modalDescription}>
                  {selectedRecord.service_description || selectedRecord.description || '내용 없음'}
                </Text>

                {selectedRecord.details && selectedRecord.details.length > 0 && (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.modalSectionTitle}>사용 부품 ({selectedRecord.details.length}개)</Text>
                    {selectedRecord.details.map((detail, idx) => (
                      <View key={idx} style={styles.partItem}>
                        <Text style={styles.partName}>
                          {detail.item_name || detail.part_name || '부품명 없음'}
                        </Text>
                        <View style={styles.partDetails}>
                          <Text style={styles.partQuantity}>수량: {detail.quantity || 1}</Text>
                          <Text style={styles.partCost}>
                            {formatCurrency(detail.total_cost || detail.part_cost)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {(selectedRecord.image_path || selectedRecord.attachment_url) && (
                  <>
                    <View style={styles.divider} />
                    <TouchableOpacity 
                      style={styles.imageButton}
                      onPress={() => handleImagePress(selectedRecord.image_path || selectedRecord.attachment_url)}
                    >
                      <Text style={styles.imageButtonText}>📄 정비 명세서 보기</Text>
                    </TouchableOpacity>
                  </>
                )}

                <View style={styles.modalActions}>
                  <Button
                    mode="outlined"
                    onPress={() => setShowRecordModal(false)}
                    style={styles.modalButton}
                  >
                    닫기
                  </Button>
                  <Button
                    mode="contained"
                    buttonColor="#f44336"
                    onPress={() => handleDeleteRecord(selectedRecord.id)}
                    style={styles.modalButton}
                  >
                    삭제
                  </Button>
                </View>
              </View>
            )}
          </ScrollView>
        </Modal>
      </Portal>

      {/* 정비 도우미 챗봇 */}
      <MechanicChatbot machine={machine} records={records} />

      {/* 이미지 전체화면 모달 */}
      <RNModal
        visible={imageModalVisible}
        transparent={true}
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.imageModalContainer}>
          <View style={styles.imageModalContent}>
            <TouchableOpacity 
              style={styles.imageCloseButton}
              onPress={() => setImageModalVisible(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </RNModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#1976D2',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    marginTop: 12,
  },
  card: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  recordItem: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recordDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  recordCost: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  recordDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  recordFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  chipText: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4CAF50',
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 16,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
  },
  modalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  costValue: {
    color: '#1976D2',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  partItem: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  partName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  partDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  partQuantity: {
    fontSize: 12,
    color: '#666',
  },
  partCost: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 24,
    color: '#666',
  },
  imageButton: {
    marginTop: 8,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  imageButtonText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullscreenImage: {
    width: '90%',
    height: '80%',
  },
});

export default MachineDetailScreen;
