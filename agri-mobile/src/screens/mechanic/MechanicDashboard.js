import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator, Chip, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../../services/api';
import colors from '../../theme/colors';

const MechanicDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [machines, setMachines] = useState([]);
  const [stats, setStats] = useState({
    totalMachines: 0,
    totalMaintenances: 0,
    thisMonthMaintenances: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const machinesData = await apiService.getMachines();
      
      const machineList = machinesData.machines || [];
      setMachines(machineList);
      
      // 통계 계산
      const totalMachines = machineList.length;
      const totalMaintenances = machineList.reduce(
        (sum, m) => sum + (m.totalRecords || 0), 0
      );
      const totalRevenue = machineList.reduce(
        (sum, m) => sum + (m.totalCost || 0), 0
      );

      setStats({
        totalMachines,
        totalMaintenances,
        thisMonthMaintenances: 0,
        totalRevenue,
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
        <ActivityIndicator size="large" color="#1976D2" />
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
      {/* 헤더 */}
      <LinearGradient
        colors={[colors.mechanic.dark, colors.mechanic.main]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.greeting}>안녕하세요</Text>
        <Text style={styles.title}>정비 관리</Text>
      </LinearGradient>

      {/* 통계 카드 */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>농기계</Text>
            </View>
            <Text style={styles.statValue}>{stats.totalMachines}</Text>
            <Text style={styles.statLabel}>등록 농기계</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>정비</Text>
            </View>
            <Text style={styles.statValue}>{stats.totalMaintenances}</Text>
            <Text style={styles.statLabel}>총 정비</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>이달</Text>
            </View>
            <Text style={styles.statValue}>{stats.thisMonthMaintenances}</Text>
            <Text style={styles.statLabel}>이번 달</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>수익</Text>
            </View>
            <Text style={styles.statValue}>
              {(stats.totalRevenue / 10000).toFixed(0)}만원
            </Text>
            <Text style={styles.statLabel}>총 매출</Text>
          </Card.Content>
        </Card>
      </View>

      <Card style={styles.actionCard}>
        <Card.Content>
          <Text style={styles.infoTitle}>정비 관리 팁</Text>
          <Text style={styles.actionDescription}>
            • 하단 탭에서 QR/OCR 스캔을 바로 사용하세요{'\n'}
            • 정비 이력을 꾸준히 기록하면 관리가 쉬워집니다{'\n'}
            • AI 챗봇으로 정비 관련 질문을 해보세요
          </Text>
          <Button
            mode="contained"
            icon="robot"
            onPress={() => navigation.navigate('AIChatbot', { vin: machines[0]?.vin })}
            style={styles.aiButton}
          >
            AI 정비 도우미
          </Button>
        </Card.Content>
      </Card>

      {/* 농기계 목록 */}
      <Card style={styles.machineListCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>등록된 농기계</Text>
          {machines.length === 0 ? (
            <Text style={styles.emptyText}>등록된 농기계가 없습니다</Text>
          ) : (
            machines.slice(0, 5).map((machine, index) => (
              <TouchableOpacity
                key={machine.vin || index}
                style={styles.machineItem}
                onPress={() => navigation.navigate('MachineDetail', { vin: machine.vin })}
              >
                <View style={styles.machineInfo}>
                  <Text style={styles.machineName}>{machine.model || machine.model_name || '모델명 없음'}</Text>
                  <Text style={styles.machineVin}>{machine.vin}</Text>
                </View>
                <View style={styles.machineStats}>
                  <Chip mode="outlined" compact textStyle={styles.chipText}>
                    {machine.totalRecords || 0}건
                  </Chip>
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('AIChatbot', { vin: machine.vin })}
                    style={styles.robotButton}
                  >
                    <Text style={styles.robotButtonText}>🤖</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
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
  greeting: {
    fontSize: 16,
    color: colors.text.white,
    marginBottom: 4,
    opacity: 0.9,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.white,
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.mechanic.pale,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mechanic.main,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
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
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.mechanic.dark,
  },
  actionDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  aiButton: {
    backgroundColor: colors.mechanic.main,
    borderRadius: 12,
  },
  machineListCard: {
    margin: 16,
    marginTop: 0,
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
    marginBottom: 12,
    color: '#333',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  machineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  machineInfo: {
    flex: 1,
  },
  machineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  machineVin: {
    fontSize: 12,
    color: '#666',
  },
  machineStats: {
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipText: {
    fontSize: 12,
  },
  robotButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  robotButtonText: {
    fontSize: 14,
  },
});

export default MechanicDashboard;
