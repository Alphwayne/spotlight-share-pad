import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PaymentFlow } from '@/components/payment/PaymentFlow';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Creator {
  id: string;
  nickname?: string;
  profile_picture_url?: string;
  bio?: string;
}

const PaymentFlowPage = () => {
  const { linkCode } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (linkCode) {
      fetchCreatorData();
    }
  }, [linkCode]);

  const fetchCreatorData = async () => {
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

      // Fetch creator profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, nickname, bio, profile_picture_url')
        .eq('id', linkData.owner_id)
        .single();

      if (profileError || !profileData) {
        throw new Error('Creator not found');
      }

      setCreator(profileData);
    } catch (error) {
      console.error('Error fetching creator data:', error);
      toast({
        title: "Error",
        description: "Failed to load creator information.",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionComplete = () => {
    // Redirect to content or dashboard after successful subscription
    navigate('/');
    toast({
      title: "Welcome!",
      description: "You now have access to premium content.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-luxury/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-luxury/5">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Creator Not Found</h2>
            <p className="text-muted-foreground">This creator could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-luxury/5">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <PaymentFlow 
            creator={creator} 
            onSubscriptionComplete={handleSubscriptionComplete}
          />
        </div>
      </div>
    </div>
  );
};

export default PaymentFlowPage;