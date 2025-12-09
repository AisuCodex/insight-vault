import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Zap, LogOut, Check, X, Trash2, Key, Users, UserCheck, Clock, Eye, EyeOff, Loader2, Home } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  status: string;
  created_at: string;
}

interface LoginCode {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
  used: boolean;
  profile?: Profile;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loginCodes, setLoginCodes] = useState<LoginCode[]>([]);
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);
  
  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchData();
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Fetch all login codes with profile info
      const { data: codesData, error: codesError } = await supabase
        .from('login_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (codesError) throw codesError;
      
      // Map profiles to login codes
      const codesWithProfiles = (codesData || []).map(code => ({
        ...code,
        profile: profilesData?.find(p => p.user_id === code.user_id),
      }));
      
      setLoginCodes(codesWithProfiles);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveUser = async (profile: Profile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'approved' })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: "User Approved",
        description: `${profile.email} can now log in`,
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    }
  };

  const handleRejectUser = async (profile: Profile) => {
    try {
      // Delete the profile (will cascade to user_roles)
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', profile.id);

      if (error) throw error;

      // Remove from local state (rejected users won't appear)
      setProfiles(prev => prev.filter(p => p.id !== profile.id));

      toast({
        title: "User Rejected",
        description: `Registration for ${profile.email} was rejected`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to reject user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      // Delete profile (will cascade)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deletingUser.id);

      if (error) throw error;

      toast({
        title: "User Deleted",
        description: `${deletingUser.email} has been removed`,
      });
      setDeletingUser(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const pendingUsers = profiles.filter(p => p.status === 'pending');
  const approvedUsers = profiles.filter(p => p.status === 'approved');

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">RTL SnapSolve</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" onClick={() => navigate("/")} className="h-10 px-4">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button variant="outline" onClick={signOut} className="h-10 px-4">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingUsers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedUsers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Login Codes</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loginCodes.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending ({pendingUsers.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="codes" className="gap-2">
              <Key className="w-4 h-4" />
              Login Codes
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Pending Approvals */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Registrations</CardTitle>
                <CardDescription>Approve or reject user registrations</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingUsers.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No pending registrations</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {pendingUsers.map((profile) => (
                        <div
                          key={profile.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30"
                        >
                          <div>
                            <p className="font-medium">{profile.display_name || profile.email}</p>
                            <p className="text-sm text-muted-foreground">{profile.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Registered: {new Date(profile.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveUser(profile)}
                              className="gap-1"
                            >
                              <Check className="w-4 h-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectUser(profile)}
                              className="gap-1"
                            >
                              <X className="w-4 h-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Users */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Manage approved user accounts</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : approvedUsers.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No approved users</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {approvedUsers.map((profile) => (
                        <div
                          key={profile.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{profile.display_name || profile.email}</p>
                              <Badge variant="secondary">Active</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{profile.email}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeletingUser(profile)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Login Codes */}
          <TabsContent value="codes">
            <Card>
              <CardHeader>
                <CardTitle>Login Codes</CardTitle>
                <CardDescription>View all user login codes for password resets</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : loginCodes.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No login codes generated yet</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {loginCodes.map((code) => (
                        <div
                          key={code.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30"
                        >
                          <div>
                            <p className="font-medium">{code.profile?.email || 'Unknown User'}</p>
                            <p className="text-xs text-muted-foreground">
                              Generated: {new Date(code.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <code className="px-2 py-1 rounded bg-primary/10 text-primary font-mono text-sm">
                              {code.code}
                            </code>
                            {code.used && (
                              <Badge variant="secondary" className="ml-2">Used</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your admin password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPasswords ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPasswords(!showPasswords)}
                      >
                        {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type={showPasswords ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={changingPassword}>
                    {changingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Change Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete User Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingUser?.email}"? This will remove all their data and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
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

export default Admin;
