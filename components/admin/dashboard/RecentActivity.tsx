"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ShoppingCart as ShoppingCartIcon, UserPlus, Package as PackageIcon, Eye } from "lucide-react";
import { RecentActivity } from "@/types/dashboard";

interface RecentActivityProps {
  activities: RecentActivity[];
  formatCurrency: (amount: number) => string;
  onActivityClick?: (activity: RecentActivity) => void;
}

export const RecentActivityCard = ({ activities, formatCurrency, onActivityClick }: RecentActivityProps) => {
  const getActivityIcon = (type: RecentActivity["type"]) => {
    switch (type) {
      case "transaction":
        return <ShoppingCartIcon className="h-5 w-5 text-green-600" />;
      case "user":
        return <UserPlus className="h-5 w-5 text-blue-600" />;
      case "product":
        return <PackageIcon className="h-5 w-5 text-purple-600" />;
      default:
        return <PackageIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No recent activity to display</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                onClick={() => onActivityClick?.(activity)}
                className={`flex items-start gap-3 p-3 rounded-lg border bg-card transition-all duration-200 ${
                  onActivityClick
                    ? "cursor-pointer hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:scale-[0.98] active:shadow-sm"
                    : ""
                }`}
              >
                <div className="flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activity.description}
                  </p>
                  {activity.user_name && (
                    <p className="text-xs text-muted-foreground">
                      by {activity.user_name}
                    </p>
                  )}
                  {activity.amount && (
                    <p className="text-xs font-medium text-green-600">
                      {formatCurrency(activity.amount)}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(activity.created_at)}
                    </div>
                  </div>
                  {onActivityClick && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onActivityClick(activity);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
