"use client";

import { useState, useCallback } from "react";

export function usePinVerification() {
  const [isOpen, setIsOpen] = useState(false);
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | null>(null);
  const [pinTitle, setPinTitle] = useState("Verifikasi PIN");
  const [pinDescription, setPinDescription] = useState("Masukkan PIN Anda untuk melanjutkan");

  const requestVerification = useCallback((
    onSuccess: () => void, 
    title?: string, 
    description?: string
  ) => {
    setOnSuccessCallback(() => onSuccess);
    if (title) setPinTitle(title);
    if (description) setPinDescription(description);
    setIsOpen(true);
  }, []);

  const handleSuccess = useCallback(() => {
    if (onSuccessCallback) {
      onSuccessCallback();
    }
    setIsOpen(false);
  }, [onSuccessCallback]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setOnSuccessCallback(null);
  }, []);

  return {
    isPinModalOpen: isOpen,
    requestVerification,
    handlePinSuccess: handleSuccess,
    handlePinClose: handleClose,
    pinTitle,
    pinDescription
  };
}
