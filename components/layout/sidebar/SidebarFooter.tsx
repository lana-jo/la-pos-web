"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { LogOut, Moon, Sun, User } from "lucide-react";
import { ROLE_LABELS } from "@/lib/navigation/config";
import { useRouter } from "next/navigation";

interface SidebarFooterProps {
  isCollapsed: boolean;
  isLoggingOut: boolean;
  userRole: string;
  profileName: string;
  isProfileLoading: boolean;
  mounted: boolean;
  theme: string | undefined;
  themeClasses: {
    footer: string;
    profile: string;
    role: string;
    separator: string;
    themeButton: string;
    logoutButton: string;
  };
  onToggleTheme: () => void;
  onLogout: () => void;
}

export function SidebarFooter({
  isCollapsed,
  isLoggingOut,
  userRole,
  profileName,
  isProfileLoading,
  mounted,
  theme,
  themeClasses,
  onToggleTheme,
  onLogout,
}: SidebarFooterProps) {
  const router = useRouter();
  const isDark = theme === "dark";

  return (
    <div className={cn("p-4 border-t backdrop-blur-xl", themeClasses.footer)}>
      <div className="space-y-3">
        {/* Profile name indicator */}
        {!isCollapsed && (
          <div
            className={cn(
              "px-4 py-3 rounded-xl border shadow-md transition-all duration-300",
              themeClasses.profile
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 bg-blue-500 rounded-full" />
              {isProfileLoading ? "Loading..." : profileName || "User"}
            </div>
            <div className={cn("text-xs font-medium capitalize mt-1", themeClasses.role)}>
              {ROLE_LABELS[userRole] || userRole}
            </div>
          </div>
        )}

        <Separator
          className={cn(
            isCollapsed && "mx-auto w-10",
            themeClasses.separator
          )}
        />

        {/* Profile button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/profile")}
          className={cn(
            "w-full justify-start transition-all duration-300 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02]",
            "text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 dark:hover:from-slate-800 dark:hover:to-blue-900 hover:border hover:border-blue-300/30",
            isCollapsed && "px-3"
          )}
        >
          <User className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Profil</span>}
        </Button>

        {/* Theme toggle button */}
        {mounted && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleTheme}
            className={cn(
              "w-full justify-start transition-all duration-300 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02]",
              themeClasses.themeButton,
              isCollapsed && "px-3"
            )}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!isCollapsed && (
              <span className="ml-2">{isDark ? "Mode Terang" : "Mode Gelap"}</span>
            )}
          </Button>
        )}

        {/* Logout button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          disabled={isLoggingOut}
          className={cn(
            "w-full justify-start transition-all duration-300 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02]",
            themeClasses.logoutButton,
            isCollapsed && "px-3",
            isLoggingOut && "opacity-50 cursor-not-allowed"
          )}
        >
          <LogOut className={cn("h-4 w-4", isLoggingOut && "animate-spin")} />
          {!isCollapsed && (
            <span className="ml-2">{isLoggingOut ? "Keluar..." : "Keluar"}</span>
          )}
        </Button>
      </div>
    </div>
  );
}
