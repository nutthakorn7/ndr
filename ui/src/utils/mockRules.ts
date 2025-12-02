// Mock Detection Rules Generator
// Generates realistic detection rules for Suricata, YARA, and Sigma

interface DetectionRule {
  id: string | number;
  name: string;
  description?: string;
  category: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'enabled' | 'disabled';
  hits: number;
  updated: string;
  technology: string[];
  ruleType: 'suricata' | 'yara' | 'sigma';
}

// Suricata rule templates
const suricataCategories = {
  'Malware': ['Trojan', 'Backdoor', 'RAT', 'Botnet', 'Cryptominer'],
  'Exploit': ['RCE', 'SQLi', 'XSS', 'Buffer Overflow', 'Code Injection'],
  'Phishing': ['Credential Harvesting', 'Fake Login', 'CEO Fraud'],
  'Scan': ['Port Scan', 'Vuln Scan', 'Network Mapping'],
  'Policy': ['Unauthorized Access', 'Data Exfiltration', 'Suspicious Traffic']
};

const yaraCategories = {
  'Ransomware': ['WannaCry', 'Ryuk', 'Lockbit', 'BlackCat'],
  'APT': ['APT28', 'APT29', 'Lazarus', 'Equation Group'],
  'Webshell': ['PHP Shell', 'JSP Shell', 'ASPX Shell'],
  'Script': ['Obfuscated PowerShell', 'Malicious VBS', 'JavaScript Dropper'],
  'Credential Theft': ['Mimikatz', 'LaZagne', 'Password Dumper']
};

const sigmaCategories = {
  'Execution': ['Process Creation', 'Command Line', 'Scripting'],
  'Persistence': ['Registry', 'Scheduled Task', 'Startup'],
  'Defense Evasion': ['Clear Logs', 'Disable Security', 'Obfuscation'],
  'Credential Access': ['Credential Dumping', 'Brute Force'],
  'Discovery': ['Network Discovery', 'System Info', 'Account Discovery']
};

const technologies = {
  'Windows': 0.4,
  'Linux': 0.3,
  'Web': 0.25,
  'Cloud': 0.15,
  'Network': 0.2,
  'Database': 0.1,
  'Email': 0.05
};

function randomDate(daysAgo: number = 365): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString().split('T')[0];
}

function randomTechnologies(): string[] {
  const techs = Object.keys(technologies);
  const count = Math.floor(Math.random() * 3) + 1;
  const selected: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const tech = techs[Math.floor(Math.random() * techs.length)];
    if (!selected.includes(tech)) {
      selected.push(tech);
    }
  }
  
  return selected;
}

function generateSuricataRules(count: number): DetectionRule[] {
  const rules: DetectionRule[] = [];
  const categories = Object.keys(suricataCategories);
  const severities: Array<'Low' | 'Medium' | 'High' | 'Critical'> = ['Low', 'Medium', 'High', 'Critical'];
  
  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const subCategories = suricataCategories[category as keyof typeof suricataCategories];
    const subCategory = subCategories[Math.floor(Math.random() * subCategories.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    
    rules.push({
      id: 2000000 + i,
      name: `ET ${category.toUpperCase()} ${subCategory}`,
      description: `Detects ${subCategory.toLowerCase()} activity in network traffic`,
      category,
      severity,
      status: Math.random() > 0.7 ? 'enabled' : 'disabled',
      hits: Math.floor(Math.random() * 1000),
      updated: randomDate(),
      technology: randomTechnologies(),
      ruleType: 'suricata'
    });
  }
  
  return rules;
}

function generateYaraRules(count: number): DetectionRule[] {
  const rules: DetectionRule[] = [];
  const categories = Object.keys(yaraCategories);
  const severities: Array<'Low' | 'Medium' | 'High' | 'Critical'> = ['Medium', 'High', 'Critical'];
  
  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const subCategories = yaraCategories[category as keyof typeof yaraCategories];
    const subCategory = subCategories[Math.floor(Math.random() * subCategories.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    
    rules.push({
      id: `yara-${String(i + 1).padStart(4, '0')}`,
      name: `MALW_${subCategory.replace(/\s/g, '_')}`,
      description: `Signature for ${subCategory} malware family`,
      category,
      severity,
      status: Math.random() > 0.8 ? 'enabled' : 'disabled',
      hits: Math.floor(Math.random() * 50),
      updated: randomDate(180),
      technology: randomTechnologies(),
      ruleType: 'yara'
    });
  }
  
  return rules;
}

function generateSigmaRules(count: number): DetectionRule[] {
  const rules: DetectionRule[] = [];
  const categories = Object.keys(sigmaCategories);
  const severities: Array<'Low' | 'Medium' | 'High' | 'Critical'> = ['Low', 'Medium', 'High', 'Critical'];
  
  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const subCategories = sigmaCategories[category as keyof typeof sigmaCategories];
    const subCategory = subCategories[Math.floor(Math.random() * subCategories.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    
    rules.push({
      id: `sigma-${String(i + 1).padStart(4, '0')}`,
      name: `${category}: ${subCategory}`,
      description: `Detects suspicious ${subCategory.toLowerCase()} behavior`,
      category,
      severity,
      status: Math.random() > 0.75 ? 'enabled' : 'disabled',
      hits: Math.floor(Math.random() * 200),
      updated: randomDate(90),
      technology: randomTechnologies(),
      ruleType: 'sigma'
    });
  }
  
  return rules;
}

export function generateAllRules(): DetectionRule[] {
  const suricataRules = generateSuricataRules(3000);
  const yaraRules = generateYaraRules(1500);
  const sigmaRules = generateSigmaRules(500);
  
  return [...suricataRules, ...yaraRules, ...sigmaRules];
}

export function getRecommendedRules(useCase: string = 'general'): string[] {
  // Return rule IDs that should be enabled for specific use cases
  const presets: Record<string, string[]> = {
    'general': ['Critical'],
    'ecommerce': ['Web', 'Database', 'Exploit'],
    'healthcare': ['Ransomware', 'Data Exfiltration'],
    'financial': ['Credential Theft', 'Data Exfiltration', 'Exploit']
  };
  
  return presets[useCase] || presets['general'];
}

export type { DetectionRule };
