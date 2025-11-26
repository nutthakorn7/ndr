# On-Prem Sensor Deployment Guide

This guide covers deploying the Zeek + Suricata sensor stack onto physical or virtual hosts using Ansible.

## Requirements
- Hosts running Ubuntu 22.04 or RHEL8+ with root/SSH access
- Docker installed (the Ansible role installs `docker.io` by default)
- Access to the sensor images (`nutthakorn7/zeek-sensor`, `nutthakorn7/suricata-sensor`)
- Sensor-controller URL and enrollment token (optional but recommended)

## Steps
1. Populate `infra/ansible/inventory/hosts.ini` with your sensor hosts.
2. Export any vault secrets or environment variables for controller tokens.
3. Run the playbook:
   ```bash
   cd infra/ansible
   ansible-playbook -i inventory/hosts.ini deploy-sensors.yml
   ```

The role installs Docker, writes `/opt/ndr/config/sensor.env`, and launches the Zeek + Suricata containers with the configured metadata.

## Customization
- Override environment variables by editing `sensor.env.j2` or setting host vars.
- Adjust docker-compose template (`docker-compose.yml.j2`) to run only Zeek or Suricata, or to pin image tags.
- Mount additional volumes (e.g., `/var/log`) by adding to the template.

## TLS & Controller Enrollment
If you’ve configured the sensor-controller cerificate endpoint, set these variables:
- `controller_url`: e.g., `https://controller.example.com`
- `controller_token`: Bearer token (if required)
- `sensor_command_secret`: matches `SENSOR_COMMAND_SECRET` on the controller
- `enrollment_token`: add to `sensor.env.j2` and call `/certificates/request` manually or via bootstrap script (future work: integrate into role).

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
