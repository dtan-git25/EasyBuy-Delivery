import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Store, MapPin, Star, Clock, User, Phone, MessageCircle, Edit, Plus, AlertCircle, CheckCircle, XCircle, Power, Trash2, Camera, Utensils, X, Package, History, BarChart3, Navigation, Search, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from "@/hooks/use-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  items: any[];
  subtotal: string;
  total: string;
  merchantEarningsAmount?: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  rider?: {
    name: string;
  };
  createdAt: string;
}

// Compact inline rating display for profile headers
function InlineMerchantRating({ merchantId }: { merchantId?: string }) {
  const { data: ratingData } = useQuery<{ average: { average: number; count: number } }>({
    queryKey: ["/api/ratings/merchant", merchantId],
    enabled: !!merchantId,
    queryFn: async () => {
      if (!merchantId) return { average: { average: 0, count: 0 } };
      const response = await fetch(`/api/ratings/merchant/${merchantId}`);
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

// Sortable Option Type Component
function SortableOptionType({
  selectedType,
  optionValues,
  updateOptionValue,
  removeOptionValue,
  addOptionValue,
  removeOptionType,
}: {
  selectedType: { id: string; name: string };
  optionValues: Array<{optionTypeId: string, value: string, price: string}>;
  updateOptionValue: (index: number, field: 'value' | 'price', newValue: string) => void;
  removeOptionValue: (index: number) => void;
  addOptionValue: (optionTypeId: string) => void;
  removeOptionType: (typeId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: selectedType.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeValues = optionValues
    .map((opt, index) => ({ ...opt, index }))
    .filter(opt => opt.optionTypeId === selectedType.id);

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-3 mb-3">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        
        <h4 className="text-sm font-semibold flex-1" data-testid={`label-option-type-${selectedType.id}`}>
          {selectedType.name}
        </h4>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addOptionValue(selectedType.id)}
          data-testid={`button-add-option-${selectedType.id}`}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Value
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => removeOptionType(selectedType.id)}
          className="text-destructive hover:text-destructive"
          data-testid={`button-remove-type-${selectedType.id}`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2">
        {typeValues.map(({ index }) => (
          <div key={index} className="flex gap-2 items-center">
            <Input
              placeholder="Value (e.g., Small)"
              value={optionValues[index].value}
              onChange={(e) => updateOptionValue(index, 'value', e.target.value)}
              className="flex-1"
              data-testid={`input-option-value-${index}`}
            />
            <Input
              type="number"
              placeholder="Price (₱)"
              value={optionValues[index].price}
              onChange={(e) => updateOptionValue(index, 'price', e.target.value)}
              className="w-32"
              data-testid={`input-option-price-${index}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeOptionValue(index)}
              className="text-destructive hover:text-destructive"
              data-testid={`button-remove-option-${index}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        {typeValues.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Click "Add Value" to add options</p>
        )}
      </div>
    </div>
  );
}

// Sortable Menu Group Component
function SortableMenuGroup({
  group,
  onEdit,
  onDelete,
}: {
  group: any;
  onEdit: (group: any) => void;
  onDelete: (group: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const itemCount = group.items?.length || 0;
  const itemNames = group.items?.map((item: any) => item.name) || [];
  const itemPreview = itemNames.length > 3 
    ? `${itemNames.slice(0, 3).join(', ')}...`
    : itemNames.join(', ');

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="hover:bg-accent/5 transition-colors">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded self-start md:self-center"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-base mb-1">{group.groupName}</h4>
              <p className="text-sm text-muted-foreground">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
                {itemPreview && ` • ${itemPreview}`}
              </p>
            </div>
            
            <div className="flex gap-2 flex-shrink-0 w-full md:w-auto justify-end md:justify-start">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(group)}
                data-testid={`button-edit-group-${group.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(group)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                data-testid={`button-delete-group-${group.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Full rating display for account settings tab
function MerchantRatingDisplay({ merchantId }: { merchantId?: string }) {
  const { data: ratingData } = useQuery<{ average: { average: number; count: number }; ratings: any[] }>({
    queryKey: ["/api/ratings/merchant", merchantId],
    enabled: !!merchantId,
    queryFn: async () => {
      if (!merchantId) return { average: { average: 0, count: 0 }, ratings: [] };
      const response = await fetch(`/api/ratings/merchant/${merchantId}`);
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
                          star <= (rating.merchantRating || 0)
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
                {rating.merchantComment && (
                  <p className="text-muted-foreground">{rating.merchantComment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Merchant Earnings History Component
function MerchantEarningsHistory() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<string>('last30');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Build query params based on filters
  const getQueryParams = () => {
    const params = new URLSearchParams();
    params.append('page', currentPage.toString());
    params.append('limit', '20');
    
    if (searchTerm) {
      params.append('search', searchTerm);
    }
    
    // Handle date range
    const now = new Date();
    let start, end;
    
    if (dateRange === 'today') {
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
    } else if (dateRange === 'last7') {
      start = new Date();
      start.setDate(start.getDate() - 7);
      end = now;
    } else if (dateRange === 'last30') {
      start = new Date();
      start.setDate(start.getDate() - 30);
      end = now;
    } else if (dateRange === 'custom' && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    }
    
    if (start) params.append('startDate', start.toISOString());
    if (end) params.append('endDate', end.toISOString());
    
    return params.toString();
  };
  
  const { data: earningsData, isLoading } = useQuery({
    queryKey: ['/api/earnings/merchant', currentPage, dateRange, searchTerm, startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`/api/earnings/merchant?${getQueryParams()}`);
      if (!response.ok) throw new Error('Failed to fetch earnings');
      return response.json();
    }
  });
  
  const orders = earningsData?.orders || [];
  const summary = earningsData?.summary || { totalOrders: 0, totalEarnings: 0, averagePerOrder: 0 };
  const totalPages = Math.ceil((earningsData?.total || 0) / 20);
  
  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Total Orders</p>
          <p className="text-2xl font-bold" data-testid="text-total-orders">{summary.totalOrders}</p>
          <p className="text-xs text-muted-foreground mt-1">Completed</p>
        </div>
        
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-muted-foreground">Total Earnings</p>
          <p className="text-2xl font-bold text-yellow-600" data-testid="text-total-earnings">
            ₱{summary.totalEarnings.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Base revenue</p>
        </div>
        
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Avg per Order</p>
          <p className="text-2xl font-bold" data-testid="text-average-per-order">
            ₱{summary.averagePerOrder.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Average</p>
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Order ID</Label>
              <Input
                id="search"
                placeholder="Search by order number..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                data-testid="input-search-order"
              />
            </div>
            
            <div className="w-full md:w-48">
              <Label htmlFor="date-range">Date Range</Label>
              <Select 
                value={dateRange} 
                onValueChange={(value) => {
                  setDateRange(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last7">Last 7 Days</SelectItem>
                  <SelectItem value="last30">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {dateRange === 'custom' && (
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
            </div>
          )}
          
          {/* Orders Table */}
          <div className="border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading earnings history...</div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No earnings found for selected period</div>
            ) : (
              <div className="divide-y">
                {orders.map((order: any) => (
                  <div key={order.id} className="hover:bg-muted/50 transition-colors">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer"
                      onClick={() => toggleExpand(order.id)}
                      data-testid={`order-row-${order.orderNumber}`}
                    >
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium">{new Date(order.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="text-xs text-muted-foreground">{order.orderNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Customer</p>
                          <p className="text-sm font-medium">{order.customer?.name || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Rider</p>
                          <p className="text-sm font-medium">{order.riderName || 'Not assigned'}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-green-600">₱{parseFloat(order.merchantEarningsAmount || order.subtotal).toFixed(2)}</p>
                          <Button variant="ghost" size="sm" data-testid={`button-toggle-details-${order.orderNumber}`}>
                            {expandedOrderId === order.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {expandedOrderId === order.id && (
                      <div className="px-4 pb-4 pt-2 bg-muted/30" data-testid={`order-details-${order.orderNumber}`}>
                        <div className="bg-background rounded-lg p-4 space-y-3">
                          <h4 className="font-semibold text-sm">Order #{order.orderNumber} - Earnings Breakdown</h4>
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Items Sold:</p>
                            <ul className="space-y-1 pl-4">
                              {order.items?.map((item: any, idx: number) => (
                                <li key={idx} className="text-sm text-muted-foreground">
                                  • {item.name} x{item.quantity} 
                                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                                    <span className="text-xs"> ({item.selectedOptions.map((opt: any) => opt.value).join(', ')})</span>
                                  )}
                                  {' '}= ₱{item.price}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <Separator />
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Customer Paid for Items:</span>
                              <span className="font-medium">₱{(parseFloat(order.subtotal) + parseFloat(order.markup || '0')).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Order Markup ({order.restaurantMarkup || 0}%):</span>
                              <span>- ₱{parseFloat(order.markup || '0').toFixed(2)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-green-600">
                              <span>Your Earnings (Base Cost):</span>
                              <span>₱{parseFloat(order.merchantEarningsAmount || order.subtotal).toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground italic">Note: Markup goes to platform</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-previous-page"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MerchantPortal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddMenuItemOpen, setIsAddMenuItemOpen] = useState(false);
  const [isEditMenuItemOpen, setIsEditMenuItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editedOrderItems, setEditedOrderItems] = useState<any[]>([]);
  const [markingUnavailableOrder, setMarkingUnavailableOrder] = useState<Order | null>(null);
  const [showAddItemsSection, setShowAddItemsSection] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<string>("");
  const [menuItemForm, setMenuItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: ''
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedRestaurantImage, setSelectedRestaurantImage] = useState<File | null>(null);
  const [restaurantImagePreview, setRestaurantImagePreview] = useState<string>('');
  const [isRestaurantPhotoDialogOpen, setIsRestaurantPhotoDialogOpen] = useState(false);
  const [optionValues, setOptionValues] = useState<Array<{optionTypeId: string, value: string, price: string}>>([]);
  const [selectedOptionTypes, setSelectedOptionTypes] = useState<Array<{id: string, name: string}>>([]);
  const [availableItemOptions, setAvailableItemOptions] = useState<any[]>([]);
  const [selectedItemOptions, setSelectedItemOptions] = useState<Record<string, string>>({});
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [itemToDelete, setItemToDelete] = useState<{index: number, name: string} | null>(null);
  
  // Menu Groups state
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [deletingGroup, setDeletingGroup] = useState<any>(null);
  const [groupForm, setGroupForm] = useState({
    groupName: '',
    description: '',
    selectedItems: [] as string[]
  });
  
  // Merchant profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedStoreName, setEditedStoreName] = useState("");
  const [editedStoreContact, setEditedStoreContact] = useState("");
  const [editedStoreAddress, setEditedStoreAddress] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [editedLatitude, setEditedLatitude] = useState("");
  const [editedLongitude, setEditedLongitude] = useState("");
  
  // Map refs for profile editing
  const profileMapContainerRef = useRef<HTMLDivElement | null>(null);
  const profileMapRef = useRef<L.Map | null>(null);
  const profileMarkerRef = useRef<L.Marker | null>(null);
  const [isGeolocating, setIsGeolocating] = useState(false);
  
  // Track approval notification dismissal using localStorage
  const [isApprovalNotificationDismissed, setIsApprovalNotificationDismissed] = useState(() => {
    if (typeof window !== 'undefined' && user?.id) {
      const dismissed = localStorage.getItem(`approval-notification-dismissed-${user.id}`);
      return dismissed === 'true';
    }
    return false;
  });

  // Handle dismissing approval notification
  const handleDismissApprovalNotification = () => {
    if (user?.id) {
      localStorage.setItem(`approval-notification-dismissed-${user.id}`, 'true');
      setIsApprovalNotificationDismissed(true);
    }
  };

  // Fetch merchant's own restaurant (including inactive ones)
  const { data: userRestaurant } = useQuery<any>({
    queryKey: ["/api/merchant/my-restaurant"],
    staleTime: 0, // Always refetch to ensure we have latest data
    gcTime: 0, // Don't cache the data
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    enabled: user?.role === 'merchant', // Only fetch for merchants
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  // Fetch categories for dropdown
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch active option types for menu item customization
  const { data: activeOptionTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/option-types/active"],
    enabled: isAddMenuItemOpen || isEditMenuItemOpen,
  });

  // WebSocket for real-time order updates
  const { socket, sendMessage } = useWebSocket();

  // Listen for order updates and chat messages via WebSocket
  useEffect(() => {
    if (socket && user) {
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'order_update':
              // Refresh orders when any order is updated
              queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
              
              // Show toast for order updates
              if (data.order) {
                toast({
                  title: "Order Updated",
                  description: `Order #${data.order.orderNumber} status: ${data.order.status}`,
                });
              }
              break;

            case 'new_order':
              // Refresh orders when new order is created
              queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
              
              // Show toast for new orders
              if (data.order) {
                toast({
                  title: "New Order",
                  description: `New order #${data.order.orderNumber} received!`,
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
  }, [socket, user, queryClient, toast]);

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

  const updateOrderItemsMutation = useMutation({
    mutationFn: async ({ orderId, items, reason }: { orderId: string; items: any[]; reason: string }) => {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}/items`, { items, reason });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update order items');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setIsEditOrderOpen(false);
      setEditingOrder(null);
      setEditedOrderItems([]);
      toast({
        title: "Order Updated",
        description: "Order items have been updated and customer has been notified.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markOrderUnavailableMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest("POST", `/api/orders/${orderId}/mark-unavailable`, {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark order unavailable');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setMarkingUnavailableOrder(null);
      toast({
        title: "Order Cancelled",
        description: "Order marked as unavailable. Customer and rider have been notified.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Image upload handler
  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/menu-items/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Image upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Handle image file selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a JPEG, PNG, or WebP image.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle restaurant photo selection
  const handleRestaurantPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a JPEG or PNG image.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedRestaurantImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setRestaurantImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload restaurant photo
  const handleUploadRestaurantPhoto = async () => {
    if (!selectedRestaurantImage || !userRestaurant) {
      toast({
        title: "No image selected",
        description: "Please select an image first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Upload image
      const formData = new FormData();
      formData.append('image', selectedRestaurantImage);
      
      const uploadResponse = await fetch('/api/restaurants/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }
      
      const { imageUrl } = await uploadResponse.json();
      
      // Update restaurant with new image
      const response = await apiRequest("PATCH", `/api/restaurants/${userRestaurant.id}`, {
        image: imageUrl
      });
      
      if (!response.ok) {
        throw new Error('Failed to update restaurant photo');
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/my-restaurant"] });
      setIsRestaurantPhotoDialogOpen(false);
      setSelectedRestaurantImage(null);
      setRestaurantImagePreview('');
      
      toast({
        title: "Photo updated",
        description: "Your restaurant photo has been updated successfully.",
      });
    } catch (error) {
      console.error('Error uploading restaurant photo:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload restaurant photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const createMenuItemMutation = useMutation({
    mutationFn: async (menuItemData: any) => {
      const response = await apiRequest("POST", "/api/menu-items", menuItemData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create menu item');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      // Save option values if any, ordered by selected option types
      if (optionValues.length > 0 && data.id) {
        let displayOrderCounter = 0;
        
        // Iterate through selected types in order
        for (const selectedType of selectedOptionTypes) {
          const valuesForType = optionValues.filter(v => v.optionTypeId === selectedType.id);
          
          // Save all values for this type with sequential displayOrder
          for (const optionValue of valuesForType) {
            await apiRequest("POST", `/api/menu-items/${data.id}/options`, {
              optionTypeId: optionValue.optionTypeId,
              value: optionValue.value,
              price: optionValue.price,
              displayOrder: displayOrderCounter++
            });
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setIsAddMenuItemOpen(false);
      setMenuItemForm({ name: '', description: '', price: '', category: '', image: '' });
      setSelectedImage(null);
      setImagePreview('');
      setOptionValues([]);
      setSelectedOptionTypes([]);
      toast({
        title: "Menu item created",
        description: "Your menu item has been added successfully.",
      });
    },
    onError: (error: Error) => {
      console.error('Failed to create menu item:', error.message);
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/menu-items/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update menu item');
      }
      return response.json();
    },
    onSuccess: async (data, variables) => {
      // Always delete existing options first (even if new list is empty)
      const existingResponse = await fetch(`/api/menu-items/${variables.id}/options`);
      if (existingResponse.ok) {
        const existingOptions = await existingResponse.json();
        for (const option of existingOptions) {
          await apiRequest("DELETE", `/api/menu-items/${variables.id}/options/${option.id}`, {});
        }
      }
      
      // Create new option values only if any exist, ordered by selected option types
      if (optionValues.length > 0) {
        let displayOrderCounter = 0;
        
        // Iterate through selected types in order
        for (const selectedType of selectedOptionTypes) {
          const valuesForType = optionValues.filter(v => v.optionTypeId === selectedType.id);
          
          // Save all values for this type with sequential displayOrder
          for (const optionValue of valuesForType) {
            await apiRequest("POST", `/api/menu-items/${variables.id}/options`, {
              optionTypeId: optionValue.optionTypeId,
              value: optionValue.value,
              price: optionValue.price,
              displayOrder: displayOrderCounter++
            });
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setIsEditMenuItemOpen(false);
      setEditingItem(null);
      setMenuItemForm({ name: '', description: '', price: '', category: '', image: '' });
      setSelectedImage(null);
      setImagePreview('');
      setOptionValues([]);
      setSelectedOptionTypes([]);
      toast({
        title: "Menu item updated",
        description: "Your menu item has been updated successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      const response = await apiRequest("PATCH", `/api/menu-items/${id}`, { isAvailable });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update availability');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({
        title: "Availability updated",
        description: variables.isAvailable ? "Item is now available to customers" : "Item marked as unavailable",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/menu-items/${id}`, {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete menu item');
      }
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setDeletingItem(null);
      toast({
        title: "Menu item deleted",
        description: "The menu item has been removed successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Menu Group Mutations
  const createMenuGroupMutation = useMutation({
    mutationFn: async (groupData: any) => {
      const response = await apiRequest("POST", "/api/menu-groups", groupData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create menu group');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-groups"] });
      setIsCreateGroupOpen(false);
      setGroupForm({ groupName: '', description: '', selectedItems: [] });
      toast({
        title: "Group created",
        description: "Your menu group has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMenuGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/menu-groups/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update menu group');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-groups"] });
      setIsEditGroupOpen(false);
      setEditingGroup(null);
      setGroupForm({ groupName: '', description: '', selectedItems: [] });
      toast({
        title: "Group updated",
        description: "Your menu group has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMenuGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/menu-groups/${id}`, {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete menu group');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-groups"] });
      setDeletingGroup(null);
      toast({
        title: "Group deleted",
        description: "The menu group has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderMenuGroupsMutation = useMutation({
    mutationFn: async (updates: { id: string; displayOrder: number }[]) => {
      const response = await apiRequest("PATCH", `/api/restaurants/${userRestaurant?.id}/menu-groups/reorder`, { updates });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reorder groups');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-groups"] });
      toast({
        title: "Groups reordered",
        description: "Menu group order has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reorder failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const requestReapprovalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/merchant/request-reapproval", {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to request re-approval');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Re-approval requested",
        description: "Your account has been submitted for admin review again.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleRestaurantStatusMutation = useMutation({
    mutationFn: async ({ restaurantId, isActive }: { restaurantId: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/restaurants/${restaurantId}`, { isActive });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update restaurant status');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/my-restaurant"] });
      toast({
        title: "Restaurant status updated",
        description: variables.isActive ? "Your restaurant is now accepting orders!" : "Your restaurant is now closed.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { storeName?: string; storeContact?: string; storeAddress?: string; email?: string; latitude?: string; longitude?: string }) => {
      const response = await apiRequest("PATCH", "/api/merchant/profile", data);
      return response.json();
    },
    onSuccess: () => {
      setIsEditingProfile(false);
      // Cleanup map
      if (profileMapRef.current) {
        profileMapRef.current.remove();
        profileMapRef.current = null;
        profileMarkerRef.current = null;
      }
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/my-restaurant"] });
    },
    onError: () => {
      toast({
        title: "Error updating profile",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Use current location for profile editing
  const handleProfileUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Not Supported",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
      return;
    }

    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setEditedLatitude(latitude.toFixed(6));
        setEditedLongitude(longitude.toFixed(6));

        if (profileMapRef.current && profileMarkerRef.current) {
          profileMapRef.current.setView([latitude, longitude], 17);
          profileMarkerRef.current.setLatLng([latitude, longitude]);
        }

        toast({
          title: "Location Found",
          description: "Map centered to your current location. Drag the pin to adjust.",
        });
        setIsGeolocating(false);
      },
      (error) => {
        let message = "Could not get your location. Please enable location access.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Location access denied. Please enable it in your browser settings.";
        }
        toast({
          title: "Location Error",
          description: message,
          variant: "destructive",
        });
        setIsGeolocating(false);
      }
    );
  };

  // Search address for profile editing
  const handleProfileSearchAddress = async () => {
    const address = userRestaurant?.address;

    if (!address?.trim()) {
      toast({
        title: "No Address",
        description: "Please add a store address first",
        variant: "destructive",
      });
      return;
    }

    setIsGeolocating(true);
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      const data = await response.json();

      if (data.coordinates) {
        const { latitude, longitude } = data.coordinates;
        setEditedLatitude(latitude);
        setEditedLongitude(longitude);

        if (profileMapRef.current && profileMarkerRef.current) {
          profileMapRef.current.setView([parseFloat(latitude), parseFloat(longitude)], 15);
          profileMarkerRef.current.setLatLng([parseFloat(latitude), parseFloat(longitude)]);
        }

        toast({
          title: "Address Found",
          description: "Map centered to your store address. Drag the pin to adjust.",
        });
      } else {
        toast({
          title: "Address Not Found",
          description: "Could not find location. Please drag the pin manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Search Error",
        description: "Failed to search address. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeolocating(false);
    }
  };

  // Initialize profile edit form when entering edit mode
  useEffect(() => {
    if (isEditingProfile && userRestaurant && user) {
      setEditedStoreName(userRestaurant.name || "");
      setEditedStoreContact(userRestaurant.phone || "");
      setEditedStoreAddress(userRestaurant.address || "");
      setEditedEmail(user.email || "");
      setEditedLatitude(userRestaurant.latitude || "14.5995");
      setEditedLongitude(userRestaurant.longitude || "120.9842");
    }
  }, [isEditingProfile, userRestaurant, user]);

  // Initialize map when editing profile
  useEffect(() => {
    if (isEditingProfile && profileMapContainerRef.current && !profileMapRef.current) {
      const initMap = setTimeout(() => {
        if (profileMapContainerRef.current && !profileMapRef.current) {
          try {
            const lat = parseFloat(editedLatitude || "14.5995");
            const lng = parseFloat(editedLongitude || "120.9842");

            const map = L.map(profileMapContainerRef.current, {
              center: [lat, lng],
              zoom: 15,
              zoomControl: true,
            });

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              maxZoom: 19,
            }).addTo(map);

            const marker = L.marker([lat, lng], {
              draggable: true,
              autoPan: true,
            }).addTo(map);

            marker.on("dragend", () => {
              const position = marker.getLatLng();
              setEditedLatitude(position.lat.toFixed(6));
              setEditedLongitude(position.lng.toFixed(6));
            });

            map.on("click", (e) => {
              marker.setLatLng(e.latlng);
              setEditedLatitude(e.latlng.lat.toFixed(6));
              setEditedLongitude(e.latlng.lng.toFixed(6));
            });

            profileMapRef.current = map;
            profileMarkerRef.current = marker;

            setTimeout(() => {
              map.invalidateSize();
            }, 250);
          } catch (error) {
            console.error("Error initializing profile map:", error);
          }
        }
      }, 150);

      return () => {
        clearTimeout(initMap);
      };
    } else if (!isEditingProfile) {
      // Cleanup map when exiting edit mode
      if (profileMapRef.current) {
        profileMapRef.current.remove();
        profileMapRef.current = null;
        profileMarkerRef.current = null;
      }
    }
  }, [isEditingProfile, editedLatitude, editedLongitude]);

  const { data: menuItems = [] } = useQuery({
    queryKey: ["/api/menu-items", userRestaurant?.id],
    queryFn: async () => {
      if (!userRestaurant) return [];
      const response = await fetch(`/api/menu-items?restaurantId=${userRestaurant.id}`);
      return response.json();
    },
    enabled: !!userRestaurant,
  });

  const { data: menuGroups = [] } = useQuery({
    queryKey: ["/api/menu-groups", userRestaurant?.id],
    queryFn: async () => {
      if (!userRestaurant) return [];
      const response = await fetch(`/api/restaurants/${userRestaurant.id}/menu-groups`);
      return response.json();
    },
    enabled: !!userRestaurant,
  });
  
  const activeOrders = orders.filter((order: Order) => 
    ['pending', 'accepted', 'preparing'].includes(order.status)
  );

  const historicalOrders = orders.filter((order: Order) => 
    ['ready', 'picked_up', 'delivered', 'cancelled'].includes(order.status)
  );

  const todayOrders = orders.filter((order: Order) => {
    const today = new Date().toDateString();
    const orderDate = new Date(order.createdAt).toDateString();
    return today === orderDate;
  });

  const todayRevenue = todayOrders.reduce((sum: number, order: Order) => {
    return sum + parseFloat(order.subtotal || '0');
  }, 0);

  const markOrderReady = (orderId: string) => {
    updateOrderMutation.mutate({ orderId, status: 'ready' });
  };

  const handleSubmitMenuItem = async () => {
    // Prevent non-approved merchants from creating menu items
    if (user?.approvalStatus !== 'approved') {
      console.error('Menu item creation is disabled for non-approved merchants');
      return;
    }

    if (!menuItemForm.name.trim() || !menuItemForm.price.trim()) {
      toast({
        title: "Validation error",
        description: "Name and price are required",
        variant: "destructive",
      });
      return;
    }

    // Validate option types have at least one value
    for (const selectedType of selectedOptionTypes) {
      const valuesForType = optionValues.filter(v => v.optionTypeId === selectedType.id);
      
      if (valuesForType.length === 0) {
        toast({
          title: "Validation error",
          description: `Option type "${selectedType.name}" must have at least one value. Please add a value or remove the option type.`,
          variant: "destructive",
        });
        return;
      }

      // Check that all values have both name and price
      const invalidValues = valuesForType.filter(v => !v.value.trim() || !v.price.trim());
      if (invalidValues.length > 0) {
        toast({
          title: "Validation error",
          description: `All option values for "${selectedType.name}" must have both a name and price.`,
          variant: "destructive",
        });
        return;
      }
    }

    let imageUrl = menuItemForm.image;
    
    // Upload image if selected
    if (selectedImage) {
      const uploadedImageUrl = await handleImageUpload(selectedImage);
      if (uploadedImageUrl) {
        imageUrl = uploadedImageUrl;
      }
    }

    createMenuItemMutation.mutate({
      name: menuItemForm.name.trim(),
      description: menuItemForm.description.trim(),
      price: menuItemForm.price.trim(),
      category: menuItemForm.category.trim() || 'Other',
      restaurantId: userRestaurant?.id,
      image: imageUrl
    });
  };

  const handleEditMenuItem = async (item: any) => {
    setEditingItem(item);
    setMenuItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category || '',
      image: item.image || ''
    });
    
    // Load existing image preview
    if (item.image) {
      setImagePreview(item.image);
    } else {
      setImagePreview('');
    }
    setSelectedImage(null);
    
    // Load existing option values
    const response = await fetch(`/api/menu-items/${item.id}/options`);
    if (response.ok) {
      const existingOptions = await response.json();
      // Normalize optionTypeId to string to ensure type safety
      setOptionValues(existingOptions.map((opt: any) => ({
        optionTypeId: String(opt.optionTypeId),
        value: opt.value,
        price: opt.price
      })));
      
      // Extract unique option types from existing options (in order by displayOrder)
      const uniqueTypes: {id: string, name: string}[] = [];
      for (const opt of existingOptions) {
        const typeId = String(opt.optionTypeId);
        if (!uniqueTypes.find(t => t.id === typeId)) {
          uniqueTypes.push({ id: typeId, name: opt.optionType.name });
        }
      }
      setSelectedOptionTypes(uniqueTypes);
    } else {
      setOptionValues([]);
      setSelectedOptionTypes([]);
    }
    
    setIsEditMenuItemOpen(true);
  };

  const handleSubmitEditMenuItem = async () => {
    if (!editingItem) return;
    
    if (!menuItemForm.name.trim() || !menuItemForm.price.trim()) {
      toast({
        title: "Validation error",
        description: "Name and price are required",
        variant: "destructive",
      });
      return;
    }

    // Validate option types have at least one value
    for (const selectedType of selectedOptionTypes) {
      const valuesForType = optionValues.filter(v => v.optionTypeId === selectedType.id);
      
      if (valuesForType.length === 0) {
        toast({
          title: "Validation error",
          description: `Option type "${selectedType.name}" must have at least one value. Please add a value or remove the option type.`,
          variant: "destructive",
        });
        return;
      }

      // Check that all values have both name and price
      const invalidValues = valuesForType.filter(v => !v.value.trim() || !v.price.trim());
      if (invalidValues.length > 0) {
        toast({
          title: "Validation error",
          description: `All option values for "${selectedType.name}" must have both a name and price.`,
          variant: "destructive",
        });
        return;
      }
    }

    let imageUrl = menuItemForm.image;
    
    // Upload new image if selected
    if (selectedImage) {
      const uploadedImageUrl = await handleImageUpload(selectedImage);
      if (uploadedImageUrl) {
        imageUrl = uploadedImageUrl;
      }
    }

    updateMenuItemMutation.mutate({
      id: editingItem.id,
      data: {
        name: menuItemForm.name.trim(),
        description: menuItemForm.description.trim(),
        price: menuItemForm.price.trim(),
        category: menuItemForm.category.trim() || 'Other',
        image: imageUrl
      }
    });
  };

  const handleToggleAvailability = (item: any) => {
    toggleAvailabilityMutation.mutate({
      id: item.id,
      isAvailable: !item.isAvailable
    });
  };

  const updateMenuItemForm = (field: string, value: string) => {
    setMenuItemForm(prev => ({ ...prev, [field]: value }));
  };

  // Add a new option type and automatically add one empty value for it
  const addOptionType = (optionTypeId: string | number, optionTypeName: string) => {
    // Ensure ID is a string (defensive programming)
    const stringId = String(optionTypeId);
    
    // Add the option type to selectedOptionTypes
    setSelectedOptionTypes(prev => {
      if (!prev.find(t => t.id === stringId)) {
        return [...prev, { id: stringId, name: optionTypeName }];
      }
      return prev;
    });
    
    // Automatically add one empty value for this option type
    setOptionValues(prev => [...prev, { optionTypeId: stringId, value: '', price: '' }]);
  };

  // Add another value to an existing option type
  const addOptionValue = (optionTypeId: string | number) => {
    // Ensure ID is a string (defensive programming)
    const stringId = String(optionTypeId);
    setOptionValues(prev => [...prev, { optionTypeId: stringId, value: '', price: '' }]);
  };

  const updateOptionValue = (index: number, field: 'value' | 'price', newValue: string) => {
    setOptionValues(prev => prev.map((opt, i) => 
      i === index ? { ...opt, [field]: newValue } : opt
    ));
  };

  const removeOptionValue = (index: number) => {
    const removedValue = optionValues[index];
    const remaining = optionValues.filter((_, i) => i !== index);
    const hasMoreOfType = remaining.some(v => v.optionTypeId === removedValue.optionTypeId);
    
    setOptionValues(remaining);
    
    // Remove from selected types if this was the last value of this type
    if (!hasMoreOfType) {
      setSelectedOptionTypes(prevTypes => 
        prevTypes.filter(t => t.id !== removedValue.optionTypeId.toString())
      );
    }
  };

  const moveOptionTypeUp = (typeId: string) => {
    setSelectedOptionTypes(prev => {
      const index = prev.findIndex(t => t.id === typeId);
      if (index <= 0) return prev;
      const newTypes = [...prev];
      [newTypes[index - 1], newTypes[index]] = [newTypes[index], newTypes[index - 1]];
      return newTypes;
    });
  };

  const moveOptionTypeDown = (typeId: string) => {
    setSelectedOptionTypes(prev => {
      const index = prev.findIndex(t => t.id === typeId);
      if (index < 0 || index >= prev.length - 1) return prev;
      const newTypes = [...prev];
      [newTypes[index], newTypes[index + 1]] = [newTypes[index + 1], newTypes[index]];
      return newTypes;
    });
  };

  // Drag-and-drop sensors for option types
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for option types
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setSelectedOptionTypes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Remove entire option type
  const removeOptionType = (typeId: string) => {
    // Remove all values for this type
    setOptionValues(prev => prev.filter(v => v.optionTypeId !== typeId));
    // Remove from selected types
    setSelectedOptionTypes(prev => prev.filter(t => t.id !== typeId));
  };

  const fetchItemOptions = async (menuItemId: string) => {
    try {
      const response = await fetch(`/api/menu-items/${menuItemId}/options`);
      if (response.ok) {
        const options = await response.json();
        setAvailableItemOptions(options);
      } else {
        setAvailableItemOptions([]);
      }
    } catch (error) {
      setAvailableItemOptions([]);
    }
  };

  // Menu Group Handlers
  const handleOpenCreateGroup = () => {
    setGroupForm({ groupName: '', description: '', selectedItems: [] });
    setIsCreateGroupOpen(true);
  };

  const handleOpenEditGroup = (group: any) => {
    setEditingGroup(group);
    setGroupForm({
      groupName: group.groupName,
      description: group.description || '',
      selectedItems: group.items?.map((item: any) => item.menuItemId) || []
    });
    setIsEditGroupOpen(true);
  };

  const handleSubmitGroup = () => {
    if (!groupForm.groupName.trim()) {
      toast({
        title: "Validation error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }

    const groupData = {
      restaurantId: userRestaurant?.id,
      groupName: groupForm.groupName,
      description: groupForm.description,
      displayOrder: menuGroups.length,
      menuItems: groupForm.selectedItems
    };

    createMenuGroupMutation.mutate(groupData);
  };

  const handleUpdateGroup = () => {
    if (!groupForm.groupName.trim()) {
      toast({
        title: "Validation error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }

    updateMenuGroupMutation.mutate({
      id: editingGroup.id,
      data: {
        groupName: groupForm.groupName,
        description: groupForm.description,
        menuItems: groupForm.selectedItems
      }
    });
  };

  const toggleItemInGroup = (menuItemId: string) => {
    setGroupForm(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.includes(menuItemId)
        ? prev.selectedItems.filter(id => id !== menuItemId)
        : [...prev.selectedItems, menuItemId]
    }));
  };

  // Handler for menu group drag and drop
  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = menuGroups.findIndex((g: any) => g.id === active.id);
      const newIndex = menuGroups.findIndex((g: any) => g.id === over.id);
      
      const reorderedGroups = arrayMove(menuGroups, oldIndex, newIndex);
      const previousGroups = menuGroups;
      
      // Optimistically update the UI
      queryClient.setQueryData(
        ["/api/restaurants", userRestaurant?.id, "menu-groups"],
        reorderedGroups
      );
      
      // Prepare updates with new display order
      const updates = reorderedGroups.map((group: any, index: number) => ({
        id: group.id,
        displayOrder: index
      }));
      
      // Send to backend with rollback on error
      reorderMenuGroupsMutation.mutate(updates, {
        onError: () => {
          // Rollback optimistic update on failure
          queryClient.setQueryData(
            ["/api/restaurants", userRestaurant?.id, "menu-groups"],
            previousGroups
          );
        }
      });
    }
  };

  const calculateItemPrice = (basePrice: string, selectedOptions: Record<string, string>) => {
    let total = parseFloat(basePrice);
    Object.entries(selectedOptions).forEach(([optionType, optionValue]) => {
      const option = availableItemOptions.find(opt => 
        opt.optionType.name === optionType && opt.value === optionValue
      );
      if (option) {
        total += parseFloat(option.price);
      }
    });
    return total;
  };

  const handleAddItemToOrder = () => {
    const selectedItem = menuItems.find((item: any) => item.id === selectedMenuItem);
    if (!selectedItem) return;

    const itemPrice = calculateItemPrice(selectedItem.price, selectedItemOptions);
    const newItem = {
      id: selectedItem.id,
      name: selectedItem.name,
      price: itemPrice,
      quantity: newItemQuantity,
      variants: selectedItemOptions
    };
    
    setEditedOrderItems([...editedOrderItems, newItem]);
    setSelectedMenuItem("");
    setAvailableItemOptions([]);
    setSelectedItemOptions({});
    setNewItemQuantity(1);
    toast({
      title: "Item Added",
      description: `${selectedItem.name} added to order`,
    });
  };

  const handleDeleteItem = () => {
    if (!itemToDelete) return;

    if (editedOrderItems.length === 1) {
      toast({
        title: "Cannot Remove Item",
        description: "Order must have at least one item",
        variant: "destructive",
      });
      setItemToDelete(null);
      return;
    }

    const updatedItems = editedOrderItems.filter((_, index) => index !== itemToDelete.index);
    setEditedOrderItems(updatedItems);
    toast({
      title: "Item Removed",
      description: `${itemToDelete.name} removed from order`,
    });
    setItemToDelete(null);
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Current location:", position.coords);
          // Handle location update for store
        },
        (error) => {
          console.error("Location error:", error);
        }
      );
    }
  };

  return (
    <div>
      {/* Merchant Header */}
      <section className="bg-card border-b border-border py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Store Info */}
            <div className="flex items-center space-x-4">
              <div className="relative group">
                {userRestaurant?.image ? (
                  <img 
                    src={userRestaurant.image} 
                    alt={userRestaurant.name}
                    className="w-16 h-16 object-cover rounded-xl"
                    data-testid="img-restaurant-photo"
                  />
                ) : (
                  <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center">
                    <Store className="text-muted-foreground" size={32} />
                  </div>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  onClick={() => {
                    setRestaurantImagePreview(userRestaurant?.image || '');
                    setIsRestaurantPhotoDialogOpen(true);
                  }}
                  data-testid="button-change-restaurant-photo"
                >
                  <Camera className="h-4 w-4 mr-1" />
                  Change
                </Button>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  {userRestaurant?.name || "Your Restaurant"}
                </h3>
                <p className="text-muted-foreground">
                  {userRestaurant?.address || "Set your restaurant address"}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={user?.approvalStatus === 'approved' && userRestaurant?.isActive ? "default" : "secondary"}>
                    {user?.approvalStatus === 'approved' && userRestaurant?.isActive ? "Open" : "Closed"}
                  </Badge>
                  <InlineMerchantRating merchantId={user?.id} />
                </div>
              </div>
            </div>

            {/* Store Stats and Controls */}
            <div className="flex flex-col lg:flex-row items-center gap-4">
              {/* Open/Close Toggle for Approved Merchants */}
              {user?.approvalStatus === 'approved' && userRestaurant && (
                <Card className="w-full lg:w-auto">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Power className={`h-5 w-5 ${userRestaurant.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Restaurant Status</p>
                        <p className="text-xs text-muted-foreground">
                          {userRestaurant.isActive ? 'Accepting Orders' : 'Not Accepting Orders'}
                        </p>
                      </div>
                      <Button
                        variant={userRestaurant.isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleRestaurantStatusMutation.mutate({ 
                          restaurantId: userRestaurant.id, 
                          isActive: !userRestaurant.isActive 
                        })}
                        disabled={toggleRestaurantStatusMutation.isPending}
                        data-testid="button-toggle-restaurant-status"
                        className={userRestaurant.isActive ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {userRestaurant.isActive ? "Close" : "Open"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-sm text-muted-foreground">Today's Orders</p>
                    <p className="text-xl font-bold text-foreground">{todayOrders.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-xl font-bold text-foreground">₱{todayRevenue.toFixed(0)}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Approval Status Banner */}
      {user?.approvalStatus !== 'approved' && (
        <section className="bg-background py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {user?.approvalStatus === 'pending' && (
              <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-700" data-testid="alert-pending-approval">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <AlertTitle className="text-yellow-800 dark:text-yellow-200 font-semibold">
                  Account Pending Approval
                </AlertTitle>
                <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                  Your merchant account is pending admin approval. You'll receive an email notification once approved.
                  <div className="mt-2 text-sm" data-testid="text-submission-date">
                    <strong>Submission Date:</strong> {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Not available'}
                  </div>
                  <div className="mt-2 text-sm">
                    While waiting, your restaurant is set to <strong>Closed</strong> and menu management is disabled.
                  </div>
                </AlertDescription>
              </Alert>
            )}
            {user?.approvalStatus === 'rejected' && (
              <Alert className="border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-700" data-testid="alert-rejected">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <AlertTitle className="text-red-800 dark:text-red-200 font-semibold">
                  Application Rejected
                </AlertTitle>
                <AlertDescription className="text-red-700 dark:text-red-300">
                  Your merchant application was rejected.
                  {user.rejectionReason && (
                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded text-sm" data-testid="text-rejection-reason">
                      <strong>Reason:</strong> {user.rejectionReason}
                    </div>
                  )}
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      onClick={() => requestReapprovalMutation.mutate()}
                      disabled={requestReapprovalMutation.isPending}
                      data-testid="button-request-reapproval"
                    >
                      Request Approval Again
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </section>
      )}

      {/* Success Message for Approved Merchants (shown once) */}
      {user?.approvalStatus === 'approved' && userRestaurant && !isApprovalNotificationDismissed && (
        <section className="bg-background py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Alert className="relative border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-700" data-testid="alert-approved">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-200 font-semibold pr-8">
                Account Approved!
              </AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                Your account is approved! You can now add menu items and manage your restaurant. Change your restaurant status to <strong>Open</strong> when you're ready to accept orders.
              </AlertDescription>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0 text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 hover:bg-green-100 dark:hover:bg-green-900"
                onClick={handleDismissApprovalNotification}
                data-testid="button-dismiss-approval-notification"
              >
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          </div>
        </section>
      )}

      {/* Navigation Tabs */}
      <section className="bg-background py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="w-full md:grid md:grid-cols-5">
              <TabsTrigger value="orders" data-testid="tab-orders">
                <Package className="w-4 h-4 mr-2" />
                Active Orders
                {activeOrders.length > 0 && (
                  <Badge className="ml-2">{activeOrders.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="menu" data-testid="tab-menu" disabled={user?.approvalStatus !== 'approved'}>
                <Utensils className="w-4 h-4 mr-2" />
                Menu Management
              </TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">
                <History className="w-4 h-4 mr-2" />
                Order History
              </TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">
                <BarChart3 className="w-4 h-4 mr-2" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="profile" data-testid="tab-profile">
                <User className="w-4 h-4 mr-2" />
                My Account
              </TabsTrigger>
            </TabsList>

            {/* Active Orders */}
            <TabsContent value="orders" className="space-y-4">
              {activeOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No active orders</p>
                  </CardContent>
                </Card>
              ) : (
                activeOrders.map((order: Order) => (
                  <Card key={order.id} data-testid={`order-${order.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-yellow-500 bg-opacity-10 p-2 rounded-lg">
                            <Clock className="text-yellow-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{order.orderNumber}</h4>
                            <p className="text-sm text-muted-foreground">
                              Ordered {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge 
                            variant={order.status === 'ready' ? 'default' : 'secondary'}
                          >
                            {order.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {order.status === 'preparing' && (
                            <Button 
                              onClick={() => markOrderReady(order.id)}
                              disabled={updateOrderMutation.isPending}
                              data-testid={`button-ready-${order.id}`}
                            >
                              Ready for Pickup
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-medium text-foreground mb-3">Order Items</h5>
                          <div className="space-y-2">
                            {order.items?.map((item: any, index: number) => (
                              <div key={index} className="space-y-1">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-foreground font-medium">
                                    {item.quantity}x {item.name}
                                  </span>
                                  <span className="text-foreground font-medium">₱{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                                </div>
                                {item.selectedOptions && item.selectedOptions.length > 0 && (
                                  <div className="ml-6 space-y-0.5">
                                    {item.selectedOptions.map((opt: any, optIdx: number) => (
                                      <div key={optIdx} className="flex justify-between text-xs text-muted-foreground" data-testid={`text-option-${index}-${optIdx}`}>
                                        <span>{opt.optionTypeName}: {opt.valueName}</span>
                                        {opt.price > 0 && <span>(₱{opt.price.toFixed(2)})</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                            <hr className="border-border" />
                            <div className="flex justify-between items-center font-medium">
                              <span className="text-foreground">Items Total</span>
                              <span className="text-foreground">₱{order.subtotal}</span>
                            </div>
                            <div className="flex justify-between items-center bg-green-50 dark:bg-green-950 p-2 rounded mt-2">
                              <span className="font-semibold text-green-700 dark:text-green-400">Your Earnings</span>
                              <span className="font-bold text-green-700 dark:text-green-400">₱{order.merchantEarningsAmount || order.subtotal}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-foreground mb-3">Customer Details</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center text-muted-foreground">
                              <User className="mr-2 h-4 w-4" />
                              {order.customer?.name || 'Unknown Customer'}
                            </div>
                            <div className="flex items-center text-muted-foreground">
                              <Phone className="mr-2 h-4 w-4" />
                              {order.customer?.phone || 'No phone'}
                            </div>
                            <div className="flex items-center text-muted-foreground">
                              <MapPin className="mr-2 h-4 w-4" />
                              {order.customer?.address || 'No address'}
                            </div>
                            {order.rider && (
                              <div className="flex items-center text-muted-foreground">
                                <User className="mr-2 h-4 w-4" />
                                Rider: {order.rider.name}
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => {
                                setEditingOrder(order);
                                setEditedOrderItems(JSON.parse(JSON.stringify(order.items)));
                                setIsEditOrderOpen(true);
                              }}
                              data-testid={`button-edit-order-${order.id}`}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Order
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => setMarkingUnavailableOrder(order)}
                              data-testid={`button-mark-unavailable-${order.id}`}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Mark Unavailable
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Menu Management */}
            <TabsContent value="menu" className="space-y-4">
              {!userRestaurant ? (
                <div className="text-center py-12">
                  <Store className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Restaurant Found</h3>
                  <p className="text-muted-foreground mb-4">
                    You need to have a restaurant associated with your account to manage menu items.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Please contact support to set up your restaurant profile.
                  </p>
                </div>
              ) : user?.approvalStatus !== 'approved' ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Menu Management Disabled</h3>
                    <p className="text-muted-foreground">
                      {user?.approvalStatus === 'pending' 
                        ? 'Your account is pending approval. Menu management will be enabled once your account is approved by an administrator.'
                        : 'Menu management is not available. Please contact support for assistance.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Menu Groups Section */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Menu Groups</CardTitle>
                        <Button size="sm" onClick={handleOpenCreateGroup} data-testid="button-create-group">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Group
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Organize your menu items into custom groups like "Best Sellers", "Breakfast Menu", etc.
                      </p>
                    </CardHeader>
                    <CardContent>
                      {menuGroups.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No groups yet. Create your first group to organize your menu.</p>
                        </div>
                      ) : (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleGroupDragEnd}
                        >
                          <SortableContext
                            items={menuGroups.map((g: any) => g.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-4">
                              {menuGroups.map((group: any) => (
                                <SortableMenuGroup
                                  key={group.id}
                                  group={group}
                                  onEdit={handleOpenEditGroup}
                                  onDelete={setDeletingGroup}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}
                    </CardContent>
                  </Card>

                  {/* Create Group Dialog */}
                  <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create New Menu Group</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="group-name">Group Name *</Label>
                          <Input
                            id="group-name"
                            placeholder="e.g., Best Sellers, Breakfast Menu"
                            value={groupForm.groupName}
                            onChange={(e) => setGroupForm(prev => ({ ...prev, groupName: e.target.value }))}
                            data-testid="input-group-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="group-description">Description (Optional)</Label>
                          <Textarea
                            id="group-description"
                            placeholder="Brief description of this group"
                            value={groupForm.description}
                            onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
                            data-testid="textarea-group-description"
                          />
                        </div>
                        <div>
                          <Label>Add Items to Group</Label>
                          <p className="text-xs text-muted-foreground mb-3">
                            Select items to include in this group. Items can be in multiple groups.
                          </p>
                          <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                            {menuItems.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No menu items available. Add menu items first.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {menuItems.map((item: any) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                                    onClick={() => toggleItemInGroup(item.id)}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={groupForm.selectedItems.includes(item.id)}
                                      onChange={() => toggleItemInGroup(item.id)}
                                      className="cursor-pointer"
                                      data-testid={`checkbox-item-${item.id}`}
                                    />
                                    <span className="flex-1">{item.name}</span>
                                    <span className="text-sm text-muted-foreground">₱{item.price}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {groupForm.selectedItems.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {groupForm.selectedItems.length} item(s) selected
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsCreateGroupOpen(false)}
                            data-testid="button-cancel-create-group"
                          >
                            Cancel
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={handleSubmitGroup}
                            disabled={createMenuGroupMutation.isPending}
                            data-testid="button-save-group"
                          >
                            {createMenuGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Group Dialog */}
                  <Dialog open={isEditGroupOpen} onOpenChange={setIsEditGroupOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Menu Group</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="edit-group-name">Group Name *</Label>
                          <Input
                            id="edit-group-name"
                            placeholder="e.g., Best Sellers, Breakfast Menu"
                            value={groupForm.groupName}
                            onChange={(e) => setGroupForm(prev => ({ ...prev, groupName: e.target.value }))}
                            data-testid="input-edit-group-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-group-description">Description (Optional)</Label>
                          <Textarea
                            id="edit-group-description"
                            placeholder="Brief description of this group"
                            value={groupForm.description}
                            onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
                            data-testid="textarea-edit-group-description"
                          />
                        </div>
                        <div>
                          <Label>Add Items to Group</Label>
                          <p className="text-xs text-muted-foreground mb-3">
                            Select items to include in this group. Items can be in multiple groups.
                          </p>
                          <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                            {menuItems.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No menu items available.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {menuItems.map((item: any) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                                    onClick={() => toggleItemInGroup(item.id)}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={groupForm.selectedItems.includes(item.id)}
                                      onChange={() => toggleItemInGroup(item.id)}
                                      className="cursor-pointer"
                                      data-testid={`checkbox-edit-item-${item.id}`}
                                    />
                                    <span className="flex-1">{item.name}</span>
                                    <span className="text-sm text-muted-foreground">₱{item.price}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {groupForm.selectedItems.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {groupForm.selectedItems.length} item(s) selected
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsEditGroupOpen(false)}
                            data-testid="button-cancel-edit-group"
                          >
                            Cancel
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={handleUpdateGroup}
                            disabled={updateMenuGroupMutation.isPending}
                            data-testid="button-update-group"
                          >
                            {updateMenuGroupMutation.isPending ? 'Updating...' : 'Update Group'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Delete Group Confirmation Dialog */}
                  <AlertDialog open={!!deletingGroup} onOpenChange={(open) => !open && setDeletingGroup(null)}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Menu Group</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{deletingGroup?.groupName}"? This will not delete the items, just the group organization.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-delete-group">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          data-testid="button-confirm-delete-group"
                          onClick={() => deletingGroup && deleteMenuGroupMutation.mutate(deletingGroup.id)}
                          disabled={deleteMenuGroupMutation.isPending}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          {deleteMenuGroupMutation.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Separator className="my-6" />

                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Menu Items</h3>
                    <Dialog open={isAddMenuItemOpen} onOpenChange={setIsAddMenuItemOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-add-menu-item">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Menu Item
                        </Button>
                      </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Menu Item</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="item-name">Item Name</Label>
                        <Input 
                          id="item-name" 
                          data-testid="input-item-name"
                          placeholder="Enter item name" 
                          value={menuItemForm.name}
                          onChange={(e) => updateMenuItemForm('name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="item-description">Description</Label>
                        <Textarea 
                          id="item-description" 
                          data-testid="textarea-item-description"
                          placeholder="Describe your item" 
                          value={menuItemForm.description}
                          onChange={(e) => updateMenuItemForm('description', e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="item-price">Price (₱)</Label>
                          <Input 
                            id="item-price" 
                            data-testid="input-item-price"
                            type="number" 
                            placeholder="0.00" 
                            value={menuItemForm.price}
                            onChange={(e) => updateMenuItemForm('price', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="item-category">Category</Label>
                          <Select 
                            value={menuItemForm.category} 
                            onValueChange={(value) => updateMenuItemForm('category', value)}
                          >
                            <SelectTrigger id="item-category" data-testid="select-item-category">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories?.filter((cat: any) => cat && cat.isActive).map((category: any) => (
                                <SelectItem key={category.id} value={category.name} data-testid={`option-category-${category.id}`}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Image Upload */}
                      <div>
                        <Label htmlFor="item-image">Menu Item Image (Optional)</Label>
                        <Input 
                          id="item-image" 
                          data-testid="input-item-image"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleImageSelect}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Max 5MB. Formats: JPEG, PNG, WebP
                        </p>
                        {imagePreview && (
                          <div className="mt-3">
                            <img 
                              src={imagePreview} 
                              alt="Preview" 
                              className="w-full h-40 object-cover rounded-md border"
                              data-testid="img-item-preview"
                            />
                          </div>
                        )}
                      </div>

                      {/* Product Options Section */}
                      {activeOptionTypes.length > 0 && (
                        <div className="space-y-3">
                          <Label>Product Options (Optional)</Label>
                          <p className="text-xs text-muted-foreground">
                            Drag option types to reorder how they appear to customers
                          </p>
                          
                          {/* Add New Option Type Dropdown */}
                          {activeOptionTypes.filter((type: any) => 
                            !selectedOptionTypes.find(st => st.id === type.id.toString())
                          ).length > 0 && (
                            <Select onValueChange={(value) => {
                              const type = activeOptionTypes.find((t: any) => t.id.toString() === value);
                              if (type) addOptionType(type.id, type.name);
                            }}>
                              <SelectTrigger data-testid="select-add-option-type">
                                <SelectValue placeholder="+ Add option type..." />
                              </SelectTrigger>
                              <SelectContent>
                                {activeOptionTypes
                                  .filter((type: any) => !selectedOptionTypes.find(st => st.id === type.id.toString()))
                                  .map((optionType: any) => (
                                    <SelectItem key={optionType.id} value={optionType.id.toString()}>
                                      {optionType.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}
                          
                          {/* Display selected option types with drag-and-drop */}
                          {selectedOptionTypes.length > 0 && (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleDragEnd}
                            >
                              <SortableContext
                                items={selectedOptionTypes.map(t => t.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-3">
                                  {selectedOptionTypes.map((selectedType) => (
                                    <SortableOptionType
                                      key={selectedType.id}
                                      selectedType={selectedType}
                                      optionValues={optionValues}
                                      updateOptionValue={updateOptionValue}
                                      removeOptionValue={removeOptionValue}
                                      addOptionValue={addOptionValue}
                                      removeOptionType={removeOptionType}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          )}
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          data-testid="button-cancel"
                          onClick={() => { setIsAddMenuItemOpen(false); setOptionValues([]); setSelectedOptionTypes([]); }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          className="flex-1"
                          data-testid="button-add-item"
                          onClick={handleSubmitMenuItem}
                          disabled={createMenuItemMutation.isPending}
                        >
                          {createMenuItemMutation.isPending ? 'Adding...' : 'Add Item'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Edit Menu Item Dialog */}
              <Dialog open={isEditMenuItemOpen} onOpenChange={setIsEditMenuItemOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Menu Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-item-name">Item Name</Label>
                      <Input 
                        id="edit-item-name" 
                        data-testid="input-edit-item-name"
                        placeholder="Enter item name" 
                        value={menuItemForm.name}
                        onChange={(e) => updateMenuItemForm('name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-item-description">Description</Label>
                      <Textarea 
                        id="edit-item-description" 
                        data-testid="textarea-edit-item-description"
                        placeholder="Describe your item" 
                        value={menuItemForm.description}
                        onChange={(e) => updateMenuItemForm('description', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-item-price">Price (₱)</Label>
                        <Input 
                          id="edit-item-price" 
                          data-testid="input-edit-item-price"
                          type="number" 
                          placeholder="0.00" 
                          value={menuItemForm.price}
                          onChange={(e) => updateMenuItemForm('price', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-item-category">Category</Label>
                        <Select 
                          value={menuItemForm.category} 
                          onValueChange={(value) => updateMenuItemForm('category', value)}
                        >
                          <SelectTrigger id="edit-item-category" data-testid="select-edit-item-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories?.filter((cat: any) => cat && cat.isActive).map((category: any) => (
                              <SelectItem key={category.id} value={category.name} data-testid={`option-edit-category-${category.id}`}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div>
                      <Label htmlFor="edit-item-image">Menu Item Image</Label>
                      <Input 
                        id="edit-item-image" 
                        data-testid="input-edit-item-image"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageSelect}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Max 5MB. Formats: JPEG, PNG, WebP. Upload a new image to replace current.
                      </p>
                      {imagePreview && (
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-2">
                            {selectedImage ? 'New Image Preview:' : 'Current Image:'}
                          </p>
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="w-full h-40 object-cover rounded-md border"
                            data-testid="img-edit-item-preview"
                          />
                        </div>
                      )}
                    </div>

                    {/* Product Options Section */}
                    {activeOptionTypes.length > 0 && (
                      <div className="space-y-3">
                        <Label>Product Options (Optional)</Label>
                        <p className="text-xs text-muted-foreground">
                          Drag option types to reorder how they appear to customers
                        </p>
                        
                        {/* Add New Option Type Dropdown */}
                        {activeOptionTypes.filter((type: any) => 
                          !selectedOptionTypes.find(st => st.id === type.id.toString())
                        ).length > 0 && (
                          <Select onValueChange={(value) => {
                            const type = activeOptionTypes.find((t: any) => t.id.toString() === value);
                            if (type) addOptionType(type.id, type.name);
                          }}>
                            <SelectTrigger data-testid="select-edit-add-option-type">
                              <SelectValue placeholder="+ Add option type..." />
                            </SelectTrigger>
                            <SelectContent>
                              {activeOptionTypes
                                .filter((type: any) => !selectedOptionTypes.find(st => st.id === type.id.toString()))
                                .map((optionType: any) => (
                                  <SelectItem key={optionType.id} value={optionType.id.toString()}>
                                    {optionType.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        {/* Display selected option types with drag-and-drop */}
                        {selectedOptionTypes.length > 0 && (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={selectedOptionTypes.map(t => t.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-3">
                                {selectedOptionTypes.map((selectedType) => (
                                  <SortableOptionType
                                    key={selectedType.id}
                                    selectedType={selectedType}
                                    optionValues={optionValues}
                                    updateOptionValue={updateOptionValue}
                                    removeOptionValue={removeOptionValue}
                                    addOptionValue={addOptionValue}
                                    removeOptionType={removeOptionType}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )}
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        data-testid="button-cancel-edit"
                        onClick={() => { setIsEditMenuItemOpen(false); setOptionValues([]); setSelectedOptionTypes([]); }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        className="flex-1"
                        data-testid="button-save-edit"
                        onClick={handleSubmitEditMenuItem}
                        disabled={updateMenuItemMutation.isPending}
                      >
                        {updateMenuItemMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Delete Menu Item Confirmation Dialog */}
              <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{deletingItem?.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      data-testid="button-confirm-delete"
                      onClick={() => deletingItem && deleteMenuItemMutation.mutate(deletingItem.id)}
                      disabled={deleteMenuItemMutation.isPending}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {deleteMenuItemMutation.isPending ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {menuItems.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">
                      No menu items found. Add your first menu item to get started.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {menuItems.map((item: any) => (
                    <Card key={item.id} data-testid={`card-menu-item-${item.id}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          {/* Menu Item Image */}
                          <div className="flex-shrink-0">
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-20 h-20 object-cover rounded-lg"
                                data-testid={`img-merchant-menu-item-${item.id}`}
                              />
                            ) : (
                              <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                                <Utensils className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Menu Item Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground" data-testid={`text-item-name-${item.id}`}>
                              {item.name}
                            </h4>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2" data-testid={`text-item-description-${item.id}`}>
                                {item.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2">
                              <span className="font-medium text-foreground" data-testid={`text-item-price-${item.id}`}>
                                ₱{parseFloat(item.price).toFixed(2)}
                              </span>
                              {item.category && (
                                <Badge variant="secondary" data-testid={`badge-item-category-${item.id}`}>
                                  {item.category}
                                </Badge>
                              )}
                              <Badge 
                                variant={item.isAvailable ? "default" : "destructive"}
                                data-testid={`badge-item-status-${item.id}`}
                              >
                                {item.isAvailable ? "Available" : "Unavailable"}
                              </Badge>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 flex-shrink-0 w-full md:w-auto justify-end md:justify-start">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              data-testid={`button-edit-item-${item.id}`}
                              onClick={() => handleEditMenuItem(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              data-testid={`button-toggle-availability-${item.id}`}
                              onClick={() => handleToggleAvailability(item)}
                              disabled={toggleAvailabilityMutation.isPending}
                            >
                              {item.isAvailable ? "Disable" : "Enable"}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              data-testid={`button-delete-item-${item.id}`}
                              onClick={() => setDeletingItem(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
                </>
              )}
            </TabsContent>

            {/* Order History */}
            <TabsContent value="history" className="space-y-4">
              {historicalOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No order history yet</p>
                  </CardContent>
                </Card>
              ) : (
                historicalOrders.map((order: Order) => (
                  <Card key={order.id} data-testid={`history-order-${order.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">Order #{order.orderNumber}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge 
                          variant={
                            order.status === 'delivered' ? 'default' : 
                            order.status === 'cancelled' ? 'destructive' : 
                            'secondary'
                          }
                          data-testid={`status-badge-${order.id}`}
                        >
                          {order.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <p className="text-sm">
                          <span className="font-medium">Customer:</span> {order.customer?.name || 'Unknown'}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Address:</span> {order.customer?.address || 'N/A'}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Phone:</span> {order.customer?.phone || 'N/A'}
                        </p>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">Order Items:</h4>
                        {order.items && order.items.length > 0 ? (
                          <ul className="space-y-1">
                            {order.items.map((item: any, idx: number) => (
                              <li key={idx} className="text-sm flex justify-between">
                                <span>{item.quantity}x {item.name}</span>
                                <span>₱{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">No items</p>
                        )}
                        
                        <div className="mt-4 pt-4 border-t space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Items Total:</span>
                            <span className="font-semibold">₱{order.subtotal}</span>
                          </div>
                          <div className="flex justify-between items-center bg-green-50 dark:bg-green-950 p-2 rounded">
                            <span className="font-semibold text-green-700 dark:text-green-400">Your Earnings</span>
                            <span className="font-bold text-green-700 dark:text-green-400">₱{order.merchantEarningsAmount || order.subtotal}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Analytics - Earnings History */}
            <TabsContent value="analytics" className="space-y-4">
              <MerchantEarningsHistory />
            </TabsContent>

            {/* My Account Tab */}
            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">My Account</h2>
                    {!isEditingProfile ? (
                      <Button onClick={() => setIsEditingProfile(true)} data-testid="button-edit-profile">
                        Edit Profile
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
                              storeName: editedStoreName,
                              storeContact: editedStoreContact,
                              storeAddress: editedStoreAddress,
                              email: editedEmail,
                              latitude: editedLatitude,
                              longitude: editedLongitude
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
                    {/* Restaurant Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Restaurant Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Store Name</label>
                          {isEditingProfile ? (
                            <Input
                              value={editedStoreName}
                              onChange={(e) => setEditedStoreName(e.target.value)}
                              placeholder="Enter store name"
                              data-testid="input-edit-store-name"
                            />
                          ) : (
                            <p className="text-base font-medium" data-testid="text-store-name">
                              {userRestaurant?.name || "-"}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Store Contact No.</label>
                          {isEditingProfile ? (
                            <Input
                              type="tel"
                              value={editedStoreContact}
                              onChange={(e) => setEditedStoreContact(e.target.value)}
                              placeholder="09XXXXXXXXX"
                              data-testid="input-edit-store-contact"
                            />
                          ) : (
                            <p className="text-base font-medium" data-testid="text-store-contact">
                              {userRestaurant?.phone || "-"}
                            </p>
                          )}
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm text-muted-foreground">Store Address</label>
                          {isEditingProfile ? (
                            <Input
                              value={editedStoreAddress}
                              onChange={(e) => setEditedStoreAddress(e.target.value)}
                              placeholder="Enter store address"
                              data-testid="input-edit-store-address"
                            />
                          ) : (
                            <p className="text-base font-medium" data-testid="text-store-address">
                              {userRestaurant?.address || "-"}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Store Location Map - Only show when editing */}
                      {isEditingProfile && (
                        <div className="mt-6 space-y-3 p-4 bg-muted/50 rounded-lg border-2 border-primary/20">
                          <Label className="flex items-center gap-2 text-base font-semibold">
                            <MapPin className="h-5 w-5 text-primary" />
                            Update Store Location on Map
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Click anywhere on the map or drag the pin to update your exact store location for accurate delivery calculations.
                          </p>

                          <div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleProfileUseCurrentLocation}
                              disabled={isGeolocating}
                              data-testid="button-profile-use-location"
                              className="w-full"
                            >
                              <Navigation className="h-4 w-4 mr-2" />
                              {isGeolocating ? "Getting Location..." : "Use Current Location"}
                            </Button>
                          </div>

                          {/* Map Container */}
                          <div
                            ref={profileMapContainerRef}
                            className="h-80 w-full rounded-lg border-2 border-border overflow-hidden"
                            style={{ minHeight: '320px', position: 'relative', zIndex: 1 }}
                            data-testid="profile-map-container"
                          />

                          {/* Display coordinates */}
                          <div className="flex items-center gap-2 p-3 bg-background rounded-md border">
                            <MapPin className="h-4 w-4 text-primary" />
                            <div className="flex-1 text-sm">
                              <span className="font-medium">Store Pin Location: </span>
                              <span className="text-muted-foreground">
                                Lat: {editedLatitude}, Lng: {editedLongitude}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Rating Information */}
                    <MerchantRatingDisplay merchantId={user?.id} />

                    <Separator />

                    {/* Owner Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Owner Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Owner Name</label>
                          <p className="text-base font-medium" data-testid="text-owner-name">
                            {user?.firstName} {user?.middleName} {user?.lastName}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Account Status</label>
                          <div className="flex items-center gap-2">
                            <Badge variant={user?.approvalStatus === 'approved' ? 'default' : 'secondary'} data-testid="badge-approval-status">
                              {user?.approvalStatus === 'approved' ? 'Active' : user?.approvalStatus || 'Pending'}
                            </Badge>
                            {userRestaurant?.isActive && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200" data-testid="badge-restaurant-status">
                                Open
                              </Badge>
                            )}
                            {userRestaurant && !userRestaurant.isActive && (
                              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200" data-testid="badge-restaurant-status">
                                Closed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Rating Information */}
                    <MerchantRatingDisplay merchantId={user?.id} />

                    <Separator />

                    {/* Owner Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Owner Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Owner Name</label>
                          <p className="text-base font-medium" data-testid="text-owner-name">
                            {user?.firstName} {user?.middleName} {user?.lastName}
                          </p>
                        </div>
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
                          <label className="text-sm text-muted-foreground">Account Created</label>
                          <p className="text-base font-medium" data-testid="text-created-date">
                            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Business Summary */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Business Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground">Total Orders</p>
                          <p className="text-2xl font-bold" data-testid="text-total-orders">
                            {orders.filter((order: Order) => order.status === 'delivered').length}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Delivered</p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground">Cancelled Orders</p>
                          <p className="text-2xl font-bold" data-testid="text-cancelled-orders">
                            {orders.filter((order: Order) => order.status === 'cancelled').length}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">All time</p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground">Menu Items</p>
                          <p className="text-2xl font-bold" data-testid="text-total-menu-items">
                            {menuItems.length}
                          </p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-sm text-muted-foreground">Total Revenue</p>
                          <p className="text-2xl font-bold" data-testid="text-total-revenue">
                            ₱{orders.filter((order: Order) => order.status === 'delivered').reduce((sum: number, order: Order) => sum + parseFloat(order.subtotal || '0'), 0).toFixed(0)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Delivered only</p>
                        </Card>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Mark Unavailable Confirmation Dialog */}
          <AlertDialog open={!!markingUnavailableOrder} onOpenChange={(open) => !open && setMarkingUnavailableOrder(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mark Order Unavailable?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will cancel order #{markingUnavailableOrder?.orderNumber} and notify the customer and rider that the order is unavailable. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-mark-unavailable">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  data-testid="button-confirm-mark-unavailable"
                  onClick={() => markingUnavailableOrder && markOrderUnavailableMutation.mutate(markingUnavailableOrder.id)}
                  disabled={markOrderUnavailableMutation.isPending}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {markOrderUnavailableMutation.isPending ? 'Cancelling...' : 'Mark Unavailable'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Edit Order Dialog */}
          <Dialog open={isEditOrderOpen} onOpenChange={(open) => {
            setIsEditOrderOpen(open);
            if (!open) {
              setShowAddItemsSection(false);
              setSelectedMenuItem("");
            }
          }}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Order #{editingOrder?.orderNumber}</DialogTitle>
              </DialogHeader>
              {editingOrder && (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Edit Order Items</AlertTitle>
                    <AlertDescription>
                      Add, remove, or modify items in the order. The customer will be notified of any changes. Orders must have at least one item.
                    </AlertDescription>
                  </Alert>

                  {/* Existing Order Items */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Current Order Items</h4>
                    {editedOrderItems.map((item: any, index: number) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h4 className="font-medium">{item.name}</h4>
                                <p className="text-sm text-muted-foreground">₱{item.price} each</p>
                                {item.variants && Object.keys(item.variants).length > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {Object.entries(item.variants).map(([key, value]) => `${key}: ${value}`).join(', ')}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`qty-${index}`} className="text-sm">Qty:</Label>
                                <Input
                                  id={`qty-${index}`}
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    if (value >= 1) {
                                      const newItems = [...editedOrderItems];
                                      newItems[index].quantity = value;
                                      setEditedOrderItems(newItems);
                                    }
                                  }}
                                  className="w-20"
                                  data-testid={`input-qty-${index}`}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setItemToDelete({ index, name: item.name })}
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  data-testid={`button-delete-item-${index}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Replace Item Option */}
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Label className="text-xs text-muted-foreground">Replace with:</Label>
                              <Select
                                value={item.id}
                                onValueChange={(newMenuItemId) => {
                                  const newMenuItem = menuItems.find((mi: any) => mi.id === newMenuItemId);
                                  if (newMenuItem) {
                                    const newItems = [...editedOrderItems];
                                    newItems[index] = {
                                      id: newMenuItem.id,
                                      name: newMenuItem.name,
                                      price: newMenuItem.price,
                                      quantity: item.quantity // Keep the same quantity
                                    };
                                    setEditedOrderItems(newItems);
                                    toast({
                                      title: "Item Replaced",
                                      description: `Replaced with ${newMenuItem.name}`,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs" data-testid={`select-replace-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {menuItems.filter((menuItem: any) => menuItem.isAvailable).map((menuItem: any) => (
                                    <SelectItem key={menuItem.id} value={menuItem.id}>
                                      {menuItem.name} - ₱{menuItem.price}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Add New Items Section */}
                  {!showAddItemsSection ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowAddItemsSection(true)}
                      data-testid="button-show-add-items"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Menu Items to Order
                    </Button>
                  ) : (
                    <Card className="border-2 border-primary">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Add Menu Item</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowAddItemsSection(false);
                              setSelectedMenuItem("");
                              setAvailableItemOptions([]);
                              setSelectedItemOptions({});
                              setNewItemQuantity(1);
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          {/* Menu Item Selection */}
                          <div>
                            <Label>Select Menu Item</Label>
                            <Select 
                              value={selectedMenuItem} 
                              onValueChange={(value) => {
                                setSelectedMenuItem(value);
                                setSelectedItemOptions({});
                                setNewItemQuantity(1);
                                if (value) {
                                  fetchItemOptions(value);
                                } else {
                                  setAvailableItemOptions([]);
                                }
                              }}
                            >
                              <SelectTrigger data-testid="select-menu-item">
                                <SelectValue placeholder="Choose an item from your menu" />
                              </SelectTrigger>
                              <SelectContent>
                                {menuItems.filter((menuItem: any) => menuItem.isAvailable).map((menuItem: any) => (
                                  <SelectItem key={menuItem.id} value={menuItem.id}>
                                    {menuItem.name} - ₱{menuItem.price}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Options Selection (grouped by type) */}
                          {selectedMenuItem && availableItemOptions.length > 0 && (() => {
                            const optionsByType = availableItemOptions.reduce((acc: any, option: any) => {
                              const typeName = option.optionType.name;
                              if (!acc[typeName]) acc[typeName] = [];
                              acc[typeName].push(option);
                              return acc;
                            }, {});

                            return (
                              <div className="space-y-3">
                                <h5 className="text-sm font-medium">Customize Options</h5>
                                {Object.entries(optionsByType).map(([typeName, options]: [string, any]) => (
                                  <div key={typeName}>
                                    <Label className="text-sm">{typeName}</Label>
                                    <Select
                                      value={selectedItemOptions[typeName] || ""}
                                      onValueChange={(value) => {
                                        setSelectedItemOptions(prev => ({
                                          ...prev,
                                          [typeName]: value
                                        }));
                                      }}
                                    >
                                      <SelectTrigger className="mt-1">
                                        <SelectValue placeholder={`Choose ${typeName.toLowerCase()}`} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {options.map((opt: any) => (
                                          <SelectItem key={opt.id} value={opt.value}>
                                            {opt.value} {parseFloat(opt.price) > 0 && `(+₱${parseFloat(opt.price).toFixed(2)})`}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}

                          {/* Quantity and Price */}
                          {selectedMenuItem && (() => {
                            const selectedItem = menuItems.find((item: any) => item.id === selectedMenuItem);
                            const itemPrice = selectedItem ? calculateItemPrice(selectedItem.price, selectedItemOptions) : 0;
                            const totalPrice = itemPrice * newItemQuantity;

                            return (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label>Quantity</Label>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setNewItemQuantity(Math.max(1, newItemQuantity - 1))}
                                      disabled={newItemQuantity <= 1}
                                    >
                                      -
                                    </Button>
                                    <span className="w-12 text-center font-medium">{newItemQuantity}</span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setNewItemQuantity(newItemQuantity + 1)}
                                    >
                                      +
                                    </Button>
                                  </div>
                                </div>

                                <div className="bg-muted p-3 rounded-lg">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="text-sm text-muted-foreground">Price per item</p>
                                      <p className="font-medium">₱{itemPrice.toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm text-muted-foreground">Total</p>
                                      <p className="text-lg font-bold text-primary">₱{totalPrice.toFixed(2)}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          <Button
                            onClick={handleAddItemToOrder}
                            disabled={!selectedMenuItem}
                            className="w-full"
                            data-testid="button-add-to-order"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add to Order
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Order Total */}
                  {editedOrderItems.length > 0 && (() => {
                    const orderTotal = editedOrderItems.reduce((sum, item) => {
                      return sum + (item.price * item.quantity);
                    }, 0);

                    return (
                      <Card className="bg-primary/5">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-muted-foreground">Order Total</p>
                              <p className="text-xs text-muted-foreground">{editedOrderItems.length} item(s)</p>
                            </div>
                            <p className="text-2xl font-bold text-primary">₱{orderTotal.toFixed(2)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  <div>
                    <Label htmlFor="edit-reason">Reason for Changes (will be sent to customer)</Label>
                    <Textarea
                      id="edit-reason"
                      placeholder="E.g., 'Item X is out of stock, replaced with similar item' or 'Adjusted quantity based on availability'"
                      className="mt-2"
                      data-testid="textarea-edit-reason"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditOrderOpen(false);
                        setEditingOrder(null);
                        setEditedOrderItems([]);
                      }}
                      data-testid="button-cancel-edit"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        const reason = (document.getElementById('edit-reason') as HTMLTextAreaElement)?.value || 'Order modified by merchant';
                        updateOrderItemsMutation.mutate({
                          orderId: editingOrder.id,
                          items: editedOrderItems,
                          reason
                        });
                      }}
                      disabled={updateOrderItemsMutation.isPending}
                      data-testid="button-save-order-changes"
                    >
                      {updateOrderItemsMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Item Confirmation Dialog */}
          <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Item from Order?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove "{itemToDelete?.name}" from this order? 
                  {editedOrderItems.length === 1 && " This is the last item - orders must have at least one item."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete-item">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteItem}
                  className="bg-destructive hover:bg-destructive/90"
                  data-testid="button-confirm-delete-item"
                >
                  Remove Item
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Restaurant Photo Upload Dialog */}
          <Dialog open={isRestaurantPhotoDialogOpen} onOpenChange={setIsRestaurantPhotoDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Restaurant Photo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="restaurant-photo">Restaurant Photo</Label>
                  <Input 
                    id="restaurant-photo" 
                    data-testid="input-restaurant-photo"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleRestaurantPhotoSelect}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max 5MB. Formats: JPEG, PNG. This photo will be displayed on the customer app.
                  </p>
                  {restaurantImagePreview && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">
                        {selectedRestaurantImage ? 'New Photo Preview:' : 'Current Photo:'}
                      </p>
                      <img 
                        src={restaurantImagePreview} 
                        alt="Restaurant preview" 
                        className="w-full h-48 object-cover rounded-md border"
                        data-testid="img-restaurant-preview"
                      />
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setIsRestaurantPhotoDialogOpen(false);
                      setSelectedRestaurantImage(null);
                      setRestaurantImagePreview('');
                    }}
                    data-testid="button-cancel-restaurant-photo"
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleUploadRestaurantPhoto}
                    disabled={!selectedRestaurantImage}
                    data-testid="button-upload-restaurant-photo"
                  >
                    Upload Photo
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  );
}
