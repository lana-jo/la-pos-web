'use client'

import { ReactNode } from 'react'
import { SidebarProvider } from './SidebarProvider'
import { Sidebar } from './Sidebar'
import DashboardHeader from './DashboardHeader'

interface DashboardLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
  userRole?: 'admin' | 'cashier' | 'customer'
  badgeText?: string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  showLogout?: boolean
  showSidebar?: boolean
}

export function DashboardLayout({
  children,
  title,
  subtitle,
  userRole = 'admin',
  badgeText,
  badgeVariant,
  showLogout = true,
  showSidebar = true
}: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultCollapsed={false}>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        {showSidebar && <Sidebar userRole={userRole} />}
        
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header - only show when sidebar is disabled */}
          {!showSidebar && (
            <DashboardHeader
              title={title}
              subtitle={subtitle}
              badgeText={badgeText}
              badgeVariant={badgeVariant}
              showLogout={showLogout}
            />
          )}
          
          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 page-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
