"""
AI Prompts for Log Analysis
รวม prompts ที่ใช้กับ AI สำหรับการวิเคราะห์ log ประเภทต่างๆ
"""

# System prompts for different AI Assistant modes
SYSTEM_PROMPTS = {
    "log_analyst": """คุณเป็น Security Analyst ผู้เชี่ยวชาญด้านการวิเคราะห์ log และ cybersecurity 
    คุณมีความรู้ลึกในเรื่อง authentication log, firewall log, network security, และการตรวจจับ threats
    คุณตอบเป็นภาษาไทยอย่างชัดเจน และให้คำแนะนำที่เป็นประโยชน์""",
    
    "sql_expert": """คุณเป็นผู้เชี่ยวชาญ ClickHouse SQL และการจัดการฐานข้อมูล 
    คุณสามารถแปลงคำถามภาษาธรรมชาติเป็น SQL query ที่มีประสิทธิภาพได้
    คุณรู้จัก ClickHouse functions เป็นอย่างดี และให้คำอธิบายการใช้งาน SQL เป็นภาษาไทย""",
    
    "threat_hunter": """คุณเป็น Threat Hunter ผู้เชี่ยวชาญในการค้นหาและตรวจจับภัยคุกคาม
    คุณสามารถวิเคราะห์รูปแบบการโจมตี, ตรวจหา IoC (Indicators of Compromise), 
    และให้คำแนะนำการป้องกันภัยคุกคาม ตอบเป็นภาษาไทย""",
    
    "compliance_auditor": """คุณเป็นผู้เชี่ยวชาญด้าน compliance และ audit 
    คุณรู้เรื่อง PDPA, ISO 27001, NIST Framework และข้อกำหนดทางกฎหมายต่างๆ
    คุณช่วยสร้าง report และวิเคราะห์ log เพื่อการ compliance ตอบเป็นภาษาไทย"""
}

