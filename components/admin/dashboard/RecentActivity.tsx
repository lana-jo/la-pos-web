"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ShoppingCart as ShoppingCartIcon, UserPlus, Package as PackageIcon, Eye, User, DollarSign } from "lucide-react";
import { RecentActivity } from "@/types/dashboard";

interface RecentActivityProps {
  activities: RecentActivity[];
  formatCurrency: (amount: number) => string;
  onActivityClick?: (activity: RecentActivity) => void;
}

export const RecentActivityCard = ({ activities, formatCurrency, onActivityClick }: RecentActivityProps) => {
  console.log(`[DASHBOARD] RecentActivityCard rendered:`, {
    activitiesCount: activities.length,
    hasOnActivityClick: !!onActivityClick,
    timestamp: new Date().toISOString()
  });

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
    <Card className="pos-report-card transition-theme">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="p-4 rounded-lg bg-muted/30 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Clock className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium">No recent activity</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Activity will appear here as it happens</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                onClick={() => {
                  console.log(`[DASHBOARD] Activity item clicked:`, {
                    activityId: activity.id,
                    activityType: activity.type,
                    description: activity.description,
                    timestamp: new Date().toISOString()
                  });
                  onActivityClick?.(activity);
                }}
                className={`pos-transaction-card transition-theme ${
                  onActivityClick
                    ? "cursor-pointer group"
                    : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {activity.user_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {activity.user_name}
                        </p>
                      )}
                      {activity.amount && (
                        <p className="text-xs font-semibold text-success flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(activity.amount)}
                        </p>
                      )}
                    </div>
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
                          console.log(`[DASHBOARD] Activity detail button clicked:`, {
                            activityId: activity.id,
                            activityType: activity.type,
                            source: 'recent_activity_card',
                            timestamp: new Date().toISOString()
                          });
                          onActivityClick(activity);
                        }}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
