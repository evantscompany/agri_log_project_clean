import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, Image } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api';
import colors from '../../theme/colors';

const MachineDetailScreen = ({ route, navigation }) => {
  const { vin } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [machine, setMachine] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  useEffect(() => {
    loadMachineData();
  }, [vin]);

  const loadMachineData = async () => {
    try {
      setLoading(true);
      const [machineData, historyData] = await Promise.all([
        apiService.getMachineDetail(vin),
        apiService.getMaintenanceHistory(vin),
      ]);
      
      // historyData에서 machine_info 가져오기 (우선순위)
      const machineInfo = historyData.machine_info || machineData.machine || machineData;
      setMachine(machineInfo);
      
      const records = historyData.records || [];
      console.log('===== 정비 이력 로드 =====');
      console.log('총 레코드 수:', records.length);
      console.log('이미지 있는 레코드:', records.filter(r => r.image_path).length);
      
      // 각 레코드의 전체 데이터 로그
      records.forEach((record, index) => {
        console.log(`\n[레코드 ${index + 1}]`);
        console.log('- ID:', record.id);
        console.log('- 날짜:', record.date);
        console.log('- 설명:', record.description);
        console.log('- image_path:', record.image_path);
        console.log('- attachment_url:', record.attachment_url);
        console.log('- 전체 데이터:', JSON.stringify(record, null, 2));
      });
      console.log('========================');
      
      setHistory(records);
    } catch (error) {
      console.error('Failed to load machine data:', error);
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
    console.log('handleImagePress 호출:', { imagePath, hasImage: !!imagePath });
    if (imagePath) {
      // 이미 전체 URL인 경우와 상대 경로인 경우 모두 처리
      let fullImageUrl;
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        // localhost를 실제 IP로 변경
        fullImageUrl = imagePath.replace('http://localhost:8000', 'http://192.168.0.30:8000');
      } else {
        fullImageUrl = `http://192.168.0.30:8000${imagePath}`;
      }
      console.log('이미지 URL 생성:', fullImageUrl);
      setSelectedImage(fullImageUrl);
      setImageModalVisible(true);
      console.log('이미지 모달 표시 설정 완료');
    } else {
      console.log('이미지 경로 없음');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Button
          icon="arrow-left"
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          labelStyle={styles.backButtonLabel}
        >
          뒤로
        </Button>
        <Text style={styles.title}>{vin}</Text>
        <Text style={styles.subtitle}>농기계 상세 정보</Text>
      </View>

      <Card style={styles.infoCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>기본 정보</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>모델명</Text>
            <Text style={styles.infoValue}>{machine?.model_name || machine?.model || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>제조사</Text>
            <Text style={styles.infoValue}>{machine?.manufacturer_name || machine?.manufacturer || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>연식</Text>
            <Text style={styles.infoValue}>{machine?.year || machine?.manufacture_year || 'N/A'}년</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>총 가동시간</Text>
            <Text style={styles.infoValue}>{machine?.total_hours || machine?.totalHours || 0}시간</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>차대번호</Text>
            <Text style={styles.infoValue}>{machine?.vin || vin || 'N/A'}</Text>
          </View>
          {machine?.purchase_date && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>구매일</Text>
              <Text style={styles.infoValue}>{new Date(machine.purchase_date).toLocaleDateString('ko-KR')}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.statsCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>정비 통계</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{history.length}</Text>
              <Text style={styles.statLabel}>정비 건수</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {(history.reduce((sum, h) => sum + (h.cost || 0), 0) / 10000).toFixed(0)}만
              </Text>
              <Text style={styles.statLabel}>총 비용</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.historyCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>정비 이력</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>정비 이력이 없습니다</Text>
          ) : (
            history.map((item, index) => (
              <View key={item.id}>
                {index > 0 && <Divider style={styles.divider} />}
                <View style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyDate}>{item.date}</Text>
                    <Text style={styles.historyCost}>
                      {(item.cost || 0).toLocaleString()}원
                    </Text>
                  </View>
                  <Text style={styles.historyDescription}>
                    {item.description || '정비 내역'}
                  </Text>
                  {item.service_company && (
                    <Text style={styles.historyCompany}>
                      정비업체: {item.service_company}
                    </Text>
                  )}
                  {(item.image_path || item.attachment_url) && (
                    <TouchableOpacity 
                      style={styles.imageButton}
                      onPress={() => {
                        const imageUrl = item.image_path || item.attachment_url;
                        console.log('정비명세서 이미지 클릭:', { imageUrl });
                        handleImagePress(imageUrl);
                      }}
                    >
                      <Text style={styles.imageButtonText}>정비 내역서 보기</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      <View style={styles.qrSection}>
        <Text style={styles.qrTitle}>QR 코드</Text>
        <Text style={styles.qrDescription}>
          정비업체에서 이 QR 코드를 스캔하면{'\n'}
          농기계 정보를 바로 확인할 수 있습니다
        </Text>
        <View style={styles.qrPlaceholder}>
          <Text style={styles.qrPlaceholderText}>QR 코드 영역</Text>
          <Text style={styles.qrPlaceholderSubtext}>(향후 구현 예정)</Text>
        </View>
      </View>

      {/* 이미지 모달 */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setImageModalVisible(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.modalImage}
                resizeMode="contain"
                onLoadStart={() => console.log('이미지 로딩 시작:', selectedImage)}
                onLoad={() => console.log('이미지 로딩 성공')}
                onError={(error) => {
                  console.log('이미지 로딩 실패:', error);
                  console.log('이미지 URL:', selectedImage);
                }}
              />
            )}
            <ActivityIndicator 
              size="large" 
              color="#fff" 
              style={styles.imageLoader}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backButtonLabel: {
    color: colors.primary.main,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary.main,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  infoCard: {
    margin: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  historyCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary.main,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  historyItem: {
    paddingVertical: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  historyCost: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary.main,
  },
  historyDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  historyCompany: {
    fontSize: 12,
    color: '#999',
  },
  imageButton: {
    marginTop: 8,
    backgroundColor: colors.primary.pale,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  imageButtonText: {
    color: colors.primary.main,
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
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
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalImage: {
    width: '90%',
    height: '80%',
  },
  imageLoader: {
    position: 'absolute',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 20,
  },
  qrSection: {
    padding: 16,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  qrDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#BDBDBD',
    borderStyle: 'dashed',
  },
  qrPlaceholderText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 4,
  },
  qrPlaceholderSubtext: {
    fontSize: 12,
    color: '#BDBDBD',
  },
});

export default MachineDetailScreen;
