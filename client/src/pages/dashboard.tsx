import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Bell, Bike } from "lucide-react";
import CustomerPortal from "@/components/portals/customer-portal";
import RiderPortal from "@/components/portals/rider-portal";
import MerchantPortal from "@/components/portals/merchant-portal";
import AdminPortal from "@/components/portals/admin-portal";
import ChatWidget from "@/components/chat/chat-widget";
import { cn } from "@/lib/utils";

type Portal = 'customer' | 'rider' | 'merchant' | 'admin';

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [activePortal, setActivePortal] = useState<Portal>(user?.role || 'customer');

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
    if (activePortal !== user.role) {
      // Force active portal to match user role if unauthorized access attempted
      setActivePortal(user.role);
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
        return user.role === 'admin' ? <AdminPortal /> : <CustomerPortal />;
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
    </div>
  );
}
