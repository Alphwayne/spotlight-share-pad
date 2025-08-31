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
  Filter,
  Crown,
  UserPlus
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import ddLogo from '@/assets/dirty-desire-abstract.png';

interface Subscription {
  id: string;
  owner_id: string;
  status: string;
  expires_at: string | null;
  profiles: {
    nickname: string;
    profile_picture_url: string;
  };
}

interface Creator {
  id: string;
  nickname: string;
  profile_picture_url: string;
  bio: string;
}

export const SubscriberDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [allCreators, setAllCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSubscriptions();
    fetchAllCreators();
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
            profile_picture_url
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

  const fetchAllCreators = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nickname, profile_picture_url, bio')
        .eq('role', 'owner')
        .order('nickname');

      if (error) throw error;
      setAllCreators(data || []);
    } catch (error) {
      console.error('Error fetching creators:', error);
    }
  };

  const handleSubscribe = async (creatorId: string) => {
    if (!profile) {
      toast({
        title: "Authentication Required",
        description: "Please log in to subscribe",
        variant: "destructive"
      });
      return;
    }

    navigate(`/subscribe/${creatorId}`);
  };

  const handleLogout = async () => {
    await signOut();
  };

  const filteredCreators = allCreators.filter(creator =>
    creator.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    creator.bio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-purple-50">
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent">
                My Subscriptions
              </h1>
              <p className="text-sm text-rose-600/70">Discover exclusive content</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 text-gray-800">Welcome back, {profile?.nickname || 'User'}!</h2>
          <p className="text-lg text-gray-600">
            {subscriptions.length > 0 
              ? `You have ${subscriptions.length} active subscription${subscriptions.length > 1 ? 's' : ''}`
              : "You don't have any active subscriptions yet"
            }
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search creators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-rose-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2 border-rose-200 text-rose-600 hover:bg-rose-50">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </div>

        {/* Subscriptions Grid */}
        {subscriptions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {subscriptions.map((subscription) => (
              <Card key={subscription.id} className="bg-white/80 backdrop-blur-sm border border-rose-100 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
                <CardHeader className="text-center">
                  <Avatar className="w-20 h-20 mx-auto mb-4 border-2 border-rose-200">
                    <AvatarImage src={subscription.profiles.profile_picture_url} />
                    <AvatarFallback className="bg-gradient-to-r from-rose-600 to-purple-600 text-white text-xl">
                      {subscription.profiles.nickname?.[0] || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent">
                    {subscription.profiles.nickname || 'Creator'}
                  </CardTitle>
                  <CardDescription>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      Active Subscription
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-green-600 font-medium capitalize">{subscription.status}</span>
                  </div>
                  {subscription.expires_at && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Expires:</span>
                      <span className="font-medium text-gray-800">
                        {new Date(subscription.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" size="sm" className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50">
                      <Heart className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 border-purple-200 text-purple-600 hover:bg-purple-50">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-white/80 backdrop-blur-sm border border-rose-100 text-center py-12 mb-12">
            <CardContent>
              <CreditCard className="w-16 h-16 mx-auto mb-6 text-gray-400 opacity-50" />
              <h3 className="text-2xl font-bold mb-4 text-gray-800">No Subscriptions Yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                You haven't subscribed to any creators yet. Discover amazing content by subscribing to your favorite creators!
              </p>
            </CardContent>
          </Card>
        )}

        {/* All Creators Section */}
        {allCreators.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">Discover Creators</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCreators.map((creator) => (
                <Card key={creator.id} className="bg-white/80 backdrop-blur-sm border border-rose-100 shadow-sm hover:shadow-md transition-all duration-300">
                  <CardHeader className="text-center">
                    <Avatar className="w-16 h-16 mx-auto mb-4 border border-rose-200">
                      <AvatarImage src={creator.profile_picture_url} />
                      <AvatarFallback className="bg-gradient-to-r from-rose-600 to-purple-600 text-white">
                        {creator.nickname[0] || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-gray-800">{creator.nickname}</CardTitle>
                    {creator.bio && (
                      <CardDescription className="line-clamp-2 text-gray-600">
                        {creator.bio}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700"
                      onClick={() => handleSubscribe(creator.id)}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Subscribe
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {subscriptions.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border border-rose-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Heart className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent" />
                  <h4 className="font-semibold mb-2 text-gray-800">Browse Favorites</h4>
                  <p className="text-sm text-gray-600">View content from your favorite creators</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-rose-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent" />
                  <h4 className="font-semibold mb-2 text-gray-800">Messages</h4>
                  <p className="text-sm text-gray-600">Chat with creators you follow</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-rose-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Share2 className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent" />
                  <h4 className="font-semibold mb-2 text-gray-800">Share</h4>
                  <p className="text-sm text-gray-600">Share your favorite content</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};