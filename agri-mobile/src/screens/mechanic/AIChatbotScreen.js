import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TextInput as RNTextInput, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { apiService } from '../../services/api';

const AIChatbotScreen = ({ navigation, route }) => {
  const { vin } = route.params || {};
  const [machineData, setMachineData] = useState(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: vin ? '🔍 농기계 정보를 불러오는 중입니다...' : '안녕하세요! 👋\n농기계 정비 전문 AI 도우미입니다.\n\n정비 관련 질문이나 고장 진단에 대해 도움을 드릴 수 있습니다.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    loadMachineData();
  }, [vin]);

  const loadMachineData = async () => {
    if (!vin) {
      setDataLoading(false);
      return;
    }

    try {
      // 농기계 정보 로드
      const machineResponse = await apiService.getMachineDetail(vin);
      setMachineData(machineResponse);

      // 정비 이력 로드
      const historyResponse = await apiService.getMaintenanceHistory(vin);
      setMaintenanceHistory(historyResponse.history || []);

      console.log('농기계 정보:', machineResponse);
      console.log('정비 이력:', historyResponse.history);

      // 데이터 로드 완료 후 환영 메시지 업데이트
      const welcomeMessage = {
        id: Date.now(),
        type: 'bot',
        text: `🔧 ${machineResponse.model_name || machineResponse.model || '알 수 없는 모델'}의 정비 전문가입니다!\n\n이 농기계의 정비 이력(${historyResponse.history?.length || 0}건)을 모두 분석했습니다.\n\n정비 관련 질문이나 고장 진단에 대해 실제 이력을 바탕으로 답변해드리겠니다.`,
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      const errorMessage = {
        id: Date.now(),
        type: 'bot',
        text: '⚠️ 농기계 정보를 불러오는데 실패했습니다.\n일반적인 정비 질문에만 답변드릴 수 있습니다.',
      };
      setMessages([errorMessage]);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputText.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputText.trim();
    setInputText('');
    setLoading(true);

    try {
      // OpenAI API 직접 호출
      const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      
      if (!apiKey) {
        const errorMessage = {
          id: Date.now() + 1,
          type: 'bot',
          text: '⚠️ OpenAI API 키가 설정되지 않았습니다.\n.env 파일에 EXPO_PUBLIC_OPENAI_API_KEY를 설정해주세요.',
        };
        setMessages(prev => [...prev, errorMessage]);
        setLoading(false);
        return;
      }
      
      // 농기계 정보 및 정비 이력 포함
      let machineInfo = '';
      if (machineData) {
        machineInfo = `
현재 조회 중인 농기계 정보:
- 모델: ${machineData.model_name || machineData.model || 'N/A'}
- 제조사: ${machineData.manufacturer_name || machineData.manufacturer || 'N/A'}
- 연식: ${machineData.year || 'N/A'}년식
- 가동시간: ${machineData.total_hours || 0}시간
- VIN: ${machineData.vin || vin}`;
      }

      let historyInfo = '';
      if (maintenanceHistory && maintenanceHistory.length > 0) {
        historyInfo = `
정비 이력 (최근 5개):
${maintenanceHistory.slice(0, 5).map((record, index) => 
  `${index + 1}. ${record.service_date}: ${record.description || '정비'} (${record.cost?.toLocaleString() || 0}원)${record.service_company ? ` - ${record.service_company}` : ''}`
).join('\n')}

총 정비 횟수: ${maintenanceHistory.length}건
총 정비 비용: ${maintenanceHistory.reduce((sum, record) => sum + (record.cost || 0), 0).toLocaleString()}원`;
      } else {
        historyInfo = '\n정비 이력이 없습니다.';
      }

      const systemPrompt = `당신은 30년 경력의 농기계 정비 전문가입니다. 
농기계(트랙터, 콤바인, 이앙기 등)의 정비, 고장 진단, 부품 교체, 유지보수에 대한 전문 지식을 가지고 있습니다.

아래 제공된 농기계 정보와 정비 이력을 바탕으로 정확한 분석을 제공해주세요.

${machineInfo}
${historyInfo}

주요 전문 분야:
- 엔진계통: 디젤 엔진, 연료 시스템, 냉각 시스템
- 유압계통: 유압 펌프, 실린더, 유압유 관리
- 동력계통: 클러치, 변속기, 동력 전달 장치
- 전기계통: 배터리, 발전기, 배선, 센서
- 일반 정비: 오일 교환, 필터 관리, 정비 주기

답변 스타일:
- 위에 제공된 실제 정비 이력을 기반으로 분석
- 친절하고 이해하기 쉽게 설명
- 구체적인 점검 방법과 해결책 제시
- 안전 주의사항 강조
- 필요시 전문가 상담 권장
- 한국어로 답변`;

      const requestBody = JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: currentMessage }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      console.log('OpenAI API 요청:', requestBody);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: requestBody
      });

      console.log('OpenAI API 응답 상태:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API 오류 응답:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: { message: errorText } };
        }
        throw new Error(errorData.error?.message || 'API 오류');
      }

      const responseText = await response.text();
      console.log('OpenAI API 응답:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('JSON 파싱 오류:', e);
        throw new Error('응답 파싱 실패');
      }

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('잘못된 응답 형식:', data);
        throw new Error('잘못된 응답 형식');
      }

      const botResponse = data.choices[0].message.content;

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: botResponse,
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('AI 챗봇 오류:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: `⚠️ 죄송합니다. 응답 생성 중 오류가 발생했습니다.\n${error.message}\n\n잠시 후 다시 시도해주세요.`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>농기계 정보를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>🤖 AI 정비 도우미</Text>
          <Text style={styles.subtitle}>정비 관련 질문에 답변드립니다</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.type === 'user' ? styles.userBubble : styles.botBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                message.type === 'user' ? styles.userText : styles.botText,
              ]}
            >
              {message.text}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color="#1976D2" />
            <Text style={styles.loadingText}>답변 생성 중...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <RNTextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="정비 관련 질문을 입력하세요..."
          placeholderTextColor="#999"
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          onPress={handleSend}
          disabled={!inputText.trim() || loading}
          style={[
            styles.sendButton,
            { opacity: inputText.trim() && !loading ? 1 : 0.5 }
          ]}
        >
          <Text style={[
            styles.sendButtonText,
            { color: inputText.trim() && !loading ? '#1976D2' : '#ccc' }
          ]}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1976D2',
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#333',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AIChatbotScreen;
