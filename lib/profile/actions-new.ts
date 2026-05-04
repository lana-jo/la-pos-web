"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const updateProfileSchema = z.object({
  full_name: z.string().min(1, "Nama lengkap harus diisi").max(100, "Nama terlalu panjang"),
  theme_preference: z.enum(['light', 'dark', 'system']).optional(),
});

export async function updateProfile(
  userId: string,
  formData: z.infer<typeof updateProfileSchema>
) {
  try {
    // Validasi input
    const validatedData = updateProfileSchema.parse(formData);
    
    // Update profile di database
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: validatedData.full_name,
        theme_preference: validatedData.theme_preference,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile:", error);
      return {
        success: false,
        error: "Gagal memperbarui profile. Silakan coba lagi.",
      };
    }

    // Revalidate cache untuk halaman profile
    revalidatePath('/profile');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: data,
      message: "Profile berhasil diperbarui!",
    };
  } catch (error) {
    console.error("Error in updateProfile:", error);
    
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
