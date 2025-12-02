"use client";

import { Spinner } from "@/components/spinner";
import { useConvexAuth } from "convex/react";
import { redirect, useRouter } from "next/navigation";
import { Navigation } from "./_components/navigation";
import { SearchCommand } from "@/components/search-command";
import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useStudyMode } from "@/hooks/use-study-mode";
import { cn } from "@/lib/utils";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const create = useMutation(api.documents.create);
  const isStudyMode = useStudyMode((state) => state.isActive);

  // Quick Note handler: Ctrl+Shift+N
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleQuickNote = (e: KeyboardEvent) => {
      // Ctrl+Shift+N (Windows) or Cmd+Shift+N (Mac)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "n"
      ) {
        e.preventDefault();

        const timestamp = new Date().toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const promise = create({
          title: `Quick Note ${timestamp}`,
          icon: "📌",
        }).then((documentId) => {
          router.push(`/documents/${documentId}`);
        });

        toast.promise(promise, {
          loading: "Đang tạo quick note...",
          success: "Đã tạo quick note!",
          error: "Không thể tạo quick note.",
        });
      }
    };

    document.addEventListener("keydown", handleQuickNote);
    return () => document.removeEventListener("keydown", handleQuickNote);
  }, [isAuthenticated, create, router]);

  // if it is a loading state, show the Spinner component
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // to protect the route from being accessed without logging in.
  // redirect the user to the landing page
  if (!isAuthenticated) {
    return redirect("/");
  }

  return (
    <div className={cn("h-full flex dark:bg-[#1F1F1F]", isStudyMode && "study-mode-layout")}>
      {!isStudyMode && <Navigation />}
      <main className={cn("flex-1 h-full overflow-y-auto", isStudyMode && "w-full")}>
        {!isStudyMode && <SearchCommand />}
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
