import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getServerSession() {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: (cookiesToSet) => {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )

    // PERUBAHAN UTAMA: Gunakan getUser() alih-alih getSession()
    const allCookies = cookieStore.getAll()
    console.log('[getServerSession] Cookies found:', allCookies.map(c => c.name))
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
        console.error("[getServerSession] Supabase getUser error:", error);
    }

    if (error || !user) {
        console.error('[getServerSession] No user found, cookies count:', allCookies.length)
        throw new Error('Unauthorized')
    }
    
    // Karena kita mengembalikan user, bukan session, 
    // kita perlu menyesuaikan di tempat yang memanggilnya.
    return { user }
}