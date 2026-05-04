"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarProvider";
import { logout } from "@/lib/auth/actions";
import { useTheme } from "@/hooks/useTheme";
import { useSidebarTheme } from "@/hooks/useSidebarTheme";
import { useAuth } from "@/contexts/AuthContext";
import { getNavigationByRole } from "@/lib/navigation/config";
import { MobileMenuButton } from "./sidebar/MobileMenuButton";
import { SidebarHeader } from "./sidebar/SidebarHeader";
import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarFooter } from "./sidebar/SidebarFooter";

interface SidebarProps {
  className?: string;
  userRole?: "admin" | "cashier" | "customer";
}

export function Sidebar({ className, userRole = "admin" }: SidebarProps) {
  const router = useRouter();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { theme, setTheme, mounted } = useTheme();
  const { profile, loading } = useAuth();
  const themeClasses = useSidebarTheme();

  const navigationItems = getNavigationByRole(userRole);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const result = await logout();
      if (result.success) {
        router.push("/login");
      } else {
        console.error("Logout failed:", result.error);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, router]);

  return (
    <>
      <MobileMenuButton
        isOpen={isMobileOpen}
        onToggle={toggleMobileSidebar}
        themeClass={themeClasses.mobileButton}
      />

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
          themeClasses.sidebar,
          "lg:relative lg:inset-y-0",
          isCollapsed ? "w-16" : "w-72",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        <div className="flex flex-col h-full">
          <SidebarHeader
            isCollapsed={isCollapsed}
            headerThemeClass={themeClasses.header}
            titleThemeClass={themeClasses.title}
            subtitleThemeClass={themeClasses.subtitle}
            collapseButtonThemeClass={themeClasses.collapseButton}
            onToggleCollapse={toggleSidebar}
          />

          <SidebarNavigation items={navigationItems} isCollapsed={isCollapsed} />

          <SidebarFooter
            isCollapsed={isCollapsed}
            isLoggingOut={isLoggingOut}
            userRole={userRole}
            profileName={profile?.full_name || ""}
            isProfileLoading={loading}
            mounted={mounted}
            theme={theme}
            themeClasses={{
              footer: themeClasses.footer,
              profile: themeClasses.profile,
              role: themeClasses.role,
              separator: themeClasses.separator,
              themeButton: themeClasses.themeButton,
              logoutButton: themeClasses.logoutButton,
            }}
            onToggleTheme={handleToggleTheme}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </>
  );
}
