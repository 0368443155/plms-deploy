"use client";

import { cn } from "@/lib/utils";
import {
  ChevronsLeft,
  MenuIcon,
  Plus,
  PlusCircle,
  Search,
  Settings,
  Trash,
  Calendar,
  Table2,
} from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ElementRef, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "usehooks-ts";
import { UserItem } from "./user-item";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Item } from "./item";
import { toast } from "sonner";
import { DocumentList } from "./document-list";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TrashBox } from "./trash-box";
import { useSearch } from "@/hooks/use-search";
import { useSettings } from "@/hooks/use-settings";
import { Navbar } from "./navbar";
import { TemplatePicker } from "@/components/template-picker";
import { Template } from "@/lib/templates";
import Link from "next/link";
import Image from "next/image";
import { Notifications } from "./notifications";
import { Home } from "lucide-react";

export const Navigation = () => {
  const router = useRouter();
  const search = useSearch();
  const settings = useSettings();
  const params = useParams();
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width: 768px)"); // mobile screen size break point
  const create = useMutation(api.documents.create);

  const isResizingRef = useRef(false);
  const sidebarRef = useRef<ElementRef<"aside">>(null);
  const navbarRef = useRef<ElementRef<"div">>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(isMobile); // collapse the sidebar by default if it is a mobile
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  useEffect(() => {
    if (isMobile) {
      collapse();
    } else {
      resetWidth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) {
      collapse();
    }
  }, [pathname, isMobile]);

  const handleMouseDown = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    isResizingRef.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // to handle resizing the sidebar
  const handleMouseMove = (event: MouseEvent) => {
    if (!isResizingRef.current) return; // if isResizingRef is false, break the function
    let newWidth = event.clientX; // get the width

    if (newWidth < 240) newWidth = 240; // minimum width limit
    if (newWidth > 480) newWidth = 480; // maximum width limit

    // if sidebarRef and navbarRef are active
    if (sidebarRef.current && navbarRef.current) {
      sidebarRef.current.style.width = `${newWidth}px`; // set the sidebar width
      navbarRef.current.style.setProperty("left", `${newWidth}px`); // reposition the navbar
      navbarRef.current.style.setProperty(
        "width",
        `calc(100% - ${newWidth}px)`
      ); // recalculate the navbar width
    }
  };

  const handleMouseUp = () => {
    isResizingRef.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // reset the sidebar width to its original width
  const resetWidth = () => {
    if (sidebarRef.current && navbarRef.current) {
      setIsCollapsed(false);
      setIsResetting(true);

      sidebarRef.current.style.width = isMobile ? "100%" : "240px";
      navbarRef.current.style.setProperty(
        "width",
        isMobile ? "0" : "calc(100% - 240px)"
      );
      navbarRef.current.style.setProperty("left", isMobile ? "100%" : "240px");
      setTimeout(() => setIsResetting(false), 300);
    }
  };

  // handle the collapsing of the sidebar
  const collapse = () => {
    if (sidebarRef.current && navbarRef.current) {
      setIsCollapsed(true);
      setIsResetting(true);

      sidebarRef.current.style.width = "0";
      navbarRef.current.style.setProperty("width", "100%");
      navbarRef.current.style.setProperty("left", "0");
      setTimeout(() => setIsResetting(false), 300);
    }
  };

  // handle creating a new document (with optional template)
  const handleCreate = (template?: Template) => {
    if (!template) {
      // Create empty document
      const promise = create({
        title: "Không có tiêu đề",
      }).then((documentId) => router.push(`/documents/${documentId}`));

      toast.promise(promise, {
        loading: "Đang tạo ghi chú mới...",
        success: "Đã tạo ghi chú mới!",
        error: "Không thể tạo ghi chú mới.",
      });
      return;
    }

    const promise = create({
      title: template.title || template.name || "Không có tiêu đề",
      content: template.content, // Already a JSON string
      icon: template.icon,
    }).then((documentId) => router.push(`/documents/${documentId}`));

    toast.promise(promise, {
      loading: "Đang tạo ghi chú mới...",
      success: "Đã tạo ghi chú mới!",
      error: "Không thể tạo ghi chú mới.",
    });
  };

  // Show template picker when creating new document
  const handleCreateWithTemplate = () => {
    setIsTemplatePickerOpen(true);
  };

  return (
    <>
      <aside
        ref={sidebarRef}
        className={cn(
          "group/sidebar h-full bg-secondary overflow-y-auto relative flex w-60 flex-col z-[99999]",
          isResetting && "transition-all ease-in-out duration-300",
          isMobile && "w-0"
        )}
      >
        {/* To collapse the sidebar */}
        <div
          role="button"
          onClick={collapse}
          className={cn(
            "h-6 w-6 text-muted-foreground rounded-sm hover:bg-neutral-300 dark:bg-neutral-600 absolute top-3 right-2 opacity-100 transition"
          )}
        >
          <ChevronsLeft className="h-6 w-6" />
        </div>
        <div>
          <Link
            href="/"
            className="flex items-center gap-x-2 px-3 py-2 mb-2 pr-10 hover:bg-primary/5 rounded-sm transition-colors"
          >
            <Image
              src="/logo.svg"
              height={24}
              width={24}
              alt="Logo"
              className="dark:hidden"
            />
            <Image
              src="/logo-dark.svg"
              height={24}
              width={24}
              alt="Logo"
              className="hidden dark:block"
            />
            <span className="font-semibold text-sm">PLMS</span>
            <Home className="h-4 w-4 ml-auto text-muted-foreground" />
          </Link>
          <UserItem />
          <Item
            label="Tìm kiếm"
            icon={Search}
            isSearched
            onClick={search.onOpen}
          />
          <Item label="Cài đặt" icon={Settings} onClick={settings.onOpen} />
          <Item
            label="Lịch học"
            icon={Calendar}
            onClick={() => router.push("/schedule")}
            active={pathname === "/schedule"}
          />
          <Item
            label="Lịch tổng quan"
            icon={Calendar}
            onClick={() => router.push("/calendar")}
            active={pathname === "/calendar"}
          />
          <Item
            label="Bảng dữ liệu"
            icon={Table2}
            onClick={() => router.push("/tables")}
            active={pathname?.startsWith("/tables")}
          />
          <Item
            onClick={handleCreateWithTemplate}
            label="Trang mới"
            icon={PlusCircle}
          />
        </div>
        <div className="mt-4">
          <DocumentList />
          <Item onClick={handleCreate} icon={Plus} label="Thêm trang" />
          <Popover>
            <PopoverTrigger className="w-full mt-4">
              <Item label="Thùng rác" icon={Trash} />
            </PopoverTrigger>
            <PopoverContent
              side={isMobile ? "bottom" : "right"}
              className="p-0 w-72"
            >
              <TrashBox />
            </PopoverContent>
          </Popover>
        </div>
        <TemplatePicker
          open={isTemplatePickerOpen}
          onClose={() => setIsTemplatePickerOpen(false)}
          onSelect={(template) => {
            handleCreate(template);
            setIsTemplatePickerOpen(false);
          }}
        />
        {/* To resize the sidebar */}
        <div
          onMouseDown={handleMouseDown}
          onClick={resetWidth}
          className="opacity-100 transition cursor-ew-resize absolute h-full w-1 bg-primary/10 right-0 top-0"
        />
      </aside>
      {/* Navbar */}
      <div
        ref={navbarRef}
        className={cn(
          "absolute top-0 z-[99999] left-60 w-[calc(100%-240px)]",
          isResetting && "transition-all ease-in-out duration-300",
          isMobile && "left-0 w-full"
        )}
      >
        {!!params.documentId ? (
          <Navbar isCollapsed={isCollapsed} onResetWidth={resetWidth} />
        ) : (
          <nav className="bg-transparent px-3 py-2 w-full flex items-center justify-between">
            {/* If the sidebar is collapsed, show the menu icon to let the user reopen the sidebar */}
            {isCollapsed ? (
              <MenuIcon
                onClick={resetWidth}
                role="button"
                className="h-6 w-6 text-muted-foreground"
              />
            ) : (
              <div /> // Spacer
            )}
            <div className="flex items-center gap-x-2">
              <Notifications />
            </div>
          </nav>
        )}
      </div>
    </>
  );
};
