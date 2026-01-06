import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, LogOut, Shield, User as UserIcon, ArrowUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import UpgradeCard from "@/components/UpgradeCard";
import UpgradeForm from "@/components/UpgradeForm";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutConfirmDialog from "@/components/LogoutConfirmDialog";

interface Upgrade {
  id: string;
  title: string;
  description: string;
  steps: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

const Upgrades = () => {
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUpgrade, setEditingUpgrade] = useState<Upgrade | null>(null);
  const [deletingUpgrade, setDeletingUpgrade] = useState<Upgrade | null>(null);
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

  const fetchUpgrades = async () => {
    try {
      const { data, error } = await supabase
        .from('upgrades')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUpgrades(data || []);
    } catch (error: any) {
      console.error('Error fetching upgrades:', error);
      toast({
        title: "Error",
        description: "Failed to load upgrades.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUpgrades();
  }, []);

  const filteredUpgrades = useMemo(() => {
    if (!searchQuery.trim()) return upgrades;
    
    const query = searchQuery.toLowerCase();
    return upgrades.filter(
      (u) =>
        u.title.toLowerCase().includes(query) ||
        u.description.toLowerCase().includes(query) ||
        u.steps.toLowerCase().includes(query)
    );
  }, [upgrades, searchQuery]);

  const handleAddUpgrade = async (data: { title: string; description: string; steps: string; imageUrl: string | null }) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add upgrades.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('upgrades')
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
        description: "Upgrade added successfully.",
      });
      setIsFormOpen(false);
      fetchUpgrades();
    } catch (error: any) {
      console.error('Error adding upgrade:', error);
      toast({
        title: "Error",
        description: "Failed to add upgrade.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUpgrade = async (data: { title: string; description: string; steps: string; imageUrl: string | null }) => {
    if (!editingUpgrade) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('upgrades')
        .update({
          title: data.title,
          description: data.description,
          steps: data.steps,
          image_url: data.imageUrl,
        })
        .eq('id', editingUpgrade.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Upgrade updated successfully.",
      });
      setEditingUpgrade(null);
      fetchUpgrades();
    } catch (error: any) {
      console.error('Error updating upgrade:', error);
      toast({
        title: "Error",
        description: "Failed to update upgrade.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUpgrade = async () => {
    if (!deletingUpgrade) return;
    
    try {
      const { error } = await supabase
        .from('upgrades')
        .delete()
        .eq('id', deletingUpgrade.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Upgrade deleted successfully.",
      });
      setDeletingUpgrade(null);
      fetchUpgrades();
    } catch (error: any) {
      console.error('Error deleting upgrade:', error);
      toast({
        title: "Error",
        description: "Failed to delete upgrade.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const canModifyUpgrade = (upgrade: Upgrade) => {
    if (!user) return false;
    if (isAdmin) return true;
    return upgrade.user_id === user.id;
  };

  const canAddUpgrade = user && (isApproved || isAdmin);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <ArrowUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">
                Upgrades
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
                  {canAddUpgrade && (
                    <Button onClick={() => setIsFormOpen(true)} className="h-10 px-4">
                      <Plus className="w-4 h-4 mr-2" />
                      New Upgrade
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
              placeholder="Search upgrades..."
            />
          </div>

          {/* Results Count */}
          {!isLoading && upgrades.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {filteredUpgrades.length === upgrades.length
                ? `${upgrades.length} upgrade${upgrades.length !== 1 ? 's' : ''}`
                : `${filteredUpgrades.length} of ${upgrades.length} upgrades`}
            </p>
          )}

          {/* Upgrades Grid */}
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
          ) : upgrades.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <ArrowUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No upgrades yet</h3>
              <p className="text-muted-foreground mb-6">
                Add step-by-step upgrade procedures for RTL software versions.
              </p>
              {canAddUpgrade && (
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Upgrade
                </Button>
              )}
            </div>
          ) : filteredUpgrades.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No upgrades match your search.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredUpgrades.map((upgrade, index) => (
                <div
                  key={upgrade.id}
                  className="animate-fade-in transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <UpgradeCard
                    id={upgrade.id}
                    title={upgrade.title}
                    description={upgrade.description}
                    steps={upgrade.steps}
                    imageUrl={upgrade.image_url}
                    createdAt={upgrade.created_at}
                    searchQuery={searchQuery}
                    onEdit={canModifyUpgrade(upgrade) ? () => setEditingUpgrade(upgrade) : undefined}
                    onDelete={canModifyUpgrade(upgrade) ? () => setDeletingUpgrade(upgrade) : undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Upgrade Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Upgrade</DialogTitle>
          </DialogHeader>
          <UpgradeForm
            onSubmit={handleAddUpgrade}
            onCancel={() => setIsFormOpen(false)}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Upgrade Dialog */}
      <Dialog open={!!editingUpgrade} onOpenChange={() => setEditingUpgrade(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Upgrade</DialogTitle>
          </DialogHeader>
          {editingUpgrade && (
            <UpgradeForm
              initialData={{
                id: editingUpgrade.id,
                title: editingUpgrade.title,
                description: editingUpgrade.description,
                steps: editingUpgrade.steps,
                imageUrl: editingUpgrade.image_url,
              }}
              onSubmit={handleUpdateUpgrade}
              onCancel={() => setEditingUpgrade(null)}
              isLoading={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUpgrade} onOpenChange={() => setDeletingUpgrade(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Upgrade</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingUpgrade?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUpgrade}
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

export default Upgrades;
