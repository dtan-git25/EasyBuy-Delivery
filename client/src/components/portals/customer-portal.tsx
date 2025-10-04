import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCart } from "@/contexts/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Clock, Star, Search, Filter, Navigation, ArrowLeft, ShoppingCart, Plus, Minus, X, Package, User, Phone, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/lib/websocket";
import { useAuth } from "@/hooks/use-auth";

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  image: string;
  deliveryFee: number;
  markup: number;
  address: string;
  phone: string;
  isActive: boolean;
}

interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  isAvailable: boolean;
  variants?: any;
}

interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  restaurantId: string;
  riderId?: string;
  items: any[];
  subtotal: string;
  markup: string;
  deliveryFee: string;
  total: string;
  status: string;
  deliveryAddress: string;
  deliveryLatitude?: string;
  deliveryLongitude?: string;
  customerNotes?: string;
  paymentMethod: string;
  phoneNumber: string;
  estimatedDeliveryTime?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: string;
  changedBy: string;
  previousStatus?: string;
  notes?: string;
  location?: any;
  estimatedDeliveryTime?: string;
  createdAt: string;
  changedByUser: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface RiderLocationHistory {
  id: string;
  riderId: string;
  orderId?: string;
  latitude: string;
  longitude: string;
  accuracy?: string;
  heading?: string;
  speed?: string;
  batteryLevel?: number;
  isOnline: boolean;
  timestamp: string;
}

interface CustomerPortalProps {
  showAllCartsDialog?: boolean;
  onAllCartsDialogChange?: (open: boolean) => void;
}

