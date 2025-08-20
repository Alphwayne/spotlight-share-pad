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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const { owner_id, amount } = await req.json();

    // Get subscriber profile
    const { data: subscriberProfile } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!subscriberProfile) {
      throw new Error("Subscriber profile not found");
    }

    // Initialize Flutterwave payment
    const transactionRef = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const flutterwaveResponse = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("FLUTTERWAVE_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: transactionRef,
        amount: amount,
        currency: "USD",
        redirect_url: `${req.headers.get("origin")}/payment-callback`,
        customer: {
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.first_name || "User",
        },
        customizations: {
          title: "Premium Content Subscription",
          description: "Monthly subscription to premium content",
          logo: "https://your-logo-url.com/logo.png"
        },
        meta: {
          owner_id: owner_id,
          subscriber_id: subscriberProfile.id
        }
      }),
    });

    const flutterwaveData = await flutterwaveResponse.json();

    if (flutterwaveData.status !== "success") {
      throw new Error("Failed to create payment session");
    }

    // Create pending subscription
    const { data: subscription } = await supabaseClient
      .from('subscriptions')
      .insert({
        owner_id,
        subscriber_id: subscriberProfile.id,
        amount_paid: amount,
        payment_reference: transactionRef,
        status: 'pending'
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({ 
        checkout_url: flutterwaveData.data.link,
        subscription_id: subscription?.id,
        reference: transactionRef
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Create subscription error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});