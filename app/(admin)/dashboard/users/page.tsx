"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ReactSelect } from '@/components/ui/react-select'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import DashboardHeader from "@/components/layout/DashboardHeader";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "sonner";
import { Profile } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "admin" | "cashier" | "customer";

type FormData = {
  full_name: string;
  email: string;
  password: string;
  password_confirm?: string;
  role: Role;
  phone: string;
  is_active: boolean;
};

const EMPTY_FORM: FormData = {
  full_name: "",
  email: "",
  password: "",
  role: "cashier",
  phone: "",
  is_active: true,
};

// Cast query builder to avoid `never` parameter errors without generated schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table) as any;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const roleVariant = (role: Role): "default" | "secondary" | "outline" => {
  if (role === "admin") return "default";
  if (role === "cashier") return "secondary";
  return "outline";
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function UserFormFields({
  formData,
  setFormData,
  isSubmitting,
  idPrefix = "",
  showRequiredInfo = false,
  isEdit = false,
}: {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  isSubmitting: boolean;
  idPrefix?: string;
  showRequiredInfo?: boolean;
  isEdit?: boolean;
}) {
  const field = (key: string) => `${idPrefix}${key}`;
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const validateEmail = (email: string | undefined) => {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password: string | undefined) => {
    if (!password) return false;
    return password.length >= 6;
  };

  return (
    <div className="space-y-4">
      {showRequiredInfo && (
        <div className="text-sm text-muted-foreground bg-muted/50 border border-border p-3 rounded-lg">
          <div className="space-y-1">
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              Nama lengkap wajib diisi
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              Email harus valid dan unik
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              Password minimal 6 karakter
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              Role akan menentukan hak akses user
            </p>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor={field("full_name")}>
          Nama Lengkap *<span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          id={field("full_name")}
          value={formData.full_name}
          onChange={(e) =>
            setFormData({ ...formData, full_name: e.target.value })
          }
          placeholder="Masukkan nama lengkap user"
          disabled={isSubmitting}
          className={
            formData.full_name.trim()
              ? "border-primary/50 focus:border-primary"
              : ""
          }
          required
        />
        {formData.full_name.trim() === "" && (
          <p className="text-xs text-destructive mt-1">Nama wajib diisi</p>
        )}
      </div>

      <div>
        <Label htmlFor={field("email")}>
          Email {isEdit ? "(kosongkan jika tidak ingin mengubah)" : "*"}
          {!isEdit && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id={field("email")}
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="user@example.com"
          disabled={isSubmitting}
          className={
            !formData.email || validateEmail(formData.email)
              ? "border-primary/50 focus:border-primary"
              : "border-destructive/50 focus:border-destructive"
          }
          required={!isEdit}
        />
        {formData.email && !validateEmail(formData.email) && (
          <p className="text-xs text-destructive mt-1">
            Format email tidak valid
          </p>
        )}
        {isEdit && formData.email && (
          <p className="text-xs text-amber-600 mt-1">
            ⚠️ Mengubah email akan memerlukan user untuk login ulang
          </p>
        )}
      </div>

      <div>
        <Label htmlFor={field("password")}>
          Password *<span className="text-destructive ml-1">*</span>
        </Label>
        <div className="relative">
          <Input
            id={field("password")}
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            placeholder={
              isEdit
                ? "•••••••• (kosongkan jika tidak ingin mengubah)"
                : "Minimal 6 karakter"
            }
            disabled={isSubmitting}
            className={
              validatePassword(formData.password) ||
              (isEdit && !formData.password)
                ? "border-primary/50 focus:border-primary"
                : formData.password
                  ? "border-destructive/50 focus:border-destructive"
                  : ""
            }
            required={!isEdit}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 hover:bg-muted/50"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isSubmitting}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        {formData.password && !validatePassword(formData.password) && (
          <p className="text-xs text-destructive mt-1">
            Password minimal 6 karakter
          </p>
        )}
      </div>

      {!isEdit && formData.password && (
        <div>
          <Label htmlFor={field("password_confirm")}>
            Konfirmasi Password *
            <span className="text-destructive ml-1">*</span>
          </Label>
          <div className="relative">
            <Input
              id={field("password_confirm")}
              type={showPasswordConfirm ? "text" : "password"}
              value={formData.password_confirm || ""}
              onChange={(e) =>
                setFormData({ ...formData, password_confirm: e.target.value })
              }
              placeholder="Masukkan ulang password"
              disabled={isSubmitting}
              className={
                formData.password_confirm === formData.password
                  ? "border-primary/50 focus:border-primary"
                  : formData.password_confirm
                    ? "border-destructive/50 focus:border-destructive"
                    : ""
              }
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-muted/50"
              onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
              disabled={isSubmitting}
            >
              {showPasswordConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {formData.password_confirm &&
            formData.password_confirm !== formData.password && (
              <p className="text-xs text-destructive mt-1">
                Password tidak cocok
              </p>
            )}
        </div>
      )}

      <div>
        <Label htmlFor={field("role")}>
          Role User
          <span className="text-destructive ml-1">*</span>
        </Label>
        <ReactSelect
          value={{ value: formData.role, label: formData.role.charAt(0).toUpperCase() + formData.role.slice(1) }}
          onChange={(option) =>
            setFormData({ ...formData, role: option?.value as Role || 'cashier' })
          }
          options={[
            { value: 'admin', label: 'Admin' },
            { value: 'cashier', label: 'Cashier' },
            { value: 'customer', label: 'Customer' }
          ]}
          formatOptionLabel={(option, { context }) => {
            if (context === 'menu') {
              return (
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {option.value === 'admin' && 'Akses penuh ke sistem'}
                    {option.value === 'cashier' && 'Akses POS dan transaksi'}
                    {option.value === 'customer' && 'Hanya melihat katalog'}
                  </div>
                </div>
              )
            }
            return option.label
          }}
          placeholder="Pilih role user"
          isDisabled={isSubmitting}
          required
          className="w-full"
        />
      </div>

      <div>
        <Label htmlFor={field("phone")}>
          Nomor Telepon
        </Label>
        <Input
          id={field("phone")}
          type="tel"
          value={formData.phone}
          onChange={(e) =>
            setFormData({ ...formData, phone: e.target.value })
          }
          placeholder="08xx-xxxx-xxxx"
          disabled={isSubmitting}
          className="border-primary/50 focus:border-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Opsional. Nomor telepon untuk kontak.
        </p>
      </div>

      {isEdit && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-lg">
          <input
            type="checkbox"
            id={field("is_active")}
            checked={formData.is_active}
            onChange={(e) =>
              setFormData({ ...formData, is_active: e.target.checked })
            }
            disabled={isSubmitting}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <div className="flex-1">
            <Label htmlFor={field("is_active")} className="cursor-pointer">
              User Aktif
            </Label>
            <p className="text-xs text-muted-foreground">
              Nonaktifkan untuk menonaktifkan akses user tanpa menghapus data
            </p>
          </div>
          <Badge variant={formData.is_active ? "default" : "secondary"}>
            {formData.is_active ? "Aktif" : "Nonaktif"}
          </Badge>
        </div>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg border p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState<"add" | "edit" | "delete" | null>(null);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  // ── Auth guard ─────────────────────────────────────────────────────────────

  const checkUserRole = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const { data: profile, error } = await db("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error || !profile) {
        router.push("/login");
        return;
      }

      if (profile.role !== "admin") {
        toast.error(
          "Akses ditolak: Hanya admin yang dapat mengakses halaman ini",
        );
        router.push("/auth/unauthorized");
      }
    } catch {
      router.push("/login");
    }
  }, [router]);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      setCurrentUserId(session.user.id);

      const { data, error } = await db("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows: Profile[] = data ?? [];

      // Pin current user to top of the list
      const me = rows.find((u) => u.id === session.user.id);
      const others = rows.filter((u) => u.id !== session.user.id);
      setUsers(me ? [me, ...others] : others);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Gagal mengambil data user");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUserRole();
    fetchData();
  }, [checkUserRole, fetchData]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const isSelf = (user: Profile) => user.id === currentUserId;

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setFormData(EMPTY_FORM);
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────--

  const handleAdd = async () => {
    if (!formData.full_name.trim()) {
      toast.error("Nama user harus diisi");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email harus diisi");
      return;
    }
    if (!formData.password.trim()) {
      toast.error("Password harus diisi");
      return;
    }
    if (formData.password !== formData.password_confirm) {
      toast.error("Password tidak cocok");
      return;
    }

    setIsSubmitting(true);
    try {
      const { createUser } = await import("@/lib/auth/user-actions");
      const result = await createUser({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        phone: formData.phone?.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.error || "Gagal menambahkan user");
        return;
      }

      toast.success(result.data?.message || "User berhasil ditambahkan");

      // Display credentials to admin
      if (result.data?.email && result.data?.password) {
        const credentials = `Email: ${result.data.email}\nPassword: ${result.data.password}`;

        // Show credentials in a more user-friendly way
        if (
          confirm(
            `User berhasil dibuat!\n\n${credentials}\n\nSimpan kredensial ini untuk diberikan kepada user.\n\nKlik OK untuk menutup.`,
          )
        ) {
          console.log("User credentials saved:", {
            email: result.data.email,
            password: result.data.password,
            user: result.data.user,
          });
        }
      }

      closeModal();
      fetchData();
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error("Gagal menambahkan user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selected || !formData.full_name.trim()) {
      toast.error("Nama user harus diisi");
      return;
    }

    // Validate email if provided
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error("Format email tidak valid");
        return;
      }
    }

    // Validate password if provided
    if (formData.password && formData.password.trim()) {
      if (formData.password.length < 6) {
        toast.error("Password minimal 6 karakter");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { updateUser } = await import("@/lib/auth/user-actions");
      const result = await updateUser(selected.id, {
        full_name: formData.full_name.trim(),
        email: formData.email?.trim() || undefined,
        password: formData.password?.trim() || undefined,
        role: formData.role,
        phone: formData.phone?.trim() || undefined,
        is_active: formData.is_active,
      });

      if (!result.success) {
        toast.error(result.error || "Gagal memperbarui user");
        return;
      }

      toast.success("User berhasil diperbarui");
      closeModal();
      fetchData();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Gagal memperbarui user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;

    setIsSubmitting(true);
    try {
      const { deleteUser } = await import("@/lib/auth/user-actions");
      const result = await deleteUser(selected.id);

      if (!result.success) {
        toast.error(result.error || "Gagal menghapus user");
        return;
      }

      toast.success("User berhasil dihapus");
      closeModal();
      fetchData();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Gagal menghapus user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Modal openers ──────────────────────────────────────────────────────────

  const openEdit = async (user: Profile) => {
  setSelected(user)
  setFormData({
    full_name: user.full_name ?? '',
    email: '',
    password: '',
    role: user.role,
    phone: user.phone ?? '',
    is_active: user.is_active
  })
  setModal('edit')

  try {
    const { getUserEmail } = await import('@/lib/auth/user-actions')
    const result = await getUserEmail(user.id)

    if (result.success && result.email) {
      setFormData(prev => ({ ...prev, email: result.email! }))
    } else {
      toast.warning('Email tidak dapat dimuat, silakan isi manual')
    }
  } catch {
    toast.warning('Email tidak dapat dimuat, silakan isi manual')
  }
}
  const openDelete = (user: Profile) => {
    setSelected(user);
    setModal("delete");
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-blue-600" />
          <p className="text-lg">Memuat pengguna...</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* <DashboardHeader
        title="User Management"
        subtitle="Manage staff accounts"
        badgeText="Administrator"
      >
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </DashboardHeader> */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Pengguna ({users.length})</h2>
          <Button onClick={() => setModal("add")}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Pengguna
          </Button>
        </div>

        {/* ── Users Table ── */}
        {users.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">Pengguna tidak ditemukan</h3>
              <p className="text-gray-500">Belum ada pengguna yang terdaftar</p>  
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card rounded-lg border overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Pengguna
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Peran
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Telepon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Bergabung
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className={!user.is_active ? "opacity-60" : ""}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name ?? "Pengguna"}
                            className="h-10 w-10 rounded-full object-cover border"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border">
                            <span className="text-sm font-semibold text-primary">
                              {(user.full_name ?? "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-medium block">
                            {user.full_name ?? "—"}
                          </span>
                          {isSelf(user) && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Anda
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={roleVariant(user.role)}>
                        {capitalize(user.role)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {user.phone ?? "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(user)}
                          disabled={isSelf(user)}
                        >
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDelete(user)}
                          disabled={isSelf(user)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Add Modal ── */}
        {modal === "add" && (
          <Modal title="Tambah User Baru" onClose={closeModal}>
            <UserFormFields
              formData={formData}
              setFormData={setFormData}
              isSubmitting={isSubmitting}
              idPrefix="add-"
              showRequiredInfo={true}
              isEdit={false}
            />
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                onClick={handleAdd}
                disabled={
                  isSubmitting ||
                  !formData.full_name.trim() ||
                  !formData.email.trim() ||
                  !formData.password.trim() ||
                  formData.password !== formData.password_confirm
                }
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Menyimpan...
                  </>
                ) : (
                  "Buat User"
                )}
              </Button>
            </div>
          </Modal>
        )}

        {/* ── Edit Modal ── */}
        {modal === "edit" && selected && (
          <Modal title="Edit User" onClose={closeModal}>
            <UserFormFields
              formData={formData}
              setFormData={setFormData}
              isSubmitting={isSubmitting}
              idPrefix="edit-"
              isEdit={true}
            />
            <div className="bg-muted/50 border border-border rounded-lg p-3 mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Info:</strong> Kosongkan email dan password jika tidak
                ingin mengubahnya.
              </p>
              <p className="text-sm text-amber-600">
                <strong>⚠️ Perhatian:</strong> Mengubah email atau password akan 
                memerlukan user untuk login ulang.
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                onClick={handleEdit}
                disabled={
                  Boolean(isSubmitting) || 
                  Boolean(!formData.full_name.trim()) ||
                  Boolean(formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) ||
                  Boolean(formData.password && formData.password.length < 6)
                }
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Menyimpan...
                  </>
                ) : (
                  "Perbarui"
                )}
              </Button>
            </div>
          </Modal>
        )}

        {/* ── Delete Modal ── */}
        {modal === "delete" && selected && (
          <Modal title="Hapus User" onClose={closeModal}>
            <div className="text-center py-4">
              <Trash2 className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h4 className="font-semibold text-lg mb-1">
                {selected.full_name ?? "Unknown User"}
              </h4>
              <p className="text-muted-foreground mb-3">
                Apakah Anda yakin ingin menghapus user ini?
              </p>
              <p className="text-sm text-amber-600">
                <strong>Perhatian:</strong> Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Menghapus..." : "Hapus"}
              </Button>
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}
