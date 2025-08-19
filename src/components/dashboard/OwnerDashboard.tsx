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
  Star
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ContentUpload } from '@/components/content/ContentUpload';
import { ProfileManagement } from '@/components/profile/ProfileManagement';

export const OwnerDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [earnings, setEarnings] = useState(0);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [contentCount, setContentCount] = useState(0);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    if (!profile) return;

    try {
      // Fetch earnings
      const { data: earningsData } = await supabase
        .from('earnings')
        .select('amount')
        .eq('owner_id', profile.id)
        .eq('status', 'pending');

      const totalEarnings = earningsData?.reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;
      setEarnings(totalEarnings);

      // Fetch subscriber count
      const { count: subscribers } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', profile.id)
        .eq('status', 'active');

      setSubscriberCount(subscribers || 0);

      // Fetch content count
      const { count: content } = await supabase
        .from('content')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', profile.id);

      setContentCount(content || 0);
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

      const shareUrl = `${window.location.origin}/preview/${linkCode}`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      
      toast({
        title: "Share Link Generated",
        description: "Link copied to clipboard! Share this with your audience.",
      });
    } catch (error) {
      console.error('Error generating share link:', error);
      toast({
        title: "Error",
        description: "Failed to generate share link.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-luxury/5">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary via-luxury to-accent rounded-full flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-luxury to-accent bg-clip-text text-transparent">
                {profile?.nickname || 'Creator'}'s Empire
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3 text-luxury" />
                Ruling your content kingdom
                <Heart className="w-3 h-3 text-destructive animate-pulse" />
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-luxury text-luxury">
              Premium Creator
            </Badge>
            <Avatar className="w-10 h-10 ring-2 ring-primary/20">
              <AvatarImage src={profile?.profile_picture_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-luxury text-white">
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass-effect border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">${earnings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Available for withdrawal</p>
            </CardContent>
          </Card>

          <Card className="glass-effect border-luxury/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
              <Users className="h-4 w-4 text-luxury" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-luxury">{subscriberCount}</div>
              <p className="text-xs text-muted-foreground">Active subscriptions</p>
            </CardContent>
          </Card>

          <Card className="glass-effect border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Content Posts</CardTitle>
              <Eye className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{contentCount}</div>
              <p className="text-xs text-muted-foreground">Total uploads</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="subscribers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Subscribers
            </TabsTrigger>
            <TabsTrigger value="earnings" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-luxury bg-clip-text text-transparent">
                  Your Creator Profile
                </h3>
                <p className="text-muted-foreground">This is what your fans will see when they discover you</p>
              </div>
              <Button onClick={generateShareLink} variant="outline" className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Generate Share Link
              </Button>
            </div>

            <ProfileManagement />
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">Your Content Empire</h3>
                <p className="text-muted-foreground">Create and manage your exclusive content</p>
              </div>
              <Button 
                onClick={() => setShowUpload(!showUpload)} 
                className="flex items-center gap-2 bg-gradient-to-r from-primary to-luxury"
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

            <Card className="glass-effect">
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No content uploaded yet. Start by uploading your first exclusive content!</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscribers" className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold">Subscribers</h3>
              <p className="text-muted-foreground">View and manage your subscribers</p>
            </div>

            <Card className="glass-effect">
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No subscribers yet. Share your profile to get started!</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings" className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold">Earnings Dashboard</h3>
              <p className="text-muted-foreground">Track your revenue and withdraw funds</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-success" />
                    Available Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-success mb-4">${earnings.toFixed(2)}</div>
                  <Button className="w-full bg-gradient-to-r from-success to-success/80" disabled={earnings <= 0}>
                    Withdraw Funds
                  </Button>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle>Payment Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure your payment percentage and withdrawal methods.
                  </p>
                  <Badge variant="outline" className="mb-4">
                    Revenue Share: 70%
                  </Badge>
                  <Button variant="outline" className="w-full">
                    Update Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold">Profile Settings</h3>
              <p className="text-muted-foreground">Customize your profile and preferences</p>
            </div>

            <Card className="glass-effect">
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
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