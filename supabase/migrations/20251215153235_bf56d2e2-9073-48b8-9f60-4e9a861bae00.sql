-- Create installation_guides table
CREATE TABLE public.installation_guides (
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
ALTER TABLE public.installation_guides ENABLE ROW LEVEL SECURITY;

-- Create policies for installation guides (same pattern as solutions)
CREATE POLICY "Anyone can view installation guides"
ON public.installation_guides
FOR SELECT
USING (true);

CREATE POLICY "Approved users can create installation guides"
ON public.installation_guides
FOR INSERT
WITH CHECK (is_approved(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own installation guides"
ON public.installation_guides
FOR UPDATE
USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own installation guides"
ON public.installation_guides
FOR DELETE
USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_installation_guides_updated_at
BEFORE UPDATE ON public.installation_guides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();