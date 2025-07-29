"""
Vendor-specific configuration templates for firewall log collection
"""

import json
from typing import Dict, Any, List

# Fortinet FortiGate Templates
FORTINET_TEMPLATES = {
    "syslog_config": {
        "name": "FortiGate Syslog Configuration",
        "description": "Configure FortiGate to send logs via syslog",
        "config_template": """
# FortiGate CLI Configuration for Syslog
config log syslogd setting
    set status enable
    set server "{syslog_server_ip}"
    set port {syslog_port}
    set facility {facility}
    set source-ip {source_ip}
    set format default
end

config log syslogd2 setting
    set status enable
    set server "{backup_syslog_server_ip}"
    set port {syslog_port}
    set facility {facility}
end

# Configure what to log
config log eventfilter
    set event enable
    set system enable
    set vpn enable
    set user enable
    set router enable
    set wireless enable
    set wad enable
    set fortiview enable
    set antivirus enable
    set webfilter enable
    set dnsfilter enable
    set ssh enable
    set voip enable
end

# Configure traffic logging
config log setting
    set resolve-ip enable
    set resolve-port enable
    set log-user-in-upper enable
    set fwpolicy-implicit-log disable
    set log-invalid-packet disable
end
        """,
        "variables": {
            "syslog_server_ip": "192.168.1.100",
            "backup_syslog_server_ip": "192.168.1.101",
            "syslog_port": "514",
            "facility": "local7",
            "source_ip": "192.168.1.1"
        },
        "prerequisites": [
            "Administrative access to FortiGate",
            "Network connectivity to syslog server",
            "Proper firewall rules allowing syslog traffic"
        ],
        "verification_commands": [
            "execute log filter start-line 1",
            "execute log filter end-line 50",
            "execute log display",
            "diagnose test application logd 3"
        ]
    },
    "api_config": {
        "name": "FortiGate API Configuration",
        "description": "Configure FortiGate for API-based log collection",
        "config_template": """
# Enable REST API
config system api-user
    edit "{api_username}"
        set api-key "{api_key}"
        set accprofile "prof_admin"
        set vdom "root"
        set schedule "always"
        config trusthost
            edit 1
                set ipv4-trusthost {trusted_ip}/32
            next
        end
    next
end

# Enable HTTPS admin access
config system global
    set admin-https-ssl-versions tlsv1-2 tlsv1-3
    set admin-port {admin_port}
    set admin-sport {admin_sport}
    set admin-https-redirect enable
end
        """,
        "variables": {
            "api_username": "logcollector",
            "api_key": "generated_api_key_here",
            "trusted_ip": "192.168.1.100",
            "admin_port": "80",
            "admin_sport": "443"
        }
    }
}

# Cisco ASA Templates
CISCO_ASA_TEMPLATES = {
    "syslog_config": {
        "name": "Cisco ASA Syslog Configuration",
        "description": "Configure Cisco ASA to send logs via syslog",
        "config_template": """
! Cisco ASA Syslog Configuration
logging enable
logging timestamp
logging trap informational
logging asdm informational
logging host {interface_name} {syslog_server_ip}
logging facility {facility}
logging queue 512

! Configure logging levels
logging list loglist message 106023
logging list loglist message 106100
logging list loglist message 302013-302020
logging list loglist message 305011
logging list loglist message 313001-313008
logging list loglist message 402117
logging list loglist message 419002
logging list loglist message 502103
logging list loglist message 710001-710006
logging list loglist message 733100

! Send specific logs to syslog server
logging host {interface_name} {syslog_server_ip} format emblem
logging permit-hostdown

! Configure buffer logging
logging buffered informational
logging buffer-size 1048576

! Configure console logging (disable for production)
no logging console
        """,
        "variables": {
            "interface_name": "inside",
            "syslog_server_ip": "192.168.1.100",
            "facility": "16"
        },
        "verification_commands": [
            "show logging",
            "show logging setting",
            "show logging queue"
        ]
    },
    "snmp_config": {
        "name": "Cisco ASA SNMP Configuration",
        "description": "Configure Cisco ASA for SNMP monitoring",
        "config_template": """
! SNMP Configuration
snmp-server enable
snmp-server community {community_string} RO
snmp-server host {interface_name} {snmp_server_ip} community {community_string} version 2c
snmp-server location "{location}"
snmp-server contact "{contact_info}"
snmp-server enable traps snmp authentication linkup linkdown coldstart

! Configure SNMP ACL (optional)
access-list SNMP_ACL extended permit ip host {snmp_server_ip} any
snmp-server community {community_string} RO SNMP_ACL
        """,
        "variables": {
            "community_string": "public",
            "interface_name": "inside",
            "snmp_server_ip": "192.168.1.100",
            "location": "Data Center",
            "contact_info": "admin@company.com"
        }
    }
}

