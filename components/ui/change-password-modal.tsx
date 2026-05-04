"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { updatePassword } from "@/lib/auth/password-actions";
import { Eye, EyeOff, Lock, Key, Shield, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function ChangePasswordModal({ isOpen, onClose, userId }: ChangePasswordModalProps) {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setErrors({});
      setShowPasswords({
        current: false,
        new: false,
        confirm: false,
      });
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = "Password saat ini harus diisi";
    } else if (formData.currentPassword.length < 6) {
      newErrors.currentPassword = "Password minimal 6 karakter";
    }

    if (!formData.newPassword) {
      newErrors.newPassword = "Password baru harus diisi";
    } else {
      if (formData.newPassword.length < 8) {
        newErrors.newPassword = "Password baru minimal 8 karakter";
      } else if (!/[A-Z]/.test(formData.newPassword)) {
        newErrors.newPassword = "Password baru harus mengandung huruf besar";
      } else if (!/[a-z]/.test(formData.newPassword)) {
        newErrors.newPassword = "Password baru harus mengandung huruf kecil";
      } else if (!/[0-9]/.test(formData.newPassword)) {
        newErrors.newPassword = "Password baru harus mengandung angka";
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Konfirmasi password harus diisi";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Konfirmasi password tidak cocok";
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
      const result = await updatePassword(userId, formData);
      
      if (result.success) {
        toast.success(result.message || "Password berhasil diperbarui!");
        onClose();
      } else {
        toast.error(result.error || "Gagal memperbarui password");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Terjadi kesalahan saat memperbarui password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, text: "", color: "" };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const strengthLevels = [
      { score: 0, text: "Sangat Lemah", color: "bg-red-500" },
      { score: 1, text: "Lemah", color: "bg-red-400" },
      { score: 2, text: "Sedang", color: "bg-yellow-500" },
      { score: 3, text: "Kuat", color: "bg-green-500" },
      { score: 4, text: "Sangat Kuat", color: "bg-green-600" },
      { score: 5, text: "Ekstrem Kuat", color: "bg-green-700" },
    ];

    return strengthLevels[Math.min(score, 4)];
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md animate-in fade-in-0 zoom-in-95 duration-200">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle>Ubah Password</DialogTitle>
              <DialogDescription>
                Perbarui password untuk keamanan akun Anda
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Password Saat Ini
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords.current ? "text" : "password"}
                value={formData.currentPassword}
                onChange={(e) => handleInputChange("currentPassword", e.target.value)}
                className={cn(
                  "pr-10",
                  errors.currentPassword && "border-red-500 focus:border-red-500"
                )}
                placeholder="Masukkan password saat ini"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => togglePasswordVisibility('current')}
                disabled={isSubmitting}
              >
                {showPasswords.current ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </Button>
            </div>
            {errors.currentPassword && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.currentPassword}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Password Baru
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords.new ? "text" : "password"}
                value={formData.newPassword}
                onChange={(e) => handleInputChange("newPassword", e.target.value)}
                className={cn(
                  "pr-10",
                  errors.newPassword && "border-red-500 focus:border-red-500"
                )}
                placeholder="Masukkan password baru"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => togglePasswordVisibility('new')}
                disabled={isSubmitting}
              >
                {showPasswords.new ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </Button>
            </div>
            {errors.newPassword && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.newPassword}
              </p>
            )}
            
            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Kekuatan Password</span>
                  <span className={cn(
                    "font-medium",
                    passwordStrength.score >= 3 ? "text-green-600" : 
                    passwordStrength.score >= 2 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {passwordStrength.text}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      passwordStrength.color
                    )}
                    style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Konfirmasi Password Baru
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPasswords.confirm ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                className={cn(
                  "pr-10",
                  errors.confirmPassword && "border-red-500 focus:border-red-500"
                )}
                placeholder="Masukkan ulang password baru"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => togglePasswordVisibility('confirm')}
                disabled={isSubmitting}
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Password baru harus:
            </p>
            <div className="space-y-1">
              <div className={cn(
                "flex items-center gap-2 text-xs",
                formData.newPassword.length >= 8 ? "text-green-600" : "text-slate-500"
              )}>
                <div className={cn(
                  "w-3 h-3 rounded-full border-2",
                  formData.newPassword.length >= 8 
                    ? "bg-green-500 border-green-500" 
                    : "border-slate-300"
                )} />
                Minimal 8 karakter
              </div>
              <div className={cn(
                "flex items-center gap-2 text-xs",
                /[A-Z]/.test(formData.newPassword) ? "text-green-600" : "text-slate-500"
              )}>
                <div className={cn(
                  "w-3 h-3 rounded-full border-2",
                  /[A-Z]/.test(formData.newPassword) 
                    ? "bg-green-500 border-green-500" 
                    : "border-slate-300"
                )} />
                Mengandung huruf besar (A-Z)
              </div>
              <div className={cn(
                "flex items-center gap-2 text-xs",
                /[a-z]/.test(formData.newPassword) ? "text-green-600" : "text-slate-500"
              )}>
                <div className={cn(
                  "w-3 h-3 rounded-full border-2",
                  /[a-z]/.test(formData.newPassword) 
                    ? "bg-green-500 border-green-500" 
                    : "border-slate-300"
                )} />
                Mengandung huruf kecil (a-z)
              </div>
              <div className={cn(
                "flex items-center gap-2 text-xs",
                /[0-9]/.test(formData.newPassword) ? "text-green-600" : "text-slate-500"
              )}>
                <div className={cn(
                  "w-3 h-3 rounded-full border-2",
                  /[0-9]/.test(formData.newPassword) 
                    ? "bg-green-500 border-green-500" 
                    : "border-slate-300"
                )} />
                Mengandung angka (0-9)
              </div>
            </div>
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
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Memperbarui...
                </>
              ) : (
                "Ubah Password"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
