import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, 
  Upload, 
  Share2, 
  DollarSign, 
  Users, 
  Eye,
  Settings,
  LogOut,
  Plus,
  BarChart3,
  User,
  Sparkles,
  Heart,
  Star,
  Download,
  Calendar
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ContentUpload } from '@/components/content/ContentUpload';
import { ProfileManagement } from '@/components/profile/ProfileManagement';
import { ContentPlayer } from '@/components/content/ContentPlayer';
import ddLogo from '@/assets/dirty-desire-abstract.png';

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

interface Earning {
  id: string;
  amount: number;
  status: 'pending' | 'paid';
  created_at: string;
  subscription_id: string;
  owner_id: string;
  percentage_rate: number;
}

interface Withdrawal {
  id: string;
  owner_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export const OwnerDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [contentCount, setContentCount] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [userContent, setUserContent] = useState<Content[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (profile) {
      fetchDashboardData();
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile) return;

    try {
      // Fetch earnings
      const { data: earningsData, error: earningsError } = await supabase
        .from('earnings')
        .select('*')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false });

      if (earningsError) {
        console.error('Error fetching earnings:', earningsError);
      } else {
        setEarnings(earningsData as Earning[] || []);
        
        const pendingEarnings = earningsData
          ?.filter(e => e.status === 'pending')
          ?.reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;

        setAvailableBalance(pendingEarnings);

        const total = earningsData?.reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;
        setTotalEarnings(total);
      }

