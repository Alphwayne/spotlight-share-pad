import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  CreditCard,
  LogOut,
  Search,
  Filter
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Subscription {
  id: string;
  owner_id: string;
  status: string;
  expires_at: string | null;
  profiles: {
    nickname: string;
    profile_picture_url: string;
    email: string;
  };
}

export const SubscriberDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id,
          owner_id,
          status,
          expires_at,
          profiles!subscriptions_owner_id_fkey (
            nickname,
            profile_picture_url,
            email
          )
        `)
        .eq('subscriber_id', profile.id)
        .eq('status', 'active');

      if (error) throw error;

      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: "Error",
        description: "Failed to load subscriptions.",
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-luxury/5">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-luxury rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">My Subscriptions</h1>
              <p className="text-sm text-muted-foreground">Discover exclusive content</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src={profile?.profile_picture_url} />
              <AvatarFallback className="bg-primary text-primary-foreground">
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {profile?.nickname || 'User'}!</h2>
          <p className="text-lg text-muted-foreground">
            {subscriptions.length > 0 
              ? `You have ${subscriptions.length} active subscription${subscriptions.length > 1 ? 's' : ''}`
              : "You don't have any active subscriptions yet"
            }
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search creators..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </div>

        {/* Subscriptions Grid */}
        {subscriptions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptions.map((subscription) => (
              <Card key={subscription.id} className="glass-effect border-primary/20 hover:border-primary/40 transition-all duration-300 hover:scale-105">
                <CardHeader className="text-center">
                  <Avatar className="w-20 h-20 mx-auto mb-4">
                    <AvatarImage src={subscription.profiles.profile_picture_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-luxury text-white text-xl">
                      {subscription.profiles.nickname?.[0] || subscription.profiles.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="gradient-text">
                    {subscription.profiles.nickname || 'Creator'}
                  </CardTitle>
                  <CardDescription>
                    <Badge variant="outline" className="border-success text-success">
                      Active Subscription
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-success font-medium capitalize">{subscription.status}</span>
                  </div>
                  {subscription.expires_at && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Expires:</span>
                      <span className="font-medium">
                        {new Date(subscription.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Heart className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="glass-effect text-center py-12">
            <CardContent>
              <CreditCard className="w-16 h-16 mx-auto mb-6 text-muted-foreground opacity-50" />
              <h3 className="text-2xl font-bold mb-4">No Subscriptions Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                You haven't subscribed to any creators yet. Discover amazing content by subscribing to your favorite creators!
              </p>
              <Button className="bg-gradient-to-r from-primary to-luxury hover:from-primary-glow hover:to-luxury-light">
                Discover Creators
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        {subscriptions.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="glass-effect hover:border-primary/40 transition-all duration-300 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Heart className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h4 className="font-semibold mb-2">Browse Favorites</h4>
                  <p className="text-sm text-muted-foreground">View content from your favorite creators</p>
                </CardContent>
              </Card>

              <Card className="glass-effect hover:border-luxury/40 transition-all duration-300 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-luxury" />
                  <h4 className="font-semibold mb-2">Messages</h4>
                  <p className="text-sm text-muted-foreground">Chat with creators you follow</p>
                </CardContent>
              </Card>

              <Card className="glass-effect hover:border-success/40 transition-all duration-300 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Share2 className="w-12 h-12 mx-auto mb-4 text-success" />
                  <h4 className="font-semibold mb-2">Share</h4>
                  <p className="text-sm text-muted-foreground">Share your favorite content</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};