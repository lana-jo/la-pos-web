"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ClipboardList, 
  Search, 
  X, 
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Percent,
  Undo2,
  Ban,
  SlidersHorizontal,
  ArrowRightLeft,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { Profile, Shift, CashierAction, ActionType } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface ActionWithRelations extends CashierAction {
  cashier?: Profile;
  shift?: Shift;
}

const actionConfig: Record<ActionType, { icon: React.ElementType; label: string; color: string }> = {
  void: { icon: Ban, label: "Void", color: "bg-red-100 text-red-600" },
  discount: { icon: Percent, label: "Diskon", color: "bg-blue-100 text-blue-600" },
  refund: { icon: Undo2, label: "Refund", color: "bg-amber-100 text-amber-600" },
  stock_adjustment: { icon: SlidersHorizontal, label: "Penyesuaian Stok", color: "bg-purple-100 text-purple-600" },
  shift_open: { icon: ArrowRightLeft, label: "Buka Shift", color: "bg-green-100 text-green-600" },
  shift_close: { icon: XCircle, label: "Tutup Shift", color: "bg-gray-100 text-gray-600" },
};

export default function CashierActionsPage() {
  const router = useRouter();
  const [actions, setActions] = useState<ActionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<ActionType | "all">("all");

  // Auth guard
  const checkUserRole = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        toast.error("Akses ditolak: Hanya admin yang dapat mengakses halaman ini");
        router.push("/auth/unauthorized");
      }
    } catch {
      router.push("/login");
    }
  }, [router]);

  // Fetch actions
  const fetchActions = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cashier_actions")
        .select(`
          *,
          cashier:profiles(*),
          shift:shifts(*)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setActions(data || []);
    } catch (error) {
      console.error("Error fetching cashier actions:", error);
      toast.error("Gagal mengambil data aksi kasir");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUserRole();
    fetchActions();
  }, [checkUserRole, fetchActions]);

  // Filter actions
  const filteredActions = actions.filter((action) => {
    const matchesSearch = 
      action.cashier?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.target_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || action.action_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate stats
  const stats = {
    total: actions.length,
    verified: actions.filter(a => a.pin_verified).length,
    unverified: actions.filter(a => !a.pin_verified).length,
    byType: {
      void: actions.filter(a => a.action_type === "void").length,
      discount: actions.filter(a => a.action_type === "discount").length,
      refund: actions.filter(a => a.action_type === "refund").length,
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-pulse" />
          <p className="text-lg">Memuat log audit...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">Log Aksi Kasir</h2>
            <p className="text-muted-foreground">Audit trail semua aksi sensitif kasir</p>
          </div>
          <Button onClick={fetchActions} variant="outline">
            <ClipboardList className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Aksi</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">PIN Terverifikasi</p>
              <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Void</p>
              <p className="text-2xl font-bold text-red-600">{stats.byType.void}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Diskon</p>
              <p className="text-2xl font-bold text-blue-600">{stats.byType.discount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Refund</p>
              <p className="text-2xl font-bold text-amber-600">{stats.byType.refund}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kasir, target, atau catatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("all")}
            >
              Semua
            </Button>
            {(['void', 'discount', 'refund', 'shift_open', 'shift_close', 'stock_adjustment'] as ActionType[]).map((type) => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(type)}
              >
                {actionConfig[type].label}
              </Button>
            ))}
          </div>
        </div>

        {/* Actions List */}
        {filteredActions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">Tidak ada data</h3>
              <p className="text-gray-500">Belum ada aksi kasir yang tercatat</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredActions.map((action) => {
              const config = actionConfig[action.action_type];
              const Icon = config.icon;
              
              return (
                <Card key={action.id} className={action.pin_verified ? "border-l-4 border-l-green-500" : "border-l-4 border-l-amber-500"}>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Action Type */}
                      <div className="flex items-center gap-3 min-w-[180px]">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{config.label}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(action.created_at)}</p>
                        </div>
                      </div>

                      {/* Cashier Info */}
                      <div className="flex items-center gap-2 min-w-[150px]">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{action.cashier?.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">Kasir</p>
                        </div>
                      </div>

                      {/* Target Info */}
                      {action.target_id && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <AlertCircle className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-mono text-muted-foreground truncate max-w-[150px]">
                              {action.target_id.slice(0, 8)}...
                            </p>
                            <p className="text-xs text-muted-foreground">{action.target_type || "Target"}</p>
                          </div>
                        </div>
                      )}

                      {/* PIN Verification */}
                      <div className="flex items-center">
                        <Badge variant={action.pin_verified ? "default" : "secondary"}>
                          {action.pin_verified ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> PIN OK</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> No PIN</>
                          )}
                        </Badge>
                      </div>

                      {/* Notes */}
                      {action.notes && (
                        <div className="flex-1 lg:text-right">
                          <p className="text-sm text-muted-foreground truncate max-w-[200px] lg:ml-auto">
                            {action.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
