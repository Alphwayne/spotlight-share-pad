import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreditCard, Crown, Star, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Creator {
  id: string;
  nickname?: string;
  profile_picture_url?: string;
  bio?: string;
}

interface PaymentFlowProps {
  creator: Creator;
  onSubscriptionComplete?: () => void;
}

export const PaymentFlow: React.FC<PaymentFlowProps> = ({ 
  creator, 
  onSubscriptionComplete 
}) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [amount, setAmount] = useState('10.00');
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'none' | 'pending' | 'active'>('none');

  useEffect(() => {
    checkExistingSubscription();
  }, [creator.id, profile]);

  const checkExistingSubscription = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('subscriptions')
      .select('status, expires_at')
      .eq('subscriber_id', profile.id)
      .eq('owner_id', creator.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      if (data.status === 'active' && (!data.expires_at || new Date(data.expires_at) > new Date())) {
        setSubscriptionStatus('active');
      } else if (data.status === 'pending') {
        setSubscriptionStatus('pending');
      }
    }
  };

  const handleSubscribe = async () => {
    if (!user || !profile) {
      toast({ 
        title: "Authentication Required", 
        description: "Please log in to subscribe",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          owner_id: creator.id,
          amount: parseFloat(amount)
        }
      });

      if (error) throw error;

      if (data?.checkout_url) {
        setPaymentReference(data.payment_reference);
        window.open(data.checkout_url, '_blank');
        setSubscriptionStatus('pending');
        
        // Start polling for payment verification
        pollPaymentStatus(data.payment_reference);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({ 
        title: "Subscription Error", 
        description: error instanceof Error ? error.message : "Failed to create subscription",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = (reference: string) => {
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('payment_reference', reference)
          .single();

        if (data?.status === 'active') {
          setSubscriptionStatus('active');
          clearInterval(interval);
          toast({ 
            title: "Subscription Active!", 
            description: "You now have access to premium content" 
          });
          onSubscriptionComplete?.();
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);
  };

  const verifyPayment = async () => {
    if (!paymentReference) return;

    setVerifying(true);
    try {
      const { error } = await supabase.functions.invoke('verify-payment', {
        body: { reference: paymentReference }
      });

      if (error) throw error;

      await checkExistingSubscription();
      toast({ title: "Payment verified successfully!" });
    } catch (error) {
      console.error('Verification error:', error);
      toast({ 
        title: "Verification Error", 
        description: "Failed to verify payment",
        variant: "destructive"
      });
    } finally {
      setVerifying(false);
    }
  };

  if (subscriptionStatus === 'active') {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-green-800">Active Subscription</CardTitle>
          <CardDescription className="text-green-600">
            You have access to all premium content from this creator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center space-x-4 p-4 bg-white rounded-lg">
            <Avatar className="w-12 h-12">
              <AvatarImage src={creator.profile_picture_url} />
              <AvatarFallback>
                {creator.nickname?.[0] || 'C'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{creator.nickname || 'Creator'}</p>
              <Badge className="bg-green-100 text-green-800">
                <Crown className="h-3 w-3 mr-1" />
                Premium Access
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-luxury rounded-full flex items-center justify-center mb-4">
          <Star className="h-8 w-8 text-white" />
        </div>
        <CardTitle>Subscribe to Premium Content</CardTitle>
        <CardDescription>
          Get unlimited access to exclusive content from {creator.nickname || 'this creator'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
          <Avatar className="w-12 h-12">
            <AvatarImage src={creator.profile_picture_url} />
            <AvatarFallback>
              {creator.nickname?.[0] || 'C'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">{creator.nickname || 'Creator'}</p>
            {creator.bio && (
              <p className="text-sm text-muted-foreground">{creator.bio}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Subscription Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10.00"
            />
          </div>

          <div className="bg-primary/5 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-primary">What you get:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Unlimited access to premium content</li>
              <li>• Support your favorite creator</li>
              <li>• Early access to new releases</li>
              <li>• Exclusive behind-the-scenes content</li>
            </ul>
          </div>

          {subscriptionStatus === 'pending' ? (
            <div className="space-y-3">
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-center mb-2">
                  <Loader2 className="h-6 w-6 animate-spin text-yellow-600" />
                </div>
                <p className="text-yellow-800 font-medium">Payment Pending</p>
                <p className="text-yellow-600 text-sm">
                  Complete your payment in the opened window
                </p>
              </div>
              
              {paymentReference && (
                <Button 
                  onClick={verifyPayment} 
                  disabled={verifying}
                  variant="outline"
                  className="w-full"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Payment"
                  )}
                </Button>
              )}
            </div>
          ) : (
            <Button 
              onClick={handleSubscribe} 
              disabled={loading || !user}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Subscribe for ${amount}
                </>
              )}
            </Button>
          )}

          {!user && (
            <p className="text-sm text-center text-muted-foreground">
              Please log in to subscribe to this creator
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};