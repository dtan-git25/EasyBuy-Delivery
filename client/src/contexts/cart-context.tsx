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

interface CartContextType {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  deliveryFee: number;
  markup: number;
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
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [markup, setMarkup] = useState(0);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('easyBuyCart');
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart);
        setItems(cartData.items || []);
        setRestaurantId(cartData.restaurantId || null);
        setRestaurantName(cartData.restaurantName || null);
        setDeliveryFee(cartData.deliveryFee || 0);
        setMarkup(cartData.markup || 0);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    const cartData = {
      items,
      restaurantId,
      restaurantName,
      deliveryFee,
      markup
    };
    localStorage.setItem('easyBuyCart', JSON.stringify(cartData));
  }, [items, restaurantId, restaurantName, deliveryFee, markup]);

  const addItem = (newItem: Omit<CartItem, 'id' | 'quantity'>) => {
    // If cart is empty or from different restaurant, clear cart and set new restaurant
    if (!restaurantId || restaurantId !== newItem.restaurant.id) {
      setRestaurantId(newItem.restaurant.id);
      setRestaurantName(newItem.restaurant.name);
      setDeliveryFee(parseFloat(newItem.restaurant.deliveryFee.toString()));
      setMarkup(parseFloat(newItem.restaurant.markup.toString()));
      setItems([{
        ...newItem,
        price: parseFloat(newItem.price.toString()),
        id: `${newItem.menuItemId}-${Date.now()}`,
        quantity: 1
      }]);
      return;
    }

    setItems(currentItems => {
      // Check if item with same menu item and variants already exists
      const existingItemIndex = currentItems.findIndex(
        item => item.menuItemId === newItem.menuItemId && 
        JSON.stringify(item.variants) === JSON.stringify(newItem.variants)
      );

      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        const updatedItems = [...currentItems];
        updatedItems[existingItemIndex].quantity += 1;
        return updatedItems;
      } else {
        // Add new item
        return [...currentItems, {
          ...newItem,
          price: parseFloat(newItem.price.toString()),
          id: `${newItem.menuItemId}-${Date.now()}`,
          quantity: 1
        }];
      }
    });
  };

  const removeItem = (itemId: string) => {
    setItems(currentItems => {
      const updatedItems = currentItems.filter(item => item.id !== itemId);
      
      // If cart becomes empty, clear restaurant info
      if (updatedItems.length === 0) {
        setRestaurantId(null);
        setRestaurantName(null);
        setDeliveryFee(0);
        setMarkup(0);
      }
      
      return updatedItems;
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setItems(currentItems =>
      currentItems.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setRestaurantId(null);
    setRestaurantName(null);
    setDeliveryFee(0);
    setMarkup(0);
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