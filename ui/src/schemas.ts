import { z } from 'zod';

// --- Dashboard Analytics ---
export const DashboardAnalyticsSchema = z.object({
  summary: z.object({
    total_events: z.number(),
    open_alerts: z.number(),
    critical_alerts: z.number(),
    assets_count: z.number(),
  }),
  trends: z.object({
    events_over_time: z.array(z.any()), // Refine if possible
  }),
  top_sources: z.array(z.any()), // Refine if possible
});

export type DashboardAnalytics = z.infer<typeof DashboardAnalyticsSchema>;

// --- Alerts ---
export const AlertSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
  status: z.string(),
  timestamp: z.string(),
  description: z.string(),
});

export type Alert = z.infer<typeof AlertSchema>;

// --- Threat Events ---
export const ThreatEventSchema = z.object({
  id: z.number(),
  timestamp: z.string(),
  type: z.string(),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
  source: z.string(),
  destination: z.string(),
  protocol: z.string().optional(),
  description: z.string(),
  details: z.any().optional(),
});

export type ThreatEvent = z.infer<typeof ThreatEventSchema>;

export const SearchEventsResponseSchema = z.object({
  events: z.array(ThreatEventSchema),
  total: z.number(),
});

// --- Sensors ---
// Based on rust-controller/src/main.rs Sensor struct
export const SensorSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  tenant_id: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  last_heartbeat: z.string().nullable().optional(), // DateTime<Utc> serialized as string
  last_metrics: z.any().nullable().optional(),
  config: z.any().nullable().optional(),
  metadata: z.any().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type Sensor = z.infer<typeof SensorSchema>;

// --- Assets ---
export const AssetSchema = z.object({
  id: z.string().optional(),
  ip_address: z.string(),
  mac_address: z.string().nullable().optional(),
  hostname: z.string().nullable().optional(),
  os_type: z.string().nullable().optional(),
  os_version: z.string().nullable().optional(),
  device_type: z.string().nullable().optional(),
  criticality: z.string().nullable().optional(),
  first_seen: z.string().nullable().optional(),
  last_seen: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  metadata: z.any().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type Asset = z.infer<typeof AssetSchema>;

// --- Detection Rules ---
export const DetectionRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  pattern: z.string(),
  severity: z.string(),
  enabled: z.boolean(),
  created_at: z.string(),
});

export type DetectionRule = z.infer<typeof DetectionRuleSchema>;

export const SuricataRuleSchema = z.any(); // Placeholder for now
export type SuricataRule = any;

// --- Playbooks ---
export const ActionTypeSchema = z.enum(['Webhook', 'Log', 'BlockIP']);

export const ActionConfigSchema = z.object({
  action_type: ActionTypeSchema,
  params: z.any(),
});

export const TriggerSchema = z.union([
  z.object({ Severity: z.string() }),
  z.object({ Category: z.string() }),
]);

export const PlaybookSchema = z.object({
  name: z.string(),
  trigger: TriggerSchema,
  actions: z.array(ActionConfigSchema),
});

export type Playbook = z.infer<typeof PlaybookSchema>;

// --- Users & Auth ---
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// --- Saved Searches ---
export const SavedSearchSchema = z.object({
  id: z.string(),
  name: z.string(),
  query: z.record(z.string(), z.unknown()),
  created_at: z.string(),
});

export type SavedSearch = z.infer<typeof SavedSearchSchema>;

// --- PCAP ---
export const PcapFileSchema = z.object({
  name: z.string(),
  size: z.number(),
  created_at: z.string(),
});

export type PcapFile = z.infer<typeof PcapFileSchema>;

// --- SOAR Executions ---
export const PlaybookExecutionSchema = z.object({
  id: z.string(),
  playbook_id: z.string(),
  status: z.string(),
  started_at: z.string(),
  completed_at: z.string().nullable().optional(),
  result: z.any(),
});

export type PlaybookExecution = z.infer<typeof PlaybookExecutionSchema>;

// --- Stats Schemas ---
export const AlertStatsSchema = z.object({
  total: z.number(),
  by_severity: z.record(z.string(), z.number()),
  by_status: z.record(z.string(), z.number()),
}).passthrough();

export type AlertStats = z.infer<typeof AlertStatsSchema>;

export const ThreatStatsSchema = z.object({
  total_iocs: z.number(),
  active_campaigns: z.number(),
  threat_actors: z.number(),
}).passthrough();

export type ThreatStats = z.infer<typeof ThreatStatsSchema>;

export const DNSStatsSchema = z.object({
  total_queries: z.number(),
  suspicious_domains: z.number(),
  top_domains: z.array(z.any()),
}).passthrough();

export type DNSStats = z.infer<typeof DNSStatsSchema>;

export const SSLStatsSchema = z.object({
  total_certificates: z.number(),
  expiring_soon: z.number(),
  weak_ciphers: z.number(),
}).passthrough();

export type SSLStats = z.infer<typeof SSLStatsSchema>;

export const FileStatsSchema = z.object({
  total_files: z.number(),
  malicious: z.number(),
  suspicious: z.number(),
}).passthrough();

export type FileStats = z.infer<typeof FileStatsSchema>;

export const SocMetricsSchema = z.object({
  mttr: z.number(), // Mean Time To Resolve
  mttd: z.number(), // Mean Time To Detect
  open_incidents: z.number(),
}).passthrough();

export type SocMetrics = z.infer<typeof SocMetricsSchema>;

// --- Analytics Stats ---

// Traffic Stats (inferred)
export const TrafficStatSchema = z.object({
  timestamp: z.string(),
  bytes_in: z.number().optional(),
  bytes_out: z.number().optional(),
  // Add other fields as needed based on backend response
}).passthrough(); // Allow extra fields for now

// Protocol Stats (inferred)
export const ProtocolStatSchema = z.object({
  protocol: z.string(),
  count: z.number(),
  bytes: z.number().optional(),
}).passthrough();

// Top Talkers (inferred)
export const TopTalkerSchema = z.object({
  ip: z.string(),
  bytes: z.number(),
  packets: z.number().optional(),
}).passthrough();

export type TrafficStat = z.infer<typeof TrafficStatSchema>;
export type ProtocolStat = z.infer<typeof ProtocolStatSchema>;
export type TopTalker = z.infer<typeof TopTalkerSchema>;

// --- Additional Stats ---
export const AssetStatsSchema = z.object({
  total_assets: z.number(),
  active_assets: z.number(),
  vulnerable_assets: z.number(),
  by_type: z.record(z.string(), z.number()),
  by_os: z.record(z.string(), z.number()),
}).passthrough();

export type AssetStats = z.infer<typeof AssetStatsSchema>;

export const DetectionStatsSchema = z.object({
  total_detections: z.number(),
  false_positives: z.number(),
  true_positives: z.number(),
  by_rule: z.record(z.string(), z.number()),
}).passthrough();

export type DetectionStats = z.infer<typeof DetectionStatsSchema>;

export const CertificateSchema = z.object({
  fingerprint: z.string(),
  subject: z.string(),
  issuer: z.string(),
  valid_from: z.string(),
  valid_to: z.string(),
  serial_number: z.string().optional(),
  signature_algorithm: z.string().optional(),
}).passthrough();

export type Certificate = z.infer<typeof CertificateSchema>;

// AI Chat Response
export const AiChatResponseSchema = z.object({
  response: z.string(),
  context: z.any().optional(),
}).passthrough();
