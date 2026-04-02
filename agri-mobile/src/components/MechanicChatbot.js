import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity } from 'react-native';
import { Text, FAB, ActivityIndicator } from 'react-native-paper';

const MechanicChatbot = ({ machine, records }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const scrollViewRef = useRef(null);

  // 메시지 스크롤
  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  useEffect(() => {
    console.log('MechanicChatbot useEffect 실행:', { isOpen, machine: machine?.model_name, recordsCount: records?.length, messagesLength: messages.length, analysisComplete });
    
    if (isOpen) {
      console.log('챗봇 모달이 열림 - 초기화 시작');
      
      // 초기 메시지 설정
      if (messages.length === 0) {
        console.log('초기 메시지 설정');
        setMessages([{
          role: 'bot',
          content: '🔍 농기계 정보를 분석 중입니다...',
          timestamp: new Date()
        }]);
      }
      
      setTimeout(scrollToBottom, 100);
      
      // 자동 분석 실행 (처음 열릴 때만)
      if (!analysisComplete && machine && records) {
        console.log('자동 분석 실행 조건 충족');
        setTimeout(() => performInitialAnalysis(), 500);
      }
    }
  }, [isOpen, machine, records]);

  // 초기 자동 분석
  const performInitialAnalysis = async () => {
    console.log('performInitialAnalysis 함수 실행 시작');
    setIsTyping(true);
    
    try {
      console.log('분석 데이터 확인:', { machine: machine?.model_name, recordsCount: records?.length });
      
      // 실제 데이터 기반 분석 결과 생성
      setTimeout(() => {
        // 부품 정보 추출
        const allParts = records.flatMap(record => record.details || []);
        const partsByCategory = {};
        const partsByFrequency = {};
        
        allParts.forEach(part => {
          const partName = part.item_name || part.part_name || '부품명 없음';
          const category = categorizePart(partName);
          
          // 카테고리별 그룹화
          if (!partsByCategory[category]) {
            partsByCategory[category] = [];
          }
          partsByCategory[category].push(part);
          
          // 빈도수 계산
          partsByFrequency[partName] = (partsByFrequency[partName] || 0) + 1;
        });

        // 정비 패턴 분석
        const repairPattern = analyzeRepairPattern(records);
        
        // 상세 분석 결과 생성
        const analysisResult = generateDetailedAnalysis(machine, records, partsByCategory, partsByFrequency, repairPattern);
        
        console.log('상세 분석 결과 생성 완료:', analysisResult?.substring(0, 100) + '...');
        
        setMessages([
          {
            role: 'bot',
            content: analysisResult,
            timestamp: new Date()
          }
        ]);
        
        setAnalysisComplete(true);
        setIsTyping(false);
        console.log('분석 완료 - 메시지 설정됨');
      }, 2000);
      
    } catch (error) {
      console.error('자동 분석 실패:', error);
      setMessages([
        {
          role: 'bot',
          content: '⚠️ 정비 이력 분석 중 오류가 발생했습니다.\n\n일반적인 정비 질문에만 답변드릴 수 있습니다.',
          timestamp: new Date()
        }
      ]);
      setIsTyping(false);
    }
  };

  // 챗봇이 닫힐 때 상태 초기화
  const handleClose = () => {
    setIsOpen(false);
    setMessages([]);
    setAnalysisComplete(false);
    setInputMessage('');
  };

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // 임시 응답
      setTimeout(() => {
        const botMessage = {
          role: 'bot',
          content: '죄송합니다. 현재는 자동 분석 기능만 제공됩니다.\n\n위에 표시된 분석 결과를 참고해주세요.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, 1000);
    } catch (error) {
      console.error('챗봇 응답 생성 실패:', error);
      setIsTyping(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  // 부품 카테고리화 함수
  const categorizePart = (partName) => {
    const name = partName.toLowerCase();
    
    if (name.includes('필터') || name.includes('filter')) return '필터류';
    if (name.includes('오일') || name.includes('oil')) return '윤활유류';
    if (name.includes('베어링') || name.includes('bearing')) return '베어링류';
    if (name.includes('벨트') || name.includes('belt')) return '벨트류';
    if (name.includes('호스') || name.includes('hose')) return '호스류';
    if (name.includes('개스킷') || name.includes('gasket')) return '개스킷류';
    if (name.includes('전구') || name.includes('램프') || name.includes('bulb') || name.includes('lamp')) return '전기부품';
    if (name.includes('브레이크') || name.includes('brake')) return '브레이크류';
    if (name.includes('타이어') || name.includes('tire')) return '타이어류';
    if (name.includes('배터리') || name.includes('battery')) return '전기부품';
    
    return '기타부품';
  };

  // 정비 패턴 분석 함수
  const analyzeRepairPattern = (records) => {
    if (!records || records.length === 0) return { pattern: '없음', frequency: 0 };
    
    const sortedRecords = records.sort((a, b) => new Date(a.service_date) - new Date(b.service_date));
    const intervals = [];
    
    for (let i = 1; i < sortedRecords.length; i++) {
      const daysDiff = Math.ceil((new Date(sortedRecords[i].service_date) - new Date(sortedRecords[i-1].service_date)) / (1000 * 60 * 60 * 24));
      intervals.push(daysDiff);
    }
    
    const avgInterval = intervals.length > 0 ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : 0;
    
    let pattern = '불규칙적';
    if (avgInterval > 0 && avgInterval <= 90) pattern = '정기적 (3개월 이내)';
    else if (avgInterval > 90 && avgInterval <= 180) pattern = '반정기적 (3-6개월)';
    else if (avgInterval > 180) pattern = '비정기적 (6개월 이상)';
    
    return { pattern, frequency: avgInterval, totalRepairs: records.length };
  };

  // 상세 분석 결과 생성 함수
  const generateDetailedAnalysis = (machine, records, partsByCategory, partsByFrequency, repairPattern) => {
    const modelName = machine?.model_name || machine?.model || '알 수 없는 모델';
    const totalCost = records.reduce((sum, record) => sum + (record.total_cost || record.cost || 0), 0);
    const allParts = records.flatMap(record => record.details || []);
    
    // 가장 빈번하게 교체된 부품
    const mostFrequentParts = Object.entries(partsByFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    // 가장 비용이 많이 든 부품 카테고리
    const costByCategory = {};
    Object.entries(partsByCategory).forEach(([category, parts]) => {
      costByCategory[category] = parts.reduce((sum, part) => sum + (part.total_cost || part.part_cost || 0), 0);
    });
    
    const mostExpensiveCategories = Object.entries(costByCategory)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    // 최근 정비 내역
    const recentRepairs = records
      .sort((a, b) => new Date(b.service_date) - new Date(a.service_date))
      .slice(0, 3);
    
    let analysis = `🔧 ${modelName}의 정비 이력 상세 분석 결과

📊 기본 통계:
• 총 정비 횟수: ${records.length}건
• 총 정비 비용: ${totalCost.toLocaleString()}원
• 평균 정비 비용: ${records.length > 0 ? Math.round(totalCost / records.length).toLocaleString() : 0}원
• 정비 패턴: ${repairPattern.pattern}`;

    // 부품 분석
    if (allParts.length > 0) {
      analysis += `

🔩 사용된 부품 분석:
• 총 사용 부품: ${allParts.length}개`;

      // 빈번하게 교체된 부품
      if (mostFrequentParts.length > 0) {
        analysis += `
• 자주 교체된 부품:`;
        mostFrequentParts.forEach(([partName, count], index) => {
          analysis += `\n  ${index + 1}. ${partName} (${count}회)`;
        });
      }

      // 부품 카테고리별 분석
      if (Object.keys(partsByCategory).length > 0) {
        analysis += `
• 부품 카테고리별 현황:`;
        Object.entries(partsByCategory).forEach(([category, parts]) => {
          const categoryCost = parts.reduce((sum, part) => sum + (part.total_cost || part.part_cost || 0), 0);
          analysis += `\n  - ${category}: ${parts.length}개 (${categoryCost.toLocaleString()}원)`;
        });
      }

      // 비용이 많이 든 카테고리
      if (mostExpensiveCategories.length > 0) {
        analysis += `
• 가장 비용이 많이 든 카테고리:`;
        mostExpensiveCategories.forEach(([category, cost], index) => {
          analysis += `\n  ${index + 1}. ${category} (${cost.toLocaleString()}원)`;
        });
      }
    }

    // 최근 정비 이력
    if (recentRepairs.length > 0) {
      analysis += `

📅 최근 정비 이력:`;
      recentRepairs.forEach((record, index) => {
        const date = new Date(record.service_date).toLocaleDateString('ko-KR');
        const cost = (record.total_cost || record.cost || 0).toLocaleString();
        analysis += `\n${index + 1}. ${date}: ${record.service_description || record.description || '정비'} (${cost}원)`;
        
        // 해당 정비의 부품 정보
        if (record.details && record.details.length > 0) {
          analysis += `\n   └ 사용 부품: ${record.details.map(d => d.item_name || d.part_name).join(', ')}`;
        }
      });
    }

    // 정비 추천
    analysis += `

💡 전문가 추천 사항:`;

    // 정비 주기 추천
    if (repairPattern.frequency > 0) {
      if (repairPattern.frequency <= 90) {
        analysis += `\n• 현재 3개월 내 정비 주기 유지 권장`;
      } else if (repairPattern.frequency <= 180) {
        analysis += `\n• 6개월 주기 정기 점검 권장`;
      } else {
        analysis += `\n• 3개월 주기 정기 점검으로 전환 권장 (예방 정비)`;
      }
    }

    // 부품별 추천
    if (mostFrequentParts.length > 0) {
      const topPart = mostFrequentParts[0];
      if (topPart[1] >= 2) {
        analysis += `\n• ${topPart[0]}는 마모성 부품으로, 정기적 점검 및 예비 부품 확보 권장`;
      }
    }

    // 비용 효율화 추천
    if (totalCost > 0) {
      analysis += `\n• 정비 이력 기반 연간 예상 비용: ${Math.round(totalCost / Math.max(records.length, 1) * 4).toLocaleString()}원`;
      analysis += `\n• 정기 점검으로 고장 예방 및 비용 절감 가능`;
    }

    // 안전 점검 추천
    analysis += `\n• 브레이크, 타이어 등 안전 관련 부품 우선 점검 권장`;
    analysis += `\n• 계절별 점검 (봄: 유압계통, 여름: 냉각계통, 가을: 전기계통, 겨울: 시동계통)`;

    analysis += `

🔍 추가 분석이 필요하시면 특정 부품이나 정비 내역에 대해 질문해주세요!`;

    return analysis;
  };

  return (
    <>
      {/* 플로팅 챗봇 버튼 */}
      {!isOpen && (
        <FAB
          icon="chat"
          label="정비 도우미"
          style={styles.fab}
          onPress={() => {
            console.log('FAB 버튼 클릭됨 - 정비 도우미 열기');
            setIsOpen(true);
          }}
          color="#fff"
        />
      )}

      {/* 챗봇 전체 화면 */}
      {isOpen && (
        <View style={styles.fullScreenContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.chatContainer}
          >
            {/* 헤더 */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>🔧</Text>
                </View>
                <View>
                  <Text style={styles.headerTitle}>정비 도우미</Text>
                  <View style={styles.statusContainer}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>온라인</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 메시지 영역 */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={scrollToBottom}
            >
              {messages.map((msg, index) => {
                console.log('메시지 렌더링:', { index, role: msg.role, content: msg.content?.substring(0, 50) + '...' });
                return (
                  <View
                    key={index}
                    style={[
                      styles.messageWrapper,
                      msg.role === 'user' ? styles.userMessageWrapper : styles.botMessageWrapper
                    ]}
                  >
                    {msg.role === 'bot' && (
                      <View style={styles.botAvatar}>
                        <Text style={styles.botAvatarText}>🤖</Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.messageBubble,
                        msg.role === 'user' ? styles.userMessage : styles.botMessage
                      ]}
                    >
                      <Text style={[
                        styles.messageText,
                        msg.role === 'user' ? styles.userMessageText : styles.botMessageText
                      ]}>
                        {msg.content}
                      </Text>
                      <Text style={[
                        styles.messageTime,
                        msg.role === 'user' ? styles.userMessageTime : styles.botMessageTime
                      ]}>
                        {formatTime(msg.timestamp)}
                      </Text>
                    </View>
                  </View>
                );
              })}
              
              {isTyping && (
                <View style={styles.typingIndicator}>
                  <View style={styles.botAvatar}>
                    <Text style={styles.botAvatarText}>🤖</Text>
                  </View>
                  <View style={styles.typingBubble}>
                    <View style={styles.typingDots}>
                      <View style={[styles.typingDot, styles.typingDot1]} />
                      <View style={[styles.typingDot, styles.typingDot2]} />
                      <View style={[styles.typingDot, styles.typingDot3]} />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* 입력 영역 */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputMessage}
                onChangeText={setInputMessage}
                placeholder="정비 관련 질문을 입력하세요..."
                placeholderTextColor="#999"
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                onPress={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                style={[
                  styles.sendButton,
                  { opacity: inputMessage.trim() && !isTyping ? 1 : 0.5 }
                ]}
              >
                <Text style={[
                  styles.sendButtonText,
                  { color: inputMessage.trim() && !isTyping ? '#1976D2' : '#ccc' }
                ]}>➤</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 80,
    backgroundColor: '#1976D2',
  },
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 1000,
  },
  chatContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    backgroundColor: '#1976D2',
    borderBottomWidth: 1,
    borderBottomColor: '#0D47A1',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  statusText: {
    fontSize: 12,
    color: '#E3F2FD',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  botMessageWrapper: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botAvatarText: {
    fontSize: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    backgroundColor: '#1976D2',
    borderBottomRightRadius: 4,
  },
  botMessage: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  botMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: '#E3F2FD',
    textAlign: 'right',
  },
  botMessageTime: {
    color: '#999',
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typingBubble: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#999',
  },
  typingDot1: {
    animation: 'typingDot1 1.4s infinite',
  },
  typingDot2: {
    animation: 'typingDot2 1.4s infinite',
  },
  typingDot3: {
    animation: 'typingDot3 1.4s infinite',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MechanicChatbot;
