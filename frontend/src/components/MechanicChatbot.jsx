// 정비사 챗봇 컴포넌트 - LLM API 연동
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

// OpenAI API 호출 함수
const callLLMAPI = async (userMessage, machine, records) => {
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      return '⚠️ OpenAI API 키가 설정되지 않았습니다.\n\n.env 파일에 VITE_OPENAI_API_KEY를 추가해주세요.';
    }

    // 시스템 프롬프트 - 농기계 정비 전문가 역할
    const systemPrompt = `당신은 30년 경력의 농기계 정비 전문가입니다. 
농기계(트랙터, 콤바인, 이앙기 등)의 정비, 고장 진단, 부품 교체, 유지보수에 대한 전문 지식을 가지고 있습니다.

주요 전문 분야:
- 엔진계통: 디젤 엔진, 연료 시스템, 냉각 시스템
- 유압계통: 유압 펌프, 실린더, 유압유 관리
- 동력계통: 클러치, 변속기, 동력 전달 장치
- 전기계통: 배터리, 발전기, 배선, 센서
- 일반 정비: 오일 교환, 필터 관리, 정비 주기

답변 스타일:
- 친절하고 이해하기 쉽게 설명
- 구체적인 점검 방법과 해결책 제시
- 안전 주의사항 강조
- 필요시 전문가 상담 권장
- 한국어로 답변

현재 조회 중인 기계 정보:
${machine ? `- 모델: ${machine.model_name || 'N/A'}
- 제조사: ${machine.manufacturer || 'N/A'}
- 가동시간: ${machine.total_hours || 0}시간
- VIN: ${machine.vin || 'N/A'}` : '- 기계 정보 없음'}

수리 이력:
${records && records.length > 0 ? `- 총 ${records.length}건의 정비 이력
- 마지막 정비일: ${records[0]?.service_date || 'N/A'}` : '- 수리 이력 없음'}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API 오류:', errorData);
      return `⚠️ API 오류가 발생했습니다.\n${errorData.error?.message || '알 수 없는 오류'}`;
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    console.error('LLM API 호출 실패:', error);
    return `⚠️ 챗봇 응답 생성 중 오류가 발생했습니다.\n${error.message}`;
  }
};

export default function MechanicChatbot({ machine, records }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      content: '안녕하세요! 30년 경력의 농기계 정비 전문가입니다.\n\n농기계 정비, 고장 진단, 부품 교체 등 무엇이든 물어보세요. 실제 베테랑 정비사처럼 상세하게 답변해드리겠습니다.',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // 메시지 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 메시지 전송 - LLM API 호출
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // 사용자 메시지 추가
    const userMsg = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    const currentMessage = inputMessage;
    setInputMessage('');
    setIsTyping(true);

    try {
      // LLM API 호출
      const botResponse = await callLLMAPI(currentMessage, machine, records);
      
      const botMsg = {
        role: 'bot',
        content: botResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error('챗봇 응답 생성 실패:', error);
      const errorMsg = {
        role: 'bot',
        content: '⚠️ 죄송합니다. 응답 생성 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Enter 키 처리
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* 플로팅 챗봇 버튼 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg flex items-center justify-center transition-all z-50 group"
          title="정비 도우미"
        >
          <MessageCircle className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
        </button>
      )}

      {/* 챗봇 모달 */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-gray-800 rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-700">
          {/* 헤더 */}
          <div className="bg-blue-600 rounded-t-2xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-white" />
              <h3 className="text-white font-semibold">정비 도우미</h3>
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-blue-700 rounded-lg p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {msg.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* 입력 영역 */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="정비 관련 질문을 입력하세요..."
                className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className={`p-2 rounded-lg transition-colors ${
                  inputMessage.trim()
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              💡 AI 정비 전문가가 실시간으로 답변합니다
            </p>
          </div>
        </div>
      )}
    </>
  );
}
