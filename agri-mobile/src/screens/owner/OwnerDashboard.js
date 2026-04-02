import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../../services/api';
import colors from '../../theme/colors';

const OwnerDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalMachines: 0,
    totalMaintenances: 0,
    totalCost: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const machinesData = await apiService.getMachines();
      
      const totalMachines = machinesData.machines?.length || 0;
      const totalMaintenances = machinesData.machines?.reduce(
        (sum, m) => sum + (m.totalRecords || 0), 0
      ) || 0;
      const totalCost = machinesData.machines?.reduce(
        (sum, m) => sum + (m.totalCost || 0), 0
      ) || 0;

      setStats({
        totalMachines,
        totalMaintenances,
        totalCost,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
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
      <LinearGradient
        colors={[colors.primary.dark, colors.primary.main]}
        style={styles.header}
      >
        <Text style={styles.title}>농민 대시보드</Text>
        <Text style={styles.subtitle}>농기계 관리 현황</Text>
      </LinearGradient>

      {/* 통계 카드 */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Card style={styles.assetButtonCard}>
            <Card.Content style={styles.statContent}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.primary.pale }]}>
                <Text style={[styles.statIcon, { color: colors.primary.main }]}>농기계</Text>
              </View>
              <Text style={styles.statValue}>{stats.totalMachines}</Text>
              <Text style={styles.statLabel}>보유 농기계</Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.statCard}>
          <Card style={styles.assetButtonCard}>
            <Card.Content style={styles.statContent}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.primary.pale }]}>
                <Text style={[styles.statIcon, { color: colors.primary.main }]}>정비</Text>
              </View>
              <Text style={styles.statValue}>{stats.totalMaintenances}</Text>
              <Text style={styles.statLabel}>총 정비</Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.statCard}>
          <Card style={styles.assetButtonCard}>
            <Card.Content style={styles.statContent}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.primary.pale }]}>
                <Text style={[styles.statIcon, { color: colors.primary.main }]}>비용</Text>
              </View>
              <Text style={styles.statValue}>
                {(stats.totalCost / 10000).toFixed(0)}만원
              </Text>
              <Text style={styles.statLabel}>총 비용</Text>
            </Card.Content>
          </Card>
        </View>

        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => navigation.navigate('PricePrediction')}
          activeOpacity={0.7}
        >
          <Card style={styles.assetButtonCard}>
            <Card.Content style={styles.statContent}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.primary.pale }]}>
                <Text style={[styles.statIcon, { color: colors.primary.main }]}>자산</Text>
              </View>
              <Text style={styles.statValue}>AI 예측</Text>
              <Text style={styles.statLabel}>자산 가치 확인</Text>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      </View>

      <Card style={styles.infoCard}>
        <Card.Content>
          <Text style={styles.infoTitle}>정비 관리 팁</Text>
          <Text style={styles.infoText}>
            • 정기적인 점검으로 큰 고장을 예방하세요{'\n'}
            • 정비 이력을 꾸준히 기록하면 재판매 시 유리합니다{'\n'}
            • AI 가격 예측으로 자산 가치를 확인하세요
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.actionCard}>
        <Card.Content>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('OCRScanner')}
            style={styles.ocrButton}
            buttonColor={colors.primary.main}
          >
            정비 명세서 스캔
          </Button>
        </Card.Content>
      </Card>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.default,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.white,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.white,
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '47%',
    borderRadius: 20,
  },
  assetButtonCard: {
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: colors.background.default,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  statIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 14,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary.dark,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  infoCard: {
    margin: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: colors.background.default,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.primary.dark,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.secondary,
  },
  actionCard: {
    margin: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: colors.background.default,
  },
  ocrButton: {
    marginTop: 8,
    borderRadius: 8,
  },
});

export default OwnerDashboard;
