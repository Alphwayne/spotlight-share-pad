import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, 
  Heart, 
  User, 
  Star, 
  ArrowRight,
  Lock,
  Eye,
  Calendar,
  Sparkles
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ddLogo from '@/assets/dirty-desire-abstract.png';

interface ProfileData {
  id: string;
  nickname: string | null;
  bio: string | null;
  profile_picture_url: string | null;
  email: string;
  created_at: string;
}

interface ContentData {
  id: string;
  title: string;
  description: string;
  content_type: string;
  thumbnail_url: string | null;
  is_preview: boolean;
  likes_count: number;
  created_at: string;
}

const Preview = () => {
  const { linkCode } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [previewContent, setPreviewContent] = useState<ContentData[]>([]);
  const [totalContent, setTotalContent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (linkCode) {
      fetchPreviewData();
    }
  }, [linkCode]);

  const fetchPreviewData = async () => {
    try {
      // Verify the share link exists and is active
      const { data: linkData, error: linkError } = await supabase
        .from('share_links')
        .select('owner_id')
        .eq('link_code', linkCode)
        .eq('is_active', true)
        .single();

      if (linkError || !linkData) {
        toast({
          title: "Invalid Link",
          description: "This share link is invalid or has expired.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // Fetch owner profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, nickname, bio, profile_picture_url, email, created_at')
        .eq('id', linkData.owner_id)
        .single();

      if (profileError || !profileData) {
        throw new Error('Profile not found');
      }

      setProfile(profileData);

      // Fetch preview content (free content)
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('id, title, description, content_type, thumbnail_url, is_preview, likes_count, created_at')
        .eq('owner_id', linkData.owner_id)
        .eq('is_preview', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!contentError && contentData) {
        setPreviewContent(contentData);
      }

      // Get total content count
      const { count } = await supabase
        .from('content')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', linkData.owner_id);

      setTotalContent(count || 0);

    } catch (error) {
      console.error('Error fetching preview data:', error);
      toast({
        title: "Error",
        description: "Failed to load creator profile.",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = () => {
    navigate(`/subscribe/${linkCode}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-purple-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-purple-50">
        <Card className="bg-white/80 backdrop-blur-sm border border-rose-100">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Profile Not Found</h2>
            <p className="text-gray-600">This creator profile could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50 relative overflow-hidden">
      {/* Subtle background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-rose-100/20 via-purple-100/20 to-pink-100/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-200/10 via-transparent to-transparent" />
      </div>

      {/* Minimal Header */}
      <header className="bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70 py-4 relative z-10">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img
              src={ddLogo}
              alt="Dirty Desire Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="font-semibold bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent">
              Dirty Desire
            </span>
          </div>
          <Button 
            onClick={() => navigate('/auth')} 
            variant="outline" 
            size="sm"
            className="border-rose-200 text-rose-600 hover:bg-rose-50"
          >
            Sign In
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Creator Profile Section */}
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Creator Profile */}
          <Card className="bg-white/80 backdrop-blur-sm border border-rose-100 overflow-hidden">
            <div className="relative bg-gradient-to-br from-rose-100/50 via-purple-100/40 to-pink-100/50 p-8">
              <div className="absolute inset-0 bg-white/30"></div>
              <div className="relative flex flex-col items-center text-center space-y-6">
                <Avatar className="w-32 h-32 ring-4 ring-white/50 shadow-lg border-2 border-rose-200">
                  <AvatarImage src={profile.profile_picture_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-r from-rose-600 to-purple-600 text-white text-2xl">
                    {profile.nickname?.[0] || profile.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-3">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent">
                    {profile.nickname || 'Anonymous Creator'}
                  </h1>
                  
                  {profile.bio && (
                    <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
                      {profile.bio}
                    </p>
                  )}
                </div>
                
                <Button 
                  onClick={handleSubscribe}
                  size="lg" 
                  className="bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl px-8 py-3"
                >
                  <Heart className="w-5 h-5 mr-2" />
                  Subscribe for Exclusive Content
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Preview Content */}
          <Card className="bg-white/80 backdrop-blur-sm border border-rose-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <Eye className="w-5 h-5" />
                Free Preview Content
              </CardTitle>
              <CardDescription className="text-gray-600">
                Get a taste of what this creator offers. Subscribe for full access to all exclusive content!
              </CardDescription>
            </CardHeader>
            <CardContent>
              {previewContent.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {previewContent.map((content) => (
                    <Card key={content.id} className="overflow-hidden hover:shadow-md transition-shadow border border-rose-100">
                      <div className="aspect-video bg-rose-50 flex items-center justify-center">
                        {content.thumbnail_url ? (
                          <img 
                            src={content.thumbnail_url} 
                            alt={content.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Eye className="w-12 h-12 text-rose-300" />
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-1 text-gray-800">{content.title}</h3>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {content.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge className="bg-rose-100 text-rose-800 border-rose-200">
                            {content.content_type}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Heart className="w-3 h-3" />
                            {content.likes_count || 0}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Lock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No free previews available</p>
                  <p>Subscribe to access this creator's exclusive content!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call to Action */}
          <Card className="bg-white/80 backdrop-blur-sm border border-rose-100 bg-gradient-to-r from-rose-50/50 to-purple-50/50">
            <CardContent className="p-8 text-center">
              <Star className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent" />
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Ready for More?</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Subscribe now to unlock all exclusive content from {profile.nickname || 'this creator'} 
                and join their premium community!
              </p>
              <Button 
                onClick={handleSubscribe}
                size="lg" 
                className="bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700 hover:scale-105 transition-transform"
              >
                <Heart className="w-5 h-5 mr-2" />
                Start Your Subscription
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Preview;