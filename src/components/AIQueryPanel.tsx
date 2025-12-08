import { useState } from "react";
import { Sparkles, Send, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Solution {
  id: string;
  title: string;
  description: string;
  image_url?: string | null;
}

interface AIQueryPanelProps {
  onSelectSolution: (id: string) => void;
}

const AIQueryPanel = ({ onSelectSolution }: AIQueryPanelProps) => {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<{
    answer: string;
    relevantSolutions: Solution[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: { query: query.trim() }
      });

      if (error) throw error;

      setResponse(data);
      setIsExpanded(true);
    } catch (error: any) {
      console.error('AI search error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-foreground">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Ask questions about your solutions</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-4 animate-fade-in">
          <div className="relative">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., How do I fix the printer not connecting?"
              className="min-h-[80px] pr-12 resize-none rounded-xl"
              disabled={isLoading}
            />
            <Button
              onClick={handleSubmit}
              disabled={!query.trim() || isLoading}
              size="icon"
              className="absolute bottom-2 right-2 h-8 w-8 rounded-lg"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          {response && (
            <div className="space-y-4 animate-scale-in">
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {response.answer}
                </p>
              </div>

              {response.relevantSolutions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Related Solutions
                  </p>
                  <div className="space-y-2">
                    {response.relevantSolutions.map((solution) => (
                      <button
                        key={solution.id}
                        onClick={() => onSelectSolution(solution.id)}
                        className="w-full p-3 text-left rounded-lg bg-background border border-border hover:border-primary/50 hover:bg-muted/30 transition-all duration-200"
                      >
                        <p className="font-medium text-sm text-foreground">
                          {solution.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {solution.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIQueryPanel;
