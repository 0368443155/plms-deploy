"use client";

import { useState, useEffect } from "react";
import { useSignIn, useUser } from "@clerk/clerk-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/spinner";
import { toast } from "sonner";
import { Logo } from "../../_components/logo";
import { ArrowLeft } from "lucide-react";

export default function SignInPage() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isSignedIn } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [verificationStrategy, setVerificationStrategy] = useState<string | null>(null);
  const router = useRouter();

  // Redirect nếu đã đăng nhập
  useEffect(() => {
    if (isSignedIn) {
      router.push("/documents");
    }
  }, [isSignedIn, router]);

  // Reset local state khi component mount (sau khi đăng xuất)
  useEffect(() => {
    // Reset form state khi vào trang
    setPendingVerification(false);
    setCode("");
    setVerificationStrategy(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);

    try {
      // Bước 1: Tạo session đăng nhập
      const result = await signIn.create({
        identifier: email,
        password,
      });

      // Debug logs (có thể xóa sau)
      console.log("Sign in result:", {
        status: result.status,
        createdSessionId: result.createdSessionId,
        supportedFirstFactors: result.supportedFirstFactors,
        supportedSecondFactors: result.supportedSecondFactors,
      });

      // Kiểm tra trạng thái kết quả
      if (result.status === "complete") {
        // Đăng nhập thành công - không cần 2FA
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          toast.success("Đăng nhập thành công!");
          router.push("/documents");
        } else {
          toast.error("Không thể tạo session. Vui lòng thử lại.");
        }
      } else if (result.status === "needs_second_factor") {
        // Cần xác thực 2 yếu tố - kiểm tra supportedSecondFactors
        const supportedStrategies = result.supportedSecondFactors || [];
        console.log("Supported second factors:", supportedStrategies);
        
        // Tìm strategy phù hợp (totp, phone_code, etc.)
        const totpStrategy = supportedStrategies.find(
          (strategy: any) => strategy.strategy === "totp"
        );
        
        const phoneStrategy = supportedStrategies.find(
          (strategy: any) => strategy.strategy === "phone_code"
        );
        
        // Ưu tiên totp, nếu không có thì dùng phone_code
        const selectedStrategy = totpStrategy || phoneStrategy || supportedStrategies[0];
        
        if (selectedStrategy) {
          setVerificationStrategy(selectedStrategy.strategy);
          setPendingVerification(true);
          toast("Vui lòng nhập mã xác thực từ ứng dụng của bạn");
        } else {
          console.error("No supported second factor found:", supportedStrategies);
          toast.error("Không tìm thấy phương thức xác thực phù hợp. Vui lòng liên hệ hỗ trợ.");
        }
      } else if (result.status === "needs_first_factor") {
        // Cần xác thực bước đầu (thường không xảy ra với email/password)
        const supportedStrategies = result.supportedFirstFactors || [];
        console.log("Needs first factor, supported:", supportedStrategies);
        
        // Nếu có password strategy, thử lại
        const passwordStrategy = supportedStrategies.find(
          (strategy: any) => strategy.strategy === "password"
        );
        
        if (passwordStrategy) {
          // Đã có password trong create, có thể cần thử lại
          toast.error("Mật khẩu không đúng. Vui lòng thử lại.");
        } else {
          toast("Vui lòng kiểm tra email để xác thực");
        }
      } else {
        console.error("Unknown sign in status:", result.status);
        toast.error("Đăng nhập không thành công. Vui lòng thử lại.");
      }
    } catch (err: any) {
      console.error("Sign in error:", err);
      console.error("Error details:", {
        errors: err?.errors,
        message: err?.message,
        status: err?.status,
      });
      
      // Xử lý error theo đặc tả UC01
      const errorCode = err?.errors?.[0]?.code;
      let errorMessage = "Đăng nhập thất bại. Vui lòng thử lại.";
      
      switch (errorCode) {
        case "form_identifier_not_found":
          errorMessage = "Không tìm thấy tài khoản. Vui lòng kiểm tra lại email.";
          break;
        case "form_password_incorrect":
          errorMessage = "Mật khẩu không đúng. Vui lòng thử lại.";
          break;
        case "session_exists":
          // Đã đăng nhập rồi, redirect
          router.push("/documents");
          return;
        case "rate_limit_exceeded":
          errorMessage = "Quá nhiều lần thử. Vui lòng thử lại sau 30 phút.";
          break;
        default:
          errorMessage = err?.errors?.[0]?.longMessage || err?.message || errorMessage;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn || !verificationStrategy) return;

    setIsLoading(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: verificationStrategy as any,
        code,
      });

      if (result.status === "complete") {
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          toast.success("Đăng nhập thành công!");
          router.push("/documents");
        }
      } else {
        toast.error("Mã xác thực không đúng. Vui lòng thử lại.");
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      
      const errorCode = err?.errors?.[0]?.code;
      let errorMessage = "Xác thực thất bại. Vui lòng thử lại.";
      
      switch (errorCode) {
        case "form_code_incorrect":
          errorMessage = "Mã xác thực không đúng. Vui lòng thử lại.";
          break;
        case "form_code_expired":
          errorMessage = "Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.";
          break;
        default:
          errorMessage = err?.errors?.[0]?.longMessage || err?.message || errorMessage;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded || isSignedIn) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo và nút quay lại */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
          </Link>
          <Logo />
        </div>

        {/* Form đăng nhập */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Đăng nhập</h1>
            <p className="text-muted-foreground mt-2">
              Chào mừng trở lại! Vui lòng đăng nhập vào tài khoản của bạn.
            </p>
          </div>

          {!pendingVerification ? (
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Link
                    href="/sign-in/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                    Đang đăng nhập...
                  </>
                ) : (
                  "Đăng nhập"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Mã xác thực</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Nhập mã xác thực"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Vui lòng nhập mã xác thực từ ứng dụng xác thực của bạn.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setPendingVerification(false);
                    setCode("");
                  }}
                  disabled={isLoading}
                >
                  Quay lại
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <span className="mr-2">
                        <Spinner size="sm" />
                      </span>
                      Đang xác thực...
                    </>
                  ) : (
                    "Xác thực"
                  )}
                </Button>
              </div>
            </form>
          )}

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Chưa có tài khoản? </span>
            <Link href="/sign-up" className="text-primary hover:underline">
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

