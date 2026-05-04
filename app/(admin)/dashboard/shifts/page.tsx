'use client'

import { useState, useCallback } from 'react'
import { useShifts } from '@/hooks/useShifts'
import { useShiftMutations } from '@/hooks/useShiftMutations'
import { useCashiers } from '@/hooks/useCashiers'
import {
  ShiftStats,
  FilterBar,
  ShiftTable,
  OpenShiftDialog,
  CloseShiftDialog,
  ViewShiftDialog,
} from '@/components/admin/dashboard/shifts'
import type { Shift, ShiftFormData, ShiftCloseData } from '@/types'

export const dynamic = 'force-dynamic'

export default function ShiftsPage() {
  const {
    shifts,
    paginatedShifts,
    loading,
    error,
    stats,
    filters,
    currentPage,
    totalPages,
    totalFiltered,
    setSearchTerm,
    setStatusFilter,
    setCashierFilter,
    setDateFilter,
    setSortBy,
    toggleSort,
    goToNextPage,
    goToPreviousPage,
    refresh,
  } = useShifts()

  const { cashiers } = useCashiers()
  const { isSubmitting, openShift, closeShift, deleteShift } = useShiftMutations(refresh)

  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [modalType, setModalType] = useState<'open' | 'close' | 'view' | null>(null)

  const handleOpenShift = useCallback(async (data: ShiftFormData) => {
    const success = await openShift(data)
    if (success) {
      setModalType(null)
    }
  }, [openShift])

  const handleCloseShift = useCallback(async (data: ShiftCloseData) => {
    if (!selectedShift) return
    const success = await closeShift(selectedShift, data)
    if (success) {
      setModalType(null)
      setSelectedShift(null)
    }
  }, [closeShift, selectedShift])

  const handleDeleteShift = useCallback(async () => {
    if (!selectedShift) return
    const success = await deleteShift(selectedShift)
    if (success) {
      setModalType(null)
      setSelectedShift(null)
    }
  }, [deleteShift, selectedShift])

  const openViewDialog = useCallback((shift: Shift) => {
    setSelectedShift(shift)
    setModalType('view')
  }, [])

  const openCloseDialog = useCallback((shift: Shift) => {
    setSelectedShift(shift)
    setModalType('close')
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-pulse" />
          <p className="text-lg">Memuat data shift...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center max-w-md">
          <div className="h-12 w-12 mx-auto mb-4 text-red-600" />
          <h3 className="text-lg font-medium mb-2">Error Memuat Data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  const showEmptyState = shifts.length === 0 && !filters.searchTerm && filters.statusFilter === 'all'

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Shift Kasir</h1>
        <p className="text-muted-foreground">Kelola shift kasir dan monitoring transaksi</p>
      </div>

      {/* Stats Cards */}
      <ShiftStats stats={stats} />

      {showEmptyState ? (
        <div className="flex flex-col items-center justify-center py-16 bg-muted/30 rounded-lg border border-dashed">
          <div className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Belum ada shift</h3>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            Mulai dengan membuka shift pertama untuk memulai operasional kasir
          </p>
          <button
            onClick={() => setModalType('open')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            + Buka Shift Pertama
          </button>
        </div>
      ) : (
        <>
          <FilterBar
            searchTerm={filters.searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={filters.statusFilter}
            onStatusChange={setStatusFilter}
            cashierFilter={filters.cashierFilter}
            onCashierChange={setCashierFilter}
            dateFilter={filters.dateFilter}
            onDateChange={setDateFilter}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onToggleSort={toggleSort}
            onRefresh={refresh}
            onAdd={() => setModalType('open')}
            resultCount={totalFiltered}
            totalCount={shifts.length}
            cashiers={cashiers}
          />

          <ShiftTable
            shifts={paginatedShifts}
            currentPage={currentPage}
            totalPages={totalPages}
            onView={openViewDialog}
            onEdit={openCloseDialog}
            onDelete={handleDeleteShift}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
          />
        </>
      )}

      {/* Dialogs */}
      <OpenShiftDialog
        open={modalType === 'open'}
        onOpenChange={(open) => !open && setModalType(null)}
        onSubmit={handleOpenShift}
        isSubmitting={isSubmitting}
        cashiers={cashiers}
      />

      <CloseShiftDialog
        open={modalType === 'close'}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null)
            setSelectedShift(null)
          }
        }}
        onSubmit={handleCloseShift}
        isSubmitting={isSubmitting}
        shift={selectedShift}
      />

      <ViewShiftDialog
        open={modalType === 'view'}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null)
            setSelectedShift(null)
          }
        }}
        shift={selectedShift}
      />
    </>
  )
}
