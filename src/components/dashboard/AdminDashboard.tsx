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
  Database,
  Download
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
import { ContentPlayer } from '@/components/content/ContentPlayer';
import { SubscriptionSettings } from '@/components/admin/SubscriptionSettings';
import ddLogo from '@/assets/dirty-desire-abstract.png';

interface AdminStats {
  totalUsers: number;
  totalOwners: number;
  totalSubscribers: number;
  totalEarnings: number;
  totalContent: number;
  activeSubscriptions: number;
}

interface Content {
  id: string;
  title: string;
  description: string;
  content_type: 'video' | 'audio' | 'image' | 'document';
  file_url: string;
  thumbnail_url?: string;
  is_preview: boolean;
  duration?: number;
  likes_count: number;
  created_at: string;
  owner_id: string;
  profiles: {
    nickname?: string;
    profile_picture_url?: string;
  };
}

interface Withdrawal {
  id: string;
  owner_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles: {
    nickname?: string;
    email: string;
  };
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
  const [allContent, setAllContent] = useState<Content[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
    fetchAllContent();
    fetchWithdrawals();
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

  const fetchAllContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select(`
          *,
          profiles (
            nickname,
            profile_picture_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllContent(data as Content[] || []);
    } catch (error) {
      console.error('Error fetching content:', error);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          profiles (
            nickname,
            email
          )
        `)
        .order('created-at', { ascending: false });

      if (error) {
        console.error('Error fetching withdrawals:', error);
        return;
      }
      
      setWithdrawals(data as Withdrawal[] || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', withdrawalId);

      if (error) throw error;

      toast({ title: "Withdrawal approved successfully!" });
      fetchWithdrawals();
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      toast({
        title: "Error",
        description: "Failed to approve withdrawal",
        variant: "destructive"
      });
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', withdrawalId);

      if (error) throw error;

      toast({ title: "Withdrawal rejected!" });
      fetchWithdrawals();
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast({
        title: "Error",
        description: "Failed to reject withdrawal",
        variant: "destructive"
      });
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50 relative overflow-hidden">
      {/* Subtle background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-rose-100/20 via-purple-100/20 to-pink-100/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-200/10 via-transparent to-transparent" />
      </div>

      {/* Header */}
      <header className="border-b border-rose-200 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70 relative z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center">
              <img
                src={ddLogo}
                alt="Dirty Desire Logo"
                className="w-10 h-10 object-contain drop-shadow-md"
              />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent tracking-wider">
                Admin Dashboard
              </h1>
              <p className="text-sm text-rose-600/70">System overview and management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-rose-600/50 text-rose-600 bg-rose-100">
              ADMIN ACCESS
            </Badge>
            <Avatar className="w-10 h-10 border border-rose-200">
              <AvatarImage src={profile?.profile_picture_url} />
              <AvatarFallback className="bg-gradient-to-r from-rose-600 to-purple-600 text-white">
                {profile?.nickname?.[0] || profile?.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-100"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Warning Notice */}
        <div className="mb-8">
          <Card className="border-rose-200 bg-rose-50/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <div>
                  <h4 className="font-semibold text-rose-700">Admin Access</h4>
                  <p className="text-sm text-rose-600/80">
                    You have administrative access to all platform data. Use this responsibly.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[
            { 
              title: "Total Users", 
              value: stats.totalUsers, 
              icon: Users, 
              color: "from-rose-600 to-rose-700",
              subtitle: `${stats.totalOwners} owners, ${stats.totalSubscribers} subscribers`
            },
            { 
              title: "Platform Revenue", 
              value: `₦${stats.totalEarnings.toLocaleString()}`, 
              icon: DollarSign, 
              color: "from-purple-600 to-purple-700",
              subtitle: "Total earnings generated"
            },
            { 
              title: "Active Subscriptions", 
              value: stats.activeSubscriptions, 
              icon: BarChart3, 
              color: "from-rose-600 to-purple-600",
              subtitle: "Currently active"
            },
            { 
              title: "Total Content", 
              value: stats.totalContent, 
              icon: Eye, 
              color: "from-rose-600 to-rose-700",
              subtitle: "Posts uploaded"
            },
            { 
              title: "Content Creators", 
              value: stats.totalOwners, 
              icon: Users, 
              color: "from-purple-600 to-purple-700",
              subtitle: "Active creators"
            },
            { 
              title: "Conversion Rate", 
              value: `${stats.totalUsers > 0 ? ((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1) : 0}%`, 
              icon: BarChart3, 
              color: "from-rose-600 to-purple-600",
              subtitle: "Users to subscribers"
            }
          ].map((stat, index) => (
            <Card key={index} className="bg-white/80 backdrop-blur-sm border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {stat.subtitle}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/80 p-1 rounded-lg border border-rose-100 backdrop-blur-sm">
            {[
              { value: "overview", label: "Overview", icon: BarChart3 },
              { value: "users", label: "Users", icon: Users },
              { value: "content", label: "Content", icon: Database },
              { value: "withdrawals", label: "Withdrawals", icon: Download },
              { value: "settings", label: "Settings", icon: Settings }
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-md transition-all duration-300 text-gray-600 hover:text-rose-600 flex items-center gap-2"
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold mb-2 text-gray-800">Platform Overview</h3>
              <p className="text-gray-600">Key metrics and system health</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border border-rose-100">
                <CardHeader>
                  <CardTitle className="text-gray-800">System Health</CardTitle>
                  <CardDescription className="text-gray-600">Platform status and performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Database Status</span>
                    <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50">Healthy</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Storage Usage</span>
                    <Badge variant="outline" className="border-rose-500 text-rose-600 bg-rose-50">12.5 GB</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Active Sessions</span>
                    <Badge variant="outline" className="border-purple-500 text-purple-600 bg-purple-50">{stats.totalUsers}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-rose-100">
                <CardHeader>
                  <CardTitle className="text-gray-800">Recent Activity</CardTitle>
                  <CardDescription className="text-gray-600">Latest platform activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-gray-500 py-8">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Activity monitoring coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold mb-2 text-gray-800">User Management</h3>
              <p className="text-gray-600">Manage platform users and permissions</p>
            </div>
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold mb-2 text-gray-800">Content Moderation</h3>
              <p className="text-gray-600">Review and moderate platform content</p>
            </div>

            <div className="space-y-4">
              {allContent.length > 0 ? (
                allContent.map((content) => (
                  <ContentPlayer
                    key={content.id}
                    content={content}
                    hasAccess={true}
                  />
                ))
              ) : (
                <Card className="bg-white/80 backdrop-blur-sm border border-rose-100">
                  <CardContent className="p-6">
                    <div className="text-center text-gray-500">
                      <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No content available</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold mb-2 text-gray-800">Withdrawal Requests</h3>
              <p className="text-gray-600">Manage creator withdrawal requests</p>
            </div>

            {withdrawals.length > 0 ? (
              <div className="space-y-4">
                {withdrawals.map((withdrawal) => (
                  <Card key={withdrawal.id} className="bg-white/80 backdrop-blur-sm border border-rose-100">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {withdrawal.profiles.nickname || withdrawal.profiles.email}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Amount: ₦{withdrawal.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            Requested: {new Date(withdrawal.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={
                              withdrawal.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                              withdrawal.status === 'rejected' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                              'bg-amber-100 text-amber-800 border-amber-200'
                            }
                          >
                            {withdrawal.status}
                          </Badge>
                          {withdrawal.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApproveWithdrawal(withdrawal.id)}
                                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800"
                                onClick={() => handleRejectWithdrawal(withdrawal.id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-white/80 backdrop-blur-sm border border-rose-100">
                <CardContent className="p-6">
                  <div className="text-center text-gray-500">
                    <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No withdrawal requests</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold mb-2 text-gray-800">System Settings</h3>
              <p className="text-gray-600">Configure platform settings and preferences</p>
            </div>

            <SubscriptionSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};