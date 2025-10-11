import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bike, Wallet, Clock, Star, MapPin, Phone, User, Upload, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/lib/websocket";

interface PendingOrder {
  id: string;
  orderNumber: string;
  total: string;
  customer: {
    name: string;
    address: string;
    phone: string;
  };
  restaurant: {
    name: string;
    address: string;
  };
  commission: string;
  markup: string;
  distance: string;
  createdAt: string;
}

export default function RiderPortal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [documentFiles, setDocumentFiles] = useState<{
    orcrDocument: File | null;
    motorImage: File | null; 
    idDocument: File | null;
  }>({
    orcrDocument: null,
    motorImage: null,
    idDocument: null,
  });
  const [isUpdatingDocuments, setIsUpdatingDocuments] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ["/api/wallet"],
  });

  const { data: myOrders = [] } = useQuery({
    queryKey: ["/api/orders"],
  });

  // Fetch rider profile for document status and rider status
  const { data: riderProfile } = useQuery({
    queryKey: ["/api/rider/profile"],
  });

  // Get rider status from profile, default to offline
  const riderStatus = riderProfile?.status || 'offline';
  const documentsStatus = riderProfile?.documentsStatus || 'incomplete';

  const { data: pendingOrders = [] } = useQuery({
    queryKey: ["/api/orders/pending"],
    enabled: documentsStatus === 'approved', // Only fetch if rider is approved
  });

  // WebSocket for real-time order updates
  const { socket, sendMessage } = useWebSocket();

  // Listen for real-time order updates
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
            case 'new_order':
              // New order created - refresh pending orders list
              queryClient.invalidateQueries({ queryKey: ["/api/orders/pending"] });
              toast({
                title: "New Order Available",
                description: `New order #${data.order.orderNumber || 'pending'} is ready for pickup!`,
              });
              break;
              
            case 'order_update':
              // Existing order updated - refresh both lists
              queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
              queryClient.invalidateQueries({ queryKey: ["/api/orders/pending"] });
              
              // Show toast for order status changes
              if (data.order && data.updatedBy) {
                const statusText = data.order.status === 'cancelled' 
                  ? 'cancelled by merchant' 
                  : data.order.status;
                
                toast({
                  title: "Order Status Updated",
                  description: `Order #${data.order.orderNumber} is now ${statusText}`,
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
  }, [socket, user, sendMessage, queryClient, toast]);

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}`, { status });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update order");
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/pending"] });
      
      const statusMessages: Record<string, string> = {
        'accepted': 'Order accepted successfully! It will appear in your Active Orders.',
        'preparing': 'Order marked as preparing',
        'ready': 'Order marked as ready for pickup',
        'picked_up': 'Order picked up successfully',
        'delivered': 'Order delivered successfully! Great job!',
        'cancelled': 'Order cancelled'
      };
      
      toast({
        title: "Order Updated",
        description: statusMessages[variables.status] || "Order status updated successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadDocumentsMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/rider/upload-documents", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/profile"] });
      setDocumentFiles({ orcrDocument: null, motorImage: null, idDocument: null });
      
      toast({
        title: "Documents Uploaded",
        description: `Successfully uploaded ${data.uploadedDocuments?.length || 0} document(s).`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload documents. Please try again.",
        variant: "destructive",
      });
    },
  });

  const submitDocumentsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/rider/submit-documents", {});
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Submission failed");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/profile"] });
      
      toast({
        title: "Documents Submitted",
        description: data.message || "Your documents have been submitted for review.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed", 
        description: error.message || "Failed to submit documents. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateDocumentsMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/rider/update-documents", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Update failed");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/profile"] });
      setDocumentFiles({ orcrDocument: null, motorImage: null, idDocument: null });
      setIsUpdatingDocuments(false);
      
      toast({
        title: "Documents Updated",
        description: data.message || "Your documents have been updated and are now under review. You have been taken offline.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update documents. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (newStatus: 'online' | 'offline') => {
      const response = await apiRequest("PATCH", "/api/rider/status", { status: newStatus });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to update status");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/profile"] });
      
      toast({
        title: "Status Updated",
        description: data.message || `You are now ${data.rider?.status || 'updated'}`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Status Update Failed",
        description: error.message || "Failed to update status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const acceptOrder = (orderId: string) => {
    updateOrderMutation.mutate({ orderId, status: 'accepted' });
  };

  const updateOrderStatus = (orderId: string, status: string) => {
    updateOrderMutation.mutate({ orderId, status });
  };

  const toggleStatus = () => {
    const newStatus = riderStatus === 'online' ? 'offline' : 'online';
    toggleStatusMutation.mutate(newStatus);
  };

  const handleFileChange = (documentType: keyof typeof documentFiles, file: File | null) => {
    setDocumentFiles(prev => ({
      ...prev,
      [documentType]: file
    }));
  };

  const handleUploadDocuments = () => {
    // Validate that at least one file is selected
    const hasFiles = documentFiles.orcrDocument || documentFiles.motorImage || documentFiles.idDocument;
    if (!hasFiles) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one document to upload.",
        variant: "destructive",
      });
      return;
    }

    // Validate file sizes (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = [];
    
    if (documentFiles.orcrDocument && documentFiles.orcrDocument.size > maxSize) {
      oversizedFiles.push("OR/CR Document");
    }
    if (documentFiles.motorImage && documentFiles.motorImage.size > maxSize) {
      oversizedFiles.push("Motor Image");
    }
    if (documentFiles.idDocument && documentFiles.idDocument.size > maxSize) {
      oversizedFiles.push("ID Document");
    }

    if (oversizedFiles.length > 0) {
      toast({
        title: "File Size Error",
        description: `These files exceed 10MB limit: ${oversizedFiles.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    
    if (documentFiles.orcrDocument) {
      formData.append('orcrDocument', documentFiles.orcrDocument);
    }
    if (documentFiles.motorImage) {
      formData.append('motorImage', documentFiles.motorImage);
    }
    if (documentFiles.idDocument) {
      formData.append('idDocument', documentFiles.idDocument);
    }

    uploadDocumentsMutation.mutate(formData);
  };

  const handleSubmitDocuments = () => {
    submitDocumentsMutation.mutate();
  };

  const handleStartUpdateDocuments = () => {
    setIsUpdatingDocuments(true);
    setDocumentFiles({ orcrDocument: null, motorImage: null, idDocument: null });
  };

  const handleCancelUpdateDocuments = () => {
    setIsUpdatingDocuments(false);
    setDocumentFiles({ orcrDocument: null, motorImage: null, idDocument: null });
  };

  const handleUpdateDocuments = () => {
    // Validate all three files are selected for update
    if (!documentFiles.orcrDocument || !documentFiles.motorImage || !documentFiles.idDocument) {
      toast({
        title: "All Documents Required",
        description: "You must upload all three documents (OR/CR, Motor Image, and Valid ID) to update.",
        variant: "destructive",
      });
      return;
    }

    // Validate file sizes (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = [];
    
    if (documentFiles.orcrDocument.size > maxSize) {
      oversizedFiles.push("OR/CR Document");
    }
    if (documentFiles.motorImage.size > maxSize) {
      oversizedFiles.push("Motor Image");
    }
    if (documentFiles.idDocument.size > maxSize) {
      oversizedFiles.push("ID Document");
    }

    if (oversizedFiles.length > 0) {
      toast({
        title: "File Size Error",
        description: `These files exceed 10MB limit: ${oversizedFiles.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('orcrDocument', documentFiles.orcrDocument);
    formData.append('motorImage', documentFiles.motorImage);
    formData.append('idDocument', documentFiles.idDocument);

    updateDocumentsMutation.mutate(formData);
  };

  const activeOrders = myOrders.filter((order: any) => 
    ['accepted', 'preparing', 'ready', 'picked_up'].includes(order.status)
  );

  const historicalOrders = myOrders.filter((order: any) => 
    ['delivered', 'cancelled'].includes(order.status)
  );

  const todayDeliveredOrders = historicalOrders.filter((order: any) => {
    if (order.status !== 'delivered') return false;
    const today = new Date().toDateString();
    const orderDate = new Date(order.createdAt).toDateString();
    return today === orderDate;
  });

  const todayEarnings = todayDeliveredOrders.reduce((sum: number, order: any) => {
    return sum + parseFloat(order.commission || '0') + parseFloat(order.markup || '0');
  }, 0);

  return (
    <div>
      {/* Rider Dashboard Header */}
      <section className="bg-card border-b border-border py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Rider Status */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={user?.profileImage} />
                  <AvatarFallback>
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-card ${
                  riderStatus === 'online' ? 'bg-green-500' : 'bg-gray-500'
                }`}></div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  {user?.firstName} {user?.lastName}
                </h3>
                <p className="text-muted-foreground">Bike Rider</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={riderStatus === 'online' ? 'default' : 'secondary'}>
                    {riderStatus === 'online' ? 'Online' : 'Offline'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">Rating: 4.9/5</span>
                </div>
              </div>
            </div>

            {/* Wallet Balance */}
            <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-4 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Wallet Balance</p>
                  <p className="text-2xl font-bold">
                    ₱{parseFloat(wallet?.balance || '0').toFixed(2)}
                  </p>
                </div>
                <Wallet className="text-2xl opacity-80" />
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                className="mt-2 bg-white bg-opacity-20 hover:bg-opacity-30"
                data-testid="button-top-up"
              >
                Top Up
              </Button>
            </div>

            {/* Status Toggle */}
            <div className="flex flex-col space-y-2">
              <Button
                variant={riderStatus === 'online' ? 'destructive' : 'default'}
                onClick={toggleStatus}
                disabled={riderStatus === 'offline' && documentsStatus !== 'approved'}
                data-testid="button-toggle-status"
              >
                {riderStatus === 'online' ? 'Go Offline' : 'Go Online'}
              </Button>
              {documentsStatus !== 'approved' && riderStatus === 'offline' && (
                <p className="text-xs text-destructive text-center">
                  {documentsStatus === 'incomplete' && 'Upload & submit documents to go online'}
                  {documentsStatus === 'pending' && 'Documents under review'}
                  {documentsStatus === 'rejected' && 'Documents rejected - Re-upload required'}
                </p>
              )}
              {riderStatus === 'online' && (
                <p className="text-sm text-muted-foreground text-center">
                  Active for 3h 24m
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-6 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary bg-opacity-10 p-3 rounded-lg">
                    <Bike className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Orders</p>
                    <p className="text-2xl font-bold text-foreground">{todayDeliveredOrders.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-secondary bg-opacity-10 p-3 rounded-lg">
                    <Wallet className="text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Earnings</p>
                    <p className="text-2xl font-bold text-foreground">₱{todayEarnings.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-yellow-500 bg-opacity-10 p-3 rounded-lg">
                    <Clock className="text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Delivery Time</p>
                    <p className="text-2xl font-bold text-foreground">28 min</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-500 bg-opacity-10 p-3 rounded-lg">
                    <Star className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold text-foreground">98%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Order Management */}
      <section className="py-6 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pending Orders 
                {pendingOrders.length > 0 && (
                  <Badge className="ml-2">{pendingOrders.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="active" data-testid="tab-active">
                Active Orders
                {activeOrders.length > 0 && (
                  <Badge className="ml-2">{activeOrders.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">Order History</TabsTrigger>
              <TabsTrigger value="documents" data-testid="tab-documents">
                <FileText className="w-4 h-4 mr-2" />
                Documents
                {riderProfile?.documentsStatus === 'pending' && (
                  <Badge variant="secondary" className="ml-2">Review</Badge>
                )}
                {riderProfile?.documentsStatus === 'approved' && (
                  <CheckCircle className="w-3 h-3 ml-2 text-green-500" />
                )}
                {riderProfile?.documentsStatus === 'rejected' && (
                  <XCircle className="w-3 h-3 ml-2 text-red-500" />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {documentsStatus !== 'approved' ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Documents Approval Required</h3>
                    <p className="text-muted-foreground mb-4">
                      {documentsStatus === 'incomplete' && 'Please upload and submit all required documents to access pending orders.'}
                      {documentsStatus === 'pending' && 'Your documents are currently under review by admin. You\'ll be able to see and accept orders once approved.'}
                      {documentsStatus === 'rejected' && 'Your documents were rejected. Please re-upload the required documents to access pending orders.'}
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => document.querySelector('[data-testid="tab-documents"]')?.click()}
                      data-testid="button-go-to-documents"
                    >
                      Go to Documents
                    </Button>
                  </CardContent>
                </Card>
              ) : pendingOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No pending orders available</p>
                  </CardContent>
                </Card>
              ) : (
                pendingOrders.map((order: PendingOrder) => (
                  <Card key={order.id} data-testid={`pending-order-${order.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-primary bg-opacity-10 p-2 rounded-lg">
                            <Clock className="text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{order.orderNumber}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">₱{order.total}</p>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h5 className="font-medium text-foreground mb-2">Customer Details</h5>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <User className="mr-2 h-4 w-4" />
                              {order.customer.name}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="mr-2 h-4 w-4" />
                              {order.customer.address}
                            </div>
                            <div className="flex items-center">
                              <Phone className="mr-2 h-4 w-4" />
                              {order.customer.phone}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-foreground mb-2">Pickup Location</h5>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>{order.restaurant.name}</p>
                            <p>{order.restaurant.address}</p>
                            <p>Distance: {order.distance}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-muted-foreground">
                            Commission: <span className="font-medium text-foreground">₱{order.commission}</span>
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Markup: <span className="font-medium text-foreground">₱{order.markup}</span>
                          </span>
                        </div>
                        <div>
                          <Button 
                            onClick={() => acceptOrder(order.id)}
                            disabled={updateOrderMutation.isPending}
                            data-testid={`button-accept-${order.id}`}
                          >
                            Accept Order
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              {activeOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No active orders</p>
                  </CardContent>
                </Card>
              ) : (
                activeOrders.map((order: any) => (
                  <Card key={order.id} data-testid={`active-order-${order.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-foreground">{order.orderNumber}</h4>
                          <Badge 
                            variant={order.status === 'delivered' ? 'default' : 'secondary'}
                          >
                            {order.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex space-x-2">
                          {order.status === 'accepted' && (
                            <Button 
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'picked_up')}
                              data-testid={`button-pickup-${order.id}`}
                            >
                              Picked Up
                            </Button>
                          )}
                          {order.status === 'picked_up' && (
                            <Button 
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                              data-testid={`button-delivered-${order.id}`}
                            >
                              Delivered
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total: ₱{order.total}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {historicalOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No order history yet</p>
                  </CardContent>
                </Card>
              ) : (
                historicalOrders.map((order: any) => (
                  <Card key={order.id} data-testid={`history-order-${order.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-foreground">{order.orderNumber}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-foreground">₱{order.total}</p>
                          <Badge variant="default">Delivered</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              {/* Document Status Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Document Verification Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Current Status:</p>
                      <div className="flex items-center mt-1">
                        {riderProfile?.documentsStatus === 'pending' && (
                          <>
                            <Clock className="w-4 h-4 text-yellow-500 mr-2" />
                            <Badge variant="secondary">Under Review</Badge>
                          </>
                        )}
                        {riderProfile?.documentsStatus === 'approved' && (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                            <Badge variant="default" className="bg-green-500">Approved</Badge>
                          </>
                        )}
                        {riderProfile?.documentsStatus === 'rejected' && (
                          <>
                            <XCircle className="w-4 h-4 text-red-500 mr-2" />
                            <Badge variant="destructive">Rejected</Badge>
                          </>
                        )}
                        {(!riderProfile?.documentsStatus || riderProfile?.documentsStatus === 'incomplete') && (
                          <>
                            <Upload className="w-4 h-4 text-blue-500 mr-2" />
                            <Badge variant="outline">Documents Required</Badge>
                          </>
                        )}
                      </div>
                    </div>
                    {riderProfile?.documentsReviewedAt && (
                      <div className="text-right text-sm text-muted-foreground">
                        <p>Reviewed: {new Date(riderProfile.documentsReviewedAt).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                  {riderProfile?.rejectedReason && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        <strong>Rejection Reason:</strong> {riderProfile.rejectedReason}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Document Upload Section */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* OR/CR Document */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">OR/CR Document</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Upload your Official Receipt/Certificate of Registration
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {riderProfile?.orcrDocument && documentsStatus !== 'rejected' && documentsStatus !== 'incomplete' && !isUpdatingDocuments ? (
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">Document uploaded</span>
                          </div>
                          {documentsStatus === 'pending' && (
                            <p className="text-xs text-muted-foreground">Under admin review</p>
                          )}
                          {documentsStatus === 'approved' && (
                            <p className="text-xs text-green-600">Verified</p>
                          )}
                        </div>
                      ) : (
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => handleFileChange('orcrDocument', e.target.files?.[0] || null)}
                          disabled={(documentsStatus === 'pending' || (documentsStatus === 'approved' && !isUpdatingDocuments))}
                          className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid="input-orcr-document"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Motor Image */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Motor Image</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Upload a clear photo of your motorcycle
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {riderProfile?.motorImage && documentsStatus !== 'rejected' && documentsStatus !== 'incomplete' && !isUpdatingDocuments ? (
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">Image uploaded</span>
                          </div>
                          {documentsStatus === 'pending' && (
                            <p className="text-xs text-muted-foreground">Under admin review</p>
                          )}
                          {documentsStatus === 'approved' && (
                            <p className="text-xs text-green-600">Verified</p>
                          )}
                        </div>
                      ) : (
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('motorImage', e.target.files?.[0] || null)}
                          disabled={(documentsStatus === 'pending' || (documentsStatus === 'approved' && !isUpdatingDocuments))}
                          className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid="input-motor-image"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* ID Document */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Valid ID</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Upload a government-issued ID (Driver's License, etc.)
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {riderProfile?.idDocument && documentsStatus !== 'rejected' && documentsStatus !== 'incomplete' && !isUpdatingDocuments ? (
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">ID uploaded</span>
                          </div>
                          {documentsStatus === 'pending' && (
                            <p className="text-xs text-muted-foreground">Under admin review</p>
                          )}
                          {documentsStatus === 'approved' && (
                            <p className="text-xs text-green-600">Verified</p>
                          )}
                        </div>
                      ) : (
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => handleFileChange('idDocument', e.target.files?.[0] || null)}
                          disabled={(documentsStatus === 'pending' || (documentsStatus === 'approved' && !isUpdatingDocuments))}
                          className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid="input-id-document"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              {(documentsStatus === 'incomplete' || documentsStatus === 'rejected') && (
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Upload Button */}
                  <Button
                    onClick={handleUploadDocuments}
                    disabled={uploadDocumentsMutation.isPending || 
                      (!documentFiles.orcrDocument && !documentFiles.motorImage && !documentFiles.idDocument)}
                    className="flex-1"
                    data-testid="button-upload-documents"
                  >
                    {uploadDocumentsMutation.isPending ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Documents
                      </>
                    )}
                  </Button>

                  {/* Submit for Review Button - Only show when all documents are uploaded */}
                  {riderProfile?.orcrDocument && riderProfile?.motorImage && riderProfile?.idDocument && (
                    <Button
                      onClick={handleSubmitDocuments}
                      disabled={submitDocumentsMutation.isPending}
                      variant="secondary"
                      className="flex-1"
                      data-testid="button-submit-documents"
                    >
                      {submitDocumentsMutation.isPending ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Submit for Review
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* Update Documents Button - Show when approved and not in update mode */}
              {documentsStatus === 'approved' && !isUpdatingDocuments && (
                <div className="flex flex-col gap-4">
                  <Button
                    onClick={handleStartUpdateDocuments}
                    variant="outline"
                    className="w-full"
                    data-testid="button-start-update-documents"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Update Documents
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    Need to update your documents? (e.g., expired license, new vehicle) Click above to replace all documents.
                  </p>
                </div>
              )}

              {/* Update Mode Buttons - Show when in update mode */}
              {isUpdatingDocuments && (
                <div>
                  <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 mb-4">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Upload className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-900 dark:text-blue-100">Document Update Mode</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            You must upload all three documents. After updating, your account will be set to 'Under Review' and you'll be taken offline until admin re-approves.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      onClick={handleUpdateDocuments}
                      disabled={updateDocumentsMutation.isPending || 
                        !documentFiles.orcrDocument || !documentFiles.motorImage || !documentFiles.idDocument}
                      className="flex-1"
                      data-testid="button-confirm-update-documents"
                    >
                      {updateDocumentsMutation.isPending ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Update & Submit for Review
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCancelUpdateDocuments}
                      disabled={updateDocumentsMutation.isPending}
                      variant="outline"
                      className="flex-1"
                      data-testid="button-cancel-update-documents"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Status message for pending/approved states */}
              {documentsStatus === 'pending' && (
                <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-900 dark:text-yellow-100">Documents Under Review</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Your documents are being reviewed by admin. You'll be notified once the review is complete.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {documentsStatus === 'approved' && (
                <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100">Documents Approved!</p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Your documents have been verified. You can now go online and start accepting orders.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Help Text */}
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <h4 className="font-medium text-foreground">Document Requirements:</h4>
                    <ul className="space-y-1 ml-4">
                      <li>• All documents must be clear and readable</li>
                      <li>• Accepted formats: JPEG, PNG, PDF</li>
                      <li>• Maximum file size: 10MB per document</li>
                      <li>• All three documents are required before submission</li>
                      <li>• Documents will be reviewed within 24-48 hours</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
