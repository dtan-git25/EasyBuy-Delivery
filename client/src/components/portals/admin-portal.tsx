import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShoppingCart, DollarSign, Bike, Store, Download, Eye, Check, X, Clock, Users, TrendingUp, FileText, AlertCircle, Crown, UserPlus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const systemAccountSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "owner"]),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
});

type SystemAccountForm = z.infer<typeof systemAccountSchema>;

export default function AdminPortal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const { data: systemStats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  const { data: pendingUsers = [] } = useQuery({
    queryKey: ["/api/users", { role: "pending" }],
    queryFn: async () => {
      // Mock pending approvals - in real app this would filter by approval status
      return [];
    }
  });

  const { data: restaurants = [] } = useQuery({
    queryKey: ["/api/restaurants"],
  });

  // Rider document approval queries
  const { data: ridersForApproval = [] } = useQuery({
    queryKey: ["/api/admin/riders-for-approval"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest("PATCH", "/api/settings", updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const approveUserMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}/approval`, { 
        approvalStatus: status 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });

  const updateRestaurantMutation = useMutation({
    mutationFn: async ({ restaurantId, updates }: { restaurantId: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/restaurants/${restaurantId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
    },
  });

  const reviewRiderDocumentsMutation = useMutation({
    mutationFn: async ({ riderId, approved, reason }: { riderId: string; approved: boolean; reason?: string }) => {
      const response = await apiRequest("POST", `/api/admin/review-rider/${riderId}`, { 
        approved, 
        reason 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/riders-for-approval"] });
    },
  });

  const [tempSettings, setTempSettings] = useState({
    baseDeliveryFee: (settings as any)?.baseDeliveryFee || '25',
    perKmRate: (settings as any)?.perKmRate || '15',
    convenienceFee: (settings as any)?.convenienceFee || '10',
    showConvenienceFee: (settings as any)?.showConvenienceFee ?? true,
  });

  const systemAccountForm = useForm<SystemAccountForm>({
    resolver: zodResolver(systemAccountSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      role: "admin",
      firstName: "",
      lastName: "",
      middleName: "",
    },
  });

  const updateSetting = (key: string, value: any) => {
    updateSettingsMutation.mutate({ [key]: value });
  };

  const handleApproval = (userId: string, status: 'approved' | 'rejected') => {
    approveUserMutation.mutate({ userId, status });
  };

  const toggleRestaurantStatus = (restaurantId: string, isActive: boolean) => {
    updateRestaurantMutation.mutate({ 
      restaurantId, 
      updates: { isActive } 
    });
  };

  const updateRestaurantMarkup = (restaurantId: string, markup: string) => {
    updateRestaurantMutation.mutate({ 
      restaurantId, 
      updates: { markup } 
    });
  };

  const createSystemAccountMutation = useMutation({
    mutationFn: async (data: SystemAccountForm) => {
      const response = await apiRequest("POST", "/api/admin/create-system-account", data);
      return response.json();
    },
    onSuccess: (newUser) => {
      toast({
        title: "Account created successfully",
        description: `${newUser.role === 'admin' ? 'Admin' : 'Owner'} account for ${newUser.firstName} ${newUser.lastName} has been created.`,
        variant: "default",
      });
      systemAccountForm.reset();
      setIsCreatingAccount(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onCreateSystemAccount = (data: SystemAccountForm) => {
    createSystemAccountMutation.mutate(data);
  };

  // Check if current user is owner
  const isOwner = user?.role === 'owner';

  return (
    <div>
      {/* Admin Dashboard Header */}
      <section className="bg-card border-b border-border py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Admin Dashboard</h2>
              <p className="text-muted-foreground">Manage your delivery platform operations</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">System Status: Online</span>
              </div>
              <Button data-testid="button-export-reports">
                <Download className="mr-2 h-4 w-4" />
                Export Reports
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="py-6 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-500 bg-opacity-10 p-3 rounded-lg">
                    <ShoppingCart className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold text-foreground">
                      {systemStats?.totalOrders?.toLocaleString() || '0'}
                    </p>
                    <p className="text-sm text-green-600">
                      +{systemStats?.ordersGrowth || 0}% from last month
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-500 bg-opacity-10 p-3 rounded-lg">
                    <DollarSign className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-2xl font-bold text-foreground">
                      ₱{systemStats?.totalRevenue?.toLocaleString() || '0'}
                    </p>
                    <p className="text-sm text-green-600">
                      +{systemStats?.revenueGrowth || 0}% from last month
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-500 bg-opacity-10 p-3 rounded-lg">
                    <Bike className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Riders</p>
                    <p className="text-2xl font-bold text-foreground">
                      {systemStats?.activeRiders || '0'}
                    </p>
                    <p className="text-sm text-green-600">
                      +{systemStats?.ridersGrowth || 0} new this week
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-orange-500 bg-opacity-10 p-3 rounded-lg">
                    <Store className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Restaurants</p>
                    <p className="text-2xl font-bold text-foreground">
                      {systemStats?.totalRestaurants || '0'}
                    </p>
                    <p className="text-sm text-green-600">
                      +{systemStats?.restaurantsGrowth || 0} pending approval
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Navigation Tabs */}
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className={`grid w-full ${isOwner ? 'grid-cols-6' : 'grid-cols-5'}`}>
              <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="approvals" data-testid="tab-approvals">
                Pending Approvals
                {pendingUsers.length > 0 && (
                  <Badge className="ml-2" variant="destructive">{pendingUsers.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="documents" data-testid="tab-documents">
                <FileText className="w-4 h-4 mr-2" />
                Document Review
                {ridersForApproval.length > 0 && (
                  <Badge className="ml-2" variant="destructive">{ridersForApproval.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
              <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
              {isOwner && (
                <TabsTrigger value="user-management" data-testid="tab-user-management">
                  <Crown className="w-4 h-4 mr-2" />
                  User Management
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">New restaurant registered</p>
                          <p className="text-sm text-muted-foreground">Pizza Palace - 2 hours ago</p>
                        </div>
                        <Badge variant="secondary">New</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">Rider approved</p>
                          <p className="text-sm text-muted-foreground">Juan Cruz - 4 hours ago</p>
                        </div>
                        <Badge variant="default">Approved</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">System maintenance completed</p>
                          <p className="text-sm text-muted-foreground">6 hours ago</p>
                        </div>
                        <Badge variant="outline">System</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button className="w-full justify-start" variant="outline">
                      <Users className="mr-2 h-4 w-4" />
                      View All Users
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Store className="mr-2 h-4 w-4" />
                      Manage Restaurants
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Bike className="mr-2 h-4 w-4" />
                      Rider Management
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Analytics Dashboard
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="approvals" className="space-y-6">
              {pendingUsers.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Pending Approvals</h3>
                    <p className="text-muted-foreground">All user applications have been processed.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map((user: any) => (
                    <Card key={user.id} data-testid={`approval-${user.id}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={user.profileImage} />
                              <AvatarFallback>
                                {user.firstName?.[0]}{user.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium text-foreground">
                                {user.firstName} {user.lastName}
                              </h4>
                              <p className="text-sm text-muted-foreground capitalize">
                                {user.role} Application
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Submitted {new Date(user.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Button 
                              variant="outline" 
                              size="sm"
                              data-testid={`button-review-${user.id}`}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Review Documents
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleApproval(user.id, 'rejected')}
                              disabled={approveUserMutation.isPending}
                              data-testid={`button-reject-${user.id}`}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleApproval(user.id, 'approved')}
                              disabled={approveUserMutation.isPending}
                              data-testid={`button-approve-${user.id}`}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Delivery Fee Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Bike className="mr-2 h-5 w-5 text-primary" />
                      Delivery Fee Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="base-rate">Base Rate (First KM)</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-muted-foreground">₱</span>
                        <Input
                          id="base-rate"
                          type="number"
                          value={tempSettings.baseDeliveryFee}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, baseDeliveryFee: e.target.value }))}
                          className="flex-1"
                          data-testid="input-base-rate"
                        />
                        <Button 
                          size="sm"
                          onClick={() => updateSetting('baseDeliveryFee', tempSettings.baseDeliveryFee)}
                          disabled={updateSettingsMutation.isPending}
                          data-testid="button-update-base-rate"
                        >
                          Update
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="per-km-rate">Succeeding KM Rate</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-muted-foreground">₱</span>
                        <Input
                          id="per-km-rate"
                          type="number"
                          value={tempSettings.perKmRate}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, perKmRate: e.target.value }))}
                          className="flex-1"
                          data-testid="input-per-km-rate"
                        />
                        <Button 
                          size="sm"
                          onClick={() => updateSetting('perKmRate', tempSettings.perKmRate)}
                          disabled={updateSettingsMutation.isPending}
                          data-testid="button-update-per-km-rate"
                        >
                          Update
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="convenience-fee">Convenience Fee</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-muted-foreground">₱</span>
                        <Input
                          id="convenience-fee"
                          type="number"
                          value={tempSettings.convenienceFee}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, convenienceFee: e.target.value }))}
                          className="flex-1"
                          data-testid="input-convenience-fee"
                        />
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={tempSettings.showConvenienceFee}
                            onCheckedChange={(checked) => {
                              setTempSettings(prev => ({ ...prev, showConvenienceFee: checked }));
                              updateSetting('showConvenienceFee', checked);
                            }}
                            data-testid="switch-show-convenience-fee"
                          />
                          <Label className="text-sm">Show at checkout</Label>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => updateSetting('convenienceFee', tempSettings.convenienceFee)}
                          disabled={updateSettingsMutation.isPending}
                          data-testid="button-update-convenience-fee"
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Store Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Store className="mr-2 h-5 w-5 text-primary" />
                      Store Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {restaurants.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No restaurants found</p>
                      ) : (
                        restaurants.map((restaurant: any) => (
                          <div 
                            key={restaurant.id} 
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                            data-testid={`restaurant-${restaurant.id}`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-card rounded-lg flex items-center justify-center">
                                <Store className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{restaurant.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {restaurant.isActive ? 'Active' : 'Inactive'} • ⭐ {restaurant.rating || '0'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Select
                                value={restaurant.markup || '15'}
                                onValueChange={(value) => updateRestaurantMarkup(restaurant.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10% markup</SelectItem>
                                  <SelectItem value="15">15% markup</SelectItem>
                                  <SelectItem value="20">20% markup</SelectItem>
                                  <SelectItem value="25">25% markup</SelectItem>
                                </SelectContent>
                              </Select>
                              <Switch
                                checked={restaurant.isActive}
                                onCheckedChange={(checked) => toggleRestaurantStatus(restaurant.id, checked)}
                                data-testid={`switch-${restaurant.id}`}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Reports & Analytics</CardTitle>
                </CardHeader>
                <CardContent className="p-8 text-center">
                  <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Advanced Analytics Coming Soon</h3>
                  <p className="text-muted-foreground mb-4">
                    Detailed reports and analytics dashboard with charts and graphs will be available here.
                  </p>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Current Data
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-primary" />
                    Rider Document Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ridersForApproval.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No Documents Pending Review</h3>
                      <p className="text-muted-foreground">
                        All rider documents have been reviewed. New submissions will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {ridersForApproval.map((rider: any) => (
                        <Card key={rider.id} className="border-l-4 border-l-yellow-500">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <Avatar>
                                  <AvatarImage src={rider.user?.profileImage} />
                                  <AvatarFallback>
                                    {rider.user?.firstName?.[0]}{rider.user?.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h4 className="font-semibold">
                                    {rider.user?.firstName} {rider.user?.lastName}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {rider.user?.email}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Submitted: {new Date(rider.documentsSubmittedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending Review
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {/* Rider Details */}
                            <div className="grid md:grid-cols-2 gap-4 mb-6">
                              <div>
                                <h5 className="font-medium mb-2">Vehicle Information</h5>
                                <div className="space-y-1 text-sm">
                                  <p><span className="font-medium">Type:</span> {rider.vehicleType}</p>
                                  <p><span className="font-medium">Model:</span> {rider.vehicleModel}</p>
                                  <p><span className="font-medium">Plate:</span> {rider.plateNumber}</p>
                                  <p><span className="font-medium">License:</span> {rider.licenseNumber}</p>
                                </div>
                              </div>
                              <div>
                                <h5 className="font-medium mb-2">Documents Status</h5>
                                <div className="space-y-2">
                                  <div className="flex items-center">
                                    {rider.orcrDocument ? (
                                      <Check className="w-4 h-4 text-green-500 mr-2" />
                                    ) : (
                                      <X className="w-4 h-4 text-red-500 mr-2" />
                                    )}
                                    <span className="text-sm">OR/CR Document</span>
                                  </div>
                                  <div className="flex items-center">
                                    {rider.motorImage ? (
                                      <Check className="w-4 h-4 text-green-500 mr-2" />
                                    ) : (
                                      <X className="w-4 h-4 text-red-500 mr-2" />
                                    )}
                                    <span className="text-sm">Motor Image</span>
                                  </div>
                                  <div className="flex items-center">
                                    {rider.idDocument ? (
                                      <Check className="w-4 h-4 text-green-500 mr-2" />
                                    ) : (
                                      <X className="w-4 h-4 text-red-500 mr-2" />
                                    )}
                                    <span className="text-sm">Valid ID</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Document Download Links */}
                            <div className="flex flex-wrap gap-2 mb-6">
                              {rider.orcrDocument && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/api/admin/rider-document/${rider.id}/orcr`, '_blank')}
                                  data-testid={`download-orcr-${rider.id}`}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View OR/CR
                                </Button>
                              )}
                              {rider.motorImage && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/api/admin/rider-document/${rider.id}/motor`, '_blank')}
                                  data-testid={`download-motor-${rider.id}`}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Motor
                                </Button>
                              )}
                              {rider.idDocument && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/api/admin/rider-document/${rider.id}/id`, '_blank')}
                                  data-testid={`download-id-${rider.id}`}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View ID
                                </Button>
                              )}
                            </div>

                            {/* Approval Actions */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                              <Button
                                onClick={() => reviewRiderDocumentsMutation.mutate({ 
                                  riderId: rider.id, 
                                  approved: true 
                                })}
                                disabled={reviewRiderDocumentsMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                                data-testid={`approve-rider-${rider.id}`}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Approve Rider
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => {
                                  const reason = prompt("Please provide a reason for rejection:");
                                  if (reason) {
                                    reviewRiderDocumentsMutation.mutate({ 
                                      riderId: rider.id, 
                                      approved: false, 
                                      reason 
                                    });
                                  }
                                }}
                                disabled={reviewRiderDocumentsMutation.isPending}
                                data-testid={`reject-rider-${rider.id}`}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Reject Documents
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Owner-only User Management Tab */}
            {isOwner && (
              <TabsContent value="user-management" className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Create System Account Form */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Crown className="mr-2 h-5 w-5 text-primary" />
                        Create Administrative Account
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Create new Admin or Owner accounts. Only Owners can perform this action.
                      </p>
                    </CardHeader>
                    <CardContent>
                      {!isCreatingAccount ? (
                        <Button 
                          onClick={() => setIsCreatingAccount(true)}
                          className="w-full"
                          data-testid="button-start-create-account"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Create New Account
                        </Button>
                      ) : (
                        <Form {...systemAccountForm}>
                          <form onSubmit={systemAccountForm.handleSubmit(onCreateSystemAccount)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={systemAccountForm.control}
                                name="firstName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>First Name</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field} 
                                        placeholder="Enter first name"
                                        data-testid="input-system-first-name"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={systemAccountForm.control}
                                name="lastName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Last Name</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field} 
                                        placeholder="Enter last name"
                                        data-testid="input-system-last-name"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={systemAccountForm.control}
                              name="middleName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Middle Name (Optional)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="Enter middle name"
                                      data-testid="input-system-middle-name"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={systemAccountForm.control}
                              name="role"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Account Role</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-system-role">
                                        <SelectValue placeholder="Select account role" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="admin">Admin - System administration</SelectItem>
                                      <SelectItem value="owner">Owner - Full system control</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={systemAccountForm.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Username</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="Enter username"
                                      data-testid="input-system-username"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={systemAccountForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email Address</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="email"
                                      placeholder="Enter email address"
                                      data-testid="input-system-email"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={systemAccountForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Password</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="password"
                                      placeholder="Enter secure password"
                                      data-testid="input-system-password"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex gap-2 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  setIsCreatingAccount(false);
                                  systemAccountForm.reset();
                                }}
                                data-testid="button-cancel-create-account"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                className="w-full"
                                disabled={createSystemAccountMutation.isPending}
                                data-testid="button-create-system-account"
                              >
                                {createSystemAccountMutation.isPending ? "Creating..." : "Create Account"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      )}
                    </CardContent>
                  </Card>

                  {/* System Account Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <AlertCircle className="mr-2 h-5 w-5 text-orange-500" />
                        Important Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                        <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                          Account Creation Guidelines
                        </h4>
                        <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-2">
                          <li>• Admin accounts can manage users, approvals, and system settings</li>
                          <li>• Owner accounts have full system control including user management</li>
                          <li>• All created accounts are automatically approved and active</li>
                          <li>• Passwords must be at least 6 characters long</li>
                          <li>• Usernames and emails must be unique across the system</li>
                        </ul>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                          Security Recommendations
                        </h4>
                        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                          <li>• Use strong, unique passwords for administrative accounts</li>
                          <li>• Provide clear naming conventions for usernames</li>
                          <li>• Regularly review and audit administrative access</li>
                          <li>• Create Owner accounts sparingly - only for trusted administrators</li>
                        </ul>
                      </div>

                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                          ⚠️ Owner Account Warning
                        </h4>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          Owner accounts have unrestricted access to all system functions including creating other Owner accounts. 
                          Only create Owner accounts for trusted system administrators.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </section>
    </div>
  );
}