# Palo Alto Networks Templates
PALO_ALTO_TEMPLATES = {
    "syslog_config": {
        "name": "Palo Alto Syslog Configuration",
        "description": "Configure Palo Alto Networks firewall for syslog",
        "config_template": """
# Palo Alto Networks Syslog Configuration (XML format)
<config>
  <shared>
    <log-settings>
      <syslog>
        <entry name="{syslog_profile_name}">
          <server>
            <entry name="primary">
              <server>{syslog_server_ip}</server>
              <port>{syslog_port}</port>
              <transport>UDP</transport>
              <facility>LOG_USER</facility>
            </entry>
          </server>
          <format>BSD</format>
        </entry>
      </syslog>
    </log-settings>
  </shared>
  <devices>
    <entry name="localhost.localdomain">
      <deviceconfig>
        <system>
          <server-profiles>
            <syslog>
              <entry name="{syslog_profile_name}">
                <server>
                  <entry name="primary">
                    <server>{syslog_server_ip}</server>
                    <port>{syslog_port}</port>
                    <transport>UDP</transport>
                    <facility>LOG_USER</facility>
                  </entry>
                </server>
                <format>BSD</format>
              </entry>
            </syslog>
          </server-profiles>
        </system>
      </deviceconfig>
    </entry>
  </devices>
</config>
        """,
        "variables": {
            "syslog_profile_name": "LogCollector",
            "syslog_server_ip": "192.168.1.100",
            "syslog_port": "514"
        },
        "verification_commands": [
            "show log-collector",
            "show system info",
            "test log-forwarding"
        ]
    },
    "api_config": {
        "name": "Palo Alto API Configuration", 
        "description": "Configure API access for log collection",
        "config_template": """
# CLI Commands for API Configuration
configure
set deviceconfig system api-key-lifetime {api_key_lifetime}
set mgt-config users {username} permissions role-based superuser yes
set mgt-config users {username} password
# Enter password when prompted

# Generate API key (after configuration)
# curl -k "https://{firewall_ip}/api/?type=keygen&user={username}&password={password}"
        """,
        "variables": {
            "username": "logcollector",
            "password": "SecurePassword123",
            "api_key_lifetime": "1440",
            "firewall_ip": "192.168.1.1"
        }
    }
}

# SonicWall Templates
SONICWALL_TEMPLATES = {
    "syslog_config": {
        "name": "SonicWall Syslog Configuration",
        "description": "Configure SonicWall for syslog forwarding",
        "config_template": """
# SonicWall CLI Configuration
configure

# Configure syslog servers
log-output syslog server {syslog_server_ip} port {syslog_port} facility {facility}
log-output syslog server {backup_syslog_server} port {syslog_port} facility {facility}

# Enable logging categories
log settings
enable system-logs
enable network-access-logs
enable security-services-logs
enable vpn-logs
enable wireless-logs

# Configure log levels
log-output syslog priority informational

# Enable real-time logging
log settings real-time

commit
        """,
        "variables": {
            "syslog_server_ip": "192.168.1.100",
            "backup_syslog_server": "192.168.1.101",
            "syslog_port": "514",
            "facility": "local7"
        }
    }
}

# pfSense Templates
PFSENSE_TEMPLATES = {
    "syslog_config": {
        "name": "pfSense Syslog Configuration",
        "description": "Configure pfSense for remote syslog",
        "config_template": """
# pfSense Syslog Configuration (PHP Configuration)
# Navigate to Status > System Logs > Settings

# Add remote syslog server configuration
$config['syslog'] = array();
$config['syslog']['remoteserver'] = '{syslog_server_ip}';
$config['syslog']['remoteserver2'] = '{backup_syslog_server}';
$config['syslog']['sourceip'] = '{source_ip}';
$config['syslog']['ipproto'] = 'ipv4';
$config['syslog']['filter'] = 'on';
$config['syslog']['dhcp'] = 'on';
$config['syslog']['portalauth'] = 'on';
$config['syslog']['vpn'] = 'on';
$config['syslog']['dpinger'] = 'on';
$config['syslog']['relayd'] = 'on';
$config['syslog']['hostapd'] = 'on';
$config['syslog']['logall'] = 'on';
$config['syslog']['system'] = 'on';

# Save configuration
write_config("Updated syslog configuration");
        """,
        "variables": {
            "syslog_server_ip": "192.168.1.100",
            "backup_syslog_server": "192.168.1.101",
            "source_ip": "192.168.1.1"
        },
        "verification_commands": [
            "tail -f /var/log/system.log",
            "tail -f /var/log/filter.log",
            "sockstat -4 -p 514"
        ]
    }
}

