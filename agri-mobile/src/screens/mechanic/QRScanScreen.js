import React, { useState } from 'react';
import { View, StyleSheet, Alert, TextInput as RNTextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../../theme/colors';

const QRScanScreen = ({ navigation }) => {
  const [vinInput, setVinInput] = useState('');

  const handleSubmit = () => {
    const vin = vinInput.trim().toUpperCase();
    
    if (!vin) {
      Alert.alert('알림', '기대번호를 입력해주세요.');
      return;
    }

    if (isValidVIN(vin)) {
      navigation.navigate('MachineDetail', { vin });
    } else {
      Alert.alert('오류', '유효한 기대번호를 입력해주세요.\n(예: DT123456789024)');
    }
  };

  const isValidVIN = (vin) => {
    if (!vin || vin.length < 10) return false;
    
    // 기본 형식 검증 (영문 2자 + 영숫자)
    const vinPattern = /^[A-Z]{2}[A-Z0-9]+$/i;
    return vinPattern.test(vin);
  };


  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <LinearGradient
        colors={[colors.mechanic.dark, colors.mechanic.main]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>기대번호 입력</Text>
          <Text style={styles.headerSubtitle}>농기계 기대번호(VIN)를 입력하세요</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>농기계</Text>
            </View>
            <Text style={styles.infoTitle}>농기계 조회</Text>
            <Text style={styles.infoText}>
              농기계의 기대번호(VIN)를 입력하면{'\n'}
              상세 정보와 정비 이력을 확인할 수 있습니다
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.inputCard}>
          <Card.Content>
            <Text style={styles.label}>기대번호 (VIN)</Text>
            <RNTextInput
              style={styles.input}
              value={vinInput}
              onChangeText={setVinInput}
              placeholder="예: DT123456789024"
              placeholderTextColor="#999"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              � 기대번호는 농기계에 부착된 고유 식별번호입니다
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
            icon="magnify"
            contentStyle={styles.buttonContent}
          >
            농기계 조회
          </Button>
        </View>

        <Card style={styles.noteCard}>
          <Card.Content>
            <Text style={styles.noteTitle}>📌 참고사항</Text>
            <Text style={styles.noteText}>
              • QR 스캔 기능은 개발 빌드에서만 사용 가능합니다{'\n'}
              • 현재는 수동 입력으로 기대번호를 조회할 수 있습니다{'\n'}
              • 기대번호는 대소문자를 구분하지 않습니다
            </Text>
          </Card.Content>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#E3F2FD',
  },
  infoIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.mechanic.main,
    backgroundColor: colors.mechanic.pale,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#1976D2',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#1976D2',
    borderRadius: 12,
  },
  buttonContent: {
    height: 56,
  },
  noteCard: {
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#FFF3E0',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: '#F57C00',
    lineHeight: 20,
  },
});

export default QRScanScreen;
