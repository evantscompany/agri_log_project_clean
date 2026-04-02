import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api';
import colors from '../../theme/colors';

const PricePredictionScreen = ({ navigation }) => {
  const [machines, setMachines] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      setLoading(true);
      const data = await apiService.getMachines();
      setMachines(data.machines || []);
    } catch (err) {
      console.error('농기계 목록 로드 실패:', err);
      setError('농기계 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePredictAll = async () => {
    if (machines.length === 0) {
      Alert.alert('알림', '예측할 농기계가 없습니다.');
      return;
    }

    setPredicting(true);
    setError(null);
    setPredictions([]);

    try {
      const predictionPromises = machines.map(async (machine) => {
        try {
          const workingHours = machine.total_hours || machine.totalHours || 0;
          
          const result = await apiService.predictPrice({
            vin: machine.vin,
            working_hours: workingHours
          });

          console.log('예측 결과 처리:', { 
            vin: machine.vin, 
            predicted_price: result.predicted_price, 
            confidence: result.confidence,
            confidence_type: typeof result.confidence
          });
          
          return {
            vin: machine.vin,
            model: machine.model || machine.model_name,
            predicted_price: result.predicted_price,
            confidence: result.confidence,
            success: true,
            workingHours: workingHours,
          };
        } catch (error) {
          console.error(`농기계 ${machine.vin} 예측 실패:`, error);
          return {
            vin: machine.vin,
            model: machine.model || machine.model_name,
            success: false,
            error: error.message || '예측 실패',
          };
        }
      });

      const results = await Promise.all(predictionPromises);
      setPredictions(results);
    } catch (err) {
      console.error('가격 예측 실패:', err);
      setError(err.message || '가격 예측에 실패했습니다.');
    } finally {
      setPredicting(false);
    }
  };

  const formatPrice = (price) => {
    if (!price || isNaN(price)) return '예측 불가';
    return `${Number(price).toLocaleString()}만원`;
  };

  const getConfidenceColor = (confidence) => {
    console.log('신뢰도 색상 계산:', { confidence, type: typeof confidence });
    
    // 문자열 "높음", "보통", "낮음" 처리
    if (typeof confidence === 'string') {
      console.log('문자열 신뢰도 색상 처리:', confidence);
      if (confidence === '높음') return '#4CAF50';
      if (confidence === '보통') return '#FF9800';
      if (confidence === '낮음') return '#f44336';
      return '#999';
    }
    
    if (!confidence || confidence === null || confidence === undefined || isNaN(confidence)) {
      console.log('신뢰도 없음 처리');
      return '#999';
    }
    const conf = Number(confidence);
    console.log('변환된 신뢰도:', conf);
    if (conf >= 0.8) return '#4CAF50';
    if (conf >= 0.6) return '#FF9800';
    return '#f44336';
  };

  const getConfidenceText = (confidence) => {
    console.log('신뢰도 텍스트 계산:', { confidence, type: typeof confidence });
    
    // 문자열 신뢰도 그대로 반환
    if (typeof confidence === 'string') {
      console.log('문자열 신뢰도 처리:', confidence);
      if (confidence === '높음' || confidence === '보통' || confidence === '낮음') {
        return `신뢰도 ${confidence}`;
      }
      return confidence;
    }
    
    if (!confidence || confidence === null || confidence === undefined || isNaN(confidence)) {
      console.log('신뢰도 없음 텍스트');
      return '정보 없음';
    }
    const conf = Number(confidence);
    console.log('변환된 신뢰도 텍스트:', conf);
    if (conf >= 0.8) return '신뢰도 높음';
    if (conf >= 0.6) return '신뢰도 보통';
    return '신뢰도 낮음';
  };

  const totalPredictedPrice = predictions
    .filter(p => p.success && p.predicted_price)
    .reduce((sum, p) => sum + Number(p.predicted_price), 0);

  const successCount = predictions.filter(p => p.success).length;
  const failCount = predictions.filter(p => !p.success).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>데이터 로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <LinearGradient
        colors={['#2E7D32', '#388E3C', '#43A047']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>AI 가격 예측</Text>
          <Text style={styles.headerSubtitle}>중고 농기계 시세 분석</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* 안내 카드 */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.infoTitle}>AI 기반 가격 예측</Text>
            <Text style={styles.infoText}>
              머신러닝 모델로 보유한 {machines.length}대 농기계의{'\n'}
              현재 중고 시세를 예측합니다
            </Text>
          </Card.Content>
        </Card>

        {/* 예측 버튼 */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handlePredictAll}
            loading={predicting}
            disabled={predicting || machines.length === 0}
            style={styles.predictButton}
            icon="chart-line"
            contentStyle={styles.buttonContent}
          >
            {predicting ? 'AI 예측 중...' : '전체 가격 예측하기'}
          </Button>
        </View>

        {/* 에러 메시지 */}
        {error && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorText}>{error}</Text>
            </Card.Content>
          </Card>
        )}

        {/* 예측 결과 */}
        {predictions.length > 0 && (
          <>
            <View style={styles.summaryCard}>
              <LinearGradient
                colors={[colors.primary.main, colors.primary.dark]}
                style={styles.summaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.summaryTitle}>총 예상 가격</Text>
                <Text style={styles.summaryPrice}>{formatPrice(totalPredictedPrice)}</Text>
                <View style={styles.summaryStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>성공</Text>
                    <Text style={styles.statValue}>{successCount}대</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>실패</Text>
                    <Text style={styles.statValue}>{failCount}대</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <Text style={styles.resultsTitle}>상세 예측 결과</Text>

            {predictions.map((prediction, index) => (
              <Card key={index} style={styles.resultCard}>
                <Card.Content>
                  <View style={styles.resultHeader}>
                    <View>
                      <Text style={styles.resultVin}>{prediction.vin}</Text>
                      <Text style={styles.resultModel}>{prediction.model}</Text>
                    </View>
                    {prediction.success ? (
                      <Chip
                        mode="flat"
                        style={{
                          backgroundColor: getConfidenceColor(prediction.confidence),
                        }}
                        textStyle={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}
                      >
                        {console.log('Chip 신뢰도 텍스트:', { 
                          vin: prediction.vin, 
                          confidence: prediction.confidence, 
                          text: getConfidenceText(prediction.confidence)
                        })}
                        {getConfidenceText(prediction.confidence)}
                      </Chip>
                    ) : (
                      <Chip
                        mode="flat"
                        style={{ backgroundColor: '#f44336' }}
                        textStyle={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}
                      >
                        실패
                      </Chip>
                    )}
                  </View>

                  {prediction.success ? (
                    <View style={styles.resultDetails}>
                      <View style={styles.priceBox}>
                        <Text style={styles.priceLabel}>예상 가격</Text>
                        <Text style={styles.priceValue}>
                          {formatPrice(prediction.predicted_price)}
                        </Text>
                      </View>
                      <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>⏱️ 사용시간</Text>
                          <Text style={styles.detailValue}>{prediction.workingHours}h</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>신뢰도</Text>
                          <Text style={[styles.detailValue, { color: getConfidenceColor(prediction.confidence) }]}>
                            {console.log('신뢰도 렌더링:', { 
                              vin: prediction.vin, 
                              confidence: prediction.confidence, 
                              confidence_type: typeof prediction.confidence
                            })}
                            {typeof prediction.confidence === 'string' ? prediction.confidence : 
                             (prediction.confidence && !isNaN(prediction.confidence) ? `${(Number(prediction.confidence) * 100).toFixed(0)}%` : 'N/A')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{prediction.error}</Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            ))}
          </>
        )}

        {/* 농기계 목록 */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.infoTitle}>보유 농기계</Text>
            <Text style={styles.infoCount}>{machines.length}대</Text>
            {machines.length === 0 ? (
              <Text style={styles.emptyText}>등록된 농기계가 없습니다</Text>
            ) : (
              <View style={styles.machineGrid}>
                {machines.map((machine, index) => (
                  <View key={index} style={styles.machineChip}>
                    <Text style={styles.chipVin}>{machine.vin}</Text>
                    <Text style={styles.chipHours}>{machine.total_hours || machine.totalHours || 0}h</Text>
                  </View>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* 농기계 없음 */}
        {!loading && machines.length === 0 && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyIcon}>농기계</Text>
              <Text style={styles.emptyTitle}>예측할 농기계가 없습니다</Text>
              <Text style={styles.emptyText}>먼저 농기계를 등록해주세요</Text>
            </Card.Content>
          </Card>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
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
  infoCard: {
    margin: 16,
    borderRadius: 16,
    elevation: 3,
    backgroundColor: '#fff',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  machineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  machineChip: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  chipVin: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  chipHours: {
    fontSize: 10,
    color: '#1B5E20',
    marginTop: 2,
  },
  buttonContainer: {
    padding: 16,
    paddingTop: 0,
  },
  predictButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
  },
  buttonContent: {
    height: 56,
  },
  errorCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
    elevation: 2,
  },
  errorText: {
    fontSize: 14,
    color: '#C62828',
  },
  summaryCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  summaryGradient: {
    padding: 20,
  },
  summaryTitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  summaryPrice: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  resultCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  resultVin: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  resultModel: {
    fontSize: 13,
    color: '#666',
  },
  resultDetails: {
    marginTop: 12,
  },
  priceBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
    color: '#1B5E20',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailItem: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  emptyIcon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default PricePredictionScreen;
