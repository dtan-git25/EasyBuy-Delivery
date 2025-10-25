import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Bike, Wallet, Clock, Star, MapPin, Phone, User, Upload, FileText, CheckCircle, XCircle, AlertCircle, Map, Users, Download, Eye, Package, DollarSign, ClipboardList, History } from "lucide-react";
import { apiRequest, queryClient as globalQueryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/lib/websocket";
import { Input } from "@/components/ui/input";
import { LocationMapViewer } from "@/components/location-map-viewer";

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
  // Multi-merchant group order fields
  orderGroupId?: string | null;
  merchantCount?: number;
  restaurants?: Array<{ id: string; name: string; address: string }>;
}

// Compact inline rating display for profile headers
function InlineRiderRating({ riderId }: { riderId?: string }) {
  const { data: ratingData } = useQuery<{ average: { average: number; count: number } }>({
    queryKey: ["/api/ratings/rider", riderId],
    enabled: !!riderId,
    queryFn: async () => {
      if (!riderId) return { average: { average: 0, count: 0 } };
      const response = await fetch(`/api/ratings/rider/${riderId}`);
      return response.json();
    },
  });

  const avgRating = ratingData?.average?.average || 0;
  const count = ratingData?.average?.count || 0;

  if (count === 0) {
    return <span className="text-sm text-muted-foreground">★ No ratings yet</span>;
  }

  return (
    <span className="text-sm text-muted-foreground">
      ★ {avgRating.toFixed(1)} ({count} {count === 1 ? 'rating' : 'ratings'})
    </span>
  );
}

