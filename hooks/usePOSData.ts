"use client";

import { useState, useEffect, useMemo, useCallback, startTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Product, ProductVariant, Database, Transaction } from "@/types";

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

  const checkUserRole = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        console.error("Error fetching profile:", profileError);
        router.push("/login");
        return;
      }

      const userProfileData = {
        full_name: (profile as any).full_name || "Unknown User",
        role: (profile as any).role,
      };

      setUserProfile(userProfileData);

      if ((profile as any).role !== "cashier" && (profile as any).role !== "admin") {
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
  }, [router]);

  useEffect(() => {
    const init = async () => {
      await checkUserRole();
    };
    init();
  }, [checkUserRole]);

  return { userProfile, loading, refetch: checkUserRole };
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Optimized query: Fetch products with joined variants in one go
      let query = supabase
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

      // Server-side filtering
      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }

      if (search) {
        // Simple case-insensitive search on product name
        query = query.ilike("name", `%${search}%`);
      }

      const { data: productsData, error: productsError } = await query;

      if (productsError) throw productsError;

      const normalizedProducts = (productsData || []).map((p) => {
        const product = p as any;
        return {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          price: product.price,
          stock: product.stock,
          is_active: product.is_active,
          variants: product.product_variants || [],
          category_id: product.category_id || null,
          unit_id: product.unit_id || null,
          supplier_id: product.supplier_id || null,
          description: product.description || null,
          cost_price: product.cost_price || 0,
          min_stock: product.low_stock_threshold || 0,
          max_stock: product.max_stock || null,
          is_consignment: product.is_consignment || false,
        } as unknown as Product;
      });

      setProducts(normalizedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory]);

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = useCallback(async () => {
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
        .select(`
          *,
          items:transaction_items(*),
          cashier:profiles!transactions_cashier_id_fkey(id, full_name),
          customer:customers(id, name)
        `)
        .eq("cashier_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setTransactions(data || []);
    } catch (error: unknown) {
      const err = error as any;
      console.error("Error fetching transactions details:", {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        fullError: err
      });
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      fetchTransactions();
    });
  }, [fetchTransactions]);

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
