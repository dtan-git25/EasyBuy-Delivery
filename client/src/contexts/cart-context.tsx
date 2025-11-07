import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  restaurant: {
    id: string;
    name: string;
    deliveryFee: number;
    markup: number;
  };
  variants?: Record<string, string>;
  selectedOptions?: Array<{
    optionTypeName: string;
    valueName: string;
    price: number;
  }>;
  specialInstructions?: string;
}

export interface RestaurantCart {
  restaurantId: string;
  restaurantName: string;
  deliveryFee: number;
  markup: number;
  items: CartItem[];
}

interface CartContextType {
  // Current active cart
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  deliveryFee: number;
  markup: number;
  
  // Multi-cart management
  allCarts: Record<string, RestaurantCart>;
  activeRestaurantId: string | null;
  switchCart: (restaurantId: string) => void;
  getAllCartsCount: () => number;
  getAllCartsItemCount: () => number;
  getAllCartsTotal: () => number;
  clearRestaurantCart: (restaurantId: string) => void;
  clearAllCarts: () => void;
  
  // Multi-merchant settings
  canAddFromRestaurant: (restaurantId: string) => { allowed: boolean; reason?: string };
  isMultiMerchantAllowed: boolean;
  maxMerchantsPerOrder: number;
  
  // Original methods
  addItem: (item: Omit<CartItem, 'id' | 'quantity'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getMarkupAmount: () => number;
  getDeliveryFee: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper function to normalize selectedOptions for comparison
function normalizeSelectedOptions(options?: Array<{ optionTypeName: string; valueName: string; price: number }>): string {
  // Default to empty array if undefined
  const normalized = options || [];
  
  // Sort by optionTypeName, then valueName to ensure consistent ordering
  const sorted = [...normalized].sort((a, b) => {
    const typeCompare = a.optionTypeName.localeCompare(b.optionTypeName);
    if (typeCompare !== 0) return typeCompare;
    return a.valueName.localeCompare(b.valueName);
  });
  
  return JSON.stringify(sorted);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [allCarts, setAllCarts] = useState<Record<string, RestaurantCart>>({});
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);

  // Fetch system settings for multi-merchant rules
  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  const isMultiMerchantAllowed = (settings as any)?.allowMultiMerchantCheckout ?? false;
  const maxMerchantsPerOrder = (settings as any)?.maxMerchantsPerOrder ?? 2;

  // Load all carts from localStorage on mount
  useEffect(() => {
    const savedCarts = localStorage.getItem('easyBuyMultiCarts');
    if (savedCarts) {
      try {
        const cartsData = JSON.parse(savedCarts);
        setAllCarts(cartsData.carts || {});
        setActiveRestaurantId(cartsData.activeRestaurantId || null);
      } catch (error) {
        console.error('Error loading carts from localStorage:', error);
      }
    }
  }, []);

  // Save all carts to localStorage whenever they change
  useEffect(() => {
    const cartsData = {
      carts: allCarts,
      activeRestaurantId
    };
    localStorage.setItem('easyBuyMultiCarts', JSON.stringify(cartsData));
  }, [allCarts, activeRestaurantId]);

  // Get current active cart
  const activeCart = activeRestaurantId ? allCarts[activeRestaurantId] : null;
  const items = activeCart?.items || [];
  const restaurantId = activeCart?.restaurantId || null;
  const restaurantName = activeCart?.restaurantName || null;
  const deliveryFee = activeCart?.deliveryFee || 0;
  const markup = activeCart?.markup || 0;

  // Check if we can add items from a new restaurant
  const canAddFromRestaurant = (restaurantId: string): { allowed: boolean; reason?: string } => {
    // If restaurant already has a cart, always allow
    if (allCarts[restaurantId]) {
      return { allowed: true };
    }

    const existingCartsCount = Object.keys(allCarts).length;

    // If no existing carts, always allow
    if (existingCartsCount === 0) {
      return { allowed: true };
    }

    // If multi-merchant is disabled, don't allow adding from different merchant
    if (!isMultiMerchantAllowed) {
      return { 
        allowed: false, 
        reason: 'single-merchant-only'
      };
    }

    // If multi-merchant is enabled, check if we've reached the limit
    if (existingCartsCount >= maxMerchantsPerOrder) {
      return { 
        allowed: false, 
        reason: 'max-merchants-reached'
      };
    }

    return { allowed: true };
  };

  const addItem = (newItem: Omit<CartItem, 'id' | 'quantity'>) => {
    const targetRestaurantId = newItem.restaurant.id;
    
    setAllCarts(currentCarts => {
      const updatedCarts = { ...currentCarts };
      
      // Get or create cart for this restaurant
      if (!updatedCarts[targetRestaurantId]) {
        updatedCarts[targetRestaurantId] = {
          restaurantId: targetRestaurantId,
          restaurantName: newItem.restaurant.name,
          deliveryFee: parseFloat(newItem.restaurant.deliveryFee.toString()),
          markup: parseFloat(newItem.restaurant.markup.toString()),
          items: []
        };
      }
      
      const cart = updatedCarts[targetRestaurantId];
      
      // Check if item with same menu item, variants, and selected options already exists
      const existingItemIndex = cart.items.findIndex(
        item => item.menuItemId === newItem.menuItemId && 
        JSON.stringify(item.variants) === JSON.stringify(newItem.variants) &&
        normalizeSelectedOptions(item.selectedOptions) === normalizeSelectedOptions(newItem.selectedOptions)
      );

      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        cart.items[existingItemIndex].quantity += 1;
      } else {
        // Add new item
        cart.items.push({
          ...newItem,
          price: parseFloat(newItem.price.toString()),
          id: `${newItem.menuItemId}-${Date.now()}`,
          quantity: 1
        });
      }
      
      return updatedCarts;
    });
    
    // Switch to this restaurant's cart if not already active
    if (activeRestaurantId !== targetRestaurantId) {
      setActiveRestaurantId(targetRestaurantId);
    }
  };

