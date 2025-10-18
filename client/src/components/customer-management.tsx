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
import { Search, Eye, Trash2, MapPin, Phone, Mail, Calendar, ShoppingBag, Home } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  age?: number;
  gender?: string;
  email: string;
  phone?: string;
  lotHouseNo?: string;
  street?: string;
  barangay?: string;
  cityMunicipality?: string;
  province?: string;
  landmark?: string;
  createdAt: string;
  orderCount: number;
}

interface SavedAddress {
  id: string;
  label?: string;
  lotHouseNo: string;
  street: string;
  barangay: string;
  cityMunicipality: string;
  province: string;
  landmark?: string;
  isDefault: boolean;
}

interface Order {
  id: string;
  orderNumber: string;
  total: string;
  status: string;
  createdAt: string;
}

interface CustomerDetails {
  customer: Customer;
  savedAddresses: SavedAddress[];
  orderCount: number;
  recentOrders: Order[];
}

export function CustomerManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewingCustomer, setViewingCustomer] = useState<string | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  // Fetch customers with filters
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["/api/admin/customers", { search: searchTerm, province: provinceFilter, sortBy, sortOrder }],
  });

  // Fetch customer details
  const { data: customerDetails } = useQuery<CustomerDetails>({
    queryKey: [`/api/admin/customers/${viewingCustomer}`],
    enabled: !!viewingCustomer,
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      await apiRequest("DELETE", `/api/admin/customers/${customerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({ title: "Customer deleted successfully!" });
      setDeletingCustomer(null);
    },
    onError: () => {
      toast({ title: "Failed to delete customer", variant: "destructive" });
    },
  });

  // Get unique provinces for filter dropdown
  const provinces = Array.from(new Set(customers.map((c: Customer) => c.province).filter(Boolean)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShoppingBag className="mr-2 h-5 w-5 text-primary" />
          Customer Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Label>Search Customers</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-customers"
              />
            </div>
          </div>

          <div className="w-full sm:w-48">
            <Label>Province</Label>
            <Select value={provinceFilter} onValueChange={setProvinceFilter}>
              <SelectTrigger data-testid="select-province-filter">
                <SelectValue placeholder="All Provinces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Provinces</SelectItem>
                {provinces.map((province: string) => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-48">
            <Label>Sort By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger data-testid="select-sort-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="createdAt">Date Registered</SelectItem>
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

        {/* Customer Table */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No customers found</div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Province</TableHead>
                  <TableHead className="text-center">Total Orders</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer: Customer) => (
                  <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                    <TableCell className="font-medium">
                      {customer.firstName} {customer.lastName}
                    </TableCell>
                    <TableCell>{customer.province || "Not specified"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{customer.orderCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingCustomer(customer.id)}
                          data-testid={`button-view-customer-${customer.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeletingCustomer(customer)}
                          data-testid={`button-delete-customer-${customer.id}`}
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

        {/* View Customer Modal */}
        <Dialog open={!!viewingCustomer} onOpenChange={() => setViewingCustomer(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Customer Details</DialogTitle>
              <DialogDescription>Complete customer information and order history</DialogDescription>
            </DialogHeader>

            {customerDetails && (
              <div className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Mail className="mr-2 h-4 w-4" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground text-xs">Full Name</Label>
                      <p className="font-medium">
                        {customerDetails.customer.firstName}{" "}
                        {customerDetails.customer.middleName && `${customerDetails.customer.middleName} `}
                        {customerDetails.customer.lastName}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Age</Label>
                      <p className="font-medium">{customerDetails.customer.age || "Not specified"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Gender</Label>
                      <p className="font-medium">{customerDetails.customer.gender || "Not specified"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Email</Label>
                      <p className="font-medium flex items-center">
                        <Mail className="mr-1 h-3 w-3" />
                        {customerDetails.customer.email}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Phone</Label>
                      <p className="font-medium flex items-center">
                        <Phone className="mr-1 h-3 w-3" />
                        {customerDetails.customer.phone || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Account Created</Label>
                      <p className="font-medium flex items-center">
                        <Calendar className="mr-1 h-3 w-3" />
                        {new Date(customerDetails.customer.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Primary Address */}
                {customerDetails.customer.province && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center">
                      <MapPin className="mr-2 h-4 w-4" />
                      Primary Address
                    </h3>
                    <p className="text-sm">
                      {customerDetails.customer.lotHouseNo} {customerDetails.customer.street},{" "}
                      {customerDetails.customer.barangay}, {customerDetails.customer.cityMunicipality},{" "}
                      {customerDetails.customer.province}
                      {customerDetails.customer.landmark && ` (${customerDetails.customer.landmark})`}
                    </p>
                  </div>
                )}

                {/* Saved Addresses */}
                {customerDetails.savedAddresses.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center">
                      <Home className="mr-2 h-4 w-4" />
                      Saved Addresses ({customerDetails.savedAddresses.length})
                    </h3>
                    <div className="space-y-2">
                      {customerDetails.savedAddresses.map((address) => (
                        <div key={address.id} className="border rounded-lg p-3 text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            {address.label && <Badge variant="outline">{address.label}</Badge>}
                            {address.isDefault && <Badge>Default</Badge>}
                          </div>
                          <p>
                            {address.lotHouseNo} {address.street}, {address.barangay},{" "}
                            {address.cityMunicipality}, {address.province}
                            {address.landmark && ` (${address.landmark})`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Order Statistics */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Order History
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="border rounded-lg p-3">
                      <Label className="text-muted-foreground text-xs">Total Orders</Label>
                      <p className="text-2xl font-bold">{customerDetails.orderCount}</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <Label className="text-muted-foreground text-xs">Recent Orders</Label>
                      <p className="text-2xl font-bold">{customerDetails.recentOrders.length}</p>
                    </div>
                  </div>

                  {/* Recent Orders Table */}
                  {customerDetails.recentOrders.length > 0 && (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerDetails.recentOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">{order.orderNumber}</TableCell>
                              <TableCell>₱{parseFloat(order.total).toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{order.status}</Badge>
                              </TableCell>
                              <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingCustomer} onOpenChange={() => setDeletingCustomer(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Customer</AlertDialogTitle>
              <AlertDialogDescription>
                Delete{" "}
                <strong>
                  {deletingCustomer?.firstName} {deletingCustomer?.lastName}
                </strong>
                ? This will remove their account and order history. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingCustomer && deleteCustomerMutation.mutate(deletingCustomer.id)}
                className="bg-destructive hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                Delete Customer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
