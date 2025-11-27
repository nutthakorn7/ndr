from .firewall import BlockIPAction, UnblockIPAction
from .notification import EmailNotifyAction, SlackNotifyAction
from .ticketing import CreateTicketAction
from .pcap import PCAPRequestAction

# Action registry
ACTION_REGISTRY = {
    'block_ip': BlockIPAction,
    'unblock_ip': UnblockIPAction,
    'email_notify': EmailNotifyAction,
    'slack_notify': SlackNotifyAction,
    'create_ticket': CreateTicketAction,
    'pcap_request': PCAPRequestAction,
}

def get_action(action_type, dry_run=True):
    """Get action instance by type"""
    action_class = ACTION_REGISTRY.get(action_type)
    if action_class:
        return action_class(dry_run=dry_run)
    return None
