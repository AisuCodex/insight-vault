-- Create upgrades table for storing upgrade procedures
CREATE TABLE public.upgrades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  steps TEXT NOT NULL,
  image_url TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.upgrades ENABLE ROW LEVEL SECURITY;

-- Create policies for upgrades (using correct function parameter order: user_id, role)
CREATE POLICY "Anyone can view upgrades" 
ON public.upgrades 
FOR SELECT 
USING (true);

CREATE POLICY "Approved users can create upgrades" 
ON public.upgrades 
FOR INSERT 
WITH CHECK (
  public.is_approved(auth.uid()) = true OR 
  public.has_role(auth.uid(), 'admin'::app_role) = true
);

CREATE POLICY "Users can update own upgrades or admin" 
ON public.upgrades 
FOR UPDATE 
USING (
  user_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin'::app_role) = true
);

CREATE POLICY "Users can delete own upgrades or admin" 
ON public.upgrades 
FOR DELETE 
USING (
  user_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin'::app_role) = true
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_upgrades_updated_at
BEFORE UPDATE ON public.upgrades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();