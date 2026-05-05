"use client";

import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footerActions?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
}

const sizeClasses = {
  sm: "sm:max-w-[425px]",
  md: "sm:max-w-[600px]",
  lg: "sm:max-w-[900px]",
  xl: "sm:max-w-[1200px]",
};

export function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  footerActions,
  size = "md",
  showCloseButton = true,
}: BaseModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${sizeClasses[size]} pos-modal-content`}>
        <DialogHeader className="pos-modal-header">
          <DialogTitle className="pos-modal-title">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="pos-modal-body">
          {children}
        </div>
        
        <DialogFooter className="pos-modal-footer">
          {footerActions || (
            showCloseButton && (
              <Button className="pos-button-secondary" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
