import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShoppingCart, DollarSign, Bike, Store, Download, Eye, Check, X, Clock, Users, TrendingUp, FileText, AlertCircle, Crown, UserPlus, Trash2, Mail, Phone, MapPin, Calendar, CheckCircle, Utensils } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CustomerManagement } from "@/components/customer-management";

const systemAccountSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(11, "Phone number must be at least 11 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "owner"]),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
});

type SystemAccountForm = z.infer<typeof systemAccountSchema>;

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  icon: z.string().optional(),
});

type CategoryForm = z.infer<typeof categorySchema>;

const optionTypeSchema = z.object({
  name: z.string().min(1, "Option type name is required"),
  description: z.string().optional(),
});

type OptionTypeForm = z.infer<typeof optionTypeSchema>;

function OptionTypeManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [editingOptionType, setEditingOptionType] = useState<any>(null);

  const { data: optionTypes = [] } = useQuery({
    queryKey: ["/api/option-types"],
  });

  const optionTypeForm = useForm<OptionTypeForm>({
    resolver: zodResolver(optionTypeSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createOptionTypeMutation = useMutation({
    mutationFn: async (data: OptionTypeForm) => {
      const response = await apiRequest("POST", "/api/option-types", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/option-types"] });
      toast({ title: "Option type created successfully!" });
      setIsCreating(false);
      optionTypeForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to create option type", variant: "destructive" });
    },
  });

  const updateOptionTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OptionTypeForm> }) => {
      const response = await apiRequest("PATCH", `/api/option-types/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/option-types"] });
      toast({ title: "Option type updated successfully!" });
      setEditingOptionType(null);
      optionTypeForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to update option type", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/option-types/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/option-types"] });
      toast({ title: "Option type status updated!" });
    },
    onError: () => {
      toast({ title: "Failed to update option type status", variant: "destructive" });
    },
  });

  const deleteOptionTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/option-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/option-types"] });
      toast({ title: "Option type deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete option type", variant: "destructive" });
    },
  });

  const onSubmit = (data: OptionTypeForm) => {
    if (editingOptionType) {
      updateOptionTypeMutation.mutate({ id: editingOptionType.id, data });
    } else {
      createOptionTypeMutation.mutate(data);
    }
  };

  const startEdit = (optionType: any) => {
    setEditingOptionType(optionType);
    optionTypeForm.setValue("name", optionType.name);
    optionTypeForm.setValue("description", optionType.description || "");
    setIsCreating(true);
  };

  const cancelEdit = () => {
    setEditingOptionType(null);
    setIsCreating(false);
    optionTypeForm.reset();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Option Types List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {optionTypes.map((optionType: any) => (
              <div key={optionType.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium text-foreground" data-testid={`text-option-type-name-${optionType.id}`}>{optionType.name}</p>
                  {optionType.description && (
                    <p className="text-sm text-muted-foreground" data-testid={`text-option-type-description-${optionType.id}`}>{optionType.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={optionType.isActive}
                    onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: optionType.id, isActive: checked })}
                    data-testid={`toggle-option-type-${optionType.id}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(optionType)}
                    data-testid={`edit-option-type-${optionType.id}`}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this option type?")) {
                        deleteOptionTypeMutation.mutate(optionType.id);
                      }
                    }}
                    data-testid={`delete-option-type-${optionType.id}`}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {optionTypes.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No option types found. Create one to get started!</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingOptionType ? "Edit Option Type" : "Create New Option Type"}</CardTitle>
        </CardHeader>
        <CardContent>
          {!isCreating ? (
            <Button onClick={() => setIsCreating(true)} className="w-full" data-testid="button-create-option-type">
              Create New Option Type
            </Button>
          ) : (
            <Form {...optionTypeForm}>
              <form onSubmit={optionTypeForm.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={optionTypeForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Option Type Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Size, Flavor, Add-ons, etc." data-testid="input-option-type-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={optionTypeForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-option-type-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createOptionTypeMutation.isPending || updateOptionTypeMutation.isPending}
                    data-testid="button-submit-option-type"
                  >
                    {editingOptionType ? "Update Option Type" : "Create Option Type"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                    data-testid="button-cancel-option-type"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CategoryManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const categoryForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "",
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryForm) => {
      const response = await apiRequest("POST", "/api/categories", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category created successfully!" });
      setIsCreating(false);
      categoryForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CategoryForm> }) => {
      const response = await apiRequest("PATCH", `/api/categories/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category updated successfully!" });
      setEditingCategory(null);
      categoryForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to update category", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/categories/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category status updated!" });
    },
    onError: () => {
      toast({ title: "Failed to update category status", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete category", variant: "destructive" });
    },
  });

  const onSubmit = (data: CategoryForm) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const startEdit = (category: any) => {
    setEditingCategory(category);
    categoryForm.setValue("name", category.name);
    categoryForm.setValue("description", category.description || "");
    categoryForm.setValue("icon", category.icon || "");
    setIsCreating(true);
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setIsCreating(false);
    categoryForm.reset();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Categories List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categories.map((category: any) => (
              <div key={category.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {category.icon && <span className="text-2xl">{category.icon}</span>}
                  <div>
                    <p className="font-medium text-foreground">{category.name}</p>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={category.isActive}
                    onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: category.id, isActive: checked })}
                    data-testid={`toggle-category-${category.id}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(category)}
                    data-testid={`edit-category-${category.id}`}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this category?")) {
                        deleteCategoryMutation.mutate(category.id);
                      }
                    }}
                    data-testid={`delete-category-${category.id}`}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No categories found. Create one to get started!</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingCategory ? "Edit Category" : "Create New Category"}</CardTitle>
        </CardHeader>
        <CardContent>
          {!isCreating ? (
            <Button onClick={() => setIsCreating(true)} className="w-full" data-testid="button-create-category">
              Create New Category
            </Button>
          ) : (
            <Form {...categoryForm}>
              <form onSubmit={categoryForm.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={categoryForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-category-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={categoryForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-category-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={categoryForm.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon (Emoji, Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="🍔" data-testid="input-category-icon" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                    data-testid="button-submit-category"
                  >
                    {editingCategory ? "Update Category" : "Create Category"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                    data-testid="button-cancel-category"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StoreManagementTable() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [showMarkupModal, setShowMarkupModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [markupValue, setMarkupValue] = useState("");

  // Fetch all restaurants (including inactive) with owner information
  const { data: adminRestaurants = [], isLoading } = useQuery({
    queryKey: ["/api/admin/restaurants"],
  });

  // Update restaurant markup
  const updateMarkupMutation = useMutation({
    mutationFn: async ({ id, markup }: { id: string; markup: string }) => {
      const response = await apiRequest("PATCH", `/api/restaurants/${id}`, { 
        markup,
        updatedAt: new Date()
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
      toast({ title: "Markup updated successfully!" });
      setShowMarkupModal(false);
      setSelectedRestaurant(null);
      setMarkupValue("");
    },
    onError: () => {
      toast({ title: "Failed to update markup", variant: "destructive" });
    },
  });

  // Toggle restaurant status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/restaurants/${id}`, { 
        isActive,
        updatedAt: new Date()
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
      toast({ title: "Restaurant status updated!" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  // Delete restaurant
  const deleteRestaurantMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/restaurants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
      toast({ title: "Restaurant deleted successfully!" });
      setShowDeleteModal(false);
      setSelectedRestaurant(null);
    },
    onError: () => {
      toast({ title: "Failed to delete restaurant", variant: "destructive" });
    },
  });

  const getOwnerName = (restaurant: any) => {
    if (!restaurant.ownerFirstName && !restaurant.ownerLastName) {
      return "Owner not set";
    }
    
    const parts = [
      restaurant.ownerFirstName,
      restaurant.ownerMiddleName,
      restaurant.ownerLastName
    ].filter(Boolean);
    
    return parts.join(' ') || "Owner not set";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading restaurants...</div>;
  }

  return (
    <>
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Restaurant Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Markup</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminRestaurants.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No restaurants found
                  </td>
                </tr>
              ) : (
                adminRestaurants.map((restaurant: any) => (
                  <tr key={restaurant.id} className="border-b hover:bg-muted/30" data-testid={`restaurant-row-${restaurant.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {restaurant.image && (
                          <img src={restaurant.image} alt={restaurant.name} className="w-8 h-8 rounded object-cover" />
                        )}
                        <div>
                          <p className="font-medium">{restaurant.name}</p>
                          <p className="text-xs text-muted-foreground">{restaurant.cuisine}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        variant={restaurant.isActive ? "default" : "secondary"}
                        data-testid={`status-${restaurant.id}`}
                      >
                        {restaurant.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm" data-testid={`markup-${restaurant.id}`}>
                      {restaurant.markup}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedRestaurant(restaurant);
                            setShowViewModal(true);
                          }}
                          data-testid={`button-view-${restaurant.id}`}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRestaurant(restaurant);
                            setMarkupValue(restaurant.markup || "15");
                            setShowMarkupModal(true);
                          }}
                          data-testid={`button-edit-markup-${restaurant.id}`}
                        >
                          Edit Markup
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedRestaurant(restaurant);
                            setShowDeleteModal(true);
                          }}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-${restaurant.id}`}
                          title="Delete Restaurant"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Set Markup Modal */}
      <Dialog open={showMarkupModal} onOpenChange={setShowMarkupModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Markup Percentage</DialogTitle>
            <DialogDescription>
              Update the markup percentage for {selectedRestaurant?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="markup">Markup Percentage (%)</Label>
              <Input
                id="markup"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={markupValue}
                onChange={(e) => setMarkupValue(e.target.value)}
                placeholder="15"
                data-testid="input-markup"
              />
              <p className="text-xs text-muted-foreground">
                Enter a percentage (e.g., 15 for 15% markup)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarkupModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedRestaurant && markupValue) {
                  updateMarkupMutation.mutate({ id: selectedRestaurant.id, markup: markupValue });
                }
              }}
              disabled={!markupValue || updateMarkupMutation.isPending}
              data-testid="button-save-markup"
            >
              Save Markup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedRestaurant?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all menu items and order history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedRestaurant) {
                  deleteRestaurantMutation.mutate(selectedRestaurant.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Store Information Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              {selectedRestaurant?.name}
            </DialogTitle>
            <DialogDescription>Complete Store Information</DialogDescription>
          </DialogHeader>
          {selectedRestaurant && (
            <div className="space-y-6">
              {/* Restaurant Image */}
              {selectedRestaurant.image && (
                <div className="flex justify-center">
                  <img 
                    src={selectedRestaurant.image} 
                    alt={selectedRestaurant.name} 
                    className="w-full max-w-md h-48 object-cover rounded-lg border"
                  />
                </div>
              )}

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground">Status:</Label>
                <Badge 
                  variant={selectedRestaurant.isActive ? "default" : "secondary"}
                  className="text-sm"
                >
                  {selectedRestaurant.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              {/* Owner Information Section */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Owner Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <Label className="text-muted-foreground text-xs">Owner/Merchant Name</Label>
                      <p className="font-medium">{getOwnerName(selectedRestaurant)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <Label className="text-muted-foreground text-xs">Owner Email</Label>
                      <p className="font-medium">{selectedRestaurant.email || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Store Contact Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Store Contact Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <Label className="text-muted-foreground text-xs">Store Contact Number</Label>
                      <p className="font-medium">{selectedRestaurant.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Store className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <Label className="text-muted-foreground text-xs">Cuisine Type</Label>
                      <p className="font-medium">{selectedRestaurant.cuisine}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 md:col-span-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <Label className="text-muted-foreground text-xs">Store Address</Label>
                      <p className="font-medium">{selectedRestaurant.address}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Business Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Markup Percentage</Label>
                    <p className="font-medium text-lg">{selectedRestaurant.markup}%</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Delivery Fee</Label>
                    <p className="font-medium text-lg">₱{selectedRestaurant.deliveryFee}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Rating</Label>
                    <p className="font-medium text-lg">⭐ {selectedRestaurant.rating || '0.0'}</p>
                  </div>
                  <div className="flex items-start gap-2 md:col-span-3">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <Label className="text-muted-foreground text-xs">Date Registered</Label>
                      <p className="font-medium">{formatDate(selectedRestaurant.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedRestaurant.description && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg border-b pb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">{selectedRestaurant.description}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewModal(false)} data-testid="button-close-view-modal">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminPortal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const { data: systemStats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  const { data: pendingUsers = [] } = useQuery({
    queryKey: ["/api/users", { role: "pending" }],
    queryFn: async () => {
      // Mock pending approvals - in real app this would filter by approval status
      return [];
    }
  });

  const { data: restaurants = [] } = useQuery({
    queryKey: ["/api/restaurants"],
  });

  // Rider document approval queries
  const { data: ridersForApproval = [] } = useQuery({
    queryKey: ["/api/admin/riders-for-approval"],
  });

  // Merchant approval queries
  const { data: merchantsForApproval = [] } = useQuery({
    queryKey: ["/api/admin/merchants-for-approval"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest("PATCH", "/api/settings", updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const approveUserMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}/approval`, { 
        approvalStatus: status 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });

  const updateRestaurantMutation = useMutation({
    mutationFn: async ({ restaurantId, updates }: { restaurantId: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/restaurants/${restaurantId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
    },
  });

  const reviewRiderDocumentsMutation = useMutation({
    mutationFn: async ({ riderId, approved, reason }: { riderId: string; approved: boolean; reason?: string }) => {
      const response = await apiRequest("POST", `/api/admin/review-rider/${riderId}`, { 
        approved, 
        reason 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/riders-for-approval"] });
    },
  });

  const reviewMerchantMutation = useMutation({
    mutationFn: async ({ userId, approved }: { userId: string; approved: boolean }) => {
      const response = await apiRequest("POST", `/api/admin/review-merchant/${userId}`, { 
        approved 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchants-for-approval"] });
      toast({
        title: "Merchant reviewed successfully",
        description: "The merchant has been notified of your decision.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to review merchant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [tempSettings, setTempSettings] = useState({
    baseDeliveryFee: (settings as any)?.baseDeliveryFee || '25',
    perKmRate: (settings as any)?.perKmRate || '15',
    convenienceFee: (settings as any)?.convenienceFee || '10',
    showConvenienceFee: (settings as any)?.showConvenienceFee ?? true,
    allowMultiMerchantCheckout: (settings as any)?.allowMultiMerchantCheckout ?? false,
    maxMerchantsPerOrder: (settings as any)?.maxMerchantsPerOrder || 2,
  });

  // Sync tempSettings when settings data changes
  useEffect(() => {
    if (settings) {
      setTempSettings({
        baseDeliveryFee: (settings as any).baseDeliveryFee || '25',
        perKmRate: (settings as any).perKmRate || '15',
        convenienceFee: (settings as any).convenienceFee || '10',
        showConvenienceFee: (settings as any).showConvenienceFee ?? true,
        allowMultiMerchantCheckout: (settings as any).allowMultiMerchantCheckout ?? false,
        maxMerchantsPerOrder: (settings as any).maxMerchantsPerOrder || 2,
      });
    }
  }, [settings]);

  const systemAccountForm = useForm<SystemAccountForm>({
    resolver: zodResolver(systemAccountSchema),
    defaultValues: {
      username: "",
      email: "",
      phone: "",
      password: "",
      role: "admin",
      firstName: "",
      lastName: "",
      middleName: "",
    },
  });

  const updateSetting = (key: string, value: any) => {
    updateSettingsMutation.mutate({ [key]: value });
  };

  const handleApproval = (userId: string, status: 'approved' | 'rejected') => {
    approveUserMutation.mutate({ userId, status });
  };

  const toggleRestaurantStatus = (restaurantId: string, isActive: boolean) => {
    updateRestaurantMutation.mutate({ 
      restaurantId, 
      updates: { isActive } 
    });
  };

  const updateRestaurantMarkup = (restaurantId: string, markup: string) => {
    updateRestaurantMutation.mutate({ 
      restaurantId, 
      updates: { markup } 
    });
  };

  const createSystemAccountMutation = useMutation({
    mutationFn: async (data: SystemAccountForm) => {
      const response = await apiRequest("POST", "/api/admin/create-system-account", data);
      return response.json();
    },
    onSuccess: (newUser) => {
      toast({
        title: "Account created successfully",
        description: `${newUser.role === 'admin' ? 'Admin' : 'Owner'} account for ${newUser.firstName} ${newUser.lastName} has been created.`,
        variant: "default",
      });
      systemAccountForm.reset();
      setIsCreatingAccount(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onCreateSystemAccount = (data: SystemAccountForm) => {
    createSystemAccountMutation.mutate(data);
  };

  // Check if current user is owner
  const isOwner = user?.role === 'owner';

  return (
    <div>
      {/* Admin Dashboard Header */}
      <section className="bg-card border-b border-border py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Admin Dashboard</h2>
              <p className="text-muted-foreground">Manage your delivery platform operations</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">System Status: Online</span>
              </div>
              <Button data-testid="button-export-reports">
                <Download className="mr-2 h-4 w-4" />
                Export Reports
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="py-6 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-500 bg-opacity-10 p-3 rounded-lg">
                    <ShoppingCart className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold text-foreground">
                      {systemStats?.totalOrders?.toLocaleString() || '0'}
                    </p>
                    <p className="text-sm text-green-600">
                      +{systemStats?.ordersGrowth || 0}% from last month
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-500 bg-opacity-10 p-3 rounded-lg">
                    <DollarSign className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-2xl font-bold text-foreground">
                      ₱{systemStats?.totalRevenue?.toLocaleString() || '0'}
                    </p>
                    <p className="text-sm text-green-600">
                      +{systemStats?.revenueGrowth || 0}% from last month
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-500 bg-opacity-10 p-3 rounded-lg">
                    <Bike className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Riders</p>
                    <p className="text-2xl font-bold text-foreground">
                      {systemStats?.activeRiders || '0'}
                    </p>
                    <p className="text-sm text-green-600">
                      +{systemStats?.ridersGrowth || 0} new this week
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-orange-500 bg-opacity-10 p-3 rounded-lg">
                    <Store className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Restaurants</p>
                    <p className="text-2xl font-bold text-foreground">
                      {systemStats?.totalRestaurants || '0'}
                    </p>
                    <p className="text-sm text-green-600">
                      +{systemStats?.restaurantsGrowth || 0} pending approval
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Navigation Tabs */}
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className={`grid w-full ${isOwner ? 'grid-cols-6' : 'grid-cols-5'}`}>
              <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="approvals" data-testid="tab-approvals">
                <CheckCircle className="w-4 h-4 mr-2" />
                Approvals
                {(merchantsForApproval.length > 0 || ridersForApproval.length > 0) && (
                  <Badge className="ml-2" variant="destructive">
                    {merchantsForApproval.length + ridersForApproval.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="menu-settings" data-testid="tab-menu-settings">
                <Utensils className="w-4 h-4 mr-2" />
                Menu Settings
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
              <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
              {isOwner && (
                <TabsTrigger value="user-management" data-testid="tab-user-management">
                  <Crown className="w-4 h-4 mr-2" />
                  User Management
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">New restaurant registered</p>
                          <p className="text-sm text-muted-foreground">Pizza Palace - 2 hours ago</p>
                        </div>
                        <Badge variant="secondary">New</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">Rider approved</p>
                          <p className="text-sm text-muted-foreground">Juan Cruz - 4 hours ago</p>
                        </div>
                        <Badge variant="default">Approved</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">System maintenance completed</p>
                          <p className="text-sm text-muted-foreground">6 hours ago</p>
                        </div>
                        <Badge variant="outline">System</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button className="w-full justify-start" variant="outline">
                      <Users className="mr-2 h-4 w-4" />
                      View All Users
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Store className="mr-2 h-4 w-4" />
                      Manage Restaurants
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Bike className="mr-2 h-4 w-4" />
                      Rider Management
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Analytics Dashboard
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="approvals" className="space-y-6">
              <div className="space-y-6">
                {/* Merchant Approvals Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <Store className="mr-2 h-5 w-5" />
                    Pending Merchant Applications
                    {merchantsForApproval.length > 0 && (
                      <Badge className="ml-2" variant="destructive">{merchantsForApproval.length}</Badge>
                    )}
                  </h3>
                  {merchantsForApproval.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">No pending merchant applications</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {merchantsForApproval.map((merchant: any) => (
                        <Card key={merchant.id} data-testid={`merchant-approval-${merchant.id}`}>
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <Avatar className="w-12 h-12">
                                  <AvatarImage src={merchant.profileImage} />
                                  <AvatarFallback className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                                    <Store className="h-6 w-6" />
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h4 className="font-medium text-foreground">
                                    {merchant.firstName} {merchant.lastName}
                                  </h4>
                                  <p className="text-sm text-primary font-medium">
                                    {merchant.storeName || 'Store name not provided'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {merchant.storeAddress || 'Address not provided'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Contact: {merchant.storeContactNo || 'N/A'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Registered {new Date(merchant.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => reviewMerchantMutation.mutate({ userId: merchant.id, approved: false })}
                                  disabled={reviewMerchantMutation.isPending}
                                  data-testid={`button-reject-merchant-${merchant.id}`}
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Reject
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => reviewMerchantMutation.mutate({ userId: merchant.id, approved: true })}
                                  disabled={reviewMerchantMutation.isPending}
                                  data-testid={`button-approve-merchant-${merchant.id}`}
                                >
                                  <Check className="mr-2 h-4 w-4" />
                                  Approve
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rider Document Review Section */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Rider Document Reviews
                    {ridersForApproval.length > 0 && (
                      <Badge className="ml-2" variant="destructive">{ridersForApproval.length}</Badge>
                    )}
                  </h3>
                  {ridersForApproval.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">No rider documents pending review</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {ridersForApproval.map((rider: any) => (
                        <Card key={rider.id} className="border-l-4 border-l-yellow-500">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <Avatar>
                                  <AvatarImage src={rider.user?.profileImage} />
                                  <AvatarFallback>
                                    {rider.user?.firstName?.[0]}{rider.user?.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h4 className="font-semibold">
                                    {rider.user?.firstName} {rider.user?.lastName}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {rider.user?.email}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Submitted: {new Date(rider.documentsSubmittedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending Review
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {/* Rider Details */}
                            <div className="grid md:grid-cols-2 gap-4 mb-6">
                              <div>
                                <Label className="text-muted-foreground text-xs">Driver's License</Label>
                                <p className="font-medium">{rider.driversLicenseNo}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground text-xs">License Validity</Label>
                                <p className="font-medium">{new Date(rider.licenseValidityDate).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground text-xs">Phone</Label>
                                <p className="font-medium">{rider.user?.phone}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground text-xs">Status</Label>
                                <Badge variant="outline">{rider.documentsApproved ? 'Approved' : 'Pending'}</Badge>
                              </div>
                            </div>

                            {/* Document Status */}
                            <div className="mb-6">
                              <Label className="text-muted-foreground text-xs mb-2 block">Uploaded Documents</Label>
                              <div className="space-y-2">
                                <div className="flex items-center">
                                  {rider.orcrDocument ? (
                                    <Check className="w-4 h-4 text-green-500 mr-2" />
                                  ) : (
                                    <X className="w-4 h-4 text-red-500 mr-2" />
                                  )}
                                  <span className="text-sm">OR/CR Document</span>
                                </div>
                                <div className="flex items-center">
                                  {rider.motorImage ? (
                                    <Check className="w-4 h-4 text-green-500 mr-2" />
                                  ) : (
                                    <X className="w-4 h-4 text-red-500 mr-2" />
                                  )}
                                  <span className="text-sm">Motor Image</span>
                                </div>
                                <div className="flex items-center">
                                  {rider.idDocument ? (
                                    <Check className="w-4 h-4 text-green-500 mr-2" />
                                  ) : (
                                    <X className="w-4 h-4 text-red-500 mr-2" />
                                  )}
                                  <span className="text-sm">Valid ID</span>
                                </div>
                              </div>
                            </div>

                            {/* Document Download Links */}
                            <div className="flex flex-wrap gap-2 mb-6">
                              {rider.orcrDocument && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/api/admin/rider-document/${rider.id}/orcr`, '_blank')}
                                  data-testid={`download-orcr-${rider.id}`}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View OR/CR
                                </Button>
                              )}
                              {rider.motorImage && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/api/admin/rider-document/${rider.id}/motor`, '_blank')}
                                  data-testid={`download-motor-${rider.id}`}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Motor
                                </Button>
                              )}
                              {rider.idDocument && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/api/admin/rider-document/${rider.id}/id`, '_blank')}
                                  data-testid={`download-id-${rider.id}`}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View ID
                                </Button>
                              )}
                            </div>

                            {/* Approval Actions */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                              <Button
                                onClick={() => reviewRiderDocumentsMutation.mutate({ 
                                  riderId: rider.id, 
                                  approved: true 
                                })}
                                disabled={reviewRiderDocumentsMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                                data-testid={`approve-rider-${rider.id}`}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Approve Rider
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => {
                                  const reason = prompt("Please provide a reason for rejection:");
                                  if (reason) {
                                    reviewRiderDocumentsMutation.mutate({ 
                                      riderId: rider.id, 
                                      approved: false, 
                                      reason 
                                    });
                                  }
                                }}
                                disabled={reviewRiderDocumentsMutation.isPending}
                                data-testid={`reject-rider-${rider.id}`}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Reject Documents
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="menu-settings" className="space-y-6">
              <div className="space-y-6">
                {/* Categories Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Categories Management</h3>
                  <CategoryManagement />
                </div>

                <Separator className="my-8" />

                {/* Option Types Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Option Types Management</h3>
                  <OptionTypeManagement />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Delivery Fee Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Bike className="mr-2 h-5 w-5 text-primary" />
                      Delivery Fee Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="base-rate">Base Rate (First KM)</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-muted-foreground">₱</span>
                        <Input
                          id="base-rate"
                          type="number"
                          value={tempSettings.baseDeliveryFee}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, baseDeliveryFee: e.target.value }))}
                          className="flex-1"
                          data-testid="input-base-rate"
                        />
                        <Button 
                          size="sm"
                          onClick={() => updateSetting('baseDeliveryFee', tempSettings.baseDeliveryFee)}
                          disabled={updateSettingsMutation.isPending}
                          data-testid="button-update-base-rate"
                        >
                          Update
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="per-km-rate">Succeeding KM Rate</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-muted-foreground">₱</span>
                        <Input
                          id="per-km-rate"
                          type="number"
                          value={tempSettings.perKmRate}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, perKmRate: e.target.value }))}
                          className="flex-1"
                          data-testid="input-per-km-rate"
                        />
                        <Button 
                          size="sm"
                          onClick={() => updateSetting('perKmRate', tempSettings.perKmRate)}
                          disabled={updateSettingsMutation.isPending}
                          data-testid="button-update-per-km-rate"
                        >
                          Update
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="convenience-fee">Convenience Fee</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-muted-foreground">₱</span>
                        <Input
                          id="convenience-fee"
                          type="number"
                          value={tempSettings.convenienceFee}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, convenienceFee: e.target.value }))}
                          className="flex-1"
                          data-testid="input-convenience-fee"
                        />
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={tempSettings.showConvenienceFee}
                            onCheckedChange={(checked) => {
                              setTempSettings(prev => ({ ...prev, showConvenienceFee: checked }));
                              updateSetting('showConvenienceFee', checked);
                            }}
                            data-testid="switch-show-convenience-fee"
                          />
                          <Label className="text-sm">Show at checkout</Label>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => updateSetting('convenienceFee', tempSettings.convenienceFee)}
                          disabled={updateSettingsMutation.isPending}
                          data-testid="button-update-convenience-fee"
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Store Management - Enhanced Table View */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Store className="mr-2 h-5 w-5 text-primary" />
                      Store Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StoreManagementTable />
                  </CardContent>
                </Card>

                {/* Multi-Merchant Checkout Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ShoppingCart className="mr-2 h-5 w-5 text-primary" />
                      Multi-Merchant Checkout
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="multi-merchant-toggle" className="text-base">
                            Allow Multi-Merchant Checkout
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Enable customers to order from multiple merchants in one checkout
                          </p>
                        </div>
                        <Switch
                          id="multi-merchant-toggle"
                          checked={tempSettings.allowMultiMerchantCheckout}
                          onCheckedChange={(checked) => {
                            setTempSettings(prev => ({ ...prev, allowMultiMerchantCheckout: checked }));
                            updateSetting('allowMultiMerchantCheckout', checked);
                          }}
                          data-testid="switch-allow-multi-merchant"
                        />
                      </div>

                      {tempSettings.allowMultiMerchantCheckout && (
                        <div className="pt-4 border-t">
                          <Label htmlFor="max-merchants">Maximum Merchants Per Order</Label>
                          <div className="flex items-center space-x-2 mt-2">
                            <Input
                              id="max-merchants"
                              type="number"
                              min={2}
                              max={5}
                              value={tempSettings.maxMerchantsPerOrder}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (value >= 2 && value <= 5) {
                                  setTempSettings(prev => ({ ...prev, maxMerchantsPerOrder: value }));
                                }
                              }}
                              className="w-24"
                              data-testid="input-max-merchants"
                            />
                            <Button 
                              size="sm"
                              onClick={() => updateSetting('maxMerchantsPerOrder', tempSettings.maxMerchantsPerOrder)}
                              disabled={updateSettingsMutation.isPending}
                              data-testid="button-update-max-merchants"
                            >
                              Update
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Set between 2 and 5 merchants
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Customer Management - Full Width Section */}
              <CustomerManagement />
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Reports & Analytics</CardTitle>
                </CardHeader>
                <CardContent className="p-8 text-center">
                  <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Advanced Analytics Coming Soon</h3>
                  <p className="text-muted-foreground mb-4">
                    Detailed reports and analytics dashboard with charts and graphs will be available here.
                  </p>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Current Data
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>


            {/* Owner-only User Management Tab */}
            {isOwner && (
              <TabsContent value="user-management" className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Create System Account Form */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Crown className="mr-2 h-5 w-5 text-primary" />
                        Create Administrative Account
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Create new Admin or Owner accounts. Only Owners can perform this action.
                      </p>
                    </CardHeader>
                    <CardContent>
                      {!isCreatingAccount ? (
                        <Button 
                          onClick={() => setIsCreatingAccount(true)}
                          className="w-full"
                          data-testid="button-start-create-account"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Create New Account
                        </Button>
                      ) : (
                        <Form {...systemAccountForm}>
                          <form onSubmit={systemAccountForm.handleSubmit(onCreateSystemAccount)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={systemAccountForm.control}
                                name="firstName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>First Name</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field} 
                                        placeholder="Enter first name"
                                        data-testid="input-system-first-name"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={systemAccountForm.control}
                                name="lastName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Last Name</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field} 
                                        placeholder="Enter last name"
                                        data-testid="input-system-last-name"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={systemAccountForm.control}
                              name="middleName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Middle Name (Optional)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="Enter middle name"
                                      data-testid="input-system-middle-name"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={systemAccountForm.control}
                              name="role"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Account Role</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-system-role">
                                        <SelectValue placeholder="Select account role" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="admin">Admin - System administration</SelectItem>
                                      <SelectItem value="owner">Owner - Full system control</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={systemAccountForm.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Username</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="Enter username"
                                      data-testid="input-system-username"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={systemAccountForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email Address</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="email"
                                      placeholder="Enter email address"
                                      data-testid="input-system-email"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={systemAccountForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone Number</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="tel"
                                      placeholder="Enter phone number (e.g., 09123456789)"
                                      data-testid="input-system-phone"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={systemAccountForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Password</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="password"
                                      placeholder="Enter secure password"
                                      data-testid="input-system-password"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex gap-2 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  setIsCreatingAccount(false);
                                  systemAccountForm.reset();
                                }}
                                data-testid="button-cancel-create-account"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                className="w-full"
                                disabled={createSystemAccountMutation.isPending}
                                data-testid="button-create-system-account"
                              >
                                {createSystemAccountMutation.isPending ? "Creating..." : "Create Account"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      )}
                    </CardContent>
                  </Card>

                  {/* System Account Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <AlertCircle className="mr-2 h-5 w-5 text-orange-500" />
                        Important Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                        <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                          Account Creation Guidelines
                        </h4>
                        <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-2">
                          <li>• Admin accounts can manage users, approvals, and system settings</li>
                          <li>• Owner accounts have full system control including user management</li>
                          <li>• All created accounts are automatically approved and active</li>
                          <li>• Passwords must be at least 6 characters long</li>
                          <li>• Usernames and emails must be unique across the system</li>
                        </ul>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                          Security Recommendations
                        </h4>
                        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                          <li>• Use strong, unique passwords for administrative accounts</li>
                          <li>• Provide clear naming conventions for usernames</li>
                          <li>• Regularly review and audit administrative access</li>
                          <li>• Create Owner accounts sparingly - only for trusted administrators</li>
                        </ul>
                      </div>

                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                          ⚠️ Owner Account Warning
                        </h4>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          Owner accounts have unrestricted access to all system functions including creating other Owner accounts. 
                          Only create Owner accounts for trusted system administrators.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Session Management - Full width card */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center text-red-600 dark:text-red-400">
                      <AlertCircle className="mr-2 h-5 w-5" />
                      Session Management (Developer Tool)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                        ⚠️ Clear All Sessions
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                        This action will log out all users including yourself. All users will be required to log in again. 
                        Use this for debugging session issues or forcing a system-wide logout.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          if (confirm("Are you sure you want to clear ALL sessions? This will log out everyone including yourself.")) {
                            try {
                              const response = await apiRequest("POST", "/api/admin/clear-sessions");
                              const data = await response.json();
                              if (data.success) {
                                toast({ 
                                  title: "All sessions cleared", 
                                  description: "All users have been logged out. Redirecting to login..." 
                                });
                                // Clear browser storage
                                localStorage.clear();
                                sessionStorage.clear();
                                // Redirect to login after a short delay
                                setTimeout(() => {
                                  window.location.href = '/';
                                }, 2000);
                              }
                            } catch (error) {
                              toast({ 
                                title: "Failed to clear sessions", 
                                description: "An error occurred while clearing sessions",
                                variant: "destructive" 
                              });
                            }
                          }
                        }}
                        data-testid="button-clear-all-sessions"
                      >
                        Clear All Sessions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </section>
    </div>
  );
}
