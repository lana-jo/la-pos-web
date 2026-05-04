"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Store, Menu, X } from "lucide-react";

interface SidebarHeaderProps {
  isCollapsed: boolean;
  headerThemeClass: string;
  titleThemeClass: string;
  subtitleThemeClass: string;
  collapseButtonThemeClass: string;
  onToggleCollapse: () => void;
}

export function SidebarHeader({
  isCollapsed,
  headerThemeClass,
  titleThemeClass,
  subtitleThemeClass,
  collapseButtonThemeClass,
  onToggleCollapse,
}: SidebarHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-6 border-b backdrop-blur-xl",
        headerThemeClass
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          {!isCollapsed && (
            <>
              <Store className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900" />
            </>
          )}
        </div>
        {!isCollapsed && (
          <div>
            <span className={cn("font-bold text-lg truncate", titleThemeClass)}>
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
          onClick={onToggleCollapse}
          className={cn(
            "h-8 w-8 p-0 rounded-lg transition-colors",
            collapseButtonThemeClass
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
  );
}
