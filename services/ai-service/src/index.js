const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8090;

app.use(cors());
app.use(express.json());

// Mock LLM Response Generator
const generateMockResponse = (prompt, context) => {
  if (prompt.includes('triage') || context?.type === 'alert') {
    return {
      analysis: "Based on the provided telemetry, this alert appears to be a **True Positive**. The source IP `192.168.1.105` initiated multiple connection attempts to known malicious port `445` (SMB) on the target `10.0.0.5`. This pattern matches the *WannaCry* propagation behavior.",
      confidence: 0.92,
      severity_assessment: "Critical",
      recommended_actions: [
        "Isolate host 192.168.1.105 immediately.",
        "Block SMB traffic on the internal firewall.",
        "Run a full system scan on the affected host."
      ]
    };
  }
  
  if (prompt.includes('report')) {
    return {
      title: "Incident Report: Suspicious Lateral Movement",
      summary: "On 2025-08-15, a suspicious lateral movement attempt was detected originating from workstation-01. The attack utilized SMB exploits similar to EternalBlue.",
      timeline: [
        "10:00:00 - Initial port scan detected",
        "10:05:23 - SMB brute force attempt started",
        "10:10:15 - Alert triggered: Suspicious PowerShell Activity"
      ],
      impact: "Potential compromise of internal file server. Data exfiltration risk is High.",
      status: "Containment in progress"
    };
  }

  return {
    response: "I've analyzed the data. The traffic volume shows a significant spike at 14:00 UTC, correlating with the deployment of the new payment gateway. No anomalies detected in the payload structure."
  };
};

// API: Triage Alert
app.post('/ai/triage', async (req, res) => {
  const { alertId, alertData } = req.body;
  
  // In a real app, we would call OpenAI/Gemini here
  // const completion = await openai.chat.completions.create({...});
  
  // Simulate processing delay
  setTimeout(() => {
    const analysis = generateMockResponse('triage', { type: 'alert', data: alertData });
    res.json(analysis);
  }, 1500);
});

// API: Chat
app.post('/ai/chat', async (req, res) => {
  const { message, context } = req.body;
  
  setTimeout(() => {
    const response = generateMockResponse(message, context);
    res.json(response);
  }, 1000);
});

// API: Generate Report
app.post('/ai/report', async (req, res) => {
  const { incidentId, data } = req.body;
  
  setTimeout(() => {
    const report = generateMockResponse('report', { data });
    res.json(report);
  }, 2000);
});

app.listen(PORT, () => {
  console.log(`AI Service running on port ${PORT}`);
});
