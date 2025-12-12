"use client";

import { Label } from "@/components/ui/label";
import { ModeToggle } from "@/components/mode-toggle";
import { useUser, useClerk } from "@clerk/clerk-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/spinner";
import { User, Shield, Mail, Eye, EyeOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { SingleImageDropzone } from "@/components/single-image-dropzone";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AccountSettingsContentProps {
}

export const AccountSettingsContent = ({ }: AccountSettingsContentProps) => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("account");

  // Profile state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | undefined>(undefined);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Sync state with user data
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user]);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete account state
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleAvatarUpload = async (file?: File) => {
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ chấp nhận file ảnh");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước ảnh không được vượt quá 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Upload avatar trực tiếp lên Clerk sử dụng Clerk API
      await user.setProfileImage({ file });

      toast.success("Đã cập nhật ảnh đại diện");
      setAvatarFile(undefined);
      router.refresh();
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast.error(error?.errors?.[0]?.message || "Không thể cập nhật ảnh đại diện");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setIsUpdatingProfile(true);
    try {
      const updateData: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };

      await user.update(updateData);
      toast.success("Đã cập nhật thông tin cá nhân");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.errors?.[0]?.message || "Không thể cập nhật thông tin");
    } finally {
      setIsUpdatingProfile(false);
    }
  };


  const handleSetPrimaryEmail = async (emailId: string) => {
    if (!user) return;

    try {
      const emailAddress = user.emailAddresses.find(e => e.id === emailId);
      if (emailAddress && emailAddress.verification?.status === "verified") {
        toast("Email này sẽ trở thành email chính sau khi được xác thực");
        router.refresh();
      } else {
        toast.error("Vui lòng xác thực email trước");
      }
    } catch (error: any) {
      toast.error(error?.errors?.[0]?.message || "Không thể đặt email chính");
    }
  };

  const handleChangePassword = async () => {
    if (!user || !isUserLoaded) {
      toast.error("Vui lòng đợi hệ thống tải thông tin người dùng");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    if (!currentPassword) {
      toast.error("Vui lòng nhập mật khẩu hiện tại");
      return;
    }

    // Kiểm tra mật khẩu mới không được trùng với mật khẩu hiện tại
    if (currentPassword === newPassword) {
      toast.error("Mật khẩu mới không được trùng với mật khẩu hiện tại");
      return;
    }

    setIsChangingPassword(true);
    try {
      // Đảm bảo user object được refresh trước khi update
      await user.reload();

      // Kiểm tra xem user có password strategy không
      const hasPassword = user.passwordEnabled;
      if (!hasPassword) {
        toast.error("Tài khoản của bạn không có mật khẩu. Vui lòng đặt mật khẩu từ trang đăng nhập.");
        return;
      }

      await user.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: false, // Không đăng xuất khỏi các thiết bị khác
      });

      toast.success("Đã đổi mật khẩu thành công");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch (error: any) {
      console.error("Change password error:", error);

      // Xử lý các lỗi cụ thể
      const errorCode = error?.errors?.[0]?.code;
      const errorMessage = error?.errors?.[0]?.message || error?.message;

      switch (errorCode) {
        case "form_password_incorrect":
          toast.error("Mật khẩu hiện tại không đúng");
          break;
        case "form_password_pwned":
          toast.error("Mật khẩu này đã bị rò rỉ. Vui lòng sử dụng mật khẩu khác");
          break;
        case "form_password_length_too_short":
          toast.error("Mật khẩu phải có ít nhất 8 ký tự");
          break;
        case "form_password_same_as_current":
          toast.error("Mật khẩu mới phải khác mật khẩu hiện tại");
          break;
        case "session_missing":
        case "session_invalid":
          toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại");
          router.push("/sign-in");
          break;
        default:
          toast.error(errorMessage || "Không thể đổi mật khẩu. Vui lòng thử lại sau");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeletingAccount(true);
    try {
      // Gọi trực tiếp Clerk API từ client-side
      // Clerk sẽ tự động xử lý reverification nếu cần
      await user.delete();

      toast.success("Tài khoản đã được xóa thành công");
      // Redirect về trang chủ sau khi xóa
      window.location.href = "/";
    } catch (error: any) {
      console.error("Delete account error:", error);

      const errorCode = error?.errors?.[0]?.code;
      const errorMessage = error?.errors?.[0]?.message || error?.message;

      // Xử lý lỗi reverification
      if (errorCode === "session_reverification_required") {
        // Clerk yêu cầu reverification - yêu cầu người dùng đăng nhập lại
        toast.error("Vui lòng đăng nhập lại để xác thực trước khi xóa tài khoản");
        setTimeout(() => {
          clerk.signOut();
          router.push("/sign-in");
        }, 2000);
      } else {
        toast.error(errorMessage || "Không thể xóa tài khoản. Vui lòng thử lại sau");
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="account" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Account
        </TabsTrigger>
        <TabsTrigger value="security" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Security
        </TabsTrigger>
      </TabsList>

      <TabsContent value="account" className="space-y-6 mt-6">
        {/* Profile Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-4">Profile</h3>
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.fullName || "Chưa có tên"}</p>
                <p className="text-sm text-muted-foreground">{user?.emailAddresses[0]?.emailAddress}</p>
              </div>
            </div>

            {/* Avatar Upload */}
            <div className="space-y-2 mb-4">
              <Label>Ảnh đại diện</Label>
              <SingleImageDropzone
                width={200}
                height={200}
                value={avatarFile || user?.imageUrl}
                onChange={handleAvatarUpload}
                disabled={isUploadingAvatar}
                dropzoneOptions={{
                  maxSize: 5 * 1024 * 1024, // 5MB
                }}
              />
              {isUploadingAvatar && (
                <p className="text-sm text-muted-foreground">Đang tải lên...</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Họ</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Nhập họ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Tên</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nhập tên"
                />
              </div>
            </div>
            <Button
              onClick={handleUpdateProfile}
              disabled={isUpdatingProfile || (
                firstName === user?.firstName &&
                lastName === user?.lastName
              )}
              className="mt-4"
            >
              {isUpdatingProfile ? (
                <>
                  <span className="mr-2">
                    <Spinner size="sm" />
                  </span>
                  Đang cập nhật...
                </>
              ) : (
                "Cập nhật thông tin"
              )}
            </Button>
          </div>
        </div>

        {/* Email Addresses Section */}
        <div className="space-y-4 border-t pt-4">
          <div>
            <h3 className="text-lg font-medium mb-4">Email addresses</h3>
            <div className="space-y-2 mb-4">
              {user?.emailAddresses.map((email) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{email.emailAddress}</span>
                    {email.verification?.status === "verified" && (
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        Verified
                      </span>
                    )}
                    {email.id === user.primaryEmailAddressId && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  {email.id !== user.primaryEmailAddressId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPrimaryEmail(email.id)}
                    >
                      Đặt làm chính
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Theme Section */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-y-1">
              <Label>Giao diện</Label>
              <span className="text-[0.8rem] text-muted-foreground">
                Tùy chỉnh giao diện PLMS trên thiết bị của bạn
              </span>
            </div>
            <ModeToggle />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="security" className="space-y-6 mt-6">
        {/* Change Password Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-4">Change Password</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Mật khẩu mới</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full"
              >
                {isChangingPassword ? (
                  <>
                    <span className="mr-2">
                      <Spinner size="sm" />
                    </span>
                    Đang đổi mật khẩu...
                  </>
                ) : (
                  "Đổi mật khẩu"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Delete Account Section */}
        <div className="space-y-4 border-t pt-4">
          <div>
            <h3 className="text-lg font-medium mb-2 text-destructive">Xóa tài khoản</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Khi bạn xóa tài khoản, tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn và không thể khôi phục. Hành động này không thể hoàn tác.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={isDeletingAccount}
                  className="w-full"
                >
                  {isDeletingAccount ? (
                    <>
                      <span className="mr-2">
                        <Spinner size="sm" />
                      </span>
                      Đang xóa tài khoản...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Xóa tài khoản
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive">
                    Bạn có chắc chắn muốn xóa tài khoản?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      Hành động này sẽ xóa vĩnh viễn tài khoản của bạn và tất cả dữ liệu liên quan, bao gồm:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Tất cả các tài liệu và ghi chú</li>
                      <li>Thông tin cá nhân</li>
                      <li>Lịch sử hoạt động</li>
                      <li>Tất cả dữ liệu khác trong tài khoản</li>
                    </ul>
                    <p className="font-semibold text-destructive mt-2">
                      Hành động này không thể hoàn tác!
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingAccount}>
                    Hủy
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeletingAccount ? (
                      <>
                        <span className="mr-2">
                          <Spinner size="sm" />
                        </span>
                        Đang xóa...
                      </>
                    ) : (
                      "Xóa tài khoản vĩnh viễn"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
};

