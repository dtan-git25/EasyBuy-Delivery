import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Bike, ShoppingCart, Package, Plus, Minus, X } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CustomerPortal from "@/components/portals/customer-portal";
import RiderPortal from "@/components/portals/rider-portal";
import MerchantPortal from "@/components/portals/merchant-portal";
import AdminPortal from "@/components/portals/admin-portal";
import ChatWidget from "@/components/chat/chat-widget";
import { cn } from "@/lib/utils";
import { AddressSelector } from "@/components/address-selector";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import type { SavedAddress, SystemSettings } from "@shared/schema";
import { calculateDistance, calculateDeliveryFee } from "@/lib/haversine";

type Portal = 'customer' | 'rider' | 'merchant' | 'admin' | 'owner';

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [activePortal, setActivePortal] = useState<Portal>((user?.role === 'owner' ? 'admin' : user?.role) || 'customer');
  const [showAllCarts, setShowAllCarts] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [calculatedDeliveryFees, setCalculatedDeliveryFees] = useState<Record<string, number>>({});
  
  const cart = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch system settings for convenience fee
  const { data: settings } = useQuery<SystemSettings>({
    queryKey: ["/api/settings"],
  });

  // Fetch restaurants for delivery fee calculation
  const { data: restaurants = [] } = useQuery<any[]>({
    queryKey: ["/api/restaurants"],
  });

  // Reset payment method to first enabled method when settings change
  useEffect(() => {
    if (settings) {
      const enabledMethods = [];
      if (settings.codEnabled) enabledMethods.push('cash');
      if (settings.gcashEnabled) enabledMethods.push('gcash');
      if (settings.mayaEnabled) enabledMethods.push('paymaya');
      if (settings.cardEnabled) enabledMethods.push('card');
      
      // If current payment method is disabled, switch to first enabled method
      if (enabledMethods.length > 0 && !enabledMethods.includes(paymentMethod)) {
        setPaymentMethod(enabledMethods[0]);
      }
    }
  }, [settings, paymentMethod]);

  // Calculate delivery fees when address or restaurants change
  useEffect(() => {
    if (!settings) {
      return;
    }

    const baseRate = parseFloat(settings.baseDeliveryFee || '50');
    const succeedingRate = parseFloat(settings.perKmRate || '10');
    const fees: Record<string, number> = {};

    // If customer coordinates are missing, use base rate fallback for all restaurants
    if (!selectedAddress?.latitude || !selectedAddress?.longitude) {
      Object.values(cart.allCarts).forEach((restaurantCart) => {
        fees[restaurantCart.restaurantId] = baseRate;
      });
      setCalculatedDeliveryFees(fees);
      return;
    }

    const customerLat = parseFloat(selectedAddress.latitude);
    const customerLng = parseFloat(selectedAddress.longitude);

    // Calculate delivery fee for each restaurant in the cart
    Object.values(cart.allCarts).forEach((restaurantCart) => {
      // Find the restaurant details to get coordinates
      const restaurant = restaurants.find(r => r.id === restaurantCart.restaurantId);
      
      if (restaurant && (restaurant as any).latitude && (restaurant as any).longitude) {
        const restaurantLat = parseFloat((restaurant as any).latitude);
        const restaurantLng = parseFloat((restaurant as any).longitude);
        
        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          customerLat,
          customerLng,
          restaurantLat,
          restaurantLng
        );
        
        // Calculate delivery fee based on distance
        const deliveryFee = calculateDeliveryFee(distance, baseRate, succeedingRate);
        fees[restaurantCart.restaurantId] = deliveryFee;
      } else {
        // Fallback to default delivery fee if restaurant coordinates not available
        fees[restaurantCart.restaurantId] = baseRate;
      }
    });

    setCalculatedDeliveryFees(fees);
  }, [selectedAddress, settings, cart.allCarts, restaurants]);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: () => {
      cart.clearAllCarts();
      setShowCheckout(false);
      setSelectedAddress(null);
      setPhoneNumber("");
      setSpecialInstructions("");
      setPaymentMethod("cash");
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order placed successfully!",
        description: "Your order has been submitted and you'll receive updates soon.",
      });
    },
    onError: () => {
      toast({
        title: "Error placing order",
        description: "There was an error processing your order. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCheckout = async () => {
    const allCarts = Object.values(cart.allCarts);
    
    if (allCarts.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to your cart before checkout.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedAddress || !phoneNumber) {
      toast({
        title: "Missing information",
        description: "Please provide delivery address and phone number.",
        variant: "destructive",
      });
      return;
    }

    // Validate selected payment method is enabled
    if (settings) {
      const isPaymentMethodEnabled = 
        (paymentMethod === 'cash' && settings.codEnabled) ||
        (paymentMethod === 'gcash' && settings.gcashEnabled) ||
        (paymentMethod === 'paymaya' && settings.mayaEnabled) ||
        (paymentMethod === 'card' && settings.cardEnabled);
      
      if (!isPaymentMethodEnabled) {
        toast({
          title: "Payment method unavailable",
          description: "The selected payment method is no longer available. Please choose another method.",
          variant: "destructive",
        });
        return;
      }
    }

    const deliveryAddress = [
      selectedAddress.lotHouseNo,
      selectedAddress.street,
      selectedAddress.barangay,
      selectedAddress.cityMunicipality,
      selectedAddress.province,
    ].filter(Boolean).join(", ");

    try {
      // For multi-merchant checkout, send all carts to backend to handle atomically
      if (allCarts.length > 1) {
        // Prepare all cart data for backend processing
        const checkoutData = {
          carts: allCarts.map(restaurantCart => {
            const subtotal = restaurantCart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const markupAmount = subtotal * (restaurantCart.markup / 100);
            const deliveryFee = calculatedDeliveryFees[restaurantCart.restaurantId] || 0;
            const convenienceFee = settings?.showConvenienceFee ? parseFloat(settings.convenienceFee || '0') : 0;
            const total = subtotal + markupAmount + deliveryFee + convenienceFee;

            return {
              restaurantId: restaurantCart.restaurantId,
              items: restaurantCart.items.map(item => ({
                menuItemId: item.menuItemId,
                name: item.name,
                price: item.price,
                quantity: item.quantity
              })),
              subtotal: subtotal.toFixed(2),
              markup: markupAmount.toFixed(2),
              deliveryFee: deliveryFee.toFixed(2),
              convenienceFee: convenienceFee.toFixed(2),
              total: total.toFixed(2),
            };
          }),
          deliveryAddress,
          deliveryLatitude: selectedAddress.latitude,
          deliveryLongitude: selectedAddress.longitude,
          phoneNumber,
          specialInstructions,
          paymentMethod,
        };

        // Backend will generate orderGroupId and create all orders atomically
        await apiRequest("POST", "/api/orders/checkout", checkoutData);
      } else {
        // Single merchant order - use existing endpoint
        const restaurantCart = allCarts[0];
        const subtotal = restaurantCart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const markupAmount = subtotal * (restaurantCart.markup / 100);
        const deliveryFee = calculatedDeliveryFees[restaurantCart.restaurantId] || 0;
        const convenienceFee = settings?.showConvenienceFee ? parseFloat(settings.convenienceFee || '0') : 0;
        const total = subtotal + markupAmount + deliveryFee + convenienceFee;

        const orderData = {
          restaurantId: restaurantCart.restaurantId,
          items: restaurantCart.items.map(item => ({
            menuItemId: item.menuItemId,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          subtotal: subtotal.toFixed(2),
          markup: markupAmount.toFixed(2),
          deliveryFee: deliveryFee.toFixed(2),
          convenienceFee: convenienceFee.toFixed(2),
          total: total.toFixed(2),
          deliveryAddress,
          deliveryLatitude: selectedAddress.latitude,
          deliveryLongitude: selectedAddress.longitude,
          phoneNumber,
          specialInstructions,
          paymentMethod,
          status: 'pending'
        };

        await apiRequest("POST", "/api/orders", orderData);
      }

      cart.clearAllCarts();
      setShowCheckout(false);
      setSelectedAddress(null);
      setPhoneNumber("");
      setSpecialInstructions("");
      setPaymentMethod("cash");
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Orders placed successfully!",
        description: `${allCarts.length} order${allCarts.length > 1 ? 's' : ''} submitted successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error placing orders",
        description: "There was an error processing your orders. Please try again.",
        variant: "destructive",
      });
    }
  };

  // SECURITY: Role-based access control - users can only see their own portal
  const getAuthorizedPortals = () => {
    if (!user) return [];
    
    // Each user can only access their own role's portal
    switch (user.role) {
      case 'customer':
        return [{ id: 'customer' as Portal, label: 'Customer', icon: '👤' }];
      case 'rider':
        return [{ id: 'rider' as Portal, label: 'Rider', icon: '🏍️' }];
      case 'merchant':
        return [{ id: 'merchant' as Portal, label: 'Merchant', icon: '🏪' }];
      case 'admin':
        return [{ id: 'admin' as Portal, label: 'Admin', icon: '⚙️' }];
      case 'owner':
        return [{ id: 'admin' as Portal, label: 'Owner Dashboard', icon: '👑' }];
      default:
        return [{ id: 'customer' as Portal, label: 'Customer', icon: '👤' }];
    }
  };

  const portalButtons = getAuthorizedPortals();

  // SECURITY: Enforce role-based portal access
  const renderPortal = () => {
    // Only render portal if user has access to it
    if (!user) return <CustomerPortal />;
    
    // Render portal based on user's actual role (ignore activePortal state)
    // This prevents blank page issues from race conditions
    switch (user.role) {
      case 'customer':
        return <CustomerPortal />;
      case 'rider':
        return <RiderPortal />;
      case 'merchant':
        return <MerchantPortal />;
      case 'admin':
        return <AdminPortal />;
      case 'owner':
        return <AdminPortal />;
      default:
        return <CustomerPortal />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              {settings?.logo ? (
                <img
                  src={settings.logo}
                  alt="App Logo"
                  className="w-10 h-10 object-contain"
                />
              ) : (
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <Bike className="text-primary-foreground text-lg" />
                </div>
              )}
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-foreground">Easy Buy Delivery</h1>
                <p className="text-xs text-muted-foreground">Online Food Delivery Services</p>
              </div>
            </div>

            {/* Portal Navigation */}
            <nav className="hidden md:flex items-center space-x-2">
              {portalButtons.map((portal) => (
                <Button
                  key={portal.id}
                  variant={activePortal === portal.id ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "transition-colors",
                    activePortal === portal.id && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => setActivePortal(portal.id)}
                  data-testid={`portal-${portal.id}`}
                >
                  <span className="mr-2">{portal.icon}</span>
                  {portal.label}
                </Button>
              ))}
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-3">
              {/* Cart Button - Only for Customer users */}
              {user?.role === 'customer' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="relative"
                  onClick={() => setShowAllCarts(true)}
                  data-testid="button-header-cart"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {cart.getAllCartsItemCount() > 0 && (
                    <span 
                      className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center"
                      data-testid="badge-cart-count"
                    >
                      {cart.getAllCartsItemCount()}
                    </span>
                  )}
                </Button>
              )}
              
              <NotificationDropdown />
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-medium">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-foreground">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                data-testid="button-logout"
              >
                {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Portal Selector */}
      <div className="md:hidden bg-card border-b border-border">
        <div className="flex overflow-x-auto px-4 py-2 space-x-2">
          {portalButtons.map((portal) => (
            <Button
              key={portal.id}
              variant={activePortal === portal.id ? "default" : "ghost"}
              size="sm"
              className={cn(
                "flex-shrink-0 whitespace-nowrap transition-colors",
                activePortal === portal.id && "bg-primary text-primary-foreground"
              )}
              onClick={() => setActivePortal(portal.id)}
              data-testid={`mobile-portal-${portal.id}`}
            >
              <span className="mr-2">{portal.icon}</span>
              {portal.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="min-h-screen">
        {renderPortal()}
      </main>

      {/* Chat Widget */}
      <ChatWidget />

      {/* View All Carts Dialog - Only for Customer users */}
      {user?.role === 'customer' && (
        <Dialog open={showAllCarts} onOpenChange={setShowAllCarts}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>All Restaurant Carts ({cart.getAllCartsCount()})</DialogTitle>
              <p className="text-sm text-muted-foreground">
                You have items in {cart.getAllCartsCount()} restaurant{cart.getAllCartsCount() > 1 ? 's' : ''}. Manage your carts below.
              </p>
            </DialogHeader>
            <div className="space-y-4">
              {Object.values(cart.allCarts).map((restaurantCart) => {
                const isActive = cart.activeRestaurantId === restaurantCart.restaurantId;
                const subtotal = restaurantCart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const markupAmount = subtotal * (restaurantCart.markup / 100);
                const deliveryFee = parseFloat(restaurantCart.deliveryFee.toString());
                const total = subtotal + markupAmount + deliveryFee;
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
                        {restaurantCart.items.map((item) => {
                          const markedUpPrice = item.price * (1 + restaurantCart.markup / 100);
                          return (
                            <div key={item.id} className="flex justify-between">
                              <span>{item.quantity}x {item.name}</span>
                              <span>₱{(markedUpPrice * item.quantity).toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between font-semibold text-base">
                          <span>Total:</span>
                          <span>₱{(subtotal + markupAmount).toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
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
                          className="w-full"
                          data-testid={`button-clear-cart-${restaurantCart.restaurantId}`}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
              
              {cart.getAllCartsCount() === 0 && (
                <p className="text-center text-muted-foreground py-8">No items in any cart</p>
              )}
              
              {cart.getAllCartsCount() > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between items-center pt-4">
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
                      onClick={() => {
                        setShowAllCarts(false);
                        setShowCheckout(true);
                      }}
                      className="flex-1"
                      data-testid="button-checkout-all-carts"
                    >
                      Checkout All Carts
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Individual Restaurant Cart Modal - Only for Customer users */}
      {user?.role === 'customer' && (
        <Dialog open={showCart} onOpenChange={setShowCart}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{cart.restaurantName || 'Restaurant'} - Cart</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Items from this restaurant only.
                {cart.getAllCartsCount() > 1 && (
                  <>
                    {' '}You have items in {cart.getAllCartsCount()} restaurant{cart.getAllCartsCount() > 1 ? 's' : ''}.{' '}
                    <button 
                      onClick={() => {
                        setShowCart(false);
                        setShowAllCarts(true);
                      }}
                      className="text-primary underline"
                      data-testid="link-view-all-carts-from-cart"
                    >
                      View all carts
                    </button>
                  </>
                )}
              </p>
            </DialogHeader>
            <div className="space-y-4">
              {cart.items.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Your cart is empty</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.items.map((item) => {
                      const markedUpPrice = item.price * (1 + cart.markup / 100);
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">₱{markedUpPrice.toFixed(2)} each</p>
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
                      );
                    })}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total:</span>
                      <span>₱{(cart.getSubtotal() + cart.getMarkupAmount()).toFixed(2)}</span>
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
                        setShowCart(false);
                        setShowCheckout(true);
                      }}
                      className="flex-1"
                      data-testid="button-checkout-from-cart"
                      disabled={cart.items.length === 0}
                    >
                      Go to Checkout
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Checkout Modal - Only for Customer users */}
      {user?.role === 'customer' && (
        <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Checkout</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <AddressSelector
                value={selectedAddress}
                onChange={setSelectedAddress}
                disabled={createOrderMutation.isPending}
              />
              
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
                    {settings?.codEnabled && <SelectItem value="cash">Cash on Delivery</SelectItem>}
                    {settings?.gcashEnabled && <SelectItem value="gcash">GCash</SelectItem>}
                    {settings?.mayaEnabled && <SelectItem value="paymaya">PayMaya</SelectItem>}
                    {settings?.cardEnabled && <SelectItem value="card">Credit/Debit Card</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h4 className="font-medium">Order Summary</h4>
                
                {Object.values(cart.allCarts).map((restaurantCart) => {
                  const subtotal = restaurantCart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                  const markupAmount = subtotal * (restaurantCart.markup / 100);
                  const deliveryFee = parseFloat(restaurantCart.deliveryFee.toString());
                  const total = subtotal + markupAmount + deliveryFee;

                  return (
                    <div key={restaurantCart.restaurantId} className="space-y-2 p-3 border rounded-lg">
                      <h5 className="font-semibold text-sm">{restaurantCart.restaurantName}</h5>
                      <div className="text-sm space-y-1">
                        {restaurantCart.items.map((item) => {
                          const markedUpPrice = item.price * (1 + restaurantCart.markup / 100);
                          return (
                            <div key={item.id} className="flex justify-between">
                              <span>{item.name} x{item.quantity}</span>
                              <span>₱{(markedUpPrice * item.quantity).toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                      <Separator />
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between font-semibold">
                          <span>Subtotal:</span>
                          <span>₱{(subtotal + markupAmount).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <Separator />
                
                {/* Calculate totals for checkout */}
                {(() => {
                  const itemsSubtotal = cart.getAllCartsTotal();
                  const totalDeliveryFees = Object.values(cart.allCarts).reduce((sum, restaurantCart) => {
                    return sum + (calculatedDeliveryFees[restaurantCart.restaurantId] || 0);
                  }, 0);
                  const convenienceFee = settings?.convenienceFee ? parseFloat(settings.convenienceFee) * cart.getAllCartsCount() : 0;
                  const showConvenienceFee = settings?.showConvenienceFee !== false;
                  const grandTotal = itemsSubtotal + totalDeliveryFees + (showConvenienceFee ? convenienceFee : 0);
                  
                  return (
                    <>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Items Subtotal:</span>
                          <span>₱{itemsSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delivery Fee:</span>
                          <span>₱{totalDeliveryFees.toFixed(2)}</span>
                        </div>
                        {showConvenienceFee && convenienceFee > 0 && (
                          <div className="flex justify-between">
                            <span>Convenience Fee:</span>
                            <span>₱{convenienceFee.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-bold">Total Amount:</span>
                        <span className="text-xl font-bold">₱{grandTotal.toFixed(2)}</span>
                      </div>
                    </>
                  );
                })()}
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
      )}
    </div>
  );
}
