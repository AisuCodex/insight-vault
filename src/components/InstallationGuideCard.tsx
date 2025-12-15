import { useState } from "react";
import { Trash2, Edit2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface InstallationGuideCardProps {
  id: string;
  title: string;
  description: string;
  steps: string;
  imageUrl?: string | null;
  createdAt: string;
  searchQuery?: string;
  onEdit?: () => void;
  onDelete?: () => void;
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

const InstallationGuideCard = ({
  id,
  title,
  description,
  steps,
  imageUrl,
  createdAt,
  searchQuery = "",
  onEdit,
  onDelete,
}: InstallationGuideCardProps) => {
  const [imageOpen, setImageOpen] = useState(false);
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const canModify = onEdit || onDelete;

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const stepsArray = steps.split('\n').filter(step => step.trim());

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
        
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          {highlightText(description, searchQuery)}
        </p>

        {/* Steps Section */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStepsExpanded(!stepsExpanded)}
            className="w-full justify-between text-sm font-medium text-foreground/80 hover:text-foreground"
          >
            <span>Installation Steps ({stepsArray.length})</span>
            {stepsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          
          {stepsExpanded && (
            <div className="mt-3 space-y-2 pl-2 border-l-2 border-primary/30">
              {stepsArray.map((step, index) => (
                <div key={index} className="flex gap-2 text-sm">
                  <span className="text-primary font-medium">{index + 1}.</span>
                  <span className="text-muted-foreground">{highlightText(step, searchQuery)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {canModify && (
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {onEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onEdit}
                className="flex-1 h-9"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onDelete}
                className="h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallationGuideCard;
