import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  getAllCartsTotal: () => number;
  clearRestaurantCart: (restaurantId: string) => void;
  clearAllCarts: () => void;
  
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

export function CartProvider({ children }: { children: ReactNode }) {
  const [allCarts, setAllCarts] = useState<Record<string, RestaurantCart>>({});
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);

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
      
      // Check if item with same menu item and variants already exists
      const existingItemIndex = cart.items.findIndex(
        item => item.menuItemId === newItem.menuItemId && 
        JSON.stringify(item.variants) === JSON.stringify(newItem.variants)
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

  const getAllCartsTotal = () => {
    return Object.values(allCarts).reduce((total, cart) => {
      const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const markupAmount = subtotal * (cart.markup / 100);
      return total + subtotal + markupAmount + cart.deliveryFee;
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
    return getSubtotal() + getMarkupAmount() + getDeliveryFee();
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
      getAllCartsTotal,
      clearRestaurantCart,
      clearAllCarts,
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
