import { User, Shield, LogOut, Lock, Clock, MapPin } from 'lucide-react';
import { useToast } from './Toast';
import './UserProfile.css';

interface UserProfileProps {
  onClose: () => void;
}

export default function UserProfile({ onClose }: UserProfileProps) {
  const { addToast } = useToast();

  const handleLogout = () => {
    addToast('Logging out...', 'info');
    setTimeout(() => {
      // In a real app, this would clear tokens and redirect
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-dropdown" onClick={e => e.stopPropagation()}>
        <div className="profile-header">
          <div className="profile-avatar-large">AD</div>
          <div className="profile-info">
            <h3>Admin User</h3>
            <span className="profile-email">admin@ndr.local</span>
            <span className="profile-role">Administrator</span>
          </div>
        </div>

        <div className="profile-body">
          <div className="profile-section">
            <div className="section-item">
              <User className="w-4 h-4" />
              <span>Edit Profile</span>
            </div>
            <div className="section-item">
              <Lock className="w-4 h-4" />
              <span>Change Password</span>
            </div>
            <div className="section-item">
              <Shield className="w-4 h-4" />
              <span>2FA Settings</span>
            </div>
          </div>

          <div className="profile-divider"></div>

          <div className="profile-section">
            <div className="section-header">Recent Activity</div>
            <div className="activity-item">
              <Clock className="w-3 h-3" />
              <span>Logged in from 192.168.1.5</span>
              <span className="activity-time">Just now</span>
            </div>
            <div className="activity-item">
              <MapPin className="w-3 h-3" />
              <span>New device detected</span>
              <span className="activity-time">2h ago</span>
            </div>
          </div>
        </div>

        <div className="profile-footer">
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
