import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot } from 'lucide-react';
import { api } from '../services/api';
import { mockApi } from '../services/mockApi';
import './AiChatWidget.css';

interface Message {
  id: number;
  sender: 'ai' | 'user';
  text: string;
  isError?: boolean;
}

interface ChatContext {
  page: string;
  timestamp: string;
}

interface ChatResponse {
  response?: string;
  analysis?: string;
}

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'ai', text: 'Hello! I am your AI Security Analyst. Ask me anything about your network traffic, alerts, or security posture.' }
  ]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Get current context (e.g., current URL or selected alert)
      const context: ChatContext = {
        page: window.location.pathname,
        timestamp: new Date().toISOString()
      };

      const response = await api.chatWithAI(userMsg.text, context) as ChatResponse;
      
      const aiMsg: Message = { 
        id: Date.now() + 1, 
        sender: 'ai', 
        text: response.response || response.analysis || "I'm processing that..."
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.warn('Chat API failed, falling back to mock:', error);
      
      try {
        // Fallback to mock API
        const response = await mockApi.chatWithAI(userMsg.text, {});
        const aiMsg: Message = { 
          id: Date.now() + 1, 
          sender: 'ai', 
          text: response.response || "I'm processing that..."
        };
        setMessages(prev => [...prev, aiMsg]);
      } catch (mockError) {
        setMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          sender: 'ai', 
          text: "I'm having trouble connecting to the AI service right now. Please try again later.",
          isError: true
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`ai-chat-widget ${isOpen ? 'open' : ''}`}>
      {!isOpen && (
        <button className="chat-toggle-btn" onClick={() => setIsOpen(true)}>
          <div className="chat-icon-wrapper">
            <Bot className="w-6 h-6" />
            <div className="status-dot"></div>
          </div>
          <span className="chat-label">AI Analyst</span>
        </button>
      )}

      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="header-info">
              <div className="header-icon">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3>AI Analyst</h3>
                <span className="status-text">Online • GPT-4o</span>
              </div>
            </div>
            <button className="close-btn" onClick={() => setIsOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="chat-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`message ${msg.sender} ${msg.isError ? 'error' : ''}`}>
                {msg.sender === 'ai' && (
                  <div className="message-avatar">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className="message-bubble">
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="message ai loading">
                <div className="message-avatar">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="message-bubble typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <input
              type="text"
              placeholder="Ask about threats, IPs, or logs..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
              autoFocus
            />
            <button 
              className="send-btn" 
              onClick={handleSend}
              disabled={!input.trim() || loading}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
