"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (!profile) {
      // Profile not loaded yet, wait for it
      return;
    }

    if (isRedirecting) return;

    setIsRedirecting(true);
    
    // Redirect based on user role
    switch (profile.role) {
      case "admin":
        router.push("/admin/dashboard");
        break;
      case "cashier":
        router.push("/cashier/pos");
        break;
      case "customer":
        router.push("/customer/catalog");
        break;
      default:
        router.push("/auth/unauthorized");
    }
  }, [user, profile, loading, router, isRedirecting]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <h1 className="text-2xl font-bold mb-4">POS System</h1>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
