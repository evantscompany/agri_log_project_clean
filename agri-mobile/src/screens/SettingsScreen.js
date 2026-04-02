import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, List, Divider, Button } from 'react-native-paper';
import { useApp } from '../context/AppContext';

const SettingsScreen = () => {
  const { userRole, clearUserRole } = useApp();

  const handleRoleChange = () => {
    Alert.alert(
      '역할 변경',
      '역할을 변경하시겠습니까? 앱이 재시작됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '변경',
          onPress: async () => {
            await clearUserRole();
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          onPress: async () => {
            await clearUserRole();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>설정</Text>
        <Text style={styles.subtitle}>
          현재 모드: {userRole === 'mechanic' ? '정비업체' : '농기계 소유자'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>계정</Text>
        <List.Item
          title="역할 변경"
          description={`현재: ${userRole === 'mechanic' ? '정비업체' : '농기계 소유자'}`}
          left={props => <List.Icon {...props} icon="account-switch" />}
          onPress={handleRoleChange}
        />
        <Divider />
        <List.Item
          title="로그아웃"
          description="앱을 종료하고 다시 시작합니다"
          left={props => <List.Icon {...props} icon="logout" />}
          onPress={handleLogout}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>앱 정보</Text>
        <List.Item
          title="버전"
          description="1.0.0"
          left={props => <List.Icon {...props} icon="information" />}
        />
        <Divider />
        <List.Item
          title="개발자"
          description="AgriLog Platform"
          left={props => <List.Icon {...props} icon="code-tags" />}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>서버 설정</Text>
        <List.Item
          title="API 서버"
          description="http://10.0.2.2:8000/api/v1"
          left={props => <List.Icon {...props} icon="server" />}
        />
        <Text style={styles.note}>
          💡 실제 기기에서 테스트 시 API 서버 주소를{'\n'}
          WiFi IP 주소로 변경해야 합니다.{'\n'}
          (예: http://192.168.x.x:8000/api/v1)
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2026 AgriLog Platform{'\n'}
          농기계 데이터 이력관리 시스템
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#424242',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#BDBDBD',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  note: {
    fontSize: 12,
    color: '#666',
    padding: 16,
    backgroundColor: '#FFF9C4',
    lineHeight: 18,
  },
  footer: {
    padding: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default SettingsScreen;
