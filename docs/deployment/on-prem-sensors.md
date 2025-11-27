# On-Prem Sensor Deployment Guide

This guide covers deploying the Zeek + Suricata sensor stack onto physical or virtual hosts using Ansible.

## Requirements
- Hosts running Ubuntu 22.04 or RHEL8+ with root/SSH access
- Docker installed (the Ansible role installs `docker.io` by default)
- Access to the sensor images (`nutthakorn7/zeek-sensor`, `nutthakorn7/suricata-sensor`)
- Sensor-controller URL and enrollment token (optional but recommended)

## Steps
1. Populate `infra/ansible/inventory/hosts.ini` with your sensor hosts and controller variables (example below).
2. Export any vault secrets or environment variables for controller tokens.
3. Run the playbook:
   ```bash
   cd infra/ansible
   ansible-playbook -i inventory/hosts.ini deploy-sensors.yml
   ```

The role installs Docker, writes `/opt/ndr/config/sensor.env`, registers the sensor with the controller (when `controller_url` is provided), fetches controller config to `/opt/ndr/config/controller-config.json`, and launches the Zeek + Suricata containers.

Example host vars:

```ini
[sensors]
sensor-edge-01 controller_url=https://controller.ndr.local controller_api_token=TOKEN123 sensor_location="DC1"
```

## Customization
- Override environment variables by editing `sensor.env.j2` or setting host vars.
- Adjust docker-compose template (`docker-compose.yml.j2`) to run only Zeek or Suricata, or to pin image tags.
- Mount additional volumes (e.g., `/var/log`) by adding to the template.

## Controller Registration & TLS
- `controller_url` – base URL of sensor-controller; enables auto-registration + config fetch.
- `controller_api_token` – optional Bearer token for controller API calls.
- `sensor_metadata`, `sensor_location`, `sensor_name` – customize what gets sent to `/sensors/register`.
- `sensor_register_with_controller` / `sensor_fetch_controller_config` – toggle behaviour per host if needed.
- `sensor_command_secret` – stored in `sensor.env` so the agent can verify signed PCAP commands.

Certificate enrollment remains manual for now; once a token/CSR flow is available you can extend the role to call `/certificates/request`.

## Manual Verification
After deployment:
1. Check Docker containers: `docker ps`
2. Confirm logs in Kafka topics (`zeek-logs`, `suricata-logs`).
3. Verify PCAP ring directories (`/opt/ndr/pcap`).
4. View sensor status in sensor-controller (`GET /sensors`).

## TODO (Future)
- Integrate TLS enrollment script into the Ansible role.
- Provide systemd units for running sensor-agent outside Docker.
- Add diagnostics/log collection playbooks.
