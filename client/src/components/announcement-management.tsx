import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Megaphone, Plus, Edit, Trash2, Users, Bike, Store, Calendar, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  message: z.string().min(1, "Message is required"),
  targetCustomers: z.boolean().default(false),
  targetRiders: z.boolean().default(false),
  targetMerchants: z.boolean().default(false),
  priority: z.enum(["normal", "important", "urgent"]).default("normal"),
  startDate: z.string().optional(),
  isActive: z.boolean().default(true),
}).refine(data => data.targetCustomers || data.targetRiders || data.targetMerchants, {
  message: "At least one target audience must be selected",
  path: ["targetCustomers"],
});

type AnnouncementForm = z.infer<typeof announcementSchema>;

type Announcement = {
  id: string;
  title: string;
  message: string;
  targetCustomers: boolean;
  targetRiders: boolean;
  targetMerchants: boolean;
  priority: "normal" | "important" | "urgent";
  startDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
};

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'destructive';
    case 'important':
      return 'default';
    case 'normal':
    default:
      return 'secondary';
  }
}

function getPriorityIcon(priority: string) {
  switch (priority) {
    case 'urgent':
      return <AlertCircle className="h-4 w-4" />;
    case 'important':
      return <AlertTriangle className="h-4 w-4" />;
    case 'normal':
    default:
      return <Info className="h-4 w-4" />;
  }
}

export function AnnouncementManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null);

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
  });

  const form = useForm<AnnouncementForm>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      message: "",
      targetCustomers: false,
      targetRiders: false,
      targetMerchants: false,
      priority: "normal",
      startDate: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AnnouncementForm) => {
      const response = await apiRequest("POST", "/api/announcements", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Announcement created successfully!" });
      setIsCreating(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create announcement", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AnnouncementForm> }) => {
      const response = await apiRequest("PATCH", `/api/announcements/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Announcement updated successfully!" });
      setEditingAnnouncement(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update announcement", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/announcements/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Announcement deleted successfully!" });
      setDeletingAnnouncementId(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete announcement", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: AnnouncementForm) => {
    if (editingAnnouncement) {
      updateMutation.mutate({ id: editingAnnouncement.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    form.reset({
      title: announcement.title,
      message: announcement.message,
      targetCustomers: announcement.targetCustomers,
      targetRiders: announcement.targetRiders,
      targetMerchants: announcement.targetMerchants,
      priority: announcement.priority,
      startDate: announcement.startDate ? format(new Date(announcement.startDate), "yyyy-MM-dd'T'HH:mm") : "",
      isActive: announcement.isActive,
    });
  };

  const handleCloseDialog = () => {
    setIsCreating(false);
    setEditingAnnouncement(null);
    form.reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Announcement Management</h2>
          <p className="text-muted-foreground">Create and manage platform-wide announcements for users</p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          data-testid="button-create-announcement"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Announcement
        </Button>
      </div>

      {/* Announcements List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Loading announcements...</p>
            </CardContent>
          </Card>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">No announcements created yet</p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id} data-testid={`announcement-card-${announcement.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      <Badge variant={getPriorityColor(announcement.priority)}>
                        {getPriorityIcon(announcement.priority)}
                        <span className="ml-1 capitalize">{announcement.priority}</span>
                      </Badge>
                      {!announcement.isActive && (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm line-clamp-2">
                      {announcement.message}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(announcement)}
                      data-testid={`button-edit-announcement-${announcement.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingAnnouncementId(announcement.id)}
                      data-testid={`button-delete-announcement-${announcement.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <div className="text-sm text-muted-foreground">Target Audience:</div>
                  {announcement.targetCustomers && (
                    <Badge variant="outline" className="gap-1">
                      <Users className="h-3 w-3" />
                      Customers
                    </Badge>
                  )}
                  {announcement.targetRiders && (
                    <Badge variant="outline" className="gap-1">
                      <Bike className="h-3 w-3" />
                      Riders
                    </Badge>
                  )}
                  {announcement.targetMerchants && (
                    <Badge variant="outline" className="gap-1">
                      <Store className="h-3 w-3" />
                      Merchants
                    </Badge>
                  )}
                </div>
                <div className="mt-3 text-xs text-muted-foreground flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Created: {format(new Date(announcement.createdAt), "MMM dd, yyyy")}
                  </div>
                  {announcement.startDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Starts: {format(new Date(announcement.startDate), "MMM dd, yyyy HH:mm")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating || !!editingAnnouncement} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? "Edit Announcement" : "Create New Announcement"}
            </DialogTitle>
            <DialogDescription>
              {editingAnnouncement 
                ? "Update the announcement details below"
                : "Create a new announcement to notify platform users"
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Enter announcement title"
                        data-testid="input-announcement-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter announcement message"
                        rows={4}
                        data-testid="input-announcement-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormLabel>Target Audience (select at least one)</FormLabel>
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="targetCustomers"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <FormLabel className="font-normal cursor-pointer">Customers</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-target-customers"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetRiders"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center space-x-2">
                          <Bike className="h-4 w-4 text-muted-foreground" />
                          <FormLabel className="font-normal cursor-pointer">Riders</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-target-riders"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetMerchants"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center space-x-2">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          <FormLabel className="font-normal cursor-pointer">Merchants</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-target-merchants"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                {form.formState.errors.targetCustomers && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.targetCustomers.message}
                  </p>
                )}
              </div>

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-priority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="normal">
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            Normal
                          </div>
                        </SelectItem>
                        <SelectItem value="important">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Important
                          </div>
                        </SelectItem>
                        <SelectItem value="urgent">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Urgent
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="datetime-local"
                        data-testid="input-start-date"
                      />
                    </FormControl>
                    <FormDescription>
                      Leave empty to display immediately
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Only active announcements will be shown to users
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCloseDialog}
                  data-testid="button-cancel-announcement"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-announcement"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : (editingAnnouncement ? "Update" : "Create")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingAnnouncementId} onOpenChange={(open) => !open && setDeletingAnnouncementId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAnnouncementId && deleteMutation.mutate(deletingAnnouncementId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
