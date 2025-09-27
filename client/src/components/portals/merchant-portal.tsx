import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Store, MapPin, Star, Clock, User, Phone, MessageCircle, Edit, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
  const [isAddMenuItemOpen, setIsAddMenuItemOpen] = useState(false);
  const [menuItemForm, setMenuItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category: ''
  });

  const { data: restaurants = [] } = useQuery<any[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

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
      // You can add toast notification here if available
    },
  });

  const userRestaurant = restaurants.find((r: any) => r.ownerId === user?.id);

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
                  <Badge variant={userRestaurant?.isActive ? "default" : "secondary"}>
                    {userRestaurant?.isActive ? "Open" : "Closed"}
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

            {/* Store Stats */}
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
      </section>

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
              <TabsTrigger value="menu" data-testid="tab-menu">Menu Management</TabsTrigger>
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
                          <Input 
                            id="item-category" 
                            data-testid="input-item-category"
                            placeholder="e.g., Main Course" 
                            value={menuItemForm.category}
                            onChange={(e) => updateMenuItemForm('category', e.target.value)}
                          />
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
                            <Button variant="outline" size="sm" data-testid={`button-edit-item-${item.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              data-testid={`button-toggle-availability-${item.id}`}
                            >
                              {item.isAvailable ? "Disable" : "Enable"}
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
