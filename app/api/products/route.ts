import { supabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("products")
      .select(`
        *,
        categories(name),
        suppliers(name)
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
      throw error;
    }

    // Map data to include category_name as a top-level property
    const formattedData = (data || []).map((product: any) => ({
      ...product,
      category_name: product.categories?.name || 'Uncategorized',
      supplier_name: product.suppliers?.name || '-'
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
