
ALTER TABLE public.deals ADD COLUMN is_approved boolean NOT NULL DEFAULT false;

-- Update existing deals to be approved (they were created by admin)
UPDATE public.deals SET is_approved = true;

-- Allow authenticated users to insert deals
CREATE POLICY "Authenticated users can submit deals"
ON public.deals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view own deals (even unapproved)
CREATE POLICY "Users can view own deals"
ON public.deals FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Update the existing select policy to require is_approved
DROP POLICY IF EXISTS "Approved users can view active deals" ON public.deals;
CREATE POLICY "Approved users can view active approved deals"
ON public.deals FOR SELECT
TO public
USING (is_active = true AND is_approved = true AND is_approved_user(auth.uid()));