# Templates for different types of analysis
ANALYSIS_TEMPLATES = {
    "security_incident": """
วิเคราะห์ข้อมูล log ต่อไปนี้เพื่อตรวจหา security incident:

ข้อมูล Log:
{log_data}

กรุณาวิเคราะห์และระบุ:
1. มี security incident เกิดขึ้นหรือไม่
2. ประเภทของ incident (brute force, unauthorized access, etc.)
3. ระดับความรุนแรง (LOW, MEDIUM, HIGH, CRITICAL)
4. IP addresses หรือ users ที่น่าสงสัย
5. Timeline ของเหตุการณ์
6. ผลกระทบที่อาจเกิดขึ้น
7. ข้อแนะนำในการแก้ไขและป้องกัน

Response format (JSON):
{{
    "incident_detected": true/false,
    "incident_type": "type of incident",
    "severity": "LOW|MEDIUM|HIGH|CRITICAL",
    "timeline": "summary of event timeline",
    "affected_assets": ["list", "of", "affected", "systems"],
    "indicators": ["suspicious", "indicators", "found"],
    "recommendations": ["action", "items"],
    "summary": "detailed summary in Thai"
}}
""",

    "performance_analysis": """
วิเคราะห์ performance และ usage patterns จากข้อมูล log:

ข้อมูล Log:
{log_data}

กรุณาวิเคราะห์:
1. รูปแบบการใช้งานตามเวลา
2. Peak hours และ off-peak hours
3. Users/IPs ที่มี activity สูง
4. ความถี่ของ authentication attempts
5. Success vs failure rates
6. Trending และ patterns ที่น่าสนใจ
7. คำแนะนำเพื่อปรับปรุง performance

Response format (JSON):
{{
    "usage_patterns": {{
        "peak_hours": ["hours"],
        "busy_days": ["days"],
        "activity_trends": "description"
    }},
    "statistics": {{
        "total_events": number,
        "success_rate": percentage,
        "top_users": ["users"],
        "top_ips": ["ips"]
    }},
    "insights": ["key", "insights"],
    "recommendations": ["performance", "recommendations"],
    "summary": "detailed analysis in Thai"
}}
""",

    "anomaly_detection": """
ตรวจหาและวิเคราะห์ anomalies ในข้อมูล log:

ข้อมูลสถิติ:
{statistics}

ข้อมูล Time Series:
{time_series}

กรุณาวิเคราะห์:
1. รูปแบบที่ผิดปกติในข้อมูล
2. Spikes หรือ drops ที่น่าสงสัย
3. เวลาที่เกิด anomalies
4. เปรียบเทียบกับ baseline normal behavior
5. ความน่าจะเป็นที่เป็น false positive
6. ผลกระทบต่อความปลอดภัย
7. ข้อแนะนำการติดตาม

Response format (JSON):
{{
    "anomalies_detected": true/false,
    "anomaly_types": ["type1", "type2"],
    "severity_assessment": "LOW|MEDIUM|HIGH|CRITICAL",
    "time_periods": ["when anomalies occurred"],
    "affected_metrics": ["which metrics are abnormal"],
    "root_cause_analysis": "possible causes",
    "false_positive_probability": "LOW|MEDIUM|HIGH",
    "monitoring_recommendations": ["what to monitor"],
    "summary": "detailed analysis in Thai"
}}
""",

    "compliance_report": """
สร้าง compliance report จากข้อมูล log:

ข้อมูล Log:
{log_data}

Compliance Framework: {framework}
รอบเวลา: {time_period}

กรุณาสร้าง report ที่ครอบคลุม:
1. สรุปกิจกรรมการเข้าถึงระบบ
2. การปฏิบัติตามนโยบายความปลอดภัย
3. การตรวจพบและจัดการ security incidents
4. การจัดเก็บและรักษาความปลอดภัยของ log
5. ข้อแนะนำเพื่อการปรับปรุง compliance
6. สถิติและ metrics สำคัญ

Response format (JSON):
{{
    "executive_summary": "high-level summary",
    "compliance_status": "COMPLIANT|PARTIALLY_COMPLIANT|NON_COMPLIANT",
    "key_metrics": {{
        "total_access_attempts": number,
        "successful_logins": number,
        "failed_attempts": number,
        "unique_users": number,
        "incidents_detected": number
    }},
    "compliance_gaps": ["identified", "gaps"],
    "recommendations": ["compliance", "improvements"],
    "detailed_findings": "comprehensive analysis",
    "summary": "detailed report in Thai"
}}
""",

    "threat_hunting": """
ทำ threat hunting analysis จากข้อมูล log:

ข้อมูล Log:
{log_data}

Threat Intelligence Context:
{threat_context}

กรุณาวิเคราะห์และค้นหา:
1. Indicators of Compromise (IoCs)
2. Suspicious user behaviors
3. Lateral movement patterns
4. Persistence mechanisms
5. Data exfiltration attempts
6. Known attack patterns/TTPs
7. Advanced Persistent Threats (APT) signatures

Response format (JSON):
{{
    "threats_identified": true/false,
    "threat_types": ["malware", "insider_threat", "external_attack"],
    "iocs_found": {{
        "suspicious_ips": ["ips"],
        "malicious_users": ["users"],
        "abnormal_patterns": ["patterns"]
    }},
    "attack_stages": ["reconnaissance", "initial_access", "persistence"],
    "confidence_level": "LOW|MEDIUM|HIGH",
    "threat_actor_profile": "description of likely threat actor",
    "mitigation_steps": ["immediate", "actions", "needed"],
    "hunting_recommendations": ["areas", "to", "investigate", "further"],
    "summary": "detailed threat analysis in Thai"
}}
""",

    "user_behavior_analysis": """
วิเคราะห์พฤติกรรมผู้ใช้จากข้อมูล log:

ข้อมูล User Activities:
{user_data}

กรุณาวิเคราะห์:
1. รูปแบบการใช้งานของแต่ละ user
2. การเข้าถึงนอกเวลาปกติ
3. การใช้งานจาก IP ที่ผิดปกติ
4. ความถี่การ login/logout
5. พฤติกรรมที่อาจเป็นอันตราย
6. Users ที่ต้องติดตามเป็นพิเศษ
7. แนวโน้มการใช้งานในอนาคต

Response format (JSON):
{{
    "user_profiles": {{
        "normal_users": ["users", "with", "normal", "behavior"],
        "suspicious_users": ["users", "requiring", "attention"],
        "high_activity_users": ["very", "active", "users"]
    }},
    "behavioral_patterns": {{
        "login_patterns": "description",
        "access_patterns": "description",
        "time_patterns": "description"
    }},
    "risk_assessment": {{
        "high_risk_activities": ["activities"],
        "medium_risk_activities": ["activities"],
        "low_risk_activities": ["activities"]
    }},
    "recommendations": {{
        "monitoring": ["users", "to", "monitor"],
        "policies": ["policy", "suggestions"],
        "training": ["training", "needs"]
    }},
    "summary": "detailed user behavior analysis in Thai"
}}
"""
}

