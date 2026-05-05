"use client";

import { Badge } from "@/components/ui/badge";

interface POSHeaderProps {
  userName?: string;
  userRole?: string;
}

export function POSHeader({ userName = "Loading...", userRole = "Cashier" }: POSHeaderProps) {
  return (
    <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 sm:px-6 lg:px-8 py-6 shadow-sm">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-brand flex items-center gap-3">
              <div className="w-2 h-8 bg-primary-brand rounded-full"></div>
              POS TERMINAL
            </h1>
            <p className="text-muted-foreground mt-2 font-medium">
              Point of Sale System • {userName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm px-3 py-1 border-primary-brand text-primary-brand">
              {userRole}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