export default function CustomerPortal({ showAllCartsDialog, onAllCartsDialogChange }: CustomerPortalProps = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("distance");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [localShowAllCarts, setLocalShowAllCarts] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  
  // Use prop value if provided, otherwise use local state
  const showAllCarts = showAllCartsDialog !== undefined ? showAllCartsDialog : localShowAllCarts;
  const setShowAllCarts = onAllCartsDialogChange || setLocalShowAllCarts;
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  
  // Enhanced tracking state
  const [activeTab, setActiveTab] = useState("restaurants");
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<string | null>(null);
  
  const cart = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { socket, sendMessage } = useWebSocket();

  const { data: restaurants = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  // Fetch active categories from the database
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories?activeOnly=true");
      return response.json();
    }
  });

  // Fetch ALL menu items for filtering purposes
  const { data: allMenuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/all-menu-items"],
    queryFn: async () => {
      const items: MenuItem[] = [];
      for (const restaurant of restaurants) {
        const response = await fetch(`/api/menu-items?restaurantId=${restaurant.id}`);
        const restaurantItems = await response.json();
        items.push(...restaurantItems);
      }
      return items;
    },
    enabled: restaurants.length > 0
  });

  // Fetch menu items for selected restaurant
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", selectedRestaurant?.id],
    enabled: !!selectedRestaurant,
    queryFn: async () => {
      const response = await fetch(`/api/menu-items?restaurantId=${selectedRestaurant!.id}`);
      return response.json();
    }
  });

  // Enhanced tracking queries
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: activeTab === "orders",
  });

  const { data: orderStatusHistory = [] } = useQuery<OrderStatusHistory[]>({
    queryKey: ["/api/orders", selectedOrderForTracking, "history"],
    enabled: !!selectedOrderForTracking,
    queryFn: async () => {
      if (!selectedOrderForTracking) return [];
      const response = await fetch(`/api/orders/${selectedOrderForTracking}/history`);
      if (!response.ok) throw new Error('Failed to fetch order history');
      return response.json();
    },
  });

  const { data: riderLocation } = useQuery<RiderLocationHistory>({
    queryKey: ["/api/rider", selectedOrderForTracking, "location"],
    enabled: !!selectedOrderForTracking && !!orders.find(o => o.id === selectedOrderForTracking)?.riderId,
    queryFn: async () => {
      const order = orders.find(o => o.id === selectedOrderForTracking);
      if (!order?.riderId) return null;
      const response = await fetch(`/api/rider/${order.riderId}/location/latest`);
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds for live tracking
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: () => {
      cart.clearCart();
      setShowCheckout(false);
      setActiveTab("orders"); // Switch to orders tab after successful order
      toast({
        title: "Order placed successfully!",
        description: "Your order has been submitted and you'll receive updates soon.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: () => {
      toast({
        title: "Error placing order",
        description: "There was an error processing your order. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Enhanced WebSocket integration for real-time tracking
  useEffect(() => {
    if (socket && user) {
      // Join tracking for real-time order updates
      sendMessage({
        type: 'join_tracking',
        userId: user.id,
        userRole: user.role
      });

      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'order_update':
              // Invalidate orders and status history when order updates
              queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
              if (data.order && selectedOrderForTracking === data.order.id) {
                queryClient.invalidateQueries({ queryKey: ["/api/orders", data.order.id, "history"] });
              }
              
              // Show toast for order status changes
              if (data.order && data.updatedBy) {
                toast({
                  title: "Order Status Updated",
                  description: `Your order #${data.order.orderNumber} is now ${data.order.status}`,
                });
              }
              break;

            case 'rider_location_update':
              // Update rider location for active tracking
              if (selectedOrderForTracking) {
                const order = orders.find(o => o.id === selectedOrderForTracking);
                if (order?.riderId === data.riderId) {
                  queryClient.invalidateQueries({ queryKey: ["/api/rider", selectedOrderForTracking, "location"] });
                }
              }
              break;
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      socket.addEventListener('message', handleMessage);
      return () => socket.removeEventListener('message', handleMessage);
    }
  }, [socket, user, sendMessage, queryClient, selectedOrderForTracking, orders, toast]);

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Current location:", position.coords);
          // Handle location update
        },
        (error) => {
          console.error("Location error:", error);
        }
      );
    }
  };

  const filteredRestaurants = restaurants.filter((restaurant: Restaurant) => {
    // Search: Check restaurant name, cuisine, AND menu item categories
    const restaurantMenuItems = allMenuItems.filter(item => item.restaurantId === restaurant.id);
    const menuCategories = restaurantMenuItems.map(item => item.category.toLowerCase()).join(' ');
    const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         restaurant.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         menuCategories.includes(searchQuery.toLowerCase());
    
    // Category filter: Check if restaurant has items in selected category
    const matchesCategory = !selectedCategory || restaurantMenuItems.some(item => item.category === selectedCategory);
    
    return matchesSearch && matchesCategory && restaurant.isActive;
  });

  // Group menu items by category
  const menuItemsByCategory = menuItems.reduce((acc: Record<string, MenuItem[]>, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const addToCart = (menuItem: MenuItem) => {
    if (!selectedRestaurant) return;
    
    cart.addItem({
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: parseFloat(menuItem.price.toString()),
      restaurant: {
        id: selectedRestaurant.id,
        name: selectedRestaurant.name,
        deliveryFee: parseFloat(selectedRestaurant.deliveryFee.toString()),
        markup: parseFloat(selectedRestaurant.markup.toString())
      }
    });
    
    toast({
      title: "Added to cart",
      description: `${menuItem.name} has been added to your cart.`,
    });
  };

  const handleCheckout = () => {
    // Validate cart and restaurant context
    if (cart.items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to your cart before checkout.",
        variant: "destructive",
      });
      return;
    }

    if (!cart.restaurantId) {
      toast({
        title: "No restaurant selected",
        description: "Please select a restaurant first.",
        variant: "destructive",
      });
      return;
    }

    if (!deliveryAddress.trim() || !phoneNumber.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in your delivery address and phone number.",
        variant: "destructive",
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        title: "Payment method required",
        description: "Please select a payment method.",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      restaurantId: cart.restaurantId,
      items: cart.items.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
        name: item.name
      })),
      subtotal: cart.getSubtotal().toFixed(2),
      markup: cart.getMarkupAmount().toFixed(2),
      deliveryFee: cart.getDeliveryFee().toFixed(2),
      total: cart.getTotal().toFixed(2),
      deliveryAddress,
      phoneNumber,
      specialInstructions,
      paymentMethod,
      status: 'pending'
    };

    createOrderMutation.mutate(orderData);
  };

  // Restaurant Detail View with Real Menu Items
  if (selectedRestaurant) {
    return (
      <div className="min-h-screen bg-background">
        {/* Fixed Multi-Cart Buttons - Hide when dialogs are open */}
        {cart.getAllCartsCount() > 0 && !showCart && !showAllCarts && !showCheckout && (
          <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {/* Current Cart Button */}
            {cart.getItemCount() > 0 && (
              <Button
                onClick={() => setShowCart(true)}
                className="rounded-full h-16 w-16 shadow-lg relative"
                data-testid="button-view-cart"
              >
                <div className="flex flex-col items-center">
                  <ShoppingCart className="h-6 w-6" />
                  <span className="text-xs">{cart.getItemCount()}</span>
                </div>
              </Button>
            )}
            
            {/* View All Carts Button */}
            {cart.getAllCartsCount() > 1 && (
              <Button
                onClick={() => setShowAllCarts(true)}
                variant="secondary"
                className="rounded-full shadow-lg px-4 py-2"
                data-testid="button-view-all-carts"
              >
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="text-xs font-semibold">{cart.getAllCartsCount()} Carts</span>
                </div>
              </Button>
            )}
          </div>
        )}

        {/* Restaurant Header */}
        <div className="relative h-64 bg-cover bg-center" style={{backgroundImage: `url(${selectedRestaurant.image})`}}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute top-4 left-4 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRestaurant(null)}
              className="text-white hover:bg-white/20"
              data-testid="button-back-to-restaurants"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Restaurants
            </Button>
          </div>
          <div className="absolute bottom-4 left-4 text-white">
            <h1 className="text-3xl font-bold">{selectedRestaurant.name}</h1>
            <p className="text-lg opacity-90">{selectedRestaurant.cuisine}</p>
            <div className="flex items-center mt-2 space-x-4">
              <div className="flex items-center">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                <span>{selectedRestaurant.rating}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>25-35 min</span>
              </div>
              <div className="flex items-center">
                <span>₱{selectedRestaurant.deliveryFee} delivery</span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Section */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Menu</h2>
            {cart.getItemCount() > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowCart(true)}
                data-testid="button-view-cart-menu"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Cart ({cart.getItemCount()})
              </Button>
            )}
          </div>
          
          {menuItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No menu items available at this restaurant.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(menuItemsByCategory).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-xl font-semibold mb-4 text-foreground">{category}</h3>
                  <div className="space-y-4">
                    {items.map((item) => (
                      <Card key={item.id} className="p-4" data-testid={`menu-item-${item.id}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">{item.name}</h4>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-lg font-bold text-green-600">₱{Number(item.price).toFixed(2)}</span>
                              <div className="flex items-center space-x-2">
                                {!item.isAvailable ? (
                                  <Badge variant="destructive">Unavailable</Badge>
                                ) : (
                                  <Button
                                    onClick={() => addToCart(item)}
                                    data-testid={`button-add-to-cart-${item.id}`}
                                  >
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    Add to Cart
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Modal */}
        <Dialog open={showCart} onOpenChange={setShowCart}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Your Cart - {cart.restaurantName || 'No Restaurant'}</DialogTitle>
              {cart.getAllCartsCount() > 1 && (
                <p className="text-sm text-muted-foreground">
                  You have items in {cart.getAllCartsCount()} restaurants.{' '}
                  <button 
                    onClick={() => {
                      setShowCart(false);
                      setShowAllCarts(true);
                    }}
                    className="text-primary underline"
                    data-testid="link-view-all-carts"
                  >
                    View all carts
                  </button>
                </p>
              )}
            </DialogHeader>
            <div className="space-y-4">
              {cart.items.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Your cart is empty</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">₱{Number(item.price).toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                            data-testid={`button-decrease-${item.id}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                            data-testid={`button-increase-${item.id}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cart.removeItem(item.id)}
                            data-testid={`button-remove-${item.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₱{cart.getSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Markup ({cart.markup}%):</span>
                      <span>₱{cart.getMarkupAmount().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span>₱{cart.getDeliveryFee().toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total:</span>
                      <span>₱{cart.getTotal().toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => cart.clearCart()}
                      className="flex-1"
                      data-testid="button-clear-cart"
                    >
                      Clear Cart
                    </Button>
                    <Button
                      onClick={() => {
                        if (cart.items.length === 0) {
                          toast({
                            title: "Cart is empty",
                            description: "Add items to proceed to checkout.",
                            variant: "destructive",
                          });
                          return;
                        }
                        setShowCart(false);
                        setShowCheckout(true);
                      }}
                      className="flex-1"
                      data-testid="button-checkout"
                      disabled={cart.items.length === 0}
                    >
                      Checkout
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* View All Carts Modal */}
        <Dialog open={showAllCarts} onOpenChange={setShowAllCarts}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>All Restaurant Carts ({cart.getAllCartsCount()})</DialogTitle>
              <p className="text-sm text-muted-foreground">
                You have items in {cart.getAllCartsCount()} restaurant{cart.getAllCartsCount() > 1 ? 's' : ''}. Select which one to checkout.
              </p>
            </DialogHeader>
            <div className="space-y-4">
              {Object.values(cart.allCarts).map((restaurantCart) => {
                const isActive = cart.activeRestaurantId === restaurantCart.restaurantId;
                const subtotal = restaurantCart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const markupAmount = subtotal * (restaurantCart.markup / 100);
                const total = subtotal + markupAmount + restaurantCart.deliveryFee;
                const itemCount = restaurantCart.items.reduce((sum, item) => sum + item.quantity, 0);
                
                return (
                  <Card key={restaurantCart.restaurantId} className={`p-4 ${isActive ? 'border-primary border-2' : ''}`}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{restaurantCart.restaurantName}</h3>
                          <p className="text-sm text-muted-foreground">{itemCount} item{itemCount > 1 ? 's' : ''}</p>
                        </div>
                        {isActive && <Badge variant="default">Current</Badge>}
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2 text-sm">
                        {restaurantCart.items.map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span>{item.quantity}x {item.name}</span>
                            <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>₱{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Markup ({restaurantCart.markup}%):</span>
                          <span>₱{markupAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delivery Fee:</span>
                          <span>₱{restaurantCart.deliveryFee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-base pt-2">
                          <span>Total:</span>
                          <span>₱{total.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        {!isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              cart.switchCart(restaurantCart.restaurantId);
                              setShowAllCarts(false);
                              setShowCart(true);
                            }}
                            data-testid={`button-switch-cart-${restaurantCart.restaurantId}`}
                          >
                            View Cart
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => {
                            cart.switchCart(restaurantCart.restaurantId);
                            setShowAllCarts(false);
                            setShowCheckout(true);
                          }}
                          data-testid={`button-checkout-cart-${restaurantCart.restaurantId}`}
                        >
                          Checkout This Cart
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Clear cart for ${restaurantCart.restaurantName}?`)) {
                              cart.clearRestaurantCart(restaurantCart.restaurantId);
                              if (cart.getAllCartsCount() === 0) {
                                setShowAllCarts(false);
                              }
                            }
                          }}
                          data-testid={`button-clear-cart-${restaurantCart.restaurantId}`}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
              
              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  <p className="font-semibold text-lg">Total for All Carts</p>
                  <p className="text-sm text-muted-foreground">{cart.getAllCartsCount()} restaurant{cart.getAllCartsCount() > 1 ? 's' : ''}</p>
                </div>
                <p className="text-2xl font-bold">₱{cart.getAllCartsTotal().toFixed(2)}</p>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAllCarts(false)}
                  className="flex-1"
                  data-testid="button-close-all-carts"
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Clear all carts? This cannot be undone.')) {
                      cart.clearAllCarts();
                      setShowAllCarts(false);
                    }
                  }}
                  className="flex-1"
                  data-testid="button-clear-all-carts"
                >
                  Clear All Carts
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Checkout Modal */}
        <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Checkout</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Delivery Address *</label>
                <Input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter your delivery address"
                  data-testid="input-delivery-address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number *</label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  data-testid="input-phone-number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Special Instructions</label>
                <Input
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any special instructions (optional)"
                  data-testid="input-special-instructions"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Payment Method *</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger data-testid="select-payment-method">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash on Delivery</SelectItem>
                    <SelectItem value="gcash">GCash</SelectItem>
                    <SelectItem value="paymaya">PayMaya</SelectItem>
                    <SelectItem value="card">Credit/Debit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="font-medium">Order Summary</h4>
                <div className="text-sm space-y-1">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.name} x{item.quantity}</span>
                      <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>₱{cart.getTotal().toFixed(2)}</span>
                </div>
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCheckout(false)}
                  className="flex-1"
                  data-testid="button-back-to-cart"
                >
                  Back to Cart
                </Button>
                <Button
                  onClick={handleCheckout}
                  disabled={createOrderMutation.isPending}
                  className="flex-1"
                  data-testid="button-place-order"
                >
                  {createOrderMutation.isPending ? "Placing Order..." : "Place Order"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-secondary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Delicious Food, Delivered Fast</h2>
            <p className="text-lg opacity-90 mb-8">Order from your favorite restaurants in your area</p>
            
            {/* Location Input */}
            <div className="max-w-md mx-auto bg-card rounded-xl p-4 shadow-lg">
              <div className="flex items-center space-x-3">
                <MapPin className="text-primary" />
                <Input
                  type="text"
                  placeholder="Enter delivery address"
                  className="border-0 bg-transparent"
                  data-testid="input-delivery-location"
                />
                <Button size="sm" onClick={handleUseCurrentLocation} data-testid="button-use-location">
                  <Navigation className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content with Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="restaurants" data-testid="tab-restaurants">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Restaurants
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">
              <Package className="mr-2 h-4 w-4" />
              My Orders
            </TabsTrigger>
          </TabsList>

          {/* Restaurants Tab */}
          <TabsContent value="restaurants" className="space-y-6">
            <div>
      {/* Search and Filter */}
      <section className="py-6 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search restaurants, cuisines, or food categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-restaurant-search"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? "" : value)}>
                <SelectTrigger className="w-48" data-testid="select-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name} data-testid={`category-option-${category.id}`}>
                      {category.icon && `${category.icon} `}{category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48" data-testid="select-sort-by">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance">Distance</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="delivery-time">Delivery Time</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurant Grid */}
      <section className="py-8 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="w-full h-48 bg-muted"></div>
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded mb-3 w-3/4"></div>
                    <div className="flex justify-between">
                      <div className="h-3 bg-muted rounded w-16"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">No restaurants found matching your criteria.</p>
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("");
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredRestaurants.map((restaurant: Restaurant) => (
                <Card 
                  key={restaurant.id} 
                  className="cursor-pointer transition-transform hover:scale-105 hover:shadow-lg"
                  onClick={() => setSelectedRestaurant(restaurant)}
                  data-testid={`restaurant-${restaurant.id}`}
                >
                  <div className="w-full h-48 bg-muted rounded-t-lg overflow-hidden">
                    {restaurant.image && (
                      <img 
                        src={restaurant.image} 
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-lg font-semibold text-foreground">{restaurant.name}</h4>
                      <Badge variant="secondary">
                        {restaurant.isActive ? 'Open' : 'Closed'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{restaurant.cuisine}</p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{restaurant.rating}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>25-35 min</span>
                      </div>
                      <span className="text-green-600 font-medium">₱{restaurant.deliveryFee} delivery</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
            </div>
      </section>
            </div>
          </TabsContent>

          {/* My Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div className="grid gap-6">
              {orders.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                    <p className="text-muted-foreground mb-4">Start by ordering from your favorite restaurants!</p>
                    <Button onClick={() => setActiveTab("restaurants")} data-testid="button-browse-restaurants">
                      Browse Restaurants
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                orders.map((order) => (
                  <Card key={order.id} className="overflow-hidden" data-testid={`order-${order.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">Order #{order.orderNumber}</h3>
                          <p className="text-sm text-muted-foreground">
                            Placed on {new Date(order.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={
                          order.status === 'delivered' ? 'default' :
                          order.status === 'cancelled' ? 'destructive' :
                          order.status === 'pending' ? 'secondary' : 'outline'
                        }>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="font-medium mb-2">Delivery Address</h4>
                          <p className="text-sm text-muted-foreground flex items-start">
                            <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                            {order.deliveryAddress}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Contact</h4>
                          <p className="text-sm text-muted-foreground flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {order.phoneNumber}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold">
                          Total: ₱{parseFloat(order.total).toFixed(2)}
                        </div>
                        <div className="flex gap-2">
                          {(order.status === 'accepted' || order.status === 'preparing' || order.status === 'ready' || order.status === 'picked_up') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedOrderForTracking(order.id)}
                              data-testid={`button-track-order-${order.id}`}
                            >
                              <Navigation className="mr-2 h-4 w-4" />
                              Track Order
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Order Status Timeline */}
                      {selectedOrderForTracking === order.id && orderStatusHistory.length > 0 && (
                        <div className="mt-6 border-t pt-4">
                          <h4 className="font-medium mb-4">Order Timeline</h4>
                          <div className="space-y-3">
                            {orderStatusHistory.map((status, index) => (
                              <div key={status.id} className="flex items-start space-x-3">
                                <div className="flex flex-col items-center">
                                  <div className={`w-3 h-3 rounded-full ${
                                    index === 0 ? 'bg-primary' : 'bg-muted'
                                  }`} />
                                  {index < orderStatusHistory.length - 1 && (
                                    <div className="w-px h-6 bg-border mt-1" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline">
                                      {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {new Date(status.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Updated by {status.changedByUser.firstName} {status.changedByUser.lastName} ({status.changedByUser.role})
                                  </p>
                                  {status.notes && (
                                    <p className="text-sm mt-1">{status.notes}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Live Rider Tracking */}
                      {selectedOrderForTracking === order.id && order.riderId && riderLocation && (
                        <div className="mt-6 border-t pt-4">
                          <h4 className="font-medium mb-4">Live Rider Tracking</h4>
                          <div className="bg-muted rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Rider Location</span>
                              <Badge variant="outline" className="text-green-600">
                                <div className="w-2 h-2 bg-green-600 rounded-full mr-2" />
                                Live
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>Lat: {parseFloat(riderLocation.latitude).toFixed(6)}</p>
                              <p>Lng: {parseFloat(riderLocation.longitude).toFixed(6)}</p>
                              {riderLocation.speed && (
                                <p>Speed: {parseFloat(riderLocation.speed).toFixed(1)} km/h</p>
                              )}
                              <p>Last updated: {new Date(riderLocation.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs and Modals remain the same */}
      {showCart && (
        <Dialog open={showCart} onOpenChange={setShowCart}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Your Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {cart.items.map((item) => (
                <div key={`${item.menuItemId}-${item.name}`} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">₱{Number(item.price).toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                        data-testid={`button-decrease-${item.menuItemId}`}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                        data-testid={`button-increase-${item.menuItemId}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => cart.removeItem(item.id)}
                      data-testid={`button-remove-${item.menuItemId}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₱{cart.getSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Markup:</span>
                  <span>₱{cart.getMarkupAmount().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Delivery Fee:</span>
                  <span>₱{cart.getDeliveryFee().toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>₱{cart.getTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowCart(false)} className="flex-1">
                  Continue Shopping
                </Button>
                <Button onClick={() => { setShowCart(false); setShowCheckout(true); }} className="flex-1" data-testid="button-proceed-checkout">
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showCheckout && (
        <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Checkout</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Delivery Address</label>
                <Input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter your delivery address"
                  data-testid="input-delivery-address"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Phone Number</label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  data-testid="input-phone-number"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Special Instructions (Optional)</label>
                <Input
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any special delivery instructions"
                  data-testid="input-special-instructions"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Payment Method</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger data-testid="select-payment-method">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash on Delivery</SelectItem>
                    <SelectItem value="gcash">GCash</SelectItem>
                    <SelectItem value="maya">Maya (PayMaya)</SelectItem>
                    <SelectItem value="wallet">Wallet Balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-medium mb-2">Order Summary</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₱{cart.getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Markup:</span>
                    <span>₱{cart.getMarkupAmount().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>₱{cart.getDeliveryFee().toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>₱{cart.getTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowCheckout(false)} className="flex-1">
                  Back to Cart
                </Button>
                <Button
                  onClick={handleCheckout}
                  disabled={createOrderMutation.isPending}
                  className="flex-1"
                  data-testid="button-place-order"
                >
                  {createOrderMutation.isPending ? "Placing Order..." : "Place Order"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}