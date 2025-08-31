import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, UserPlus } from "lucide-react";
import ddLogo from "@/assets/dirty-desire-abstract.png"; 

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "signin");

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkAuth();
  }, [navigate]);

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Welcome back!");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Please check your email to confirm your account!");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetLoading) return;
    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?tab=reset-password`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password reset email sent! Check your inbox.");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setResetLoading(false);
    }
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password updated successfully!");
      navigate("/");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-950">
      {/* Aurora background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-rose-800 to-gray-900">
        <div className="absolute inset-0 animate-aurora opacity-40" />
      </div>

      <Card className="w-full max-w-md bg-black/60 backdrop-blur-2xl border border-rose-600/30 shadow-2xl relative overflow-hidden rounded-2xl">
        {/* Neon glow border */}
        <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-rose-600 via-purple-500 to-rose-600 animate-border" />

        <CardHeader className="text-center relative z-10 pb-6">
          <img
            src={ddLogo}
            alt="Dirty Desire Logo"
            className="w-24 h-24 mx-auto object-contain drop-shadow-lg"
          />
          <CardTitle className="text-4xl font-extrabold bg-gradient-to-r from-rose-300 to-purple-300 bg-clip-text text-transparent tracking-wider mt-4">
            Dirty Desire
          </CardTitle>
          <CardDescription className="text-rose-200/70 mt-2">
            Unlock exclusive content
          </CardDescription>
        </CardHeader>

        <CardContent className="relative z-10 mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-black/40 p-1 rounded-lg border border-rose-600/20 backdrop-blur">
              {["signin", "signup", "forgot"].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-md transition-all duration-300 text-rose-200/80"
                >
                  {tab === "signin" ? "Sign In" : tab === "signup" ? "Sign Up" : "Reset"}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Sign In */}
            <TabsContent value="signin" className="space-y-4 pt-6 animate-fadein">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="signin-email" className="text-rose-100/90 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email
                  </Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-glow"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="signin-password" className="text-rose-100/90 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="input-glow pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 text-rose-400 hover:text-rose-200"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="btn-neon" disabled={loading}>
                  {loading ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up */}
            <TabsContent value="signup" className="space-y-4 pt-6 animate-fadein">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="signup-email" className="text-rose-100/90 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-glow"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="signup-password" className="text-rose-100/90 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Password
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-glow"
                  />
                </div>
                <Button type="submit" className="btn-neon flex items-center gap-2" disabled={loading}>
                  <UserPlus className="w-4 h-4" />
                  {loading ? "Creating..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>

            {/* Reset */}
            <TabsContent value="forgot" className="space-y-4 pt-6 animate-fadein">
              <form onSubmit={handlePasswordReset} className="space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="reset-email" className="text-rose-100/90 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="input-glow"
                  />
                </div>
                <Button type="submit" className="btn-neon" disabled={resetLoading}>
                  {resetLoading ? "Sending..." : "Send Reset Email"}
                </Button>
              </form>
            </TabsContent>

            {/* New Password */}
            <TabsContent value="reset-password" className="space-y-4 pt-6 animate-fadein">
              <form onSubmit={handleNewPassword} className="space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="new-password" className="text-rose-100/90 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> New Password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="input-glow"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="confirm-password" className="text-rose-100/90 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Confirm Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="input-glow"
                  />
                </div>
                <Button type="submit" className="btn-neon" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Custom animations & effects */}
      <style>{`
        @keyframes aurora {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-aurora {
          background: linear-gradient(270deg, #ff007f, #9b5de5, #00bbf9, #f15bb5);
          background-size: 600% 600%;
          animation: aurora 30s ease infinite;
        }
        .animate-border {
          background-size: 200% 200%;
          animation: aurora 12s linear infinite;
          mask: linear-gradient(white, white) content-box, linear-gradient(white, white);
          -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white);
          mask-composite: exclude;
          -webkit-mask-composite: destination-out;
        }
        .btn-neon {
          @apply w-full bg-gradient-to-r from-rose-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-rose-500/50 transition-all duration-300;
        }
        .btn-neon:hover {
          box-shadow: 0 0 20px rgba(244, 114, 182, 0.6), 0 0 40px rgba(168, 85, 247, 0.6);
        }
        .input-glow {
          @apply bg-black/50 border border-rose-600/40 text-rose-100 placeholder:text-rose-400 focus:ring-rose-500 rounded-md;
        }
        .input-glow:focus {
          box-shadow: 0 0 12px rgba(244, 114, 182, 0.4);
        }
        .animate-fadein {
          animation: fadeIn 0.6s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Auth;
