"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const supportsDarkMode = (pathname: string) =>
  ["/report", "/onboarding", "/journal"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

export function RouteTheme() {
  const pathname = usePathname();

  useEffect(() => {
    let theme = "light";
    if (supportsDarkMode(pathname)) {
      const saved = localStorage.getItem("stayflat_theme");
      theme = saved === "light" || saved === "dark"
        ? saved
        : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [pathname]);

  return null;
}
