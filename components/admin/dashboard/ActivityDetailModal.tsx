"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, ShoppingCart as ShoppingCartIcon, UserPlus, Package as PackageIcon, User, DollarSign } from "lucide-react";
import { RecentActivity } from "@/types/dashboard";

interface ActivityDetailModalProps {
  activity: RecentActivity | null;
  isOpen: boolean;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
}

export const ActivityDetailModal = ({
  activity,
  isOpen,
  onClose,
  formatCurrency,
}: ActivityDetailModalProps) => {
  if (!activity) return null;

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

  const getActivityTypeLabel = (type: RecentActivity["type"]) => {
    switch (type) {
      case "transaction":
        return "Transaction";
      case "user":
        return "User Management";
      case "product":
        return "Product Management";
      default:
        return "Activity";
    }
  };

  const getActivityTypeColor = (type: RecentActivity["type"]) => {
    switch (type) {
      case "transaction":
        return "bg-green-100 text-green-800";
      case "user":
        return "bg-blue-100 text-blue-800";
      case "product":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getActivityIcon(activity.type)}
            <div>
              <DialogTitle className="text-lg">Activity Details</DialogTitle>
              <DialogDescription>
                {getActivityTypeLabel(activity.type)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Activity Type */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Type</span>
            <Badge className={getActivityTypeColor(activity.type)}>
              {getActivityTypeLabel(activity.type)}
            </Badge>
          </div>

          {/* Description */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <PackageIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Description</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {activity.description}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Information */}
          {activity.user_name && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Performed by</p>
                <p className="text-sm text-muted-foreground">{activity.user_name}</p>
              </div>
            </div>
          )}

          {/* Amount */}
          {activity.amount && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Amount</p>
                <p className="text-sm font-semibold text-green-600">
                  {formatCurrency(activity.amount)}
                </p>
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-3 p-3 rounded-lg border">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Timestamp</p>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(activity.created_at)}
              </p>
            </div>
          </div>

          {/* Activity ID */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <span className="text-sm font-medium text-muted-foreground">Activity ID</span>
            <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
              {activity.id}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
