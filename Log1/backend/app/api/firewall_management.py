from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging
import asyncio

from ..database import get_db
from ..models.firewall_devices import (
    FirewallVendor, FirewallModel, FirewallDevice, 
    LogParsingRule, FirewallLog, DeviceLogCollectionJob,
    VendorConfigTemplate
)
from ..collectors.universal_log_parser import LogParsingEngine
from ..collectors.connection_manager import (
    MultiVendorConnectionManager, ConnectionConfig
)
from ..data.vendor_templates import (
    get_vendor_config, get_all_vendors, get_vendor_models,
    get_vendor_templates, get_parsing_rules, VENDOR_CONFIGURATIONS
)
from .auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/firewall", tags=["Firewall Management"])

# Global connection manager instance
connection_manager = MultiVendorConnectionManager()

@router.get("/vendors", response_model=List[Dict[str, Any]])
async def list_vendors(db: Session = Depends(get_db)):
    """Get list of all supported firewall vendors"""
    try:
        vendors = []
        for vendor_name in get_all_vendors():
            vendor_config = get_vendor_config(vendor_name)
            vendors.append({
                "name": vendor_name,
                "display_name": vendor_config.get("display_name", vendor_name),
                "description": vendor_config.get("description", ""),
                "website": vendor_config.get("website", ""),
                "models_count": len(vendor_config.get("models", {})),
                "supported_protocols": list(set().union(*[
                    model.get("supported_protocols", []) 
                    for model in vendor_config.get("models", {}).values()
                ]))
            })
        
        return vendors
        
    except Exception as e:
        logger.error(f"Error listing vendors: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve vendors")

