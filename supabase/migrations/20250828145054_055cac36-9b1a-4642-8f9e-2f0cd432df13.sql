-- Enable RLS on all public tables that don't have it
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;