# Quick analysis prompts for common questions
QUICK_PROMPTS = {
    "failed_logins": "วิเคราะห์ failed login attempts และระบุ IP หรือ user ที่น่าสงสัย",
    "top_users": "แสดง top active users และวิเคราะห์รูปแบบการใช้งาน",
    "suspicious_ips": "ตรวจหา IP addresses ที่มีพฤติกรรมน่าสงสัย",
    "time_analysis": "วิเคราะห์รูปแบบการเข้าถึงตามเวลา และหาช่วงเวลาที่ผิดปกติ",
    "security_summary": "สรุปสถานการณ์ความปลอดภัยโดยรวมจาก log",
    "brute_force": "ตรวจหา brute force attacks และแนะนำการป้องกัน",
    "data_access": "วิเคราะห์การเข้าถึงข้อมูลและหาการเข้าถึงที่ไม่ได้รับอนุญาต"
}

# SQL query generation prompts
SQL_GENERATION_PROMPTS = {
    "basic_filter": """
แปลงคำถามนี้เป็น ClickHouse SQL query:
"{question}"

ใช้ table: authentication_logs
Available columns: {schema}

สร้าง query ที่:
1. มีประสิทธิภาพและใช้ index
2. จำกัด results ด้วย LIMIT
3. ใช้ ClickHouse functions ที่เหมาะสม
4. มี proper WHERE conditions
""",

    "aggregation": """
สร้าง ClickHouse SQL query สำหรับการวิเคราะห์และ aggregation:
"{question}"

Table: authentication_logs
Schema: {schema}

ต้องการ query ที่:
1. ใช้ GROUP BY และ aggregation functions
2. มี proper ORDER BY
3. ใช้ ClickHouse date/time functions
4. optimize สำหรับ performance
""",

    "time_series": """
สร้าง time-series analysis query สำหรับ:
"{question}"

Table: authentication_logs
Schema: {schema}

Query ต้อง:
1. จัดกลุ่มตามเวลา (hour, day, etc.)
2. ใช้ ClickHouse date functions
3. มี trend analysis
4. optimize สำหรับ large datasets
"""
}

# Response formatting templates
RESPONSE_FORMATS = {
    "json_analysis": """
{{
    "summary": "สรุปการวิเคราะห์",
    "findings": ["key findings"],
    "recommendations": ["actionable recommendations"],
    "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
    "details": "detailed analysis"
}}
""",

    "sql_response": """
{{
    "query": "SELECT ... FROM authentication_logs ...",
    "explanation": "อธิบายการทำงานของ query",
    "performance_notes": "ข้อสังเกตเรื่อง performance",
    "success": true
}}
""",

    "threat_response": """
{{
    "threat_detected": true/false,
    "threat_type": "type of threat",
    "severity": "severity level",
    "indicators": ["IoCs found"],
    "timeline": "when it happened",
    "impact": "potential impact",
    "mitigation": ["mitigation steps"],
    "summary": "detailed summary"
}}
"""
}

def get_prompt_template(analysis_type: str, **kwargs) -> str:
    """ดึง prompt template สำหรับการวิเคราะห์แต่ละประเภท"""
    template = ANALYSIS_TEMPLATES.get(analysis_type, "")
    if template and kwargs:
        return template.format(**kwargs)
    return template

def get_system_prompt(mode: str) -> str:
    """ดึง system prompt สำหรับ AI mode ต่างๆ"""
    return SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["log_analyst"])

def get_quick_prompt(prompt_type: str) -> str:
    """ดึง quick prompt สำหรับคำถามทั่วไป"""
    return QUICK_PROMPTS.get(prompt_type, "วิเคราะห์ข้อมูล log และให้ข้อมูลเชิงลึก")

def build_context_prompt(question: str, context_data: dict) -> str:
    """สร้าง prompt พร้อม context สำหรับการตอบคำถาม"""
    context_summary = []
    
    if "recent_stats" in context_data:
        stats = context_data["recent_stats"]
        context_summary.append(f"สถิติล่าสุด: {stats.get('total_logs', 0)} logs")
    
    if "recent_logs" in context_data:
        logs_count = len(context_data["recent_logs"])
        context_summary.append(f"ตัวอย่าง log ล่าสุด: {logs_count} entries")
    
    context_text = " | ".join(context_summary)
    
    return f"""
คำถาม: {question}

Context: {context_text}

ข้อมูลเพิ่มเติม:
{context_data}

กรุณาตอบคำถามโดยอ้างอิงข้อมูล context ที่ให้มา และให้คำแนะนำที่เป็นประโยชน์
""" 