import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Send, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/lib/websocket";

interface ChatMessage {
  id: string;
  message: string;
  timestamp: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export default function ChatWidget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { socket, sendMessage } = useWebSocket();

  // Get active orders for chat
  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders"],
    enabled: isOpen,
  });

  // Get chat messages for selected order
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/orders", selectedOrderId, "chat"],
    enabled: isOpen && !!selectedOrderId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ orderId, message }: { orderId: string; message: string }) => {
      const response = await apiRequest("POST", `/api/orders/${orderId}/chat`, { message });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", selectedOrderId, "chat"] });
      setNewMessage("");
    },
  });

  // WebSocket message handling for real-time chat notifications
  useEffect(() => {
    if (socket && user) {
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'chat_message') {
            const { orderId, message } = data;
            
            // Refresh messages if chat is open for this order
            if (isOpen && orderId === selectedOrderId) {
              queryClient.invalidateQueries({ queryKey: ["/api/orders", selectedOrderId, "chat"] });
            }
            
            // Track unread messages if message is not from current user and chat is not viewing this order
            if (message?.sender?.id !== user.id && (!isOpen || orderId !== selectedOrderId)) {
              setUnreadMessages(prev => ({
                ...prev,
                [orderId]: (prev[orderId] || 0) + 1
              }));
            }
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      socket.addEventListener('message', handleMessage);
      return () => socket.removeEventListener('message', handleMessage);
    }
  }, [socket, isOpen, selectedOrderId, queryClient, user]);

  // Join order room when order is selected and clear unread messages for that order
  useEffect(() => {
    if (socket && selectedOrderId) {
      sendMessage({
        type: 'join_order',
        orderId: selectedOrderId,
      });
      
      // Clear unread messages for this order
      setUnreadMessages(prev => {
        const updated = { ...prev };
        delete updated[selectedOrderId];
        return updated;
      });
    }
  }, [socket, selectedOrderId, sendMessage]);
  
  // Clear unread messages for selected order when widget is opened
  useEffect(() => {
    if (isOpen && selectedOrderId) {
      setUnreadMessages(prev => {
        const updated = { ...prev };
        delete updated[selectedOrderId];
        return updated;
      });
    }
  }, [isOpen, selectedOrderId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const chatableOrders = orders.filter((order: any) => 
    ['accepted', 'preparing', 'ready', 'picked_up'].includes(order.status)
  );
  
  // Calculate total unread messages across all orders
  const totalUnread = Object.values(unreadMessages).reduce((sum, count) => sum + count, 0);

  const handleSendMessage = () => {
    if (!selectedOrderId || !newMessage.trim()) return;

    sendMessageMutation.mutate({
      orderId: selectedOrderId,
      message: newMessage.trim(),
    });

    // Also send via WebSocket for real-time updates
    if (socket) {
      sendMessage({
        type: 'chat_message',
        orderId: selectedOrderId,
        message: newMessage.trim(),
        senderId: user?.id,
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          <Button
            size="lg"
            className="w-14 h-14 rounded-full shadow-lg"
            onClick={() => setIsOpen(true)}
            data-testid="button-open-chat"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          {totalUnread > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-6 min-w-6 flex items-center justify-center rounded-full bg-red-500 text-white px-2"
              data-testid="badge-unread-count"
            >
              {totalUnread > 99 ? '99+' : totalUnread}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="w-96 h-[500px] shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Order Chat</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Order Selector */}
          {chatableOrders.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Select Order:</label>
              <select
                value={selectedOrderId || ""}
                onChange={(e) => setSelectedOrderId(e.target.value || null)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                data-testid="select-order-chat"
              >
                <option value="">Choose an order...</option>
                {chatableOrders.map((order: any) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNumber} - {order.status.toUpperCase()}
                    {unreadMessages[order.id] ? ` (${unreadMessages[order.id]} new)` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0 flex flex-col h-[400px]">
          {!selectedOrderId ? (
            <div className="flex-1 flex items-center justify-center p-6">
              {chatableOrders.length === 0 ? (
                <div className="text-center">
                  <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No active orders to chat about</p>
                </div>
              ) : (
                <div className="text-center">
                  <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Select an order to start chatting</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start space-x-2 ${
                        message.sender.id === user?.id ? 'justify-end' : 'justify-start'
                      }`}
                      data-testid={`message-${message.id}`}
                    >
                      {message.sender.id !== user?.id && (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {message.sender.firstName[0]}{message.sender.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className={`max-w-xs ${message.sender.id === user?.id ? 'order-2' : 'order-1'}`}>
                        <div
                          className={`rounded-lg p-3 ${
                            message.sender.id === user?.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          <p className="text-sm">{message.message}</p>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <Badge variant="outline" className="text-xs">
                            {message.sender.role}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      {message.sender.id === user?.id && (
                        <Avatar className="w-8 h-8 order-3">
                          <AvatarFallback className="text-xs">
                            {user.firstName[0]}{user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-border p-4">
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                    data-testid="input-chat-message"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
