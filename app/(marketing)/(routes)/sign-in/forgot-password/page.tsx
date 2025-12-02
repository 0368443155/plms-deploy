"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/clerk-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/spinner";
import { toast } from "sonner";
import { Logo } from "../../../_components/logo";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"request" | "verify" | "reset">("request");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Bước 1: Request reset code
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setStep("verify");
      // Security: Không tiết lộ email có tồn tại hay không
      toast.success("Nếu email này đã được đăng ký, bạn sẽ nhận được mã đặt lại mật khẩu");
    } catch (err: any) {
      console.error("Request reset error:", err);
      // Security: Vẫn hiển thị success message
      toast.success("Nếu email này đã được đăng ký, bạn sẽ nhận được mã đặt lại mật khẩu");
      setStep("verify");
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 2: Verify code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
      });

      if (result.status === "needs_new_password") {
        setStep("reset");
        toast.success("Mã xác thực đúng! Vui lòng nhập mật khẩu mới");
      } else {
        toast.error("Mã xác thực không đúng. Vui lòng thử lại.");
      }
    } catch (err: any) {
      console.error("Verify code error:", err);
      
      const errorCode = err?.errors?.[0]?.code;
      let errorMessage = "Xác thực thất bại. Vui lòng thử lại.";
      
      switch (errorCode) {
        case "form_code_incorrect":
          errorMessage = "Mã xác thực không đúng. Vui lòng thử lại.";
          break;
        case "form_code_expired":
          errorMessage = "Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.";
          setStep("request");
          break;
        default:
          errorMessage = err?.errors?.[0]?.longMessage || err?.message || errorMessage;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu không khớp. Vui lòng thử lại.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn.resetPassword({
        password: newPassword,
        signOutOfOtherSessions: true,
      });

      if (result.status === "complete") {
        if (result.createdSessionId && setActive) {
          await setActive({ session: result.createdSessionId });
        }
        toast.success("Đặt lại mật khẩu thành công!");
        router.push("/documents");
      } else {
        toast.error("Đặt lại mật khẩu thất bại. Vui lòng thử lại.");
      }
    } catch (err: any) {
      console.error("Reset password error:", err);
      
      const errorCode = err?.errors?.[0]?.code;
      let errorMessage = "Đặt lại mật khẩu thất bại. Vui lòng thử lại.";
      
      switch (errorCode) {
        case "form_password_pwned":
          errorMessage = "Mật khẩu này đã bị rò rỉ. Vui lòng sử dụng mật khẩu khác.";
          break;
        case "form_password_length_too_short":
          errorMessage = "Mật khẩu phải có ít nhất 8 ký tự.";
          break;
        default:
          errorMessage = err?.errors?.[0]?.longMessage || err?.message || errorMessage;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code
  const handleResendCode = async () => {
    if (!isLoaded || !signIn) return;

    setIsLoading(true);

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      toast.success("Đã gửi lại mã xác thực");
    } catch (err: any) {
      console.error("Resend code error:", err);
      toast.error("Không thể gửi lại mã. Vui lòng thử lại.");
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

          {step === "request" && (
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
          )}

          {step === "verify" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Mã xác thực</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Nhập mã 6 số từ email"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  disabled={isLoading}
                  maxLength={6}
                />
                <p className="text-sm text-muted-foreground">
                  Chúng tôi đã gửi mã 6 số đến {email}
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || code.length !== 6}>
                {isLoading ? (
                  <>
                    <span className="mr-2">
                      <Spinner size="sm" />
                    </span>
                    Đang xác thực...
                  </>
                ) : (
                  "Xác thực mã"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleResendCode}
                className="w-full"
                disabled={isLoading}
              >
                Gửi lại mã
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("request")}
                className="w-full"
                disabled={isLoading}
              >
                Quay lại
              </Button>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={8}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !newPassword || newPassword !== confirmPassword}
              >
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

              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("verify")}
                className="w-full"
                disabled={isLoading}
              >
                Quay lại
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

