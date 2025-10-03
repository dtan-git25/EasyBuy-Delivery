import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['customer', 'rider', 'merchant', 'admin', 'owner']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled']);
export const riderStatusEnum = pgEnum('rider_status', ['offline', 'online', 'busy']);

export const documentApprovalEnum = pgEnum('document_approval', [
  'pending',
  'approved', 
  'rejected',
  'incomplete'
]);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected']);

// Users table - Enhanced for Philippine standards
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default('customer'),
  
  // Personal Information - Philippine Standard
  prefix: text("prefix"), // Mr., Ms., Dr., etc.
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  age: integer("age"),
  gender: text("gender"), // Male, Female, Prefer not to say
  
  // Contact Information
  phone: text("phone"),
  email_verified: boolean("email_verified").default(false),
  
  // Address - Philippine Standard
  lotHouseNo: text("lot_house_no"),
  street: text("street"),
  barangay: text("barangay"),
  cityMunicipality: text("city_municipality"),
  province: text("province"),
  landmark: text("landmark"),
  fullAddress: text("full_address"), // Computed/combined address
  
  // Documents and Photos
  profileImage: text("profile_image"),
  photoPath: text("photo_path"), // For rider photo upload
  
  // Rider-specific fields
  driversLicenseNo: text("drivers_license_no"),
  licenseValidityDate: timestamp("license_validity_date"),
  licensePhotoPath: text("license_photo_path"),
  
  // Merchant-specific fields  
  storeName: text("store_name"),
  storeAddress: text("store_address"),
  storeContactNo: text("store_contact_no"),
  ownerName: text("owner_name"),
  
  // System fields
  approvalStatus: approvalStatusEnum("approval_status").default('pending'),
  rejectionReason: text("rejection_reason"), // Admin's reason for rejecting merchant/rider
  isActive: boolean("is_active").default(true),
  otpCode: text("otp_code"),
  otpExpiry: timestamp("otp_expiry"),
  
  // Password reset fields
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Restaurants/Merchants table
export const restaurants = pgTable("restaurants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  phone: text("phone").notNull(),
  email: text("email"),
  cuisine: text("cuisine").notNull(),
  image: text("image"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default('0'),
  isActive: boolean("is_active").default(true),
  markup: decimal("markup", { precision: 5, scale: 2 }).default('15'),
  deliveryFee: decimal("delivery_fee", { precision: 8, scale: 2 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Menu items table
export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 8, scale: 2 }).notNull(),
  category: text("category").notNull(),
  image: text("image"),
  isAvailable: boolean("is_available").default(true),
  variants: jsonb("variants"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories table - Admin managed food categories
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  icon: text("icon"), // Emoji or icon identifier
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Riders table
export const riders = pgTable("riders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  vehicleType: text("vehicle_type").notNull(),
  vehicleModel: text("vehicle_model").notNull(),
  plateNumber: text("plate_number").notNull(),
  licenseNumber: text("license_number").notNull(),
  orcrDocument: text("orcr_document"),
  motorImage: text("motor_image"),
  idDocument: text("id_document"),
  // Document approval workflow
  documentsStatus: documentApprovalEnum("documents_status").default('incomplete'),
  approvedBy: varchar("approved_by"), // Admin user ID who approved
  rejectedReason: text("rejected_reason"),
  documentsSubmittedAt: timestamp("documents_submitted_at"),
  documentsReviewedAt: timestamp("documents_reviewed_at"),
  status: riderStatusEnum("status").default('offline'),
  currentLatitude: decimal("current_latitude", { precision: 10, scale: 8 }),
  currentLongitude: decimal("current_longitude", { precision: 11, scale: 8 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).default('0'),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wallets table
export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Philippine payment methods enum
export const paymentMethodEnum = pgEnum("payment_method", [
  'gcash',
  'maya', 
  'cod', // Cash on Delivery
  'cash', // Direct cash payment
  'wallet' // Internal wallet balance
]);

// Transaction types enum
export const transactionTypeEnum = pgEnum("transaction_type", [
  'wallet_deposit', // Add funds to wallet
  'wallet_withdrawal', // Cash out from wallet
  'order_payment', // Customer pays for order
  'order_refund', // Refund to customer
  'rider_payout', // Payment to rider
  'merchant_payout', // Payment to merchant  
  'cash_collection', // Rider collects cash
  'cash_remittance', // Rider deposits cash to merchant
  'fee_charge', // Platform fees
  'promotion_credit', // Promotional credits
  'gcash_topup', // GCash wallet top-up
  'maya_topup' // Maya wallet top-up
]);

// Transaction status enum  
export const transactionStatusEnum = pgEnum("transaction_status", [
  'pending',
  'completed',
  'failed',
  'cancelled'
]);

// Wallet transactions table
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull(),
  orderId: varchar("order_id"), // Optional, for order-related transactions
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").default('pending'),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  // Philippine payment provider data
  gcashReferenceNumber: text("gcash_reference_number"), // GCash transaction reference
  mayaTransactionId: text("maya_transaction_id"), // Maya transaction ID
  mayaPaymentId: text("maya_payment_id"), // Maya payment ID
  cashHandledBy: varchar("cash_handled_by"), // User ID who handled cash (for riders)
  // Additional transaction metadata
  metadata: jsonb("metadata"), // Store additional payment details
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  restaurantId: varchar("restaurant_id").notNull(),
  riderId: varchar("rider_id"),
  orderNumber: text("order_number").notNull().unique(),
  items: jsonb("items").notNull(),
  subtotal: decimal("subtotal", { precision: 8, scale: 2 }).notNull(),
  markup: decimal("markup", { precision: 8, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 8, scale: 2 }).notNull(),
  merchantFee: decimal("merchant_fee", { precision: 8, scale: 2 }).default('0'),
  convenienceFee: decimal("convenience_fee", { precision: 8, scale: 2 }).default('0'),
  total: decimal("total", { precision: 8, scale: 2 }).notNull(),
  status: orderStatusEnum("status").default('pending'),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryLatitude: decimal("delivery_latitude", { precision: 10, scale: 8 }),
  deliveryLongitude: decimal("delivery_longitude", { precision: 11, scale: 8 }),
  customerNotes: text("customer_notes"),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default('cash'),
  phoneNumber: text("phone_number").notNull(),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Order status history table for tracking order lifecycle
export const orderStatusHistory = pgTable("order_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  status: orderStatusEnum("status").notNull(),
  changedBy: varchar("changed_by").notNull(), // User ID who changed the status
  previousStatus: orderStatusEnum("previous_status"),
  notes: text("notes"), // Optional notes about the status change
  location: jsonb("location"), // GPS coordinates at time of status change
  estimatedDeliveryTime: timestamp("estimated_delivery_time"), // Updated ETA
  createdAt: timestamp("created_at").defaultNow(),
});

// Real-time location tracking table for active deliveries
export const riderLocationHistory = pgTable("rider_location_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: varchar("rider_id").notNull(),
  orderId: varchar("order_id"), // Associated order if during delivery
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }), // GPS accuracy in meters
  heading: decimal("heading", { precision: 5, scale: 2 }), // Direction of travel
  speed: decimal("speed", { precision: 8, scale: 2 }), // Speed in km/h
  batteryLevel: integer("battery_level"), // Phone battery level
  isOnline: boolean("is_online").default(true),
  timestamp: timestamp("timestamp").defaultNow(),
});

// System settings table
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  baseDeliveryFee: decimal("base_delivery_fee", { precision: 8, scale: 2 }).default('25'),
  perKmRate: decimal("per_km_rate", { precision: 8, scale: 2 }).default('15'),
  convenienceFee: decimal("convenience_fee", { precision: 8, scale: 2 }).default('10'),
  showConvenienceFee: boolean("show_convenience_fee").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  restaurants: many(restaurants),
  orders: many(orders),
  rider: one(riders, { fields: [users.id], references: [riders.userId] }),
  wallet: one(wallets, { fields: [users.id], references: [wallets.userId] }),
  sentMessages: many(chatMessages),
}));

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  owner: one(users, { fields: [restaurants.ownerId], references: [users.id] }),
  menuItems: many(menuItems),
  orders: many(orders),
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  restaurant: one(restaurants, { fields: [menuItems.restaurantId], references: [restaurants.id] }),
}));

