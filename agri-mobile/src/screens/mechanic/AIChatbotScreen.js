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
      // 백엔드 API를 통해 AI 챗봇 호출
      const chatHistory = messages
        .filter(msg => msg.type !== 'system')
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));

      const response = await apiService.chatWithAI({
        vin: vin || null,
        message: currentMessage,
        history: chatHistory
      });

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: response.message,
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
