"use client";

import { useScrollTop } from "@/hooks/use-scroll-top";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { ModeToggle } from "@/components/mode-toggle";
import { useConvexAuth } from "convex/react";
import { UserButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/spinner";
import Link from "next/link";

export const Navbar = () => {
  const scrolled = useScrollTop();
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <div
      className={cn(
        "z-50 bg-background dark:bg-[#1F1F1F] fixed top-0 flex items-center w-full p-6",
        scrolled && "border-b shadow-sm"
      )}
    >
      <Logo />
      <div className="md:ml-auto md:justify-end justify-between w-full flex items-center gap-x-2">
        {isLoading && <Spinner />}
        {!isAuthenticated && !isLoading && (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sign-in">Đăng nhập</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/sign-up">Dùng PLMS miễn phí</Link>
            </Button>
          </>
        )}
        {isAuthenticated && !isLoading && (
          <>
            <Button variant="default" size="sm" asChild>
              <Link href="/documents">Vào PLMS</Link>
            </Button>
            <UserButton afterSignOutUrl="/" />
          </>
        )}
        <ModeToggle />
      </div>
    </div>
  );
};
