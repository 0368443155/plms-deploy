"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ModeToggle } from "@/components/mode-toggle";
import { useAccountModal } from "@/hooks/use-account-modal";
import { useUser, useClerk } from "@clerk/clerk-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/spinner";
import { User, Shield, Mail, Link as LinkIcon, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { SingleImageDropzone } from "@/components/single-image-dropzone";
import { useEdgeStore } from "@/lib/edgestore";

export const AccountModal = () => {
  const accountModal = useAccountModal();
  const { user, isLoaded: isUserLoaded } = useUser();
  const router = useRouter();
  const { edgestore } = useEdgeStore();
  const [activeTab, setActiveTab] = useState("account");
  
  // Profile state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | undefined>(undefined);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  // Username state
  const [username, setUsername] = useState("");
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  
  // Sync state with user data
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setUsername(user.username || "");
    }
  }, [user]);
  
  // Email state
  const [newEmail, setNewEmail] = useState("");
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
      // Upload to EdgeStore
      const res = await edgestore.publicFiles.upload({
        file,
        options: {
          replaceTargetUrl: user.imageUrl || undefined,
        },
      });
      
      // Update Clerk user with new image URL
      await user.update({
        imageUrl: res.url,
      });
      
      toast.success("Đã cập nhật ảnh đại diện");
      setAvatarFile(undefined);
      router.refresh();
    } catch (error: any) {
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

  const handleUpdateUsername = async () => {
    if (!user) return;
    
    setIsUpdatingUsername(true);
    try {
      await user.update({
        username: username.trim() || undefined,
      });
      toast.success("Đã cập nhật username");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.errors?.[0]?.message || "Không thể cập nhật username");
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const handleAddEmail = async () => {
    if (!user || !newEmail.trim()) return;
    
    setIsAddingEmail(true);
    try {
      await user.createEmailAddress({ email: newEmail.trim() });
      toast.success("Đã thêm email. Vui lòng kiểm tra email để xác thực.");
      setNewEmail("");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.errors?.[0]?.message || "Không thể thêm email");
    } finally {
      setIsAddingEmail(false);
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

  return (
    <Dialog open={accountModal.isOpen} onOpenChange={accountModal.onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-2xl font-semibold">Account</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account information
          </p>
        </DialogHeader>
        
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

            {/* Username Section */}
            <div className="space-y-4 border-t pt-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Username</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {user?.username ? `Username hiện tại: ${user.username}` : "Chưa có username"}
                </p>
                <div className="flex gap-2">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nhập username"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleUpdateUsername}
                    disabled={isUpdatingUsername || username === user?.username}
                  >
                    {isUpdatingUsername ? (
                      <>
                        <span className="mr-2">
                          <Spinner size="sm" />
                        </span>
                        Đang cập nhật...
                      </>
                    ) : (
                      user?.username ? "Cập nhật" : "Đặt username"
                    )}
                  </Button>
                </div>
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
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Thêm email mới"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddEmail}
                    disabled={isAddingEmail || !newEmail.trim()}
                  >
                    {isAddingEmail ? (
                      <>
                        <span className="mr-2">
                          <Spinner size="sm" />
                        </span>
                        Đang thêm...
                      </>
                    ) : (
                      "Thêm email"
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Connected Accounts Section */}
            <div className="space-y-4 border-t pt-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Connected accounts</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Kết nối tài khoản của bạn với các dịch vụ khác
                </p>
                <Button variant="outline" size="sm">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Kết nối tài khoản
                </Button>
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

