import { ReactNode } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

export const dynamic = "force-dynamic";

export default function AdminDashboardLayout({
  children
}: {
  children: ReactNode
}) {
  return (
    <DashboardLayout
      title="Admin Dashboard"
      subtitle="Management Console"
      userRole="admin"
      badgeText="Administrator"
      showSidebar={true}
    >
      {children}
    </DashboardLayout>
  )
}