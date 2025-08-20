import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const PaymentCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      const txRef = searchParams.get('tx_ref');
      const flwRef = searchParams.get('transaction_id');
      
      if (!txRef) {
        setStatus('failed');
        setMessage('No transaction reference found');
        return;
      }

      // Verify payment with our backend
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { reference: txRef }
      });

      if (error) throw error;

      if (data?.success) {
        setStatus('success');
        setMessage('Payment successful! You now have access to premium content.');
        toast({
          title: "Payment Successful!",
          description: "Welcome to premium content access.",
        });
      } else {
        setStatus('failed');
        setMessage('Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setMessage('Failed to verify payment');
      toast({
        title: "Verification Error",
        description: "There was an issue verifying your payment.",
        variant: "destructive",
      });
    }
  };

  const handleContinue = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-luxury/5 flex items-center justify-center">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4">
                {status === 'loading' && (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                )}
                {status === 'success' && (
                  <div className="bg-green-100 w-full h-full rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                )}
                {status === 'failed' && (
                  <div className="bg-red-100 w-full h-full rounded-full flex items-center justify-center">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                )}
              </div>
              <CardTitle className={`
                ${status === 'loading' ? 'text-primary' : ''}
                ${status === 'success' ? 'text-green-800' : ''}
                ${status === 'failed' ? 'text-red-800' : ''}
              `}>
                {status === 'loading' && 'Verifying Payment...'}
                {status === 'success' && 'Payment Successful!'}
                {status === 'failed' && 'Payment Failed'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                {message || (status === 'loading' ? 'Please wait while we verify your payment...' : '')}
              </p>
              
              {status !== 'loading' && (
                <Button onClick={handleContinue} className="w-full">
                  Continue to Dashboard
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentCallback;