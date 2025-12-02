"use client";

import { Cover } from "@/components/cover";
import { Toolbar } from "@/components/toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useMemo, useEffect } from "react";
import { useStudyMode } from "@/hooks/use-study-mode";
import { cn } from "@/lib/utils";

interface DocumentIdPageProps {
  params: {
    documentId: Id<"documents">;
  };
}

const DocumentIdPage = ({ params }: DocumentIdPageProps) => {
  const Editor = useMemo(
    () => dynamic(() => import("@/components/editor"), { ssr: false }),
    []
  );

  const document = useQuery(api.documents.getById, {
    documentId: params.documentId,
  });

  const update = useMutation(api.documents.update);
  const { isActive: isStudyMode, toggle: toggleStudyMode } = useStudyMode();

  const onChange = (content: string) => {
    update({ id: params.documentId, content: content });
  };

  // F11 keyboard shortcut for Study Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F11 key
      if (e.key === "F11") {
        e.preventDefault();
        toggleStudyMode();
      }
      // Esc to exit study mode
      if (e.key === "Escape" && isStudyMode) {
        toggleStudyMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isStudyMode, toggleStudyMode]);

  if (document === undefined) {
    return (
      <div>
        <Cover.Skeleton />
        <div className="md:max-w-3xl lg:max-w-4xl mx-auto mt-10">
          <div className="space-y-4 pl-8 pt-4">
            <Skeleton className="h-14 w-[50%]" />
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-4 w-[40%]" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
        </div>
      </div>
    );
  }

  if (document === null) {
    return <div>Không tìm thấy</div>;
  }

  return (
    <div
      className={cn(
        "transition-all duration-300",
        isStudyMode ? "pb-20" : "pb-40"
      )}
      id="document-content"
    >
      {!isStudyMode && <Cover url={document.coverImage} />}
      <div
        className={cn(
          "mx-auto transition-all duration-300",
          isStudyMode
            ? "max-w-4xl px-8 pt-8"
            : "md:max-w-3xl lg:max-w-4xl"
        )}
      >
        {!isStudyMode && <Toolbar initialData={document} />}
        {isStudyMode && (
          <div className="mb-8 pb-4 border-b">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-bold">{document.title}</h1>
              <button
                onClick={toggleStudyMode}
                className="text-sm text-muted-foreground hover:text-foreground px-3 py-1 border rounded hover:bg-accent"
              >
                Thoát Study Mode (Esc)
              </button>
            </div>
          </div>
        )}
        <Editor onChange={onChange} initialContent={document.content} />
      </div>
    </div>
  );
};

export default DocumentIdPage;