# Sophos Templates
SOPHOS_TEMPLATES = {
    "syslog_config": {
        "name": "Sophos XG/XGS Syslog Configuration",
        "description": "Configure Sophos XG/XGS firewall for syslog forwarding",
        "config_template": """
# Sophos XG/XGS CLI Configuration
configure

# Configure syslog server
system syslog add server {syslog_server_ip} port {syslog_port} facility {facility} format STANDARD
system syslog add server {backup_syslog_server} port {syslog_port} facility {facility} format STANDARD

# Enable log categories
log-settings 
set firewall enable
set system enable
set antivirus enable
set ips enable
set web-protection enable
set email-protection enable
set wireless enable
set vpn enable
set authentication enable
set network-protection enable
set sandstorm enable

# Configure log levels
log-settings set-level firewall information
log-settings set-level system information
log-settings set-level antivirus information
log-settings set-level ips information

# Apply configuration
apply
        """,
        "variables": {
            "syslog_server_ip": "192.168.1.100",
            "backup_syslog_server": "192.168.1.101",
            "syslog_port": "514",
            "facility": "local7"
        },
        "prerequisites": [
            "Administrative access to Sophos XG/XGS",
            "SSH or Console access enabled",
            "Network connectivity to syslog server"
        ],
        "verification_commands": [
            "system syslog show",
            "log-settings show",
            "system diagnostics show interface"
        ]
    },
    "api_config": {
        "name": "Sophos XG API Configuration",
        "description": "Configure Sophos XG for API-based log collection",
        "config_template": """
# Sophos XG API Configuration
# Web Admin Console > Administration > API

# Enable API
set api enable

# Create API admin user
system admin add name "{api_username}" type API
system admin "{api_username}" set password "{api_password}"
system admin "{api_username}" set profile "Administrator"

# Configure API access restrictions
api access-list add ip {trusted_ip} netmask 255.255.255.255
api https-redirect enable

# Enable required services
webadmin https enable
webadmin https-port {api_port}
        """,
        "variables": {
            "api_username": "logcollector",
            "api_password": "SecurePassword123",
            "trusted_ip": "192.168.1.100",
            "api_port": "4444"
        }
    },
    "snmp_config": {
        "name": "Sophos XG SNMP Configuration", 
        "description": "Configure SNMP for monitoring Sophos XG",
        "config_template": """
# SNMP Configuration
system snmp enable
system snmp community add name "{community_string}" permission READ host {snmp_server_ip}
system snmp location set "{location}"
system snmp contact set "{contact_info}"
system snmp trap enable
system snmp trap host add {snmp_server_ip} community "{community_string}"
        """,
        "variables": {
            "community_string": "public",
            "snmp_server_ip": "192.168.1.100",
            "location": "Data Center",
            "contact_info": "admin@company.com"
        }
    }
}

# WatchGuard Templates
WATCHGUARD_TEMPLATES = {
    "syslog_config": {
        "name": "WatchGuard Firebox Syslog Configuration",
        "description": "Configure WatchGuard Firebox for syslog forwarding",
        "config_template": """
# WatchGuard Policy Manager Configuration
# Log to > Send Log Messages To

# Primary Syslog Server
Host: {syslog_server_ip}
Port: {syslog_port}
Facility: {facility}
Format: Standard
Protocol: UDP

# Secondary Syslog Server  
Host: {backup_syslog_server}
Port: {syslog_port}
Facility: {facility}
Format: Standard
Protocol: UDP

# Enable Logging Categories:
# - Firewall packets (allowed and denied)
# - Authentication events
# - VPN events
# - Intrusion Prevention Service (IPS)
# - Application Control
# - WebBlocker
# - spamBlocker
# - Gateway AntiVirus
# - APT Blocker
# - Threat Detection and Response

# Log Message Settings:
# Timestamp format: RFC 3164
# Include packet data: No
# Include application name: Yes
# Maximum message size: 1024 bytes
        """,
        "variables": {
            "syslog_server_ip": "192.168.1.100",
            "backup_syslog_server": "192.168.1.101", 
            "syslog_port": "514",
            "facility": "16"
        },
        "prerequisites": [
            "WatchGuard Policy Manager access",
            "Firebox configuration permissions",
            "Network connectivity to syslog server"
        ],
        "verification_commands": [
            "# Check in Status Report",
            "# Verify log messages in syslog server",
            "# Test with blocked traffic"
        ]
    },
    "snmp_config": {
        "name": "WatchGuard SNMP Configuration",
        "description": "Configure SNMP monitoring for WatchGuard Firebox",
        "config_template": """
# WatchGuard Policy Manager > Setup > Network > SNMP

# SNMP Settings:
Enable SNMP: Yes
SNMP Version: v2c
Read Community: {community_string}
Write Community: {write_community}
Contact Information: {contact_info}
Location: {location}

# SNMP Trap Configuration:
Enable SNMP Traps: Yes
Trap Community: {trap_community}
Trap Destination: {snmp_server_ip}
Trap Port: 162

# Allowed SNMP Hosts:
Host: {snmp_server_ip}
Netmask: 255.255.255.255
        """,
        "variables": {
            "community_string": "public",
            "write_community": "private",
            "trap_community": "public",
            "snmp_server_ip": "192.168.1.100",
            "location": "Data Center",
            "contact_info": "admin@company.com"
        }
    },
    "api_config": {
        "name": "WatchGuard Management API Configuration",
        "description": "Configure WatchGuard for API access", 
        "config_template": """
# WatchGuard Cloud or Firebox System Manager

# Enable REST API (WatchGuard Cloud):
1. Log into WatchGuard Cloud
2. Go to Configure > API Access
3. Generate API Key
4. Configure IP restrictions: {trusted_ip}

# For local Firebox management:
# System Manager > Setup > Management Interface
Enable HTTPS: Yes
HTTPS Port: {api_port}
Enable API Access: Yes
API Authentication: Token-based

# Create API access account
Username: {api_username}
Password: {api_password}
Role: Administrator (Read-Only for logs)
        """,
        "variables": {
            "api_username": "logcollector",
            "api_password": "SecurePassword123",
            "trusted_ip": "192.168.1.100",
            "api_port": "8080"
        }
    }
}

