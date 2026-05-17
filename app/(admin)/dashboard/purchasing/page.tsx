"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, Truck } from "lucide-react";
import { POTable } from "@/components/admin/dashboard/purchasing/POTable";
import { PODetailsModal } from "@/components/admin/dashboard/purchasing/PODetailsModal";
import { fetchPurchaseOrders, fetchPOItems, updatePOStatus, POWithDetails } from "@/lib/purchasing/actions";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/pos/utils";
import { LoadingSpinner } from "@/components/ui/LoadingStates";
import { useUserRole } from "@/hooks/useUserRole";
import { POCreateModal } from "@/components/admin/dashboard/purchasing/POCreateModal";
import { usePinVerification } from "@/hooks/usePinVerification";
import { PinVerificationModal } from "@/components/pos/modals/PinVerificationModal";

export default function PurchasingPage() {
  const { userId } = useUserRole();
  const [orders, setOrders] = useState<POWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedOrder, setSelectedOrder] = useState<POWithDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const { 
    isPinModalOpen, 
    requestVerification, 
    handlePinSuccess, 
    handlePinClose, 
    pinTitle, 
    pinDescription 
  } = usePinVerification();

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const result = await fetchPurchaseOrders();
    if (result.success) {
      setOrders(result.data || []);
    } else {
      toast.error("Gagal memuat pesanan: " + result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleViewDetails = async (order: POWithDetails) => {
    const itemsResult = await fetchPOItems(order.id);
    if (itemsResult.success) {
      setSelectedOrder({ ...order, items: itemsResult.data });
      setIsDetailsOpen(true);
    } else {
      toast.error("Gagal memuat item pesanan");
    }
  };

  const handleReceiveOrder = async (order: POWithDetails) => {
    requestVerification(
      async () => {
        setLoading(true);
        const result = await updatePOStatus(order.id, "received", userId || "system");
        if (result.success) {
          toast.success("Pesanan ditandai sebagai diterima dan stok telah diperbarui");
          loadOrders();
        } else {
          toast.error("Gagal memperbarui status: " + result.error);
        }
        setLoading(false);
      },
      "Konfirmasi Penerimaan",
      `Masukkan PIN untuk mengonfirmasi penerimaan PO ${order.po_number || order.id}`
    );
  };

  const filteredOrders = orders.filter(o => 
    o.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Purchasing</h1>
          <p className="text-muted-foreground">Kelola pesanan pembelian (PO) ke supplier</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="pos-action-button px-6">
          <Plus className="mr-2 h-5 w-5" />
          Buat PO Baru
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nomor PO atau supplier..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <POTable
          orders={filteredOrders}
          onView={handleViewDetails}
          onReceive={handleReceiveOrder}
          formatCurrency={formatCurrency}
        />
      )}

      <PODetailsModal
        order={selectedOrder}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        formatCurrency={formatCurrency}
      />

      <POCreateModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          loadOrders();
        }}
        userId={userId || null}
      />

      <PinVerificationModal
        isOpen={isPinModalOpen}
        onClose={handlePinClose}
        onSuccess={handlePinSuccess}
        title={pinTitle}
        description={pinDescription}
      />
    </div>
  );
}