  const removeItem = (itemId: string) => {
    if (!activeRestaurantId) return;
    
    setAllCarts(currentCarts => {
      const updatedCarts = { ...currentCarts };
      const cart = updatedCarts[activeRestaurantId];
      
      if (cart) {
        cart.items = cart.items.filter(item => item.id !== itemId);
        
        // If cart becomes empty, remove it
        if (cart.items.length === 0) {
          delete updatedCarts[activeRestaurantId];
          
          // Switch to another available cart if any exist
          const remainingCartIds = Object.keys(updatedCarts);
          if (remainingCartIds.length > 0) {
            setActiveRestaurantId(remainingCartIds[0]);
          } else {
            setActiveRestaurantId(null);
          }
        }
      }
      
      return updatedCarts;
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    if (!activeRestaurantId) return;
    
    setAllCarts(currentCarts => {
      const updatedCarts = { ...currentCarts };
      const cart = updatedCarts[activeRestaurantId];
      
      if (cart) {
        cart.items = cart.items.map(item =>
          item.id === itemId ? { ...item, quantity } : item
        );
      }
      
      return updatedCarts;
    });
  };

  const clearCart = () => {
    if (!activeRestaurantId) return;
    
    setAllCarts(currentCarts => {
      const updatedCarts = { ...currentCarts };
      delete updatedCarts[activeRestaurantId];
      
      // Switch to another available cart if any exist
      const remainingCartIds = Object.keys(updatedCarts);
      if (remainingCartIds.length > 0) {
        setActiveRestaurantId(remainingCartIds[0]);
      } else {
        setActiveRestaurantId(null);
      }
      
      return updatedCarts;
    });
  };

  const clearRestaurantCart = (restaurantId: string) => {
    setAllCarts(currentCarts => {
      const updatedCarts = { ...currentCarts };
      delete updatedCarts[restaurantId];
      
      // If clearing the active cart, switch to another available cart
      if (activeRestaurantId === restaurantId) {
        const remainingCartIds = Object.keys(updatedCarts);
        if (remainingCartIds.length > 0) {
          setActiveRestaurantId(remainingCartIds[0]);
        } else {
          setActiveRestaurantId(null);
        }
      }
      
      return updatedCarts;
    });
  };

  const clearAllCarts = () => {
    setAllCarts({});
    setActiveRestaurantId(null);
  };

  const switchCart = (restaurantId: string) => {
    if (allCarts[restaurantId]) {
      setActiveRestaurantId(restaurantId);
    }
  };

  const getAllCartsCount = () => {
    return Object.keys(allCarts).length;
  };

  const getAllCartsItemCount = () => {
    return Object.values(allCarts).reduce((total, cart) => {
      return total + cart.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);
  };

  const getAllCartsTotal = () => {
    return Object.values(allCarts).reduce((total, cart) => {
      const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const markupAmount = subtotal * (cart.markup / 100);
      return total + subtotal + markupAmount;
    }, 0);
  };

  const getSubtotal = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getMarkupAmount = () => {
    const subtotal = getSubtotal();
    return subtotal * (markup / 100);
  };

  const getDeliveryFee = () => {
    return deliveryFee;
  };

  const getTotal = () => {
    return getSubtotal() + getMarkupAmount();
  };

  const getItemCount = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{
      items,
      restaurantId,
      restaurantName,
      deliveryFee,
      markup,
      allCarts,
      activeRestaurantId,
      switchCart,
      getAllCartsCount,
      getAllCartsItemCount,
      getAllCartsTotal,
      clearRestaurantCart,
      clearAllCarts,
      canAddFromRestaurant,
      isMultiMerchantAllowed,
      maxMerchantsPerOrder,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      getSubtotal,
      getMarkupAmount,
      getDeliveryFee,
      getTotal,
      getItemCount
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
