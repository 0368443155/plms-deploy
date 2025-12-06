"use client";

import { templates, Template } from "@/lib/templates";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template?: Template) => void;
}

export const TemplatePicker = ({
  open,
  onClose,
  onSelect,
}: TemplatePickerProps) => {
  const handleSelect = (template: Template) => {
    onSelect(template);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Chọn Template</DialogTitle>
          <DialogDescription>
            Chọn một template để bắt đầu nhanh chóng. Bạn có thể chỉnh sửa sau.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleSelect(template)}
                className={cn(
                  "p-4 border rounded-lg cursor-pointer transition-all",
                  "hover:bg-accent hover:border-primary",
                  "flex flex-col gap-2"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{template.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={() => {
              onSelect(undefined); // Pass undefined to create empty page
              onClose();
            }}
            className="text-sm text-muted-foreground hover:text-foreground w-full text-center"
          >
            Hoặc tạo trang trống
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

