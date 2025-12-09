import { useState, useEffect, useMemo } from "react";
import { Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SolutionCard from "@/components/SolutionCard";
import SolutionForm from "@/components/SolutionForm";
import SearchBar from "@/components/SearchBar";
import AIQueryPanel from "@/components/AIQueryPanel";
import EmptyState from "@/components/EmptyState";
import ThemeToggle from "@/components/ThemeToggle";

interface Solution {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

const Index = () => {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSolution, setEditingSolution] = useState<Solution | null>(null);
  const [deletingSolution, setDeletingSolution] = useState<Solution | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchSolutions = async () => {
    try {
      const { data, error } = await supabase
        .from('solutions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSolutions(data || []);
    } catch (error: any) {
      console.error('Error fetching solutions:', error);
      toast({
        title: "Error",
        description: "Failed to load solutions.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSolutions();
  }, []);

  const filteredSolutions = useMemo(() => {
    if (!searchQuery.trim()) return solutions;
    
    const query = searchQuery.toLowerCase();
    return solutions.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
    );
  }, [solutions, searchQuery]);

  const handleAddSolution = async (data: { title: string; description: string; imageUrl: string | null }) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('solutions')
        .insert({
          title: data.title,
          description: data.description,
          image_url: data.imageUrl,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Solution added successfully.",
      });
      setIsFormOpen(false);
      fetchSolutions();
    } catch (error: any) {
      console.error('Error adding solution:', error);
      toast({
        title: "Error",
        description: "Failed to add solution.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSolution = async (data: { title: string; description: string; imageUrl: string | null }) => {
    if (!editingSolution) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('solutions')
        .update({
          title: data.title,
          description: data.description,
          image_url: data.imageUrl,
        })
        .eq('id', editingSolution.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Solution updated successfully.",
      });
      setEditingSolution(null);
      fetchSolutions();
    } catch (error: any) {
      console.error('Error updating solution:', error);
      toast({
        title: "Error",
        description: "Failed to update solution.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSolution = async () => {
    if (!deletingSolution) return;
    
    try {
      const { error } = await supabase
        .from('solutions')
        .delete()
        .eq('id', deletingSolution.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Solution deleted successfully.",
      });
      setDeletingSolution(null);
      fetchSolutions();
    } catch (error: any) {
      console.error('Error deleting solution:', error);
      toast({
        title: "Error",
        description: "Failed to delete solution.",
        variant: "destructive",
      });
    }
  };

  const handleSelectSolution = (id: string) => {
    const element = document.getElementById(`solution-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">
                RTL SnapSolve
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button onClick={() => setIsFormOpen(true)} className="h-10 px-4">
                <Plus className="w-4 h-4 mr-2" />
                New Solution
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Search & AI Panel */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by title or description..."
              />
            </div>
            <div className="md:col-span-1">
              <AIQueryPanel onSelectSolution={handleSelectSolution} />
            </div>
          </div>

          {/* Results Count */}
          {!isLoading && solutions.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {filteredSolutions.length === solutions.length
                ? `${solutions.length} solution${solutions.length !== 1 ? 's' : ''}`
                : `${filteredSolutions.length} of ${solutions.length} solutions`}
            </p>
          )}

          {/* Solutions Grid */}
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-panel rounded-2xl overflow-hidden">
                  <div className="h-48 bg-muted animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-muted rounded animate-pulse w-3/4" />
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded animate-pulse" />
                      <div className="h-3 bg-muted rounded animate-pulse w-5/6" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : solutions.length === 0 ? (
            <EmptyState onAddNew={() => setIsFormOpen(true)} />
          ) : filteredSolutions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No solutions match your search.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSolutions.map((solution, index) => (
                <div
                  key={solution.id}
                  id={`solution-${solution.id}`}
                  className="animate-fade-in transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <SolutionCard
                    id={solution.id}
                    title={solution.title}
                    description={solution.description}
                    imageUrl={solution.image_url}
                    createdAt={solution.created_at}
                    searchQuery={searchQuery}
                    onEdit={() => setEditingSolution(solution)}
                    onDelete={() => setDeletingSolution(solution)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Solution Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Solution</DialogTitle>
          </DialogHeader>
          <SolutionForm
            onSubmit={handleAddSolution}
            onCancel={() => setIsFormOpen(false)}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Solution Dialog */}
      <Dialog open={!!editingSolution} onOpenChange={() => setEditingSolution(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Solution</DialogTitle>
          </DialogHeader>
          {editingSolution && (
            <SolutionForm
              initialData={{
                id: editingSolution.id,
                title: editingSolution.title,
                description: editingSolution.description,
                imageUrl: editingSolution.image_url,
              }}
              onSubmit={handleUpdateSolution}
              onCancel={() => setEditingSolution(null)}
              isLoading={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingSolution} onOpenChange={() => setDeletingSolution(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Solution</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSolution?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSolution}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
