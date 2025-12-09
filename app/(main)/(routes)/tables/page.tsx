"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Table2 } from "lucide-react";
import { CreateTableModal } from "./_components/create-table-modal";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const TablesPage = () => {
  const tables = useQuery(api.tables.getAll);
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  if (tables === undefined) {
    return (
      <div className="h-full flex flex-col">
        <div className="md:max-w-7xl mx-auto p-6 w-full">
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="md:max-w-7xl mx-auto p-6 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Bảng dữ liệu</h1>
            <p className="text-muted-foreground mt-1">
              Quản lý và chỉnh sửa bảng dữ liệu của bạn
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo bảng mới
          </Button>
        </div>

        {tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Table2 className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">
              Chưa có bảng nào. Tạo bảng đầu tiên của bạn!
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo bảng mới
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => (
              <div
                key={table._id}
                onClick={() => router.push(`/tables/${table._id}`)}
                className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{table.title}</h3>
                  <Table2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
                {table.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {table.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Cập nhật: {new Date(table.updatedAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
            ))}
          </div>
        )}

        <CreateTableModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default TablesPage;

