import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator, Searchbar } from 'react-native-paper';
import { apiService } from '../../services/api';

const MaintenanceListScreen = ({ navigation }) => {
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
          <Text style={styles.vin}>{item.vin}</Text>
          <Text style={styles.badge}>{item.totalRecords || 0}건</Text>
        </View>
        <Text style={styles.model}>{item.model} - {item.manufacturer}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>
            총 비용: {(item.totalCost || 0).toLocaleString()}원
          </Text>
          {item.lastMaintenance && (
            <Text style={styles.footerText}>
              최근: {item.lastMaintenance}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>정비 이력</Text>
        <Text style={styles.subtitle}>농기계별 정비 내역</Text>
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
    color: '#1976D2',
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
    alignItems: 'center',
    marginBottom: 8,
  },
  vin: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  badge: {
    backgroundColor: '#1976D2',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  model: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default MaintenanceListScreen;