# Log Parsing Rules for Each Vendor
VENDOR_PARSING_RULES = {
    "fortinet": {
        "authentication_logs": {
            "regex_pattern": r'date=(?P<date>\d{4}-\d{2}-\d{2}) time=(?P<time>\d{2}:\d{2}:\d{2}) devname="(?P<devname>[^"]+)" devid="(?P<devid>[^"]+)" logid="(?P<logid>\d+)" type="(?P<type>\w+)" subtype="(?P<subtype>\w+)" level="(?P<level>\w+)" vd="(?P<vd>[^"]+)" eventtime=(?P<eventtime>\d+) logdesc="(?P<logdesc>[^"]+)" srcip=(?P<srcip>[\d.]+) user="(?P<user>[^"]+)" ui="(?P<ui>[^"]+)" action="(?P<action>\w+)" status="(?P<status>\w+)"',
            "field_mapping": {
                "timestamp": {"field": "date", "format": "%Y-%m-%d %H:%M:%S"},
                "source_ip": {"field": "srcip", "validation": "ipv4"},
                "username": {"field": "user"},
                "action": {"field": "action"},
                "event_type": {"field": "subtype"},
                "log_type": "AUTHENTICATION"
            }
        },
        "traffic_logs": {
            "regex_pattern": r'date=(?P<date>\d{4}-\d{2}-\d{2}) time=(?P<time>\d{2}:\d{2}:\d{2}).*srcip=(?P<srcip>[\d.]+) srcport=(?P<srcport>\d+) dstip=(?P<dstip>[\d.]+) dstport=(?P<dstport>\d+) proto=(?P<proto>\d+) action="(?P<action>\w+)"',
            "field_mapping": {
                "timestamp": {"field": "date", "format": "%Y-%m-%d %H:%M:%S"},
                "source_ip": {"field": "srcip", "validation": "ipv4"},
                "source_port": {"field": "srcport", "type": "integer"},
                "dest_ip": {"field": "dstip", "validation": "ipv4"},
                "dest_port": {"field": "dstport", "type": "integer"},
                "protocol": {"field": "proto"},
                "action": {"field": "action"},
                "log_type": "TRAFFIC"
            }
        }
    },
    "cisco": {
        "authentication_logs": {
            "regex_pattern": r'%ASA-(?P<severity>\d)-(?P<message_id>\d+): (?P<message>.*?) from (?P<srcip>[\d.]+)/(?P<srcport>\d+) to (?P<interface>\w+):(?P<dstip>[\d.]+)/(?P<dstport>\d+)',
            "field_mapping": {
                "severity": {"field": "severity", "values": {"6": "INFO", "5": "LOW", "4": "MEDIUM", "3": "HIGH", "2": "CRITICAL", "1": "CRITICAL", "0": "CRITICAL"}},
                "source_ip": {"field": "srcip", "validation": "ipv4"},
                "dest_ip": {"field": "dstip", "validation": "ipv4"},
                "source_port": {"field": "srcport", "type": "integer"},
                "dest_port": {"field": "dstport", "type": "integer"},
                "log_type": "AUTHENTICATION"
            }
        }
    },
    "paloalto": {
        "traffic_logs": {
            "regex_pattern": r'(?P<timestamp>\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}),(?P<serial>\w+),(?P<type>\w+),(?P<subtype>\w+),(?P<time_generated>[^,]+),(?P<src>[\d.]+),(?P<dst>[\d.]+),(?P<natsrc>[\d.]+),(?P<natdst>[\d.]+),(?P<rule>[^,]+),(?P<srcuser>[^,]*),(?P<dstuser>[^,]*),(?P<app>[^,]+),(?P<vsys>[^,]+),(?P<from>[^,]+),(?P<to>[^,]+),(?P<inbound_if>[^,]+),(?P<outbound_if>[^,]+),(?P<logset>[^,]*),(?P<time_received>[^,]+),(?P<sessionid>\d+),(?P<repeatcnt>\d+),(?P<sport>\d+),(?P<dport>\d+),(?P<natsport>\d+),(?P<natdport>\d+),(?P<flags>[^,]*),(?P<proto>[^,]+),(?P<action>[^,]+)',
            "field_mapping": {
                "timestamp": {"field": "timestamp", "format": "%Y/%m/%d %H:%M:%S"},
                "source_ip": {"field": "src", "validation": "ipv4"},
                "dest_ip": {"field": "dst", "validation": "ipv4"},
                "source_port": {"field": "sport", "type": "integer"},
                "dest_port": {"field": "dport", "type": "integer"},
                "protocol": {"field": "proto"},
                "action": {"field": "action"},
                "application": {"field": "app"},
                "policy_name": {"field": "rule"},
                "log_type": "TRAFFIC"
                         }
         }
     },
     "sophos": {
         "authentication_logs": {
             "regex_pattern": r'(?P<timestamp>\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(?P<device>\S+)\s+device="(?P<device_name>[^"]+)"\s+date=(?P<date>\d{4}-\d{2}-\d{2})\s+time=(?P<time>\d{2}:\d{2}:\d{2})\s+timezone="(?P<timezone>[^"]+)"\s+device_name="(?P<fw_name>[^"]+)"\s+device_id=(?P<device_id>\S+)\s+log_id=(?P<log_id>\d+)\s+log_type="(?P<log_type>[^"]+)"\s+log_component="(?P<component>[^"]+)"\s+log_subtype="(?P<subtype>[^"]+)"\s+status="(?P<status>[^"]+)"\s+priority=(?P<priority>\w+)\s+user_name="(?P<username>[^"]*)"\s+srczonetype="(?P<src_zone>[^"]*)"\s+srczone="(?P<src_zone_name>[^"]*)"\s+dstzonetype="(?P<dst_zone>[^"]*)"\s+dstzone="(?P<dst_zone_name>[^"]*)"\s+src_ip=(?P<src_ip>[\d.]+)\s+dst_ip=(?P<dst_ip>[\d.]+)',
             "field_mapping": {
                 "timestamp": {"field": "timestamp", "format": "%b %d %H:%M:%S"},
                 "source_ip": {"field": "src_ip", "validation": "ipv4"},
                 "dest_ip": {"field": "dst_ip", "validation": "ipv4"},
                 "username": {"field": "username"},
                 "action": {"field": "status", "values": {"Success": "ALLOW", "Failed": "DENY"}},
                 "event_type": {"field": "subtype"},
                 "log_type": "AUTHENTICATION",
                 "severity": {"field": "priority", "values": {"High": "HIGH", "Medium": "MEDIUM", "Low": "LOW"}}
             }
         },
         "traffic_logs": {
             "regex_pattern": r'(?P<timestamp>\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(?P<device>\S+)\s+device="(?P<device_name>[^"]+)"\s+date=(?P<date>\d{4}-\d{2}-\d{2})\s+time=(?P<time>\d{2}:\d{2}:\d{2})\s+timezone="(?P<timezone>[^"]+)"\s+device_name="(?P<fw_name>[^"]+)"\s+device_id=(?P<device_id>\S+)\s+log_id=(?P<log_id>\d+)\s+log_type="(?P<log_type>[^"]+)"\s+log_component="(?P<component>[^"]+)"\s+log_subtype="(?P<subtype>[^"]+)"\s+status="(?P<status>[^"]+)"\s+priority=(?P<priority>\w+)\s+fw_rule_id=(?P<rule_id>\d+)\s+policy_type=(?P<policy_type>\d+)\s+policy_id=(?P<policy_id>\d+)\s+src_ip=(?P<src_ip>[\d.]+)\s+src_port=(?P<src_port>\d+)\s+dst_ip=(?P<dst_ip>[\d.]+)\s+dst_port=(?P<dst_port>\d+)\s+protocol="(?P<protocol>[^"]+)"\s+sent_bytes=(?P<sent_bytes>\d+)\s+recv_bytes=(?P<recv_bytes>\d+)\s+sent_pkts=(?P<sent_pkts>\d+)\s+recv_pkts=(?P<recv_pkts>\d+)',
             "field_mapping": {
                 "timestamp": {"field": "timestamp", "format": "%b %d %H:%M:%S"},
                 "source_ip": {"field": "src_ip", "validation": "ipv4"},
                 "source_port": {"field": "src_port", "type": "integer"},
                 "dest_ip": {"field": "dst_ip", "validation": "ipv4"},
                 "dest_port": {"field": "dst_port", "type": "integer"},
                 "protocol": {"field": "protocol"},
                 "action": {"field": "status", "values": {"Allow": "ALLOW", "Deny": "DENY", "Drop": "DENY"}},
                 "policy_id": {"field": "rule_id"},
                 "bytes_sent": {"field": "sent_bytes", "type": "integer"},
                 "bytes_received": {"field": "recv_bytes", "type": "integer"},
                 "packets_sent": {"field": "sent_pkts", "type": "integer"},
                 "packets_received": {"field": "recv_pkts", "type": "integer"},
                 "log_type": "TRAFFIC"
             }
         },
         "utm_logs": {
             "regex_pattern": r'(?P<timestamp>\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(?P<device>\S+)\s+device="(?P<device_name>[^"]+)"\s+date=(?P<date>\d{4}-\d{2}-\d{2})\s+time=(?P<time>\d{2}:\d{2}:\d{2})\s+timezone="(?P<timezone>[^"]+)"\s+device_name="(?P<fw_name>[^"]+)"\s+device_id=(?P<device_id>\S+)\s+log_id=(?P<log_id>\d+)\s+log_type="(?P<log_type>[^"]+)"\s+log_component="(?P<component>[^"]+)"\s+log_subtype="(?P<subtype>[^"]+)"\s+status="(?P<status>[^"]+)"\s+priority=(?P<priority>\w+)\s+src_ip=(?P<src_ip>[\d.]+)\s+dst_ip=(?P<dst_ip>[\d.]+)\s+url="(?P<url>[^"]*)"\s+threat_name="(?P<threat_name>[^"]*)"\s+threat_type="(?P<threat_type>[^"]*)"',
             "field_mapping": {
                 "timestamp": {"field": "timestamp", "format": "%b %d %H:%M:%S"},
                 "source_ip": {"field": "src_ip", "validation": "ipv4"},
                 "dest_ip": {"field": "dst_ip", "validation": "ipv4"},
                 "url": {"field": "url"},
                 "threat_name": {"field": "threat_name"},
                 "threat_category": {"field": "threat_type"},
                 "action": {"field": "status", "values": {"Blocked": "DENY", "Allowed": "ALLOW"}},
                 "event_type": {"field": "subtype"},
                 "log_type": "UTM"
             }
         }
     },
     "watchguard": {
         "authentication_logs": {
             "regex_pattern": r'(?P<timestamp>\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(?P<device>\S+)\s+(?P<daemon>\w+)\[\d+\]:\s+(?P<msg_id>\d+-\d+)\s+\((?P<policy>[^)]+)\)\s+(?P<action>Allow|Deny)\s+(?P<protocol>\w+)/(?P<interface_in>\w+)->(?P<interface_out>\w+)\s+(?P<src_ip>[\d.]+):(?P<src_port>\d+)\s+(?P<dst_ip>[\d.]+):(?P<dst_port>\d+)\s+msg="(?P<message>[^"]*)"',
             "field_mapping": {
                 "timestamp": {"field": "timestamp", "format": "%b %d %H:%M:%S"},
                 "source_ip": {"field": "src_ip", "validation": "ipv4"},
                 "source_port": {"field": "src_port", "type": "integer"},
                 "dest_ip": {"field": "dst_ip", "validation": "ipv4"},
                 "dest_port": {"field": "dst_port", "type": "integer"},
                 "protocol": {"field": "protocol"},
                 "action": {"field": "action", "values": {"Allow": "ALLOW", "Deny": "DENY"}},
                 "policy_name": {"field": "policy"},
                 "interface_in": {"field": "interface_in"},
                 "interface_out": {"field": "interface_out"},
                 "event_type": {"field": "message"},
                 "log_type": "AUTHENTICATION"
             }
         },
         "traffic_logs": {
             "regex_pattern": r'(?P<timestamp>\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(?P<device>\S+)\s+(?P<daemon>\w+)\[\d+\]:\s+(?P<msg_id>\d+-\d+)\s+\((?P<policy>[^)]+)\)\s+(?P<action>Allow|Deny)\s+(?P<protocol>\w+)/(?P<interface_in>\w+)->(?P<interface_out>\w+)\s+(?P<src_ip>[\d.]+):(?P<src_port>\d+)\s+(?P<dst_ip>[\d.]+):(?P<dst_port>\d+)\s+msg="(?P<message>[^"]*)"(?:\s+Duration=(?P<duration>\d+)s)?(?:\s+sent=(?P<sent_bytes>\d+))?(?:\s+rcvd=(?P<recv_bytes>\d+))?',
             "field_mapping": {
                 "timestamp": {"field": "timestamp", "format": "%b %d %H:%M:%S"},
                 "source_ip": {"field": "src_ip", "validation": "ipv4"},
                 "source_port": {"field": "src_port", "type": "integer"},
                 "dest_ip": {"field": "dst_ip", "validation": "ipv4"},
                 "dest_port": {"field": "dst_port", "type": "integer"},
                 "protocol": {"field": "protocol"},
                 "action": {"field": "action", "values": {"Allow": "ALLOW", "Deny": "DENY"}},
                 "policy_name": {"field": "policy"},
                 "interface_in": {"field": "interface_in"},
                 "interface_out": {"field": "interface_out"},
                 "duration": {"field": "duration", "type": "integer"},
                 "bytes_sent": {"field": "sent_bytes", "type": "integer"},
                 "bytes_received": {"field": "recv_bytes", "type": "integer"},
                 "log_type": "TRAFFIC"
             }
         },
         "utm_logs": {
             "regex_pattern": r'(?P<timestamp>\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(?P<device>\S+)\s+(?P<daemon>\w+)\[\d+\]:\s+(?P<msg_id>\d+-\d+)\s+(?P<component>\w+)\s+(?P<action>Allow|Deny|Block)\s+(?P<src_ip>[\d.]+)\s+(?P<dst_ip>[\d.]+)\s+msg="(?P<message>[^"]*)"(?:\s+threat="(?P<threat>[^"]*)")?(?:\s+url="(?P<url>[^"]*)")?',
             "field_mapping": {
                 "timestamp": {"field": "timestamp", "format": "%b %d %H:%M:%S"},
                 "source_ip": {"field": "src_ip", "validation": "ipv4"},
                 "dest_ip": {"field": "dst_ip", "validation": "ipv4"},
                 "action": {"field": "action", "values": {"Allow": "ALLOW", "Deny": "DENY", "Block": "DENY"}},
                 "threat_name": {"field": "threat"},
                 "url": {"field": "url"},
                 "event_type": {"field": "component"},
                 "log_type": "UTM"
             }
         }
     }
}

