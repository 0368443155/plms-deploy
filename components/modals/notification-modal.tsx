"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
    Bell,
    AlertCircle,
    Info,
    CheckCircle,
    Trash2,
    ExternalLink,
    Calendar,
    CheckCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    notification?: Doc<"notifications"> | null;
}

export const NotificationModal = ({
    isOpen,
    onClose,
    notification,
}: NotificationModalProps) => {
    const router = useRouter();
    const markAsRead = useMutation(api.notifications.markAsRead);
    const deleteNotification = useMutation(api.notifications.remove);

    if (!notification) return null;

    const getIcon = (type: string) => {
        switch (type) {
            case "deadline": return <AlertCircle className="h-6 w-6 text-red-500" />;
            case "reminder": return <Bell className="h-6 w-6 text-yellow-500" />;
            case "achievement": return <CheckCircle className="h-6 w-6 text-green-500" />;
            case "system": return <Info className="h-6 w-6 text-blue-500" />;
            default: return <Bell className="h-6 w-6 text-gray-500" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "deadline": return "Hạn chót";
            case "reminder": return "Nhắc nhở";
            case "achievement": return "Thành tựu";
            case "system": return "Hệ thống";
            default: return "Thông báo";
        }
    };

    const handleMarkAsRead = async () => {
        try {
            if (!notification.isRead) {
                await markAsRead({ id: notification._id });
                toast.success("Đã đánh dấu đã đọc");
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra");
        }
    };

    const handleAction = async () => {
        if (notification.actionUrl) {
            await handleMarkAsRead();
            onClose();
            router.push(notification.actionUrl);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteNotification({ id: notification._id });
            toast.success("Đã xóa thông báo");
            onClose();
        } catch (error) {
            toast.error("Không thể xóa thông báo");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {getIcon(notification.type)}
                        <span>{getTypeLabel(notification.type)}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{notification.title}</h3>
                        <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: vi })}
                        </p>
                    </div>

                    <div className="p-3 bg-muted/50 rounded-md text-sm whitespace-pre-wrap">
                        {notification.message}
                    </div>

                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                        {notification.priority && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Mức độ ưu tiên:</span>
                                <span className={cn(
                                    notification.priority === "high" && "text-red-500",
                                    notification.priority === "medium" && "text-yellow-500",
                                    notification.priority === "low" && "text-blue-500"
                                )}>
                                    {notification.priority === "high" ? "Cao" : notification.priority === "medium" ? "Trung bình" : "Thấp"}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
                    <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4 mr-2" /> Xóa
                    </Button>

                    <div className="flex gap-2">
                        {!notification.isRead && (
                            <Button variant="outline" size="sm" onClick={handleMarkAsRead}>
                                <CheckCheck className="h-4 w-4 mr-2" /> Đã đọc
                            </Button>
                        )}
                        {notification.actionUrl && (
                            <Button size="sm" onClick={handleAction}>
                                <ExternalLink className="h-4 w-4 mr-2" /> Xem chi tiết
                            </Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={onClose}>
                            Đóng
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
