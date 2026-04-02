import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { useApp } from '../context/AppContext';
import colors from '../theme/colors';

const RoleSelectionScreen = ({ navigation }) => {
  const { saveUserRole } = useApp();

  const handleRoleSelect = async (role) => {
    await saveUserRole(role);
    // 역할 저장 후 자동으로 메인 화면으로 이동
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>환영합니다!</Text>
        <Text style={styles.subtitle}>사용자 유형을 선택해주세요</Text>
      </View>

      <View style={styles.cardsContainer}>
        <TouchableOpacity
          style={styles.cardWrapper}
          onPress={() => handleRoleSelect('mechanic')}
          activeOpacity={0.7}
        >
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={[styles.iconCircle, styles.mechanicCircle]}>
                <Text style={styles.icon}>정비업체</Text>
              </View>
              <Text style={styles.cardTitle}>정비업체</Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>정비 내역 등록</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>OCR 스캔</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>정비 이력 관리</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cardWrapper}
          onPress={() => handleRoleSelect('owner')}
          activeOpacity={0.7}
        >
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={[styles.iconCircle, styles.ownerCircle]}>
                <Text style={styles.icon}>농민</Text>
              </View>
              <Text style={styles.cardTitle}>농기계 소유자</Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>내 농기계 관리</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>정비 이력 조회</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>AI 가격 예측</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        나중에 설정에서 변경할 수 있습니다
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginTop: 60,
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary.dark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  cardsContainer: {
    gap: 20,
    marginBottom: 20,
  },
  cardWrapper: {
    width: '100%',
  },
  card: {
    borderRadius: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  cardContent: {
    padding: 32,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  mechanicCircle: {
    backgroundColor: colors.primary.pale,
  },
  ownerCircle: {
    backgroundColor: colors.primary.pale,
  },
  icon: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.main,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.primary.dark,
  },
  featureList: {
    alignSelf: 'stretch',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bullet: {
    fontSize: 16,
    color: '#2E7D32',
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 15,
    color: '#666',
  },
  footer: {
    textAlign: 'center',
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: 20,
    marginBottom: 40,
  },
});

export default RoleSelectionScreen;
