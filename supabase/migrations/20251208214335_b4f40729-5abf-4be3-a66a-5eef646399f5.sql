-- Create solutions table for knowledge base entries
CREATE TABLE public.solutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public access for this knowledge base)
ALTER TABLE public.solutions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all solutions
CREATE POLICY "Anyone can view solutions" 
ON public.solutions 
FOR SELECT 
USING (true);

-- Allow public insert access
CREATE POLICY "Anyone can create solutions" 
ON public.solutions 
FOR INSERT 
WITH CHECK (true);

-- Allow public update access
CREATE POLICY "Anyone can update solutions" 
ON public.solutions 
FOR UPDATE 
USING (true);

-- Allow public delete access
CREATE POLICY "Anyone can delete solutions" 
ON public.solutions 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_solutions_updated_at
BEFORE UPDATE ON public.solutions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for solution images
INSERT INTO storage.buckets (id, name, public) VALUES ('solution-images', 'solution-images', true);

-- Allow public read access to images
CREATE POLICY "Public can view solution images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'solution-images');

-- Allow public upload to images
CREATE POLICY "Public can upload solution images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'solution-images');

-- Allow public delete images
CREATE POLICY "Public can delete solution images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'solution-images');