"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/clerk-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/spinner";
import { toast } from "sonner";
import { Logo } from "../../../_components/logo";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const { signIn, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setIsLoading(true);

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setCodeSent(true);
      toast.success("Đã gửi mã đặt lại mật khẩu đến email của bạn");
    } catch (err: any) {
      console.error("Error:", err);
      const errorMessage = err?.errors?.[0]?.longMessage || err?.message || "Không thể gửi email. Vui lòng thử lại.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });

      if (result.status === "complete") {
        toast.success("Đặt lại mật khẩu thành công!");
        // Redirect to sign in
        window.location.href = "/sign-in";
      } else {
        toast.error("Mã xác thực không đúng. Vui lòng thử lại.");
      }
    } catch (err: any) {
      console.error("Error:", err);
      const errorMessage = err?.errors?.[0]?.longMessage || err?.message || "Đặt lại mật khẩu thất bại. Vui lòng thử lại.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo và nút quay lại */}
        <div className="flex items-center gap-4">
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
          </Link>
          <Logo />
        </div>

        {/* Form quên mật khẩu */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Quên mật khẩu</h1>
            <p className="text-muted-foreground mt-2">
              Nhập email của bạn để nhận mã đặt lại mật khẩu.
            </p>
          </div>

          {!codeSent ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="mr-2">
                      <Spinner size="sm" />
                    </span>
                    Đang gửi...
                  </>
                ) : (
                  "Gửi mã đặt lại mật khẩu"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Mã xác thực</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Nhập mã từ email"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Mật khẩu mới</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Tối thiểu 8 ký tự"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={8}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="mr-2">
                      <Spinner size="sm" />
                    </span>
                    Đang đặt lại...
                  </>
                ) : (
                  "Đặt lại mật khẩu"
                )}
              </Button>
            </form>
          )}

          <div className="text-center text-sm">
            <Link href="/sign-in" className="text-primary hover:underline">
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

