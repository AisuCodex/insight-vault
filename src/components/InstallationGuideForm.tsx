import { useState, useRef } from "react";
import { X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface InstallationGuideFormProps {
  initialData?: {
    id: string;
    title: string;
    description: string;
    steps: string;
    imageUrl?: string | null;
  };
  onSubmit: (data: { title: string; description: string; steps: string; imageUrl: string | null }) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

const InstallationGuideForm = ({ initialData, onSubmit, onCancel, isLoading }: InstallationGuideFormProps) => {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [steps, setSteps] = useState(initialData?.steps || "");
  const [imageUrl, setImageUrl] = useState<string | null>(initialData?.imageUrl || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return imageUrl;
    
    setUploading(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('solution-images')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('solution-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const uploadedImageUrl = await uploadImage();
      await onSubmit({ title, description, steps, imageUrl: uploadedImageUrl });
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          Title
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., RTL 8 Installation Guide"
          className="h-11"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief overview of what this installation guide covers..."
          className="min-h-[80px] resize-none"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="steps" className="text-sm font-medium">
          Installation Steps (one per line)
        </Label>
        <Textarea
          id="steps"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder="Download the installer from the official website&#10;Run the setup.exe file&#10;Accept the license agreement&#10;Choose installation directory&#10;Click Install and wait for completion"
          className="min-h-[150px] resize-none font-mono text-sm"
          required
        />
        <p className="text-xs text-muted-foreground">
          Enter each step on a new line. They will be numbered automatically.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Screenshot (Optional)</Label>
        
        {imagePreview ? (
          <div className="relative rounded-xl overflow-hidden border border-border bg-muted">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-48 object-cover"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
              onClick={removeImage}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all duration-200"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Click to upload a screenshot
              </p>
              <p className="text-xs text-muted-foreground/70">
                PNG, JPG up to 10MB
              </p>
            </div>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="flex-1 h-11"
          disabled={isLoading || uploading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 h-11"
          disabled={isLoading || uploading || !title.trim() || !description.trim() || !steps.trim()}
        >
          {(isLoading || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {initialData ? "Update" : "Add"} Guide
        </Button>
      </div>
    </form>
  );
};

export default InstallationGuideForm;
