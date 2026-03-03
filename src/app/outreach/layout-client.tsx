"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Send,
  Megaphone,
  MessageSquare,
  Settings,
  Menu,
  X,
  ChevronDown,
  Coffee,
} from "lucide-react";
import { BrandDot } from "@/components/whatsapp/brand-badge";
import type { Brand } from "@/components/whatsapp/brand-badge";

const NAV_ITEMS = [
  { href: "/outreach", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/outreach/send", label: "Send Message", icon: Send },
  { href: "/outreach/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/outreach/messages", label: "Messages", icon: MessageSquare },
  { href: "/outreach/settings", label: "Settings", icon: Settings },
];

const BRANDS: Brand[] = ["All Brands", "Kalisiya", "Eloi", "DataMug"];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname.startsWith(href);
}

interface OutreachLayoutClientProps {
  children: React.ReactNode;
}

export function OutreachLayoutClient({ children }: OutreachLayoutClientProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand>("All Brands");

  const currentPage = NAV_ITEMS.find((item) =>
    isActive(pathname, item.href, item.exact)
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Logo */}
      <div className="px-4 py-4 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between">
        <Link href="/outreach" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
            <Send size={15} color="white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Outreach
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-500">
              Multi-channel
            </p>
          </div>
        </Link>
        <button
          className="lg:hidden p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={16} className="text-stone-500" />
        </button>
      </div>

      {/* Brand Switcher */}
      <div className="px-3 py-3 border-b border-stone-200 dark:border-stone-700">
        <button
          onClick={() => setBrandDropdownOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BrandDot brand={selectedBrand} size={8} />
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
              {selectedBrand}
            </span>
          </div>
          <ChevronDown
            size={14}
            className={`text-stone-400 transition-transform ${
              brandDropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {brandDropdownOpen && (
          <div className="mt-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-lg overflow-hidden animate-slideDown">
            {BRANDS.map((brand) => (
              <button
                key={brand}
                onClick={() => {
                  setSelectedBrand(brand);
                  setBrandDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-left ${
                  selectedBrand === brand
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                    : "text-stone-700 dark:text-stone-300"
                }`}
              >
                <BrandDot brand={brand} size={8} />
                {brand}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100"
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Back to DataMug */}
      <div className="px-3 py-3 border-t border-stone-200 dark:border-stone-700">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <Coffee size={14} />
          Back to DataMug
        </Link>
      </div>
    </div>
  );

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        background: "var(--color-bg)",
        color: "var(--color-text)",
      }}
    >
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          style={{ background: "rgba(0,0,0,0.45)" }}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:hidden w-64 border-r flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-4 sm:px-6 py-3 border-b flex-shrink-0"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} className="text-stone-500" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {currentPage?.label ?? "Outreach"}
              </h1>
              <p className="text-xs text-stone-400 dark:text-stone-500 hidden sm:block">
                {selectedBrand === "All Brands"
                  ? "All brands"
                  : `Filtered by ${selectedBrand}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Brand indicator pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              <BrandDot brand={selectedBrand} size={7} />
              <span className="text-xs text-stone-600 dark:text-stone-400">
                {selectedBrand}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
