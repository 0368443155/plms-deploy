"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { PlusCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TemplatePicker } from "@/components/template-picker";
import { Template } from "@/lib/templates";
import { useState } from "react";

const DocumentsPage = () => {
  const router = useRouter();
  const { user } = useUser();
  const create = useMutation(api.documents.create);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  const handleCreate = (template?: Template) => {
    if (!template) {
      // Create empty document
      const promise = create({
        title: "Không có tiêu đề",
      }).then((documentId) => router.push(`/documents/${documentId}`));
      
      toast.promise(promise, {
        loading: "Đang tạo ghi chú mới...",
        success: "Đã tạo ghi chú mới!",
        error: "Không thể tạo ghi chú mới.",
      });
      return;
    }

    const promise = create({
      title: template.title || template.name || "Không có tiêu đề",
      content: template.content, // Already a JSON string
      icon: template.icon,
    }).then((documentId) => router.push(`/documents/${documentId}`));

    toast.promise(promise, {
      loading: "Đang tạo ghi chú mới...",
      success: "Đã tạo ghi chú mới!",
      error: "Không thể tạo ghi chú mới.",
    });
  };

  const onCreate = () => {
    setIsTemplatePickerOpen(true);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center space-y-4">
      <Image
        src="/empty.png"
        height="300"
        width="300"
        alt="Empty"
        className="dark:hidden"
      />
      <Image
        src="/empty-dark.png"
        height="300"
        width="300"
        alt="Empty"
        className="hidden dark:block"
      />
      <h2 className="text-lg font-medium">
        Chào mừng đến với PLMS của {user?.firstName}
      </h2>
      <Button onClick={onCreate}>
        <PlusCircle className="h-4 w-4 mr-2" />
        Tạo ghi chú
      </Button>
      <TemplatePicker
        open={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        onSelect={(template) => {
          handleCreate(template);
          setIsTemplatePickerOpen(false);
        }}
      />
    </div>
  );
};

export default DocumentsPage;
