import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

interface SubscriptionSettingsProps {
  creatorId?: string; // If provided, sets for specific creator, otherwise global
}

export const SubscriptionSettings: React.FC<SubscriptionSettingsProps> = ({ creatorId }) => {
  const [subscriptionFee, setSubscriptionFee] = useState(10000); // Default 10,000 Naira
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSubscriptionFee();
  }, [creatorId]);

  const fetchSubscriptionFee = async () => {
    try {
      let query = supabase
        .from('subscription_settings')
        .select('amount');

      if (creatorId) {
        query = query.eq('creator_id', creatorId);
      } else {
        query = query.eq('is_global', true);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          // Use default value
          setSubscriptionFee(10000);
        } else {
          console.error('Error fetching subscription fee:', error);
        }
        return;
      }

      if (data) {
        setSubscriptionFee(data.amount);
      }
    } catch (error) {
      console.error('Error fetching subscription fee:', error);
    }
  };

  const saveSubscriptionFee = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('subscription_settings')
        .upsert({
          ...(creatorId && { creator_id: creatorId }),
          ...(!creatorId && { is_global: true }),
          amount: subscriptionFee,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({ title: "Subscription fee updated successfully!" });
    } catch (error) {
      console.error('Error saving subscription fee:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update subscription fee",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-rose-100">
      <CardHeader>
        <CardTitle className="text-gray-800">Subscription Settings</CardTitle>
        <CardDescription className="text-gray-600">
          {creatorId ? 'Set subscription fee for this creator' : 'Set default subscription fee'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subscription-fee" className="text-gray-700">Subscription Fee (Naira)</Label>
          <Input
            id="subscription-fee"
            type="number"
            value={subscriptionFee}
            onChange={(e) => setSubscriptionFee(Number(e.target.value))}
            min="1000"
            step="1000"
            className="border-rose-200 focus:ring-rose-500 focus:border-rose-500"
          />
          <p className="text-sm text-gray-600">
            Creators receive 70% of this amount (₦{(subscriptionFee * 0.7).toLocaleString()})
          </p>
        </div>
        <Button 
          onClick={saveSubscriptionFee} 
          disabled={loading}
          className="bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700"
        >
          {loading ? (
            <>Saving...</>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};