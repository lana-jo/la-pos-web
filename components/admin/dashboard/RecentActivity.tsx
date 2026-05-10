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
    <Card className="pos-report-card transition-theme hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 duration-300 ease-in-out">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 hover:text-primary transition-colors duration-200">
          <Clock className="h-5 w-5 text-primary animate-pulse" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <div className="p-3 sm:p-4 rounded-lg bg-muted/30 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium mb-1">No recent activity</p>
            <p className="text-xs text-muted-foreground/70">Activity will appear here as it happens</p>
          </div>
        ) : (
          <div>
            <div className="sm:hidden">
            {/* Mobile View - Vertical Scroll */}
            <div className="overflow-y-auto max-h-96 -mx-4 sm:mx-0">
              <div className="space-y-3 px-4">
                {activities.map((activity) => {
                  return (
                    <div
                      key={activity.id}
                      onClick={() => {
                        onActivityClick?.(activity);
                      }}
                      className={`pos-transaction-card transition-theme ${onActivityClick
                        ? "cursor-pointer group hover:shadow-md hover:shadow-primary/10 hover:-translate-y-0.5"
                        : "hover:bg-muted/30"} w-full duration-200 ease-in-out`}                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-200">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 text-left group-hover:scale-105 duration-200">
                            {activity.description}
                          </p>
                          <div className="flex flex-col gap-1 mt-1">
                            {activity.user_name && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span className="truncate max-w-20">{activity.user_name}</span>
                              </p>
                            )}
                            {activity.amount && (
                              <p className="text-xs font-semibold text-success flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(activity.amount)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(activity.created_at).toLocaleDateString("id-ID")}</span>
                              </div>
                            </div>
                            {onActivityClick && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log(`[DASHBOARD] Mobile activity detail button clicked:`, {
                                    activityId: activity.id,
                                    activityType: activity.type,
                                    source: 'recent_activity_card_mobile',
                                    timestamp: new Date().toISOString()
                                  });
                                  onActivityClick(activity);
                                } }
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:scale-110"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="hidden sm:block">
            {/* Desktop View - Original Layout */}
            <div className="space-y-2 sm:space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => {
                    onActivityClick?.(activity);
                  }}
                  className={`pos-transaction-card transition-theme ${onActivityClick
                    ? "cursor-pointer group hover:shadow-md hover:shadow-primary/10 hover:-translate-y-0.5"
                    : "hover:bg-muted/30"} w-full duration-200 ease-in-out`}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 p-1.5 sm:p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-200">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 text-left group-hover:scale-105 duration-200">
                        {activity.description}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-1">
                        {activity.user_name && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-20 sm:max-w-none">{activity.user_name}</span>
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
                    <div className="flex-shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="hidden sm:inline">{formatDateTime(activity.created_at)}</span>
                          <span className="sm:hidden">{new Date(activity.created_at).toLocaleDateString("id-ID")}</span>
                        </div>
                      </div>
                      {onActivityClick && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log(`[DASHBOARD] Desktop activity detail button clicked:`, {
                              activityId: activity.id,
                              activityType: activity.type,
                              source: 'recent_activity_card_desktop',
                              timestamp: new Date().toISOString()
                            });
                            onActivityClick(activity);
                          }}
                          className="h-6 w-6 sm:h-8 sm:w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:scale-110"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>          </div>
        )}
      </CardContent>
    </Card>
  );
};
