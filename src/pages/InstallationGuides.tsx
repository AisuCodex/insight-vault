import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Zap, LogOut, Shield, User as UserIcon, BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import InstallationGuideCard from "@/components/InstallationGuideCard";
import InstallationGuideForm from "@/components/InstallationGuideForm";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutConfirmDialog from "@/components/LogoutConfirmDialog";

interface InstallationGuide {
  id: string;
  title: string;
  description: string;
  steps: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

const InstallationGuides = () => {
  const [guides, setGuides] = useState<InstallationGuide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<InstallationGuide | null>(null);
  const [deletingGuide, setDeletingGuide] = useState<InstallationGuide | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile, isAdmin, isApproved, isLoading: authLoading, signOut } = useAuth();

  // Redirect pending users
  useEffect(() => {
    if (!authLoading && user && profile && !isApproved && !isAdmin) {
      navigate("/pending");
    }
  }, [user, profile, isApproved, isAdmin, authLoading, navigate]);

  const fetchGuides = async () => {
    try {
      const { data, error } = await supabase
        .from('installation_guides')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGuides(data || []);
    } catch (error: any) {
      console.error('Error fetching installation guides:', error);
      toast({
        title: "Error",
        description: "Failed to load installation guides.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, []);

  const filteredGuides = useMemo(() => {
    if (!searchQuery.trim()) return guides;
    
    const query = searchQuery.toLowerCase();
    return guides.filter(
      (g) =>
        g.title.toLowerCase().includes(query) ||
        g.description.toLowerCase().includes(query) ||
        g.steps.toLowerCase().includes(query)
    );
  }, [guides, searchQuery]);

  const handleAddGuide = async (data: { title: string; description: string; steps: string; imageUrl: string | null }) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add installation guides.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('installation_guides')
        .insert({
          title: data.title,
          description: data.description,
          steps: data.steps,
          image_url: data.imageUrl,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Installation guide added successfully.",
      });
      setIsFormOpen(false);
      fetchGuides();
    } catch (error: any) {
      console.error('Error adding installation guide:', error);
      toast({
        title: "Error",
        description: "Failed to add installation guide.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateGuide = async (data: { title: string; description: string; steps: string; imageUrl: string | null }) => {
    if (!editingGuide) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('installation_guides')
        .update({
          title: data.title,
          description: data.description,
          steps: data.steps,
          image_url: data.imageUrl,
        })
        .eq('id', editingGuide.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Installation guide updated successfully.",
      });
      setEditingGuide(null);
      fetchGuides();
    } catch (error: any) {
      console.error('Error updating installation guide:', error);
      toast({
        title: "Error",
        description: "Failed to update installation guide.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGuide = async () => {
    if (!deletingGuide) return;
    
    try {
      const { error } = await supabase
        .from('installation_guides')
        .delete()
        .eq('id', deletingGuide.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Installation guide deleted successfully.",
      });
      setDeletingGuide(null);
      fetchGuides();
    } catch (error: any) {
      console.error('Error deleting installation guide:', error);
      toast({
        title: "Error",
        description: "Failed to delete installation guide.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const canModifyGuide = (guide: InstallationGuide) => {
    if (!user) return false;
    if (isAdmin) return true;
    return guide.user_id === user.id;
  };

  const canAddGuide = user && (isApproved || isAdmin);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">
                Installation Guides
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Solutions
              </Button>
              <ThemeToggle />
              {user ? (
                <>
                  {isAdmin && (
                    <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  )}
                  {canAddGuide && (
                    <Button onClick={() => setIsFormOpen(true)} className="h-10 px-4">
                      <Plus className="w-4 h-4 mr-2" />
                      New Guide
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setShowLogoutConfirm(true)}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button onClick={() => navigate("/auth")} className="h-10 px-4">
                  <UserIcon className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Search */}
          <div className="max-w-md">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search installation guides..."
            />
          </div>

          {/* Results Count */}
          {!isLoading && guides.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {filteredGuides.length === guides.length
                ? `${guides.length} guide${guides.length !== 1 ? 's' : ''}`
                : `${filteredGuides.length} of ${guides.length} guides`}
            </p>
          )}

          {/* Guides Grid */}
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
          ) : guides.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No installation guides yet</h3>
              <p className="text-muted-foreground mb-6">
                Add step-by-step installation instructions for RTL software and tools.
              </p>
              {canAddGuide && (
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Guide
                </Button>
              )}
            </div>
          ) : filteredGuides.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No installation guides match your search.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredGuides.map((guide, index) => (
                <div
                  key={guide.id}
                  className="animate-fade-in transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <InstallationGuideCard
                    id={guide.id}
                    title={guide.title}
                    description={guide.description}
                    steps={guide.steps}
                    imageUrl={guide.image_url}
                    createdAt={guide.created_at}
                    searchQuery={searchQuery}
                    onEdit={canModifyGuide(guide) ? () => setEditingGuide(guide) : undefined}
                    onDelete={canModifyGuide(guide) ? () => setDeletingGuide(guide) : undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Guide Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Installation Guide</DialogTitle>
          </DialogHeader>
          <InstallationGuideForm
            onSubmit={handleAddGuide}
            onCancel={() => setIsFormOpen(false)}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Guide Dialog */}
      <Dialog open={!!editingGuide} onOpenChange={() => setEditingGuide(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Installation Guide</DialogTitle>
          </DialogHeader>
          {editingGuide && (
            <InstallationGuideForm
              initialData={{
                id: editingGuide.id,
                title: editingGuide.title,
                description: editingGuide.description,
                steps: editingGuide.steps,
                imageUrl: editingGuide.image_url,
              }}
              onSubmit={handleUpdateGuide}
              onCancel={() => setEditingGuide(null)}
              isLoading={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingGuide} onOpenChange={() => setDeletingGuide(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Installation Guide</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingGuide?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGuide}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LogoutConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        onConfirm={handleSignOut}
      />
    </div>
  );
};

export default InstallationGuides;