      // Fetch withdrawals
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false });

      if (withdrawalsError) {
        console.error('Error fetching withdrawals:', withdrawalsError);
      } else {
        setWithdrawals(withdrawalsData as Withdrawal[] || []);
      }

      // Fetch subscriber count
      const { count: subscribers } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', profile.id)
        .eq('status', 'active');

      setSubscriberCount(subscribers || 0);

      // Fetch content count and actual content
      const { count: content, data: contentData } = await supabase
        .from('content')
        .select(`
          *,
          profiles (
            nickname,
            profile_picture_url
          )
        `)
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false });

      setContentCount(content || 0);
      setUserContent(contentData as Content[] || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const generateShareLink = async () => {
    if (!profile) return;

    try {
      const linkCode = Math.random().toString(36).substring(2, 15);
      const { error } = await supabase
        .from('share_links')
        .insert({
          owner_id: profile.id,
          link_code: linkCode,
          is_active: true
        });

      if (error) throw error;

      // Check if window is defined (client-side)
      if (typeof window !== 'undefined') {
        const shareUrl = `${window.location.origin}/preview/${linkCode}`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(shareUrl);
        
        toast({
          title: "Share Link Generated",
          description: "Link copied to clipboard! Share this with your audience.",
        });
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      toast({
        title: "Error",
        description: "Failed to generate share link.",
        variant: "destructive",
      });
    }
  };

  const handleWithdrawal = async () => {
    if (!profile) return;

    if (availableBalance < 5000) {
      toast({
        title: "Insufficient Funds",
        description: "Minimum withdrawal amount is ₦5,000",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('withdrawals')
        .insert({
          owner_id: profile.id,
          amount: availableBalance,
          status: 'pending'
        });

      if (error) throw error;

      // Update earnings status to paid
      const { error: updateError } = await supabase
        .from('earnings')
        .update({ status: 'paid' })
        .eq('owner_id', profile.id)
        .eq('status', 'pending');

      if (updateError) throw updateError;

      toast({ title: "Withdrawal request submitted!" });
      fetchDashboardData();
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast({
        title: "Withdrawal Failed",
        description: "Failed to process withdrawal",
        variant: "destructive"
      });
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50 flex items-center justify-center">
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
              <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent">
                {profile?.nickname || 'Creator'}'s Empire
              </h1>
              <p className="text-sm text-rose-600/70 flex items-center gap-1">
                <Star className="w-3 h-3 text-purple-500" />
                Ruling your content kingdom
                <Heart className="w-3 h-3 text-rose-500 animate-pulse" />
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-rose-600/50 text-rose-600 bg-rose-100">
              Premium Creator
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Available Earnings</CardTitle>
              <DollarSign className="h-4 w-4 bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                ₦{availableBalance.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600">Available for withdrawal</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Subscribers</CardTitle>
              <Users className="h-4 w-4 bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                {subscriberCount}
              </div>
              <p className="text-xs text-gray-600">Active subscriptions</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Content Posts</CardTitle>
              <Eye className="h-4 w-4 bg-gradient-to-r from-rose-600 to-rose-700 bg-clip-text text-transparent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-rose-700 bg-clip-text text-transparent">
                {contentCount}
              </div>
              <p className="text-xs text-gray-600">Total uploads</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/80 p-1 rounded-lg border border-rose-100 backdrop-blur-sm">
            <TabsTrigger value="profile" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-md transition-all duration-300 text-gray-600 hover:text-rose-600 flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-md transition-all duration-300 text-gray-600 hover:text-rose-600 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="subscribers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-md transition-all duration-300 text-gray-600 hover:text-rose-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Subscribers
            </TabsTrigger>
            <TabsTrigger value="earnings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-md transition-all duration-300 text-gray-600 hover:text-rose-600 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-md transition-all duration-300 text-gray-600 hover:text-rose-600 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent">
                  Your Creator Profile
                </h3>
                <p className="text-gray-600">This is what your fans will see when they discover you</p>
              </div>
              <Button 
                onClick={generateShareLink} 
                variant="outline" 
                className="flex items-center gap-2 border-rose-200 text-rose-600 hover:bg-rose-50"
              >
                <Share2 className="w-4 h-4" />
                Generate Share Link
              </Button>
            </div>

            <ProfileManagement />
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Your Content Empire</h3>
                <p className="text-gray-600">Create and manage your exclusive content</p>
              </div>
              <Button 
                onClick={() => setShowUpload(!showUpload)} 
                className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700"
              >
                <Plus className="w-4 h-4" />
                {showUpload ? 'Hide Upload' : 'Upload Content'}
              </Button>
            </div>

            {showUpload && (
              <ContentUpload onUploadComplete={() => {
                setShowUpload(false);
                fetchDashboardData();
              }} />
            )}

            {userContent.length > 0 ? (
              <div className="space-y-4">
                {userContent.map((content) => (
                  <ContentPlayer
                    key={content.id}
                    content={content}
                    hasAccess={true}
                  />
                ))}
              </div>
            ) : (
              <Card className="bg-white/80 backdrop-blur-sm border border-rose-100">
                <CardContent className="p-6">
                  <div className="text-center text-gray-500">
                    <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No content uploaded yet. Start by uploading your first exclusive content!</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="subscribers" className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Subscribers</h3>
              <p className="text-gray-600">View and manage your subscribers</p>
            </div>

            <Card className="bg-white/80 backdrop-blur-sm border border-rose-100">
              <CardContent className="p-6">
                <div className="text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No subscribers yet. Share your profile to get started!</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings" className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Earnings Dashboard</h3>
              <p className="text-gray-600">Track your revenue and withdraw funds</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border border-rose-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Available Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent mb-4">
                    ₦{availableBalance.toLocaleString()}
                  </div>
                  <Button 
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800" 
                    onClick={handleWithdrawal}
                    disabled={availableBalance < 5000}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Withdraw Funds
                  </Button>
                  {availableBalance < 5000 && (
                    <p className="text-sm text-gray-600 mt-2">
                      Minimum withdrawal: ₦5,000
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-rose-100">
                <CardHeader>
                  <CardTitle className="text-gray-800">Earnings History</CardTitle>
                </CardHeader>
                <CardContent>
                  {earnings.length > 0 ? (
                    <div className="space-y-2">
                      {earnings.slice(0, 5).map((earning) => (
                        <div key={earning.id} className="flex justify-between items-center p-2 border border-rose-100 rounded">
                          <div>
                            <p className="font-medium text-gray-800">₦{earning.amount.toLocaleString()}</p>
                            <p className="text-xs text-gray-600">
                              {new Date(earning.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge 
                            className={
                              earning.status === 'paid' ? 'bg-green-100 text-green-800 border-green-200' :
                              'bg-amber-100 text-amber-800 border-amber-200'
                            }
                          >
                            {earning.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">No earnings yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white/80 backdrop-blur-sm border border-rose-100">
              <CardHeader>
                <CardTitle className="text-gray-800">Withdrawal History</CardTitle>
              </CardHeader>
              <CardContent>
                {withdrawals.length > 0 ? (
                  <div className="space-y-2">
                    {withdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="flex justify-between items-center p-2 border border-rose-100 rounded">
                        <div>
                          <p className="font-medium text-gray-800">₦{withdrawal.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-600">
                            {new Date(withdrawal.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge 
                          className={
                            withdrawal.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                            withdrawal.status === 'rejected' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                            'bg-amber-100 text-amber-800 border-amber-200'
                          }
                        >
                          {withdrawal.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No withdrawal requests yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Profile Settings</h3>
              <p className="text-gray-600">Customize your profile and preferences</p>
            </div>

            <Card className="bg-white/80 backdrop-blur-sm border border-rose-100">
              <CardContent className="p-6">
                <div className="text-center text-gray-500">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Profile settings coming soon!</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};