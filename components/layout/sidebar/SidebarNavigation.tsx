"use client";

import { SidebarItem } from "../SidebarItem";
import { SidebarDropdown } from "../SidebarDropdown";
import { toast } from "sonner";
import type { NavigationConfig, NavigationItem, DropdownItem } from "@/lib/navigation/config";

interface SidebarNavigationProps {
  items: NavigationConfig;
  isCollapsed: boolean;
}

function isDropdownItem(item: NavigationItem | DropdownItem): item is DropdownItem {
  return "type" in item && item.type === "dropdown";
}

export function SidebarNavigation({ items, isCollapsed }: SidebarNavigationProps) {
  return (
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
      {items.map((item) => {
        if (isDropdownItem(item)) {
          return (
            <SidebarDropdown
              key={item.label}
              label={item.label}
              icon={item.icon}
              items={item.items}
              isCollapsed={isCollapsed}
            />
          );
        }

        return (
          <SidebarItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isCollapsed={isCollapsed}
            description={item.description}
          />
        );
      })}
    </nav>
  );
}
