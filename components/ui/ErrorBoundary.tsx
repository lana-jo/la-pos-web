"use client";

import React from "react";
import { Button } from "./button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; reset: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, reset }: { error?: Error; reset: () => void }) {
  return (
    <div className="min-h-[200px] flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mx-auto">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
          <p className="text-sm text-gray-600 mt-1">
            {error?.message || "An unexpected error occurred"}
          </p>
        </div>
        <Button onClick={reset} className="flex items-center gap-2 mx-auto">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    </div>
  );
}

export function POSErrorFallback({ error, reset }: { error?: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mx-auto mb-4">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">POS System Error</h2>
          <p className="text-sm text-gray-600 mb-4">
            {error?.message || "The POS system encountered an error. Please try again."}
          </p>
          <Button onClick={reset} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Restart POS
          </Button>
        </div>
      </div>
    </div>
  );
}
