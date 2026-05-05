"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  Tag,
  Database,
  Users,
  UserCheck,
  Shield,
  Settings,
  Activity,
  Store,
  PieChart,
  CreditCard,
  Receipt,
  FileText,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface MenuItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  title: string;
  description: string;
  disabled?: boolean;
}

interface MenuSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  items: MenuItem[];
}

const MenuCard = ({ href, icon: Icon, color, title, description, disabled }: MenuItem) => {
  const content = (
    <div className={`p-4 rounded-lg border ${disabled ? 'opacity-50' : 'hover:bg-muted/50 transition-colors cursor-pointer'}`}>
      <Icon className={`h-6 w-6 ${disabled ? 'text-gray-400' : color} mb-2`} />
      <h4 className="font-medium">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );

  return disabled ? (
    <div>{content}</div>
  ) : (
    <Link href={href}>{content}</Link>
  );
};

export const MenuSection = ({ title, icon: Icon, iconColor, items }: MenuSectionProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <MenuCard key={item.title} {...item} />
        ))}
      </div>
    </CardContent>
  </Card>
);

export const MenuNavigation = () => (
  <div className="space-y-6 mb-8">
    <div className="flex items-center gap-2 mb-4">
      <Settings className="h-5 w-5 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Menu Overview</h2>
    </div>

    {/* Product Management */}
    <MenuSection
      title="Product Management"
      icon={Package}
      iconColor="text-blue-600"
      items={[
        {
          href: "/dashboard/products",
          icon: Package,
          color: "text-blue-600",
          title: "Products",
          description: "Add, edit, and manage product inventory",
        },
        {
          href: "/dashboard/categories",
          icon: Tag,
          color: "text-green-600",
          title: "Categories",
          description: "Organize products by categories",
        },
        {
          href: "/dashboard/stock",
          icon: Database,
          color: "text-indigo-600",
          title: "Stock Management",
          description: "Track inventory levels",
        },
      ]}
    />

    {/* User Management */}
    <MenuSection
      title="User Management"
      icon={Users}
      iconColor="text-purple-600"
      items={[
        {
          href: "/dashboard/users",
          icon: UserCheck,
          color: "text-purple-600",
          title: "All Users",
          description: "Manage admin, cashier, and customer accounts",
        },
        {
          href: "/dashboard/cashiers",
          icon: Shield,
          color: "text-orange-600",
          title: "Cashiers",
          description: "Manage cashier permissions and PINs",
        },
        {
          href: "#",
          icon: Settings,
          color: "text-gray-400",
          title: "Roles & Permissions",
          description: "Configure user roles (Coming Soon)",
          disabled: true,
        },
      ]}
    />

    {/* Operations */}
    <MenuSection
      title="Operations"
      icon={Activity}
      iconColor="text-orange-600"
      items={[
        {
          href: "/pos",
          icon: Store,
          color: "text-red-600",
          title: "POS Terminal",
          description: "Open point of sale system",
        },
        {
          href: "/dashboard/reports",
          icon: PieChart,
          color: "text-indigo-600",
          title: "Reports",
          description: "Sales analytics and insights",
        },
        {
          href: "#",
          icon: CreditCard,
          color: "text-gray-400",
          title: "Transactions",
          description: "View all transactions (Coming Soon)",
          disabled: true,
        },
        {
          href: "#",
          icon: Receipt,
          color: "text-gray-400",
          title: "Receipt Settings",
          description: "Configure receipt templates (Coming Soon)",
          disabled: true,
        },
      ]}
    />

    {/* System Settings */}
    <MenuSection
      title="System Settings"
      icon={Settings}
      iconColor="text-gray-600"
      items={[
        {
          href: "#",
          icon: FileText,
          color: "text-gray-400",
          title: "System Logs",
          description: "View system activity logs (Coming Soon)",
          disabled: true,
        },
        {
          href: "#",
          icon: AlertCircle,
          color: "text-gray-400",
          title: "Backup & Restore",
          description: "Data backup management (Coming Soon)",
          disabled: true,
        },
        {
          href: "#",
          icon: CheckCircle,
          color: "text-gray-400",
          title: "System Health",
          description: "Monitor system status (Coming Soon)",
          disabled: true,
        },
      ]}
    />
  </div>
);
