
-- Fix 1: Restrict professional_recommendations public phone exposure
-- Replace the anonymous-accessible policy with one requiring authentication
DROP POLICY IF EXISTS "Anyone can view approved recommendations" ON public.professional_recommendations;
CREATE POLICY "Authenticated users can view approved recommendations"
ON public.professional_recommendations
FOR SELECT
USING ((is_approved = true) AND (is_hidden = false) AND (auth.uid() IS NOT NULL));

-- Fix 2: Add RLS policies to telegram_bot_state (RLS is already enabled but no policies exist)
CREATE POLICY "Only admins can read telegram bot state"
ON public.telegram_bot_state
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update telegram bot state"
ON public.telegram_bot_state
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert telegram bot state"
ON public.telegram_bot_state
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
