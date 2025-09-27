import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";

interface ExtendedWebSocket extends WebSocket {
  orderId?: string;
}
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertRestaurantSchema, insertMenuItemSchema, insertOrderSchema, insertChatMessageSchema, insertRiderSchema, insertWalletTransactionSchema, type Order } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Configure multer for direct object storage uploads
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        // Get private object storage directory
        const privateDir = process.env.PRIVATE_OBJECT_DIR;
        if (!privateDir) {
          return cb(new Error("Object storage not configured - PRIVATE_OBJECT_DIR missing"));
        }
        
        // Create rider-specific directory
        const userId = (req as any).user?.id;
        if (!userId) {
          return cb(new Error("User not authenticated"));
        }
        
        const riderDir = path.join(privateDir, 'riders', userId);
        fs.mkdirSync(riderDir, { recursive: true });
        cb(null, riderDir);
      },
      filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const fileExtension = path.extname(file.originalname);
        const fileName = `${file.fieldname}_${Date.now()}${fileExtension}`;
        cb(null, fileName);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|pdf/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
      }
    }
  });

  // Restaurant routes
  app.get("/api/restaurants", async (req, res) => {
    try {
      const restaurants = await storage.getRestaurants();
      res.json(restaurants);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      res.status(500).json({ error: "Failed to fetch restaurants" });
    }
  });

  app.get("/api/restaurants/:id/menu", async (req, res) => {
    try {
      const menuItems = await storage.getMenuItems(req.params.id);
      res.json(menuItems);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  app.post("/api/restaurants", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'merchant') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const restaurantData = insertRestaurantSchema.parse({
        ...req.body,
        ownerId: req.user.id
      });
      
      const restaurant = await storage.createRestaurant(restaurantData);
      res.status(201).json(restaurant);
    } catch (error) {
      console.error("Error creating restaurant:", error);
      res.status(400).json({ error: "Invalid restaurant data" });
    }
  });

  app.post("/api/restaurants/:id/menu", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'merchant') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const menuItemData = insertMenuItemSchema.parse({
        ...req.body,
        restaurantId: req.params.id
      });
      
      const menuItem = await storage.createMenuItem(menuItemData);
      res.status(201).json(menuItem);
    } catch (error) {
      console.error("Error creating menu item:", error);
      res.status(400).json({ error: "Invalid menu item data" });
    }
  });

  // Menu Items routes
  app.get("/api/menu-items", async (req, res) => {
    try {
      const restaurantId = req.query.restaurantId as string;
      
      if (restaurantId) {
        const menuItems = await storage.getMenuItems(restaurantId);
        res.json(menuItems);
      } else {
        // Return empty array if no restaurant ID provided
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching menu items:", error);
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  app.post("/api/menu-items", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'merchant') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      // Find the merchant's restaurant
      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.status(400).json({ error: "No restaurant found for this merchant" });
      }
      
      const restaurantId = req.body.restaurantId || restaurants[0].id;
      
      const menuItemData = insertMenuItemSchema.parse({
        ...req.body,
        restaurantId
      });
      
      const menuItem = await storage.createMenuItem(menuItemData);
      res.status(201).json(menuItem);
    } catch (error) {
      console.error("Error creating menu item:", error);
      res.status(400).json({ error: "Invalid menu item data" });
    }
  });

  // Order routes
  app.get("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      let orders: Order[];
      
      switch (req.user.role) {
        case 'customer':
          orders = await storage.getOrdersByCustomer(req.user.id);
          break;
        case 'merchant':
          const merchantRestaurants = await storage.getRestaurantsByOwner(req.user.id);
          orders = [];
          for (const restaurant of merchantRestaurants) {
            const restaurantOrders = await storage.getOrdersByRestaurant(restaurant.id);
            orders.push(...restaurantOrders);
          }
          break;
        case 'rider':
          const rider = await storage.getRiderByUserId(req.user.id);
          if (rider) {
            orders = await storage.getOrdersByRider(rider.id);
          } else {
            orders = [];
          }
          break;
        case 'admin':
          orders = await storage.getOrders();
          break;
        default:
          orders = [];
      }
      
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/pending", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'rider') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const pendingOrders = await storage.getPendingOrders();
      res.json(pendingOrders);
    } catch (error) {
      console.error("Error fetching pending orders:", error);
      res.status(500).json({ error: "Failed to fetch pending orders" });
    }
  });

  // Order status history route
  app.get("/api/orders/:id/history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const statusHistory = await storage.getOrderStatusHistory(req.params.id);
      res.json(statusHistory);
    } catch (error) {
      console.error("Error fetching order status history:", error);
      res.status(500).json({ error: "Failed to fetch order status history" });
    }
  });

  // Rider location update route
  app.post("/api/rider/location", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'rider') {
      return res.status(401).json({ error: "Unauthorized - Riders only" });
    }

    try {
      const rider = await storage.getRiderByUserId(req.user.id);
      if (!rider) {
        return res.status(404).json({ error: "Rider profile not found" });
      }

      const { latitude, longitude, accuracy, heading, speed, batteryLevel, orderId } = req.body;
      
      // Validate required fields
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      const locationRecord = await storage.updateRiderLocation(rider.id, {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : undefined,
        heading: heading ? parseFloat(heading) : undefined,
        speed: speed ? parseFloat(speed) : undefined,
        batteryLevel: batteryLevel ? parseInt(batteryLevel) : undefined,
        orderId
      });

      // Broadcast location update via WebSocket
      if (wss) {
        const message = JSON.stringify({
          type: 'rider_location_update',
          riderId: rider.id,
          location: locationRecord,
          timestamp: new Date().toISOString()
        });
        
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }

      res.json({ 
        message: "Location updated successfully", 
        location: locationRecord 
      });
    } catch (error) {
      console.error("Error updating rider location:", error);
      res.status(500).json({ error: "Failed to update rider location" });
    }
  });

  // Get rider location history
  app.get("/api/rider/location/history", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'rider') {
      return res.status(401).json({ error: "Unauthorized - Riders only" });
    }

    try {
      const rider = await storage.getRiderByUserId(req.user.id);
      if (!rider) {
        return res.status(404).json({ error: "Rider profile not found" });
      }

      const orderId = req.query.orderId as string;
      const locationHistory = await storage.getRiderLocationHistory(rider.id, orderId);
      
      res.json(locationHistory);
    } catch (error) {
      console.error("Error fetching rider location history:", error);
      res.status(500).json({ error: "Failed to fetch location history" });
    }
  });

  // Get latest rider location (for admin/customer tracking)
  app.get("/api/rider/:riderId/location/latest", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const latestLocation = await storage.getLatestRiderLocation(req.params.riderId);
      
      if (!latestLocation) {
        return res.status(404).json({ error: "No location data found" });
      }

      res.json(latestLocation);
    } catch (error) {
      console.error("Error fetching latest rider location:", error);
      res.status(500).json({ error: "Failed to fetch rider location" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'customer') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      // Generate order number
      const orderNumber = `EBD-${Date.now()}`;
      
      const orderData = insertOrderSchema.parse({
        ...req.body,
        customerId: req.user.id,
        orderNumber
      });
      
      const order = await storage.createOrder(orderData);
      
      // Broadcast new order to connected riders via WebSocket
      if (wss) {
        const message = JSON.stringify({
          type: 'new_order',
          order
        });
        
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(400).json({ error: "Invalid order data" });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      // Use enhanced order update with status history tracking
      const order = await storage.updateOrderWithStatusHistory(
        req.params.id, 
        req.body, 
        req.user.id,
        req.body.notes,
        req.body.location
      );
      
      if (order && wss) {
        // Enhanced WebSocket broadcast with more details
        const orderWithHistory = await storage.getOrderStatusHistory(order.id);
        const message = JSON.stringify({
          type: 'order_update',
          order,
          statusHistory: orderWithHistory,
          updatedBy: {
            id: req.user.id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            role: req.user.role
          },
          timestamp: new Date().toISOString()
        });
        
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
      
      res.json({ 
        order,
        message: "Order updated successfully with status tracking" 
      });
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  // Rider routes
  app.get("/api/riders", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const riders = await storage.getRiders();
      res.json(riders);
    } catch (error) {
      console.error("Error fetching riders:", error);
      res.status(500).json({ error: "Failed to fetch riders" });
    }
  });

  app.post("/api/riders", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'rider') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const riderData = insertRiderSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      const rider = await storage.createRider(riderData);
      res.status(201).json(rider);
    } catch (error) {
      console.error("Error creating rider profile:", error);
      res.status(400).json({ error: "Invalid rider data" });
    }
  });

  // Wallet routes
  app.get("/api/wallet", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const wallet = await storage.getWallet(req.user.id);
      res.json(wallet);
    } catch (error) {
      console.error("Error fetching wallet:", error);
      res.status(500).json({ error: "Failed to fetch wallet" });
    }
  });

  app.patch("/api/wallet/balance", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { amount } = req.body;
      const wallet = await storage.updateWalletBalance(req.user.id, amount);
      res.json(wallet);
    } catch (error) {
      console.error("Error updating wallet balance:", error);
      res.status(500).json({ error: "Failed to update wallet balance" });
    }
  });

  // Chat routes
  app.get("/api/orders/:id/chat", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const messages = await storage.getChatMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/orders/:id/chat", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const messageData = insertChatMessageSchema.parse({
        orderId: req.params.id,
        senderId: req.user.id,
        message: req.body.message
      });
      
      const chatMessage = await storage.createChatMessage(messageData);
      
      // Broadcast message via WebSocket
      if (wss) {
        const message = JSON.stringify({
          type: 'chat_message',
          orderId: req.params.id,
          message: chatMessage
        });
        
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
      
      res.status(201).json(chatMessage);
    } catch (error) {
      console.error("Error sending chat message:", error);
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // System settings routes (admin only)
  app.get("/api/settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const settings = await storage.updateSystemSettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // User management routes (admin only)
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { role } = req.query;
      let users;
      
      if (role) {
        users = await storage.getUsersByRole(role as string);
      } else {
        users = await storage.getUsersByRole('customer');
      }
      
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/approval", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { approvalStatus } = req.body;
      const user = await storage.updateUser(req.params.id, { approvalStatus });
      res.json(user);
    } catch (error) {
      console.error("Error updating user approval:", error);
      res.status(500).json({ error: "Failed to update user approval" });
    }
  });

  // Admin Statistics Routes
  app.get("/api/admin/stats", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      // Get total orders count and revenue
      const orders = await storage.getOrders();
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum: number, order: any) => sum + parseFloat(order.total.toString()), 0);

      // Get active riders count  
      const riders = await storage.getRiders();
      const activeRiders = riders.filter((rider: any) => rider.status === 'active').length;

      // Get total restaurants count
      const restaurants = await storage.getRestaurants();
      const totalRestaurants = restaurants.filter((restaurant: any) => restaurant.isActive).length;

      // Calculate growth metrics (simplified - we'll use basic calculations)
      // For a real implementation, you'd want to filter orders by date ranges
      const ordersGrowth = Math.floor(Math.random() * 20) + 5; // Simulated for now
      const revenueGrowth = Math.floor(Math.random() * 15) + 3;
      const ridersGrowth = Math.floor(Math.random() * 10) + 2;
      const restaurantsGrowth = Math.floor(Math.random() * 8) + 1;

      res.json({
        totalOrders,
        totalRevenue,
        activeRiders,
        totalRestaurants,
        ordersGrowth,
        revenueGrowth,
        ridersGrowth,
        restaurantsGrowth
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  // Admin Settings Routes
  app.get("/api/settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const settings = await storage.getSystemSettings();
      res.json(settings || {
        baseDeliveryFee: '25',
        perKmRate: '15',
        convenienceFee: '10',
        showConvenienceFee: true
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const updatedSettings = await storage.updateSystemSettings(req.body);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Admin User Management Routes  
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { role } = req.query;
      
      if (role === 'pending') {
        // Get users pending approval - using db directly for complex filtering
        const pendingUsers = await db.query.users.findMany({
          where: (users, { eq }) => eq(users.approvalStatus, 'pending')
        });
        res.json(pendingUsers);
      } else {
        // Get all users - using db directly
        const allUsers = await db.query.users.findMany();
        res.json(allUsers);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/approval", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { approvalStatus } = req.body;
      
      const updatedUser = await storage.updateUser(req.params.id, { 
        approvalStatus,
        updatedAt: new Date()
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user approval:", error);
      res.status(500).json({ error: "Failed to update user approval" });
    }
  });

  // Admin Restaurant Management Routes
  app.patch("/api/restaurants/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const updatedRestaurant = await storage.updateRestaurant(req.params.id, {
        ...req.body,
        updatedAt: new Date()
      });
      
      res.json(updatedRestaurant);
    } catch (error) {
      console.error("Error updating restaurant:", error);
      res.status(500).json({ error: "Failed to update restaurant" });
    }
  });

  // Wallet Transaction Routes
  app.get("/api/wallet/transactions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const transactions = await storage.getWalletTransactionsByUser(req.user.id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching wallet transactions:", error);
      res.status(500).json({ error: "Failed to fetch wallet transactions" });
    }
  });

  app.post("/api/wallet/deposit", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { amount, paymentMethod, gcashReference, mayaTransactionId, mayaPaymentId } = req.body;
      
      // Get or create user wallet
      let wallet = await storage.getWallet(req.user.id);
      if (!wallet) {
        wallet = await storage.createWallet(req.user.id);
      }

      let transaction;
      
      // Process based on payment method
      if (paymentMethod === 'gcash' && gcashReference) {
        transaction = await storage.processGCashPayment(wallet.id, amount, gcashReference);
      } else if (paymentMethod === 'maya' && mayaTransactionId && mayaPaymentId) {
        transaction = await storage.processMayaPayment(wallet.id, amount, mayaTransactionId, mayaPaymentId);
      } else {
        // Generic wallet deposit
        transaction = await storage.createWalletTransaction({
          walletId: wallet.id,
          type: 'wallet_deposit',
          paymentMethod: paymentMethod || 'cash',
          amount: amount.toString(),
          description: `Wallet deposit via ${paymentMethod}`,
          status: 'completed'
        });
      }

      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error processing wallet deposit:", error);
      res.status(500).json({ error: "Failed to process wallet deposit" });
    }
  });

  app.post("/api/wallet/withdrawal", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { amount, paymentMethod, description } = req.body;
      
      const wallet = await storage.getWallet(req.user.id);
      if (!wallet) {
        return res.status(400).json({ error: "No wallet found" });
      }

      // Check if sufficient balance
      const currentBalance = parseFloat(wallet.balance.toString());
      if (currentBalance < amount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      const transaction = await storage.createWalletTransaction({
        walletId: wallet.id,
        type: 'wallet_withdrawal',
        paymentMethod: paymentMethod || 'cash',
        amount: amount.toString(),
        description: description || `Wallet withdrawal via ${paymentMethod}`,
        status: 'pending' // Withdrawals need approval
      });

      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error processing wallet withdrawal:", error);
      res.status(500).json({ error: "Failed to process wallet withdrawal" });
    }
  });

  // Rider cash collection endpoint
  app.post("/api/wallet/cash-collection", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'rider') {
      return res.status(401).json({ error: "Unauthorized - Riders only" });
    }

    try {
      const { amount, description, orderId } = req.body;
      
      const wallet = await storage.getWallet(req.user.id);
      if (!wallet) {
        return res.status(400).json({ error: "No wallet found" });
      }

      const transaction = await storage.createWalletTransaction({
        walletId: wallet.id,
        orderId,
        type: 'cash_collection',
        paymentMethod: 'cash',
        amount: amount.toString(),
        description,
        cashHandledBy: req.user.id,
        status: 'completed'
      });

      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error processing cash collection:", error);
      res.status(500).json({ error: "Failed to process cash collection" });
    }
  });

  // Admin wallet management
  app.get("/api/admin/wallet-transactions", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      // Get all wallet transactions for admin overview
      const transactions = await db.query.walletTransactions.findMany({
        with: {
          wallet: {
            with: {
              user: true
            }
          }
        },
        orderBy: desc(walletTransactions.createdAt),
        limit: 100 // Limit for performance
      });

      res.json(transactions);
    } catch (error) {
      console.error("Error fetching admin wallet transactions:", error);
      res.status(500).json({ error: "Failed to fetch wallet transactions" });
    }
  });

  app.patch("/api/admin/wallet-transaction/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { status } = req.body;
      
      const transaction = await storage.updateWalletTransaction(req.params.id, { status });
      res.json(transaction);
    } catch (error) {
      console.error("Error updating wallet transaction:", error);
      res.status(500).json({ error: "Failed to update wallet transaction" });
    }
  });

  // Rider Profile Route
  app.get("/api/rider/profile", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'rider') {
      return res.status(401).json({ error: "Unauthorized - Riders only" });
    }

    try {
      const rider = await storage.getRiderByUserId(req.user.id);
      if (!rider) {
        return res.status(404).json({ error: "Rider profile not found" });
      }

      res.json(rider);
    } catch (error) {
      console.error("Error fetching rider profile:", error);
      res.status(500).json({ error: "Failed to fetch rider profile" });
    }
  });

  // Rider Document Upload Routes
  app.post("/api/rider/upload-documents", 
    upload.fields([
      { name: 'orcrDocument', maxCount: 1 },
      { name: 'motorImage', maxCount: 1 },
      { name: 'idDocument', maxCount: 1 }
    ]), 
    async (req, res) => {
      if (!req.isAuthenticated() || req.user.role !== 'rider') {
        return res.status(401).json({ error: "Unauthorized - Riders only" });
      }

      try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        // Get the rider record for this user
        const rider = await storage.getRiderByUserId(req.user.id);
        if (!rider) {
          return res.status(404).json({ error: "Rider profile not found" });
        }

        const documentUrls: { orcrDocument?: string; motorImage?: string; idDocument?: string } = {};

        // Process files that are already stored in object storage by multer
        for (const [fieldName, fileArray] of Object.entries(files)) {
          if (fileArray && fileArray.length > 0) {
            const file = fileArray[0];
            
            // Verify file was stored successfully in object storage
            if (!fs.existsSync(file.path)) {
              throw new Error(`File storage failed for ${fieldName}`);
            }
            
            // Get relative path for database storage
            const privateDir = process.env.PRIVATE_OBJECT_DIR;
            if (!privateDir) {
              throw new Error("Object storage not configured - PRIVATE_OBJECT_DIR missing");
            }
            
            const relativePath = path.relative(privateDir, file.path);
            
            // Store the relative path in the database
            documentUrls[fieldName as keyof typeof documentUrls] = relativePath;
            
            console.log(`Successfully stored ${fieldName} at ${file.path}`);
          }
        }

        // Update rider documents in database
        const updatedRider = await storage.updateRiderDocuments(rider.id, documentUrls);
        
        res.json({ 
          message: "Documents uploaded successfully", 
          rider: updatedRider,
          uploadedDocuments: Object.keys(documentUrls) 
        });
      } catch (error) {
        console.error("Error uploading rider documents:", error);
        res.status(500).json({ error: "Failed to upload documents" });
      }
    }
  );

  app.post("/api/rider/submit-documents", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'rider') {
      return res.status(401).json({ error: "Unauthorized - Riders only" });
    }

    try {
      const rider = await storage.getRiderByUserId(req.user.id);
      if (!rider) {
        return res.status(404).json({ error: "Rider profile not found" });
      }

      // Check if all required documents are uploaded
      if (!rider.orcrDocument || !rider.motorImage || !rider.idDocument) {
        return res.status(400).json({ 
          error: "All documents (OR/CR, Motor Image, ID) must be uploaded before submission",
          missingDocuments: {
            orcrDocument: !rider.orcrDocument,
            motorImage: !rider.motorImage,
            idDocument: !rider.idDocument
          }
        });
      }

      // Prevent duplicate submissions
      if (rider.documentsStatus === 'pending') {
        return res.status(400).json({ 
          error: "Documents are already under review" 
        });
      }

      const updatedRider = await storage.submitRiderDocuments(rider.id);
      
      res.json({ 
        message: "Documents submitted for review successfully", 
        rider: updatedRider,
        success: true
      });
    } catch (error) {
      console.error("Error submitting rider documents:", error);
      res.status(500).json({ error: "Failed to submit documents" });
    }
  });

  // Admin Document Review Routes
  app.get("/api/admin/riders-for-approval", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const riders = await storage.getRidersForApproval();
      
      // Include user information with each rider
      const ridersWithUsers = await Promise.all(
        riders.map(async (rider) => {
          const user = await storage.getUserById(rider.userId);
          return { ...rider, user };
        })
      );
      
      res.json(ridersWithUsers);
    } catch (error) {
      console.error("Error fetching riders for approval:", error);
      res.status(500).json({ error: "Failed to fetch riders for approval" });
    }
  });

  app.post("/api/admin/review-rider/:riderId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized - Admin access required" });
    }

    try {
      const { approved, reason } = req.body;
      const riderId = req.params.riderId;
      
      // Validate request body
      if (typeof approved !== 'boolean') {
        return res.status(400).json({ error: "Missing or invalid 'approved' field" });
      }
      
      if (!approved && (!reason || reason.trim().length === 0)) {
        return res.status(400).json({ error: "Rejection reason is required when rejecting documents" });
      }

      // Check if rider exists and is in correct state
      const rider = await storage.getRider(riderId);
      if (!rider) {
        return res.status(404).json({ error: "Rider not found" });
      }

      if (rider.documentsStatus !== 'pending') {
        return res.status(400).json({ 
          error: "Documents are not in pending state for review",
          currentStatus: rider.documentsStatus
        });
      }

      // Verify all documents are present
      if (!rider.orcrDocument || !rider.motorImage || !rider.idDocument) {
        return res.status(400).json({ 
          error: "Cannot review incomplete document set",
          missingDocuments: {
            orcrDocument: !rider.orcrDocument,
            motorImage: !rider.motorImage,
            idDocument: !rider.idDocument
          }
        });
      }
      
      const updatedRider = await storage.reviewRiderDocuments(
        riderId, 
        approved, 
        req.user.id, 
        approved ? null : reason.trim()
      );
      
      res.json({ 
        message: approved ? "Rider documents approved successfully" : "Rider documents rejected", 
        rider: updatedRider,
        success: true,
        action: approved ? 'approved' : 'rejected'
      });
    } catch (error) {
      console.error("Error reviewing rider documents:", error);
      res.status(500).json({ error: "Failed to review rider documents" });
    }
  });

  // Document download route for admins
  app.get("/api/admin/rider-document/:riderId/:documentType", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { riderId, documentType } = req.params;
      const rider = await storage.getRider(riderId);
      
      if (!rider) {
        return res.status(404).json({ error: "Rider not found" });
      }

      let documentPath: string | null = null;
      switch (documentType) {
        case 'orcr':
          documentPath = rider.orcrDocument;
          break;
        case 'motor':
          documentPath = rider.motorImage;
          break;
        case 'id':
          documentPath = rider.idDocument;
          break;
        default:
          return res.status(400).json({ error: "Invalid document type" });
      }

      if (!documentPath) {
        return res.status(404).json({ error: "Document not found" });
      }

      const privateDir = process.env.PRIVATE_OBJECT_DIR || `/replit-objstore-b6259f98-6469-493b-b487-aa05cc12270a/.private`;
      const fullPath = `${privateDir}/${documentPath}`;
      
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "Document file not found" });
      }

      res.sendFile(path.resolve(fullPath));
    } catch (error) {
      console.error("Error downloading rider document:", error);
      res.status(500).json({ error: "Failed to download document" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time features
  let wss: WebSocketServer;
  
  wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });

  wss.on('connection', (ws: ExtendedWebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different types of WebSocket messages
        switch (data.type) {
          case 'join_order':
            // Join order-specific room for chat and tracking
            ws.orderId = data.orderId;
            ws.userId = data.userId;
            ws.userRole = data.userRole;
            console.log(`User ${data.userId} (${data.userRole}) joined order ${data.orderId}`);
            break;

          case 'join_tracking':
            // Join for general order tracking updates
            ws.userId = data.userId;
            ws.userRole = data.userRole;
            console.log(`User ${data.userId} (${data.userRole}) joined tracking`);
            break;

          case 'chat_message':
            // Broadcast chat message to other clients in the same order
            wss.clients.forEach(client => {
              const extendedClient = client as ExtendedWebSocket;
              if (extendedClient !== ws && 
                  extendedClient.readyState === WebSocket.OPEN && 
                  extendedClient.orderId === data.orderId) {
                extendedClient.send(JSON.stringify({
                  ...data,
                  timestamp: new Date().toISOString()
                }));
              }
            });
            break;

          case 'rider_location_ping':
            // Handle rider location updates from client
            if (data.riderId && data.location) {
              // Broadcast to relevant clients (customers, admin, merchants)
              wss.clients.forEach(client => {
                const extendedClient = client as ExtendedWebSocket;
                if (extendedClient !== ws && 
                    extendedClient.readyState === WebSocket.OPEN &&
                    (extendedClient.userRole === 'admin' || 
                     extendedClient.userRole === 'customer' || 
                     extendedClient.userRole === 'merchant')) {
                  extendedClient.send(JSON.stringify({
                    type: 'rider_location_update',
                    riderId: data.riderId,
                    location: data.location,
                    timestamp: new Date().toISOString()
                  }));
                }
              });
            }
            break;

          case 'order_status_change':
            // Handle real-time order status updates
            wss.clients.forEach(client => {
              const extendedClient = client as ExtendedWebSocket;
              if (extendedClient !== ws && 
                  extendedClient.readyState === WebSocket.OPEN) {
                extendedClient.send(JSON.stringify({
                  ...data,
                  timestamp: new Date().toISOString()
                }));
              }
            });
            break;

          case 'location_update':
            // Legacy support - broadcast rider location updates
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  ...data,
                  timestamp: new Date().toISOString()
                }));
              }
            });
            break;

          default:
            console.log('Unknown WebSocket message type:', data.type);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      // Clean up any tracking data
      delete ws.orderId;
      delete ws.userId;
      delete ws.userRole;
    });
  });

  return httpServer;
}
