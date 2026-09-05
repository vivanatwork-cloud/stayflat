"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function MobileSiteMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open]);

  return (
    <div className="site-mobile-menu" ref={menuRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="site-mobile-menu-links"
        aria-label={open ? "Close page menu" : "Open page menu"}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">{open ? "×" : "☰"}</span>
      </button>
      {open ? (
        <div id="site-mobile-menu-links" onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
