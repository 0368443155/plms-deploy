"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { CheckCheck, Bell, MessageSquare, AlertCircle, Info, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Doc } from "@/convex/_generated/dataModel";
import { NotificationModal } from "@/components/modals/notification-modal";

const NotificationsPage = () => {
    const [filter, setFilter] = useState<"all" | "unread">("all");
    const notifications = useQuery(api.notifications.getAll, {
        limit: 50,
        unreadOnly: filter === "unread",
    });
    const markAllAsRead = useMutation(api.notifications.markAllAsRead);
    const markAsRead = useMutation(api.notifications.markAsRead);

    const [selectedNotification, setSelectedNotification] = useState<Doc<"notifications"> | null>(null);

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead();
            toast.success("Đã đánh dấu tất cả đã đọc");
        } catch (error) {
            toast.error("Không thể đánh dấu đã đọc");
        }
    };

    const handleNotificationClick = (notification: Doc<"notifications">) => {
        setSelectedNotification(notification);
        if (!notification.isRead) {
            markAsRead({ id: notification._id });
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case "deadline": return <AlertCircle className="h-6 w-6 text-red-500" />;
            case "reminder": return <Bell className="h-6 w-6 text-yellow-500" />;
            case "achievement": return <CheckCircle className="h-6 w-6 text-green-500" />;
            case "system": return <Info className="h-6 w-6 text-blue-500" />;
            default: return <Bell className="h-6 w-6 text-gray-500" />;
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-6 md:max-w-4xl mx-auto w-full h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">Thông báo</h1>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkAllAsRead}
                    >
                        <CheckCheck className="h-4 w-4 mr-2" />
                        Đánh dấu đã đọc
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-6 border-b pb-4">
                    <Button
                        variant={filter === "all" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setFilter("all")}
                        className="rounded-full"
                    >
                        Tất cả
                    </Button>
                    <Button
                        variant={filter === "unread" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setFilter("unread")}
                        className="rounded-full"
                    >
                        Chưa đọc
                    </Button>
                </div>

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    {!notifications ? (
                        <div className="py-8 text-center text-muted-foreground animate-pulse">
                            Đang tải...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                <Bell className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground font-medium">
                                {filter === "unread"
                                    ? "Không có thông báo chưa đọc"
                                    : "Chưa có thông báo nào"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {notifications.map((notification) => (
                                <div
                                    key={notification._id}
                                    className={cn(
                                        "flex items-start gap-4 p-4 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors bg-card",
                                        !notification.isRead && "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                                    )}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="mt-1">
                                        {getNotificationIcon(notification.type)}
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between items-start">
                                            <p className={cn("font-medium", !notification.isRead && "text-primary font-bold")}>
                                                {notification.title}
                                            </p>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                                {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: vi })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {notification.message}
                                        </p>
                                    </div>

                                    {!notification.isRead && (
                                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <NotificationModal
                isOpen={!!selectedNotification}
                onClose={() => setSelectedNotification(null)}
                notification={selectedNotification}
            />
        </div>
    );
};

export default NotificationsPage;
