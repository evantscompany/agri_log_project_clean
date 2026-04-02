import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Card, FAB, ActivityIndicator, Searchbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../../services/api';
import colors from '../../theme/colors';

const MachineListScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [machines, setMachines] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      setLoading(true);
      const data = await apiService.getMachines();
      setMachines(data.machines || []);
    } catch (error) {
      console.error('Failed to load machines:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMachines();
  };

  const filteredMachines = machines.filter(machine =>
    machine.vin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMachineCard = ({ item }) => (
    <Card 
      style={styles.card}
      onPress={() => navigation.navigate('MachineDetail', { vin: item.vin })}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.vin}>{item.vin}</Text>
            <Text style={styles.model}>{item.model}</Text>
          </View>
          <Text style={styles.manufacturer}>{item.manufacturer}</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>정비 이력</Text>
            <Text style={styles.statValue}>{item.totalRecords || 0}건</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>총 비용</Text>
            <Text style={styles.statValue}>
              {((item.totalCost || 0) / 10000).toFixed(0)}만원
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>가동시간</Text>
            <Text style={styles.statValue}>{item.totalHours || 0}h</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>내 농기계</Text>
        <Text style={styles.subtitle}>{machines.length}대 보유 중</Text>
      </View>

      <Searchbar
        placeholder="VIN 또는 모델명 검색"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <FlatList
        data={filteredMachines}
        renderItem={renderMachineCard}
        keyExtractor={(item) => item.vin}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>농기계</Text>
            <Text style={styles.emptyText}>등록된 농기계가 없습니다</Text>
          </View>
        }
      />
    </View>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    marginBottom: 12,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vin: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  model: {
    fontSize: 14,
    color: '#666',
  },
  manufacturer: {
    fontSize: 14,
    color: '#999',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary.main,
    marginBottom: 16,
    backgroundColor: colors.primary.pale,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default MachineListScreen;
