"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, UserPlus } from "lucide-react";
import { CustomerTable } from "@/components/admin/dashboard/customers/CustomerTable";
import { CustomerModal } from "@/components/admin/dashboard/customers/CustomerModal";
import { DebtManagementModal } from "@/components/admin/dashboard/customers/DebtManagementModal";
import { fetchCustomers, createCustomer, updateCustomer } from "@/lib/customers/actions";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/pos/utils";
import { LoadingSpinner } from "@/components/ui/LoadingStates";
import { Database } from "@/types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    const result = await fetchCustomers();
    if (result.success) {
      setCustomers(result.data || []);
    } else {
      toast.error("Gagal memuat pelanggan: " + result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleCreateCustomer = async (data: any) => {
    const result = await createCustomer(data);
    if (result.success) {
      toast.success("Pelanggan berhasil ditambahkan");
      loadCustomers();
    } else {
      toast.error("Gagal menambahkan pelanggan: " + result.error);
    }
  };

  const handleUpdateCustomer = async (data: any) => {
    if (!selectedCustomer) return;
    const result = await updateCustomer(selectedCustomer.id, data);
    if (result.success) {
      toast.success("Profil pelanggan diperbarui");
      loadCustomers();
    } else {
      toast.error("Gagal memperbarui pelanggan: " + result.error);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Data Pelanggan</h1>
          <p className="text-muted-foreground">Kelola informasi pelanggan dan riwayat piutang</p>
        </div>
        <Button onClick={() => { setSelectedCustomer(null); setIsCustomerModalOpen(true); }}>
          <UserPlus className="mr-2 h-4 w-4" />
          Tambah Pelanggan
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau nomor telepon..."
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
        <CustomerTable
          customers={filteredCustomers}
          onEdit={(c) => { setSelectedCustomer(c); setIsCustomerModalOpen(true); }}
          onViewDebts={(c) => { setSelectedCustomer(c); setIsDebtModalOpen(true); }}
          formatCurrency={formatCurrency}
        />
      )}

      <CustomerModal
        customer={selectedCustomer}
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSubmit={selectedCustomer ? handleUpdateCustomer : handleCreateCustomer}
      />

      <DebtManagementModal
        customer={selectedCustomer}
        isOpen={isDebtModalOpen}
        onClose={() => { setIsDebtModalOpen(false); loadCustomers(); }}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
