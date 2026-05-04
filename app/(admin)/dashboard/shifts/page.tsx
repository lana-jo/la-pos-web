"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Clock, 
  Search, 
  X, 
  Calendar,
  User,
  DollarSign,
  ArrowLeftRight,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Eye,
  Wallet,
  TrendingUp,
  TrendingDown,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { Profile, Shift } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";

interface ShiftWithCashier extends Shift {
  cashier?: Profile;
}

type SortField = "opened_at" | "closed_at" | "opening_cash" | "closing_cash" | "cash_difference";
type SortOrder = "asc" | "desc";

export default function ShiftsPage() {
  const router = useRouter();
  const [shifts, setShifts] = useState<ShiftWithCashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "closed">("all");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [sortField, setSortField] = useState<SortField>("opened_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedShift, setSelectedShift] = useState<ShiftWithCashier | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

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
        .maybeSingle();

      if (profile?.role !== "admin") {
        toast.error("Akses ditolak: Hanya admin yang dapat mengakses halaman ini");
        router.push("/auth/unauthorized");
      }
    } catch {
      router.push("/login");
    }
  }, [router]);

  // Fetch shifts with date range
  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("shifts")
        .select(`
          *,
          cashier:profiles(*)
        `);
      
      // Apply date range filter
      if (dateRange.from) {
        query = query.gte("opened_at", dateRange.from);
      }
      if (dateRange.to) {
        query = query.lte("opened_at", dateRange.to + "T23:59:59");
      }
      
      const { data, error } = await query.order("opened_at", { ascending: false });

      if (error) throw error;
      setShifts(data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching shifts:", error);
      toast.error("Gagal mengambil data shift");
    } finally {
      setLoading(false);
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    checkUserRole();
    fetchShifts();
  }, [checkUserRole, fetchShifts]);

  // Realtime subscription
  useEffect(() => {
    const subscription = supabase
      .channel("shifts_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shifts" },
        () => {
          fetchShifts();
          toast.info("Data shift diperbarui", { duration: 2000 });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchShifts]);

  // Auto-refresh every 30 seconds for active shifts
  useEffect(() => {
    const interval = setInterval(() => {
      if (shifts.some(s => s.status === "open")) {
        fetchShifts();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchShifts, shifts]);

  // Filter and sort shifts
  const filteredAndSortedShifts = useMemo(() => {
    let result = shifts.filter((shift) => {
      const matchesSearch = 
        shift.cashier?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || shift.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });

    // Sort
    result.sort((a, b) => {
      let valueA: number | string | null;
      let valueB: number | string | null;

      switch (sortField) {
        case "opened_at":
          valueA = a.opened_at;
          valueB = b.opened_at;
          break;
        case "closed_at":
          valueA = a.closed_at;
          valueB = b.closed_at;
          break;
        case "opening_cash":
          valueA = a.opening_cash;
          valueB = b.opening_cash;
          break;
        case "closing_cash":
          valueA = a.closing_cash ?? 0;
          valueB = b.closing_cash ?? 0;
          break;
        case "cash_difference":
          valueA = a.cash_difference ?? 0;
          valueB = b.cash_difference ?? 0;
          break;
        default:
          valueA = a.opened_at;
          valueB = b.opened_at;
      }

      if (valueA === null && valueB === null) return 0;
      if (valueA === null) return sortOrder === "asc" ? -1 : 1;
      if (valueB === null) return sortOrder === "asc" ? 1 : -1;

      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortOrder === "asc" 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      }

      return sortOrder === "asc" 
        ? (valueA as number) - (valueB as number)
        : (valueB as number) - (valueA as number);
    });

    return result;
  }, [shifts, searchTerm, filterStatus, sortField, sortOrder]);

  // Pagination
  const paginatedShifts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedShifts.slice(start, start + itemsPerPage);
  }, [filteredAndSortedShifts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedShifts.length / itemsPerPage);

  // Calculate summary stats - moved before early return to fix hooks order
  const stats = useMemo(() => {
    const openShifts = shifts.filter(s => s.status === "open").length;
    const closedShifts = shifts.filter(s => s.status === "closed").length;
    const closedShiftsWithCash = shifts.filter(s => s.status === "closed" && s.closing_cash !== null);
    
    const totalOpeningCash = shifts.reduce((sum, s) => sum + s.opening_cash, 0);
    const totalClosingCash = closedShiftsWithCash.reduce((sum, s) => sum + (s.closing_cash || 0), 0);
    const totalDifference = closedShiftsWithCash.reduce((sum, s) => sum + (s.cash_difference || 0), 0);
    
    const avgShiftDuration = closedShiftsWithCash.length > 0
      ? closedShiftsWithCash.reduce((sum, s) => {
          if (s.closed_at) {
            const diff = new Date(s.closed_at).getTime() - new Date(s.opened_at).getTime();
            return sum + diff;
          }
          return sum;
        }, 0) / closedShiftsWithCash.length / (1000 * 60 * 60) // in hours
      : 0;

    return {
      openShifts,
      closedShifts,
      totalOpeningCash,
      totalClosingCash,
      totalDifference,
      avgShiftDuration: Math.round(avgShiftDuration * 10) / 10,
    };
  }, [shifts]);

  const formatDateTime = (dateString: string | null, withSeconds = false) => {
    if (!dateString) return "-";
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    if (withSeconds) options.second = "2-digit";
    return new Date(dateString).toLocaleString("id-ID", options);
  };

  const formatDuration = (openedAt: string, closedAt: string | null) => {
    if (!closedAt) {
      // Calculate duration from open until now
      const diff = new Date().getTime() - new Date(openedAt).getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}j ${minutes}m (berjalan)`;
    }
    
    const diff = new Date(closedAt).getTime() - new Date(openedAt).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}j ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-spin" />
          <p className="text-lg">Loading shifts...</p>
        </div>
      </div>
    );
  }

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["ID", "Kasir", "Status", "Buka", "Tutup", "Modal", "Kas Akhir", "Selisih", "Catatan"];
    const rows = filteredAndSortedShifts.map(s => [
      s.id,
      s.cashier?.full_name || "-",
      s.status,
      formatDateTime(s.opened_at, true),
      formatDateTime(s.closed_at, true),
      s.opening_cash,
      s.closing_cash ?? "-",
      s.cash_difference ?? "-",
      s.notes || "-",
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shift-report-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Data berhasil diexport ke CSV");
  };

  // View detail
  const handleViewDetail = (shift: ShiftWithCashier) => {
    setSelectedShift(shift);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">Monitoring Shift Kasir</h2>
            <p className="text-muted-foreground">Kelola dan monitoring shift kasir</p>
          </div>
          <Button onClick={fetchShifts} variant="outline">
            <Clock className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          <Card className="col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Shift Aktif</p>
                  <p className="text-2xl font-bold">{stats.openShifts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Shift</p>
                  <p className="text-2xl font-bold">{shifts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Modal</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalOpeningCash)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tutup</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalClosingCash)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stats.totalDifference >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                  {stats.totalDifference >= 0 
                    ? <TrendingUp className="h-5 w-5 text-green-600" />
                    : <TrendingDown className="h-5 w-5 text-red-600" />
                  }
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Selisih Total</p>
                  <p className={`text-2xl font-bold ${stats.totalDifference >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(stats.totalDifference)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rata-rata Durasi</p>
                  <p className="text-2xl font-bold">{stats.avgShiftDuration}j</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari kasir, catatan, atau ID..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>

              {/* Date Range */}
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, from: e.target.value }));
                    setCurrentPage(1);
                  }}
                  className="w-auto"
                  placeholder="Dari"
                />
                <span className="self-center text-muted-foreground">-</span>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, to: e.target.value }));
                    setCurrentPage(1);
                  }}
                  className="w-auto"
                  placeholder="Sampai"
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setFilterStatus("all"); setCurrentPage(1); }}
                >
                  Semua
                </Button>
                <Button
                  variant={filterStatus === "open" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setFilterStatus("open"); setCurrentPage(1); }}
                >
                  Aktif
                </Button>
                <Button
                  variant={filterStatus === "closed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setFilterStatus("closed"); setCurrentPage(1); }}
                >
                  Tutup
                </Button>
              </div>

              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Filter className="h-4 w-4" />
                    Urutkan
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setSortField("opened_at"); setSortOrder("desc"); }}>
                    Terbaru
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField("opened_at"); setSortOrder("asc"); }}>
                    Terlama
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField("closing_cash"); setSortOrder("desc"); }}>
                    Kas Akhir Tertinggi
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField("cash_difference"); setSortOrder("desc"); }}>
                    Selisih Tertinggi
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Export */}
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>
            
            {/* Filter Summary */}
            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
              <span>Menampilkan {paginatedShifts.length} dari {filteredAndSortedShifts.length} shift</span>
              <span className="text-xs">•</span>
              <span className="text-xs">Diperbarui: {lastUpdated.toLocaleTimeString("id-ID")}</span>
              {(dateRange.from || dateRange.to) && (
                <>
                  <span className="text-xs">•</span>
                  <Badge variant="secondary" className="text-xs">
                    Filter Tanggal
                  </Badge>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shifts List */}
        {filteredAndSortedShifts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">Tidak ada shift</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || dateRange.from || dateRange.to
                  ? "Tidak ada shift yang cocok dengan filter yang diterapkan"
                  : "Belum ada data shift kasir"}
              </p>
              {(searchTerm || dateRange.from || dateRange.to) && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setDateRange({ from: "", to: "" });
                    setFilterStatus("all");
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reset Filter
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedShifts.map((shift) => (
                <Card 
                  key={shift.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    shift.status === "open" ? "border-l-4 border-l-green-500" : "border-l-4 border-l-slate-300"
                  }`}
                  onClick={() => handleViewDetail(shift)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      {/* Left: Cashier Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{shift.cashier?.full_name || "Kasir"}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant={shift.status === "open" ? "default" : "secondary"}>
                              {shift.status === "open" ? "Aktif" : "Tutup"}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">
                              #{shift.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Shift Details */}
                      <div className="flex flex-wrap gap-6 text-sm">
                        <div>
                          <p className="text-muted-foreground">Buka</p>
                          <p className="font-medium">{formatDateTime(shift.opened_at)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tutup</p>
                          <p className="font-medium">{formatDateTime(shift.closed_at)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Durasi</p>
                          <p className="font-medium">{formatDuration(shift.opened_at, shift.closed_at)}</p>
                        </div>
                      </div>

                      {/* Right: Cash Info */}
                      <div className="flex flex-wrap gap-4 text-sm lg:text-right">
                        <div>
                          <p className="text-muted-foreground">Modal Awal</p>
                          <p className="font-medium">{formatCurrency(shift.opening_cash)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Kas Akhir</p>
                          <p className="font-medium">{formatCurrency(shift.closing_cash || 0)}</p>
                        </div>
                        {shift.cash_difference !== null && (
                          <div>
                            <p className="text-muted-foreground">Selisih</p>
                            <p className={`font-medium ${shift.cash_difference < 0 ? "text-red-600" : shift.cash_difference > 0 ? "text-green-600" : ""}`}>
                              {formatCurrency(shift.cash_difference)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* View Button */}
                      <div className="flex items-center lg:justify-end">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {shift.notes && (
                      <div className="mt-3 pt-3 border-t text-sm text-muted-foreground flex items-start gap-2">
                        <span className="font-medium whitespace-nowrap">Catatan:</span>
                        <span className="line-clamp-2">{shift.notes}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Halaman {currentPage} dari {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="min-w-[40px]"
                      >
                        {page}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detail Shift</DialogTitle>
              <DialogDescription>
                Informasi lengkap shift kasir
              </DialogDescription>
            </DialogHeader>
            {selectedShift && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-lg">{selectedShift.cashier?.full_name || "Kasir"}</p>
                    <Badge variant={selectedShift.status === "open" ? "default" : "secondary"}>
                      {selectedShift.status === "open" ? "Aktif" : "Tutup"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ID Shift</p>
                    <p className="font-mono text-sm">{selectedShift.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kasir ID</p>
                    <p className="font-mono text-sm">{selectedShift.cashier_id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Waktu Buka</p>
                    <p className="font-medium">{formatDateTime(selectedShift.opened_at, true)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Waktu Tutup</p>
                    <p className="font-medium">{formatDateTime(selectedShift.closed_at, true)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Modal Awal</p>
                    <p className="font-medium text-lg">{formatCurrency(selectedShift.opening_cash)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kas Akhir</p>
                    <p className="font-medium text-lg">{formatCurrency(selectedShift.closing_cash || 0)}</p>
                  </div>
                </div>

                {selectedShift.expected_cash !== null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Kas Diharapkan (Sistem)</p>
                    <p className="font-medium">{formatCurrency(selectedShift.expected_cash || 0)}</p>
                  </div>
                )}

                {selectedShift.cash_difference !== null && (
                  <div className={`p-3 rounded-lg ${selectedShift.cash_difference >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="text-sm text-muted-foreground">Selisih Kas</p>
                    <p className={`font-bold text-lg ${selectedShift.cash_difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(selectedShift.cash_difference)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedShift.cash_difference >= 0 
                        ? "Kas aktual lebih besar dari ekspektasi" 
                        : "Kas aktual kurang dari ekspektasi"}
                    </p>
                  </div>
                )}

                {selectedShift.notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Catatan</p>
                    <p className="text-sm">{selectedShift.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
