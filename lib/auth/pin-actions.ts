"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const updatePinSchema = z.object({
  newPin: z.string().length(6, "PIN harus 6 digit angka").regex(/^\d+$/, "PIN harus berupa angka"),
  confirmPin: z.string(),
}).refine((data) => data.newPin === data.confirmPin, {
  message: "Konfirmasi PIN tidak cocok",
  path: ["confirmPin"],
});

export async function updatePin(
  userId: string,
  formData: z.infer<typeof updatePinSchema>
) {
  try {
    // Validasi input
    const validatedData = updatePinSchema.parse(formData);
    
    // Hash PIN
    const pinHash = await bcrypt.hash(validatedData.newPin, 10);
    
    // Update PIN di database
    const { error } = await supabase
      .from('profiles')
      .update({
        pin_hash: pinHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error("Error updating PIN:", error);
      return {
        success: false,
        error: "Gagal memperbarui PIN. Silakan coba lagi.",
      };
    }

    // Revalidate cache
    revalidatePath('/profile');

    return {
      success: true,
      message: "PIN berhasil diperbarui!",
    };
  } catch (error) {
    console.error("Error in updatePin:", error);
    
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
