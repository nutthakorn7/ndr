from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid

from .base import Base

class FirewallVendor(Base):
    """Vendor information for different firewall brands"""
    __tablename__ = "firewall_vendors"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, unique=True)  # Fortinet, Cisco, Palo Alto, pfSense, SonicWall
    display_name = Column(String(100), nullable=False)
    description = Column(Text)
    website = Column(String(255))
    support_contact = Column(String(255))
    documentation_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    models = relationship("FirewallModel", back_populates="vendor", cascade="all, delete-orphan")

class FirewallModel(Base):
    """Specific firewall models for each vendor"""
    __tablename__ = "firewall_models"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    vendor_id = Column(String(36), ForeignKey('firewall_vendors.id'), nullable=False)
    model_name = Column(String(100), nullable=False)  # FGT-60E, ASA-5506, PA-220, pfSense
    model_series = Column(String(50))  # FortiGate 60 Series, ASA 5500 Series
    os_version_min = Column(String(50))  # Minimum supported OS version
    os_version_max = Column(String(50))  # Maximum supported OS version
    supported_protocols = Column(JSON)  # ["syslog", "snmp", "api", "ssh"]
    default_ports = Column(JSON)  # {"syslog": 514, "snmp": 161, "api": 443}
    capabilities = Column(JSON)  # ["utm", "ips", "av", "web_filter", "vpn"]
    throughput_specs = Column(JSON)  # Performance specifications
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    vendor = relationship("FirewallVendor", back_populates="models")
    devices = relationship("FirewallDevice", back_populates="model")
    parsing_rules = relationship("LogParsingRule", back_populates="model")

class FirewallDevice(Base):
    """Individual firewall devices in the network"""
    __tablename__ = "firewall_devices"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_id = Column(String(36), ForeignKey('firewall_models.id'), nullable=False)
    device_name = Column(String(255), nullable=False)
    hostname = Column(String(255), nullable=False)
    ip_address = Column(String(45), nullable=False)  # Support IPv6
    management_ip = Column(String(45))  # Separate management interface
    location = Column(String(255))  # Physical location or site
    department = Column(String(100))  # Responsible department
    environment = Column(String(50))  # PRODUCTION, STAGING, DEV
    serial_number = Column(String(100))
    firmware_version = Column(String(50))
    
    # Connection Configuration
    connection_config = Column(JSON)  # {
    #   "syslog": {"enabled": true, "port": 514, "facility": "local7"},
    #   "snmp": {"enabled": true, "community": "public", "version": "v2c"},
    #   "api": {"enabled": false, "token": "", "ssl_verify": true},
    #   "ssh": {"enabled": true, "username": "", "key_file": ""}
    # }
    
    # Log Collection Settings
    log_settings = Column(JSON)  # {
    #   "collect_auth": true,
    #   "collect_traffic": true,
    #   "collect_utm": true,
    #   "collect_vpn": true,
    #   "retention_days": 90,
    #   "real_time": true
    # }
    
    # Device Status
    is_active = Column(Boolean, default=True)
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime(timezone=True))
    last_log_received = Column(DateTime(timezone=True))
    health_status = Column(String(50), default='UNKNOWN')  # HEALTHY, WARNING, CRITICAL, OFFLINE
    
    # Metadata
    tags = Column(JSON)  # Custom tags for grouping/filtering
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    model = relationship("FirewallModel", back_populates="devices")
    logs = relationship("FirewallLog", back_populates="device")
    collection_jobs = relationship("DeviceLogCollectionJob", back_populates="device")

class LogParsingRule(Base):
    """Parsing rules for different firewall models and log types"""
    __tablename__ = "log_parsing_rules"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_id = Column(String(36), ForeignKey('firewall_models.id'), nullable=False)
    rule_name = Column(String(100), nullable=False)
    log_type = Column(String(50), nullable=False)  # AUTHENTICATION, TRAFFIC, UTM, VPN, SYSTEM
    
    # Parsing Configuration
    log_format = Column(String(50))  # SYSLOG, CEF, LEEF, JSON, CSV
    regex_pattern = Column(Text)  # Regex for extracting fields
    field_mapping = Column(JSON)  # Map extracted groups to standard fields
    sample_log = Column(Text)  # Example log for testing
    
    # Field Definitions
    standard_fields = Column(JSON)  # {
    #   "timestamp": {"field": "group1", "format": "%Y-%m-%d %H:%M:%S"},
    #   "source_ip": {"field": "group2", "validation": "ipv4"},
    #   "dest_ip": {"field": "group3", "validation": "ipv4"},
    #   "action": {"field": "group4", "values": ["ALLOW", "DENY"]},
    #   "protocol": {"field": "group5", "validation": "protocol"}
    # }
    
    # Rule Metadata
    priority = Column(Integer, default=100)  # Lower = higher priority
    is_active = Column(Boolean, default=True)
    success_rate = Column(Integer, default=0)  # Percentage of successful parsing
    last_tested = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    model = relationship("FirewallModel", back_populates="parsing_rules")

