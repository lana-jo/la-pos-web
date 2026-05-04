"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(6, "Password minimal 6 karakter"),
  newPassword: z.string()
    .min(8, "Password baru minimal 8 karakter")
    .regex(/[A-Z]/, "Password baru harus mengandung huruf besar")
    .regex(/[a-z]/, "Password baru harus mengandung huruf kecil")
    .regex(/[0-9]/, "Password baru harus mengandung angka"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Konfirmasi password tidak cocok",
  path: ["confirmPassword"],
});

export async function updatePassword(
  userId: string,
  formData: z.infer<typeof updatePasswordSchema>
) {
  try {
    // Validasi input
    const validatedData = updatePasswordSchema.parse(formData);
    
    // Get user current password hash
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      return {
        success: false,
        error: "User tidak ditemukan",
      };
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.user.email!,
      password: validatedData.currentPassword,
    });

    if (signInError) {
      return {
        success: false,
        error: "Password saat ini salah",
      };
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: validatedData.newPassword,
    });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return {
        success: false,
        error: "Gagal memperbarui password. Silakan coba lagi.",
      };
    }

    // Revalidate cache
    revalidatePath('/profile');

    return {
      success: true,
      message: "Password berhasil diperbarui!",
    };
  } catch (error) {
    console.error("Error in updatePassword:", error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Data tidak valid",
      };
    }
    
    return {
      success: false,
      error: "Terjadi kesalahan sistem. Silakan coba lagi.",
    };
  }
}
