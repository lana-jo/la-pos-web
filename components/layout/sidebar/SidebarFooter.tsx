"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { LogOut, Moon, Sun, User, Laptop } from "lucide-react";
import { ROLE_LABELS } from "@/lib/navigation/config";
import { useRouter, usePathname } from "next/navigation";
import { useThemeClass } from "@/hooks/useTheme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

function ProfileButton({ isCollapsed }: { isCollapsed: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = pathname === "/profile";

  const iconThemeClass = useThemeClass(
    'text-slate-600 group-hover:text-blue-700 group-hover:scale-110',
    'text-slate-400 group-hover:text-blue-300 group-hover:scale-110',
  );
  const hoverThemeClass = useThemeClass(
    'hover:bg-gradient-to-r hover:from-blue-100 hover:to-blue-200 hover:text-slate-800 hover:shadow-md',
    'hover:bg-gradient-to-r hover:from-blue-800 hover:to-blue-900 hover:text-white hover:shadow-md',
  );
  const focusThemeClass = useThemeClass(
    'focus-visible:ring-offset-white',
    'focus-visible:ring-offset-slate-900',
  );
  const textThemeClass = useThemeClass(
    'text-slate-700',
    'text-slate-300',
  );

  const handleProfileClick = () => {
    console.log(`[NAVIGATION] Profile button clicked:`, {
      source: 'sidebar_footer',
      isActive,
      pathname,
      timestamp: new Date().toISOString()
    });
    router.push("/profile");
  };

  return (
    <button
      onClick={handleProfileClick}
      className={cn(
        'group flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 ease-out w-full',
        hoverThemeClass,
        'hover:scale-[1.02] hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        focusThemeClass,
        isActive
          ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-[1.02] -translate-y-0.5'
          : textThemeClass,
        isCollapsed && 'justify-center px-3'
      )}
    >
      <User className={cn(
        'h-5 w-5 flex-shrink-0 transition-all duration-300',
        isActive ? 'text-white scale-110 drop-shadow-sm' : iconThemeClass
      )} />
      {!isCollapsed && <span className="truncate font-semibold">Profil</span>}
    </button>
  );
}

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
  onToggleTheme: (newTheme: 'light' | 'dark' | 'system') => void;
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
              {isProfileLoading ? "Memuat..." : profileName || "Pengguna"}
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
        <ProfileButton isCollapsed={isCollapsed} />

        {/* Theme toggle dropdown */}
        {mounted && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-start transition-all duration-300 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02]",
                  themeClasses.themeButton,
                  isCollapsed && "px-3"
                )}
              >
                {theme === 'dark' ? <Moon className="h-4 w-4" /> : theme === 'light' ? <Sun className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}
                {!isCollapsed && (
                  <span className="ml-2">
                    {theme === 'light' ? 'Terang' : theme === 'dark' ? 'Gelap' : 'Sistem'}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
                <DropdownMenuContent align="end" className="w-40 z-50 bg-popover border border-border shadow-lg">
                  <DropdownMenuItem onClick={() => {
                console.log(`[THEME] Sidebar footer theme button clicked:`, {
                  theme: 'light',
                  source: 'sidebar_footer',
                  timestamp: new Date().toISOString()
                });
                onToggleTheme('light');
              }}>Terang</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                console.log(`[THEME] Sidebar footer theme button clicked:`, {
                  theme: 'dark',
                  source: 'sidebar_footer',
                  timestamp: new Date().toISOString()
                });
                onToggleTheme('dark');
              }}>Gelap</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                console.log(`[THEME] Sidebar footer theme button clicked:`, {
                  theme: 'system',
                  source: 'sidebar_footer',
                  timestamp: new Date().toISOString()
                });
                onToggleTheme('system');
              }}>Sistem</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>
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
