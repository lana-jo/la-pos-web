"use client";

import { useState } from "react";
import type { Product, ProductVariant } from "@/types";

interface ModalState {
  showManualEntry: boolean;
  showTransactionHistory: boolean;
  showTransactionDetail: boolean;
  showEndOfDayReport: boolean;
  showProductSelection: boolean;
  showCameraScanner: boolean;
  showVariantSelection: boolean;
}

interface ManualProductState {
  name: string;
  price: string;
  quantity: string;
}

export function useModalState() {
  const [modalState, setModalState] = useState<ModalState>({
    showManualEntry: false,
    showTransactionHistory: false,
    showTransactionDetail: false,
    showEndOfDayReport: false,
    showProductSelection: false,
    showCameraScanner: false,
    showVariantSelection: false,
  });

  const [manualProduct, setManualProduct] = useState<ManualProductState>({
    name: "",
    price: "",
    quantity: "1"
  });

  const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product & { variants?: ProductVariant[] } | null>(null);

  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);

  const openModal = (modalName: keyof ModalState) => {
    setModalState(prev => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName: keyof ModalState) => {
    setModalState(prev => ({ ...prev, [modalName]: false }));
  };

  const closeAllModals = () => {
    setModalState({
      showManualEntry: false,
      showTransactionHistory: false,
      showTransactionDetail: false,
      showEndOfDayReport: false,
      showProductSelection: false,
      showCameraScanner: false,
      showVariantSelection: false,
    });
  };

  const resetManualProduct = () => {
    setManualProduct({ name: "", price: "", quantity: "1" });
  };

  return {
    modalState,
    manualProduct,
    selectedProductForVariants,
    selectedTransaction,
    openModal,
    closeModal,
    closeAllModals,
    setManualProduct,
    setSelectedProductForVariants,
    setSelectedTransaction,
    resetManualProduct,
  };
}
