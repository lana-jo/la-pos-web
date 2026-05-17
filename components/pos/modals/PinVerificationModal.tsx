"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, X, Delete, CheckCircle2 } from "lucide-react";
import { verifyCashierPin } from "@/lib/auth/actions";
import { toast } from "sonner";

interface PinVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function PinVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Verifikasi PIN",
  description = "Masukkan PIN Anda untuk melanjutkan tindakan ini"
}: PinVerificationModalProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      setPin(pin + num);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleVerify = async () => {
    if (pin.length < 4) {
      toast.error("PIN minimal 4 digit");
      return;
    }

    setLoading(true);
    try {
      const isValid = await verifyCashierPin(pin);
      if (isValid) {
        toast.success("Verifikasi berhasil");
        onSuccess();
        onClose();
        setPin("");
      } else {
        toast.error("PIN salah");
        setPin("");
      }
    } catch (error) {
      toast.error("Gagal memverifikasi PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="pos-modal-content">
          <div className="pos-modal-header flex flex-col items-center gap-2 py-8">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Lock className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <DialogTitle className="text-2xl font-bold text-primary">{title}</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground px-8">
              {description}
            </DialogDescription>
          </div>

          <div className="p-8 bg-background/50 backdrop-blur-md">
            <div className="flex justify-center gap-3 mb-8">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ${
                    i < pin.length 
                      ? "bg-primary border-primary scale-125 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                      : "bg-transparent border-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <Button
                  key={num}
                  variant="outline"
                  className="h-16 text-2xl font-bold rounded-2xl hover:bg-primary hover:text-white hover:scale-105 transition-all shadow-sm border-muted-foreground/10"
                  onClick={() => handleNumberClick(num.toString())}
                  disabled={loading}
                >
                  {num}
                </Button>
              ))}
              <Button
                variant="ghost"
                className="h-16 text-destructive hover:bg-destructive/10 rounded-2xl"
                onClick={() => setPin("")}
                disabled={loading}
              >
                Reset
              </Button>
              <Button
                variant="outline"
                className="h-16 text-2xl font-bold rounded-2xl hover:bg-primary hover:text-white hover:scale-105 transition-all shadow-sm border-muted-foreground/10"
                onClick={() => handleNumberClick("0")}
                disabled={loading}
              >
                0
              </Button>
              <Button
                variant="ghost"
                className="h-16 text-muted-foreground hover:bg-muted rounded-2xl"
                onClick={handleDelete}
                disabled={loading}
              >
                <Delete className="h-6 w-6" />
              </Button>
            </div>

            <Button
              className="w-full mt-8 h-14 text-lg font-bold pos-action-button rounded-2xl"
              onClick={handleVerify}
              disabled={loading || pin.length < 4}
            >
              {loading ? (
                <div className="pos-loading-spinner h-6 w-6 border-2" />
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Verifikasi & Lanjutkan
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
