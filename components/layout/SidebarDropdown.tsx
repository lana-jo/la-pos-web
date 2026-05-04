'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useRouter, usePathname } from 'next/navigation'
import { LucideIcon, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useThemeClass } from '@/hooks/useTheme'

interface SidebarDropdownItem {
  href: string
  label: string
  description?: string
}

interface SidebarDropdownProps {
  label: string
  icon: LucideIcon
  items: SidebarDropdownItem[]
  isCollapsed?: boolean
  className?: string
}

export function SidebarDropdown({
  label,
  icon: Icon,
  items,
  isCollapsed = false,
  className
}: SidebarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const isAnyItemActive = items.some(item => pathname === item.href)
  
  // Theme class hooks for SSR-safe styling
  const triggerHoverThemeClass = useThemeClass(
    'hover:bg-gradient-to-r hover:from-blue-900/30 hover:to-indigo-900/30 hover:text-white',
    'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-slate-900'
  )
  const triggerFocusThemeClass = useThemeClass(
    'focus-visible:ring-offset-slate-900',
    'focus-visible:ring-offset-white'
  )
  const triggerTextThemeClass = useThemeClass('text-slate-300', 'text-slate-700')
  const iconThemeClass = useThemeClass(
    'text-slate-400 group-hover:text-blue-400',
    'text-slate-500 group-hover:text-blue-600'
  )
  const itemHoverThemeClass = useThemeClass(
    'hover:bg-gradient-to-r hover:from-blue-900/20 hover:to-indigo-900/20 hover:text-slate-200',
    'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-slate-800'
  )
  const itemFocusThemeClass = useThemeClass(
    'focus-visible:ring-offset-slate-900',
    'focus-visible:ring-offset-white'
  )
  const itemTextThemeClass = useThemeClass('text-slate-400', 'text-slate-600')
  const descriptionThemeClass = useThemeClass('text-slate-400', 'text-slate-500')

  const toggleDropdown = () => {
    if (!isCollapsed) {
      setIsOpen(!isOpen)
    }
  }

  const handleItemClick = (href: string) => {
    router.push(href)
    if (isCollapsed) {
      setIsOpen(true)
    }
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Dropdown trigger */}
      <Button
        variant="ghost"
        onClick={toggleDropdown}
        className={cn(
          'w-full justify-start text-sm font-medium rounded-xl transition-all duration-200',
          triggerHoverThemeClass,
          'hover:shadow-sm hover:scale-[1.02]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          triggerFocusThemeClass,
          isAnyItemActive
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02]'
            : triggerTextThemeClass,
          isCollapsed && 'px-3'
        )}
      >
        <div className="relative">
          <Icon className={cn(
            'h-5 w-5 flex-shrink-0 transition-colors duration-200',
            isAnyItemActive 
              ? 'text-white drop-shadow-sm' 
              : iconThemeClass
          )} />
          {isAnyItemActive && (
            <div className="absolute -inset-1 bg-white/20 rounded-full blur-sm"></div>
          )}
        </div>
        
        {!isCollapsed && (
          <>
            <span className="ml-3 truncate font-semibold">{label}</span>
            <div className="ml-auto">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 transition-transform duration-200" />
              ) : (
                <ChevronRight className="h-4 w-4 transition-transform duration-200" />
              )}
            </div>
          </>
        )}
      </Button>

      {/* Dropdown items */}
      {isOpen && !isCollapsed && (
        <div className="mt-1 space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href
            return (
              <Button
                key={item.href}
                variant="ghost"
                onClick={() => handleItemClick(item.href)}
                className={cn(
                  'w-full justify-start text-sm font-medium rounded-lg transition-all duration-200',
                  itemHoverThemeClass,
                  'hover:shadow-sm hover:scale-[1.01]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                  itemFocusThemeClass,
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/20 scale-[1.02]'
                    : itemTextThemeClass,
                  'pl-12 pr-4 py-2'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{item.label}</div>
                  {item.description && (
                    <div className={cn(
                      'text-xs truncate mt-0.5 transition-colors duration-200',
                      descriptionThemeClass
                    )}>
                      {item.description}
                    </div>
                  )}
                </div>
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
