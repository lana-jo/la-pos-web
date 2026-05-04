"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

interface MobileMenuButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  themeClass: string;
}

export function MobileMenuButton({
  isOpen,
  onToggle,
  themeClass,
}: MobileMenuButtonProps) {
  return (
    <div className="lg:hidden fixed top-4 left-4 z-50">
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className={cn(
          "shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105",
          themeClass
        )}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>
    </div>
  );
}