export const ridersRelations = relations(riders, ({ one, many }) => ({
  user: one(users, { fields: [riders.userId], references: [users.id] }),
  orders: many(orders),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
  transactions: many(walletTransactions),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(wallets, { fields: [walletTransactions.walletId], references: [wallets.id] }),
  order: one(orders, { fields: [walletTransactions.orderId], references: [orders.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, { fields: [orders.customerId], references: [users.id] }),
  restaurant: one(restaurants, { fields: [orders.restaurantId], references: [restaurants.id] }),
  rider: one(riders, { fields: [orders.riderId], references: [riders.id] }),
  chatMessages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  order: one(orders, { fields: [chatMessages.orderId], references: [orders.id] }),
  sender: one(users, { fields: [chatMessages.senderId], references: [users.id] }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
  changedByUser: one(users, { fields: [orderStatusHistory.changedBy], references: [users.id] }),
}));

export const riderLocationHistoryRelations = relations(riderLocationHistory, ({ one }) => ({
  rider: one(riders, { fields: [riderLocationHistory.riderId], references: [riders.id] }),
  order: one(orders, { fields: [riderLocationHistory.orderId], references: [orders.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRiderSchema = createInsertSchema(riders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderStatusHistorySchema = createInsertSchema(orderStatusHistory).omit({
  id: true,
  createdAt: true,
});

export const insertRiderLocationHistorySchema = createInsertSchema(riderLocationHistory).omit({
  id: true,
  timestamp: true,
});

// Role-specific Registration Schemas - Philippine Standards

// Customer Registration Schema
export const customerRegistrationSchema = z.object({
  // Personal Information
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  age: z.number().min(13, "Must be at least 13 years old").max(120, "Invalid age"),
  gender: z.enum(['Male', 'Female', 'Prefer not to say']),
  
  // Address
  lotHouseNo: z.string().min(1, "Lot/House number is required"),
  street: z.string().min(1, "Street is required"),
  barangay: z.string().min(1, "Barangay is required"),
  cityMunicipality: z.string().min(1, "City/Municipality is required"),
  province: z.string().min(1, "Province is required"),
  landmark: z.string().optional(),
  
  // Contact
  email: z.string().email("Invalid email address"),
  phone: z.string().min(11, "Phone number must be at least 11 digits"),
  
  // System
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Rider Registration Schema  
export const riderRegistrationSchema = z.object({
  // Personal Information
  prefix: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(), 
  lastName: z.string().min(1, "Last name is required"),
  
  // Address
  lotHouseNo: z.string().min(1, "Lot/House number is required"),
  street: z.string().min(1, "Street is required"),
  barangay: z.string().min(1, "Barangay is required"),
  cityMunicipality: z.string().min(1, "City/Municipality is required"),
  province: z.string().min(1, "Province is required"),
  
  // Contact
  email: z.string().email("Invalid email address"),
  phone: z.string().min(11, "Phone number must be at least 11 digits"),
  
  // License
  driversLicenseNo: z.string().min(1, "Driver's license number is required"),
  licenseValidityDate: z.string().min(1, "License validity date is required"),
  
  // System
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Merchant Registration Schema
export const merchantRegistrationSchema = z.object({
  // Personal Information (Owner)
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  
  // Store Information
  storeName: z.string().min(1, "Store name is required"),
  storeAddress: z.string().min(1, "Store address is required"),
  storeContactNo: z.string().min(11, "Store contact number must be at least 11 digits"),
  
  // Contact
  email: z.string().email("Invalid email address"),
  
  // System
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Admin Registration Schema
export const adminRegistrationSchema = z.object({
  // Personal Information
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  
  // Address
  lotHouseNo: z.string().min(1, "Lot/House number is required"),
  street: z.string().min(1, "Street is required"),
  barangay: z.string().min(1, "Barangay is required"),
  cityMunicipality: z.string().min(1, "City/Municipality is required"),
  
  // Contact
  email: z.string().email("Invalid email address"),
  phone: z.string().min(11, "Phone number must be at least 11 digits"),
  
  // System
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Rider = typeof riders.$inferSelect;
export type InsertRider = z.infer<typeof insertRiderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Wallet = typeof wallets.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;

// Registration Form Types
export type CustomerRegistration = z.infer<typeof customerRegistrationSchema>;
export type RiderRegistration = z.infer<typeof riderRegistrationSchema>;
export type MerchantRegistration = z.infer<typeof merchantRegistrationSchema>;
export type AdminRegistration = z.infer<typeof adminRegistrationSchema>;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type InsertOrderStatusHistory = z.infer<typeof insertOrderStatusHistorySchema>;
export type RiderLocationHistory = typeof riderLocationHistory.$inferSelect;
export type InsertRiderLocationHistory = z.infer<typeof insertRiderLocationHistorySchema>;
export type SystemSettings = typeof systemSettings.$inferSelect;
