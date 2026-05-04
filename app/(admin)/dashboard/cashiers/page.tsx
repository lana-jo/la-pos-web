'use client'

import { useState, useCallback } from 'react'
import { useCashiers } from '@/hooks/useCashiers'
import { useCashierMutations } from '@/hooks/useCashierMutations'
import {
  StatCard,
  FilterBar,
  CashierTable,
  AddCashierDialog,
  EditCashierDialog,
  DeleteCashierDialog,
} from '@/components/admin/dashboard/cashiers'
import { UserCircle, Users, UserCheck, UserX, Calendar } from 'lucide-react'
import type { Cashier, CashierFormData } from '@/types/cashier'

export const dynamic = 'force-dynamic'

export default function CashiersPage() {
  const {
    cashiers,
    paginatedCashiers,
    loading,
    stats,
    filters,
    currentPage,
    totalPages,
    totalFiltered,
    setSearchTerm,
    setStatusFilter,
    toggleSort,
    goToNextPage,
    goToPreviousPage,
    refresh,
  } = useCashiers()

  const { isSubmitting, addCashier, updateCashier, deleteCashier } = useCashierMutations(refresh)

  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'delete' | null>(null)

  const handleAdd = useCallback(async (data: CashierFormData) => {
    const success = await addCashier(data)
    if (success) {
      setModalType(null)
    }
  }, [addCashier])

  const handleEdit = useCallback(async (data: CashierFormData) => {
    if (!selectedCashier) return
    const success = await updateCashier(selectedCashier, data)
    if (success) {
      setModalType(null)
      setSelectedCashier(null)
    }
  }, [updateCashier, selectedCashier])

  const handleDelete = useCallback(async () => {
    if (!selectedCashier) return
    const success = await deleteCashier(selectedCashier)
    if (success) {
      setModalType(null)
      setSelectedCashier(null)
    }
  }, [deleteCashier, selectedCashier])

  const openEdit = useCallback((cashier: Cashier) => {
    setSelectedCashier(cashier)
    setModalType('edit')
  }, [])

  const openDelete = useCallback((cashier: Cashier) => {
    setSelectedCashier(cashier)
    setModalType('delete')
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <UserCircle className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-pulse" />
          <p className="text-lg">Memuat data kasir...</p>
        </div>
      </div>
    )
  }

  const showEmptyState = cashiers.length === 0 && !filters.searchTerm && filters.statusFilter === 'all'

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Kasir</h1>
        <p className="text-muted-foreground">Kelola akun kasir</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Total Kasir" 
          value={stats.total} 
          icon={Users} 
          color="bg-blue-100 text-blue-600" 
        />
        <StatCard 
          title="Aktif" 
          value={stats.active} 
          icon={UserCheck} 
          color="bg-green-100 text-green-600" 
        />
        <StatCard 
          title="Nonaktif" 
          value={stats.inactive} 
          icon={UserX} 
          color="bg-red-100 text-red-600" 
        />
        <StatCard 
          title="Baru Bulan Ini" 
          value={stats.newThisMonth} 
          icon={Calendar} 
          color="bg-purple-100 text-purple-600" 
        />
      </div>

      {showEmptyState ? (
        <div className="flex flex-col items-center justify-center py-16 bg-muted/30 rounded-lg border border-dashed">
          <UserCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Belum ada kasir</h3>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            Mulai dengan menambahkan kasir pertama Anda untuk mengelola transaksi POS
          </p>
          <button
            onClick={() => setModalType('add')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            + Tambah Kasir Pertama
          </button>
        </div>
      ) : (
        <>
          <FilterBar
            searchTerm={filters.searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={filters.statusFilter}
            onStatusChange={setStatusFilter}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onToggleSort={toggleSort}
            onRefresh={refresh}
            onAdd={() => setModalType('add')}
            resultCount={totalFiltered}
            totalCount={cashiers.length}
          />

          <CashierTable
            cashiers={paginatedCashiers}
            currentPage={currentPage}
            totalPages={totalPages}
            onEdit={openEdit}
            onDelete={openDelete}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
          />
        </>
      )}

      {/* Dialogs */}
      <AddCashierDialog
        open={modalType === 'add'}
        onOpenChange={(open) => !open && setModalType(null)}
        onSubmit={handleAdd}
        isSubmitting={isSubmitting}
      />

      <EditCashierDialog
        open={modalType === 'edit'}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null)
            setSelectedCashier(null)
          }
        }}
        onSubmit={handleEdit}
        cashier={selectedCashier}
        isSubmitting={isSubmitting}
      />

      <DeleteCashierDialog
        open={modalType === 'delete'}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null)
            setSelectedCashier(null)
          }
        }}
        onConfirm={handleDelete}
        cashier={selectedCashier}
        isSubmitting={isSubmitting}
      />
    </>
  )
}
