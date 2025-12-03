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

// AI Chat Response
export const AiChatResponseSchema = z.object({
  response: z.string(),
  context: z.any().optional(),
}).passthrough();
