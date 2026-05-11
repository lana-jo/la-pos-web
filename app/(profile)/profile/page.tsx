"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { updateProfile } from "@/lib/profile/actions-new";
import { createProfile } from "@/lib/auth/actions";
import { ChangePasswordModal } from "@/components/ui/change-password-modal";
import { User, Mail, Shield, Calendar, Edit2, Save, X, Lock, ArrowLeft, Moon, Sun, Monitor, Camera, Upload } from "lucide-react";
import { useProfileTheme } from "@/hooks/useProfileTheme";

export default function ProfilePage() {
  const { profile, user, loading } = useAuth();
  const { setTheme } = useProfileTheme();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    theme_preference: "system" as 'light' | 'dark' | 'system',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile && user) {
      setFormData({
        full_name: profile.full_name || "",
        email: user.email || "",
        theme_preference: profile.theme_preference || "system",
      });
    }
  }, [profile, user]);

  const handleEdit = () => {
    console.log(`[PROFILE] Edit button clicked:`, {
      userId: profile?.id,
      source: 'profile_page',
      timestamp: new Date().toISOString()
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    console.log(`[PROFILE] Cancel button clicked:`, {
      userId: profile?.id,
      source: 'profile_page',
      timestamp: new Date().toISOString()
    });
    setIsEditing(false);
    setErrors({});
    if (profile && user) {
      setFormData({
        full_name: profile.full_name || "",
        email: user.email || "",
        theme_preference: profile.theme_preference || "system",
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = "Nama lengkap harus diisi";
    } else if (formData.full_name.length < 2) {
      newErrors.full_name = "Nama minimal 2 karakter";
    } else if (formData.full_name.length > 100) {
      newErrors.full_name = "Nama maksimal 100 karakter";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!profile || !user) return;
    
    console.log(`[PROFILE] Save button clicked:`, {
      userId: profile.id,
      formData: {
        full_name: formData.full_name.trim(),
        theme_preference: formData.theme_preference
      },
      source: 'profile_page',
      timestamp: new Date().toISOString()
    });
    
    // Validasi form
    if (!validateForm()) {
      console.log(`[PROFILE] Save validation failed:`, {
        userId: profile.id,
        errors,
        source: 'profile_page',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const result = await updateProfile(profile.id, {
        full_name: formData.full_name.trim(),
        theme_preference: formData.theme_preference,
      } as { full_name: string; theme_preference: 'light' | 'dark' | 'system' });
      
      // Apply theme change immediately
      setTheme(formData.theme_preference);
      
      if (result.success) {
        console.log(`[PROFILE] Save successful:`, {
          userId: profile.id,
          result,
          source: 'profile_page',
          timestamp: new Date().toISOString()
        });
        setIsEditing(false);
        setErrors({});
        toast.success(result.message || "Profile berhasil diperbarui!");
        // Refresh profile data
        window.location.reload();
      } else {
        console.error(`[PROFILE] Save failed:`, {
          userId: profile.id,
          error: result.error,
          source: 'profile_page',
          timestamp: new Date().toISOString()
        });
        toast.error(result.error || "Gagal memperbarui profile");
      }
    } catch (error) {
      console.error("[PROFILE] Save error:", {
        userId: profile.id,
        error,
        source: 'profile_page',
        timestamp: new Date().toISOString()
      });
      toast.error("Terjadi kesalahan saat memperbarui profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleThemeChange = async (themeValue: 'light' | 'dark' | 'system') => {
    if (!profile) return;
    
    console.log(`[THEME] Profile page theme change initiated:`, {
      userId: profile.id,
      userEmail: user?.email,
      fromTheme: formData.theme_preference,
      toTheme: themeValue,
      source: 'profile_page',
      timestamp: new Date().toISOString()
    });
    
    handleInputChange('theme_preference', themeValue);
    setTheme(themeValue);
    
    try {
      const result = await updateProfile(profile.id, {
        full_name: formData.full_name.trim(),
        theme_preference: themeValue,
      });
      
      if (result.success) {
        console.log(`[THEME] Profile page theme change successful:`, {
          userId: profile.id,
          theme: themeValue,
          source: 'profile_page',
          timestamp: new Date().toISOString()
        });
        toast.success('Tema berhasil diperbarui');
      } else {
        console.error(`[THEME] Profile page theme change failed:`, {
          userId: profile.id,
          theme: themeValue,
          error: result.error,
          source: 'profile_page',
          timestamp: new Date().toISOString()
        });
        toast.error(result.error || 'Gagal menyimpan tema');
      }
    } catch (error) {
      console.error('[THEME] Profile page theme change error:', {
        userId: profile.id,
        theme: themeValue,
        error: error,
        source: 'profile_page',
        timestamp: new Date().toISOString()
      });
      toast.error('Terjadi kesalahan saat menyimpan tema');
    }
  };

  const handleBack = () => {
    console.log(`[PROFILE] Back button clicked:`, {
      userId: profile?.id,
      userRole: profile?.role,
      destination: profile?.role === "admin" ? "/dashboard" : profile?.role === "cashier" ? "/pos" : "/catalog",
      source: 'profile_page',
      timestamp: new Date().toISOString()
    });
    
    // Kembali ke halaman sebelumnya atau dashboard berdasarkan role
    if (profile?.role === "admin") {
      router.push("/dashboard");
    } else if (profile?.role === "cashier") {
      router.push("/pos");
    } else {
      router.push("/catalog");
    }
  };

  const handleCreateProfile = async () => {
    if (!user) return;

    console.log(`[PROFILE] Create profile button clicked:`, {
      userId: user.id,
      userEmail: user.email,
      fullName: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      source: 'profile_page',
      timestamp: new Date().toISOString()
    });

    setIsCreatingProfile(true);
    try {
      const result = await createProfile(user.id, user.email || "", user.user_metadata?.full_name || user.email?.split("@")[0] || "User");

      if (result.success) {
        console.log(`[PROFILE] Create profile successful:`, {
          userId: user.id,
          result,
          source: 'profile_page',
          timestamp: new Date().toISOString()
        });
        toast.success("Profile berhasil dibuat! Silakan refresh halaman.");
        window.location.reload();
      } else {
        console.error(`[PROFILE] Create profile failed:`, {
          userId: user.id,
          error: result.error,
          source: 'profile_page',
          timestamp: new Date().toISOString()
        });
        toast.error(String(result.error) || "Gagal membuat profile");
      }
    } catch (error) {
      console.error("[PROFILE] Create profile error:", {
        userId: user.id,
        error,
        source: 'profile_page',
        timestamp: new Date().toISOString()
      });
      toast.error("Terjadi kesalahan saat membuat profile");
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile || !event.target.files || !event.target.files[0]) return;

    const file = event.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, GIF, WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    
    try {
      console.log(`[PROFILE] Avatar upload started:`, {
        userId: profile.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        source: 'profile_page',
        timestamp: new Date().toISOString()
      });

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', profile.id);

      // Upload to your API endpoint (you'll need to create this)
      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      if (result.success) {
        // Update profile with new avatar URL
        const updateResult = await updateProfile(profile.id, {
          full_name: profile.full_name || '',
          avatar_url: result.avatarUrl
        });

        if (updateResult.success) {
          console.log(`[PROFILE] Avatar upload successful:`, {
            userId: profile.id,
            avatarUrl: result.avatarUrl,
            source: 'profile_page',
            timestamp: new Date().toISOString()
          });
          toast.success('Avatar berhasil diperbarui!');
          window.location.reload();
        } else {
          throw new Error(updateResult.error || 'Failed to update profile');
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('[PROFILE] Avatar upload error:', {
        userId: profile.id,
        error,
        source: 'profile_page',
        timestamp: new Date().toISOString()
      });
      toast.error('Gagal mengupload avatar. Silakan coba lagi.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="page-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Memuat profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-background flex items-center justify-center">
        <Card className="w-96 card-background">
          <CardHeader>
            <CardTitle className="text-center">Profile Tidak Ditemukan</CardTitle>
            <CardDescription className="text-center">
              {user
                ? "Profile Anda belum terbuat di database. Silakan buat profile terlebih dahulu."
                : "Silakan login kembali untuk mengakses profile"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {user ? (
              <Button
                onClick={handleCreateProfile}
                disabled={isCreatingProfile}
                className="w-full"
              >
                {isCreatingProfile ? "Membuat Profile..." : "Buat Profile"}
              </Button>
            ) : (
              <Button onClick={() => router.push("/login")} className="w-full">
                Login
              </Button>
            )}
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="w-full"
            >
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="flex items-center gap-2 border-primary-brand text-primary-brand hover:bg-primary-brand hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Profile Saya
              </h1>
              <p className="text-muted-foreground">
                Kelola informasi profile dan pengaturan akun Anda
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <Card className="md:col-span-1 card-background shadow-xl">
            <CardHeader className="text-center">
              <div className="relative inline-block">
                <Avatar className="w-20 h-20 mx-auto mb-4 border-4 border-background">
                  <AvatarImage src={profile.avatar_url || ""} alt={`${profile.full_name}'s avatar`} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 text-xl dark:from-blue-900 dark:to-blue-800 dark:text-blue-200">
                    {profile.full_name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-2 right-0">
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                    className="hidden"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
                  >
                    {isUploadingAvatar ? (
                      <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent" />
                    ) : (
                      <Camera className="w-3 h-3" />
                    )}
                  </label>
                </div>
              </div>
              <CardTitle className="text-xl">
                {profile.full_name || "User"}
              </CardTitle>
              <CardDescription className="text-center">
                {user?.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <Badge variant={profile.role === "admin" ? "default" : profile.role === "cashier" ? "secondary" : "outline"}>
                    {profile.role === "admin" ? "Administrator" : profile.role === "cashier" ? "Kasir" : "Pelanggan"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Aktif
                  </Badge>
                </div>
                <Separator className="bg-border" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Bergabung: {profile.created_at
                      ? new Date(profile.created_at).toLocaleDateString("id-ID")
                      : "-"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Form */}
          <Card className="md:col-span-2 card-background shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Informasi Profile</CardTitle>
                  <CardDescription>
                    Perbarui informasi pribadi Anda
                  </CardDescription>
                </div>
                {!isEditing ? (
                  <Button onClick={handleEdit} variant="outline" size="sm" className="border-primary-brand text-primary-brand hover:bg-primary-brand hover:text-white">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isSaving} size="sm" className="pos-button-primary">
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Menyimpan..." : "Simpan"}
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      <X className="w-4 h-4 mr-2" />
                      Batal
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="full_name" className="pos-form-label">Nama Lengkap</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange("full_name", e.target.value)}
                      disabled={!isEditing}
                      className={cn(
                        "input-background pl-10",
                        errors.full_name && "border-red-500 focus:border-red-500"
                      )}
                      placeholder="Masukkan nama lengkap"
                    />
                  </div>
                  {errors.full_name && (
                    <p className="text-sm text-red-500 mt-1">{errors.full_name}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email" className="pos-form-label">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      disabled={!isEditing}
                      className="input-background pl-10"
                      placeholder="Masukkan email"
                    />
                  </div>
                </div>

                <Separator className="bg-border" />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Informasi Akun</h3>
                  
                  <div className="grid gap-2">
                    <Label className="pos-form-label">ID Pengguna</Label>
                    <Input
                      value={profile.id}
                      disabled
                      className="input-background bg-muted/50"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label className="pos-form-label">Role Akses</Label>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <Badge variant={profile.role === "admin" ? "default" : profile.role === "cashier" ? "secondary" : "outline"}>
                        {profile.role === "admin" ? "Administrator" : profile.role === "cashier" ? "Kasir" : "Pelanggan"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Settings Card */}
        <Card className="mt-6 card-background shadow-xl">
          <CardHeader>
            <CardTitle>Pengaturan Tambahan</CardTitle>
            <CardDescription>
              Kelola pengaturan keamanan dan preferensi lainnya
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-background/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Ubah Password</h4>
                    <p className="text-sm text-muted-foreground">
                      Perbarui password untuk keamanan akun
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    console.log(`[PROFILE] Change password button clicked:`, {
                      userId: profile?.id,
                      source: 'profile_page',
                      timestamp: new Date().toISOString()
                    });
                    setIsPasswordModalOpen(true);
                  }}
                  className="border-primary-brand text-primary-brand hover:bg-primary/5 transition-all duration-200"
                >
                  Ubah Password
                </Button>
              </div>

              {/* Theme Preference */}
              <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-background/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    {formData.theme_preference === 'dark' ? (
                      <Moon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    ) : formData.theme_preference === 'light' ? (
                      <Sun className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <Monitor className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Tema Tampilan</h4>
                    <p className="text-sm text-muted-foreground">
                      Pilih tema terang, gelap, atau sistem
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={formData.theme_preference === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleThemeChange('light')}
                    className={formData.theme_preference === 'light' ? 'pos-button-primary' : ''}
                  >
                    <Sun className="h-3 w-3 mr-1" />
                    Terang
                  </Button>
                  <Button
                    variant={formData.theme_preference === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleThemeChange('dark')}
                    className={formData.theme_preference === 'dark' ? 'pos-button-primary' : ''}
                  >
                    <Moon className="h-3 w-3 mr-1" />
                    Gelap
                  </Button>
                  <Button
                    variant={formData.theme_preference === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleThemeChange('system')}
                    className={formData.theme_preference === 'system' ? 'pos-button-primary' : ''}
                  >
                    <Monitor className="h-3 w-3 mr-1" />
                    Sistem
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Modal */}
        {profile && (
          <ChangePasswordModal
            isOpen={isPasswordModalOpen}
            onClose={() => setIsPasswordModalOpen(false)}
            userId={profile.id}
          />
        )}
      </div>
    </div>
  );
}
