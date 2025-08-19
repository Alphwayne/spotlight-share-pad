import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, UserPlus, Crown, Plus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface User {
  id: string;
  email: string;
  role: 'admin' | 'owner' | 'subscriber';
  nickname?: string;
  created_at: string;
}

export const AdminUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    role: 'subscriber' as 'admin' | 'owner' | 'subscriber'
  });

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_delete_user', {
        target_user_id: userId
      });

      if (error) throw error;

      if (data && typeof data === 'object' && 'error' in data) {
        toast.error(data.error as string);
        return;
      }

      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'owner' | 'subscriber') => {
    try {
      const { data, error } = await supabase.rpc('admin_update_user_role', {
        target_user_id: userId,
        new_role: newRole
      });

      if (error) throw error;

      if (data && typeof data === 'object' && 'error' in data) {
        toast.error(data.error as string);
        return;
      }

      toast.success('User role updated successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const createUser = async () => {
    if (!newUserData.email || !newUserData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setCreateLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUserData.email,
        password: newUserData.password,
        email_confirm: true
      });

      if (authError) throw authError;

      // Update the user role
      if (authData.user) {
        const { error: roleError } = await supabase
          .from('profiles')
          .update({ role: newUserData.role })
          .eq('user_id', authData.user.id);

        if (roleError) throw roleError;
      }

      toast.success("User created successfully");
      setNewUserData({ email: '', password: '', role: 'subscriber' });
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error("Failed to create user");
    } finally {
      setCreateLoading(false);
    }
  };

  const promoteToOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteEmail.trim()) return;

    setPromoteLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_promote_to_owner', {
        target_email: promoteEmail.trim()
      });

      if (error) throw error;

      if (data && typeof data === 'object' && 'error' in data) {
        toast.error(data.error as string);
        return;
      }

      toast.success('User promoted to owner successfully');
      setPromoteEmail("");
      fetchUsers();
    } catch (error) {
      console.error('Error promoting user:', error);
      toast.error('Failed to promote user');
    } finally {
      setPromoteLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'owner': return 'default';
      default: return 'secondary';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Promote User to Owner
            </CardTitle>
            <CardDescription>
              Enter an email address to promote a user to content creator status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={promoteToOwner} className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="promote-email" className="sr-only">Email</Label>
                <Input
                  id="promote-email"
                  type="email"
                  placeholder="Enter email to promote to owner"
                  value={promoteEmail}
                  onChange={(e) => setPromoteEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={promoteLoading}>
                {promoteLoading ? "Promoting..." : "Promote"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New User
            </CardTitle>
            <CardDescription>
              Create a new user account with specified role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="new-user@example.com"
                value={newUserData.email}
                onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
              />
              <Input
                type="password"
                placeholder="Password"
                value={newUserData.password}
                onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
              />
              <Select
                value={newUserData.role}
                onValueChange={(value) => setNewUserData(prev => ({ ...prev, role: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscriber">Subscriber</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={createUser} disabled={createLoading} className="w-full">
                {createLoading ? "Creating..." : "Create User"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            User Management ({users.length} users)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{user.email}</span>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </div>
                  {user.nickname && (
                    <p className="text-sm text-muted-foreground">
                      Nickname: {user.nickname}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Joined: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {user.role !== 'admin' && (
                    <>
                      {user.role !== 'owner' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateUserRole(user.id, 'owner')}
                        >
                          Make Owner
                        </Button>
                      )}
                      {user.role !== 'subscriber' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateUserRole(user.id, 'subscriber')}
                        >
                          Make Subscriber
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete user "{user.email}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUser(user.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};