import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  DocumentMagnifyingGlassIcon,
  BeakerIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

const AIAssistantPage = () => {
  const [question, setQuestion] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');

  const queryClient = useQueryClient();

  // Query สำหรับ AI status
  const { data: aiStatus, isLoading: statusLoading } = useQuery(
    'aiStatus',
    () => api.get('/ai/status').then(res => res.data),
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      onError: (error) => {
        console.error('Failed to fetch AI status:', error);
      }
    }
  );

  // Query สำหรับ quick insights
  const { data: quickInsights, isLoading: insightsLoading } = useQuery(
    'quickInsights',
    () => api.get('/ai/quick-insights?hours=24').then(res => res.data),
    {
      refetchInterval: 300000, // Refresh every 5 minutes
      onError: (error) => {
        console.error('Failed to fetch quick insights:', error);
      }
    }
  );

  // Mutation สำหรับถามคำถาม
  const askQuestionMutation = useMutation(
    (questionData) => api.post('/ai/ask', questionData).then(res => res.data),
    {
      onSuccess: (data) => {
        const newConversation = {
          id: Date.now(),
          question: question,
          answer: data.answer || data.response || 'ไม่สามารถตอบคำถามได้ในขณะนี้',
          timestamp: new Date().toISOString(),
          success: data.success
        };
        setConversationHistory(prev => [...prev, newConversation]);
        setQuestion('');
      },
      onError: (error) => {
        console.error('Error asking question:', error);
        const errorConversation = {
          id: Date.now(),
          question: question,
          answer: 'เกิดข้อผิดพลาดในการสื่อสารกับ AI Assistant กรุณาลองใหม่อีกครั้ง',
          timestamp: new Date().toISOString(),
          success: false,
          error: true
        };
        setConversationHistory(prev => [...prev, errorConversation]);
        setQuestion('');
      }
    }
  );

  const handleAskQuestion = () => {
    if (!question.trim()) return;
    
    askQuestionMutation.mutate({
      question: question,
      context: {
        timestamp: new Date().toISOString(),
        source: 'web_interface'
      }
    });
  };

  const getProviderDisplay = () => {
    if (!aiStatus) return 'AI Assistant';
    
    if (aiStatus.recommended_provider === 'local') {
      return `Local AI (${aiStatus.local?.model || 'Ollama'})`;
    } else if (aiStatus.recommended_provider === 'openai') {
      return `OpenAI (${aiStatus.openai?.model || 'GPT'})`;
    }
    return 'AI Assistant';
  };

  const getProviderColor = () => {
    if (!aiStatus) return 'text-blue-600';
    
    if (aiStatus.recommended_provider === 'local') {
      return 'text-green-600';
    } else if (aiStatus.recommended_provider === 'openai') {
      return 'text-blue-600';
    }
    return 'text-gray-600';
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case 'high': case 'critical': return 'text-red-600 bg-red-100';
      case 'medium': case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'low': case 'minimal': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <SparklesIcon className="h-8 w-8 text-blue-600 mr-3" />
              AI Assistant
            </h1>
            <p className="text-gray-600 mt-1">
              วิเคราะห์ log และตอบคำถามด้วย AI
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {statusLoading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            ) : (
              <div className={`flex items-center px-3 py-2 rounded-lg border ${aiStatus?.ai_available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${aiStatus?.ai_available ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-sm font-medium ${getProviderColor()}`}>
                  {getProviderDisplay()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'chat', name: 'Chat Assistant', icon: ChatBubbleLeftRightIcon },
              { id: 'insights', name: 'Quick Insights', icon: LightBulbIcon },
              { id: 'analysis', name: 'Log Analysis', icon: DocumentMagnifyingGlassIcon },
              { id: 'detection', name: 'Anomaly Detection', icon: ExclamationTriangleIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Chat Assistant Tab */}
          {activeTab === 'chat' && (
            <div className="space-y-6">
              {/* Chat Interface */}
              <div className="bg-gray-50 rounded-xl p-4 min-h-[400px] max-h-[500px] overflow-y-auto">
                {conversationHistory.length === 0 ? (
                  <div className="text-center text-gray-500 mt-20">
                    <ChatBubbleLeftRightIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">เริ่มสนทนากับ AI Assistant</p>
                    <p className="text-sm mt-2">ถามคำถามเกี่ยวกับ security logs, threats, หรือระบบของคุณ</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversationHistory.map((conv) => (
                      <div key={conv.id} className="space-y-3">
                        {/* User Question */}
                        <div className="flex justify-end">
                          <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-xs lg:max-w-md">
                            <p className="text-sm">{conv.question}</p>
                          </div>
                        </div>
                        
                        {/* AI Answer */}
                        <div className="flex justify-start">
                          <div className={`rounded-lg px-4 py-2 max-w-xs lg:max-w-md ${
                            conv.error ? 'bg-red-100 text-red-800' : 'bg-white border border-gray-200'
                          }`}>
                            <div className="flex items-start space-x-2">
                              <SparklesIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${conv.error ? 'text-red-500' : 'text-blue-500'}`} />
                              <p className="text-sm">{conv.answer}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(conv.timestamp).toLocaleString('th-TH')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Question Input */}
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                  placeholder="ถามคำถาม เช่น 'มี threats อะไรบ้างใน 24 ชั่วโมงที่ผ่านมา?'"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={askQuestionMutation.isLoading}
                />
                <button
                  onClick={handleAskQuestion}
                  disabled={askQuestionMutation.isLoading || !question.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {askQuestionMutation.isLoading ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  )}
                  <span>{askQuestionMutation.isLoading ? 'กำลังถาม...' : 'ถาม'}</span>
                </button>
              </div>

              {/* Quick Question Suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button 
                  onClick={() => setQuestion('มี failed login attempts อยู่กี่ครั้งใน 24 ชั่วโมงที่ผ่านมา?')}
                  className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                >
                  มี failed login attempts อยู่กี่ครั้ง?
                </button>
                <button 
                  onClick={() => setQuestion('IP addresses ไหนที่มี suspicious activities?')}
                  className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                >
                  IP addresses ที่น่าสงสัย
                </button>
                <button 
                  onClick={() => setQuestion('แนะนำการปรับปรุง security policies?')}
                  className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                >
                  แนะนำการปรับปรุง security
                </button>
                <button 
                  onClick={() => setQuestion('สรุปสถานการณ์ security ในวันนี้?')}
                  className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                >
                  สรุปสถานการณ์ security วันนี้
                </button>
              </div>
            </div>
          )}

          {/* Quick Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              {insightsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : quickInsights ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center mb-4">
                      <LightBulbIcon className="h-6 w-6 text-blue-600 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-900">AI Insights Summary</h3>
                    </div>
                    <p className="text-gray-700 mb-4">
                      {quickInsights.insights?.summary || 'กำลังวิเคราะห์ข้อมูล...'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Time Range: {quickInsights.insights?.time_range}
                      </span>
                      {quickInsights.insights?.risk_level && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(quickInsights.insights.risk_level)}`}>
                          Risk Level: {quickInsights.insights.risk_level}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Key Insights */}
                  {quickInsights.insights?.key_insights && quickInsights.insights.key_insights.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {quickInsights.insights.key_insights.map((insight, index) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <BeakerIcon className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-700">{insight}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {quickInsights.insights?.top_recommendations && quickInsights.insights.top_recommendations.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Top Recommendations</h4>
                      <div className="space-y-3">
                        {quickInsights.insights.top_recommendations.map((recommendation, index) => (
                          <div key={index} className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-green-800">{recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Refresh Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => queryClient.invalidateQueries('quickInsights')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      <span>Refresh Insights</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <ExclamationTriangleIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">ไม่สามารถโหลด insights ได้</p>
                </div>
              )}
            </div>
          )}

          {/* Other tabs content placeholder */}
          {activeTab === 'analysis' && (
            <div className="text-center py-12">
              <DocumentMagnifyingGlassIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Log Analysis feature กำลังพัฒนา</p>
            </div>
          )}

          {activeTab === 'detection' && (
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Anomaly Detection feature กำลังพัฒนา</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Status Card */}
      {aiStatus && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CpuChipIcon className="h-5 w-5 text-blue-600 mr-2" />
            AI System Status
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Current Provider</h4>
              <p className="text-lg font-semibold text-blue-600">{aiStatus.current_provider?.toUpperCase()}</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Local AI Model</h4>
              <p className="text-lg font-semibold text-green-600">{aiStatus.local?.model || 'N/A'}</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Features</h4>
              <p className="text-lg font-semibold text-purple-600">
                {Object.values(aiStatus.features || {}).filter(Boolean).length} Active
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Status</h4>
              <div className="flex items-center">
                {aiStatus.ai_available ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                )}
                <span className={`text-sm font-medium ${aiStatus.ai_available ? 'text-green-600' : 'text-red-600'}`}>
                  {aiStatus.ai_available ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">{aiStatus.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantPage;
