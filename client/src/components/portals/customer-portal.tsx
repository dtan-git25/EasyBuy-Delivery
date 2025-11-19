import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCart } from "@/contexts/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Clock, Star, Search, Filter, Navigation, ArrowLeft, ShoppingCart, Plus, Minus, X, Package, User, Phone, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/lib/websocket";
import { useAuth } from "@/hooks/use-auth";
import { MenuItemOptionsModal } from "@/components/MenuItemOptionsModal";
import { AddressSelector } from "@/components/address-selector";
import type { SavedAddress } from "@shared/schema";
import { calculateDistance, calculateDeliveryFee } from "@/lib/haversine";

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
  ownerId?: string;
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
  convenienceFee?: string;
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

function RestaurantRating({ ownerId }: { ownerId?: string }) {
  const { data: ratingData } = useQuery<{ average: { average: number; count: number } }>({
    queryKey: ["/api/ratings/merchant", ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      if (!ownerId) return { average: { average: 0, count: 0 } };
      const response = await fetch(`/api/ratings/merchant/${ownerId}`);
      return response.json();
    },
  });

  const avgRating = ratingData?.average?.average || 0;
  const count = ratingData?.average?.count || 0;

  return (
    <div className="flex items-center space-x-1">
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      <span>
        {avgRating > 0 ? avgRating.toFixed(1) : "New"}
        {count > 0 && <span className="text-muted-foreground text-xs ml-1">({count})</span>}
      </span>
    </div>
  );
}

