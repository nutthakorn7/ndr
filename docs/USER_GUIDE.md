# 📘 Open NDR User Guide

Welcome to the Open NDR platform! This guide will help you navigate the dashboard, monitor threats, and manage security incidents effectively.

---

## 📋 Table of Contents
1. [Dashboard Overview](#dashboard-overview)
2. [Real-Time Monitoring](#real-time-monitoring)
3. [Network Topology](#network-topology)
4. [Alert Investigation](#alert-investigation)
5. [Incident Response](#incident-response)

---

## 1. Dashboard Overview <a name="dashboard-overview"></a>

The **SOC Wallboard** is your command center. It provides a high-level view of your network's security posture.

### Key Metrics
- **Total Events**: The volume of traffic and logs processed in the last 24 hours.
- **Critical Alerts**: The number of high-severity threats requiring immediate attention.
- **Open Alerts**: Total active alerts that haven't been resolved.
- **Active Assets**: The number of devices currently detected on the network.

### Navigation
Use the sidebar to switch between different views:
- **SOC Wallboard**: Main overview.
- **Network Map**: Interactive topology visualization.
- **Incident Response**: Kanban board for managing cases.
- **Settings**: Configure sensors and preferences.

---

## 2. Real-Time Monitoring <a name="real-time-monitoring"></a>

The **Real-Time Feed** on the dashboard streams security events as they happen.

### Features
- **Live Stream**: Watch events scroll in real-time.
- **Pause/Resume**: Click the **Pause** (⏸️) button to stop the feed and inspect an event without it scrolling away.
- **Filtering**: Use the **Filter** button to show only specific severities (e.g., Critical only).
- **Details**: Click on any row to open the **Event Detail Modal**.

---

## 3. Network Topology <a name="network-topology"></a>

Access this view by clicking **Network Map** in the sidebar. This interactive graph visualizes your network infrastructure.

### Interacting with the Map
- **Zoom/Pan**: Scroll to zoom, click and drag to move around.
- **Node Details**: Click on any node (circle) to view its details in the side panel.
  - **IP Address**
  - **MAC Address**
  - **OS & Ports**
  - **Status** (Safe, Suspicious, Compromised)
- **Legend**:
  - 🟢 **Green**: Safe Device
  - 🟠 **Orange**: Suspicious Activity Detected
  - 🔴 **Red**: Compromised / Under Attack

---

## 4. Alert Investigation <a name="alert-investigation"></a>

When you identify a threat in the Real-Time Feed:

1. **Click the Event**: Opens the detail modal.
2. **Review Context**:
   - **Source/Destination**: Who is talking to whom?
   - **MITRE Tactic**: What stage of the attack chain is this?
   - **Payload**: Inspect the raw data (if available).
3. **Take Action**:
   - **Create Incident**: Click the **Create Incident** button to escalate this alert into a formal investigation case. This will automatically switch you to the Incident Response view.

---

## 5. Incident Response <a name="incident-response"></a>

Access this view by clicking **Incident Response** in the sidebar. This is a Kanban-style board for managing investigations.

### The Board
Incidents are organized by status:
- **New**: Freshly created incidents.
- **Investigating**: Active cases being worked on.
- **Resolved**: Closed cases.
- **False Positive**: Alerts deemed non-threatening.

### Managing an Incident
Click on an incident card to open the **Incident Detail View**:
1. **Change Status**: Move the incident through its lifecycle using the status dropdown.
2. **Assignee**: See who is working on the case.
3. **Timeline**: View the history of the incident, including when it was created and status changes.
4. **Collaboration**:
   - Type a note in the comment box.
   - Click **Send** to add it to the timeline.
   - Use this to share findings with your team.

---

## 🆘 Need Help?
If you encounter issues or need technical support, please refer to the [Installation Guide](MANAGEMENT_SERVER_INSTALL.md) or contact your system administrator.
