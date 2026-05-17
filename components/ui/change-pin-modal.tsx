"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { updatePin } from "@/lib/auth/pin-actions";
import { Eye, EyeOff, Lock, Key, Shield, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function ChangePinModal({ isOpen, onClose, userId }: ChangePinModalProps) {
  const [formData, setFormData] = useState({
    newPin: "",
    confirmPin: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPins, setShowPins] = useState({
    new: false,
    confirm: false,
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setFormData({
          newPin: "",
          confirmPin: "",
        });
        setErrors({});
        setShowPins({
          new: false,
          confirm: false,
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.newPin) {
      newErrors.newPin = "PIN baru harus diisi";
    } else {
      if (formData.newPin.length !== 6) {
        newErrors.newPin = "PIN harus tepat 6 digit";
      } else if (!/^\d+$/.test(formData.newPin)) {
        newErrors.newPin = "PIN harus berupa angka saja";
      }
    }

    if (!formData.confirmPin) {
      newErrors.confirmPin = "Konfirmasi PIN harus diisi";
    } else if (formData.newPin !== formData.confirmPin) {
      newErrors.confirmPin = "Konfirmasi PIN tidak cocok";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updatePin(userId, formData);
      
      if (result.success) {
        toast.success(result.message || "PIN berhasil diperbarui!");
        onClose();
      } else {
        toast.error(result.error || "Gagal memperbarui PIN");
      }
    } catch (error) {
      console.error("Error updating PIN:", error);
      toast.error("Terjadi kesalahan saat memperbarui PIN");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    // Only allow numeric input and max 6 digits
    if (value && (!/^\d+$/.test(value) || value.length > 6)) {
      return;
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  const togglePinVisibility = (field: 'new' | 'confirm') => {
    setShowPins(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md animate-in fade-in-0 zoom-in-95 duration-200">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
              <Key className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <DialogTitle>Atur PIN Keamanan</DialogTitle>
              <DialogDescription>
                PIN 6-digit digunakan untuk verifikasi transaksi kasir
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New PIN */}
          <div className="space-y-2">
            <Label htmlFor="newPin" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              PIN Baru (6 Digit)
            </Label>
            <div className="relative">
              <Input
                id="newPin"
                type={showPins.new ? "text" : "password"}
                value={formData.newPin}
                onChange={(e) => handleInputChange("newPin", e.target.value)}
                className={cn(
                  "pr-10 tracking-[0.5em] text-center font-bold text-lg",
                  errors.newPin && "border-red-500 focus:border-red-500"
                )}
                placeholder="000000"
                maxLength={6}
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => togglePinVisibility('new')}
                disabled={isSubmitting}
              >
                {showPins.new ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </Button>
            </div>
            {errors.newPin && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.newPin}
              </p>
            )}
          </div>

          {/* Confirm PIN */}
          <div className="space-y-2">
            <Label htmlFor="confirmPin" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Konfirmasi PIN Baru
            </Label>
            <div className="relative">
              <Input
                id="confirmPin"
                type={showPins.confirm ? "text" : "password"}
                value={formData.confirmPin}
                onChange={(e) => handleInputChange("confirmPin", e.target.value)}
                className={cn(
                  "pr-10 tracking-[0.5em] text-center font-bold text-lg",
                  errors.confirmPin && "border-red-500 focus:border-red-500"
                )}
                placeholder="000000"
                maxLength={6}
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => togglePinVisibility('confirm')}
                disabled={isSubmitting}
              >
                {showPins.confirm ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </Button>
            </div>
            {errors.confirmPin && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.confirmPin}
              </p>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-xs text-slate-500">
            <ul className="list-disc pl-4 space-y-1">
              <li>PIN harus terdiri dari tepat 6 angka</li>
              <li>Gunakan PIN yang mudah diingat tapi sulit ditebak</li>
              <li>Jangan berikan PIN Anda kepada orang lain</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 pos-button-primary"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Memperbarui...
                </>
              ) : (
                "Simpan PIN"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
