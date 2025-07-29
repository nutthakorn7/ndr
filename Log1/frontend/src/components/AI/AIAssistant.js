import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Lightbulb, BarChart, Search, Shield } from 'lucide-react';
import api from '../../services/api';

const AIAssistant = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'สวัสดีครับ! ผมเป็น AI Assistant สำหรับระบบ Log Management คุณสามารถถามคำถามเกี่ยวกับ log, สถิติ, หรือขอให้วิเคราะห์ข้อมูลได้เลยครับ',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // ตรวจสอบสถานะ AI Assistant
    checkAIStatus();
    // ดึงคำแนะนำคำถาม
    fetchSuggestions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkAIStatus = async () => {
    try {
      const response = await api.get('/ai/status');
      setAiStatus(response.data);
    } catch (error) {
      console.error('Failed to check AI status:', error);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await api.get('/ai/suggestions');
      setSuggestions(response.data.suggestions);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  const sendMessage = async (messageText = null) => {
    const message = messageText || inputMessage.trim();
    if (!message || isLoading) return;

    // เพิ่มข้อความของผู้ใช้
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // ส่งคำถามไปยัง AI
      const response = await api.post('/ai/ask', {
        question: message
      });

      // เพิ่มคำตอบของ AI
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.data.result.answer,
        query: response.data.result.query_generated,
        recommendations: response.data.result.recommendations,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผลคำถาม กรุณาลองใหม่อีกครั้ง',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickInsights = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/ai/quick-insights?hours=24');
      const insights = response.data.insights;
      
      const insightMessage = {
        id: Date.now(),
        type: 'ai',
        content: `📊 **Quick Insights (24 ชั่วโมงที่ผ่านมา)**\n\n${insights.summary}\n\n**ข้อมูลเชิงลึก:**\n${insights.key_insights.map(insight => `• ${insight}`).join('\n')}\n\n**ระดับความเสี่ยง:** ${insights.risk_level}\n\n**คำแนะนำ:**\n${insights.top_recommendations.map(rec => `• ${rec}`).join('\n')}`,
        timestamp: new Date(),
        isInsight: true
      };
      setMessages(prev => [...prev, insightMessage]);
    } catch (error) {
      console.error('Failed to get quick insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetectAnomalies = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/ai/detect-anomalies', {
        time_range_hours: 24
      });
      const anomalies = response.data.anomalies;
      
      let content = `🔍 **Anomaly Detection (24 ชั่วโมงที่ผ่านมา)**\n\n`;
      content += `**สถานะ:** ${anomalies.anomalies_detected ? 'พบความผิดปกติ' : 'ไม่พบความผิดปกติ'}\n`;
      content += `**ระดับความเสี่ยง:** ${anomalies.risk_level}\n\n`;
      
      if (anomalies.findings && anomalies.findings.length > 0) {
        content += `**รายงานการตรวจพบ:**\n${anomalies.findings.map(finding => `• ${finding}`).join('\n')}\n\n`;
      }
      
      if (anomalies.recommendations && anomalies.recommendations.length > 0) {
        content += `**คำแนะนำ:**\n${anomalies.recommendations.map(rec => `• ${rec}`).join('\n')}`;
      }
      
      const anomalyMessage = {
        id: Date.now(),
        type: 'ai',
        content: content,
        timestamp: new Date(),
        isAnomaly: true
      };
      setMessages(prev => [...prev, anomalyMessage]);
    } catch (error) {
      console.error('Failed to detect anomalies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessage = (content) => {
    // แปลง markdown-like formatting เป็น HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>')
      .replace(/•/g, '•');
  };

  if (!aiStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">กำลังโหลด AI Assistant...</div>
      </div>
    );
  }

  if (!aiStatus.ai_available) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <Bot className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-yellow-800 mb-2">AI Assistant ไม่พร้อมใช้งาน</h3>
        <p className="text-yellow-700">{aiStatus.message}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-full">
            <Bot className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">AI Assistant</h2>
            <p className="text-sm text-gray-500">ผู้ช่วยวิเคราะห์ Log อัจฉริยะ</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleQuickInsights}
            disabled={isLoading}
            className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm hover:bg-green-200 transition-colors flex items-center space-x-1"
          >
            <BarChart className="h-4 w-4" />
            <span>Quick Insights</span>
          </button>
          <button
            onClick={handleDetectAnomalies}
            disabled={isLoading}
            className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm hover:bg-orange-200 transition-colors flex items-center space-x-1"
          >
            <Shield className="h-4 w-4" />
            <span>Detect Anomalies</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.isError
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-gray-50 border border-gray-200 text-gray-800'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.type === 'ai' && (
                  <Bot className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                    message.isError ? 'text-red-500' : 'text-blue-500'
                  }`} />
                )}
                {message.type === 'user' && (
                  <User className="h-5 w-5 mt-0.5 text-white flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div 
                    className="text-sm"
                    dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                  />
                  
                  {/* แสดง SQL query ถ้ามี */}
                  {message.query && (
                    <div className="mt-3 bg-gray-800 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto">
                      <div className="text-gray-400 mb-1">Generated SQL:</div>
                      {message.query}
                    </div>
                  )}
                  
                  {/* แสดงคำแนะนำถ้ามี */}
                  {message.recommendations && message.recommendations.length > 0 && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 p-3 rounded">
                      <div className="flex items-center space-x-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-blue-800">คำแนะนำ</span>
                      </div>
                      <ul className="text-sm text-blue-700 space-y-1">
                        {message.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start space-x-2">
                            <span>•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="text-xs opacity-60 mt-2">
                    {message.timestamp.toLocaleTimeString('th-TH')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-w-xs">
              <div className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-blue-500" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && messages.length === 1 && (
        <div className="border-t p-4 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-700 mb-3">คำถามที่แนะนำ:</h4>
          <div className="space-y-2">
            {suggestions.slice(0, 2).map((category, categoryIdx) => (
              <div key={categoryIdx}>
                <p className="text-xs font-medium text-gray-600 mb-1">{category.category}</p>
                <div className="flex flex-wrap gap-2">
                  {category.questions.slice(0, 3).map((question, questionIdx) => (
                    <button
                      key={questionIdx}
                      onClick={() => sendMessage(question)}
                      className="text-xs bg-white border border-gray-200 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-50 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex space-x-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="ถามคำถามเกี่ยวกับ log หรือขอให้วิเคราะห์ข้อมูล..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !inputMessage.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>ส่ง</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant; 