"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, Tag } from "lucide-react";
import { DiscountTable } from "@/components/admin/dashboard/discounts/DiscountTable";
import { DiscountModal } from "@/components/admin/dashboard/discounts/DiscountModal";
import { fetchDiscounts, createDiscount, updateDiscount, deleteDiscount } from "@/lib/discounts/actions";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/pos/utils";
import { LoadingSpinner } from "@/components/ui/LoadingStates";
import { Database } from "@/types";

type Discount = Database["public"]["Tables"]["discounts"]["Row"];

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadDiscounts = useCallback(async () => {
    setLoading(true);
    const result = await fetchDiscounts();
    if (result.success) {
      setDiscounts(result.data || []);
    } else {
      toast.error("Gagal memuat diskon: " + result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDiscounts();
  }, [loadDiscounts]);

  const handleCreateDiscount = async (data: any) => {
    const result = await createDiscount(data);
    if (result.success) {
      toast.success("Diskon berhasil ditambahkan");
      loadDiscounts();
    } else {
      toast.error("Gagal menambahkan diskon: " + result.error);
    }
  };

  const handleUpdateDiscount = async (data: any) => {
    if (!selectedDiscount) return;
    const result = await updateDiscount(selectedDiscount.id, data);
    if (result.success) {
      toast.success("Pengaturan diskon diperbarui");
      loadDiscounts();
    } else {
      toast.error("Gagal memperbarui diskon: " + result.error);
    }
  };

  const handleDeleteDiscount = async (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus diskon ini?")) {
      const result = await deleteDiscount(id);
      if (result.success) {
        toast.success("Diskon berhasil dihapus");
        loadDiscounts();
      } else {
        toast.error("Gagal menghapus diskon: " + result.error);
      }
    }
  };

  const filteredDiscounts = discounts.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Diskon</h1>
          <p className="text-muted-foreground">Atur promosi dan potongan harga untuk transaksi</p>
        </div>
        <Button onClick={() => { setSelectedDiscount(null); setIsModalOpen(true); }}>
          <Tag className="mr-2 h-4 w-4" />
          Tambah Diskon
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama diskon atau kode promo..."
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
      ) : filteredDiscounts.length > 0 ? (
        <DiscountTable
          discounts={filteredDiscounts}
          onEdit={(d) => { setSelectedDiscount(d); setIsModalOpen(true); }}
          onDelete={handleDeleteDiscount}
          formatCurrency={formatCurrency}
        />
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Tag className="h-12 w-12 mb-4 opacity-20" />
            <h3 className="text-lg font-semibold text-foreground">Tidak ada diskon tersedia</h3>
            <p className="text-sm">Data tidak ada, silahkan tambahkan diskon baru melalui tombol "Tambah Diskon".</p>
          </CardContent>
        </Card>
      )}

      <DiscountModal
        discount={selectedDiscount}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={selectedDiscount ? handleUpdateDiscount : handleCreateDiscount}
      />
    </div>
  );
}
