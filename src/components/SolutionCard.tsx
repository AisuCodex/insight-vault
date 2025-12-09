import { useState } from "react";
import { Trash2, Edit2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface SolutionCardProps {
  id: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  createdAt: string;
  searchQuery?: string;
  onEdit: () => void;
  onDelete: () => void;
}

const highlightText = (text: string, query: string) => {
  if (!query.trim()) return text;
  
  const words = query.trim().split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return text;
  
  const regex = new RegExp(`(${words.join('|')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => {
    const isMatch = words.some(word => 
      part.toLowerCase() === word.toLowerCase()
    );
    return isMatch ? (
      <mark key={i} className="bg-primary/20 text-primary rounded px-0.5">
        {part}
      </mark>
    ) : part;
  });
};

const SolutionCard = ({
  id,
  title,
  description,
  imageUrl,
  createdAt,
  searchQuery = "",
  onEdit,
  onDelete,
}: SolutionCardProps) => {
  const [imageOpen, setImageOpen] = useState(false);

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="group glass-panel rounded-2xl overflow-hidden hover-lift">
      {imageUrl && (
        <Dialog open={imageOpen} onOpenChange={setImageOpen}>
          <DialogTrigger asChild>
            <div className="relative h-48 overflow-hidden cursor-pointer">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                <span className="text-xs text-foreground/70 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  Click to expand
                </span>
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-auto rounded-lg"
            />
          </DialogContent>
        </Dialog>
      )}
      
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-lg leading-tight text-foreground">
            {highlightText(title, searchQuery)}
          </h3>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formattedDate}
          </span>
        </div>
        
        <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">
          {highlightText(description, searchQuery)}
        </p>
        
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="secondary"
            size="sm"
            onClick={onEdit}
            className="flex-1 h-9"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onDelete}
            className="h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SolutionCard;
