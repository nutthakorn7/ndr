import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

class BaseAction(ABC):
    """Base class for all SOAR actions"""
    
    def __init__(self, dry_run=True):
        self.dry_run = dry_run
        
    @abstractmethod
    async def execute(self, params, context):
        """Execute the action with given parameters and context"""
        pass
        
    def resolve_param(self, param_value, context):
        """Resolve parameter values from context (e.g., alert.source.ip)"""
        if not isinstance(param_value, str):
            return param_value
            
        if param_value.startswith('alert.'):
            # Extract value from alert context
            path = param_value.split('.')[1:]  # Remove 'alert' prefix
            value = context.get('alert', {})
            for key in path:
                if isinstance(value, dict):
                    value = value.get(key, '')
                else:
                    return param_value
            return value
        return param_value
        
    def resolve_params(self, params, context):
        """Resolve all parameters in the params dict"""
        resolved = {}
        for key, value in params.items():
            resolved[key] = self.resolve_param(value, context)
        return resolved
