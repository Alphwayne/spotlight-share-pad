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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-luxury/5">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-luxury/5">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
            <p className="text-muted-foreground">This creator profile could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-luxury/5">
      {/* Minimal Header */}
      <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4">
        <div className="container mx-auto px-4 flex justify-end">
          <Button onClick={() => navigate('/auth')} variant="outline" size="sm">
            Sign In
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Creator Profile Section */}
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Creator Profile */}
          <Card className="glass-effect border-primary/20 overflow-hidden backdrop-blur-md">
            <div className="relative bg-gradient-to-br from-primary/20 via-luxury/15 to-accent/20 p-8">
              <div className="absolute inset-0 bg-black/5"></div>
              <div className="relative flex flex-col items-center text-center space-y-6">
                <Avatar className="w-32 h-32 ring-4 ring-white/30 shadow-2xl">
                  <AvatarImage src={profile.profile_picture_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-luxury text-white text-2xl">
                    {profile.nickname?.[0] || profile.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-3">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-luxury to-accent bg-clip-text text-transparent">
                    {profile.nickname || 'Anonymous Creator'}
                  </h1>
                  
                  {profile.bio && (
                    <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                      {profile.bio}
                    </p>
                  )}
                </div>
                
                <Button 
                  onClick={handleSubscribe}
                  size="lg" 
                  className="bg-gradient-to-r from-primary via-luxury to-accent hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl px-8 py-3"
                >
                  <Heart className="w-5 h-5 mr-2" />
                  Subscribe for Exclusive Content
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Preview Content */}
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Free Preview Content
              </CardTitle>
              <CardDescription>
                Get a taste of what this creator offers. Subscribe for full access to all exclusive content!
              </CardDescription>
            </CardHeader>
            <CardContent>
              {previewContent.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {previewContent.map((content) => (
                    <Card key={content.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        {content.thumbnail_url ? (
                          <img 
                            src={content.thumbnail_url} 
                            alt={content.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Eye className="w-12 h-12 text-muted-foreground/50" />
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-1">{content.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {content.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">
                            {content.content_type}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Heart className="w-3 h-3" />
                            {content.likes_count || 0}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Lock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No free previews available</p>
                  <p>Subscribe to access this creator's exclusive content!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call to Action */}
          <Card className="glass-effect border-primary/20 bg-gradient-to-r from-primary/5 to-luxury/5">
            <CardContent className="p-8 text-center">
              <Star className="w-16 h-16 mx-auto mb-4 text-luxury" />
              <h2 className="text-2xl font-bold mb-4">Ready for More?</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Subscribe now to unlock all exclusive content from {profile.nickname || 'this creator'} 
                and join their premium community!
              </p>
              <Button 
                onClick={handleSubscribe}
                size="lg" 
                className="bg-gradient-to-r from-primary via-luxury to-accent hover:scale-105 transition-transform"
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