import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Box } from '@mui/material';

/** Blocks child routes until auth hydration completes and user is authenticated. */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const location = useLocation();

  if (isLoading) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          backgroundColor: 'background.default',
        }}
      >
        <img
          src={import.meta.env.VITE_APP_LOGO ?? import.meta.env.BASE_URL + 'memorise.png'}
          alt="Loading"
          style={{ height: 36, opacity: 0.7 }}
        />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
