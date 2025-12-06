"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Command,
} from "@/components/ui/command";
import { api } from "@/convex/_generated/api";
import { useSearch } from "@/hooks/use-search";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { File } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { matchesSearch } from "@/lib/utils";

export const SearchCommand = () => {
  const { user } = useUser();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  // Sử dụng searchDocuments query với search term
  // Nếu search rỗng, query sẽ return tất cả documents
  const documents = useQuery(
    api.documents.searchDocuments,
    search.trim() !== "" ? { search: search.trim() } : "skip"
  );

  // Fallback: Nếu search rỗng, dùng getSearch để show tất cả
  const allDocuments = useQuery(
    api.documents.getSearch,
    search.trim() === "" ? {} : "skip"
  );

  // Sử dụng documents từ searchDocuments nếu có search term, nếu không dùng allDocuments
  // Filter thêm ở client-side để đảm bảo tìm kiếm hoạt động đúng với normalizeVietnamese
  const displayDocuments = useMemo(() => {
    const docs = search.trim() !== "" ? documents : allDocuments;
    if (!docs || docs.length === 0) return [];
    
    // Nếu có search term, filter lại ở client-side để đảm bảo tìm kiếm đúng
    if (search.trim() !== "") {
      return docs.filter((doc) => matchesSearch(search.trim(), doc.title));
    }
    
    return docs;
  }, [documents, allDocuments, search]);

  const toggle = useSearch((store) => store.toggle);
  const isOpen = useSearch((store) => store.isOpen);
  const onClose = useSearch((store) => store.onClose);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener("keydown", down);

    return () => document.removeEventListener("keydown", down);
  }, [toggle]);

  const onSelect = (id: string) => {
    router.push(`/documents/${id}`);
    onClose();
    setSearch(""); // Reset search khi đóng
  };

  // Reset search khi đóng modal
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  if (!isMounted) return null;

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose} shouldFilter={false}>
      <CommandInput
        placeholder={`Tìm kiếm PLMS của ${user?.fullName}...`}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          {search.trim() !== ""
            ? "Không tìm thấy kết quả."
            : "Nhập từ khóa để tìm kiếm..."}
        </CommandEmpty>
        <CommandGroup heading="Tài liệu">
          {displayDocuments?.map((document) => (
            <CommandItem
              key={document._id}
              value={document.title} // Use title as value for better search
              title={document.title}
              onSelect={() => onSelect(document._id)}
            >
              {document.icon ? (
                <p className="mr-2 text-[18px]">{document.icon}</p>
              ) : (
                <File className="mr-2 h-4 w-4" />
              )}
              <span>{document.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
