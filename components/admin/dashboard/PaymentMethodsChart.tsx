"use client";

import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { useTheme } from "next-themes";
import { ChartData } from "@/types/dashboard";
import { getPresetLabel } from "@/lib/dashboard/dateUtils";

interface PaymentMethodsChartProps {
  data: ChartData["paymentMethods"];
  preset: string;
}

export const PaymentMethodsChart = ({ data, preset }: PaymentMethodsChartProps) => {
  const { theme } = useTheme();

  const getThemeColors = () => {
    const isDark = theme === "dark";
    return [
      isDark ? "hsl(var(--chart-1))" : "hsl(var(--chart-1))",
      isDark ? "hsl(var(--chart-2))" : "hsl(var(--chart-2))",
      isDark ? "hsl(var(--chart-3))" : "hsl(var(--chart-3))",
      isDark ? "hsl(var(--chart-4))" : "hsl(var(--chart-4))",
      isDark ? "hsl(var(--chart-5))" : "hsl(var(--chart-5))",
    ];
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

  const colors = getThemeColors();

  return (
    <Card className="pos-modal-content border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary-brand" />
          Distribusi Metode Pembayaran ({getPresetLabel(preset as any)})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              nameKey="method"
              labelLine={false}
              label={(entry) =>
                `${entry.name}: ${entry.payload.percentage}%`
              }
              outerRadius={80}
              dataKey="count"
              animationDuration={1000}
              animationBegin={0}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [Number(value), "Transaksi"]}
              contentStyle={{
                ...getTooltipTheme().contentStyle,
                fontSize: 12,
              }}
              labelStyle={getTooltipTheme().labelStyle}
            />
          </RePieChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
