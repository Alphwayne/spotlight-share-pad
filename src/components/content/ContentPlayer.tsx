import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2, Play, Pause, Download, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

interface ContentPlayerProps {
  content: Content;
  hasAccess: boolean;
  onLike?: () => void;
  onComment?: () => void;
}

export const ContentPlayer: React.FC<ContentPlayerProps> = ({ 
  content, 
  hasAccess, 
  onLike, 
  onComment 
}) => {
  const { user, profile } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    checkIfLiked();
  }, [content.id, user]);

  const checkIfLiked = async () => {
    if (!user || !profile) return;
    
    const { data } = await supabase
      .from('content_likes')
      .select('id')
      .eq('content_id', content.id)
      .eq('user_id', profile.id)
      .single();
    
    setIsLiked(!!data);
  };

  const handleLike = async () => {
    if (!user || !profile) return;

    try {
      if (isLiked) {
        await supabase
          .from('content_likes')
          .delete()
          .eq('content_id', content.id)
          .eq('user_id', profile.id);
        setIsLiked(false);
      } else {
        await supabase
          .from('content_likes')
          .insert({
            content_id: content.id,
            user_id: profile.id
          });
        setIsLiked(true);
      }
      onLike?.();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to update like",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: content.title,
        text: content.description,
        url: window.location.href
      });
    } catch (error) {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied to clipboard!" });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canAccess = hasAccess || content.is_preview || content.owner_id === profile?.id;

  const renderMediaPlayer = () => {
    if (!canAccess) {
      return (
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Subscribe to access this content</p>
          </div>
        </div>
      );
    }

    switch (content.content_type) {
      case 'video':
        return (
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              src={content.file_url}
              poster={content.thumbnail_url}
              controls
              className="w-full h-full"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="bg-gradient-to-r from-primary/10 to-luxury/10 rounded-lg p-8">
            <div className="flex items-center justify-center mb-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsPlaying(!isPlaying)}
                className="rounded-full w-16 h-16"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
            </div>
            <audio
              src={content.file_url}
              controls
              className="w-full"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        );

      case 'image':
        return (
          <div className="rounded-lg overflow-hidden">
            <img
              src={content.file_url}
              alt={content.title}
              className="w-full h-auto max-h-96 object-contain bg-muted"
            />
          </div>
        );

      case 'document':
        return (
          <div className="bg-muted rounded-lg p-8 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Download className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Document ready for download
              </p>
              <Button asChild>
                <a href={content.file_url} download target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {renderMediaPlayer()}
      </CardContent>
      
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={content.is_preview ? "secondary" : "default"}>
                {content.is_preview ? "Free Preview" : "Premium"}
              </Badge>
              {content.duration && (
                <Badge variant="outline">
                  {formatDuration(content.duration)}
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl mb-2">{content.title}</CardTitle>
            {content.description && (
              <CardDescription className="text-sm">
                {content.description}
              </CardDescription>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={content.profiles.profile_picture_url} />
              <AvatarFallback>
                {content.profiles.nickname?.[0] || 'C'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">
                {content.profiles.nickname || 'Creator'}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(content.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={!user}
              className={isLiked ? "text-red-500" : ""}
            >
              <Heart className={`h-4 w-4 mr-1 ${isLiked ? "fill-current" : ""}`} />
              {content.likes_count}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              disabled={!user}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Comments
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};