// Full rating display for account settings tab
function RiderRatingDisplay({ riderId }: { riderId?: string }) {
  const { data: ratingData } = useQuery<{ average: { average: number; count: number }; ratings: any[] }>({
    queryKey: ["/api/ratings/rider", riderId],
    enabled: !!riderId,
    queryFn: async () => {
      if (!riderId) return { average: { average: 0, count: 0 }, ratings: [] };
      const response = await fetch(`/api/ratings/rider/${riderId}`);
      return response.json();
    },
  });

  const avgRating = ratingData?.average?.average || 0;
  const count = ratingData?.average?.count || 0;
  const ratings = ratingData?.ratings || [];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Customer Ratings</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-muted-foreground">Average Rating</label>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= avgRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-base font-medium">
              {avgRating > 0 ? avgRating.toFixed(1) : "No ratings yet"}
            </span>
          </div>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Total Reviews</label>
          <p className="text-base font-medium mt-1" data-testid="text-rating-count">
            {count} {count === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      </div>
      {ratings.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Recent Reviews</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {ratings.slice(0, 5).map((rating: any) => (
              <div key={rating.id} className="border rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${
                          star <= (rating.riderRating || 0)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(rating.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {rating.riderComment && (
                  <p className="text-muted-foreground">{rating.riderComment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedEmail, setEditedEmail] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const [isDocumentsDialogOpen, setIsDocumentsDialogOpen] = useState(false);
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);
  const [showMapViewer, setShowMapViewer] = useState(false);
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<any | null>(null);
  const [mapLocationType, setMapLocationType] = useState<'delivery' | 'pickup'>('delivery');

  const { data: wallet } = useQuery({
    queryKey: ["/api/wallet"],
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
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
              
            case 'new_order_group':
              // Multi-merchant order group created - refresh pending orders list
              queryClient.invalidateQueries({ queryKey: ["/api/orders/pending"] });
              queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
              
              const merchantCount = data.merchantCount || (data.orders?.length) || 'multiple';
              toast({
                title: "New Multi-Merchant Order Available",
                description: `New order group with ${merchantCount} restaurants is ready for pickup!`,
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

            case 'chat_message':
              // Show toast notification for new chat messages
              if (data.message?.sender?.id !== user.id) {
                const senderName = data.message?.sender ? 
                  `${data.message.sender.firstName} ${data.message.sender.lastName}` : 
                  'Someone';
                toast({
                  title: `New message from ${senderName}`,
                  description: data.message?.message || '',
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

  // Update rider profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { email?: string; phone?: string }) => {
      try {
        const response = await apiRequest("PATCH", "/api/rider/profile", data);
        const result = await response.json();
        return result;
      } catch (error) {
        console.error("Mutation function error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      setIsEditingProfile(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      console.error("Profile update error:", error);
      toast({
        title: "Error updating profile",
        description: error.message || "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Initialize profile edit form when entering edit mode
  useEffect(() => {
    if (isEditingProfile && user) {
      setEditedEmail(user.email || "");
      setEditedPhone(user.phone || "");
    }
  }, [isEditingProfile, user]);

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

  // Filter active orders - for multi-merchant orders, check if ANY merchant order is still active
  const activeOrders = myOrders.filter((order: any) => {
    // For multi-merchant orders, check if ANY merchant order is still active
    if (order.isGroup && order.merchantOrders && order.merchantOrders.length > 0) {
      return order.merchantOrders.some((mo: any) => 
        ['accepted', 'preparing', 'ready', 'picked_up'].includes(mo.status)
      );
    }
    // For single orders, use the regular status check
    return ['accepted', 'preparing', 'ready', 'picked_up'].includes(order.status);
  });

  // Filter historical orders - for multi-merchant orders, check if ALL merchant orders are delivered/cancelled
  const historicalOrders = myOrders.filter((order: any) => {
    // For multi-merchant orders, check if ALL merchant orders are delivered/cancelled
    if (order.isGroup && order.merchantOrders && order.merchantOrders.length > 0) {
      return order.merchantOrders.every((mo: any) => 
        ['delivered', 'cancelled'].includes(mo.status)
      );
    }
    // For single orders, use the regular status check
    return ['delivered', 'cancelled'].includes(order.status);
  });

  // Calculate booking limit status
  const maxBookingLimit = (settings as any)?.maxMultipleOrderBooking || 0;
  const activeCustomerOrders = activeOrders.filter((order: any) => 
    order.status === 'accepted' || order.status === 'picked_up'
  );
  
  // Separate single-merchant and multi-merchant orders
  const multiMerchantOrders = activeCustomerOrders.filter((order: any) => order.orderGroupId);
  const singleMerchantOrders = activeCustomerOrders.filter((order: any) => !order.orderGroupId);
  
  // Calculate unique customers for single-merchant orders only
  const uniqueCustomers = new Set(singleMerchantOrders.map((order: any) => order.customerId));
  const activeCustomerCount = uniqueCustomers.size;
  
  // Determine booking restriction status
  const hasMultiMerchantOrder = multiMerchantOrders.length > 0;
  const hasSingleMerchantOrders = singleMerchantOrders.length > 0;
  const isBookingLimitReached = maxBookingLimit > 0 && activeCustomerCount >= maxBookingLimit && !hasMultiMerchantOrder;
  
  // Get booking restriction message
  let bookingRestrictionMessage = '';
  let bookingRestrictionTitle = '';
  if (hasMultiMerchantOrder) {
    bookingRestrictionTitle = 'Multi-Merchant Order Active';
    bookingRestrictionMessage = 'Complete your multi-merchant order before accepting new orders.';
  } else if (isBookingLimitReached) {
    bookingRestrictionTitle = 'Booking Limit Reached';
    bookingRestrictionMessage = `Complete your ${activeCustomerCount} active order(s) before accepting more. The admin has set a limit of ${maxBookingLimit} simultaneous order(s) from different customers.`;
  }
  
  const hasBookingRestriction = hasMultiMerchantOrder || isBookingLimitReached;

  // Today's delivered orders (using completedAt to check when order was completed)
  const todayDeliveredOrders = historicalOrders.filter((order: any) => {
    // For multi-merchant orders, check if ALL merchant orders are delivered
    let isDelivered = false;
    if (order.isGroup && order.merchantOrders && order.merchantOrders.length > 0) {
      isDelivered = order.merchantOrders.every((mo: any) => mo.status === 'delivered');
    } else {
      isDelivered = order.status === 'delivered';
    }
    
    if (!isDelivered || !order.completedAt) return false;
    
    // Use local date comparison to avoid timezone issues
    const now = new Date();
    const completedDate = new Date(order.completedAt);
    
    return (
      now.getFullYear() === completedDate.getFullYear() &&
      now.getMonth() === completedDate.getMonth() &&
      now.getDate() === completedDate.getDate()
    );
  });

  // Today's earnings (rider commission from delivered orders)
  // Commission already includes the rider's share of (deliveryFee + markup)
  const todayEarnings = todayDeliveredOrders.reduce((sum: number, order: any) => {
    const commission = parseFloat(order.commission || '0');
    return sum + commission;
  }, 0);

  // Success rate calculation: (delivered orders / total non-cancelled orders) × 100%
  // This gives the percentage of orders successfully delivered vs all orders accepted/attempted
  const totalNonCancelledOrders = myOrders.filter((order: any) => {
    // For multi-merchant orders, check if NOT all cancelled
    if (order.isGroup && order.merchantOrders && order.merchantOrders.length > 0) {
      return !order.merchantOrders.every((mo: any) => mo.status === 'cancelled' || mo.status === 'pending');
    }
    return order.status !== 'cancelled' && order.status !== 'pending';
  }).length;
  
  const deliveredOrders = myOrders.filter((order: any) => {
    // For multi-merchant orders, check if ALL delivered
    if (order.isGroup && order.merchantOrders && order.merchantOrders.length > 0) {
      return order.merchantOrders.every((mo: any) => mo.status === 'delivered');
    }
    return order.status === 'delivered';
  }).length;
  
  const successRate = totalNonCancelledOrders > 0 
    ? Math.round((deliveredOrders / totalNonCancelledOrders) * 100) 
    : 0;

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
                  <InlineRiderRating riderId={user?.id} />
                </div>
              </div>
            </div>

            {/* Wallet Balance - Only show if wallet system is enabled */}
            {(settings as any)?.enableWalletSystem && (
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
            )}

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card data-testid="card-today-orders">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-500 bg-opacity-10 p-3 rounded-lg">
                    <Package className="text-blue-600 h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Orders</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-today-orders">{todayDeliveredOrders.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-today-earnings">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-500 bg-opacity-10 p-3 rounded-lg">
                    <DollarSign className="text-green-600 h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Earnings</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-today-earnings">₱{todayEarnings.toFixed(2)}</p>
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
                    <p className="text-2xl font-bold text-foreground" data-testid="text-success-rate">{successRate}%</p>
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="pending" data-testid="tab-pending">
                <ClipboardList className="w-4 h-4 mr-2" />
                Pending Orders 
                {pendingOrders.length > 0 && (
                  <Badge className="ml-2">{pendingOrders.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="active" data-testid="tab-active">
                <Package className="w-4 h-4 mr-2" />
                Active Orders
                {activeOrders.length > 0 && (
                  <Badge className="ml-2">{activeOrders.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">
                <History className="w-4 h-4 mr-2" />
                Order History
              </TabsTrigger>
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
              <TabsTrigger value="profile" data-testid="tab-profile">
                <Users className="w-4 h-4 mr-2" />
                My Account
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
              ) : hasBookingRestriction ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-orange-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{bookingRestrictionTitle}</h3>
                    <p className="text-muted-foreground">
                      {bookingRestrictionMessage}
                    </p>
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
                            {order.orderGroupId && order.merchantCount && order.merchantCount > 1 && (
                              <Badge variant="secondary" className="mt-1">
                                Multi-Merchant ({order.merchantCount} stores)
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">₱{order.total}</p>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm">
                          <User className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Customer:</span>
                          <span className="ml-2 font-medium text-foreground">{order.customer.name}</span>
                        </div>
                        
                        {order.orderGroupId && order.restaurants && order.restaurants.length > 1 ? (
                          <div className="flex items-start text-sm">
                            <MapPin className="mr-2 h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <span className="text-muted-foreground">Pickup Stores:</span>
                              <div className="ml-2 mt-1 space-y-1">
                                {order.restaurants.map((restaurant) => (
                                  <div key={restaurant.id} className="flex items-center">
                                    <span className="text-xs text-primary mr-1">•</span>
                                    <span className="font-medium text-foreground">{restaurant.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center text-sm">
                            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Store:</span>
                            <span className="ml-2 font-medium text-foreground">{order.restaurant.name}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Button 
                          onClick={() => acceptOrder(order.orderGroupId || order.id)}
                          disabled={updateOrderMutation.isPending}
                          data-testid={`button-accept-${order.id}`}
                        >
                          Accept {order.orderGroupId && order.merchantCount && order.merchantCount > 1 ? 'Group' : 'Order'}
                        </Button>
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
                activeOrders.map((order: any) => {
                  // Check if this is a grouped order
                  const isGroupedOrder = order.merchantOrders && order.merchantOrders.length > 0;
                  
                  const orderItems = order.items as Array<{ name: string; quantity: number; price: string }>;
                  const markup = parseFloat(order.markup) || 0;
                  const subtotal = parseFloat(order.subtotal) || 0;
                  const deliveryFee = parseFloat(order.deliveryFee) || 0;
                  const convenienceFee = parseFloat(order.convenienceFee || '0');
                  const rawCommission = (settings as any)?.riderCommissionPercentage;
                  const commissionPercentage = (rawCommission ?? 70) / 100;
                  
                  // Calculate rider earnings with rounded markup portion
                  const deliveryFeeCommission = deliveryFee * commissionPercentage;
                  const markupCommission = Math.round(markup * commissionPercentage);
                  const riderEarnings = (deliveryFeeCommission + markupCommission).toFixed(2);

                  return (
                    <Card key={order.id} data-testid={`active-order-${order.id}`}>
                      <CardContent className="p-6 space-y-4">
                        {/* Header with Order Number and Status */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-lg text-foreground">{order.orderNumber}</h4>
                            <Badge 
                              variant={order.status === 'delivered' ? 'default' : 'secondary'}
                              className="mt-1"
                            >
                              {order.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </div>

                        <Separator />

                        {/* Customer Details */}
                        <div>
                          <h5 className="font-semibold text-foreground mb-2">Customer Details</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Customer Name:</span>
                              <span className="font-medium">{order.customerName}</span>
                            </div>
                            <div className="flex justify-between items-start">
                              <span className="text-muted-foreground">Delivery Address:</span>
                              <div className="flex items-center gap-2 flex-1 justify-end">
                                <span className="font-medium text-right">{order.deliveryAddress}</span>
                                {order.deliveryLatitude && order.deliveryLongitude && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 shrink-0"
                                    onClick={() => {
                                      setSelectedOrderForMap(order);
                                      setMapLocationType('delivery');
                                      setShowMapViewer(true);
                                    }}
                                    data-testid={`button-view-pin-${order.id}`}
                                    title="View on map"
                                  >
                                    <MapPin className="h-4 w-4 text-primary" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            {isGroupedOrder ? (
                              <div className="space-y-2">
                                <span className="text-muted-foreground text-sm">Pickup Locations:</span>
                                <div className="space-y-2 ml-2">
                                  {order.merchantOrders.map((merchantOrder: any) => (
                                    <div key={merchantOrder.id} className="border-l-2 border-primary pl-3 py-1">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          <p className="font-semibold text-sm text-foreground">{merchantOrder.restaurantName}</p>
                                          <div className="flex items-start gap-2 mt-1">
                                            <span className="font-medium text-sm text-muted-foreground">{merchantOrder.restaurantAddress}</span>
                                            {merchantOrder.restaurantLatitude && merchantOrder.restaurantLongitude && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 shrink-0"
                                                onClick={() => {
                                                  setSelectedOrderForMap({
                                                    id: merchantOrder.id,
                                                    orderNumber: merchantOrder.orderNumber,
                                                    restaurantLatitude: merchantOrder.restaurantLatitude,
                                                    restaurantLongitude: merchantOrder.restaurantLongitude,
                                                    restaurantName: merchantOrder.restaurantName,
                                                    restaurantAddress: merchantOrder.restaurantAddress,
                                                    deliveryLatitude: order.deliveryLatitude,
                                                    deliveryLongitude: order.deliveryLongitude,
                                                    deliveryAddress: order.deliveryAddress
                                                  });
                                                  setMapLocationType('pickup');
                                                  setShowMapViewer(true);
                                                }}
                                                data-testid={`button-view-pin-pickup-${merchantOrder.id}`}
                                                title="View on map"
                                              >
                                                <MapPin className="h-4 w-4 text-green-600" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-start">
                                <span className="text-muted-foreground">Pickup Location:</span>
                                <div className="flex items-center gap-2 flex-1 justify-end">
                                  <span className="font-medium text-right">{order.restaurantAddress}</span>
                                  {order.restaurantLatitude && order.restaurantLongitude && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 shrink-0"
                                      onClick={() => {
                                        setSelectedOrderForMap(order);
                                        setMapLocationType('pickup');
                                        setShowMapViewer(true);
                                      }}
                                      data-testid={`button-view-pin-pickup-${order.id}`}
                                      title="View on map"
                                    >
                                      <MapPin className="h-4 w-4 text-green-600" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Payment Method:</span>
                              <span className="font-medium capitalize">{order.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Contact:</span>
                              <a href={`tel:${order.customerPhone}`} className="text-primary hover:underline font-medium">
                                {order.customerPhone}
                              </a>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Order Items - Show merchant orders for grouped orders */}
                        {isGroupedOrder ? (
                          <div>
                            <h5 className="font-semibold text-foreground mb-3">
                              Multi-Merchant Order ({order.merchantOrders.length} stores)
                            </h5>
                            <div className="space-y-4">
                              {order.merchantOrders.map((merchantOrder: any, idx: number) => (
                                <div key={merchantOrder.id} className="border rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h6 className="font-medium text-foreground">{merchantOrder.restaurantName}</h6>
                                    <Badge variant="secondary" className="text-xs">
                                      {merchantOrder.status.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    {merchantOrder.items.map((item: any, itemIdx: number) => (
                                      <div key={itemIdx} className="flex justify-between text-muted-foreground">
                                        <span>{item.name} x{item.quantity}</span>
                                        <span>₱{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2 pt-2 border-t flex justify-between items-center">
                                    <span className="text-sm font-medium">Subtotal:</span>
                                    <span className="font-semibold">₱{merchantOrder.total}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h5 className="font-semibold text-foreground mb-2">Order from: {order.restaurantName}</h5>
                            <div className="space-y-1 text-sm">
                              {orderItems.map((item, index) => {
                                const markedUpPrice = parseFloat(item.price) * (1 + (markup / subtotal));
                                return (
                                  <div key={index} className="flex justify-between">
                                    <span>{item.name} x{item.quantity}</span>
                                    <span>₱{(markedUpPrice * item.quantity).toFixed(2)}</span>
                                  </div>
                                );
                              })}
                              <div className="flex justify-between pt-1 border-t font-medium">
                                <span>Total:</span>
                                <span>₱{(subtotal + markup).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <Separator />

                        {/* Collection Summary */}
                        <div className="bg-primary/5 p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-foreground">Total to Collect from Customer:</span>
                            <span className="text-xl font-bold text-primary">₱{order.total}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {order.paymentMethod === 'cash' ? 'Cash on Delivery (COD)' : `Paid via ${order.paymentMethod}`}
                          </p>
                        </div>

                        <Separator />

                        {/* Rider Earnings */}
                        <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-foreground">Rider Earnings:</span>
                            <span className="text-xl font-bold text-green-600">₱{riderEarnings}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Auto-calculated as {rawCommission ?? 70}% of delivery fee + markup
                          </p>
                        </div>

                        <Separator />

                        {/* Actions */}
                        {isGroupedOrder ? (
                          <div className="space-y-3">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h5 className="font-semibold text-foreground">Update Order Status</h5>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Update each merchant order independently
                                </p>
                              </div>
                            </div>
                            {order.merchantOrders.map((merchantOrder: any, index: number) => {
                              console.log(`Merchant Order ${index}:`, {
                                id: merchantOrder.id,
                                orderNumber: merchantOrder.orderNumber,
                                restaurantName: merchantOrder.restaurantName,
                                status: merchantOrder.status
                              });
                              
                              return (
                                <div key={merchantOrder.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                                  <div>
                                    <p className="font-medium text-sm">{merchantOrder.restaurantName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Order {merchantOrder.orderNumber} • {merchantOrder.status.replace('_', ' ').toUpperCase()}
                                    </p>
                                  </div>
                                <div className="flex gap-2">
                                  {merchantOrder.status === 'accepted' && (
                                    <Button 
                                      size="sm"
                                      onClick={() => updateOrderStatus(merchantOrder.id, 'picked_up')}
                                      data-testid={`button-pickup-${merchantOrder.id}`}
                                    >
                                      Mark Picked Up
                                    </Button>
                                  )}
                                  {merchantOrder.status === 'picked_up' && (
                                    <Button 
                                      size="sm"
                                      onClick={() => updateOrderStatus(merchantOrder.id, 'delivered')}
                                      data-testid={`button-delivered-${merchantOrder.id}`}
                                    >
                                      Mark Delivered
                                    </Button>
                                  )}
                                  {merchantOrder.status === 'delivered' && (
                                    <Badge variant="default" className="px-3 py-1">
                                      ✓ Delivered
                                    </Badge>
                                  )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col space-y-2">
                            {order.status === 'accepted' && (
                              <Button 
                                onClick={() => updateOrderStatus(order.id, 'picked_up')}
                                data-testid={`button-pickup-${order.id}`}
                              >
                                Mark as Picked Up
                              </Button>
                            )}
                            {order.status === 'picked_up' && (
                              <Button 
                                onClick={() => updateOrderStatus(order.id, 'delivered')}
                                data-testid={`button-delivered-${order.id}`}
                              >
                                Mark as Delivered
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
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
                          <Badge 
                            variant={
                              order.status === 'delivered' ? 'default' : 
                              order.status === 'cancelled' ? 'destructive' : 
                              'secondary'
                            }
                            data-testid={`status-badge-${order.id}`}
                          >
                            {order.status === 'delivered' ? 'Delivered' : 
                             order.status === 'cancelled' ? 'Cancelled' : 
                             order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                          </Badge>
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

            {/* My Account Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">My Account</h2>
                    {!isEditingProfile ? (
                      <Button onClick={() => setIsEditingProfile(true)} data-testid="button-edit-profile">
                        Edit Contact Info
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsEditingProfile(false)}
                          data-testid="button-cancel-edit-profile"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            updateProfileMutation.mutate({
                              email: editedEmail,
                              phone: editedPhone
                            });
                          }}
                          disabled={updateProfileMutation.isPending}
                          data-testid="button-save-profile"
                        >
                          {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Personal Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Prefix</label>
                          <p className="text-base font-medium" data-testid="text-prefix">
                            {user?.prefix || "-"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">First Name</label>
                          <p className="text-base font-medium" data-testid="text-first-name">
                            {user?.firstName || "-"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Middle Name</label>
                          <p className="text-base font-medium" data-testid="text-middle-name">
                            {user?.middleName || "-"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Last Name</label>
                          <p className="text-base font-medium" data-testid="text-last-name">
                            {user?.lastName || "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Address Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Address</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Lot/House No.</label>
                          <p className="text-base font-medium" data-testid="text-lot-house-no">
                            {user?.lotHouseNo || "-"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Street</label>
                          <p className="text-base font-medium" data-testid="text-street">
                            {user?.street || "-"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Barangay</label>
                          <p className="text-base font-medium" data-testid="text-barangay">
                            {user?.barangay || "-"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">City/Municipality</label>
                          <p className="text-base font-medium" data-testid="text-city">
                            {user?.cityMunicipality || "-"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Province</label>
                          <p className="text-base font-medium" data-testid="text-province">
                            {user?.province || "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Contact Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Email</label>
                          {isEditingProfile ? (
                            <Input
                              type="email"
                              value={editedEmail}
                              onChange={(e) => setEditedEmail(e.target.value)}
                              placeholder="Enter your email"
                              data-testid="input-edit-email"
                            />
                          ) : (
                            <p className="text-base font-medium" data-testid="text-email">
                              {user?.email || "-"}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Phone Number</label>
                          {isEditingProfile ? (
                            <Input
                              type="tel"
                              value={editedPhone}
                              onChange={(e) => setEditedPhone(e.target.value)}
                              placeholder="09XXXXXXXXX"
                              data-testid="input-edit-phone"
                            />
                          ) : (
                            <p className="text-base font-medium" data-testid="text-phone">
                              {user?.phone || "-"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Rider Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Rider Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Driver's License No.</label>
                          <p className="text-base font-medium" data-testid="text-license-no">
                            {user?.driversLicenseNo || "-"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">License Validity</label>
                          <p className="text-base font-medium" data-testid="text-license-validity">
                            {user?.licenseValidityDate ? new Date(user.licenseValidityDate).toLocaleDateString() : "-"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Account Status</label>
                          <p className="text-base font-medium" data-testid="text-approval-status">
                            <Badge variant={user?.approvalStatus === 'approved' ? 'default' : 'secondary'}>
                              {user?.approvalStatus || "-"}
                            </Badge>
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Account Created</label>
                          <p className="text-base font-medium" data-testid="text-created-date">
                            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Rating Information */}
                    <RiderRatingDisplay riderId={user?.id} />

                    {/* Optional: Link to documents */}
                    {riderProfile?.documentsStatus && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Documents</h3>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Document Status</p>
                              <Badge 
                                variant={
                                  riderProfile.documentsStatus === 'approved' ? 'default' : 
                                  riderProfile.documentsStatus === 'rejected' ? 'destructive' : 
                                  'secondary'
                                }
                                data-testid="text-documents-status"
                              >
                                {riderProfile.documentsStatus}
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => setIsDocumentsDialogOpen(true)}
                              data-testid="button-view-documents"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              View Documents
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Documents Viewer Dialog */}
      <Dialog open={isDocumentsDialogOpen} onOpenChange={setIsDocumentsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verification Documents</DialogTitle>
            <DialogDescription>
              View all your uploaded verification documents
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Document Status */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Document Status</p>
                <p className="text-sm text-muted-foreground">
                  {riderProfile?.documentsStatus === 'approved' && 'All documents verified and approved'}
                  {riderProfile?.documentsStatus === 'pending' && 'Documents under admin review'}
                  {riderProfile?.documentsStatus === 'rejected' && 'Documents rejected - please reupload'}
                  {riderProfile?.documentsStatus === 'incomplete' && 'Please upload all required documents'}
                </p>
              </div>
              <Badge 
                variant={
                  riderProfile?.documentsStatus === 'approved' ? 'default' : 
                  riderProfile?.documentsStatus === 'rejected' ? 'destructive' : 
                  'secondary'
                }
              >
                {riderProfile?.documentsStatus || 'Incomplete'}
              </Badge>
            </div>

            {/* OR/CR Document */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  OR/CR Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                {riderProfile?.orcrDocument ? (
                  <div className="space-y-3">
                    <div className="relative group">
                      <img 
                        src={riderProfile.orcrDocument} 
                        alt="OR/CR Document" 
                        className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setFullSizeImage(riderProfile.orcrDocument)}
                        data-testid="img-orcr-preview"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                        <Eye className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    {riderProfile.documentsUploadedAt && (
                      <p className="text-sm text-muted-foreground">
                        Uploaded: {new Date(riderProfile.documentsUploadedAt).toLocaleDateString()}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFullSizeImage(riderProfile.orcrDocument)}
                        data-testid="button-view-orcr"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Full Size
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(riderProfile.orcrDocument, '_blank')}
                        data-testid="button-download-orcr"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No document uploaded</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Motor Image */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bike className="w-5 h-5" />
                  Motor/Vehicle Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                {riderProfile?.motorImage ? (
                  <div className="space-y-3">
                    <div className="relative group">
                      <img 
                        src={riderProfile.motorImage} 
                        alt="Motor Image" 
                        className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setFullSizeImage(riderProfile.motorImage)}
                        data-testid="img-motor-preview"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                        <Eye className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    {riderProfile.documentsUploadedAt && (
                      <p className="text-sm text-muted-foreground">
                        Uploaded: {new Date(riderProfile.documentsUploadedAt).toLocaleDateString()}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFullSizeImage(riderProfile.motorImage)}
                        data-testid="button-view-motor"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Full Size
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(riderProfile.motorImage, '_blank')}
                        data-testid="button-download-motor"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bike className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No image uploaded</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Valid ID */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Valid ID
                </CardTitle>
              </CardHeader>
              <CardContent>
                {riderProfile?.idDocument ? (
                  <div className="space-y-3">
                    <div className="relative group">
                      <img 
                        src={riderProfile.idDocument} 
                        alt="Valid ID" 
                        className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setFullSizeImage(riderProfile.idDocument)}
                        data-testid="img-id-preview"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                        <Eye className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    {riderProfile.documentsUploadedAt && (
                      <p className="text-sm text-muted-foreground">
                        Uploaded: {new Date(riderProfile.documentsUploadedAt).toLocaleDateString()}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFullSizeImage(riderProfile.idDocument)}
                        data-testid="button-view-id"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Full Size
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(riderProfile.idDocument, '_blank')}
                        data-testid="button-download-id"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No document uploaded</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Size Image Viewer */}
      <Dialog open={!!fullSizeImage} onOpenChange={() => setFullSizeImage(null)}>
        <DialogContent className="max-w-6xl p-0">
          <div className="relative">
            <img 
              src={fullSizeImage || ''} 
              alt="Full size document" 
              className="w-full h-auto max-h-[90vh] object-contain"
              data-testid="img-full-size"
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4"
              onClick={() => setFullSizeImage(null)}
              data-testid="button-close-full-size"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Location Map Viewer */}
      <Dialog open={showMapViewer} onOpenChange={setShowMapViewer}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {mapLocationType === 'delivery' ? 'Delivery Address' : 'Pickup Location'}
            </DialogTitle>
            <DialogDescription>
              {mapLocationType === 'delivery' 
                ? 'View the customer delivery address on the map'
                : 'View the restaurant pickup location on the map'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrderForMap && (
            <div className="space-y-4">
              <LocationMapViewer
                locations={
                  mapLocationType === 'delivery' 
                    ? (selectedOrderForMap.deliveryLatitude && selectedOrderForMap.deliveryLongitude ? [{
                        lat: parseFloat(selectedOrderForMap.deliveryLatitude),
                        lng: parseFloat(selectedOrderForMap.deliveryLongitude),
                        label: `Delivery: ${selectedOrderForMap.customerName}`,
                        color: "#3b82f6", // blue for customer/delivery
                      }] : [])
                    : (selectedOrderForMap.restaurantLatitude && selectedOrderForMap.restaurantLongitude ? [{
                        lat: parseFloat(selectedOrderForMap.restaurantLatitude),
                        lng: parseFloat(selectedOrderForMap.restaurantLongitude),
                        label: `Pickup: ${selectedOrderForMap.restaurantName}`,
                        color: "#10b981", // green for restaurant/pickup
                      }] : [])
                }
              />
              
              {mapLocationType === 'delivery' ? (
                <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    Delivery Address
                  </h4>
                  <p className="text-sm font-medium">{selectedOrderForMap.customerName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedOrderForMap.deliveryAddress}</p>
                  {selectedOrderForMap.deliveryLatitude && selectedOrderForMap.deliveryLongitude && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Coordinates: {selectedOrderForMap.deliveryLatitude}, {selectedOrderForMap.deliveryLongitude}
                    </p>
                  )}
                  {selectedOrderForMap.phoneNumber && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Contact: <a href={`tel:${selectedOrderForMap.phoneNumber}`} className="text-primary hover:underline">
                        {selectedOrderForMap.phoneNumber}
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    Pickup Location
                  </h4>
                  <p className="text-sm font-medium">{selectedOrderForMap.restaurantName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedOrderForMap.restaurantAddress}</p>
                  {selectedOrderForMap.restaurantLatitude && selectedOrderForMap.restaurantLongitude && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Coordinates: {selectedOrderForMap.restaurantLatitude}, {selectedOrderForMap.restaurantLongitude}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
