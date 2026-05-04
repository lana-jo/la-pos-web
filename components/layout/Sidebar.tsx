"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "./SidebarProvider";
import { SidebarItem } from "./SidebarItem";
import { SidebarDropdown } from "./SidebarDropdown";
import { logout } from "@/lib/auth/actions";
import { useTheme, useThemeClass } from "@/hooks/useTheme";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  BarChart3,
  Store,
  Menu,
  X,
  LogOut,
  CreditCard,
  Tag,
  FileText,
  ChevronDown,
  Moon,
  Sun,
  User,
} from "lucide-react";

interface NavigationItem {
  href: string;
  label: string;
  icon: any;
  description?: string;
}

interface DropdownItem {
  type: "dropdown";
  label: string;
  icon: any;
  items: {
    href: string;
    label: string;
    description?: string;
  }[];
}

interface SidebarProps {
  className?: string;
  userRole?: "admin" | "cashier" | "customer";
}

export function Sidebar({ className, userRole = "admin" }: SidebarProps) {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { profile, loading } = useAuth();

  // Theme class hooks for SSR-safe styling
  const mobileButtonThemeClass = useThemeClass(
    "bg-gradient-to-r from-white to-slate-50 border-slate-200/50",
    "bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600/50",
  );
  const sidebarThemeClass = useThemeClass(
    "bg-gradient-to-br from-white via-slate-50 to-white border-r border-slate-200/50",
    "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50",
  );
  const headerThemeClass = useThemeClass(
    "border-slate-200/30 bg-white/90",
    "border-slate-700/50 bg-slate-800/80",
  );
  const titleThemeClass = useThemeClass(
    "text-slate-900", 
    "text-white",
  );
  const subtitleThemeClass = useThemeClass(
    "text-slate-400", 
    "text-slate-500",
  );
  const collapseButtonThemeClass = useThemeClass(
    "hover:bg-slate-700",
    "hover:bg-slate-100",
  );
  const footerThemeClass = useThemeClass(
    "border-slate-200/30 bg-white/80",
    "border-slate-700/50 bg-slate-800/70",
  );
  const profileThemeClass = useThemeClass(
    "bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-blue-200/50 hover:from-blue-100 hover:via-indigo-100 hover:to-blue-100",
    "bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-blue-900/40 border-blue-700/50 hover:from-blue-900/50 hover:via-indigo-900/50 hover:to-blue-900/50",
  );
  const roleThemeClass = useThemeClass(
    "text-blue-400/80",
    "text-blue-600/80", 
  );
  const separatorThemeClass = useThemeClass(
    "bg-gradient-to-r from-transparent via-slate-200/50 to-transparent",
    "bg-gradient-to-r from-transparent via-slate-700/50 to-transparent",
  );
  const themeButtonThemeClass = useThemeClass(
    "text-slate-600 hover:text-blue-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 hover:border hover:border-blue-300/30",
    "text-slate-400 hover:text-blue-300 hover:bg-gradient-to-r hover:from-slate-800 hover:to-slate-700 hover:border hover:border-blue-700/30",
  );
  const logoutButtonThemeClass = useThemeClass(
    "text-red-600 hover:text-red-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:border hover:border-red-300/30",
    "text-red-400 hover:text-red-300 hover:bg-gradient-to-r hover:from-red-900/40 hover:to-pink-900/40 hover:border hover:border-red-700/30",
  );

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      const result = await logout();
      if (result.success) {
        router.push("/login");
      } else {
        console.error("Logout failed:", result.error);
        // Optionally show error toast here
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSettingsClick = () => {
    toast.info("Fitur Pengaturan akan segera hadir! 🚧", {
      description:
        "Kami sedang mengembangkan fitur ini untuk pengalaman yang lebih baik.",
      duration: 4000,
    });
  };

  // Define navigation items based on user role
  const getNavigationItems = (): (NavigationItem | DropdownItem)[] => {
    const baseItems = [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "Ringkasan sistem",
      },
    ];

    
    const adminItems = [
      {
        type: "dropdown" as const,
        label: "Produk",
        icon: Package,
        items: [
          {
            href: "/dashboard/products",
            label: "Daftar Produk",
            description: "Kelola semua produk",
          },
          {
            href: "/dashboard/products/variants",
            label: "Varian Produk",
            description: "Kelola varian harga produk",
          },
          {
            href: "/dashboard/categories",
            label: "Kategori",
            description: "Kelola kategori produk",
          },
          {
            href: "/dashboard/units",
            label: "Satuan",
            description: "Kelola satuan ukuran",
          },
          {
            href: "/dashboard/suppliers",
            label: "Pemasok",
            description: "Kelola data pemasok",
          },
        ],
      },
      {
        type: "dropdown" as const,
        label: "Pengguna",
        icon: Users,
        items: [
          {
            href: "/dashboard/users",
            label: "Semua Pengguna",
            description: "Kelola semua pengguna",
          },
          {
            href: "/dashboard/cashiers",
            label: "Kasir",
            description: "Kelola akun kasir",
          },
        ],
      },
      // {
      //   type: 'dropdown' as const,
      //   label: 'Kasir',
      //   icon: Users,
      //   items: [
      //     {
      //       href: '/dashboard/cashiers',
      //       label: 'Daftar Kasir',
      //       description: 'Kelola akun kasir'
      //     },
      //     {
      //       href: '/dashboard/cashiers/schedule',
      //       label: 'Jadwal Kasir',
      //       description: 'Atur jadwal kerja'
      //     },
      //     {
      //       href: '/dashboard/cashiers/performance',
      //       label: 'Kinerja Kasir',
      //       description: 'Laporan kinerja'
      //     }
      //   ]
      // },
      {
        href: "/dashboard/reports",
        label: "Laporan Penjualan",
        icon: BarChart3,
        description: "Analisis penjualan",
      },
      {
        href: "/dashboard/settings",
        label: "Pengaturan",
        icon: Settings,
        description: "Konfigurasi sistem",
      },
    ];

    const cashierItems = [
      {
        href: "/pos",
        label: "Kasir POS",
        icon: ShoppingCart,
        description: "Terminal POS",
      },
      {
        href: "/cashier/transactions",
        label: "Transaksi Saya",
        icon: FileText,
        description: "Riwayat transaksi",
      },
    ];

    const customerItems = [
      {
        href: "/catalog",
        label: "Katalog Produk",
        icon: Package,
        description: "Jelajahi produk",
      },
    ];

    switch (userRole) {
      case "admin":
        return [cashierItems[0], ...baseItems, ...adminItems];
      case "cashier":
        return cashierItems;
      case "customer":
        return customerItems;
      default:
        return baseItems;
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleMobileSidebar}
          className={cn(
            "shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105",
            mobileButtonThemeClass,
          )}
        >
          {isMobileOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Sidebar overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out shadow-2xl sidebar-theme-transition",
          sidebarThemeClass,
          "lg:relative lg:inset-y-0",
          isCollapsed ? "w-16" : "w-72",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className,
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div
            className={cn(
              "flex items-center justify-between p-6 border-b backdrop-blur-xl",
              headerThemeClass,
            )}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                {isCollapsed ? null : (
                  <Store className="h-8 w-8 text-blue-600 flex-shrink-0" />
                )}
                {isCollapsed ? null : (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></div>
                )}
              </div>
              {!isCollapsed && (
                <div>
                  <span
                    className={cn(
                      "font-bold text-lg truncate",
                      titleThemeClass,
                    )}
                  >
                    POS System
                  </span>
                  <div className={cn("text-xs", subtitleThemeClass)}>
                    Point of Sale Indonesia
                  </div>
                </div>
              )}
            </div>
            {/* Desktop collapse button */}
            <div className="hidden lg:block">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className={cn(
                  "h-8 w-8 p-0 rounded-lg transition-colors",
                  collapseButtonThemeClass,
                )}
              >
                {isCollapsed ? (
                  <Menu className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item, index) => {
              if ("type" in item && item.type === "dropdown") {
                return (
                  <SidebarDropdown
                    key={item.label}
                    label={item.label}
                    icon={item.icon}
                    items={item.items}
                    isCollapsed={isCollapsed}
                  />
                );
              } else {
                const navItem = item as NavigationItem;
                const isSettings = navItem.href === "/dashboard/settings";
                return (
                  <SidebarItem
                    key={navItem.href}
                    href={navItem.href}
                    label={navItem.label}
                    icon={navItem.icon}
                    isCollapsed={isCollapsed}
                    description={navItem.description}
                    disabled={isSettings}
                    onClick={isSettings ? handleSettingsClick : undefined}
                    badge={isSettings ? "Coming Soon" : undefined}
                    badgeVariant="secondary"
                  />
                );
              }
            })}
          </nav>

          {/* Footer */}
          <div
            className={cn("p-4 border-t backdrop-blur-xl", footerThemeClass)}
          >
            <div className="space-y-3">
              {/* Profile name indicator */}
              {!isCollapsed && (
                <div
                  className={cn(
                    "px-4 py-3 rounded-xl border shadow-md transition-all duration-300",
                    profileThemeClass,
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                    {loading ? "Loading..." : profile?.full_name || "User"}
                  </div>
                  {/* <div className="text-sm font-bold text-blue-900 dark:text-blue-100 truncate">
                    
                  </div> */}
                  <div
                    className={cn(
                      "text-xs font-medium capitalize mt-1",
                      roleThemeClass,
                    )}
                  >
                    {userRole === "admin"
                      ? "Administrator"
                      : userRole === "cashier"
                        ? "Kasir"
                        : "Pelanggan"}
                  </div>
                </div>
              )}

              <Separator
                className={cn(
                  isCollapsed && "mx-auto w-10",
                  separatorThemeClass,
                )}
              />

   {/* Profile button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/profile")}
                className={cn(
                  "w-full justify-start transition-all duration-300 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02]",
                  "text-slate-600 hover:text-blue-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 hover:border hover:border-blue-300/30",
                  isCollapsed && "px-3",
                )}
              >
                <User className="h-4 w-4" />
                {!isCollapsed && (
                  <span className="ml-2">Profile</span>
                )}
              </Button>
              {/* Theme toggle button */}
              {mounted && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className={cn(
                    "w-full justify-start transition-all duration-300 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02]",
                    themeButtonThemeClass,
                    isCollapsed && "px-3",
                  )}
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                  {!isCollapsed && (
                    <span className="ml-2">
                      {theme === "dark" ? "Mode Terang" : "Mode Gelap"}
                    </span>
                  )}
                </Button>
              )}

           

              {/* Logout button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={cn(
                  "w-full justify-start transition-all duration-300 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02]",
                  logoutButtonThemeClass,
                  isCollapsed && "px-3",
                  isLoggingOut && "opacity-50 cursor-not-allowed",
                )}
              >
                <LogOut
                  className={cn("h-4 w-4", isLoggingOut && "animate-spin")}
                />
                {!isCollapsed && (
                  <span className="ml-2">
                    {isLoggingOut ? "Keluar..." : "Keluar"}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
