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
import { Search, Eye, Trash2, MapPin, Phone, Mail, Calendar, Bike, FileText, Wallet, Download, User as UserIcon, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface Rider {
  id: string;
  userId: string;
  status: string;
  documentsStatus: string;
  orcrDocument?: string;
  motorImage?: string;
  idDocument?: string;
  documentsUploadedAt?: string;
  documentsReviewedAt?: string;
  completedDeliveries: number;
  walletBalance: string;
  user: {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    prefix?: string;
    email: string;
    phone?: string;
    lotHouseNo?: string;
    street?: string;
    barangay?: string;
    cityMunicipality?: string;
    province?: string;
    driverLicenseNo?: string;
    licenseValidityDate?: string;
    approvalStatus: string;
    createdAt: string;
  };
}

function RiderRatingCell({ riderId }: { riderId: string }) {
  const { data: ratingData } = useQuery<{ average: { average: number; count: number } }>({
    queryKey: ["/api/ratings/rider", riderId],
    queryFn: async () => {
      const response = await fetch(`/api/ratings/rider/${riderId}`);
      return response.json();
    },
  });

  const avgRating = ratingData?.average?.average || 0;
  const count = ratingData?.average?.count || 0;

  if (count === 0) {
    return <span className="text-sm text-muted-foreground">No ratings</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  );
}

export function RiderManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [viewingRider, setViewingRider] = useState<Rider | null>(null);
  const [deletingRider, setDeletingRider] = useState<Rider | null>(null);
  const [viewingDocuments, setViewingDocuments] = useState(false);
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);

  // Fetch riders with filters
  const { data: riders = [], isLoading } = useQuery<Rider[]>({
    queryKey: ["/api/admin/riders", searchTerm, statusFilter, provinceFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (provinceFilter && provinceFilter !== 'all') params.append('province', provinceFilter);
      
      const url = `/api/admin/riders?${params.toString()}`;
      const res = await fetch(url, { 
        credentials: 'include',
        cache: 'no-store' // Force fresh data
      });
      if (!res.ok) throw new Error('Failed to fetch riders');
      return res.json();
    },
  });

  // Delete rider mutation
  const deleteRiderMutation = useMutation({
    mutationFn: async (riderId: string) => {
      await apiRequest("DELETE", `/api/admin/riders/${riderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/riders"] });
      toast({ title: "Rider deleted successfully!" });
      setDeletingRider(null);
    },
    onError: () => {
      toast({ title: "Failed to delete rider", variant: "destructive" });
    },
  });

  // Update account status mutation
  const updateAccountStatusMutation = useMutation({
    mutationFn: async ({ userId, approvalStatus }: { userId: string; approvalStatus: string }) => {
      await apiRequest("PATCH", `/api/users/${userId}/approval`, { approvalStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/riders"] });
      toast({ title: "Account status updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update account status", variant: "destructive" });
    },
  });

  // Get unique provinces for filter dropdown
  const provinces = Array.from(new Set(riders.map((r: Rider) => r.user?.province).filter((p): p is string => Boolean(p))));

  // Sort riders
  const sortedRiders = [...riders].sort((a, b) => {
    if (sortBy === 'name') {
      const nameA = `${a.user?.firstName} ${a.user?.lastName}`.toLowerCase();
      const nameB = `${b.user?.firstName} ${b.user?.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    } else {
      return new Date(b.user?.createdAt).getTime() - new Date(a.user?.createdAt).getTime();
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bike className="mr-2 h-5 w-5 text-primary" />
          Rider Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Label>Search Riders</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-riders"
              />
            </div>
          </div>

          <div className="w-full sm:w-48">
            <Label>Rider Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="mt-1" data-testid="select-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-48">
            <Label>Province</Label>
            <Select value={provinceFilter} onValueChange={setProvinceFilter}>
              <SelectTrigger className="mt-1" data-testid="select-province-filter">
                <SelectValue placeholder="All Provinces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Provinces</SelectItem>
                {provinces.map((province) => (
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
              <SelectTrigger className="mt-1" data-testid="select-sort-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date Registered</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground mb-4">
          Showing {sortedRiders.length} rider{sortedRiders.length !== 1 ? 's' : ''}
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rider Name</TableHead>
                <TableHead>Rider Status</TableHead>
                <TableHead>Province</TableHead>
                <TableHead>Deliveries</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading riders...
                  </TableCell>
                </TableRow>
              ) : sortedRiders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No riders found
                  </TableCell>
                </TableRow>
              ) : (
                sortedRiders.map((rider) => (
                  <TableRow key={rider.id} data-testid={`row-rider-${rider.id}`}>
                    <TableCell className="font-medium">
                      {rider.user?.prefix && `${rider.user.prefix} `}
                      {rider.user?.firstName} {rider.user?.middleName && `${rider.user.middleName} `}{rider.user?.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          rider.status === 'online' ? 'default' : 
                          rider.status === 'offline' ? 'secondary' : 
                          'outline'
                        }
                        data-testid={`badge-status-${rider.id}`}
                      >
                        {rider.status || 'offline'}
                      </Badge>
                    </TableCell>
                    <TableCell>{rider.user?.province || '-'}</TableCell>
                    <TableCell>{rider.completedDeliveries}</TableCell>
                    <TableCell>
                      <RiderRatingCell riderId={rider.userId} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingRider(rider)}
                          data-testid={`button-view-rider-${rider.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingRider(rider)}
                          data-testid={`button-delete-rider-${rider.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* View Rider Dialog */}
      <Dialog open={!!viewingRider} onOpenChange={() => setViewingRider(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rider Information</DialogTitle>
            <DialogDescription>
              Complete details for {viewingRider?.user?.firstName} {viewingRider?.user?.lastName}
            </DialogDescription>
          </DialogHeader>

          {viewingRider && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Full Name</Label>
                    <p className="text-base font-medium" data-testid="text-rider-fullname">
                      {viewingRider.user?.prefix && `${viewingRider.user.prefix} `}
                      {viewingRider.user?.firstName} {viewingRider.user?.middleName && `${viewingRider.user.middleName} `}{viewingRider.user?.lastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <p className="text-base flex items-center gap-2" data-testid="text-rider-email">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {viewingRider.user?.email || '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Phone</Label>
                    <p className="text-base flex items-center gap-2" data-testid="text-rider-phone">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {viewingRider.user?.phone || '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Driver's License No.</Label>
                    <p className="text-base" data-testid="text-rider-license">
                      {viewingRider.user?.driverLicenseNo || '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">License Validity</Label>
                    <p className="text-base" data-testid="text-rider-license-validity">
                      {viewingRider.user?.licenseValidityDate 
                        ? new Date(viewingRider.user.licenseValidityDate).toLocaleDateString() 
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Address */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address
                </h3>
                <p className="text-base" data-testid="text-rider-address">
                  {[
                    viewingRider.user?.lotHouseNo,
                    viewingRider.user?.street,
                    viewingRider.user?.barangay,
                    viewingRider.user?.cityMunicipality,
                    viewingRider.user?.province
                  ].filter(Boolean).join(', ') || 'No address provided'}
                </p>
              </div>

              <Separator />

              {/* Account Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Account Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Account Status</Label>
                    <Select
                      value={viewingRider.user?.approvalStatus || 'pending'}
                      onValueChange={(value) => {
                        updateAccountStatusMutation.mutate({
                          userId: viewingRider.userId,
                          approvalStatus: value
                        });
                      }}
                    >
                      <SelectTrigger className="mt-1" data-testid="select-account-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Account Created</Label>
                    <p className="text-base flex items-center gap-2" data-testid="text-rider-created">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(viewingRider.user?.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Total Deliveries</Label>
                    <p className="text-base font-semibold text-primary" data-testid="text-rider-deliveries">
                      {viewingRider.completedDeliveries} completed
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Wallet Balance</Label>
                    <p className="text-base flex items-center gap-2" data-testid="text-rider-wallet">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      ₱{parseFloat(viewingRider.walletBalance).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Documents */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Verification Documents</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Document Status</p>
                      <p className="text-sm text-muted-foreground">
                        {viewingRider.documentsStatus === 'approved' && 'All documents verified and approved'}
                        {viewingRider.documentsStatus === 'pending' && 'Documents under review'}
                        {viewingRider.documentsStatus === 'rejected' && 'Documents rejected'}
                        {viewingRider.documentsStatus === 'incomplete' && 'Documents incomplete'}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        viewingRider.documentsStatus === 'approved' ? 'default' : 
                        viewingRider.documentsStatus === 'rejected' ? 'destructive' : 
                        'secondary'
                      }
                    >
                      {viewingRider.documentsStatus || 'incomplete'}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {viewingRider.orcrDocument && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/api/admin/rider-document/${viewingRider.id}/orcr`, '_blank')}
                        data-testid="button-view-orcr"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View OR/CR
                      </Button>
                    )}
                    {viewingRider.motorImage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/api/admin/rider-document/${viewingRider.id}/motor`, '_blank')}
                        data-testid="button-view-motor"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Motor
                      </Button>
                    )}
                    {viewingRider.idDocument && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/api/admin/rider-document/${viewingRider.id}/id`, '_blank')}
                        data-testid="button-view-id"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View ID
                      </Button>
                    )}
                    {!viewingRider.orcrDocument && !viewingRider.motorImage && !viewingRider.idDocument && (
                      <p className="text-sm text-muted-foreground py-2">No documents uploaded</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Documents Dialog */}
      <Dialog open={viewingDocuments} onOpenChange={setViewingDocuments}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verification Documents</DialogTitle>
            <DialogDescription>
              View all uploaded verification documents
            </DialogDescription>
          </DialogHeader>

          {viewingRider && (
            <div className="space-y-6">
              {/* OR/CR Document */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    OR/CR Document
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {viewingRider.orcrDocument ? (
                    <div className="space-y-3">
                      <div className="relative group">
                        <img 
                          src={viewingRider.orcrDocument} 
                          alt="OR/CR Document" 
                          className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setFullSizeImage(viewingRider.orcrDocument || null)}
                          data-testid="img-orcr-preview"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setFullSizeImage(viewingRider.orcrDocument || null)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Full Size
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(viewingRider.orcrDocument, '_blank')}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No document uploaded</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Motor Image */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bike className="w-5 h-5" />
                    Motor/Vehicle Image
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {viewingRider.motorImage ? (
                    <div className="space-y-3">
                      <div className="relative group">
                        <img 
                          src={viewingRider.motorImage} 
                          alt="Motor Image" 
                          className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setFullSizeImage(viewingRider.motorImage || null)}
                          data-testid="img-motor-preview"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setFullSizeImage(viewingRider.motorImage || null)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Full Size
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(viewingRider.motorImage, '_blank')}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bike className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No image uploaded</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Valid ID */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserIcon className="w-5 h-5" />
                    Valid ID
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {viewingRider.idDocument ? (
                    <div className="space-y-3">
                      <div className="relative group">
                        <img 
                          src={viewingRider.idDocument} 
                          alt="Valid ID" 
                          className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setFullSizeImage(viewingRider.idDocument || null)}
                          data-testid="img-id-preview"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setFullSizeImage(viewingRider.idDocument || null)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Full Size
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(viewingRider.idDocument, '_blank')}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No document uploaded</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full Size Image Viewer */}
      <Dialog open={!!fullSizeImage} onOpenChange={() => setFullSizeImage(null)}>
        <DialogContent className="max-w-6xl p-0">
          <div className="relative">
            <img 
              src={fullSizeImage || ''} 
              alt="Full size document" 
              className="w-full h-auto max-h-[90vh] object-contain"
              data-testid="img-full-size"
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4"
              onClick={() => setFullSizeImage(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingRider} onOpenChange={() => setDeletingRider(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rider Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingRider?.user?.firstName} {deletingRider?.user?.lastName}</strong>? 
              This will remove their account and delivery history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRider && deleteRiderMutation.mutate(deletingRider.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete Rider
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
