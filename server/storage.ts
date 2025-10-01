import { users, restaurants, menuItems, riders, wallets, orders, chatMessages, systemSettings, walletTransactions, orderStatusHistory, riderLocationHistory, type User, type InsertUser, type Restaurant, type InsertRestaurant, type MenuItem, type InsertMenuItem, type Rider, type InsertRider, type Order, type InsertOrder, type ChatMessage, type InsertChatMessage, type Wallet, type SystemSettings, type WalletTransaction, type InsertWalletTransaction, type OrderStatusHistory, type InsertOrderStatusHistory, type RiderLocationHistory, type InsertRiderLocationHistory } from "@shared/schema";
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
  getRestaurant(id: string): Promise<Restaurant | undefined>;
  getRestaurantsByOwner(ownerId: string): Promise<Restaurant[]>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: string, updates: Partial<Restaurant>): Promise<Restaurant | undefined>;

  // Menu operations
  getMenuItems(restaurantId: string): Promise<MenuItem[]>;
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem | undefined>;

  // Rider operations
  getRiders(): Promise<(Rider & { user: User })[]>;
  getRider(id: string): Promise<(Rider & { user: User }) | undefined>;
  getRiderByUserId(userId: string): Promise<Rider | undefined>;
  createRider(rider: InsertRider): Promise<Rider>;
  updateRider(id: string, updates: Partial<Rider>): Promise<Rider | undefined>;

  // Wallet operations
  getWallet(userId: string): Promise<Wallet | undefined>;
  createWallet(userId: string): Promise<Wallet>;
  updateWalletBalance(userId: string, amount: number): Promise<Wallet | undefined>;

  // Order operations
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByCustomer(customerId: string): Promise<Order[]>;
  getOrdersByRestaurant(restaurantId: string): Promise<Order[]>;
  getOrdersByRider(riderId: string): Promise<Order[]>;
  getPendingOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;

  // Chat operations
  getChatMessages(orderId: string): Promise<(ChatMessage & { sender: User })[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // System settings
  getSystemSettings(): Promise<SystemSettings | undefined>;
  updateSystemSettings(updates: Partial<SystemSettings>): Promise<SystemSettings | undefined>;

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

  // Order status history tracking
  createOrderStatusHistory(historyData: InsertOrderStatusHistory): Promise<OrderStatusHistory>;
  getOrderStatusHistory(orderId: string): Promise<(OrderStatusHistory & { changedByUser: User })[]>;
  updateOrderWithStatusHistory(orderId: string, updates: Partial<Order>, changedBy: string, notes?: string, location?: any): Promise<Order | undefined>;

  // Rider location tracking
  createRiderLocationHistory(locationData: InsertRiderLocationHistory): Promise<RiderLocationHistory>;
  getRiderLocationHistory(riderId: string, orderId?: string): Promise<RiderLocationHistory[]>;
  getLatestRiderLocation(riderId: string): Promise<RiderLocationHistory | undefined>;
  updateRiderLocation(riderId: string, locationData: { latitude: number; longitude: number; accuracy?: number; heading?: number; speed?: number; batteryLevel?: number; orderId?: string }): Promise<RiderLocationHistory>;

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
    return await db.select().from(restaurants).where(eq(restaurants.isActive, true));
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

  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersByRestaurant(restaurantId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.restaurantId, restaurantId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersByRider(riderId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.riderId, riderId))
      .orderBy(desc(orders.createdAt));
  }

  async getPendingOrders(): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.status, 'pending'))
      .orderBy(asc(orders.createdAt));
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
}

export const storage = new DatabaseStorage();
