import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";

interface ExtendedWebSocket extends WebSocket {
  orderId?: string;
}
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertRestaurantSchema, insertMenuItemSchema, insertOrderSchema, insertChatMessageSchema, insertRiderSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

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
      const order = await storage.updateOrder(req.params.id, req.body);
      
      if (order && wss) {
        // Broadcast order update via WebSocket
        const message = JSON.stringify({
          type: 'order_update',
          order
        });
        
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
      
      res.json(order);
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
            // Join order-specific room for chat
            ws.orderId = data.orderId;
            break;
          case 'chat_message':
            // Broadcast chat message to other clients in the same order
            wss.clients.forEach(client => {
              const extendedClient = client as ExtendedWebSocket;
              if (extendedClient !== ws && 
                  extendedClient.readyState === WebSocket.OPEN && 
                  extendedClient.orderId === data.orderId) {
                extendedClient.send(JSON.stringify(data));
              }
            });
            break;
          case 'location_update':
            // Broadcast rider location updates
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
              }
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}