class FirewallLog(Base):
    """Standardized firewall logs from all vendors"""
    __tablename__ = "firewall_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String(36), ForeignKey('firewall_devices.id'), nullable=False)
    parsing_rule_id = Column(String(36), ForeignKey('log_parsing_rules.id'))
    
    # Raw Log Data
    raw_log = Column(Text, nullable=False)
    original_timestamp = Column(DateTime(timezone=True))
    received_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Standardized Fields
    log_type = Column(String(50))  # AUTHENTICATION, TRAFFIC, UTM, VPN, SYSTEM
    event_type = Column(String(100))  # LOGIN_SUCCESS, CONNECTION_ALLOW, VIRUS_DETECTED
    severity = Column(String(20))  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    
    # Network Information
    source_ip = Column(String(45))
    source_port = Column(Integer)
    dest_ip = Column(String(45))
    dest_port = Column(Integer)
    protocol = Column(String(20))  # TCP, UDP, ICMP
    
    # Security Information
    action = Column(String(50))  # ALLOW, DENY, DROP, REJECT
    threat_name = Column(String(255))  # For UTM events
    threat_category = Column(String(100))
    risk_level = Column(String(20))
    
    # User Information
    username = Column(String(255))
    user_group = Column(String(100))
    auth_method = Column(String(50))
    
    # Application Information
    application = Column(String(100))
    application_category = Column(String(100))
    url = Column(String(1000))
    
    # Traffic Information
    bytes_sent = Column(Integer)
    bytes_received = Column(Integer)
    packets_sent = Column(Integer)
    packets_received = Column(Integer)
    duration = Column(Integer)  # Connection duration in seconds
    
    # VPN Information
    vpn_tunnel = Column(String(100))
    vpn_user = Column(String(255))
    vpn_realm = Column(String(100))
    
    # Policy Information
    policy_id = Column(String(50))
    policy_name = Column(String(255))
    interface_in = Column(String(50))
    interface_out = Column(String(50))
    
    # Additional Data
    additional_fields = Column(JSON)  # Vendor-specific fields
    geolocation = Column(JSON)  # {"country": "TH", "city": "Bangkok"}
    
    # Processing Information
    is_processed = Column(Boolean, default=False)
    processing_errors = Column(JSON)
    confidence_score = Column(Integer, default=100)  # Parsing confidence
    
    # Relationships
    device = relationship("FirewallDevice", back_populates="logs")
    parsing_rule = relationship("LogParsingRule")

class DeviceLogCollectionJob(Base):
    """Track log collection jobs for each device"""
    __tablename__ = "device_log_collection_jobs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String(36), ForeignKey('firewall_devices.id'), nullable=False)
    collection_type = Column(String(50), nullable=False)  # REAL_TIME, SCHEDULED, MANUAL
    
    # Job Information
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True))
    status = Column(String(50), nullable=False)  # PENDING, RUNNING, SUCCESS, FAILED, PARTIAL
    
    # Collection Statistics
    logs_collected = Column(Integer, default=0)
    logs_parsed = Column(Integer, default=0)
    logs_failed = Column(Integer, default=0)
    bytes_collected = Column(Integer, default=0)
    
    # Error Information
    error_message = Column(String(1000))
    error_details = Column(JSON)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Time Range
    log_start_time = Column(DateTime(timezone=True))
    log_end_time = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    device = relationship("FirewallDevice", back_populates="collection_jobs")

class VendorConfigTemplate(Base):
    """Configuration templates for different vendors"""
    __tablename__ = "vendor_config_templates"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    vendor_name = Column(String(100), nullable=False)
    template_name = Column(String(100), nullable=False)
    template_type = Column(String(50), nullable=False)  # SYSLOG, SNMP, API_CONFIG
    
    # Template Content
    config_template = Column(Text, nullable=False)  # Configuration commands/settings
    description = Column(Text)
    prerequisites = Column(JSON)  # Required settings or permissions
    variables = Column(JSON)  # Template variables to be replaced
    
    # Instructions
    setup_instructions = Column(Text)
    verification_commands = Column(JSON)  # Commands to verify configuration
    troubleshooting_tips = Column(Text)
    
    # Metadata
    version = Column(String(20), default="1.0")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now()) 