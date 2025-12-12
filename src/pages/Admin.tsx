import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Zap, Users, Key, Shield, Trash2, Check, X, 
  Eye, EyeOff, Loader2, LogOut, Home, RefreshCw, Search 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutConfirmDialog from "@/components/LogoutConfirmDialog";

interface UserProfile {
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
  used: boolean;
  created_at: string;
}

const Admin = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loginCodes, setLoginCodes] = useState<LoginCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [deletingCode, setDeletingCode] = useState<LoginCode | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Search states
  const [pendingSearch, setPendingSearch] = useState("");
  const [usersSearch, setUsersSearch] = useState("");
  const [codesSearch, setCodesSearch] = useState("");
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading, signOut } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/");
      } else {
        fetchData();
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, codesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("login_codes").select("*").order("created_at", { ascending: false }),
      ]);

      if (usersRes.data) setUsers(usersRes.data);
      if (codesRes.data) setLoginCodes(codesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "approved" })
        .eq("user_id", userId);

      if (error) throw error;

      toast({ title: "Success", description: "User approved successfully." });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      toast({ title: "Success", description: "User registration rejected." });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", deletingUser.id);

      if (error) throw error;

      toast({ title: "Success", description: "User deleted successfully." });
      setDeletingUser(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteCode = async () => {
    if (!deletingCode) return;

    try {
      const { error } = await supabase
        .from("login_codes")
        .delete()
        .eq("id", deletingCode.id);

      if (error) throw error;

      // Update local state immediately to remove only the deleted code
      setLoginCodes(prev => prev.filter(code => code.id !== deletingCode.id));
      toast({ title: "Success", description: "Login code deleted successfully." });
      setDeletingCode(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ 
        title: "Error", 
        description: "Password must be at least 6 characters.", 
        variant: "destructive" 
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      toast({ title: "Success", description: "Password changed successfully." });
      setNewPassword("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getUserEmail = (userId: string) => {
    const user = users.find(u => u.user_id === userId);
    return user?.email || userId;
  };

  // Filter functions
  const pendingUsers = users.filter(u => u.status === "pending");
  const approvedUsers = users.filter(u => u.status === "approved");

  const filteredPendingUsers = pendingUsers.filter(u => 
    u.email.toLowerCase().includes(pendingSearch.toLowerCase()) ||
    (u.display_name?.toLowerCase().includes(pendingSearch.toLowerCase()) ?? false)
  );

  const filteredApprovedUsers = approvedUsers.filter(u => 
    u.email.toLowerCase().includes(usersSearch.toLowerCase()) ||
    (u.display_name?.toLowerCase().includes(usersSearch.toLowerCase()) ?? false)
  );

  const filteredLoginCodes = loginCodes.filter(code => {
    const userEmail = getUserEmail(code.user_id);
    return userEmail.toLowerCase().includes(codesSearch.toLowerCase()) ||
           code.code.toLowerCase().includes(codesSearch.toLowerCase());
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass-panel border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={() => navigate("/")}>
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowLogoutConfirm(true)}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending" className="relative">
              Pending
              {pendingUsers.length > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingUsers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="codes">Login Codes</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Pending Registrations
                  </CardTitle>
                  <CardDescription>Review and approve new user registrations</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search pending users..."
                      value={pendingSearch}
                      onChange={(e) => setPendingSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {filteredPendingUsers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {pendingSearch ? "No matching pending registrations" : "No pending registrations"}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Display Name</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPendingUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>{user.display_name || "-"}</TableCell>
                          <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleApproveUser(user.user_id)}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleRejectUser(user.user_id)}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Approved Users
                  </CardTitle>
                  <CardDescription>Manage approved user accounts</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={usersSearch}
                      onChange={(e) => setUsersSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {filteredApprovedUsers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {usersSearch ? "No matching users" : "No approved users"}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Display Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApprovedUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.email}</TableCell>
                          <TableCell>{u.display_name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              {u.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingUser(u)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="codes">
            <Card className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Login Codes
                  </CardTitle>
                  <CardDescription>View and manage user login codes for password recovery</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by user or code..."
                      value={codesSearch}
                      onChange={(e) => setCodesSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {filteredLoginCodes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {codesSearch ? "No matching login codes" : "No login codes generated yet"}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Generated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLoginCodes.map((code) => (
                        <TableRow key={code.id}>
                          <TableCell className="font-medium">{getUserEmail(code.user_id)}</TableCell>
                          <TableCell className="font-mono">{code.code}</TableCell>
                          <TableCell>
                            <Badge variant={code.used ? "secondary" : "default"}>
                              {code.used ? "Used" : "Active"}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(code.created_at).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingCode(code)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="glass-panel max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Admin Settings
                </CardTitle>
                <CardDescription>Change your admin password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isChangingPassword}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" disabled={isChangingPassword || !newPassword}>
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      "Change Password"
                    )}
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
              Are you sure you want to delete {deletingUser?.email}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Login Code Dialog */}
      <AlertDialog open={!!deletingCode} onOpenChange={() => setDeletingCode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Login Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this login code for {deletingCode ? getUserEmail(deletingCode.user_id) : ""}? 
              The user will not be able to use this code for password reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCode} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

export default Admin;