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
  console.log(`[DASHBOARD] ActivityDetailModal rendered:`, {
    activityId: activity?.id,
    isOpen,
    timestamp: new Date().toISOString()
  });

  if (!activity) {
    console.log(`[DASHBOARD] ActivityDetailModal: No activity data provided`);
    return null;
  }

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

  const handleModalClose = () => {
    console.log(`[DASHBOARD] ActivityDetailModal close button clicked:`, {
      activityId: activity.id,
      timestamp: new Date().toISOString()
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="pos-modal-content max-w-md w-[95vw] sm:w-full max-h-[85vh] overflow-y-auto transition-theme">
        <DialogHeader className="pos-modal-header px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 sm:p-2 rounded-lg bg-primary/10">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="pos-modal-title text-base sm:text-lg">Activity Details</DialogTitle>
              <DialogDescription className="text-primary/80 text-sm">
                {getActivityTypeLabel(activity.type)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="pos-modal-body px-4 sm:px-6 py-4 sm:py-6 space-y-4">
          {/* Activity Type */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 transition-theme">
            <span className="text-sm font-medium text-muted-foreground">Type</span>
            <Badge className={`${getActivityTypeColor(activity.type)} transition-theme`}>
              {getActivityTypeLabel(activity.type)}
            </Badge>
          </div>

          {/* Description */}
          <Card className="pos-transaction-card transition-theme">
            <CardContent className="pt-3 sm:pt-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/5">
                    <PackageIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Description</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {activity.description}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Information */}
          {activity.user_name && (
            <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-muted/30 border border-border/50 transition-theme hover:bg-muted/50 hover:border-primary/20">
              <div className="p-1.5 sm:p-2 rounded-lg bg-accent/10">
                <User className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Performed by</p>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{activity.user_name}</p>
              </div>
            </div>
          )}

          {/* Amount */}
          {activity.amount && (
            <div className="pos-card-success p-3 sm:p-4 transition-theme">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-success/20">
                  <DollarSign className="h-4 w-4 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Amount</p>
                  <p className="text-base sm:text-lg font-bold text-success mt-0.5">
                    {formatCurrency(activity.amount)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-muted/30 border border-border/50 transition-theme hover:bg-muted/50 hover:border-primary/20">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Timestamp</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                <span className="sm:inline">{formatDateTime(activity.created_at)}</span>
                <span className="sm:hidden">{new Date(activity.created_at).toLocaleDateString("id-ID")}</span>
              </p>
            </div>
          </div>

          {/* Activity ID */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-muted/20 border border-border/30 transition-theme">
            <span className="text-sm font-medium text-muted-foreground">Activity ID</span>
            <span className="text-xs font-mono bg-muted px-2 sm:px-3 py-1 sm:py-1.5 rounded-md border border-border/50 truncate max-w-32 sm:max-w-none">
              {activity.id}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