# Complete vendor configuration
VENDOR_CONFIGURATIONS = {
    "fortinet": {
        "name": "Fortinet FortiGate",
        "display_name": "Fortinet FortiGate Series",
        "description": "Enterprise firewall and UTM solutions",
        "website": "https://www.fortinet.com",
        "models": {
            "FGT-60E": {
                "model_name": "FGT-60E",
                "model_series": "FortiGate 60 Series",
                "supported_protocols": ["syslog", "snmp", "api", "ssh"],
                "default_ports": {"syslog": 514, "snmp": 161, "api": 443, "ssh": 22},
                "capabilities": ["utm", "ips", "av", "web_filter", "vpn", "wifi"]
            },
            "FGT-100F": {
                "model_name": "FGT-100F", 
                "model_series": "FortiGate 100 Series",
                "supported_protocols": ["syslog", "snmp", "api", "ssh"],
                "default_ports": {"syslog": 514, "snmp": 161, "api": 443, "ssh": 22},
                "capabilities": ["utm", "ips", "av", "web_filter", "vpn", "wifi", "sd_wan"]
            }
        },
        "templates": FORTINET_TEMPLATES,
        "parsing_rules": VENDOR_PARSING_RULES["fortinet"]
    },
    "cisco": {
        "name": "Cisco",
        "display_name": "Cisco Systems",
        "description": "Network security and infrastructure solutions",
        "website": "https://www.cisco.com",
        "models": {
            "ASA-5506": {
                "model_name": "ASA 5506-X",
                "model_series": "ASA 5500 Series",
                "supported_protocols": ["syslog", "snmp", "ssh"],
                "default_ports": {"syslog": 514, "snmp": 161, "ssh": 22},
                "capabilities": ["firewall", "vpn", "ips"]
            },
            "FTD-2110": {
                "model_name": "FTD 2110",
                "model_series": "Firepower 2100 Series",
                "supported_protocols": ["syslog", "snmp", "api", "ssh"],
                "default_ports": {"syslog": 514, "snmp": 161, "api": 443, "ssh": 22},
                "capabilities": ["ngfw", "ips", "malware_protection", "url_filtering"]
            }
        },
        "templates": CISCO_ASA_TEMPLATES,
        "parsing_rules": VENDOR_PARSING_RULES["cisco"]
    },
    "paloalto": {
        "name": "Palo Alto Networks",
        "display_name": "Palo Alto Networks",
        "description": "Next-generation firewall and security platform",
        "website": "https://www.paloaltonetworks.com",
        "models": {
            "PA-220": {
                "model_name": "PA-220",
                "model_series": "PA-200 Series",
                "supported_protocols": ["syslog", "snmp", "api", "ssh"],
                "default_ports": {"syslog": 514, "snmp": 161, "api": 443, "ssh": 22},
                "capabilities": ["ngfw", "app_id", "user_id", "content_id", "wildfire"]
            }
        },
        "templates": PALO_ALTO_TEMPLATES,
        "parsing_rules": VENDOR_PARSING_RULES["paloalto"]
    },
    "sonicwall": {
        "name": "SonicWall",
        "display_name": "SonicWall Inc.",
        "description": "Network security and data protection solutions",
        "website": "https://www.sonicwall.com",
        "models": {
            "TZ470": {
                "model_name": "TZ470",
                "model_series": "TZ Series",
                "supported_protocols": ["syslog", "snmp", "api", "ssh"],
                "default_ports": {"syslog": 514, "snmp": 161, "api": 443, "ssh": 22},
                "capabilities": ["firewall", "ips", "anti_malware", "content_filtering"]
            }
        },
        "templates": SONICWALL_TEMPLATES
    },
    "pfsense": {
        "name": "pfSense",
        "display_name": "pfSense (Netgate)",
        "description": "Open source firewall and router software",
        "website": "https://www.pfsense.org",
        "models": {
            "pfSense": {
                "model_name": "pfSense",
                "model_series": "Community Edition",
                "supported_protocols": ["syslog", "snmp", "ssh"],
                "default_ports": {"syslog": 514, "snmp": 161, "ssh": 22},
                "capabilities": ["firewall", "router", "vpn", "traffic_shaping"]
            }
        },
        "templates": PFSENSE_TEMPLATES
    },
    "sophos": {
        "name": "Sophos",
        "display_name": "Sophos Ltd.",
        "description": "Enterprise cybersecurity and network protection solutions",
        "website": "https://www.sophos.com",
        "models": {
            "XG-106": {
                "model_name": "XG 106",
                "model_series": "XG Series",
                "supported_protocols": ["syslog", "snmp", "api", "ssh"],
                "default_ports": {"syslog": 514, "snmp": 161, "api": 4444, "ssh": 22},
                "capabilities": ["utm", "ips", "antivirus", "web_protection", "email_protection", "sandstorm", "wireless"]
            },
            "XG-125": {
                "model_name": "XG 125",
                "model_series": "XG Series",
                "supported_protocols": ["syslog", "snmp", "api", "ssh"],
                "default_ports": {"syslog": 514, "snmp": 161, "api": 4444, "ssh": 22},
                "capabilities": ["utm", "ips", "antivirus", "web_protection", "email_protection", "sandstorm", "wireless"]
            },
            "XGS-2100": {
                "model_name": "XGS 2100",
                "model_series": "XGS Series",
                "supported_protocols": ["syslog", "snmp", "api", "ssh"],
                "default_ports": {"syslog": 514, "snmp": 161, "api": 4444, "ssh": 22},
                "capabilities": ["utm", "ips", "antivirus", "web_protection", "email_protection", "sandstorm", "wireless", "xstream_ssl_inspection"]
            },
            "XGS-4100": {
                "model_name": "XGS 4100",
                "model_series": "XGS Series",
                "supported_protocols": ["syslog", "snmp", "api", "ssh"],
                "default_ports": {"syslog": 514, "snmp": 161, "api": 4444, "ssh": 22},
                "capabilities": ["utm", "ips", "antivirus", "web_protection", "email_protection", "sandstorm", "wireless", "xstream_ssl_inspection", "sd_wan"]
            }
        },
        "templates": SOPHOS_TEMPLATES,
        "parsing_rules": VENDOR_PARSING_RULES["sophos"]
    },
    "watchguard": {
        "name": "WatchGuard",
        "display_name": "WatchGuard Technologies",
        "description": "Network security and intelligent security services",
        "website": "https://www.watchguard.com",
        "models": {
            "T15": {
                "model_name": "Firebox T15",
                "model_series": "Tabletop Series",
                "supported_protocols": ["syslog", "snmp", "api", "ssh"],
                "default_ports": {"syslog": 514, "snmp": 161, "api": 8080, "ssh": 22},
                "capabilities": ["firewall", "ips", "gateway_antivirus", "webblocker", "spamblocker", "application_control"]
            },
            "T35": {
                "model_name": "Firebox T35",
                "model_series": "Tabletop Series",
                "supported_protocols": ["syslog", "snmp", "api", "ssh"],
                "default_ports": {"syslog": 514, "snmp": 161, "api": 8080, "ssh": 22},
                "capabilities": ["firewall", "ips", "gateway_antivirus", "webblocker", "spamblocker", "application_control", "apt_blocker"]
            },
            "T55": {
                "model_name": "Firebox T55",
                "model_series": "Tabletop Series",
                "supported_protocols": ["syslog", "snmp", "api", "ssh"],
                "default_ports": {"syslog": 514, "snmp": 161, "api": 8080, "ssh": 22},
                "capabilities": ["firewall", "ips", "gateway_antivirus", "webblocker", "spamblocker", "application_control", "apt_blocker", "threat_detection"]
            },
            "M270": {
                "model_name": "Firebox M270",
                "model_series": "Rack Mount Series",
                "supported_protocols": ["syslog", "snmp", "api", "ssh"],
                "default_ports": {"syslog": 514, "snmp": 161, "api": 8080, "ssh": 22},
                "capabilities": ["firewall", "ips", "gateway_antivirus", "webblocker", "spamblocker", "application_control", "apt_blocker", "threat_detection", "tdr"]
            },
            "M470": {
                "model_name": "Firebox M470",
                "model_series": "Rack Mount Series",
                "supported_protocols": ["syslog", "snmp", "api", "ssh"],
                "default_ports": {"syslog": 514, "snmp": 161, "api": 8080, "ssh": 22},
                "capabilities": ["firewall", "ips", "gateway_antivirus", "webblocker", "spamblocker", "application_control", "apt_blocker", "threat_detection", "tdr", "high_availability"]
            }
        },
        "templates": WATCHGUARD_TEMPLATES,
        "parsing_rules": VENDOR_PARSING_RULES["watchguard"]
    }
}

def get_vendor_config(vendor_name: str) -> Dict[str, Any]:
    """Get configuration for a specific vendor"""
    return VENDOR_CONFIGURATIONS.get(vendor_name.lower(), {})

def get_all_vendors() -> List[str]:
    """Get list of all supported vendors"""
    return list(VENDOR_CONFIGURATIONS.keys())

def get_vendor_models(vendor_name: str) -> Dict[str, Any]:
    """Get models for a specific vendor"""
    vendor_config = get_vendor_config(vendor_name)
    return vendor_config.get('models', {})

def get_vendor_templates(vendor_name: str) -> Dict[str, Any]:
    """Get configuration templates for a vendor"""
    vendor_config = get_vendor_config(vendor_name)
    return vendor_config.get('templates', {})

def get_parsing_rules(vendor_name: str) -> Dict[str, Any]:
    """Get log parsing rules for a vendor"""
    vendor_config = get_vendor_config(vendor_name)
    return vendor_config.get('parsing_rules', {}) 