import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

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

function getPriorityStyles(priority: string) {
  switch (priority) {
    case 'urgent':
      return {
        className: 'border-destructive bg-destructive/10 dark:bg-destructive/20 text-destructive',
        icon: <AlertCircle className="h-5 w-5" />,
      };
    case 'important':
      return {
        className: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-300',
        icon: <AlertTriangle className="h-5 w-5" />,
      };
    case 'normal':
    default:
      return {
        className: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300',
        icon: <Info className="h-5 w-5" />,
      };
  }
}

export function AnnouncementBanner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements/active"],
    enabled: !!user,
    refetchInterval: 60000, // Refetch every minute to check for new announcements
  });

  const dismissMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      const response = await apiRequest("POST", `/api/announcements/${announcementId}/dismiss`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/active"] });
    },
  });

  const handleDismiss = (announcementId: string) => {
    dismissMutation.mutate(announcementId);
  };

  if (!announcements || announcements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {announcements.map((announcement) => {
        const styles = getPriorityStyles(announcement.priority);
        
        return (
          <Alert
            key={announcement.id}
            className={cn("relative pr-12", styles.className)}
            data-testid={`announcement-${announcement.id}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {styles.icon}
              </div>
              <div className="flex-1 min-w-0">
                <AlertTitle className="font-semibold mb-1" data-testid={`announcement-title-${announcement.id}`}>
                  {announcement.title}
                </AlertTitle>
                <AlertDescription className="text-sm whitespace-pre-wrap" data-testid={`announcement-message-${announcement.id}`}>
                  {announcement.message}
                </AlertDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={() => handleDismiss(announcement.id)}
              data-testid={`button-dismiss-announcement-${announcement.id}`}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </Alert>
        );
      })}
    </div>
  );
}
