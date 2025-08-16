import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { OwnerDashboard } from '@/components/dashboard/OwnerDashboard';
import { SubscriberDashboard } from '@/components/dashboard/SubscriberDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';

const Index = () => {
  const { user, profile, loading } = useAuth();

  // Redirect to password change if user hasn't changed password
  if (profile && !profile.is_password_changed) {
    return <Navigate to="/password-change" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/auth" replace />;
  }

  // Render appropriate dashboard based on role
  switch (profile.role) {
    case 'owner':
      return <OwnerDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'subscriber':
    default:
      return <SubscriberDashboard />;
  }
};

export default Index;
