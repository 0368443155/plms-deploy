"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAccountModal } from "@/hooks/use-account-modal";
import { AccountSettingsContent } from "./account-settings-content";

export const AccountModal = () => {
  const accountModal = useAccountModal();

  return (
    <Dialog open={accountModal.isOpen} onOpenChange={accountModal.onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-2xl font-semibold">Account</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account information
          </p>
        </DialogHeader>
        
        <AccountSettingsContent showAvatarUpload={true} />
      </DialogContent>
    </Dialog>
  );
};

