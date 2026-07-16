import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { portalAuthService } from '../services/portalAuth';

interface AuthGuardProps {
  children: React.ReactNode;
}

const PortalAuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(portalAuthService.isAuthenticated());

  useEffect(() => {
    // Check authentication on mount and interval to support rolling session
    const interval = setInterval(() => {
      setIsAuthenticated(portalAuthService.isAuthenticated());
    }, 60000); // check every minute

    return () => clearInterval(interval);
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />;
  }

  return <>{children}</>;
};

export default PortalAuthGuard;
