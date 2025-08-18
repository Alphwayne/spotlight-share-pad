import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();

    // Generate reset token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create reset link
    const resetUrl = `${Deno.env.get("SUPABASE_URL")}/auth/v1/verify?token=${token}&type=recovery&redirect_to=${encodeURIComponent(`${req.headers.get("origin")}/auth?tab=reset-password`)}`;

    const emailResponse = await resend.emails.send({
      from: "Dirty Desire <noreply@dirtydesire.app>",
      to: [email],
      subject: "Reset Your Dirty Desire Password",
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Dirty Desire</h1>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            <h2 style="color: #333;">Reset Your Password</h2>
            <p style="color: #666; line-height: 1.6;">
              We received a request to reset your password for your Dirty Desire account.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p style="color: #999; font-size: 14px;">
              This link will expire in 24 hours. If you didn't request this reset, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Password reset email sent:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Password reset email sent successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);