function OrderRatingDisplay({ order, onRateClick }: { order: Order; onRateClick: () => void }) {
  const { data: ratingData } = useQuery<{ rating: any }>({
    queryKey: ["/api/ratings/order", order.id],
    enabled: order.status === 'delivered',
    queryFn: async () => {
      const response = await fetch(`/api/ratings/order/${order.id}`);
      return response.json();
    },
  });

  const rating = ratingData?.rating;

  if (order.status !== 'delivered') {
    return null;
  }

  if (!rating) {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={onRateClick}
        data-testid={`button-rate-order-${order.id}`}
      >
        <Star className="mr-2 h-4 w-4" />
        Rate Order
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-green-600">✓ Rated</div>
      {rating.merchantRating && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Merchant:</span>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= rating.merchantRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="ml-1 text-sm font-medium">{rating.merchantRating}.0</span>
            </div>
          </div>
          {rating.merchantComment && (
            <p className="text-xs text-muted-foreground italic">"{rating.merchantComment}"</p>
          )}
        </div>
      )}
      {rating.riderRating && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rider:</span>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= rating.riderRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="ml-1 text-sm font-medium">{rating.riderRating}.0</span>
            </div>
          </div>
          {rating.riderComment && (
            <p className="text-xs text-muted-foreground italic">"{rating.riderComment}"</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CustomerPortal() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("distance");
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showAllCarts, setShowAllCarts] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [calculatedDeliveryFees, setCalculatedDeliveryFees] = useState<Record<string, number>>({});
  const [calculatedDistances, setCalculatedDistances] = useState<Record<string, number>>({});
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number }>({ lat: 14.5995, lng: 120.9842 }); // Default to Manila
  
  // Enhanced tracking state
  const [activeTab, setActiveTab] = useState("restaurants");
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<string | null>(null);
  
  // Options modal state
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedMenuItemForOptions, setSelectedMenuItemForOptions] = useState<MenuItem | null>(null);
  
  // Replace cart dialog state
  const [showReplaceCartDialog, setShowReplaceCartDialog] = useState(false);
  const [pendingMenuItem, setPendingMenuItem] = useState<MenuItem | null>(null);
  const [replacementScenario, setReplacementScenario] = useState<'single-merchant' | 'max-limit' | null>(null);
  
  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedEmail, setEditedEmail] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  
  // Rating modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedOrderForRating, setSelectedOrderForRating] = useState<Order | null>(null);
  const [merchantRating, setMerchantRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [merchantComment, setMerchantComment] = useState("");
  const [riderComment, setRiderComment] = useState("");
  // Multi-merchant rating state
  const [merchantRatings, setMerchantRatings] = useState<Record<string, { rating: number; comment: string }>>({});
  
  const cart = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { socket, sendMessage } = useWebSocket();

  const { data: restaurants = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  // Fetch ALL menu items for search purposes
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
    queryKey: ["/api/restaurants", selectedRestaurant?.id, "menu-items"],
    enabled: !!selectedRestaurant?.id,
  });

  // Fetch menu organized by groups for customer view
  const { data: menuByGroups } = useQuery<{ groups: any[]; ungroupedItems: any[] }>({
    queryKey: ["/api/restaurants", selectedRestaurant?.id, "menu-by-groups"],
    queryFn: async () => {
      if (!selectedRestaurant?.id) return { groups: [], ungroupedItems: [] };
      const response = await fetch(`/api/restaurants/${selectedRestaurant.id}/menu-by-groups`);
      if (!response.ok) throw new Error('Failed to fetch menu by groups');
      return response.json();
    },
    enabled: !!selectedRestaurant?.id,
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

  // Fetch system settings for delivery fee calculation
  const { data: settings } = useQuery<any>({
    queryKey: ["/api/settings"],
  });

  // Fetch saved addresses for profile view
  const { data: savedAddresses = [] } = useQuery<SavedAddress[]>({
    queryKey: ["/api/saved-addresses"],
    enabled: activeTab === "profile",
  });

  // Create order mutation for all carts
  const createOrderMutation = useMutation({
    mutationFn: async (checkoutData: any) => {
      const response = await apiRequest("POST", "/api/orders/checkout", checkoutData);
      return response.json();
    },
    onSuccess: () => {
      cart.clearAllCarts();
      setShowCheckout(false);
      setActiveTab("orders"); // Switch to orders tab after successful order
      toast({
        title: "Orders placed successfully!",
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

  // Update customer profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { email?: string; phone?: string }) => {
      const response = await apiRequest("PATCH", "/api/customer/profile", data);
      return response.json();
    },
    onSuccess: () => {
      setIsEditingProfile(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: () => {
      toast({
        title: "Error updating profile",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Submit rating mutation
  const submitRatingMutation = useMutation({
    mutationFn: async (data: { orderId: string; merchantRating?: number; riderRating?: number; merchantComment?: string; riderComment?: string }) => {
      const response = await apiRequest("POST", "/api/ratings", data);
      return response.json();
    },
    onSuccess: (data, variables) => {
      setShowRatingModal(false);
      setMerchantRating(0);
      setRiderRating(0);
      setMerchantComment("");
      setRiderComment("");
      setMerchantRatings({});
      setSelectedOrderForRating(null);
      toast({
        title: "Rating submitted",
        description: "Thank you for your feedback!",
      });
      // Invalidate all queries related to orders and ratings
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/ratings');
        }
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error submitting rating",
        description: error.message || "There was an error submitting your rating. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Submit multi-merchant rating mutation
  const submitMultiMerchantRatingMutation = useMutation({
    mutationFn: async (data: { 
      merchantOrders: Array<{ orderId: string; merchantRating: number; merchantComment: string }>;
      riderRating?: number;
      riderComment?: string;
    }) => {
      // Submit ratings for all merchant orders
      const promises = data.merchantOrders.map(mo => 
        apiRequest("POST", "/api/ratings", {
          orderId: mo.orderId,
          merchantRating: mo.merchantRating || undefined,
          merchantComment: mo.merchantComment || undefined,
          riderRating: data.riderRating || undefined,
          riderComment: data.riderComment || undefined,
        }).then(r => r.json())
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      setShowRatingModal(false);
      setMerchantRating(0);
      setRiderRating(0);
      setMerchantComment("");
      setRiderComment("");
      setMerchantRatings({});
      setSelectedOrderForRating(null);
      toast({
        title: "Ratings submitted",
        description: "Thank you for your feedback!",
      });
      // Invalidate all queries related to orders and ratings
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/ratings');
        }
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error submitting ratings",
        description: error.message || "There was an error submitting your ratings. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Calculate delivery fees based on distance when address changes
  useEffect(() => {
    if (!settings) {
      return;
    }

    const baseRate = parseFloat(settings.baseDeliveryRate || '50');
    const succeedingRate = parseFloat(settings.deliveryRatePerKm || '10');
    const fees: Record<string, number> = {};

    // If customer coordinates are missing, use base rate fallback for all restaurants
    if (!selectedAddress?.latitude || !selectedAddress?.longitude) {
      const distances: Record<string, number> = {};
      Object.values(cart.allCarts).forEach((restaurantCart) => {
        fees[restaurantCart.restaurantId] = baseRate;
        distances[restaurantCart.restaurantId] = 0;
      });
      setCalculatedDeliveryFees(fees);
      setCalculatedDistances(distances);
      return;
    }

    const customerLat = parseFloat(selectedAddress.latitude);
    const customerLng = parseFloat(selectedAddress.longitude);

    // Calculate delivery fee for each restaurant in the cart
    const distances: Record<string, number> = {};
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
        distances[restaurantCart.restaurantId] = Math.ceil(distance); // Round up to whole number
      } else {
        // Fallback to default delivery fee if restaurant coordinates not available
        fees[restaurantCart.restaurantId] = baseRate;
        distances[restaurantCart.restaurantId] = 0;
      }
    });

    setCalculatedDeliveryFees(fees);
    setCalculatedDistances(distances);
  }, [selectedAddress, settings, cart.allCarts, restaurants]);

  // Get customer's current location using browser geolocation API
  useEffect(() => {
    if ('geolocation' in navigator && activeTab === 'restaurants') {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCustomerLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          // Silently fail and keep using Manila as default
          console.log('Geolocation error:', error.message);
        }
      );
    }
  }, [activeTab]);

  // Initialize profile edit form when entering edit mode
  useEffect(() => {
    if (isEditingProfile && user) {
      setEditedEmail(user.email || "");
      setEditedPhone(user.phone || "");
    }
  }, [isEditingProfile, user]);

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

            case 'chat_message':
              // Show toast notification for new chat messages
              if (data.message?.sender?.id !== user.id) {
                const order = orders.find(o => o.id === data.orderId);
                const senderName = data.message?.sender ? 
                  `${data.message.sender.firstName} ${data.message.sender.lastName}` : 
                  'Someone';
                toast({
                  title: `New message from ${senderName}`,
                  description: order ? `Order #${order.orderNumber}: ${data.message?.message || ''}` : data.message?.message || '',
                });
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

  // Pre-fill phone number from user profile
  useEffect(() => {
    if (user?.phone && !phoneNumber) {
      setPhoneNumber(user.phone);
    }
  }, [user]);

  const filteredRestaurants = useMemo(() => {
    const filtered = restaurants.filter((restaurant: Restaurant) => {
      // Search: Check restaurant name and cuisine
      const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           restaurant.cuisine.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch && restaurant.isActive;
    });

    // Sort restaurants by distance (farthest to nearest)
    // Use customer's actual location from geolocation API or default to Manila
    const restaurantsWithDistance = filtered.map((restaurant: Restaurant) => {
      let distance = 0;
      
      if ((restaurant as any).latitude && (restaurant as any).longitude) {
        const restaurantLat = parseFloat((restaurant as any).latitude);
        const restaurantLng = parseFloat((restaurant as any).longitude);
        
        // Calculate distance using Haversine formula with customer's location
        distance = calculateDistance(customerLocation.lat, customerLocation.lng, restaurantLat, restaurantLng);
      }
      
      return { ...restaurant, distance };
    });

    // Sort from farthest to nearest (descending order)
    return restaurantsWithDistance.sort((a, b) => b.distance - a.distance);
  }, [restaurants, searchQuery, customerLocation]);

  // Menu items are now organized by groups from the API
  // menuByGroups contains: { groups: [...], ungroupedItems: [...] }

  const openOptionsModal = (menuItem: MenuItem) => {
    if (!selectedRestaurant) return;
    
    // Check if we can add from this restaurant
    const validation = cart.canAddFromRestaurant(selectedRestaurant.id);
    
    if (!validation.allowed) {
      if (validation.reason === 'single-merchant-only') {
        // Show replace cart dialog for single merchant mode
        setPendingMenuItem(menuItem);
        setReplacementScenario('single-merchant');
        setShowReplaceCartDialog(true);
        return;
      } else if (validation.reason === 'max-merchants-reached') {
        // Show replace cart dialog for max limit scenario
        setPendingMenuItem(menuItem);
        setReplacementScenario('max-limit');
        setShowReplaceCartDialog(true);
        return;
      } else {
        // Fallback: handle any other validation failure
        console.error('Unexpected validation failure reason:', validation.reason);
        setPendingMenuItem(menuItem);
        setReplacementScenario('max-limit'); // Default to max-limit scenario
        setShowReplaceCartDialog(true);
        return;
      }
    }
    
    // If allowed, proceed to open options modal
    setSelectedMenuItemForOptions(menuItem);
    setShowOptionsModal(true);
  };

  const handleConfirmReplaceCart = () => {
    if (!pendingMenuItem || !selectedRestaurant) return;
    
    if (replacementScenario === 'single-merchant') {
      // Single merchant mode: Clear all existing carts
      cart.clearAllCarts();
      toast({
        title: "Cart replaced",
        description: `Your previous cart has been cleared. You can now add items from ${selectedRestaurant.name}.`,
      });
    } else if (replacementScenario === 'max-limit') {
      // Multi-merchant max limit: Remove the oldest cart to make room
      const carts = Object.values(cart.allCarts);
      if (carts.length > 0) {
        // Get the first cart (oldest) and remove it
        const oldestCart = carts[0];
        cart.clearRestaurantCart(oldestCart.restaurantId);
        toast({
          title: "Cart replaced",
          description: `Items from ${oldestCart.restaurantName} have been removed. You can now add items from ${selectedRestaurant.name}.`,
        });
      }
    }
    
    // Open options modal for the pending item
    setSelectedMenuItemForOptions(pendingMenuItem);
    setShowOptionsModal(true);
    
    // Close the replace dialog and clear state
    setShowReplaceCartDialog(false);
    setPendingMenuItem(null);
    setReplacementScenario(null);
  };

  const handleAddToCartWithOptions = (quantity: number, selectedOptions: any[], totalPrice: number) => {
    if (!selectedRestaurant || !selectedMenuItemForOptions) return;
    
    // Convert selected options to variants format for cart, filtering out "None" selections
    const variants: Record<string, string> = {};
    selectedOptions.forEach(opt => {
      if (opt.valueName !== "None" && opt.price > 0) {
        variants[opt.optionTypeName] = opt.valueName;
      }
    });

    // Prepare selectedOptions array for display (filter out "None" selections)
    const cartSelectedOptions = selectedOptions
      .filter(opt => opt.valueName !== "None")
      .map(opt => ({
        optionTypeName: opt.optionTypeName,
        valueName: opt.valueName,
        price: opt.price
      }));

    console.log('=== ADDING TO CART WITH OPTIONS ===');
    console.log('Selected options from modal:', selectedOptions);
    console.log('Filtered cart options:', cartSelectedOptions);

    // Store ONLY base price in item.price (NOT including options)
    // Options are stored separately in selectedOptions and added by getItemTotalPrice()
    const basePrice = parseFloat(selectedMenuItemForOptions.price.toString());

    // Add item to cart with proper quantity
    for (let i = 0; i < quantity; i++) {
      const itemToAdd = {
        menuItemId: selectedMenuItemForOptions.id,
        name: selectedMenuItemForOptions.name,
        price: basePrice,  // ONLY base price, NOT including options
        restaurant: {
          id: selectedRestaurant.id,
          name: selectedRestaurant.name,
          deliveryFee: parseFloat(selectedRestaurant.deliveryFee.toString()),
          markup: parseFloat(selectedRestaurant.markup.toString())
        },
        variants: Object.keys(variants).length > 0 ? variants : undefined,
        selectedOptions: cartSelectedOptions.length > 0 ? cartSelectedOptions : undefined
      };
      console.log('Item being added to cart:', itemToAdd);
      cart.addItem(itemToAdd);
    }
    
    // Filter "None" options from toast message
    const nonNoneOptions = selectedOptions.filter(opt => opt.valueName !== "None" && opt.price > 0);
    const optionsText = nonNoneOptions.length > 0 
      ? ` with ${nonNoneOptions.map(opt => opt.valueName).join(', ')}`
      : '';
    
    toast({
      title: "Added to cart",
      description: `${quantity}x ${selectedMenuItemForOptions.name}${optionsText} has been added to your cart.`,
    });
  };

  const handleCheckout = () => {
    // Validate that we have at least one cart
    const allCarts = Object.values(cart.allCarts);
    if (allCarts.length === 0 || allCarts.every(c => c.items.length === 0)) {
      toast({
        title: "Cart is empty",
        description: "Please add items to your cart before checkout.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedAddress || !phoneNumber.trim()) {
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

    // Prepare checkout data for the /api/orders/checkout endpoint
    const convenienceFee = settings?.convenienceFee ? parseFloat(settings.convenienceFee) : 0;
    const showConvenienceFee = settings?.showConvenienceFee !== false;
    
    const deliveryAddress = [
      selectedAddress.lotHouseNo,
      selectedAddress.street,
      selectedAddress.barangay,
      selectedAddress.cityMunicipality,
      selectedAddress.province
    ].filter(Boolean).join(", ");

    const carts = allCarts
      .filter(restaurantCart => restaurantCart.items.length > 0)
      .map(restaurantCart => {
        const subtotal = restaurantCart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const markupAmount = (subtotal * restaurantCart.markup) / 100;
        const deliveryFee = calculatedDeliveryFees[restaurantCart.restaurantId] || 0;
        const orderConvenienceFee = showConvenienceFee ? convenienceFee : 0;
        const total = subtotal + markupAmount + deliveryFee + orderConvenienceFee;

        return {
          restaurantId: restaurantCart.restaurantId,
          items: restaurantCart.items.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price,
            name: item.name
          })),
          subtotal: subtotal.toFixed(2),
          markup: markupAmount.toFixed(2),
          deliveryFee: deliveryFee.toFixed(2),
          convenienceFee: orderConvenienceFee.toFixed(2),
          total: total.toFixed(2),
        };
      });

    const checkoutData = {
      carts,
      deliveryAddress,
      deliveryLatitude: selectedAddress.latitude,
      deliveryLongitude: selectedAddress.longitude,
      landmark: selectedAddress.landmark,
      phoneNumber,
      specialInstructions,
      paymentMethod,
    };

    console.log('=== CHECKOUT DATA (FRONTEND) ===');
    console.log('Selected Address FULL:', JSON.stringify(selectedAddress, null, 2));
    console.log('Landmark from selectedAddress:', selectedAddress.landmark);
    console.log('Landmark type:', typeof selectedAddress.landmark);
    console.log('Landmark value:', JSON.stringify(selectedAddress.landmark));
    console.log('Checkout data FULL:', JSON.stringify(checkoutData, null, 2));

    createOrderMutation.mutate(checkoutData);
  };

  // Extract restaurant values for use in modals (outside if block scope)
  const restaurantMarkupForModal = selectedRestaurant?.markup ?? 0;
  const restaurantNameForModal = selectedRestaurant?.name ?? '';

  // Restaurant Detail View with Real Menu Items
  if (selectedRestaurant) {
    // Extract values to avoid TypeScript narrowing issues
    const currentRestaurant = selectedRestaurant;
    const restaurantMarkup = selectedRestaurant.markup;
    const restaurantName = selectedRestaurant.name;
    
    return (
      <div className="min-h-screen bg-background">
        {/* Restaurant Header */}
        <div className="relative h-64 bg-cover bg-center" style={{backgroundImage: `url(${selectedRestaurant.image})`}}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full relative">
            <div className="absolute top-4 left-4 sm:left-6 lg:left-8 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedRestaurant(null);
                  setShowReplaceCartDialog(false);
                  setPendingMenuItem(null);
                  setReplacementScenario(null);
                }}
                className="text-white hover:bg-white/20"
                data-testid="button-back-to-restaurants"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Restaurants
              </Button>
            </div>
            <div className="absolute bottom-4 left-4 sm:left-6 lg:left-8 text-white">
              <h1 className="text-3xl font-bold">{selectedRestaurant.name}</h1>
              <div className="flex items-center mt-2">
                <RestaurantRating ownerId={selectedRestaurant.ownerId} />
              </div>
            </div>
          </div>
        </div>

        {/* Menu Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Menu</h2>
          </div>
          
          {!menuByGroups || (menuByGroups.groups.length === 0 && menuByGroups.ungroupedItems.length === 0) ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No menu items available at this restaurant.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Display Menu Groups */}
              {menuByGroups.groups.map((group) => (
                <div key={group.id}>
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-foreground">{group.groupName}</h3>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    {group.items.map((item: any) => (
                      <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`menu-item-${item.id}`}>
                        {/* Menu Item Image */}
                        {item.image ? (
                          <div className="aspect-square w-full">
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                              data-testid={`img-menu-item-${item.id}`}
                            />
                          </div>
                        ) : (
                          <div className="aspect-square w-full bg-muted flex items-center justify-center">
                            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        
                        {/* Menu Item Details */}
                        <div className="p-3 lg:p-4 flex flex-col">
                          <h4 className="font-semibold text-foreground line-clamp-2 min-h-[2.5rem]">{item.name}</h4>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 hidden lg:block">{item.description}</p>
                          )}
                          <div className="mt-auto pt-3">
                            <p className="text-lg font-bold text-green-600 mb-2">₱{(Number(item.price) * (1 + selectedRestaurant.markup / 100)).toFixed(2)}</p>
                            {!item.isAvailable ? (
                              <Badge variant="destructive" className="w-full justify-center py-2">Unavailable</Badge>
                            ) : (
                              <Button
                                onClick={() => openOptionsModal(item)}
                                className="w-full"
                                size="sm"
                                data-testid={`button-add-to-cart-${item.id}`}
                              >
                                <ShoppingCart className="mr-1 h-3 w-3 lg:h-4 lg:w-4" />
                                <span className="hidden lg:inline">Add to Cart</span>
                                <span className="lg:hidden">Add</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Display Ungrouped Items */}
              {menuByGroups.ungroupedItems.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-foreground">Other Items</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    {menuByGroups.ungroupedItems.map((item: any) => (
                      <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`menu-item-${item.id}`}>
                        {/* Menu Item Image */}
                        {item.image ? (
                          <div className="aspect-square w-full">
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                              data-testid={`img-menu-item-${item.id}`}
                            />
                          </div>
                        ) : (
                          <div className="aspect-square w-full bg-muted flex items-center justify-center">
                            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        
                        {/* Menu Item Details */}
                        <div className="p-3 lg:p-4 flex flex-col">
                          <h4 className="font-semibold text-foreground line-clamp-2 min-h-[2.5rem]">{item.name}</h4>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 hidden lg:block">{item.description}</p>
                          )}
                          <div className="mt-auto pt-3">
                            <p className="text-lg font-bold text-green-600 mb-2">₱{(Number(item.price) * (1 + selectedRestaurant.markup / 100)).toFixed(2)}</p>
                            {!item.isAvailable ? (
                              <Badge variant="destructive" className="w-full justify-center py-2">Unavailable</Badge>
                            ) : (
                              <Button
                                onClick={() => openOptionsModal(item)}
                                className="w-full"
                                size="sm"
                                data-testid={`button-add-to-cart-${item.id}`}
                              >
                                <ShoppingCart className="mr-1 h-3 w-3 lg:h-4 lg:w-4" />
                                <span className="hidden lg:inline">Add to Cart</span>
                                <span className="lg:hidden">Add</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Modal - Restaurant Specific */}
        <Dialog open={showCart} onOpenChange={setShowCart}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedRestaurant.name} - Cart</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Items from this restaurant only.
              </p>
            </DialogHeader>
            <div className="space-y-4">
              {cart.items.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Your cart is empty</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.items.map((item) => {
                      const markedUpPrice = Number(item.price) * (1 + selectedRestaurant.markup / 100);
                      return (
                        <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-1">
                              <h4 className="font-medium">{item.name} × {item.quantity}</h4>
                              <span className="font-semibold">₱{(markedUpPrice * item.quantity).toFixed(2)}</span>
                            </div>
                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                              <div className="ml-3 space-y-0.5 mb-2">
                                {item.selectedOptions.map((opt, idx) => (
                                  <p key={idx} className="text-xs text-muted-foreground">
                                    • {opt.optionTypeName}: {opt.valueName}{opt.price > 0 ? ` (₱${opt.price.toFixed(2)})` : ''}
                                  </p>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">₱{markedUpPrice.toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center space-x-2 ml-2">
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
                      <span>Subtotal:</span>
                      <span>₱{cart.getSubtotal().toFixed(2)}</span>
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
                          <div key={item.id} className="space-y-0.5">
                            <div className="flex justify-between font-medium">
                              <span>{item.quantity}× {item.name}</span>
                              <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                              <div className="ml-3 space-y-0.5">
                                {item.selectedOptions.map((opt, idx) => (
                                  <div key={idx} className="text-xs text-muted-foreground">
                                    • {opt.optionTypeName}: {opt.valueName}{opt.price > 0 ? ` (₱${opt.price.toFixed(2)})` : ''}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between font-semibold text-base">
                          <span>Subtotal:</span>
                          <span>₱{subtotal.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            cart.switchCart(restaurantCart.restaurantId);
                            setShowAllCarts(false);
                            setShowCart(true);
                          }}
                          className="flex-1"
                          data-testid={`button-view-cart-modal-${restaurantCart.restaurantId}`}
                        >
                          View Cart
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
                  <p className="font-semibold text-lg">Subtotal for All Carts</p>
                  <p className="text-sm text-muted-foreground">{cart.getAllCartsCount()} restaurant{cart.getAllCartsCount() > 1 ? 's' : ''}</p>
                </div>
                <p className="text-2xl font-bold">₱{(() => {
                  const allCartsSubtotal = Object.values(cart.allCarts).reduce((total, restaurantCart) => {
                    const subtotal = restaurantCart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const markupAmount = (subtotal * restaurantCart.markup) / 100;
                    return total + subtotal + markupAmount;
                  }, 0);
                  return allCartsSubtotal.toFixed(2);
                })()}</p>
              </div>
              
              {cart.getAllCartsCount() > 1 && (() => {
                const merchantCount = cart.getAllCartsCount();
                const multiMerchantFeePerMerchant = settings?.multiMerchantFee ? parseFloat(settings.multiMerchantFee as string) : 20;
                const totalMultiMerchantFee = (merchantCount - 1) * multiMerchantFeePerMerchant;
                return (
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg mt-2">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> Multi-merchant fee of ₱{totalMultiMerchantFee.toFixed(2)} will be added at checkout (₱{multiMerchantFeePerMerchant.toFixed(2)} per additional store)
                    </p>
                  </div>
                );
              })()}
              
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
              <AddressSelector
                value={selectedAddress}
                onChange={setSelectedAddress}
                disabled={createOrderMutation.isPending}
              />
              
              <div>
                <label className="block text-sm font-medium mb-2">Receiver's Phone Number *</label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter receiver's phone number"
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
                <div className="text-sm space-y-2">
                  {cart.items.map((item) => (
                    <div key={item.id} className="space-y-0.5">
                      <div className="flex justify-between font-medium">
                        <span>{item.name} × {item.quantity}</span>
                        <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <div className="ml-3 space-y-0.5">
                          {item.selectedOptions.map((opt, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                              <span>• {opt.optionTypeName}: {opt.valueName}</span>
                              {opt.price > 0 && <span>(₱{opt.price.toFixed(2)})</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Separator />
                {(() => {
                  const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                  const markupAmount = (subtotal * cart.markup) / 100;
                  const itemsSubtotal = subtotal + markupAmount;
                  const deliveryFee = cart.restaurantId ? (calculatedDeliveryFees[cart.restaurantId] || 0) : 0;
                  const distance = cart.restaurantId ? (calculatedDistances[cart.restaurantId] || 0) : 0;
                  const convenienceFee = settings?.convenienceFee ? parseFloat(settings.convenienceFee) : 0;
                  const showConvenienceFee = settings?.showConvenienceFee !== false;
                  const total = itemsSubtotal + deliveryFee + (showConvenienceFee ? convenienceFee : 0);
                  
                  return (
                    <>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Items Subtotal:</span>
                          <span>₱{itemsSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Delivery Fee {distance > 0 ? `(${distance} km)` : ''}:</span>
                          <span>₱{deliveryFee.toFixed(2)}</span>
                        </div>
                        {showConvenienceFee && convenienceFee > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Rider's Convenience Fee:</span>
                            <span>₱{convenienceFee.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total Amount:</span>
                        <span>₱{total.toFixed(2)}</span>
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

        {/* Options Selection Modal */}
        <MenuItemOptionsModal
          isOpen={showOptionsModal}
          onClose={() => setShowOptionsModal(false)}
          menuItem={selectedMenuItemForOptions}
          onAddToCart={handleAddToCartWithOptions}
          restaurantMarkup={restaurantMarkup}
        />
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
            
            {/* Search and Filter */}
            <div className="max-w-4xl mx-auto bg-card text-card-foreground rounded-xl p-4 shadow-lg">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search restaurants, cuisines, or food categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    data-testid="input-restaurant-search"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content with Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full md:grid md:grid-cols-3 mb-8">
            <TabsTrigger value="restaurants" data-testid="tab-restaurants">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Restaurants
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">
              <Package className="mr-2 h-4 w-4" />
              My Orders
            </TabsTrigger>
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="mr-2 h-4 w-4" />
              My Account
            </TabsTrigger>
          </TabsList>

          {/* Restaurants Tab */}
          <TabsContent value="restaurants" className="space-y-6">
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
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredRestaurants.map((restaurant: Restaurant) => {
                const restaurantCart = cart.allCarts[restaurant.id];
                const itemCount = restaurantCart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
                
                return (
                  <Card 
                    key={restaurant.id} 
                    className="cursor-pointer transition-transform hover:scale-105 hover:shadow-lg relative"
                    onClick={() => {
                      setSelectedRestaurant(restaurant);
                      setShowReplaceCartDialog(false);
                      setPendingMenuItem(null);
                      setReplacementScenario(null);
                    }}
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
                      <div className="flex items-start justify-between">
                        <h4 className="text-lg font-semibold text-foreground">{restaurant.name}</h4>
                        <RestaurantRating ownerId={restaurant.ownerId} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
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
                orders.map((order) => {
                  // Check if this is a grouped multi-merchant order
                  const isGroupedOrder = (order as any).merchantOrders && (order as any).merchantOrders.length > 0;
                  const merchantOrders = (order as any).merchantOrders || [];
                  
                  return (
                  <Card key={order.id} className="overflow-hidden" data-testid={`order-${order.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">Order #{order.orderNumber}</h3>
                          {isGroupedOrder ? (
                            <>
                              <Badge variant="secondary" className="mt-1 mb-2">
                                Multi-Merchant ({merchantOrders.length} stores)
                              </Badge>
                              <div className="text-sm space-y-1">
                                {merchantOrders.map((mo: any, idx: number) => (
                                  <p key={mo.id} className="text-sm font-medium text-primary">
                                    • {mo.restaurantName}
                                  </p>
                                ))}
                              </div>
                              {(() => {
                                const deliveredCount = merchantOrders.filter((mo: any) => mo.status === 'delivered').length;
                                const cancelledCount = merchantOrders.filter((mo: any) => mo.status === 'cancelled').length;
                                const totalCount = merchantOrders.length;
                                const activeCount = totalCount - cancelledCount;
                                
                                // All cancelled
                                if (cancelledCount === totalCount) {
                                  return (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      All orders cancelled
                                    </p>
                                  );
                                }
                                // All delivered (no cancelled)
                                else if (deliveredCount === totalCount) {
                                  return (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      All orders delivered
                                    </p>
                                  );
                                }
                                // All active delivered (some cancelled)
                                else if (activeCount > 0 && deliveredCount === activeCount) {
                                  return (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {deliveredCount} delivered, {cancelledCount} cancelled
                                    </p>
                                  );
                                }
                                // Mixed states
                                else {
                                  return (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {deliveredCount} of {totalCount} delivered
                                      {cancelledCount > 0 ? `, ${cancelledCount} cancelled` : ''}
                                    </p>
                                  );
                                }
                              })()}
                            </>
                          ) : (
                            <p className="text-sm font-medium text-primary mb-1">
                              {(order as any).restaurantName || 'Restaurant'}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            Placed on {new Date(order.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {isGroupedOrder ? (
                          (() => {
                            const deliveredCount = merchantOrders.filter((mo: any) => mo.status === 'delivered').length;
                            const cancelledCount = merchantOrders.filter((mo: any) => mo.status === 'cancelled').length;
                            const totalCount = merchantOrders.length;
                            const activeCount = totalCount - cancelledCount;
                            
                            // All delivered (including cases where some are cancelled)
                            if (deliveredCount === activeCount && activeCount > 0) {
                              return (
                                <Badge variant="default">
                                  {cancelledCount > 0 ? 'Partially Completed' : 'Completed'}
                                </Badge>
                              );
                            }
                            // All cancelled
                            else if (cancelledCount === totalCount) {
                              return (
                                <Badge variant="destructive">
                                  Cancelled
                                </Badge>
                              );
                            }
                            // Some delivered or in progress
                            else if (deliveredCount > 0) {
                              return (
                                <Badge variant="outline">
                                  In Progress
                                </Badge>
                              );
                            }
                            // None delivered yet (pending or preparing)
                            else {
                              return (
                                <Badge variant="secondary">
                                  Processing
                                </Badge>
                              );
                            }
                          })()
                        ) : (
                          <Badge variant={
                            order.status === 'delivered' ? 'default' :
                            order.status === 'cancelled' ? 'destructive' :
                            order.status === 'pending' ? 'secondary' : 'outline'
                          }>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                        )}
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

                      {/* Rider Information - Show when order is accepted or in progress */}
                      {(order as any).riderName && (order.status === 'accepted' || order.status === 'preparing' || order.status === 'ready' || order.status === 'picked_up') && (
                        <div className="bg-muted/50 rounded-lg p-4 mb-4">
                          <h4 className="font-medium mb-2 flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            Rider Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Name:</span>
                              <span className="ml-2 font-medium" data-testid={`text-rider-name-${order.id}`}>
                                {(order as any).riderName}
                              </span>
                            </div>
                            {(order as any).riderPhone && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Phone:</span>
                                <span className="ml-2 font-medium" data-testid={`text-rider-phone-${order.id}`}>
                                  {(order as any).riderPhone}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Order Items Breakdown - Show merchant orders for grouped orders */}
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Order Items</h4>
                        {isGroupedOrder ? (
                          <div className="space-y-4">
                            {merchantOrders.map((merchantOrder: any) => (
                              <div key={merchantOrder.id} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-sm">{merchantOrder.restaurantName}</h5>
                                  <Badge variant="secondary" className="text-xs">
                                    {merchantOrder.status.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                </div>
                                <div className="space-y-2 text-sm">
                                  {(() => {
                                    // Calculate markup percentage for this merchant order
                                    const items = merchantOrder.items as Array<{ name: string; quantity: number; price: string }>;
                                    const markup = parseFloat(merchantOrder.markup || '0');
                                    const subtotal = items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);
                                    const markupPercentage = subtotal > 0 ? (markup / subtotal) * 100 : 0;
                                    
                                    return items.map((item: any, idx: number) => {
                                      const basePrice = parseFloat(item.price);
                                      const markedUpPrice = basePrice * (1 + markupPercentage / 100);
                                      return (
                                        <div key={idx} className="space-y-1">
                                          <div className="flex justify-between font-medium">
                                            <span>{item.name} x{item.quantity}</span>
                                            <span>₱{(markedUpPrice * item.quantity).toFixed(2)}</span>
                                          </div>
                                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                                            <div className="ml-4 space-y-0.5">
                                              {item.selectedOptions.map((opt: any, optIdx: number) => (
                                                <div key={optIdx} className="flex justify-between text-xs text-muted-foreground" data-testid={`text-option-${idx}-${optIdx}`}>
                                                  <span>{opt.optionTypeName}: {opt.valueName}</span>
                                                  {opt.price > 0 && <span>(₱{opt.price.toFixed(2)})</span>}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                                <div className="mt-2 pt-2 border-t flex justify-between items-center text-sm">
                                  <span className="font-medium">Subtotal:</span>
                                  <span className="font-semibold">₱{(parseFloat(merchantOrder.subtotal) + parseFloat(merchantOrder.markup)).toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2 text-sm">
                            {(() => {
                              const orderItems = order.items as Array<{ name: string; quantity: number; price: string }>;
                              const markup = parseFloat(order.markup);
                              const subtotal = orderItems.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);
                              const markupPercentage = (markup / subtotal) * 100;
                              
                              return orderItems.map((item: any, index: number) => {
                                const basePrice = parseFloat(item.price);
                                const markedUpPrice = basePrice * (1 + markupPercentage / 100);
                                return (
                                  <div key={index} className="space-y-1">
                                    <div className="flex justify-between font-medium">
                                      <span>{item.name} x{item.quantity}</span>
                                      <span>₱{(markedUpPrice * item.quantity).toFixed(2)}</span>
                                    </div>
                                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                                      <div className="ml-4 space-y-0.5">
                                        {item.selectedOptions.map((opt: any, optIdx: number) => (
                                          <div key={optIdx} className="flex justify-between text-xs text-muted-foreground" data-testid={`text-option-${index}-${optIdx}`}>
                                            <span>{opt.optionTypeName}: {opt.valueName}</span>
                                            {opt.price > 0 && <span>(₱{opt.price.toFixed(2)})</span>}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Order Cost Breakdown */}
                      <div className="border-t pt-3 mb-4">
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Total:</span>
                            <span>₱{(() => {
                              if (isGroupedOrder) {
                                // Sum all merchant subtotals and markups
                                const totalAmount = merchantOrders.reduce((sum: number, mo: any) => {
                                  return sum + parseFloat(mo.subtotal || '0') + parseFloat(mo.markup || '0');
                                }, 0);
                                return totalAmount.toFixed(2);
                              } else {
                                // Single merchant order
                                return (parseFloat(order.subtotal) + parseFloat(order.markup)).toFixed(2);
                              }
                            })()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Delivery Fee:</span>
                            <span>₱{parseFloat(order.deliveryFee).toFixed(2)}</span>
                          </div>
                          {parseFloat((order as any).multiMerchantFee || '0') > 0 && (
                            <div className="flex justify-between">
                              <span>Multi-Merchant Fee:</span>
                              <span>₱{parseFloat((order as any).multiMerchantFee || '0').toFixed(2)}</span>
                            </div>
                          )}
                          {parseFloat(order.convenienceFee || '0') > 0 && (
                            <div className="flex justify-between">
                              <span>Rider's Convenience Fee:</span>
                              <span>₱{parseFloat(order.convenienceFee || '0').toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold text-base pt-2 border-t">
                            <span>Grand Total:</span>
                            <span>₱{parseFloat(order.total).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
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
                          <OrderRatingDisplay
                            order={order}
                            onRateClick={() => {
                              setSelectedOrderForRating(order);
                              setShowRatingModal(true);
                            }}
                          />
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
                    </CardContent>
                  </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* My Account Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">My Profile</h2>
                  {!isEditingProfile ? (
                    <Button onClick={() => setIsEditingProfile(true)} data-testid="button-edit-profile">
                      Edit Contact Info
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditingProfile(false)}
                        data-testid="button-cancel-edit-profile"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          updateProfileMutation.mutate({
                            email: editedEmail,
                            phone: editedPhone
                          });
                        }}
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground">First Name</label>
                        <p className="text-base font-medium" data-testid="text-first-name">
                          {user?.firstName || "-"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Middle Name</label>
                        <p className="text-base font-medium" data-testid="text-middle-name">
                          {user?.middleName || "-"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Last Name</label>
                        <p className="text-base font-medium" data-testid="text-last-name">
                          {user?.lastName || "-"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Age</label>
                        <p className="text-base font-medium" data-testid="text-age">
                          {user?.age || "-"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Gender</label>
                        <p className="text-base font-medium" data-testid="text-gender">
                          {user?.gender || "-"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Account Created</label>
                        <p className="text-base font-medium" data-testid="text-created-date">
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Email</label>
                        {isEditingProfile ? (
                          <Input
                            type="email"
                            value={editedEmail}
                            onChange={(e) => setEditedEmail(e.target.value)}
                            placeholder="Enter your email"
                            data-testid="input-edit-email"
                          />
                        ) : (
                          <p className="text-base font-medium" data-testid="text-email">
                            {user?.email || "-"}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Phone Number</label>
                        {isEditingProfile ? (
                          <Input
                            type="tel"
                            value={editedPhone}
                            onChange={(e) => setEditedPhone(e.target.value)}
                            placeholder="09XXXXXXXXX"
                            data-testid="input-edit-phone"
                          />
                        ) : (
                          <p className="text-base font-medium" data-testid="text-phone">
                            {user?.phone || "-"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Saved Addresses */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Saved Addresses</h3>
                    {savedAddresses.length === 0 ? (
                      <p className="text-muted-foreground">No saved addresses yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {savedAddresses.map((address) => (
                          <Card key={address.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium">{address.label}</p>
                                  {address.isDefault && (
                                    <Badge variant="secondary">Default</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {address.lotHouseNo && `${address.lotHouseNo}, `}
                                  {address.street && `${address.street}, `}
                                  {address.barangay}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {address.cityMunicipality}, {address.province}
                                </p>
                                {address.landmark && (
                                  <p className="text-sm text-muted-foreground">
                                    Landmark: {address.landmark}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Order Summary */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Total Orders</p>
                        <p className="text-2xl font-bold" data-testid="text-total-orders">
                          {orders.length}
                        </p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Completed Orders</p>
                        <p className="text-2xl font-bold" data-testid="text-completed-orders">
                          {orders.filter(o => o.status === 'delivered').length}
                        </p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Active Orders</p>
                        <p className="text-2xl font-bold" data-testid="text-active-orders">
                          {orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length}
                        </p>
                      </Card>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                    {item.variants && Object.keys(item.variants).length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {Object.entries(item.variants).map(([key, value]) => `${key}: ${value}`).join(', ')}
                      </p>
                    )}
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
                <div className="flex justify-between font-semibold text-lg">
                  <span>Subtotal:</span>
                  <span>₱{cart.getSubtotal().toFixed(2)}</span>
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
              <AddressSelector
                value={selectedAddress}
                onChange={setSelectedAddress}
                disabled={createOrderMutation.isPending}
              />

              <div>
                <label className="text-sm font-medium mb-2 block">Receiver's Phone Number</label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter receiver's phone number"
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

              <div className="bg-muted p-4 rounded-lg space-y-3">
                <h3 className="font-medium mb-2">Order Summary</h3>
                {(() => {
                  const itemsSubtotal = Object.values(cart.allCarts)
                    .filter(c => c.items.length > 0)
                    .reduce((total, restaurantCart) => {
                      const subtotal = restaurantCart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                      const markupAmount = (subtotal * restaurantCart.markup) / 100;
                      return total + subtotal + markupAmount;
                    }, 0);
                  
                  const activeCarts = Object.values(cart.allCarts).filter(c => c.items.length > 0);
                  const totalDeliveryFees = activeCarts.reduce((total, restaurantCart) => {
                    return total + (calculatedDeliveryFees[restaurantCart.restaurantId] || 0);
                  }, 0);
                  
                  // Calculate multi-merchant fee (charged when ordering from 2+ merchants)
                  const merchantCount = activeCarts.length;
                  console.log('🔍 CHECKOUT MODAL MULTI-MERCHANT:', {
                    settings: settings,
                    multiMerchantFeeFromSettings: settings?.multiMerchantFee,
                    merchantCount: merchantCount,
                    activeCartsLength: activeCarts.length,
                    calculatedDistances: calculatedDistances,
                    calculatedDeliveryFees: calculatedDeliveryFees
                  });
                  const multiMerchantFeePerMerchant = settings?.multiMerchantFee ? parseFloat(settings.multiMerchantFee) : 20;
                  const totalMultiMerchantFee = merchantCount > 1 ? (merchantCount - 1) * multiMerchantFeePerMerchant : 0;
                  console.log('💰 FEE CALCULATION RESULT:', {
                    multiMerchantFeePerMerchant: multiMerchantFeePerMerchant,
                    totalMultiMerchantFee: totalMultiMerchantFee,
                    willShowFee: totalMultiMerchantFee > 0
                  });
                  
                  const convenienceFee = settings?.convenienceFee ? parseFloat(settings.convenienceFee) : 0;
                  const showConvenienceFee = settings?.showConvenienceFee !== false;
                  const grandTotal = itemsSubtotal + totalDeliveryFees + totalMultiMerchantFee + (showConvenienceFee ? convenienceFee : 0);
                  
                  return (
                    <>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Items Subtotal:</span>
                          <span>₱{itemsSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between font-medium">
                            <span>Total Delivery Fees:</span>
                            <span>₱{totalDeliveryFees.toFixed(2)}</span>
                          </div>
                          {activeCarts.map(restaurantCart => {
                            const fee = calculatedDeliveryFees[restaurantCart.restaurantId] || 0;
                            const distance = calculatedDistances[restaurantCart.restaurantId] || 0;
                            return (
                              <div key={restaurantCart.restaurantId} className="flex justify-between text-xs text-muted-foreground pl-3">
                                <span>• {restaurantCart.restaurantName} {distance > 0 ? `(${distance} km)` : ''}</span>
                                <span>₱{fee.toFixed(2)}</span>
                              </div>
                            );
                          })}
                        </div>
                        {totalMultiMerchantFee > 0 && (
                          <div className="flex justify-between">
                            <span>Multi-Merchant Fee ({merchantCount} stores):</span>
                            <span>₱{totalMultiMerchantFee.toFixed(2)}</span>
                          </div>
                        )}
                        {showConvenienceFee && convenienceFee > 0 && (
                          <div className="flex justify-between">
                            <span>Rider's Convenience Fee:</span>
                            <span>₱{convenienceFee.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-base">
                        <span>Total Amount:</span>
                        <span>₱{grandTotal.toFixed(2)}</span>
                      </div>
                    </>
                  );
                })()}
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

      {/* Options Selection Modal */}
      <MenuItemOptionsModal
        isOpen={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        menuItem={selectedMenuItemForOptions}
        onAddToCart={handleAddToCartWithOptions}
        restaurantMarkup={restaurantMarkupForModal}
      />

      {/* Replace Cart Confirmation Dialog */}
      <AlertDialog open={showReplaceCartDialog} onOpenChange={setShowReplaceCartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace cart items?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {(() => {
                const currentRestaurants = Object.values(cart.allCarts).map((c) => c.restaurantName).join(', ');
                const newRestaurantName = restaurantNameForModal;
                const oldestRestaurantName = Object.values(cart.allCarts)[0]?.restaurantName || '';
                
                if (replacementScenario === 'single-merchant') {
                  return (
                    <div>
                      You have items from <strong>{currentRestaurants}</strong> in your cart. Adding items from <strong>{newRestaurantName}</strong> will replace your current cart. Continue?
                    </div>
                  );
                }
                
                if (replacementScenario === 'max-limit') {
                  return (
                    <div>
                      You've reached the maximum of <strong>{cart.maxMerchantsPerOrder} restaurants</strong> per order. You currently have items from <strong>{Object.values(cart.allCarts).map((c) => c.restaurantName).join(' and ')}</strong>. Adding from <strong>{newRestaurantName}</strong> will remove items from <strong>{oldestRestaurantName}</strong>. Continue?
                    </div>
                  );
                }
                
                return null;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowReplaceCartDialog(false);
                setPendingMenuItem(null);
                setReplacementScenario(null);
              }}
              data-testid="button-cancel-replace-cart"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReplaceCart}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-replace-cart"
            >
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rating Modal */}
      <Dialog open={showRatingModal} onOpenChange={setShowRatingModal}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rate Your Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {(() => {
              const isMultiMerchant = (selectedOrderForRating as any)?.isGroup && 
                (selectedOrderForRating as any)?.merchantOrders && 
                (selectedOrderForRating as any)?.merchantOrders.length > 0;
              
              if (isMultiMerchant) {
                // Multi-merchant order - show rating section for each merchant
                const merchantOrders = (selectedOrderForRating as any).merchantOrders;
                return (
                  <>
                    {merchantOrders.map((merchantOrder: any, index: number) => (
                      <div key={merchantOrder.id} className="space-y-3 pb-4 border-b last:border-b-0">
                        <h4 className="font-medium text-primary">
                          {merchantOrder.restaurantName}
                        </h4>
                        <p className="text-sm text-muted-foreground">How was the food?</p>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              onClick={() => {
                                setMerchantRatings(prev => ({
                                  ...prev,
                                  [merchantOrder.id]: {
                                    rating,
                                    comment: prev[merchantOrder.id]?.comment || ''
                                  }
                                }));
                              }}
                              className="transition-all"
                              data-testid={`button-merchant-rating-${merchantOrder.id}-${rating}`}
                            >
                              <Star
                                className={`h-8 w-8 ${
                                  rating <= (merchantRatings[merchantOrder.id]?.rating || 0)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        <textarea
                          placeholder={`Comments about ${merchantOrder.restaurantName}? (optional)`}
                          value={merchantRatings[merchantOrder.id]?.comment || ''}
                          onChange={(e) => {
                            setMerchantRatings(prev => ({
                              ...prev,
                              [merchantOrder.id]: {
                                rating: prev[merchantOrder.id]?.rating || 0,
                                comment: e.target.value
                              }
                            }));
                          }}
                          className="w-full p-2 border rounded-md text-sm min-h-[60px] resize-none"
                          data-testid={`input-merchant-comment-${merchantOrder.id}`}
                        />
                      </div>
                    ))}
                  </>
                );
              } else {
                // Single merchant order
                return (
                  <div className="space-y-3">
                    <h4 className="font-medium">How was the food?</h4>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => setMerchantRating(rating)}
                          className="transition-all"
                          data-testid={`button-merchant-rating-${rating}`}
                        >
                          <Star
                            className={`h-8 w-8 ${
                              rating <= merchantRating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      placeholder="Any comments about the food or restaurant? (optional)"
                      value={merchantComment}
                      onChange={(e) => setMerchantComment(e.target.value)}
                      className="w-full p-2 border rounded-md text-sm min-h-[80px] resize-none"
                      data-testid="input-merchant-comment"
                    />
                  </div>
                );
              }
            })()}

            {/* Rider Rating (only if order had a rider) */}
            {selectedOrderForRating?.riderId && (
              <div className="space-y-3">
                <h4 className="font-medium">How was the delivery service?</h4>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setRiderRating(rating)}
                      className="transition-all"
                      data-testid={`button-rider-rating-${rating}`}
                    >
                      <Star
                        className={`h-8 w-8 ${
                          rating <= riderRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Any comments about the delivery? (optional)"
                  value={riderComment}
                  onChange={(e) => setRiderComment(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm min-h-[80px] resize-none"
                  data-testid="input-rider-comment"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRatingModal(false);
                  setMerchantRating(0);
                  setRiderRating(0);
                  setMerchantComment("");
                  setRiderComment("");
                  setMerchantRatings({});
                  setSelectedOrderForRating(null);
                }}
                className="flex-1"
                data-testid="button-cancel-rating"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!selectedOrderForRating) return;
                  
                  const isMultiMerchant = (selectedOrderForRating as any)?.isGroup && 
                    (selectedOrderForRating as any)?.merchantOrders && 
                    (selectedOrderForRating as any)?.merchantOrders.length > 0;
                  
                  if (isMultiMerchant) {
                    // Multi-merchant order - submit multiple ratings
                    const merchantOrders = (selectedOrderForRating as any).merchantOrders;
                    const merchantOrderRatings = merchantOrders
                      .filter((mo: any) => merchantRatings[mo.id]?.rating > 0)
                      .map((mo: any) => ({
                        orderId: mo.id,
                        merchantRating: merchantRatings[mo.id]?.rating || 0,
                        merchantComment: merchantRatings[mo.id]?.comment || '',
                      }));
                    
                    submitMultiMerchantRatingMutation.mutate({
                      merchantOrders: merchantOrderRatings,
                      riderRating: riderRating || undefined,
                      riderComment: riderComment || undefined,
                    });
                  } else {
                    // Single merchant order
                    submitRatingMutation.mutate({
                      orderId: selectedOrderForRating.id,
                      merchantRating: merchantRating || undefined,
                      riderRating: riderRating || undefined,
                      merchantComment: merchantComment || undefined,
                      riderComment: riderComment || undefined,
                    });
                  }
                }}
                disabled={
                  (submitRatingMutation.isPending || submitMultiMerchantRatingMutation.isPending) ||
                  (() => {
                    const isMultiMerchant = (selectedOrderForRating as any)?.isGroup && 
                      (selectedOrderForRating as any)?.merchantOrders && 
                      (selectedOrderForRating as any)?.merchantOrders.length > 0;
                    
                    if (isMultiMerchant) {
                      // Check if at least one merchant has a rating or rider has a rating
                      const hasAnyMerchantRating = Object.values(merchantRatings).some(r => r.rating > 0);
                      return !hasAnyMerchantRating && riderRating === 0;
                    } else {
                      return merchantRating === 0 && riderRating === 0;
                    }
                  })()
                }
                className="flex-1"
                data-testid="button-submit-rating"
              >
                {(submitRatingMutation.isPending || submitMultiMerchantRatingMutation.isPending) ? "Submitting..." : "Submit Rating"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}