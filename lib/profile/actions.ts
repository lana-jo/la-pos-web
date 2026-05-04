"use server";

import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

const updateProfileSchema = z.object({
  full_name: z.string().min(1, "Nama lengkap harus diisi").max(100, "Nama terlalu panjang"),
  avatar_url: z.string().url().optional().nullable(),
});

export async function updateProfile(
  userId: string,
  formData: z.infer<typeof updateProfileSchema>
) {
  try {
    // Validasi input
    const validatedData = updateProfileSchema.parse(formData);
    
    // Update profile di database
    const updateData = {
      full_name: validatedData.full_name,
      avatar_url: validatedData.avatar_url,
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await (supabase as any)
      .from('profiles')
      .update(updateData)
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

export async function uploadAvatar(file: File, userId: string) {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    
    // Upload file ke Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("Error uploading avatar:", uploadError);
      return {
        success: false,
        error: "Gagal mengupload foto profile",
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Update profile dengan avatar URL
    const { data: profileData, error: updateError } = await (supabase as any)
      .from('profiles')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating profile with avatar:", updateError);
      return {
        success: false,
        error: "Gagal menyimpan foto profile",
      };
    }

    // Revalidate cache
    revalidatePath('/profile');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: {
        avatar_url: publicUrl,
        profile: profileData,
      },
      message: "Foto profile berhasil diperbarui!",
    };
  } catch (error) {
    console.error("Error in uploadAvatar:", error);
    return {
      success: false,
      error: "Terjadi kesalahan saat mengupload foto",
    };
  }
}

export async function deleteAvatar(userId: string) {
  try {
    // Get current avatar URL
    const { data: currentProfile } = await (supabase as any)
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (currentProfile?.avatar_url) {
      // Extract file path from URL
      const url = new URL(currentProfile.avatar_url);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const filePath = `avatars/${fileName}`;
      
      // Delete file from storage
      await supabase.storage
        .from('avatars')
        .remove([filePath]);
    }

    // Update profile to remove avatar URL
    const { data, error } = await (supabase as any)
      .from('profiles')
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error("Error deleting avatar:", error);
      return {
        success: false,
        error: "Gagal menghapus foto profile",
      };
    }

    // Revalidate cache
    revalidatePath('/profile');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: data,
      message: "Foto profile berhasil dihapus!",
    };
  } catch (error) {
    console.error("Error in deleteAvatar:", error);
    return {
      success: false,
      error: "Terjadi kesalahan saat menghapus foto",
    };
  }
}
