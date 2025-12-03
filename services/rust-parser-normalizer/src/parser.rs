use chrono::Utc;
use regex::Regex;
use serde_json::{json, Value};
use std::collections::HashMap;

pub struct LogParser {
    syslog_regex: Regex,
    apache_regex: Regex,
    nginx_regex: Regex,
    windows_regex: Regex,
    netflow_regex: Regex,
}

impl LogParser {
    pub fn new() -> Self {
        // Grok patterns translated to Regex
        // SYSLOG: %{SYSLOGTIMESTAMP:timestamp} %{IPORHOST:host} %{PROG:program}(?:\[%{POSINT:pid}\])?: %{GREEDYDATA:message}
        let syslog_regex = Regex::new(r"^(?P<timestamp>\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(?P<host>[\w\.\-]+)\s+(?P<program>[\w\.\-]+)(?:\[(?P<pid>\d+)\])?:\s+(?P<message>.*)$").expect("Invalid syslog regex");

        // APACHE: %{COMBINEDAPACHELOG} (Simplified)
        let apache_regex = Regex::new(r"^(?P<clientip>[\d\.]+)\s+\-\s+\-\s+\[(?P<timestamp>[^\]]+)\]\s+.(?P<verb>\w+)\s+(?P<request>[^\s]+)\s+HTTP/(?P<httpversion>[\d\.]+).\s+(?P<response>\d+)\s+(?P<bytes>\d+)\s+.(?P<referrer>[^.]*).\s+.(?P<agent>[^.]*).$").expect("Invalid apache regex");

        // NGINX (Similar to Apache usually, simplified)
        let nginx_regex = Regex::new(r"^(?P<clientip>[\d\.]+)\s+\-\s+\-\s+\[(?P<timestamp>[^\]]+)\]\s+.(?P<verb>\w+)\s+(?P<request>[^\s]+)\s+HTTP/(?P<httpversion>[\d\.]+).\s+(?P<response>\d+)\s+(?P<bytes>\d+)\s+.(?P<referrer>[^.]*).\s+.(?P<agent>[^.]*).$").expect("Invalid nginx regex");

        // WINDOWS: %{TIMESTAMP_ISO8601:timestamp} %{WORD:level} %{NUMBER:event_id} %{GREEDYDATA:message}
        let windows_regex = Regex::new(r"^(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\s+(?P<level>\w+)\s+(?P<event_id>\d+)\s+(?P<message>.*)$").expect("Invalid windows regex");

        // NETFLOW: %{IP:src_ip} %{IP:dst_ip} %{INT:src_port} %{INT:dst_port} %{WORD:protocol} %{INT:bytes}
        let netflow_regex = Regex::new(r"^(?P<src_ip>[\d\.]+)\s+(?P<dst_ip>[\d\.]+)\s+(?P<src_port>\d+)\s+(?P<dst_port>\d+)\s+(?P<protocol>\w+)\s+(?P<bytes>\d+)$").expect("Invalid netflow regex");

        Self {
            syslog_regex,
            apache_regex,
            nginx_regex,
            windows_regex,
            netflow_regex,
        }
    }

    pub fn parse(&self, mut raw_log: Value) -> Value {
        // Check for Zeek or Suricata first
        if self.is_zeek_log(&raw_log) {
            return self.parse_zeek(raw_log);
        }
        if self.is_suricata_log(&raw_log) {
            return self.parse_suricata(raw_log);
        }

        // Try to parse raw_log string
        if let Some(log_line) = raw_log.get("raw_log").and_then(|v| v.as_str()) {
            let mut parsed_fields = HashMap::new();
            let mut log_type = "unknown";

            if let Some(caps) = self.syslog_regex.captures(log_line) {
                log_type = "syslog";
                for name in self.syslog_regex.capture_names().flatten() {
                    if let Some(m) = caps.name(name) {
                        parsed_fields.insert(name.to_string(), json!(m.as_str()));
                    }
                }
            } else if let Some(caps) = self.apache_regex.captures(log_line) {
                log_type = "apache";
                for name in self.apache_regex.capture_names().flatten() {
                    if let Some(m) = caps.name(name) {
                        parsed_fields.insert(name.to_string(), json!(m.as_str()));
                    }
                }
            } else if let Some(caps) = self.windows_regex.captures(log_line) {
                log_type = "windows-event";
                for name in self.windows_regex.capture_names().flatten() {
                    if let Some(m) = caps.name(name) {
                        parsed_fields.insert(name.to_string(), json!(m.as_str()));
                    }
                }
            } else if let Some(caps) = self.netflow_regex.captures(log_line) {
                log_type = "netflow";
                for name in self.netflow_regex.capture_names().flatten() {
                    if let Some(m) = caps.name(name) {
                        parsed_fields.insert(name.to_string(), json!(m.as_str()));
                    }
                }
            }

            if log_type != "unknown" {
                if let Some(obj) = raw_log.as_object_mut() {
                    obj.insert("log_type".to_string(), json!(log_type));
                    for (k, v) in parsed_fields {
                        obj.insert(k, v);
                    }
                }
            }
        }

        // Add parsed timestamp
        if let Some(obj) = raw_log.as_object_mut() {
            obj.insert(
                "parsed_timestamp".to_string(),
                json!(Utc::now().to_rfc3339()),
            );
        }

        raw_log
    }

    fn is_zeek_log(&self, log: &Value) -> bool {
        log.get("zeek_log_type").is_some()
            || log.get("_path").is_some()
            || log.get("id.orig_h").is_some()
            || log.get("source_service").and_then(|s| s.as_str()) == Some("zeek")
    }

    fn parse_zeek(&self, mut log: Value) -> Value {
        let log_type = log
            .get("zeek_log_type")
            .or_else(|| log.get("_path"))
            .and_then(|v| v.as_str())
            .unwrap_or("zeek")
            .to_string();

        if let Some(obj) = log.as_object_mut() {
            obj.insert("log_type".to_string(), json!("zeek"));
            obj.insert("zeek_log_type".to_string(), json!(log_type));
            // Timestamp extraction logic could go here, but normalizer handles it too
        }
        log
    }

    fn is_suricata_log(&self, log: &Value) -> bool {
        log.get("source_service").and_then(|s| s.as_str()) == Some("suricata")
            || log.get("event_type").is_some()
            || log.get("alert").is_some()
    }

    fn parse_suricata(&self, mut log: Value) -> Value {
        let event_type = log
            .get("event_type")
            .and_then(|v| v.as_str())
            .unwrap_or("alert")
            .to_string();

        if let Some(obj) = log.as_object_mut() {
            obj.insert("log_type".to_string(), json!("suricata"));
            obj.insert("suricata_event_type".to_string(), json!(event_type));
        }
        log
    }
}
