import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Bell, Bike, ShoppingCart, Package, Plus, Minus, X } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import CustomerPortal from "@/components/portals/customer-portal";
import RiderPortal from "@/components/portals/rider-portal";
import MerchantPortal from "@/components/portals/merchant-portal";
import AdminPortal from "@/components/portals/admin-portal";
import ChatWidget from "@/components/chat/chat-widget";
import { cn } from "@/lib/utils";

type Portal = 'customer' | 'rider' | 'merchant' | 'admin' | 'owner';

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [activePortal, setActivePortal] = useState<Portal>((user?.role === 'owner' ? 'admin' : user?.role) || 'customer');
  const [showAllCarts, setShowAllCarts] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const cart = useCart();

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
    
    // Users can only access their own role's portal
    // Owner role can access admin portal
    const expectedPortal = user.role === 'owner' ? 'admin' : user.role;
    if (activePortal !== expectedPortal) {
      // Force active portal to match user role if unauthorized access attempted
      setActivePortal(expectedPortal);
      return null;
    }
    
    switch (activePortal) {
      case 'customer':
        return user.role === 'customer' ? <CustomerPortal /> : <CustomerPortal />;
      case 'rider':
        return user.role === 'rider' ? <RiderPortal /> : <CustomerPortal />;
      case 'merchant':
        return user.role === 'merchant' ? <MerchantPortal /> : <CustomerPortal />;
      case 'admin':
        return (user.role === 'admin' || user.role === 'owner') ? <AdminPortal /> : <CustomerPortal />;
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
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Bike className="text-primary-foreground text-lg" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-foreground">Easy Buy Delivery</h1>
                <p className="text-xs text-muted-foreground">Pabilir Padala Delivery Services</p>
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
              
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>
              
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
                          <span>₱{deliveryFee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-base pt-2">
                          <span>Total:</span>
                          <span>₱{total.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            cart.switchCart(restaurantCart.restaurantId);
                            setShowAllCarts(false);
                          }}
                          data-testid={`button-switch-cart-${restaurantCart.restaurantId}`}
                        >
                          View Cart
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            cart.switchCart(restaurantCart.restaurantId);
                            setShowAllCarts(false);
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
              
              {cart.getAllCartsCount() === 0 && (
                <p className="text-center text-muted-foreground py-8">No items in any cart</p>
              )}
              
              {cart.getAllCartsCount() > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">Combined Total</p>
                      <p className="text-sm text-muted-foreground">{cart.getAllCartsCount()} restaurant{cart.getAllCartsCount() > 1 ? 's' : ''}</p>
                    </div>
                    <p className="text-xl font-bold">₱{cart.getAllCartsTotal().toFixed(2)}</p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      cart.clearAllCarts();
                      setShowAllCarts(false);
                    }}
                    className="w-full"
                  >
                    Clear All Carts
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
