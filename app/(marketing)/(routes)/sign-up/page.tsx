"use client";

import { useState, useEffect } from "react";
import { useSignUp, useUser } from "@clerk/clerk-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/spinner";
import { toast } from "sonner";
import { Logo } from "../../_components/logo";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function SignUpPage() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const { isSignedIn } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const router = useRouter();

  // Redirect nếu đã đăng nhập
  useEffect(() => {
    if (isSignedIn) {
      router.push("/documents");
    }
  }, [isSignedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    // Validate password confirmation
    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp. Vui lòng thử lại.");
      return;
    }

    setIsLoading(true);

    try {
      // Tạo tài khoản mới
      await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      // Kiểm tra trạng thái sau khi tạo
      // Nếu email verification không bật, signUp.status sẽ là "complete" và có session
      if (signUp.status === "complete") {
        if (signUp.createdSessionId && setActive) {
          await setActive({ session: signUp.createdSessionId });
          toast.success("Đăng ký thành công!");
          router.push("/documents");
          return;
        }
      }

      // Nếu cần verification, thử gửi email verification
      if (signUp.status === "missing_requirements") {
        try {
          // Thử gửi email verification
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setPendingVerification(true);
          toast.success("Vui lòng kiểm tra email để xác thực tài khoản");
        } catch (verifyErr: any) {
          console.error("Verification error:", verifyErr);
          // Nếu không thể gửi verification, nhưng có session thì vẫn set active
          if (signUp.createdSessionId && setActive) {
            await setActive({ session: signUp.createdSessionId });
            toast.success("Đăng ký thành công!");
            router.push("/documents");
          } else {
            const errorMessage = verifyErr?.errors?.[0]?.longMessage || verifyErr?.message || "Không thể gửi email xác thực. Vui lòng thử lại.";
            toast.error(errorMessage);
          }
        }
      } else {
        // Trạng thái khác, thử set active nếu có session
        if (signUp.createdSessionId && setActive) {
          await setActive({ session: signUp.createdSessionId });
          toast.success("Đăng ký thành công!");
          router.push("/documents");
        } else {
          toast.error("Đăng ký không thành công. Vui lòng thử lại.");
        }
      }
    } catch (err: any) {
      console.error("Sign up error:", err);
      
      // Xử lý error theo đặc tả UC02
      const errorCode = err?.errors?.[0]?.code;
      let errorMessage = "Đăng ký thất bại. Vui lòng thử lại.";
      
      switch (errorCode) {
        case "form_identifier_exists":
          errorMessage = "Email này đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng email khác.";
          break;
        case "form_password_pwned":
          errorMessage = "Mật khẩu này đã bị rò rỉ. Vui lòng sử dụng mật khẩu khác.";
          break;
        case "form_param_format_invalid":
          errorMessage = "Email không hợp lệ. Vui lòng kiểm tra lại.";
          break;
        case "form_password_length_too_short":
          errorMessage = "Mật khẩu phải có ít nhất 8 ký tự.";
          break;
        case "rate_limit_exceeded":
          errorMessage = "Quá nhiều lần thử. Vui lòng thử lại sau 1 giờ.";
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
    if (!isLoaded || !signUp) return;

    setIsLoading(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete") {
        if (result.createdSessionId && setActive) {
          await setActive({ session: result.createdSessionId });
          toast.success("Đăng ký thành công!");
          router.push("/documents");
        } else {
          toast.error("Không thể tạo session. Vui lòng thử lại.");
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
      <div className="w-full max-w-md space-y-8 mt-[-80px]">
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

        {/* Form đăng ký */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Đăng ký</h1>
            <p className="text-muted-foreground mt-2">
              Tạo tài khoản mới để bắt đầu sử dụng PLMS.
            </p>
          </div>

          {!pendingVerification ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Họ</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Nguyễn"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Tên</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Văn A"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

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
                <Label htmlFor="password">Mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Tối thiểu 8 ký tự"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Nhập lại mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="mr-2">
                      <Spinner size="sm" />
                    </span>
                    Đang tạo tài khoản...
                  </>
                ) : (
                  "Đăng ký"
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
                  placeholder="Nhập mã từ email"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Chúng tôi đã gửi mã xác thực đến email của bạn. Vui lòng kiểm tra và nhập mã.
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
            <span className="text-muted-foreground">Đã có tài khoản? </span>
            <Link href="/sign-in" className="text-primary hover:underline">
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

