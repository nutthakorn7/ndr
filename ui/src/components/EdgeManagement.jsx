import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Divider,
  Stack
} from '@mui/material';
import { 
  Cloud as CloudIcon,
  CloudOff as CloudOffIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const EdgeManagement = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAgents = async (manual = false) => {
    if (manual) setRefreshing(true);
    
    try {
      const response = await fetch('/api/edge/agents');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setAgents(data.agents || []);
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchAgents(true);
  };

  const handleAgentClick = (agent) => {
    setSelectedAgent(agent);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedAgent(null);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'online': return 'success';
      case 'offline': return 'error';
      case 'degraded': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'online': return <CloudIcon fontSize="small" />;
      case 'offline': return <CloudOffIcon fontSize="small" />;
      default: return <WarningIcon fontSize="small" />;
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = Math.floor((now - date) / 1000); // seconds
      
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return date.toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  const calculateBufferUsage = (agent) => {
    const maxSize = 1024 * 1024 * 1024; // 1GB default
    const currentSize = agent.last_metrics?.buffer_size_bytes || 0;
    return (currentSize / maxSize) * 100;
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />  
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          Loading edge agents...
        </Typography>
      </Box>
    );
  }

  const totalAgents = agents.length;
  const onlineAgents = agents.filter(a => a.status === 'online').length;
  const totalBuffered = agents.reduce((sum, a) => sum + (a.last_metrics?.buffered_events || 0), 0);
  const avgBufferUsage = totalAgents > 0 
    ? agents.reduce((sum, a) => sum + calculateBufferUsage(a), 0) / totalAgents 
    : 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Edge Agent Management
          </Typography>
          {lastUpdate && (
            <Typography variant="caption" color="textSecondary">
              Last updated: {formatTimestamp(lastUpdate)}
            </Typography>
          )}
        </Box>
        <Tooltip title="Refresh">
          <IconButton 
            onClick={handleRefresh} 
            disabled={refreshing}
            color="primary"
            size="large"
          >
            <RefreshIcon className={refreshing ? 'rotating' : ''} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          <strong>Error loading edge agents:</strong> {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Total Agents
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {totalAgents}
                  </Typography>
                </Box>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText'
                }}>
                  <StorageIcon fontSize="large" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Online
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="success.main">
                    {onlineAgents}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {totalAgents > 0 ? Math.round((onlineAgents/totalAgents)*100) : 0}% uptime
                  </Typography>
                </Box>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  bgcolor: 'success.light',
                  color: 'success.contrastText'
                }}>
                  <CloudIcon fontSize="large" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Offline
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="error.main">
                    {totalAgents - onlineAgents}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Require attention
                  </Typography>
                </Box>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  bgcolor: 'error.light',
                  color: 'error.contrastText'
                }}>
                  <CloudOffIcon fontSize="large" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Buffered Events
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {totalBuffered.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Avg: {Math.round(avgBufferUsage)}% capacity
                  </Typography>
                </Box>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  bgcolor: 'warning.light',
                  color: 'warning.contrastText'
                }}>
                  <SpeedIcon fontSize="large" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Agents Table */}
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Registered Edge Agents
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Agent ID</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell align="right">Buffered Events</TableCell>
                  <TableCell>Last Heartbeat</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {agents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <StorageIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="textSecondary">
                        No edge agents registered
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Deploy an edge agent to start monitoring remote sites
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  agents.map((agent) => (
                    <TableRow 
                      key={agent.agent_id} 
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleAgentClick(agent)}
                    >
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" fontWeight="medium">
                          {agent.agent_id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {agent.location || 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          icon={getStatusIcon(agent.status)}
                          label={agent.status || 'Unknown'} 
                          color={getStatusColor(agent.status)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {agent.version || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box>
                          <Typography 
                            variant="body2" 
                            fontWeight="medium"
                            color={agent.last_metrics?.buffered_events > 0 ? 'warning.main' : 'textSecondary'}
                          >
                            {agent.last_metrics?.buffered_events?.toLocaleString() || 0}
                          </Typography>
                          {agent.last_metrics?.buffered_events > 100 && (
                            <LinearProgress 
                              variant="determinate" 
                              value={calculateBufferUsage(agent)} 
                              color="warning"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {formatTimestamp(agent.last_heartbeat)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleAgentClick(agent); }}>
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Agent Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        {selectedAgent && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={2}>
                <StorageIcon />
                <Box>
                  <Typography variant="h6">{selectedAgent.agent_id}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {selectedAgent.location}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={3}>
                {/* Status Section */}
                <Box>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Status
                  </Typography>
                  <Chip 
                    icon={getStatusIcon(selectedAgent.status)}
                    label={selectedAgent.status} 
                    color={getStatusColor(selectedAgent.status)}
                    size="medium"
                  />
                </Box>

                {/* Metrics Section */}
                <Box>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Metrics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="caption" color="textSecondary">
                          Buffered Events
                        </Typography>
                        <Typography variant="h6">
                          {selectedAgent.last_metrics?.buffered_events?.toLocaleString() || 0}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="caption" color="textSecondary">
                          Buffer Size
                        </Typography>
                        <Typography variant="h6">
                          {formatBytes(selectedAgent.last_metrics?.buffer_size_bytes)}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>

                {/* System Info */}
                <Box>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    System Information
                  </Typography>
                  <Stack spacing={1}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Version:</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {selectedAgent.version || 'N/A'}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Last Heartbeat:</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {formatTimestamp(selectedAgent.last_heartbeat)}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Registered:</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {formatTimestamp(selectedAgent.created_at)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetails}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* CSS for rotation animation */}
      <style>
        {`
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .rotating {
            animation: rotate 1s linear infinite;
          }
        `}
      </style>
    </Box>
  );
};

export default EdgeManagement;
