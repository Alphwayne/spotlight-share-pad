import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { reference } = await req.json();

    // Verify payment with Payaza
    const verifyResponse = await fetch(`https://api.payaza.africa/live/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        "Authorization": `Payaza ${Deno.env.get("PAYAZA_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
    });

    const verifyData = await verifyResponse.json();

    if (!verifyData.success || verifyData.data.status !== "successful") {
      throw new Error("Payment verification failed");
    }

    // Update subscription status
    const { data: subscription } = await supabaseService
      .from('subscriptions')
      .update({
        status: 'active',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      })
      .eq('payment_reference', reference)
      .select(`
        id,
        owner_id,
        subscriber_id,
        amount_paid
      `)
      .single();

    if (subscription) {
      // Create earnings record
      await supabaseService
        .from('earnings')
        .insert({
          owner_id: subscription.owner_id,
          subscription_id: subscription.id,
          amount: subscription.amount_paid,
          percentage_rate: 0.85, // 85% to creator, 15% platform fee
          status: 'completed'
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription_id: subscription?.id,
        status: 'active'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});