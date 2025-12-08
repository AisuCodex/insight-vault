import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onAddNew: () => void;
}

const EmptyState = ({ onAddNew }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
      <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
        <FileText className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        No solutions yet
      </h3>
      <p className="text-muted-foreground text-center max-w-sm mb-6">
        Start building your knowledge base by adding your first solution with screenshots and descriptions.
      </p>
      <Button onClick={onAddNew} className="h-11 px-6">
        <Plus className="w-4 h-4 mr-2" />
        Add Your First Solution
      </Button>
    </div>
  );
};

export default EmptyState;
