import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Video, Music, FileText, Image, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ContentUploadProps {
  onUploadComplete?: () => void;
}

export const ContentUpload: React.FC<ContentUploadProps> = ({ onUploadComplete }) => {
  const { user, profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: 'video' as 'video' | 'audio' | 'image' | 'document',
    is_preview: false,
    duration: ''
  });
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const contentTypeIcons = {
    video: Video,
    audio: Music,
    image: Image,
    document: FileText
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user || !profile) {
      toast({ title: "Error", description: "Please select a file and ensure you're logged in" });
      return;
    }

    setUploading(true);
    try {
      // Upload main content file
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('content')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('content')
        .getPublicUrl(filePath);

      // Upload thumbnail if provided
      let thumbnailUrl = null;
      if (thumbnailFile) {
        const thumbExt = thumbnailFile.name.split('.').pop();
        const thumbName = `thumb-${Date.now()}-${Math.random().toString(36).substring(2)}.${thumbExt}`;
        const thumbPath = `${profile.id}/${thumbName}`;

        const { error: thumbError } = await supabase.storage
          .from('thumbnails')
          .upload(thumbPath, thumbnailFile);

        if (!thumbError) {
          const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
            .from('thumbnails')
            .getPublicUrl(thumbPath);
          thumbnailUrl = thumbPublicUrl;
        }
      }

      // Create content record
      const { error: dbError } = await supabase
        .from('content')
        .insert({
          owner_id: profile.id,
          title: formData.title,
          description: formData.description,
          content_type: formData.content_type as any,
          file_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          is_preview: formData.is_preview,
          duration: formData.duration ? parseInt(formData.duration) : null
        });

      if (dbError) throw dbError;

      toast({ title: "Success", description: "Content uploaded successfully!" });
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        content_type: 'video',
        is_preview: false,
        duration: ''
      });
      setFile(null);
      setThumbnailFile(null);
      
      onUploadComplete?.();
    } catch (error) {
      console.error('Upload error:', error);
      toast({ 
        title: "Upload Error", 
        description: error instanceof Error ? error.message : "Failed to upload content",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  if (profile?.role !== 'owner' && profile?.role !== 'admin') {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Only content creators can upload content.
          </p>
        </CardContent>
      </Card>
    );
  }

  const IconComponent = contentTypeIcons[formData.content_type];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Content
        </CardTitle>
        <CardDescription>
          Share your content with subscribers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter content title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your content"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content_type">Content Type</Label>
            <Select
              value={formData.content_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, content_type: value as any }))}
            >
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4" />
                    {formData.content_type.charAt(0).toUpperCase() + formData.content_type.slice(1)}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Video
                  </div>
                </SelectItem>
                <SelectItem value="audio">
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    Audio
                  </div>
                </SelectItem>
                <SelectItem value="image">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Image
                  </div>
                </SelectItem>
                <SelectItem value="document">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Document
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(formData.content_type === 'video' || formData.content_type === 'audio') && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="e.g., 120"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="file">Content File</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept={
                formData.content_type === 'video' ? 'video/*' :
                formData.content_type === 'audio' ? 'audio/*' :
                formData.content_type === 'image' ? 'image/*' :
                '.pdf,.doc,.docx,.txt'
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail">Thumbnail (optional)</Label>
            <Input
              id="thumbnail"
              type="file"
              onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
              accept="image/*"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_preview"
              checked={formData.is_preview}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_preview: checked }))}
            />
            <Label htmlFor="is_preview" className="text-sm">
              Make this a free preview (accessible to everyone)
            </Label>
          </div>

          <Button type="submit" disabled={uploading || !file} className="w-full">
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Content
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};