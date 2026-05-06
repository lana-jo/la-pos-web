"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Product, ProductVariant, Database } from "@/types";

interface UserProfile {
  full_name: string;
  role: string;
}

interface ReportData {
  totalSales: number;
  totalTransactions: number;
  totalItems: number;
  date: string;
}

export function useUserProfile() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUserRole = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = (await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", session.user.id)
        .maybeSingle()) as {
        data: {
          role: "admin" | "cashier" | "customer";
          full_name: string;
        } | null;
        error: any;
      };

      if (profileError || !profile) {
        console.error("Error fetching profile:", profileError);
        router.push("/login");
        return;
      }

      const userProfileData = {
        full_name: profile.full_name || "Unknown User",
        role: profile.role,
      };

      setUserProfile(userProfileData);

      if (profile.role !== "cashier" && profile.role !== "admin") {
        toast.error("Akses ditolak: Hanya cashier yang dapat mengakses POS");
        router.push("/auth/unauthorized");
        return;
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUserRole();
  }, []);

  return { userProfile, loading, refetch: checkUserRole };
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Fetch categories first
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          categories (
            id,
            name,
            slug
          ),
          product_variants (*)
        `)
        .eq("is_active", true)
        .order("name");

      if (productsError) throw productsError;

      const { data: variantsData, error: variantsError } = await supabase
        .from("product_variants")
        .select("*")
        .eq("is_active", true);

      if (variantsError) throw variantsError;

      const productsWithVariants = (productsData || []).map((product: Product) => {
        const productVariants = (variantsData || []).filter((v: ProductVariant) => v.product_id === product.id);
        return {
          ...product,
          variants: productVariants
        };
      });

      let filteredProducts = productsWithVariants;
      if (selectedCategory !== "all") {
        filteredProducts = filteredProducts.filter(p => p.category_id === selectedCategory);
      }

      if (search) {
        filteredProducts = filteredProducts.filter(p => 
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.variants && p.variants.some((v: ProductVariant) => v.variant_name.toLowerCase().includes(search.toLowerCase())))
        );
      }

      const normalizedProducts = filteredProducts.map((p: any) => ({
        ...p,
        category_id: p.category_id || null,
        unit_id: p.unit_id || null,
        supplier_id: p.supplier_id || null,
        description: p.description || null,
        cost_price: p.cost_price || 0,
        min_stock: p.low_stock_threshold || 0,
        max_stock: p.max_stock || null,
        is_consignment: p.is_consignment || false,
      } as Product));

      setProducts(normalizedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  return {
    products,
    categories,
    loading,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    fetchProducts,
  };
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Session expired");
        return;
      }

      const { data, error } = await supabase
        .from("transactions")
        .select("*, items:transaction_items(*)")
        .eq("cashier_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  return { transactions, loading, fetchTransactions };
}

export function useReports() {
  const [reportData, setReportData] = useState<ReportData>({
    totalSales: 0,
    totalTransactions: 0,
    totalItems: 0,
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  const generateReport = async (date?: string): Promise<ReportData | null> => {
    setLoading(true);
    try {
      const reportDate = date || reportData.date;
      const startOfDay = new Date(reportDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(reportDate);
      endOfDay.setHours(23, 59, 59, 999);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Session expired");
        return null;
      }

      type TransactionWithItems =
        Database["public"]["Tables"]["transactions"]["Row"] & {
          items: Database["public"]["Tables"]["transaction_items"]["Row"][];
        };

      const { data: dayTransactions, error } = await supabase
        .from("transactions")
        .select("*, items:transaction_items(*)")
        .eq("cashier_id", session.user.id)
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .eq("payment_status", "paid");

      if (error) throw error;

      const transactions = (dayTransactions || []) as TransactionWithItems[];
      const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
      const totalItems = transactions.reduce(
        (sum, t) => sum + (t.items?.length || 0),
        0,
      );

      const newReportData = {
        totalSales,
        totalTransactions: transactions.length,
        totalItems,
        date: reportDate,
      };

      setReportData(newReportData);
      return newReportData;
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateReportDate = (date: string) => {
    setReportData(prev => ({ ...prev, date }));
    generateReport(date);
  };

  return { reportData, loading, generateReport, updateReportDate };
}
