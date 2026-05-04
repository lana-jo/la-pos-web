"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";
import { useTheme } from "next-themes";
import { ChartData } from "@/types/dashboard";
import { getPresetLabel } from "@/lib/dashboard/dateUtils";

interface TopProductsChartProps {
  data: ChartData["topProducts"];
  preset: string;
  formatCurrency: (amount: number) => string;
}

export const TopProductsChart = ({ data, preset, formatCurrency }: TopProductsChartProps) => {
  const { theme } = useTheme();

  const getThemeColors = () => {
    const isDark = theme === "dark";
    return {
      products: isDark ? "hsl(var(--chart-3))" : "hsl(var(--chart-3))",
    };
  };

  const getTooltipTheme = () => {
    const isDark = theme === "dark";
    return {
      contentStyle: {
        backgroundColor: isDark ? "hsl(var(--background))" : "#fff",
        border: `1px solid ${isDark ? "hsl(var(--border))" : "#e5e7eb"}`,
        borderRadius: "6px",
        color: isDark ? "hsl(var(--foreground))" : "#111827",
      },
      labelStyle: {
        color: isDark ? "hsl(var(--muted-foreground))" : "#6b7280",
      },
    };
  };

  const getAxisTheme = () => {
    const isDark = theme === "dark";
    return {
      tick: { fill: isDark ? "hsl(var(--muted-foreground))" : "#6b7280" },
      line: { stroke: isDark ? "hsl(var(--border))" : "#e5e7eb" },
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-purple-600" />
          Top Products by Revenue ({getPresetLabel(preset as any)})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme === "dark" ? "hsl(var(--border))" : "#e5e7eb"}
            />
            <XAxis
              dataKey="name"
              tick={{
                fontSize: 12,
                fill:
                  theme === "dark"
                    ? "hsl(var(--muted-foreground))"
                    : "#6b7280",
              }}
              angle={-45}
              textAnchor="end"
              height={80}
              stroke={theme === "dark" ? "hsl(var(--border))" : "#e5e7eb"}
            />
            <YAxis
              tickFormatter={(value) =>
                `Rp${(value / 1000000).toFixed(1)}`
              }
              {...getAxisTheme()}
            />
            <Tooltip
              formatter={(value) => [
                formatCurrency(Number(value)),
                "Revenue",
              ]}
              labelFormatter={(label) => `Product: ${label}`}
              {...getTooltipTheme()}
            />
            <Bar dataKey="revenue" fill={getThemeColors().products} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
