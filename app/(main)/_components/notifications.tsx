"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { NotificationModal } from "@/components/modals/notification-modal";
import { Doc } from "@/convex/_generated/dataModel";
import { useState } from "react";

export const Notifications = () => {
  const router = useRouter();
  const notifications = useQuery(api.notifications.getAll, {
    limit: 10,
    unreadOnly: false,
  });
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);


  const [selectedNotification, setSelectedNotification] = useState<Doc<"notifications"> | null>(null);

  const handleNotificationClick = (notification: Doc<"notifications">) => {
    setSelectedNotification(notification);
    // We don't mark as read immediately, let user do it in modal or we do it when opening?
    // User request: just popup the window.
    // But typically opening it implies reading. 
    // I'll stick to just opening for now as the modal allows marking as read.
    // Actually, standard UX: clicking bell item -> mark read & action. 
    // But since we are showing details in popup, maybe mark as read when popup opens?
    // Let's mark as read when clicking, then open modal.
    if (!notification.isRead) {
      markAsRead({ id: notification._id });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success("Đã đánh dấu tất cả đã đọc");
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "deadline":
        return "⏰";
      case "reminder":
        return "🔔";
      case "system":
        return "ℹ️";
      case "achievement":
        return "🎉";
      default:
        return "📢";
    }
  };

  const getNotificationColor = (type: string, priority?: string) => {
    if (priority === "high") return "text-red-600 dark:text-red-400";
    if (priority === "medium") return "text-yellow-600 dark:text-yellow-400";
    if (priority === "low") return "text-blue-600 dark:text-blue-400";

    switch (type) {
      case "deadline":
        return "text-red-600 dark:text-red-400";
      case "reminder":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-muted-foreground";
    }
  };

  if (notifications === undefined || unreadCount === undefined) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Thông báo</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllAsRead}
            >
              Đánh dấu tất cả đã đọc
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Không có thông báo nào
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={cn(
                    "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                    !notification.isRead && "bg-muted/30"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            !notification.isRead && "font-semibold",
                            getNotificationColor(
                              notification.type,
                              notification.priority || undefined
                            )
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(notification.createdAt, {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => router.push("/notifications")}
            >
              Xem tất cả thông báo
            </Button>
          </div>
        )}
      </PopoverContent>

      <NotificationModal
        isOpen={!!selectedNotification}
        onClose={() => setSelectedNotification(null)}
        notification={selectedNotification}
      />
    </Popover>
  );
};