@router.get("/vendors/{vendor_name}/models", response_model=List[Dict[str, Any]])
async def list_vendor_models(
    vendor_name: str,
    db: Session = Depends(get_db)
):
    """Get models for a specific vendor"""
    try:
        models = get_vendor_models(vendor_name)
        if not models:
            raise HTTPException(status_code=404, detail=f"Vendor '{vendor_name}' not found")
        
        model_list = []
        for model_key, model_info in models.items():
            model_list.append({
                "key": model_key,
                "model_name": model_info.get("model_name"),
                "model_series": model_info.get("model_series"),
                "supported_protocols": model_info.get("supported_protocols", []),
                "default_ports": model_info.get("default_ports", {}),
                "capabilities": model_info.get("capabilities", [])
            })
        
        return model_list
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing models for vendor {vendor_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve models")

@router.get("/vendors/{vendor_name}/templates", response_model=Dict[str, Any])
async def get_vendor_configuration_templates(
    vendor_name: str,
    template_type: Optional[str] = Query(None, description="Filter by template type"),
    db: Session = Depends(get_db)
):
    """Get configuration templates for a vendor"""
    try:
        templates = get_vendor_templates(vendor_name)
        if not templates:
            raise HTTPException(status_code=404, detail=f"No templates found for vendor '{vendor_name}'")
        
        if template_type:
            filtered_templates = {k: v for k, v in templates.items() if k == template_type}
            if not filtered_templates:
                raise HTTPException(status_code=404, detail=f"Template type '{template_type}' not found")
            templates = filtered_templates
        
        return {
            "vendor": vendor_name,
            "templates": templates
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting templates for vendor {vendor_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve templates")

@router.post("/devices", response_model=Dict[str, Any])
async def register_firewall_device(
    device_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Register a new firewall device"""
    try:
        # Validate required fields
        required_fields = ["device_name", "hostname", "ip_address", "vendor", "model"]
        for field in required_fields:
            if field not in device_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Get or create vendor
        vendor = db.query(FirewallVendor).filter(
            FirewallVendor.name == device_data["vendor"].lower()
        ).first()
        
        if not vendor:
            # Create vendor from template data
            vendor_config = get_vendor_config(device_data["vendor"])
            if not vendor_config:
                raise HTTPException(status_code=400, detail=f"Unsupported vendor: {device_data['vendor']}")
            
            vendor = FirewallVendor(
                name=device_data["vendor"].lower(),
                display_name=vendor_config.get("display_name", device_data["vendor"]),
                description=vendor_config.get("description", ""),
                website=vendor_config.get("website", "")
            )
            db.add(vendor)
            db.flush()
        
        # Get or create model
        model = db.query(FirewallModel).filter(
            FirewallModel.vendor_id == vendor.id,
            FirewallModel.model_name == device_data["model"]
        ).first()
        
        if not model:
            # Create model from template data
            vendor_config = get_vendor_config(device_data["vendor"])
            model_info = vendor_config.get("models", {}).get(device_data["model"])
            if not model_info:
                raise HTTPException(status_code=400, detail=f"Unsupported model: {device_data['model']}")
            
            model = FirewallModel(
                vendor_id=vendor.id,
                model_name=model_info["model_name"],
                model_series=model_info.get("model_series", ""),
                supported_protocols=model_info.get("supported_protocols", []),
                default_ports=model_info.get("default_ports", {}),
                capabilities=model_info.get("capabilities", [])
            )
            db.add(model)
            db.flush()
        
        # Create device
        device = FirewallDevice(
            model_id=model.id,
            device_name=device_data["device_name"],
            hostname=device_data["hostname"],
            ip_address=device_data["ip_address"],
            management_ip=device_data.get("management_ip"),
            location=device_data.get("location", ""),
            department=device_data.get("department", ""),
            environment=device_data.get("environment", "PRODUCTION"),
            serial_number=device_data.get("serial_number", ""),
            firmware_version=device_data.get("firmware_version", ""),
            connection_config=device_data.get("connection_config", {}),
            log_settings=device_data.get("log_settings", {}),
            tags=device_data.get("tags", []),
            notes=device_data.get("notes", "")
        )
        
        db.add(device)
        db.commit()
        
        # Create parsing rules for this model if they don't exist
        await create_default_parsing_rules(db, model.id, device_data["vendor"])
        
        logger.info(f"Registered new firewall device: {device.device_name}")
        
        return {
            "success": True,
            "device_id": device.id,
            "message": f"Device '{device.device_name}' registered successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering device: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to register device")

async def create_default_parsing_rules(db: Session, model_id: str, vendor_name: str):
    """Create default parsing rules for a model"""
    try:
        # Check if rules already exist
        existing_rules = db.query(LogParsingRule).filter(
            LogParsingRule.model_id == model_id
        ).first()
        
        if existing_rules:
            return
        
        # Get parsing rules from templates
        parsing_rules = get_parsing_rules(vendor_name)
        
        for rule_type, rule_config in parsing_rules.items():
            parsing_rule = LogParsingRule(
                model_id=model_id,
                rule_name=f"{vendor_name.title()} {rule_type.replace('_', ' ').title()}",
                log_type=rule_config["field_mapping"].get("log_type", "GENERAL"),
                log_format="SYSLOG",
                regex_pattern=rule_config["regex_pattern"],
                field_mapping=rule_config["field_mapping"],
                sample_log="",
                standard_fields=rule_config["field_mapping"],
                priority=100
            )
            db.add(parsing_rule)
        
        db.commit()
        logger.info(f"Created default parsing rules for model {model_id}")
        
    except Exception as e:
        logger.error(f"Error creating parsing rules: {e}")

@router.get("/devices", response_model=List[Dict[str, Any]])
async def list_firewall_devices(
    vendor: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """List registered firewall devices"""
    try:
        query = db.query(FirewallDevice).join(FirewallModel).join(FirewallVendor)
        
        if vendor:
            query = query.filter(FirewallVendor.name == vendor.lower())
        if environment:
            query = query.filter(FirewallDevice.environment == environment)
        if is_active is not None:
            query = query.filter(FirewallDevice.is_active == is_active)
        
        devices = query.all()
        
        device_list = []
        for device in devices:
            device_list.append({
                "id": device.id,
                "device_name": device.device_name,
                "hostname": device.hostname,
                "ip_address": device.ip_address,
                "vendor": device.model.vendor.display_name,
                "model": device.model.model_name,
                "environment": device.environment,
                "location": device.location,
                "is_active": device.is_active,
                "is_online": device.is_online,
                "health_status": device.health_status,
                "last_seen": device.last_seen.isoformat() if device.last_seen else None,
                "last_log_received": device.last_log_received.isoformat() if device.last_log_received else None,
                "connection_protocols": device.model.supported_protocols,
                "tags": device.tags
            })
        
        return device_list
        
    except Exception as e:
        logger.error(f"Error listing devices: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve devices")

@router.post("/devices/{device_id}/connect")
async def connect_to_device(
    device_id: str,
    connection_config: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Connect to a firewall device for log collection"""
    try:
        device = db.query(FirewallDevice).filter(FirewallDevice.id == device_id).first()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Use provided config or device's stored config
        conn_config = connection_config or device.connection_config
        if not conn_config:
            raise HTTPException(status_code=400, detail="No connection configuration provided")
        
        # Create connection configuration
        config = ConnectionConfig(
            host=device.ip_address,
            port=conn_config.get("port", 514),
            protocol=conn_config.get("protocol", "SYSLOG"),
            auth_method=conn_config.get("auth_method", "NONE"),
            credentials=conn_config.get("credentials", {}),
            ssl_enabled=conn_config.get("ssl_enabled", False),
            timeout=conn_config.get("timeout", 30),
            additional_params={"vendor": device.model.vendor.name}
        )
        
        # Register and connect
        connection_manager.register_device(device_id, config)
        success = await connection_manager.connect_device(device_id)
        
        if success:
            # Update device status
            device.is_online = True
            device.last_seen = datetime.utcnow()
            device.health_status = "HEALTHY"
            db.commit()
            
            return {
                "success": True,
                "message": f"Successfully connected to {device.device_name}",
                "protocol": config.protocol
            }
        else:
            device.health_status = "OFFLINE"
            db.commit()
            raise HTTPException(status_code=500, detail="Failed to connect to device")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error connecting to device {device_id}: {e}")
        raise HTTPException(status_code=500, detail="Connection failed")

@router.post("/devices/{device_id}/disconnect")
async def disconnect_from_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Disconnect from a firewall device"""
    try:
        device = db.query(FirewallDevice).filter(FirewallDevice.id == device_id).first()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        await connection_manager.disconnect_device(device_id)
        
        # Update device status
        device.is_online = False
        device.health_status = "OFFLINE"
        db.commit()
        
        return {
            "success": True,
            "message": f"Disconnected from {device.device_name}"
        }
        
    except Exception as e:
        logger.error(f"Error disconnecting from device {device_id}: {e}")
        raise HTTPException(status_code=500, detail="Disconnection failed")

@router.post("/devices/{device_id}/test-connection")
async def test_device_connection(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Test connection to a firewall device"""
    try:
        device = db.query(FirewallDevice).filter(FirewallDevice.id == device_id).first()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        success, message = await connection_manager.test_device_connection(device_id)
        
        # Update device status based on test result
        device.health_status = "HEALTHY" if success else "OFFLINE"
        device.is_online = success
        if success:
            device.last_seen = datetime.utcnow()
        db.commit()
        
        return {
            "success": success,
            "message": message,
            "device_name": device.device_name,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error testing connection to device {device_id}: {e}")
        raise HTTPException(status_code=500, detail="Connection test failed")

@router.post("/devices/{device_id}/collect-logs")
async def start_log_collection(
    device_id: str,
    background_tasks: BackgroundTasks,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Start log collection from a device"""
    try:
        device = db.query(FirewallDevice).filter(FirewallDevice.id == device_id).first()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Create collection job
        job = DeviceLogCollectionJob(
            device_id=device_id,
            collection_type="MANUAL",
            start_time=datetime.utcnow(),
            status="PENDING",
            log_start_time=start_time,
            log_end_time=end_time
        )
        db.add(job)
        db.commit()
        
        # Start collection in background
        background_tasks.add_task(
            collect_device_logs_background,
            device_id,
            job.id,
            start_time,
            end_time
        )
        
        return {
            "success": True,
            "job_id": job.id,
            "message": f"Log collection started for {device.device_name}",
            "device_name": device.device_name
        }
        
    except Exception as e:
        logger.error(f"Error starting log collection for device {device_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to start log collection")

async def collect_device_logs_background(
    device_id: str,
    job_id: str,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None
):
    """Background task for collecting logs"""
    db = next(get_db())
    try:
        # Update job status
        job = db.query(DeviceLogCollectionJob).filter(
            DeviceLogCollectionJob.id == job_id
        ).first()
        job.status = "RUNNING"
        db.commit()
        
        # Initialize parsing engine
        parsing_engine = LogParsingEngine(db)
        
        # Collect logs
        collected_count = 0
        parsed_count = 0
        failed_count = 0
        
        async for log_entry, source_device_id in connection_manager.collect_logs_from_device(
            device_id, start_time, end_time
        ):
            try:
                # Parse log
                parsed_data = parsing_engine.universal_parser.parse_log(log_entry, device_id)
                if parsed_data:
                    # Save parsed log
                    parsing_engine.save_parsed_logs([parsed_data])
                    parsed_count += 1
                else:
                    failed_count += 1
                
                collected_count += 1
                
                # Update job progress periodically
                if collected_count % 100 == 0:
                    job.logs_collected = collected_count
                    job.logs_parsed = parsed_count
                    job.logs_failed = failed_count
                    db.commit()
                    
            except Exception as e:
                logger.error(f"Error processing log: {e}")
                failed_count += 1
        
        # Update final job status
        job.end_time = datetime.utcnow()
        job.status = "SUCCESS"
        job.logs_collected = collected_count
        job.logs_parsed = parsed_count
        job.logs_failed = failed_count
        db.commit()
        
        # Update device last collection time
        device = db.query(FirewallDevice).filter(FirewallDevice.id == device_id).first()
        device.last_log_received = datetime.utcnow()
        db.commit()
        
        logger.info(f"Log collection completed for device {device_id}: {collected_count} collected, {parsed_count} parsed")
        
    except Exception as e:
        logger.error(f"Error in background log collection: {e}")
        
        # Update job with error
        job = db.query(DeviceLogCollectionJob).filter(
            DeviceLogCollectionJob.id == job_id
        ).first()
        job.end_time = datetime.utcnow()
        job.status = "FAILED"
        job.error_message = str(e)
        db.commit()
    finally:
        db.close()

@router.get("/devices/{device_id}/logs")
async def get_device_logs(
    device_id: str,
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    log_type: Optional[str] = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0),
    db: Session = Depends(get_db)
):
    """Get logs from a specific device"""
    try:
        query = db.query(FirewallLog).filter(FirewallLog.device_id == device_id)
        
        if start_time:
            query = query.filter(FirewallLog.received_timestamp >= start_time)
        if end_time:
            query = query.filter(FirewallLog.received_timestamp <= end_time)
        if log_type:
            query = query.filter(FirewallLog.log_type == log_type)
        
        total_count = query.count()
        logs = query.order_by(FirewallLog.received_timestamp.desc()).offset(offset).limit(limit).all()
        
        log_list = []
        for log in logs:
            log_list.append({
                "id": log.id,
                "timestamp": log.received_timestamp.isoformat(),
                "log_type": log.log_type,
                "event_type": log.event_type,
                "severity": log.severity,
                "source_ip": log.source_ip,
                "dest_ip": log.dest_ip,
                "action": log.action,
                "username": log.username,
                "application": log.application,
                "raw_log": log.raw_log[:200] + "..." if len(log.raw_log) > 200 else log.raw_log,
                "confidence_score": log.confidence_score
            })
        
        return {
            "total_count": total_count,
            "logs": log_list,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "has_more": total_count > offset + limit
            }
        }
        
    except Exception as e:
        logger.error(f"Error retrieving logs for device {device_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve logs")

@router.get("/connection-status")
async def get_connection_status(db: Session = Depends(get_db)):
    """Get connection status for all devices"""
    try:
        status = connection_manager.get_connection_status()
        
        # Enhance with database information
        enhanced_status = {}
        for device_id, conn_status in status.items():
            device = db.query(FirewallDevice).filter(FirewallDevice.id == device_id).first()
            if device:
                enhanced_status[device_id] = {
                    **conn_status,
                    "device_name": device.device_name,
                    "vendor": device.model.vendor.display_name,
                    "model": device.model.model_name,
                    "health_status": device.health_status,
                    "last_seen": device.last_seen.isoformat() if device.last_seen else None
                }
        
        return enhanced_status
        
    except Exception as e:
        logger.error(f"Error getting connection status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get connection status") 