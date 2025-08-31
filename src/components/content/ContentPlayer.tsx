import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2, Play, Pause, Download, Lock, Shield } from 'lucide-react';
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
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    checkIfLiked();
    addBasicProtection();
    
    return () => {
      removeProtectionHandlers();
    };
  }, [content.id, user]);

  // Basic protection - mostly visual deterrents
  const addBasicProtection = () => {
    // Prevent right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast({
        title: "Content Protected",
        description: "Right-click is disabled on premium content",
        variant: "default"
      });
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  };

  const removeProtectionHandlers = () => {
    // Cleanup event listeners
    document.removeEventListener('contextmenu', () => {});
  };

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
        <div className="aspect-video bg-gradient-to-br from-rose-50 to-purple-50 rounded-lg flex items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-600/5 to-purple-600/5 backdrop-blur-sm"></div>
          <div className="text-center relative z-10 p-6">
            <Lock className="h-16 w-16 mx-auto mb-4 text-rose-600" />
            <p className="text-rose-700 font-medium text-lg mb-2">Exclusive Content</p>
            <p className="text-rose-600/70">Subscribe to unlock this premium content</p>
          </div>
        </div>
      );
    }

    switch (content.content_type) {
      case 'video':
        return (
          <div 
            className="relative aspect-video bg-black rounded-lg overflow-hidden max-w-3xl mx-auto border-2 border-rose-200"
            onContextMenu={(e) => e.preventDefault()}
          >
            <video
              ref={videoRef}
              src={content.file_url}
              poster={content.thumbnail_url}
              controls
              controlsList="nodownload"
              className="w-full h-full object-contain"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="bg-gradient-to-r from-rose-50 to-purple-50 rounded-lg p-8 max-w-2xl mx-auto border border-rose-200">
            <div className="flex items-center justify-center mb-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsPlaying(!isPlaying)}
                className="rounded-full w-16 h-16 border-rose-300 text-rose-600 hover:bg-rose-50"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
            </div>
            <audio
              src={content.file_url}
              controls
              controlsList="nodownload"
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
          <div 
            className="rounded-lg overflow-hidden max-w-4xl mx-auto border-2 border-rose-200 relative"
            onContextMenu={(e) => e.preventDefault()}
          >
            <img
              src={content.file_url}
              alt={content.title}
              className="w-full h-auto max-h-96 object-contain bg-rose-50"
            />
          </div>
        );

      case 'document':
        return (
          <div className="bg-rose-50 rounded-lg p-8 text-center max-w-xl mx-auto border border-rose-200">
            <div className="mb-4">
              <div className="w-16 h-16 bg-rose-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Download className="h-8 w-8 text-rose-600" />
              </div>
              <p className="text-sm text-rose-700 mb-4">
                Secure document access
              </p>
              <Button 
                asChild
                className="bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700"
              >
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
    <Card className="overflow-hidden max-w-6xl mx-auto bg-white/80 backdrop-blur-sm border border-rose-100 shadow-lg hover:shadow-xl transition-shadow">
      <CardContent className="p-0">
        {renderMediaPlayer()}
      </CardContent>
      
      <CardHeader className="max-w-4xl mx-auto w-full">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={content.is_preview ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-gradient-to-r from-rose-600 to-purple-600 text-white"}>
                {content.is_preview ? "Free Preview" : "Premium"}
              </Badge>
              {content.duration && (
                <Badge variant="outline" className="border-rose-200 text-rose-700">
                  {formatDuration(content.duration)}
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl mb-2 text-gray-800">{content.title}</CardTitle>
            {content.description && (
              <CardDescription className="text-sm text-gray-600">
                {content.description}
              </CardDescription>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border border-rose-200">
              <AvatarImage src={content.profiles.profile_picture_url} />
              <AvatarFallback className="bg-gradient-to-r from-rose-600 to-purple-600 text-white">
                {content.profiles.nickname?.[0] || 'C'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm text-gray-800">
                {content.profiles.nickname || 'Creator'}
              </p>
              <p className="text-xs text-gray-600">
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
              className={`border-rose-200 text-rose-600 hover:bg-rose-50 ${isLiked ? "text-rose-700 bg-rose-100" : ""}`}
            >
              <Heart className={`h-4 w-4 mr-1 ${isLiked ? "fill-current" : ""}`} />
              {content.likes_count}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              disabled={!user}
              className="border-purple-200 text-purple-600 hover:bg-purple-50"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Comments
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};