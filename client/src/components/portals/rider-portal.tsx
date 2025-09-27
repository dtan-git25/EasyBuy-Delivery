import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bike, Wallet, Clock, Star, MapPin, Phone, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
  const [riderStatus, setRiderStatus] = useState<'online' | 'offline'>('online');

  const { data: wallet } = useQuery({
    queryKey: ["/api/wallet"],
  });

  const { data: pendingOrders = [] } = useQuery({
    queryKey: ["/api/orders/pending"],
  });

  const { data: myOrders = [] } = useQuery({
    queryKey: ["/api/orders"],
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/pending"] });
    },
  });

  const acceptOrder = (orderId: string) => {
    updateOrderMutation.mutate({ orderId, status: 'accepted' });
  };

  const updateOrderStatus = (orderId: string, status: string) => {
    updateOrderMutation.mutate({ orderId, status });
  };

  const toggleStatus = () => {
    setRiderStatus(prev => prev === 'online' ? 'offline' : 'online');
  };

  const activeOrders = myOrders.filter((order: any) => 
    ['accepted', 'preparing', 'ready', 'picked_up'].includes(order.status)
  );

  const completedOrders = myOrders.filter((order: any) => 
    order.status === 'delivered'
  );

  const todayOrders = completedOrders.filter((order: any) => {
    const today = new Date().toDateString();
    const orderDate = new Date(order.createdAt).toDateString();
    return today === orderDate;
  });

  const todayEarnings = todayOrders.reduce((sum: number, order: any) => {
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
                data-testid="button-toggle-status"
              >
                {riderStatus === 'online' ? 'Go Offline' : 'Go Online'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Active for 3h 24m
              </p>
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
                    <p className="text-2xl font-bold text-foreground">{todayOrders.length}</p>
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
            <TabsList className="grid w-full grid-cols-3">
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
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingOrders.length === 0 ? (
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
                        <div className="flex space-x-3">
                          <Button 
                            variant="outline"
                            data-testid={`button-decline-${order.id}`}
                          >
                            Decline
                          </Button>
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
              {completedOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No completed orders yet</p>
                  </CardContent>
                </Card>
              ) : (
                completedOrders.map((order: any) => (
                  <Card key={order.id} data-testid={`completed-order-${order.id}`}>
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
          </Tabs>
        </div>
      </section>
    </div>
  );
}
