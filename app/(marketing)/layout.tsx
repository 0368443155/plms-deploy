"use client";

import { Navbar } from "./_components/navbar";
import { usePathname } from "next/navigation";

const MarketingLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  // Chỉ hiển thị Navbar ở landing page, không hiển thị ở sign-in/sign-up
  const showNavbar = pathname === "/";
  // Chỉ thêm padding-top cho landing page
  const isLandingPage = pathname === "/";

  return (
    <div className="h-full dark:bg-[#1F1F1F]">
      {showNavbar && <Navbar />}
      <main className={isLandingPage ? "h-full pt-40" : "h-full"}>{children}</main>
    </div>
  );
};

export default MarketingLayout;
