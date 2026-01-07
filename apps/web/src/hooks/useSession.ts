import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/feedback/ToastProvider';
import { useNavigate } from 'react-router-dom';

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_TIME = 1 * 60 * 1000; // 1 minute before expiry

export const useSession = () => {
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(SESSION_TIMEOUT);
  
  const { warning } = useToast();
  const navigate = useNavigate();

  // Update last activity on user interaction
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
  }, []);

  // Logout function
  const logout = useCallback((reason: 'timeout' | 'manual' | 'inactivity' = 'manual') => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('token_version');
    
    if (reason === 'timeout') {
      warning('Session expired', 'Your session has expired due to inactivity');
      navigate('/login?session=expired');
    } else if (reason === 'inactivity') {
      warning('Logged out', 'You have been logged out due to prolonged inactivity');
      navigate('/login');
    } else {
      navigate('/login?logout=true');
    }
  }, [navigate, warning]);

  // Check for multiple sessions
  const checkMultipleSessions = useCallback(() => {
    const currentTokenVersion = localStorage.getItem('token_version');
    // In a real app, you would check against server here
    // For MVP, we'll just validate format
    if (currentTokenVersion && isNaN(parseInt(currentTokenVersion))) {
      warning('Security alert', 'Invalid session detected. Please log in again.');
      logout('manual');
    }
  }, [logout, warning]);

  // Session timer effect
  useEffect(() => {
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => updateActivity();
    
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });
    
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [updateActivity]);

  // Session timeout effect
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      const timeLeft = SESSION_TIMEOUT - timeSinceLastActivity;
      
      setTimeRemaining(timeLeft);
      
      // Show warning 1 minute before expiry
      if (timeLeft > 0 && timeLeft <= WARNING_TIME && !showWarning) {
        setShowWarning(true);
        warning('Session about to expire', 'Your session will expire in 1 minute due to inactivity. Click anywhere to stay logged in.');
      }
      
      // Logout when timeout reached
      if (timeLeft <= 0) {
        clearInterval(interval);
        logout('timeout');
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [lastActivity, logout, showWarning, warning]);

  // Check for token version changes (simulated for MVP)
  useEffect(() => {
    const checkInterval = setInterval(() => {
      checkMultipleSessions();
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(checkInterval);
  }, [checkMultipleSessions]);

  // Format time remaining
  const formatTimeRemaining = () => {
    if (timeRemaining <= 0) return 'Expired';
    
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    updateActivity,
    logout,
    showWarning,
    timeRemaining,
    formatTimeRemaining,
    checkMultipleSessions,
  };
};