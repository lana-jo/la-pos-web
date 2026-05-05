import { supabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("products")
      .select(`
        id,
        name,
        barcode,
        stock,
        cached_stock,
        track_stock,
        low_stock_threshold,
        price,
        categories!inner(name),
        suppliers!inner(name)
      `)
      .eq("is_active", true)
      .or(`cached_stock.lte.low_stock_threshold,stock.lte.5`)
      .order("cached_stock", { ascending: true });

    if (error) throw error;

    // Filter and format results
    const lowStockProducts = (data as any[])?.map((product: any) => {
      const currentStock = product.track_stock ? product.cached_stock : product.stock;
      const threshold = product.low_stock_threshold || 5;
      
      return {
        ...product,
        category_name: product.categories?.name || 'Unknown',
        supplier_name: product.suppliers?.name || null,
        is_low_stock: currentStock <= threshold,
        current_stock: currentStock
      };
    }).filter(product => product.is_low_stock) || [];

    return NextResponse.json(lowStockProducts);
  } catch (error) {
    console.error("Error fetching low stock products:", error);
    return NextResponse.json(
      { error: "Failed to fetch low stock products" },
      { status: 500 }
    );
  }
}
