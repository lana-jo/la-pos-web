"use client";

import { Loader2, Package, Search } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8",
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
}

interface LoadingCardProps {
  title?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingCard({ title = "Memuat...", size = "md" }: LoadingCardProps) {
  const heightClasses = {
    sm: "h-32",
    md: "h-48",
    lg: "h-64",
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${heightClasses[size]}`}>
      <div className="flex flex-col items-center justify-center h-full space-y-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-gray-600">{title}</p>
      </div>
    </div>
  );
}

export function ProductGridLoading() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
          <div className="bg-gray-200 rounded-md h-24 mb-3"></div>
          <div className="space-y-2">
            <div className="bg-gray-200 rounded h-4"></div>
            <div className="bg-gray-200 rounded h-3 w-3/4"></div>
            <div className="bg-gray-200 rounded h-3 w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TransactionListLoading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <div className="bg-gray-200 rounded h-4 w-32"></div>
              <div className="bg-gray-200 rounded h-3 w-24"></div>
              <div className="bg-gray-200 rounded h-6 w-20"></div>
            </div>
            <div className="space-y-2 text-right">
              <div className="bg-gray-200 rounded h-4 w-24 ml-auto"></div>
              <div className="bg-gray-200 rounded h-3 w-16 ml-auto"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReportLoading() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 text-center animate-pulse">
          <div className="bg-gray-200 rounded-full h-8 w-8 mx-auto mb-2"></div>
          <div className="bg-gray-200 rounded h-3 w-20 mx-auto mb-1"></div>
          <div className="bg-gray-200 rounded h-4 w-16 mx-auto"></div>
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const defaultIcon = icon || <Package className="h-12 w-12 text-gray-400" />;

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-gray-400 mb-4">
        {defaultIcon}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 mb-4 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
}

export function SearchEmptyState() {
  return (
    <EmptyState
      icon={<Search className="h-12 w-12 text-gray-400" />}
      title="Hasil tidak ditemukan"
      description="Coba sesuaikan kata kunci pencarian atau filter Anda"
    />
  );
}
