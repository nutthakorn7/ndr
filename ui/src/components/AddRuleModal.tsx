import { useState } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import './AddRuleModal.css';

export default function AddRuleModal({ isOpen, onClose, onSave }) {
  const [ruleData, setRuleData] = useState({
    name: '',
    description: '',
    severity: 'medium',
    condition: '',
    action: 'alert',
    enabled: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(ruleData);
    // Reset form
    setRuleData({
      name: '',
      description: '',
      severity: 'medium',
      condition: '',
      action: 'alert',
      enabled: true,
    });
    onClose();
  };

  const handleChange = (field, value) => {
    setRuleData({ ...ruleData, [field]: value });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-rule-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>Add Detection Rule</h2>
          <button className="modal-close" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Rule Name */}
            <div className="form-group">
              <label htmlFor="rule-name">Rule Name *</label>
              <input
                id="rule-name"
                type="text"
                required
                placeholder="e.g., Suspicious SSH Login Attempt"
                value={ruleData.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="rule-description">Description</label>
              <textarea
                id="rule-description"
                rows="3"
                placeholder="Describe what this rule detects..."
                value={ruleData.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </div>

            {/* Severity */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="rule-severity">Severity *</label>
                <select
                  id="rule-severity"
                  value={ruleData.severity}
                  onChange={(e) => handleChange('severity', e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Action */}
              <div className="form-group">
                <label htmlFor="rule-action">Action *</label>
                <select
                  id="rule-action"
                  value={ruleData.action}
                  onChange={(e) => handleChange('action', e.target.value)}
                >
                  <option value="alert">Alert</option>
                  <option value="block">Block</option>
                  <option value="log">Log Only</option>
                </select>
              </div>
            </div>

            {/* Condition */}
            <div className="form-group">
              <label htmlFor="rule-condition">Detection Condition *</label>
              <textarea
                id="rule-condition"
                rows="4"
                required
                placeholder="e.g., event.type == 'ssh_login' AND failed_attempts > 3"
                value={ruleData.condition}
                onChange={(e) => handleChange('condition', e.target.value)}
                className="code-input"
              />
              <small className="form-hint">
                <AlertTriangle className="w-3 h-3" />
                Use logical operators: AND, OR, ==, !=, &gt;, &lt;
              </small>
            </div>

            {/* Enabled Toggle */}
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={ruleData.enabled}
                  onChange={(e) => handleChange('enabled', e.target.checked)}
                />
                <span>Enable this rule immediately</span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              Save Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
