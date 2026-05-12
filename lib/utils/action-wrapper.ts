/**
 * Reusable wrapper for Server Actions to ensure consistent error handling
 * and standardize responses.
 */

export interface ActionResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export async function safeAction<T>(
    action: () => Promise<T>
): Promise<ActionResult<T>> {
    try {
        const data = await action();
        return { success: true, data };
    } catch (error: any) {
        console.error("Action Error:", error);
        return { 
            success: false, 
            error: error.message || "Terjadi kesalahan yang tidak terduga" 
        };
    }
}
