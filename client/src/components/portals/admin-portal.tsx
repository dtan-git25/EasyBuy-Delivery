import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShoppingCart, DollarSign, Bike, Store, Download, Eye, Check, X, Clock, Users, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AdminPortal() {
  const queryClient = useQueryClient();

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

  const [tempSettings, setTempSettings] = useState({
    baseDeliveryFee: (settings as any)?.baseDeliveryFee || '25',
    perKmRate: (settings as any)?.perKmRate || '15',
    convenienceFee: (settings as any)?.convenienceFee || '10',
    showConvenienceFee: (settings as any)?.showConvenienceFee ?? true,
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="approvals" data-testid="tab-approvals">
                Pending Approvals
                {pendingUsers.length > 0 && (
                  <Badge className="ml-2" variant="destructive">{pendingUsers.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
              <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
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
          </Tabs>
        </div>
      </section>
    </div>
  );
}
