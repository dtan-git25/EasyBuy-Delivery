import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Trash2, Mail, Calendar, Shield, Crown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Admin {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
}

interface AdminDetails {
  admin: Admin;
}

export function AdminManagement({ currentUserEmail }: { currentUserEmail: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewingAdmin, setViewingAdmin] = useState<string | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<Admin | null>(null);

  // Fetch admins with filters
  const { data: admins = [], isLoading } = useQuery<Admin[]>({
    queryKey: ["/api/admin/admins", searchTerm, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const url = `/api/admin/admins?${params.toString()}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch admins');
      return res.json();
    },
  });

  // Fetch admin details
  const { data: adminDetails } = useQuery<AdminDetails>({
    queryKey: [`/api/admin/admins/${viewingAdmin}`],
    enabled: !!viewingAdmin,
  });

  // Delete admin mutation
  const deleteAdminMutation = useMutation({
    mutationFn: async (adminId: string) => {
      await apiRequest("DELETE", `/api/admin/admins/${adminId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admins"] });
      toast({ title: "Admin account deleted successfully!" });
      setDeletingAdmin(null);
    },
    onError: (error: any) => {
      toast({ 
        title: error.message || "Failed to delete admin account", 
        variant: "destructive" 
      });
    },
  });

  // Check if admin is the owner (cannot be deleted)
  const isOwner = (admin: Admin) => admin.email === "david.jthan@gmail.com" || admin.role === "owner";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="mr-2 h-5 w-5 text-primary" />
          Admin Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Label>Search Admins</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-admins"
              />
            </div>
          </div>

          <div className="w-full sm:w-48">
            <Label>Sort By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger data-testid="select-sort-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="createdAt">Date Created</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-32">
            <Label>Order</Label>
            <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
              <SelectTrigger data-testid="select-sort-order">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Admin Table */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading admins...</div>
        ) : admins.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No admins found</div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin: Admin) => (
                  <TableRow key={admin.id} data-testid={`row-admin-${admin.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isOwner(admin) && <Crown className="h-4 w-4 text-yellow-500" />}
                        {admin.firstName} {admin.lastName}
                      </div>
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <Badge variant={admin.role === 'owner' ? 'default' : 'secondary'}>
                        {admin.role === 'owner' ? 'Owner' : 'Admin'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(admin.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingAdmin(admin.id)}
                          data-testid={`button-view-admin-${admin.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeletingAdmin(admin)}
                          disabled={isOwner(admin)}
                          data-testid={`button-delete-admin-${admin.id}`}
                          title={isOwner(admin) ? "Owner account cannot be deleted" : "Delete admin"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* View Admin Details Dialog */}
        <Dialog open={!!viewingAdmin} onOpenChange={(open) => !open && setViewingAdmin(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Admin Account Details
                {adminDetails?.admin && isOwner(adminDetails.admin) && (
                  <Crown className="h-5 w-5 text-yellow-500" />
                )}
              </DialogTitle>
              <DialogDescription>
                Viewing full information for this admin account
              </DialogDescription>
            </DialogHeader>

            {adminDetails ? (
              <div className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center">
                    <Mail className="mr-2 h-4 w-4 text-primary" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                    <div>
                      <label className="text-sm text-muted-foreground">Full Name</label>
                      <p className="font-medium">
                        {adminDetails.admin.firstName} {adminDetails.admin.middleName && `${adminDetails.admin.middleName} `}{adminDetails.admin.lastName}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Email</label>
                      <p className="font-medium">{adminDetails.admin.email}</p>
                    </div>
                    {adminDetails.admin.phone && (
                      <div>
                        <label className="text-sm text-muted-foreground">Phone Number</label>
                        <p className="font-medium">{adminDetails.admin.phone}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm text-muted-foreground">Role</label>
                      <p className="font-medium">
                        <Badge variant={adminDetails.admin.role === 'owner' ? 'default' : 'secondary'}>
                          {adminDetails.admin.role === 'owner' ? 'Owner' : 'Admin'}
                        </Badge>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-primary" />
                    Account Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                    <div>
                      <label className="text-sm text-muted-foreground">Account Created</label>
                      <p className="font-medium">
                        {new Date(adminDetails.admin.createdAt).toLocaleString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {adminDetails.admin.lastLogin && (
                      <div>
                        <label className="text-sm text-muted-foreground">Last Login</label>
                        <p className="font-medium">
                          {new Date(adminDetails.admin.lastLogin).toLocaleString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {isOwner(adminDetails.admin) && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                      <Crown className="h-5 w-5" />
                      <span className="font-semibold">Owner Account</span>
                    </div>
                    <p className="text-sm mt-2 text-yellow-700 dark:text-yellow-300">
                      This is the owner account and cannot be deleted. The owner has full control over the platform.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Loading admin details...</div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setViewingAdmin(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingAdmin} onOpenChange={(open) => !open && setDeletingAdmin(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Admin Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the admin account for{" "}
                <strong>{deletingAdmin?.firstName} {deletingAdmin?.lastName}</strong> ({deletingAdmin?.email})?
                <br /><br />
                This action cannot be undone. The admin will lose access to the admin portal immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingAdmin && deleteAdminMutation.mutate(deletingAdmin.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                Delete Admin
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
