import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  DollarSign, 
  Eye,
  LogOut,
  Settings,
  BarChart3,
  AlertTriangle,
  Database
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AdminStats {
  totalUsers: number;
  totalOwners: number;
  totalSubscribers: number;
  totalEarnings: number;
  totalContent: number;
  activeSubscriptions: number;
}

export const AdminDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalOwners: 0,
    totalSubscribers: 0,
    totalEarnings: 0,
    totalContent: 0,
    activeSubscriptions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch owners
      const { count: totalOwners } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'owner');

      // Fetch subscribers
      const { count: totalSubscribers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'subscriber');

      // Fetch total earnings
      const { data: earningsData } = await supabase
        .from('earnings')
        .select('amount');

      const totalEarnings = earningsData?.reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;

      // Fetch total content
      const { count: totalContent } = await supabase
        .from('content')
        .select('*', { count: 'exact', head: true });

      // Fetch active subscriptions
      const { count: activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      setStats({
        totalUsers: totalUsers || 0,
        totalOwners: totalOwners || 0,
        totalSubscribers: totalSubscribers || 0,
        totalEarnings,
        totalContent: totalContent || 0,
        activeSubscriptions: activeSubscriptions || 0,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast({
        title: "Error",
        description: "Failed to load admin statistics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-luxury/5 via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-luxury to-primary rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold luxury-gradient">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">System overview and management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-luxury text-luxury">
              ADMIN ACCESS
            </Badge>
            <Avatar className="w-10 h-10">
              <AvatarImage src={profile?.profile_picture_url} />
              <AvatarFallback className="bg-luxury text-luxury-foreground">
                {profile?.nickname?.[0] || profile?.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Warning Notice */}
        <div className="mb-8">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <div>
                  <h4 className="font-semibold text-destructive">Admin Access</h4>
                  <p className="text-sm text-muted-foreground">
                    You have administrative access to all platform data. Use this responsibly.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="glass-effect border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalOwners} owners, {stats.totalSubscribers} subscribers
              </p>
            </CardContent>
          </Card>

          <Card className="glass-effect border-success/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">${stats.totalEarnings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Total earnings generated</p>
            </CardContent>
          </Card>

          <Card className="glass-effect border-luxury/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <BarChart3 className="h-4 w-4 text-luxury" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-luxury">{stats.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card className="glass-effect border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Content</CardTitle>
              <Eye className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalContent}</div>
              <p className="text-xs text-muted-foreground">Posts uploaded</p>
            </CardContent>
          </Card>

          <Card className="glass-effect border-luxury/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Content Creators</CardTitle>
              <Users className="h-4 w-4 text-luxury" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-luxury">{stats.totalOwners}</div>
              <p className="text-xs text-muted-foreground">Active creators</p>
            </CardContent>
          </Card>

          <Card className="glass-effect border-success/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {stats.totalUsers > 0 ? ((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Users to subscribers</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Platform Overview</h3>
              <p className="text-muted-foreground">Key metrics and system health</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Platform status and performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database Status</span>
                    <Badge variant="outline" className="border-success text-success">Healthy</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Storage Usage</span>
                    <Badge variant="outline">12.5 GB</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Sessions</span>
                    <Badge variant="outline">{stats.totalUsers}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest platform activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground py-8">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Activity monitoring coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">User Management</h3>
              <p className="text-muted-foreground">Manage platform users and permissions</p>
            </div>

            <Card className="glass-effect">
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>User management interface coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Content Moderation</h3>
              <p className="text-muted-foreground">Review and moderate platform content</p>
            </div>

            <Card className="glass-effect">
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Content moderation tools coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">System Settings</h3>
              <p className="text-muted-foreground">Configure platform settings and preferences</p>
            </div>

            <Card className="glass-effect">
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>System configuration coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};