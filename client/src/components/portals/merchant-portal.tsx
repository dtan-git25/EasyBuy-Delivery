import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Store, MapPin, Star, Clock, User, Phone, MessageCircle, Edit, Plus, AlertCircle, CheckCircle, XCircle, Power, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  items: any[];
  subtotal: string;
  total: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  rider?: {
    name: string;
  };
  createdAt: string;
}

export default function MerchantPortal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddMenuItemOpen, setIsAddMenuItemOpen] = useState(false);
  const [isEditMenuItemOpen, setIsEditMenuItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [menuItemForm, setMenuItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category: ''
  });

  // Fetch merchant's own restaurant (including inactive ones)
  const { data: userRestaurant } = useQuery<any>({
    queryKey: ["/api/merchant/my-restaurant"],
    staleTime: 0, // Always refetch to ensure we have latest data
    gcTime: 0, // Don't cache the data
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    enabled: user?.role === 'merchant', // Only fetch for merchants
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  // Fetch categories for dropdown
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  // WebSocket for real-time order updates
  const { socket, sendMessage } = useWebSocket();

  // Listen for order updates via WebSocket
  useEffect(() => {
    if (socket && user) {
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'order_update' || data.type === 'new_order') {
            // Refresh orders when any order is updated or created
            queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
            
            // Show toast for order updates
            if (data.order && data.type === 'order_update') {
              toast({
                title: "Order Updated",
                description: `Order #${data.order.orderNumber} status: ${data.order.status}`,
              });
            } else if (data.order && data.type === 'new_order') {
              toast({
                title: "New Order",
                description: `New order #${data.order.orderNumber} received!`,
              });
            }
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      socket.addEventListener('message', handleMessage);
      return () => socket.removeEventListener('message', handleMessage);
    }
  }, [socket, user, queryClient, toast]);

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

  const createMenuItemMutation = useMutation({
    mutationFn: async (menuItemData: any) => {
      const response = await apiRequest("POST", "/api/menu-items", menuItemData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create menu item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setIsAddMenuItemOpen(false);
      setMenuItemForm({ name: '', description: '', price: '', category: '' });
    },
    onError: (error: Error) => {
      console.error('Failed to create menu item:', error.message);
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/menu-items/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update menu item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setIsEditMenuItemOpen(false);
      setEditingItem(null);
      setMenuItemForm({ name: '', description: '', price: '', category: '' });
      toast({
        title: "Menu item updated",
        description: "Your menu item has been updated successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      const response = await apiRequest("PATCH", `/api/menu-items/${id}`, { isAvailable });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update availability');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({
        title: "Availability updated",
        description: variables.isAvailable ? "Item is now available to customers" : "Item marked as unavailable",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/menu-items/${id}`, {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete menu item');
      }
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setDeletingItem(null);
      toast({
        title: "Menu item deleted",
        description: "The menu item has been removed successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const requestReapprovalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/merchant/request-reapproval", {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to request re-approval');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Re-approval requested",
        description: "Your account has been submitted for admin review again.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleRestaurantStatusMutation = useMutation({
    mutationFn: async ({ restaurantId, isActive }: { restaurantId: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/restaurants/${restaurantId}`, { isActive });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update restaurant status');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/my-restaurant"] });
      toast({
        title: "Restaurant status updated",
        description: variables.isActive ? "Your restaurant is now accepting orders!" : "Your restaurant is now closed.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["/api/menu-items", userRestaurant?.id],
    queryFn: async () => {
      if (!userRestaurant) return [];
      const response = await fetch(`/api/menu-items?restaurantId=${userRestaurant.id}`);
      return response.json();
    },
    enabled: !!userRestaurant,
  });
  
  const activeOrders = orders.filter((order: Order) => 
    ['pending', 'accepted', 'preparing'].includes(order.status)
  );

  const todayOrders = orders.filter((order: Order) => {
    const today = new Date().toDateString();
    const orderDate = new Date(order.createdAt).toDateString();
    return today === orderDate;
  });

  const todayRevenue = todayOrders.reduce((sum: number, order: Order) => {
    return sum + parseFloat(order.total || '0');
  }, 0);

  const markOrderReady = (orderId: string) => {
    updateOrderMutation.mutate({ orderId, status: 'ready' });
  };

  const handleSubmitMenuItem = () => {
    // Prevent non-approved merchants from creating menu items
    if (user?.approvalStatus !== 'approved') {
      console.error('Menu item creation is disabled for non-approved merchants');
      return;
    }

    if (!menuItemForm.name.trim() || !menuItemForm.price.trim()) {
      console.error('Name and price are required');
      return;
    }

    createMenuItemMutation.mutate({
      name: menuItemForm.name.trim(),
      description: menuItemForm.description.trim(),
      price: menuItemForm.price.trim(),
      category: menuItemForm.category.trim() || 'Other',
      restaurantId: userRestaurant?.id
    });
  };

  const handleEditMenuItem = (item: any) => {
    setEditingItem(item);
    setMenuItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category || ''
    });
    setIsEditMenuItemOpen(true);
  };

  const handleSubmitEditMenuItem = () => {
    if (!editingItem) return;
    
    if (!menuItemForm.name.trim() || !menuItemForm.price.trim()) {
      toast({
        title: "Validation error",
        description: "Name and price are required",
        variant: "destructive",
      });
      return;
    }

    updateMenuItemMutation.mutate({
      id: editingItem.id,
      data: {
        name: menuItemForm.name.trim(),
        description: menuItemForm.description.trim(),
        price: menuItemForm.price.trim(),
        category: menuItemForm.category.trim() || 'Other',
      }
    });
  };

  const handleToggleAvailability = (item: any) => {
    toggleAvailabilityMutation.mutate({
      id: item.id,
      isAvailable: !item.isAvailable
    });
  };

  const updateMenuItemForm = (field: string, value: string) => {
    setMenuItemForm(prev => ({ ...prev, [field]: value }));
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Current location:", position.coords);
          // Handle location update for store
        },
        (error) => {
          console.error("Location error:", error);
        }
      );
    }
  };

  return (
    <div>
      {/* Merchant Header */}
      <section className="bg-card border-b border-border py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Store Info */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center">
                <Store className="text-muted-foreground" size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  {userRestaurant?.name || "Your Restaurant"}
                </h3>
                <p className="text-muted-foreground">
                  {userRestaurant?.address || "Set your restaurant address"}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={user?.approvalStatus === 'approved' && userRestaurant?.isActive ? "default" : "secondary"}>
                    {user?.approvalStatus === 'approved' && userRestaurant?.isActive ? "Open" : "Closed"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Rating: {userRestaurant?.rating || "0"}/5
                  </span>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-primary p-0 h-auto"
                    onClick={handleUseCurrentLocation}
                    data-testid="button-update-location"
                  >
                    <MapPin className="mr-1 h-4 w-4" />
                    Update Location
                  </Button>
                </div>
              </div>
            </div>

            {/* Store Stats and Controls */}
            <div className="flex flex-col lg:flex-row items-center gap-4">
              {/* Open/Close Toggle for Approved Merchants */}
              {user?.approvalStatus === 'approved' && userRestaurant && (
                <Card className="w-full lg:w-auto">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Power className={`h-5 w-5 ${userRestaurant.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Restaurant Status</p>
                        <p className="text-xs text-muted-foreground">
                          {userRestaurant.isActive ? 'Accepting Orders' : 'Not Accepting Orders'}
                        </p>
                      </div>
                      <Button
                        variant={userRestaurant.isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleRestaurantStatusMutation.mutate({ 
                          restaurantId: userRestaurant.id, 
                          isActive: !userRestaurant.isActive 
                        })}
                        disabled={toggleRestaurantStatusMutation.isPending}
                        data-testid="button-toggle-restaurant-status"
                        className={userRestaurant.isActive ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {userRestaurant.isActive ? "Close" : "Open"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-sm text-muted-foreground">Today's Orders</p>
                    <p className="text-xl font-bold text-foreground">{todayOrders.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-xl font-bold text-foreground">₱{todayRevenue.toFixed(0)}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Approval Status Banner */}
      {user?.approvalStatus !== 'approved' && (
        <section className="bg-background py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {user?.approvalStatus === 'pending' && (
              <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-700" data-testid="alert-pending-approval">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <AlertTitle className="text-yellow-800 dark:text-yellow-200 font-semibold">
                  Account Pending Approval
                </AlertTitle>
                <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                  Your merchant account is pending admin approval. You'll receive an email notification once approved.
                  <div className="mt-2 text-sm" data-testid="text-submission-date">
                    <strong>Submission Date:</strong> {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Not available'}
                  </div>
                  <div className="mt-2 text-sm">
                    While waiting, your restaurant is set to <strong>Closed</strong> and menu management is disabled.
                  </div>
                </AlertDescription>
              </Alert>
            )}
            {user?.approvalStatus === 'rejected' && (
              <Alert className="border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-700" data-testid="alert-rejected">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <AlertTitle className="text-red-800 dark:text-red-200 font-semibold">
                  Application Rejected
                </AlertTitle>
                <AlertDescription className="text-red-700 dark:text-red-300">
                  Your merchant application was rejected.
                  {user.rejectionReason && (
                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded text-sm" data-testid="text-rejection-reason">
                      <strong>Reason:</strong> {user.rejectionReason}
                    </div>
                  )}
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      onClick={() => requestReapprovalMutation.mutate()}
                      disabled={requestReapprovalMutation.isPending}
                      data-testid="button-request-reapproval"
                    >
                      Request Approval Again
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </section>
      )}

      {/* Success Message for Approved Merchants (shown once) */}
      {user?.approvalStatus === 'approved' && userRestaurant && (
        <section className="bg-background py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-700" data-testid="alert-approved">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-200 font-semibold">
                Account Approved!
              </AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                Your account is approved! You can now add menu items and manage your restaurant. Change your restaurant status to <strong>Open</strong> when you're ready to accept orders.
              </AlertDescription>
            </Alert>
          </div>
        </section>
      )}

      {/* Navigation Tabs */}
      <section className="bg-background py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="orders" data-testid="tab-orders">
                Active Orders
                {activeOrders.length > 0 && (
                  <Badge className="ml-2">{activeOrders.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="menu" data-testid="tab-menu" disabled={user?.approvalStatus !== 'approved'}>
                Menu Management
              </TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">Order History</TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Active Orders */}
            <TabsContent value="orders" className="space-y-4">
              {activeOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No active orders</p>
                  </CardContent>
                </Card>
              ) : (
                activeOrders.map((order: Order) => (
                  <Card key={order.id} data-testid={`order-${order.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-yellow-500 bg-opacity-10 p-2 rounded-lg">
                            <Clock className="text-yellow-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{order.orderNumber}</h4>
                            <p className="text-sm text-muted-foreground">
                              Ordered {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge 
                            variant={order.status === 'ready' ? 'default' : 'secondary'}
                          >
                            {order.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {order.status === 'preparing' && (
                            <Button 
                              onClick={() => markOrderReady(order.id)}
                              disabled={updateOrderMutation.isPending}
                              data-testid={`button-ready-${order.id}`}
                            >
                              Ready for Pickup
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-medium text-foreground mb-3">Order Items</h5>
                          <div className="space-y-2">
                            {order.items?.map((item: any, index: number) => (
                              <div key={index} className="flex justify-between items-center text-sm">
                                <span className="text-foreground">
                                  {item.quantity}x {item.name}
                                </span>
                                <span className="text-muted-foreground">₱{item.price}</span>
                              </div>
                            ))}
                            <hr className="border-border" />
                            <div className="flex justify-between items-center font-medium">
                              <span className="text-foreground">Subtotal</span>
                              <span className="text-foreground">₱{order.subtotal}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-foreground mb-3">Customer Details</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center text-muted-foreground">
                              <User className="mr-2 h-4 w-4" />
                              {order.customer.name}
                            </div>
                            <div className="flex items-center text-muted-foreground">
                              <Phone className="mr-2 h-4 w-4" />
                              {order.customer.phone}
                            </div>
                            <div className="flex items-center text-muted-foreground">
                              <MapPin className="mr-2 h-4 w-4" />
                              {order.customer.address}
                            </div>
                            {order.rider && (
                              <div className="flex items-center text-muted-foreground">
                                <User className="mr-2 h-4 w-4" />
                                Rider: {order.rider.name}
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex space-x-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Chat
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1">
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Order
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Menu Management */}
            <TabsContent value="menu" className="space-y-4">
              {!userRestaurant ? (
                <div className="text-center py-12">
                  <Store className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Restaurant Found</h3>
                  <p className="text-muted-foreground mb-4">
                    You need to have a restaurant associated with your account to manage menu items.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Please contact support to set up your restaurant profile.
                  </p>
                </div>
              ) : user?.approvalStatus !== 'approved' ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Menu Management Disabled</h3>
                    <p className="text-muted-foreground">
                      {user?.approvalStatus === 'pending' 
                        ? 'Your account is pending approval. Menu management will be enabled once your account is approved by an administrator.'
                        : 'Menu management is not available. Please contact support for assistance.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Menu Items</h3>
                    <Dialog open={isAddMenuItemOpen} onOpenChange={setIsAddMenuItemOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-add-menu-item">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Menu Item
                        </Button>
                      </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Menu Item</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="item-name">Item Name</Label>
                        <Input 
                          id="item-name" 
                          data-testid="input-item-name"
                          placeholder="Enter item name" 
                          value={menuItemForm.name}
                          onChange={(e) => updateMenuItemForm('name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="item-description">Description</Label>
                        <Textarea 
                          id="item-description" 
                          data-testid="textarea-item-description"
                          placeholder="Describe your item" 
                          value={menuItemForm.description}
                          onChange={(e) => updateMenuItemForm('description', e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="item-price">Price (₱)</Label>
                          <Input 
                            id="item-price" 
                            data-testid="input-item-price"
                            type="number" 
                            placeholder="0.00" 
                            value={menuItemForm.price}
                            onChange={(e) => updateMenuItemForm('price', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="item-category">Category</Label>
                          <Select 
                            value={menuItemForm.category} 
                            onValueChange={(value) => updateMenuItemForm('category', value)}
                          >
                            <SelectTrigger id="item-category" data-testid="select-item-category">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories?.filter((cat: any) => cat?.isActive).map((category: any) => (
                                <SelectItem key={category.id} value={category.name} data-testid={`option-category-${category.id}`}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          data-testid="button-cancel"
                          onClick={() => setIsAddMenuItemOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          className="flex-1"
                          data-testid="button-add-item"
                          onClick={handleSubmitMenuItem}
                          disabled={createMenuItemMutation.isPending}
                        >
                          {createMenuItemMutation.isPending ? 'Adding...' : 'Add Item'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Edit Menu Item Dialog */}
              <Dialog open={isEditMenuItemOpen} onOpenChange={setIsEditMenuItemOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Menu Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-item-name">Item Name</Label>
                      <Input 
                        id="edit-item-name" 
                        data-testid="input-edit-item-name"
                        placeholder="Enter item name" 
                        value={menuItemForm.name}
                        onChange={(e) => updateMenuItemForm('name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-item-description">Description</Label>
                      <Textarea 
                        id="edit-item-description" 
                        data-testid="textarea-edit-item-description"
                        placeholder="Describe your item" 
                        value={menuItemForm.description}
                        onChange={(e) => updateMenuItemForm('description', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-item-price">Price (₱)</Label>
                        <Input 
                          id="edit-item-price" 
                          data-testid="input-edit-item-price"
                          type="number" 
                          placeholder="0.00" 
                          value={menuItemForm.price}
                          onChange={(e) => updateMenuItemForm('price', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-item-category">Category</Label>
                        <Select 
                          value={menuItemForm.category} 
                          onValueChange={(value) => updateMenuItemForm('category', value)}
                        >
                          <SelectTrigger id="edit-item-category" data-testid="select-edit-item-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories?.filter((cat: any) => cat?.isActive).map((category: any) => (
                              <SelectItem key={category.id} value={category.name} data-testid={`option-edit-category-${category.id}`}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        data-testid="button-cancel-edit"
                        onClick={() => setIsEditMenuItemOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        className="flex-1"
                        data-testid="button-save-edit"
                        onClick={handleSubmitEditMenuItem}
                        disabled={updateMenuItemMutation.isPending}
                      >
                        {updateMenuItemMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Delete Menu Item Confirmation Dialog */}
              <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{deletingItem?.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      data-testid="button-confirm-delete"
                      onClick={() => deletingItem && deleteMenuItemMutation.mutate(deletingItem.id)}
                      disabled={deleteMenuItemMutation.isPending}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {deleteMenuItemMutation.isPending ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {menuItems.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">
                      No menu items found. Add your first menu item to get started.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {menuItems.map((item: any) => (
                    <Card key={item.id} data-testid={`card-menu-item-${item.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground" data-testid={`text-item-name-${item.id}`}>
                              {item.name}
                            </h4>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1" data-testid={`text-item-description-${item.id}`}>
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                              <span className="font-medium text-foreground" data-testid={`text-item-price-${item.id}`}>
                                ₱{parseFloat(item.price).toFixed(2)}
                              </span>
                              {item.category && (
                                <Badge variant="secondary" data-testid={`badge-item-category-${item.id}`}>
                                  {item.category}
                                </Badge>
                              )}
                              <Badge 
                                variant={item.isAvailable ? "default" : "destructive"}
                                data-testid={`badge-item-status-${item.id}`}
                              >
                                {item.isAvailable ? "Available" : "Unavailable"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              data-testid={`button-edit-item-${item.id}`}
                              onClick={() => handleEditMenuItem(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              data-testid={`button-toggle-availability-${item.id}`}
                              onClick={() => handleToggleAvailability(item)}
                              disabled={toggleAvailabilityMutation.isPending}
                            >
                              {item.isAvailable ? "Disable" : "Enable"}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              data-testid={`button-delete-item-${item.id}`}
                              onClick={() => setDeletingItem(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
                </>
              )}
            </TabsContent>

            {/* Order History */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Order history will appear here</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{orders.length}</p>
                    <p className="text-sm text-muted-foreground">All time</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      ₱{orders.reduce((sum: number, order: Order) => sum + parseFloat(order.total || '0'), 0).toFixed(0)}
                    </p>
                    <p className="text-sm text-muted-foreground">All time</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Average Order</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      ₱{orders.length > 0 ? (orders.reduce((sum: number, order: Order) => sum + parseFloat(order.total || '0'), 0) / orders.length).toFixed(0) : '0'}
                    </p>
                    <p className="text-sm text-muted-foreground">Per order</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
