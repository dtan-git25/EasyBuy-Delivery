import { users, restaurants, menuItems, categories, riders, wallets, orders, chatMessages, systemSettings, walletTransactions, orderStatusHistory, riderLocationHistory, optionTypes, menuItemOptionValues, savedAddresses, ratings, type User, type InsertUser, type Restaurant, type RestaurantWithOwner, type InsertRestaurant, type MenuItem, type InsertMenuItem, type Category, type InsertCategory, type Rider, type InsertRider, type Order, type InsertOrder, type ChatMessage, type InsertChatMessage, type Wallet, type SystemSettings, type WalletTransaction, type InsertWalletTransaction, type OrderStatusHistory, type InsertOrderStatusHistory, type RiderLocationHistory, type InsertRiderLocationHistory, type OptionType, type InsertOptionType, type MenuItemOptionValue, type InsertMenuItemOptionValue, type SavedAddress, type InsertSavedAddress, type Rating, type InsertRating } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserPasswordResetToken(id: string, token: string | null, expiry: Date | null): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;

  // Restaurant operations
  getRestaurants(): Promise<Restaurant[]>;
  getAllRestaurants(): Promise<RestaurantWithOwner[]>;
  getRestaurant(id: string): Promise<Restaurant | undefined>;
  getRestaurantsByOwner(ownerId: string): Promise<Restaurant[]>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: string, updates: Partial<Restaurant>): Promise<Restaurant | undefined>;
  deleteRestaurant(id: string): Promise<void>;

  // Menu operations
  getMenuItems(restaurantId: string): Promise<MenuItem[]>;
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: string): Promise<void>;

  // Category operations
  getCategories(): Promise<Category[]>;
  getActiveCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, updates: Partial<Category>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<void>;

  // Option Type operations
  getOptionTypes(): Promise<OptionType[]>;
  getActiveOptionTypes(): Promise<OptionType[]>;
  getOptionType(id: string): Promise<OptionType | undefined>;
  createOptionType(optionType: InsertOptionType): Promise<OptionType>;
  updateOptionType(id: string, updates: Partial<OptionType>): Promise<OptionType | undefined>;
  deleteOptionType(id: string): Promise<void>;

  // Menu Item Option Values operations
  getMenuItemOptionValues(menuItemId: string): Promise<(MenuItemOptionValue & { optionType: OptionType })[]>;
  getMenuItemOptionValue(id: string): Promise<MenuItemOptionValue | undefined>;
  createMenuItemOptionValue(optionValue: InsertMenuItemOptionValue): Promise<MenuItemOptionValue>;
  updateMenuItemOptionValue(id: string, updates: Partial<MenuItemOptionValue>): Promise<MenuItemOptionValue | undefined>;
  deleteMenuItemOptionValue(id: string): Promise<void>;
  deleteMenuItemOptionValues(menuItemId: string, optionTypeId: string): Promise<void>;

  // Rider operations
  getRiders(): Promise<(Rider & { user: User })[]>;
  getRider(id: string): Promise<(Rider & { user: User }) | undefined>;
  getRiderByUserId(userId: string): Promise<Rider | undefined>;
  createRider(rider: InsertRider): Promise<Rider>;
  updateRider(id: string, updates: Partial<Rider>): Promise<Rider | undefined>;
  deleteRider(riderId: string): Promise<void>;

  // Wallet operations
  getWallet(userId: string): Promise<Wallet | undefined>;
  createWallet(userId: string): Promise<Wallet>;
  updateWalletBalance(userId: string, amount: number): Promise<Wallet | undefined>;

  // Saved address operations
  getSavedAddresses(userId: string): Promise<SavedAddress[]>;
  getSavedAddress(id: string): Promise<SavedAddress | undefined>;
  createSavedAddress(address: InsertSavedAddress): Promise<SavedAddress>;
  updateSavedAddress(id: string, updates: Partial<SavedAddress>): Promise<SavedAddress | undefined>;
  deleteSavedAddress(id: string): Promise<void>;
  setDefaultAddress(userId: string, addressId: string): Promise<SavedAddress | undefined>;

  // Order operations
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByCustomer(customerId: string): Promise<Order[]>;
  getOrdersByRestaurant(restaurantId: string): Promise<Order[]>;
  getOrdersByRider(riderId: string): Promise<any[]>;
  getPendingOrders(): Promise<any[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;

  // Chat operations
  getChatMessages(orderId: string): Promise<(ChatMessage & { sender: User })[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // System settings
  getSystemSettings(): Promise<SystemSettings | undefined>;
  updateSystemSettings(updates: Partial<SystemSettings>): Promise<SystemSettings | undefined>;

  // Rating operations
  createRating(rating: InsertRating): Promise<Rating>;
  getRatingByOrder(orderId: string): Promise<Rating | undefined>;
  getRatingsByMerchant(merchantId: string): Promise<Rating[]>;
  getRatingsByRider(riderId: string): Promise<Rating[]>;
  getAverageMerchantRating(merchantId: string): Promise<{ average: number; count: number }>;
  getAverageRiderRating(riderId: string): Promise<{ average: number; count: number }>;

  // Wallet transaction operations
  getWalletTransactions(walletId: string): Promise<WalletTransaction[]>;
  getWalletTransactionsByUser(userId: string): Promise<(WalletTransaction & { wallet: Wallet })[]>;
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  updateWalletTransaction(id: string, updates: Partial<WalletTransaction>): Promise<WalletTransaction | undefined>;
  getWalletTransactionsByOrder(orderId: string): Promise<WalletTransaction[]>;
  
  // Philippine payment specific operations
  processGCashPayment(walletId: string, amount: number, referenceNumber: string): Promise<WalletTransaction>;
  processMayaPayment(walletId: string, amount: number, transactionId: string, paymentId: string): Promise<WalletTransaction>;
  processCashTransaction(walletId: string, amount: number, handledBy: string, description: string): Promise<WalletTransaction>;

  // Rider document management
  updateRiderDocuments(riderId: string, documents: { orcrDocument?: string; motorImage?: string; idDocument?: string }): Promise<Rider | undefined>;
  submitRiderDocuments(riderId: string): Promise<Rider | undefined>;
  reviewRiderDocuments(riderId: string, approved: boolean, reviewedBy: string, reason?: string): Promise<Rider | undefined>;
  getRidersForApproval(): Promise<Rider[]>;
  requestDocumentUpdate(riderId: string, documents: { orcrDocument?: string; motorImage?: string; idDocument?: string }): Promise<Rider | undefined>;

  // Merchant approval operations
  getMerchantsForApproval(): Promise<User[]>;
  reviewMerchant(userId: string, approved: boolean, reviewedBy: string): Promise<User | undefined>;

  // Order status history tracking
  createOrderStatusHistory(historyData: InsertOrderStatusHistory): Promise<OrderStatusHistory>;
  getOrderStatusHistory(orderId: string): Promise<(OrderStatusHistory & { changedByUser: User })[]>;
  updateOrderWithStatusHistory(orderId: string, updates: Partial<Order>, changedBy: string, notes?: string, location?: any): Promise<Order | undefined>;

  // Rider location tracking
  createRiderLocationHistory(locationData: InsertRiderLocationHistory): Promise<RiderLocationHistory>;
  getRiderLocationHistory(riderId: string, orderId?: string): Promise<RiderLocationHistory[]>;
  getLatestRiderLocation(riderId: string): Promise<RiderLocationHistory | undefined>;
  updateRiderLocation(riderId: string, locationData: { latitude: number; longitude: number; accuracy?: number; heading?: number; speed?: number; batteryLevel?: number; orderId?: string }): Promise<RiderLocationHistory>;

  // Customer management (Admin only)
  getCustomers(filters?: { search?: string; province?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<(User & { orderCount: number })[]>;
  getCustomerDetails(id: string): Promise<{ customer: User; savedAddresses: SavedAddress[]; orderCount: number; recentOrders: Order[] } | undefined>;
  deleteCustomer(id: string): Promise<void>;

  // Session management
  clearAllSessions(): Promise<void>;

  sessionStore: SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    
    // Create wallet for all users
    await this.createWallet(user.id);
    
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async updateUserPasswordResetToken(id: string, token: string | null, expiry: Date | null): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ 
        passwordResetToken: token, 
        passwordResetExpiry: expiry 
      })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role as any));
  }

  async getRestaurants(): Promise<Restaurant[]> {
    // Return only active restaurants for customer-facing pages
    return await db.select().from(restaurants).where(eq(restaurants.isActive, true));
  }

  async getAllRestaurants(): Promise<RestaurantWithOwner[]> {
    // Return all restaurants (including inactive) for admin with owner information
    const result = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        ownerId: restaurants.ownerId,
        ownerFirstName: users.firstName,
        ownerMiddleName: users.middleName,
        ownerLastName: users.lastName,
        cuisine: restaurants.cuisine,
        address: restaurants.address,
        latitude: restaurants.latitude,
        longitude: restaurants.longitude,
        phone: restaurants.phone,
        email: restaurants.email,
        image: restaurants.image,
        rating: restaurants.rating,
        deliveryFee: restaurants.deliveryFee,
        markup: restaurants.markup,
        isActive: restaurants.isActive,
        description: restaurants.description,
        createdAt: restaurants.createdAt,
        updatedAt: restaurants.updatedAt,
      })
      .from(restaurants)
      .leftJoin(users, eq(restaurants.ownerId, users.id))
      .orderBy(desc(restaurants.createdAt));
    
    return result;
  }

  async getRestaurant(id: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    return restaurant || undefined;
  }

  async getRestaurantsByOwner(ownerId: string): Promise<Restaurant[]> {
    return await db.select().from(restaurants).where(eq(restaurants.ownerId, ownerId));
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const [newRestaurant] = await db.insert(restaurants).values(restaurant).returning();
    return newRestaurant;
  }

  async updateRestaurant(id: string, updates: Partial<Restaurant>): Promise<Restaurant | undefined> {
    const [restaurant] = await db.update(restaurants).set(updates).where(eq(restaurants.id, id)).returning();
    return restaurant || undefined;
  }

  async deleteRestaurant(id: string): Promise<void> {
    await db.delete(restaurants).where(eq(restaurants.id, id));
  }

  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    return await db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurantId));
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item || undefined;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [newItem] = await db.insert(menuItems).values(item).returning();
    return newItem;
  }

  async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem | undefined> {
    const [item] = await db.update(menuItems).set(updates).where(eq(menuItems.id, id)).returning();
    return item || undefined;
  }

  async deleteMenuItem(id: string): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.name));
  }

  async getActiveCategories(): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.name));
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category | undefined> {
    const [category] = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
    return category || undefined;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getOptionTypes(): Promise<OptionType[]> {
    return await db.select().from(optionTypes).orderBy(asc(optionTypes.name));
  }

  async getActiveOptionTypes(): Promise<OptionType[]> {
    return await db.select().from(optionTypes).where(eq(optionTypes.isActive, true)).orderBy(asc(optionTypes.name));
  }

  async getOptionType(id: string): Promise<OptionType | undefined> {
    const [optionType] = await db.select().from(optionTypes).where(eq(optionTypes.id, id));
    return optionType || undefined;
  }

  async createOptionType(optionType: InsertOptionType): Promise<OptionType> {
    const [newOptionType] = await db.insert(optionTypes).values(optionType).returning();
    return newOptionType;
  }

  async updateOptionType(id: string, updates: Partial<OptionType>): Promise<OptionType | undefined> {
    const [optionType] = await db.update(optionTypes).set(updates).where(eq(optionTypes.id, id)).returning();
    return optionType || undefined;
  }

  async deleteOptionType(id: string): Promise<void> {
    await db.delete(optionTypes).where(eq(optionTypes.id, id));
  }

  async getMenuItemOptionValues(menuItemId: string): Promise<(MenuItemOptionValue & { optionType: OptionType })[]> {
    const result = await db
      .select()
      .from(menuItemOptionValues)
      .leftJoin(optionTypes, eq(menuItemOptionValues.optionTypeId, optionTypes.id))
      .where(eq(menuItemOptionValues.menuItemId, menuItemId));
    
    return result.map(row => ({
      ...row.menu_item_option_values,
      optionType: row.option_types!
    }));
  }

  async getMenuItemOptionValue(id: string): Promise<MenuItemOptionValue | undefined> {
    const [optionValue] = await db.select().from(menuItemOptionValues).where(eq(menuItemOptionValues.id, id));
    return optionValue || undefined;
  }

  async createMenuItemOptionValue(optionValue: InsertMenuItemOptionValue): Promise<MenuItemOptionValue> {
    const [newOptionValue] = await db.insert(menuItemOptionValues).values(optionValue).returning();
    return newOptionValue;
  }

  async updateMenuItemOptionValue(id: string, updates: Partial<MenuItemOptionValue>): Promise<MenuItemOptionValue | undefined> {
    const [optionValue] = await db.update(menuItemOptionValues).set(updates).where(eq(menuItemOptionValues.id, id)).returning();
    return optionValue || undefined;
  }

  async deleteMenuItemOptionValue(id: string): Promise<void> {
    await db.delete(menuItemOptionValues).where(eq(menuItemOptionValues.id, id));
  }

  async deleteMenuItemOptionValues(menuItemId: string, optionTypeId: string): Promise<void> {
    await db.delete(menuItemOptionValues).where(
      and(
        eq(menuItemOptionValues.menuItemId, menuItemId),
        eq(menuItemOptionValues.optionTypeId, optionTypeId)
      )
    );
  }

  async getRiders(): Promise<(Rider & { user: User })[]> {
    const result = await db
      .select()
      .from(riders)
      .leftJoin(users, eq(riders.userId, users.id));
    
    return result.map(row => ({
      ...row.riders,
      user: row.users!
    }));
  }

  async getRider(id: string): Promise<(Rider & { user: User }) | undefined> {
    const [result] = await db
      .select()
      .from(riders)
      .leftJoin(users, eq(riders.userId, users.id))
      .where(eq(riders.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.riders,
      user: result.users!
    };
  }

  async getRiderByUserId(userId: string): Promise<Rider | undefined> {
    const [rider] = await db.select().from(riders).where(eq(riders.userId, userId));
    return rider || undefined;
  }

  async createRider(rider: InsertRider): Promise<Rider> {
    const [newRider] = await db.insert(riders).values(rider).returning();
    return newRider;
  }

  async updateRider(id: string, updates: Partial<Rider>): Promise<Rider | undefined> {
    const [rider] = await db.update(riders).set(updates).where(eq(riders.id, id)).returning();
    return rider || undefined;
  }

  async deleteRider(riderId: string): Promise<void> {
    // First get the rider to find the userId
    const rider = await this.getRider(riderId);
    if (!rider) return;

    // Delete the rider record (cascade will handle orders)
    await db.delete(riders).where(eq(riders.id, riderId));

    // Delete the associated user account
    if (rider.userId) {
      await db.delete(users).where(eq(users.id, rider.userId));
    }
  }

  async getWallet(userId: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return wallet || undefined;
  }

  async createWallet(userId: string): Promise<Wallet> {
    const [wallet] = await db.insert(wallets).values({ userId }).returning();
    return wallet;
  }

  async updateWalletBalance(userId: string, amount: number): Promise<Wallet | undefined> {
    const [wallet] = await db
      .update(wallets)
      .set({ balance: String(amount) })
      .where(eq(wallets.userId, userId))
      .returning();
    return wallet || undefined;
  }

  // Saved address operations
  async getSavedAddresses(userId: string): Promise<SavedAddress[]> {
    return await db
      .select()
      .from(savedAddresses)
      .where(eq(savedAddresses.userId, userId))
      .orderBy(desc(savedAddresses.isDefault), desc(savedAddresses.createdAt));
  }

  async getSavedAddress(id: string): Promise<SavedAddress | undefined> {
    const [address] = await db.select().from(savedAddresses).where(eq(savedAddresses.id, id));
    return address || undefined;
  }

  async createSavedAddress(address: InsertSavedAddress): Promise<SavedAddress> {
    const [newAddress] = await db.insert(savedAddresses).values(address).returning();
    return newAddress;
  }

  async updateSavedAddress(id: string, updates: Partial<SavedAddress>): Promise<SavedAddress | undefined> {
    const [address] = await db
      .update(savedAddresses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(savedAddresses.id, id))
      .returning();
    return address || undefined;
  }

  async deleteSavedAddress(id: string): Promise<void> {
    await db.delete(savedAddresses).where(eq(savedAddresses.id, id));
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<SavedAddress | undefined> {
    // First, unset all default addresses for this user
    await db
      .update(savedAddresses)
      .set({ isDefault: false })
      .where(eq(savedAddresses.userId, userId));
    
    // Then, set the specified address as default
    const [address] = await db
      .update(savedAddresses)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(eq(savedAddresses.id, addressId), eq(savedAddresses.userId, userId)))
      .returning();
    return address || undefined;
  }

  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrdersByCustomer(customerId: string): Promise<any[]> {
    const result = await db
      .select()
      .from(orders)
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));

    // Transform to include restaurant name
    return result.map(row => ({
      ...row.orders,
      restaurantName: row.restaurants?.name || 'Unknown Restaurant',
    }));
  }

  async getOrdersByRestaurant(restaurantId: string): Promise<any[]> {
    const result = await db
      .select()
      .from(orders)
      .leftJoin(users, eq(orders.customerId, users.id))
      .where(eq(orders.restaurantId, restaurantId))
      .orderBy(desc(orders.createdAt));

    // Transform to match merchant dashboard expectations
    return result.map(row => ({
      ...row.orders,
      customer: {
        name: row.users ? `${row.users.firstName || ''} ${row.users.lastName || ''}`.trim() || 'Unknown Customer' : 'Unknown Customer',
        phone: row.orders.phoneNumber,
        address: row.orders.deliveryAddress,
      }
    }));
  }

  // Get orders by rider's user ID (not rider profile ID)
  // orders.rider_id has FK constraint to users.id
  async getOrdersByRider(riderUserId: string): Promise<any[]> {
    const result = await db
      .select()
      .from(orders)
      .leftJoin(users, eq(orders.customerId, users.id))
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(eq(orders.riderId, riderUserId))
      .orderBy(desc(orders.createdAt));

    // Transform to include customer and restaurant details
    return result.map(row => ({
      ...row.orders,
      customerName: row.users ? `${row.users.firstName || ''} ${row.users.lastName || ''}`.trim() || 'Unknown Customer' : 'Unknown Customer',
      restaurantName: row.restaurants?.name || 'Unknown Restaurant',
      restaurantAddress: row.restaurants?.address || 'Unknown Address',
    }));
  }

  async getPendingOrders(): Promise<any[]> {
    const result = await db
      .select()
      .from(orders)
      .leftJoin(users, eq(orders.customerId, users.id))
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(eq(orders.status, 'pending'))
      .orderBy(asc(orders.createdAt));

    // Transform to match frontend expectations
    return result.map(row => ({
      id: row.orders.id,
      orderNumber: row.orders.orderNumber,
      total: row.orders.total,
      subtotal: row.orders.subtotal,
      markup: row.orders.markup,
      deliveryFee: row.orders.deliveryFee,
      deliveryAddress: row.orders.deliveryAddress,
      phoneNumber: row.orders.phoneNumber,
      createdAt: row.orders.createdAt,
      customer: {
        name: row.users ? `${row.users.firstName || ''} ${row.users.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
        address: row.orders.deliveryAddress,
        phone: row.orders.phoneNumber,
      },
      restaurant: {
        name: row.restaurants?.name || 'Unknown',
        address: row.restaurants?.address || 'Unknown',
      },
      distance: `${(parseFloat(row.orders.deliveryFee as string) / 10).toFixed(1)} km`,
      commission: (parseFloat(row.orders.deliveryFee as string) * 0.7).toFixed(2),
    }));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const [order] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return order || undefined;
  }

  async getChatMessages(orderId: string): Promise<(ChatMessage & { sender: User })[]> {
    const result = await db
      .select()
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.senderId, users.id))
      .where(eq(chatMessages.orderId, orderId))
      .orderBy(asc(chatMessages.timestamp));
    
    return result.map(row => ({
      ...row.chat_messages!,
      sender: row.users!
    }));
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  async getSystemSettings(): Promise<SystemSettings | undefined> {
    const [settings] = await db.select().from(systemSettings).limit(1);
    return settings || undefined;
  }

  async updateSystemSettings(updates: Partial<SystemSettings>): Promise<SystemSettings | undefined> {
    const existing = await this.getSystemSettings();
    
    if (existing) {
      const [settings] = await db
        .update(systemSettings)
        .set(updates)
        .where(eq(systemSettings.id, existing.id))
        .returning();
      return settings || undefined;
    } else {
      const [settings] = await db.insert(systemSettings).values(updates).returning();
      return settings;
    }
  }

  // Rating operations
  async createRating(rating: InsertRating): Promise<Rating> {
    const [newRating] = await db.insert(ratings).values(rating).returning();
    return newRating;
  }

  async getRatingByOrder(orderId: string): Promise<Rating | undefined> {
    const [rating] = await db.select().from(ratings).where(eq(ratings.orderId, orderId));
    return rating || undefined;
  }

  async getRatingsByMerchant(merchantId: string): Promise<Rating[]> {
    return await db
      .select()
      .from(ratings)
      .where(eq(ratings.merchantId, merchantId))
      .orderBy(desc(ratings.createdAt));
  }

  async getRatingsByRider(riderId: string): Promise<Rating[]> {
    return await db
      .select()
      .from(ratings)
      .where(eq(ratings.riderId, riderId))
      .orderBy(desc(ratings.createdAt));
  }

  async getAverageMerchantRating(merchantId: string): Promise<{ average: number; count: number }> {
    const merchantRatings = await db
      .select()
      .from(ratings)
      .where(and(
        eq(ratings.merchantId, merchantId),
        eq(ratings.merchantRating, ratings.merchantRating) // Only non-null ratings
      ));
    
    const validRatings = merchantRatings.filter(r => r.merchantRating !== null);
    if (validRatings.length === 0) {
      return { average: 0, count: 0 };
    }
    
    const sum = validRatings.reduce((acc, r) => acc + (r.merchantRating || 0), 0);
    return {
      average: sum / validRatings.length,
      count: validRatings.length
    };
  }

  async getAverageRiderRating(riderId: string): Promise<{ average: number; count: number }> {
    const riderRatings = await db
      .select()
      .from(ratings)
      .where(and(
        eq(ratings.riderId, riderId),
        eq(ratings.riderRating, ratings.riderRating) // Only non-null ratings
      ));
    
    const validRatings = riderRatings.filter(r => r.riderRating !== null);
    if (validRatings.length === 0) {
      return { average: 0, count: 0 };
    }
    
    const sum = validRatings.reduce((acc, r) => acc + (r.riderRating || 0), 0);
    return {
      average: sum / validRatings.length,
      count: validRatings.length
    };
  }

  // Wallet transaction operations
  async getWalletTransactions(walletId: string): Promise<WalletTransaction[]> {
    return await db.query.walletTransactions.findMany({
      where: eq(walletTransactions.walletId, walletId),
      orderBy: desc(walletTransactions.createdAt)
    });
  }

  async getWalletTransactionsByUser(userId: string): Promise<(WalletTransaction & { wallet: Wallet })[]> {
    const userWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId)
    });
    
    if (!userWallet) return [];
    
    return await db.query.walletTransactions.findMany({
      where: eq(walletTransactions.walletId, userWallet.id),
      with: {
        wallet: true
      },
      orderBy: desc(walletTransactions.createdAt)
    }) as (WalletTransaction & { wallet: Wallet })[];
  }

  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> {
    const [result] = await db.insert(walletTransactions)
      .values({
        id: crypto.randomUUID(),
        ...transaction,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Update wallet balance based on transaction type
    if (transaction.type === 'wallet_deposit' || transaction.type === 'gcash_topup' || transaction.type === 'maya_topup') {
      await this.updateWalletBalanceInternal(transaction.walletId, parseFloat(transaction.amount.toString()));
    } else if (transaction.type === 'wallet_withdrawal' || transaction.type === 'order_payment') {
      await this.updateWalletBalanceInternal(transaction.walletId, -parseFloat(transaction.amount.toString()));
    }

    return result;
  }

  async updateWalletTransaction(id: string, updates: Partial<WalletTransaction>): Promise<WalletTransaction | undefined> {
    const [result] = await db.update(walletTransactions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(walletTransactions.id, id))
      .returning();
    return result;
  }

  async getWalletTransactionsByOrder(orderId: string): Promise<WalletTransaction[]> {
    return await db.query.walletTransactions.findMany({
      where: eq(walletTransactions.orderId, orderId),
      orderBy: desc(walletTransactions.createdAt)
    });
  }

  // Philippine payment specific operations
  async processGCashPayment(walletId: string, amount: number, referenceNumber: string): Promise<WalletTransaction> {
    return await this.createWalletTransaction({
      walletId,
      type: 'gcash_topup',
      paymentMethod: 'gcash',
      amount: amount.toString(),
      description: `GCash wallet top-up - ${referenceNumber}`,
      gcashReferenceNumber: referenceNumber,
      status: 'completed'
    });
  }

  async processMayaPayment(walletId: string, amount: number, transactionId: string, paymentId: string): Promise<WalletTransaction> {
    return await this.createWalletTransaction({
      walletId,
      type: 'maya_topup', 
      paymentMethod: 'maya',
      amount: amount.toString(),
      description: `Maya wallet top-up - ${transactionId}`,
      mayaTransactionId: transactionId,
      mayaPaymentId: paymentId,
      status: 'completed'
    });
  }

  async processCashTransaction(walletId: string, amount: number, handledBy: string, description: string): Promise<WalletTransaction> {
    return await this.createWalletTransaction({
      walletId,
      type: 'cash_collection',
      paymentMethod: 'cash',
      amount: amount.toString(),
      description,
      cashHandledBy: handledBy,
      status: 'completed'
    });
  }

  private async updateWalletBalanceInternal(walletId: string, amount: number): Promise<void> {
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.id, walletId)
    });
    
    if (wallet) {
      const currentBalance = wallet.balance ? parseFloat(wallet.balance.toString()) : 0;
      const newBalance = currentBalance + amount;
      await db.update(wallets)
        .set({ balance: newBalance.toString(), updatedAt: new Date() })
        .where(eq(wallets.id, walletId));
    }
  }

  // Rider document management
  async updateRiderDocuments(riderId: string, documents: { orcrDocument?: string; motorImage?: string; idDocument?: string }): Promise<Rider | undefined> {
    // First, get the current rider to check their documentsStatus
    const [currentRider] = await db.select().from(riders).where(eq(riders.id, riderId));
    
    if (!currentRider) {
      throw new Error('Rider not found');
    }
    
    // Only allow document updates if status is 'incomplete' or 'rejected'
    if (currentRider.documentsStatus !== 'incomplete' && currentRider.documentsStatus !== 'rejected') {
      throw new Error(`Cannot update documents when status is '${currentRider.documentsStatus}'. Documents are locked.`);
    }
    
    // Clear rejectedReason if uploading new documents after rejection
    const updates: any = { 
      ...documents, 
      updatedAt: new Date()
    };
    
    if (currentRider.documentsStatus === 'rejected') {
      updates.rejectedReason = null;
    }
    
    const [result] = await db.update(riders)
      .set(updates)
      .where(eq(riders.id, riderId))
      .returning();
    return result;
  }

  async submitRiderDocuments(riderId: string): Promise<Rider | undefined> {
    // First, get the current rider to validate their state
    const [currentRider] = await db.select().from(riders).where(eq(riders.id, riderId));
    
    if (!currentRider) {
      throw new Error('Rider not found');
    }
    
    // Only allow submission if status is 'incomplete' or 'rejected'
    if (currentRider.documentsStatus !== 'incomplete' && currentRider.documentsStatus !== 'rejected') {
      throw new Error(`Cannot submit documents when status is '${currentRider.documentsStatus}'`);
    }
    
    // Validate all three documents are uploaded
    if (!currentRider.orcrDocument || !currentRider.motorImage || !currentRider.idDocument) {
      throw new Error('All three documents (OR/CR, Motor Image, and Valid ID) must be uploaded before submission');
    }
    
    const [result] = await db.update(riders)
      .set({ 
        documentsStatus: 'pending',
        documentsSubmittedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(riders.id, riderId))
      .returning();
    return result;
  }

  async reviewRiderDocuments(riderId: string, approved: boolean, reviewedBy: string, reason?: string): Promise<Rider | undefined> {
    const [result] = await db.update(riders)
      .set({ 
        documentsStatus: approved ? 'approved' : 'rejected',
        approvedBy: approved ? reviewedBy : null,
        rejectedReason: approved ? null : reason,
        documentsReviewedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(riders.id, riderId))
      .returning();
    return result;
  }

  async getRidersForApproval(): Promise<Rider[]> {
    return await db.query.riders.findMany({
      where: eq(riders.documentsStatus, 'pending'),
      orderBy: asc(riders.documentsSubmittedAt)
    });
  }

  async requestDocumentUpdate(riderId: string, documents: { orcrDocument?: string; motorImage?: string; idDocument?: string }): Promise<Rider | undefined> {
    // First, get the current rider to check their documentsStatus
    const [currentRider] = await db.select().from(riders).where(eq(riders.id, riderId));
    
    if (!currentRider) {
      throw new Error('Rider not found');
    }
    
    // Only allow document updates for approved riders
    if (currentRider.documentsStatus !== 'approved') {
      throw new Error(`Document update is only available for approved riders. Current status: ${currentRider.documentsStatus}`);
    }
    
    // Validate all three documents are provided
    if (!documents.orcrDocument || !documents.motorImage || !documents.idDocument) {
      throw new Error('All three documents (OR/CR, Motor Image, and Valid ID) must be provided');
    }
    
    // Update documents, set status back to 'pending', set rider to 'offline', and clear approval data
    const [result] = await db.update(riders)
      .set({ 
        orcrDocument: documents.orcrDocument,
        motorImage: documents.motorImage,
        idDocument: documents.idDocument,
        documentsStatus: 'pending',
        status: 'offline',
        documentsSubmittedAt: new Date(),
        approvedBy: null,
        rejectedReason: null,
        documentsReviewedAt: null,
        updatedAt: new Date()
      })
      .where(eq(riders.id, riderId))
      .returning();
    return result;
  }

  // Merchant approval operations
  async getMerchantsForApproval(): Promise<User[]> {
    return await db.query.users.findMany({
      where: (users, { eq, and }) => 
        and(
          eq(users.role, 'merchant'),
          eq(users.approvalStatus, 'pending')
        ),
      orderBy: asc(users.createdAt)
    });
  }

  async reviewMerchant(userId: string, approved: boolean, reviewedBy: string): Promise<User | undefined> {
    const [result] = await db.update(users)
      .set({ 
        approvalStatus: approved ? 'approved' : 'rejected',
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return result;
  }

  // Order status history tracking
  async createOrderStatusHistory(historyData: InsertOrderStatusHistory): Promise<OrderStatusHistory> {
    const [history] = await db.insert(orderStatusHistory).values(historyData).returning();
    return history;
  }

  async getOrderStatusHistory(orderId: string): Promise<(OrderStatusHistory & { changedByUser: User })[]> {
    const result = await db
      .select()
      .from(orderStatusHistory)
      .leftJoin(users, eq(orderStatusHistory.changedBy, users.id))
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(asc(orderStatusHistory.createdAt));
    
    return result.map(row => ({
      ...row.order_status_history,
      changedByUser: row.users!
    }));
  }

  async updateOrderWithStatusHistory(orderId: string, updates: Partial<Order>, changedBy: string, notes?: string, location?: any): Promise<Order | undefined> {
    // Get current order to track previous status
    const currentOrder = await this.getOrder(orderId);
    if (!currentOrder) return undefined;

    // If status is changing to 'delivered', calculate commission and set completedAt
    if (updates.status === 'delivered' && currentOrder.status !== 'delivered') {
      const settings = await this.getSystemSettings();
      const riderCommissionPercentage = parseFloat(settings?.riderCommissionPercentage || '70') / 100;
      
      // Calculate rider commission: (delivery fee + markup) × commission percentage
      const deliveryFee = parseFloat(currentOrder.deliveryFee as string);
      const markup = parseFloat(currentOrder.markup as string);
      const commission = (deliveryFee + markup) * riderCommissionPercentage;
      
      updates.commission = commission.toFixed(2);
      updates.completedAt = new Date();
      
      console.log(`[Order ${orderId}] Setting commission: ₱${commission.toFixed(2)} (${riderCommissionPercentage * 100}% of ₱${deliveryFee} + ₱${markup})`);
    }

    // Update the order
    const [updatedOrder] = await db.update(orders).set({
      ...updates,
      updatedAt: new Date()
    }).where(eq(orders.id, orderId)).returning();

    // Create status history record if status changed
    if (updates.status && updates.status !== currentOrder.status) {
      await this.createOrderStatusHistory({
        orderId,
        status: updates.status as any,
        changedBy,
        previousStatus: currentOrder.status as any,
        notes,
        location,
        estimatedDeliveryTime: updates.estimatedDeliveryTime
      });
    }

    return updatedOrder || undefined;
  }

  // Rider location tracking
  async createRiderLocationHistory(locationData: InsertRiderLocationHistory): Promise<RiderLocationHistory> {
    const [location] = await db.insert(riderLocationHistory).values(locationData).returning();
    return location;
  }

  async getRiderLocationHistory(riderId: string, orderId?: string): Promise<RiderLocationHistory[]> {
    let query = db
      .select()
      .from(riderLocationHistory)
      .where(eq(riderLocationHistory.riderId, riderId))
      .orderBy(desc(riderLocationHistory.timestamp));

    if (orderId) {
      query = query.where(and(eq(riderLocationHistory.riderId, riderId), eq(riderLocationHistory.orderId, orderId)));
    }

    return await query;
  }

  async getLatestRiderLocation(riderId: string): Promise<RiderLocationHistory | undefined> {
    const [location] = await db
      .select()
      .from(riderLocationHistory)
      .where(eq(riderLocationHistory.riderId, riderId))
      .orderBy(desc(riderLocationHistory.timestamp))
      .limit(1);
    
    return location || undefined;
  }

  async updateRiderLocation(riderId: string, locationData: { latitude: number; longitude: number; accuracy?: number; heading?: number; speed?: number; batteryLevel?: number; orderId?: string }): Promise<RiderLocationHistory> {
    // Create new location history record
    const locationRecord = await this.createRiderLocationHistory({
      riderId,
      latitude: String(locationData.latitude),
      longitude: String(locationData.longitude),
      accuracy: locationData.accuracy ? String(locationData.accuracy) : null,
      heading: locationData.heading ? String(locationData.heading) : null,
      speed: locationData.speed ? String(locationData.speed) : null,
      batteryLevel: locationData.batteryLevel || null,
      orderId: locationData.orderId || null,
      isOnline: true
    });

    // Update rider's current position
    await this.updateRider(riderId, {
      currentLatitude: String(locationData.latitude),
      currentLongitude: String(locationData.longitude),
      updatedAt: new Date()
    });

    return locationRecord;
  }

  // Customer management (Admin only)
  async getCustomers(filters?: { search?: string; province?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<(User & { orderCount: number })[]> {
    const { search, province, sortBy = 'createdAt', sortOrder = 'desc' } = filters || {};
    const { or, ilike, count, sql } = await import('drizzle-orm');
    
    // Build where conditions
    const conditions = [eq(users.role, 'customer')];
    
    // Apply search filter
    if (search) {
      conditions.push(
        or(
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )!
      );
    }

    // Apply province filter
    if (province) {
      conditions.push(eq(users.province, province));
    }

    // Efficient query with LEFT JOIN and GROUP BY to get order counts in single query
    const sortColumn = sortBy === 'name' ? users.firstName : users.createdAt;
    const customersWithCounts = await db
      .select({
        user: users,
        orderCount: count(orders.id)
      })
      .from(users)
      .leftJoin(orders, eq(orders.customerId, users.id))
      .where(and(...conditions))
      .groupBy(users.id)
      .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn));

    // Sanitize customer data - strip sensitive fields
    return customersWithCounts.map(({ user, orderCount }) => {
      const { password, passwordResetToken, passwordResetExpiry, otpCode, otpExpiry, ...sanitizedUser } = user;
      return {
        ...sanitizedUser,
        orderCount
      };
    });
  }

  async getCustomerDetails(id: string): Promise<{ customer: User; savedAddresses: SavedAddress[]; orderCount: number; recentOrders: Order[] } | undefined> {
    // Get customer
    const { count } = await import('drizzle-orm');
    const customer = await this.getUser(id);
    if (!customer || customer.role !== 'customer') {
      return undefined;
    }

    // Get saved addresses
    const addresses = await db.select()
      .from(savedAddresses)
      .where(eq(savedAddresses.userId, id))
      .orderBy(desc(savedAddresses.isDefault));

    // Get total order count (separate query for accuracy)
    const [{ count: totalOrders }] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.customerId, id));

    // Get recent orders (limited to 10)
    const recentOrders = await db.select()
      .from(orders)
      .where(eq(orders.customerId, id))
      .orderBy(desc(orders.createdAt))
      .limit(10);

    // Sanitize customer data - strip sensitive fields
    const { password, passwordResetToken, passwordResetExpiry, otpCode, otpExpiry, ...sanitizedCustomer } = customer;

    return {
      customer: sanitizedCustomer as User,
      savedAddresses: addresses,
      orderCount: totalOrders,
      recentOrders
    };
  }

  async deleteCustomer(id: string): Promise<void> {
    // The cascade delete will handle related data (orders, saved addresses, etc.)
    await db.delete(users).where(eq(users.id, id));
  }

  // Session management
  async clearAllSessions(): Promise<void> {
    // Clear all sessions from the PostgreSQL session store
    await pool.query('DELETE FROM session');
    console.log('All sessions have been cleared');
  }
}

export const storage = new DatabaseStorage();
