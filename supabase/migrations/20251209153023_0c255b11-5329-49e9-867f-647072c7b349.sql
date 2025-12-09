-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can create solutions" ON public.solutions;
DROP POLICY IF EXISTS "Anyone can delete solutions" ON public.solutions;
DROP POLICY IF EXISTS "Anyone can update solutions" ON public.solutions;
DROP POLICY IF EXISTS "Anyone can view solutions" ON public.solutions;

-- Create new secure policies
-- Anyone can view solutions (public knowledge base)
CREATE POLICY "Anyone can view solutions" 
ON public.solutions 
FOR SELECT 
USING (true);

-- Only authenticated users can create solutions
CREATE POLICY "Authenticated users can create solutions" 
ON public.solutions 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Only authenticated users can update solutions
CREATE POLICY "Authenticated users can update solutions" 
ON public.solutions 
FOR UPDATE 
TO authenticated
USING (true);

-- Only authenticated users can delete solutions
CREATE POLICY "Authenticated users can delete solutions" 
ON public.solutions 
FOR DELETE 
TO authenticated
USING (true);