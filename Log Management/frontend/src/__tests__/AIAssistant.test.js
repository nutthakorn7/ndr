/**
 * AI Assistant Component Tests
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AIAssistant from '../components/AI/AIAssistant';
import api from '../services/api';

// Mock API
jest.mock('../services/api');
const mockedApi = api;

describe('AI Assistant Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock AI status response
    mockedApi.get.mockImplementation((url) => {
      if (url === '/ai/status') {
        return Promise.resolve({
          data: {
            ai_available: true,
            current_provider: 'local',
            recommended_provider: 'local',
            available_providers: ['local'],
            features: {
              question_answering: true,
              log_analysis: true,
              query_generation: true,
              anomaly_detection: true
            }
          }
        });
      }
      if (url === '/ai/suggestions') {
        return Promise.resolve({
          data: {
            suggestions: [
              'แสดงข้อมูล login ล้มเหลวใน 24 ชั่วโมงที่ผ่านมา',
              'วิเคราะห์ pattern การเข้าใช้งานของผู้ใช้',
              'ตรวจสอบ IP addresses ที่น่าสงสัย'
            ]
          }
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  test('renders AI Assistant interface', async () => {
    render(<AIAssistant />);
    
    await waitFor(() => {
      expect(screen.getByText(/สวัสดีครับ! ผมเป็น AI Assistant/)).toBeInTheDocument();
    });
    
    expect(screen.getByPlaceholderText(/พิมพ์คำถามของคุณที่นี่/i)).toBeInTheDocument();
    expect(screen.getByText(/Quick Insights/i)).toBeInTheDocument();
    expect(screen.getByText(/Detect Anomalies/i)).toBeInTheDocument();
  });

  test('sends message when form is submitted', async () => {
    const mockAskResponse = {
      data: {
        answer: 'นี่คือคำตอบจาก AI Assistant',
        type: 'success',
        query_generated: null,
        provider_used: 'local'
      }
    };
    mockedApi.post.mockResolvedValueOnce(mockAskResponse);

    render(<AIAssistant />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/พิมพ์คำถามของคุณที่นี่/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/พิมพ์คำถามของคุณที่นี่/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'สถานะระบบเป็นอย่างไร?' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/ai/ask', {
        question: 'สถานะระบบเป็นอย่างไร?'
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/นี่คือคำตอบจาก AI Assistant/)).toBeInTheDocument();
    });
  });

  test('handles quick insights button', async () => {
    const mockInsightsResponse = {
      data: {
        insights: [
          'มี login attempts เพิ่มขึ้น 15% ในช่วง 24 ชั่วโมงที่ผ่านมา',
          'ระบบมีการใช้งานปกติไม่พบความผิดปกติ'
        ],
        summary: 'ระบบทำงานปกติ',
        provider_used: 'local'
      }
    };
    mockedApi.get.mockImplementation((url) => {
      if (url === '/ai/quick-insights?hours=24') {
        return Promise.resolve(mockInsightsResponse);
      }
      // Return default status response for other calls
      return Promise.resolve({
        data: {
          ai_available: true,
          current_provider: 'local',
          available_providers: ['local']
        }
      });
    });

    render(<AIAssistant />);
    
    await waitFor(() => {
      expect(screen.getByText(/Quick Insights/i)).toBeInTheDocument();
    });

    const quickInsightsButton = screen.getByText(/Quick Insights/i);
    fireEvent.click(quickInsightsButton);

    await waitFor(() => {
      expect(screen.getByText(/มี login attempts เพิ่มขึ้น 15%/)).toBeInTheDocument();
    });
  });

  test('handles detect anomalies button', async () => {
    const mockAnomaliesResponse = {
      data: {
        anomalies: [
          {
            type: 'unusual_login_time',
            description: 'Login นอกเวลาทำการ',
            severity: 'medium',
            timestamp: '2024-01-01T02:00:00Z'
          }
        ],
        summary: 'พบความผิดปกติ 1 รายการ',
        provider_used: 'local'
      }
    };
    mockedApi.post.mockResolvedValueOnce(mockAnomaliesResponse);

    render(<AIAssistant />);
    
    await waitFor(() => {
      expect(screen.getByText(/Detect Anomalies/i)).toBeInTheDocument();
    });

    const detectAnomaliesButton = screen.getByText(/Detect Anomalies/i);
    fireEvent.click(detectAnomaliesButton);

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/ai/detect-anomalies', {
        time_range_hours: 24
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Login นอกเวลาทำการ/)).toBeInTheDocument();
    });
  });

  test('shows loading state during AI request', async () => {
    mockedApi.post.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<AIAssistant />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/พิมพ์คำถามของคุณที่นี่/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/พิมพ์คำถามของคุณที่นี่/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'test question' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/AI กำลังคิด/i)).toBeInTheDocument();
    });
  });

  test('handles AI service unavailable', async () => {
    mockedApi.get.mockImplementation((url) => {
      if (url === '/ai/status') {
        return Promise.resolve({
          data: {
            ai_available: false,
            current_provider: 'none',
            available_providers: [],
            message: 'AI service unavailable'
          }
        });
      }
      return Promise.reject(new Error('Service unavailable'));
    });

    render(<AIAssistant />);
    
    await waitFor(() => {
      expect(screen.getByText(/AI Assistant ไม่พร้อมใช้งาน/i)).toBeInTheDocument();
    });
  });

  test('displays suggestions when available', async () => {
    render(<AIAssistant />);
    
    await waitFor(() => {
      expect(screen.getByText(/แสดงข้อมูล login ล้มเหลวใน 24 ชั่วโมงที่ผ่านมา/)).toBeInTheDocument();
      expect(screen.getByText(/วิเคราะห์ pattern การเข้าใช้งานของผู้ใช้/)).toBeInTheDocument();
    });
  });

  test('handles suggestion click', async () => {
    const mockAskResponse = {
      data: {
        answer: 'แสดงข้อมูล login ล้มเหลว...',
        type: 'success',
        query_generated: 'SELECT * FROM logs WHERE status = "FAILED"',
        provider_used: 'local'
      }
    };
    mockedApi.post.mockResolvedValueOnce(mockAskResponse);

    render(<AIAssistant />);
    
    await waitFor(() => {
      expect(screen.getByText(/แสดงข้อมูล login ล้มเหลวใน 24 ชั่วโมงที่ผ่านมา/)).toBeInTheDocument();
    });

    const suggestion = screen.getByText(/แสดงข้อมูล login ล้มเหลวใน 24 ชั่วโมงที่ผ่านมา/);
    fireEvent.click(suggestion);

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/ai/ask', {
        question: 'แสดงข้อมูล login ล้มเหลวใน 24 ชั่วโมงที่ผ่านมา'
      });
    });
  });
}); 