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

    // Initialize Payaza payment
    const payazaResponse = await fetch("https://api.payaza.africa/live/checkout", {
      method: "POST",
      headers: {
        "Authorization": `Payaza ${Deno.env.get("PAYAZA_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service_type: "Account",
        service_payload: {
          first_name: user.user_metadata?.first_name || "User",
          last_name: user.user_metadata?.last_name || "Subscriber",
          email_address: user.email,
          phone_number: user.user_metadata?.phone || "",
          amount: amount,
          transaction_reference: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          currency: "NGN",
          callback_url: `${req.headers.get("origin")}/payment-callback`,
        },
      }),
    });

    const payazaData = await payazaResponse.json();

    if (!payazaData.success) {
      throw new Error("Failed to create payment session");
    }

    // Create pending subscription
    const { data: subscription } = await supabaseClient
      .from('subscriptions')
      .insert({
        owner_id,
        subscriber_id: subscriberProfile.id,
        amount_paid: amount,
        payment_reference: payazaData.data.reference,
        status: 'pending'
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({ 
        checkout_url: payazaData.data.checkout_url,
        subscription_id: subscription?.id,
        reference: payazaData.data.reference
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