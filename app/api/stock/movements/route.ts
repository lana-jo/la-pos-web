import { supabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const movementSchema = z.object({
  product_id: z.string().uuid(),
  product_variant_id: z.string().uuid().optional(),
  movement_type: z.enum(["purchase", "sale", "adjustment", "return_in", "return_out", "damage", "void"]),
  reference_type: z.enum(["transaction", "purchase_order", "refund", "manual"]).optional(),
  reference_id: z.string().uuid().optional(),
  qty_change: z.number(),
  unit_cost: z.number().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    // First try simple query without complex joins
    const { data, error } = await supabaseServer
      .from("inventory_movements")
      .select(`
        id,
        product_id,
        product_variant_id,
        movement_type,
        reference_type,
        reference_id,
        qty_change,
        unit_cost,
        notes,
        created_at,
        created_by
      `)
      .order("created_at", { ascending: false })
      .limit(100); // Limit to prevent timeout

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching stock movements:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch stock movements",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = movementSchema.parse(body);
    
    // Get current product stock and tracking info
    const { data: product, error: productError } = await supabaseServer
      .from("products")
      .select("stock, cached_stock, track_stock, low_stock_threshold, name")
      .eq("id", validatedData.product_id)
      .single() as { data: { name: string; stock: number; cached_stock: number; track_stock: boolean; low_stock_threshold: number } | null; error: any };

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Insert into inventory_movements table (trigger will handle stock updates)
    const { data: movement, error: movementError } = await supabaseServer
      .from("inventory_movements")
      .insert({
        product_id: validatedData.product_id,
        product_variant_id: validatedData.product_variant_id || null,
        movement_type: validatedData.movement_type,
        reference_type: validatedData.reference_type || "manual",
        reference_id: validatedData.reference_id || null,
        qty_change: validatedData.qty_change,
        unit_cost: validatedData.unit_cost || 0,
        notes: validatedData.notes || `Manual ${validatedData.movement_type}`,
        created_by: user.id
      } as any) // Type assertion to bypass TypeScript issues
      .select(`
        *,
        products!inner(name, barcode)
      `)
      .single();

    if (movementError) {
      console.error("Supabase Movement Error:", movementError);
      throw new Error(movementError.message || "Failed to create stock movement");
    }

    // Get updated stock after trigger
    const { data: updatedProduct, error: fetchError } = await supabaseServer
      .from("products")
      .select("cached_stock, stock")
      .eq("id", validatedData.product_id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({
      success: true,
      movement,
      new_stock: (updatedProduct as any)?.cached_stock || 0,
      product_name: product.name
    });

  } catch (error) {
    console.error("Error creating stock movement:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create stock movement" },
      { status: 500 }
    );
  }
}
