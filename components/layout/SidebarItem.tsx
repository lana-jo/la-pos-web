'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { useThemeClass } from '@/hooks/useTheme'

interface SidebarItemProps {
  href: string
  label: string
  icon: LucideIcon
  isCollapsed?: boolean
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  description?: string
  disabled?: boolean
  onClick?: () => void
}

export function SidebarItem({
  href,
  label,
  icon: Icon,
  isCollapsed = false,
  badge,
  badgeVariant = 'default',
  description,
  disabled = false,
  onClick
}: SidebarItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href
  
  // Theme class hooks for SSR-safe styling
  const iconThemeClass = useThemeClass(
    'text-slate-600 group-hover:text-blue-700 group-hover:scale-110',
    'text-slate-400 group-hover:text-blue-300 group-hover:scale-110',
  )
  const descriptionThemeClass = useThemeClass(
    'text-slate-500 group-hover:text-blue-600/70',
    'text-slate-500 group-hover:text-blue-400/70',
  )
  const disabledThemeClass = useThemeClass(
    'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-500',
    'bg-gradient-to-r from-slate-800 to-slate-700 text-slate-500',
  )
  const hoverThemeClass = useThemeClass(
    'hover:bg-gradient-to-r hover:from-blue-100 hover:to-blue-200 hover:text-slate-800 hover:shadow-md',
    'hover:bg-gradient-to-r hover:from-blue-800 hover:to-blue-900 hover:text-white hover:shadow-md',
  )
  const focusThemeClass = useThemeClass(
    'focus-visible:ring-offset-white',
    'focus-visible:ring-offset-slate-900',
  )
  const textThemeClass = useThemeClass(
    'text-slate-700',
    'text-slate-300',
  )

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault()
      onClick?.()
    }
  }

  const linkContent = (
    <>
      <div className="relative">
        <Icon className={cn(
          'h-5 w-5 flex-shrink-0 transition-all duration-300',
          isActive 
            ? 'text-white scale-110 drop-shadow-sm' 
            : iconThemeClass
        )} />
              </div>
      {!isCollapsed && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="truncate font-semibold">{label}</span>
            {badge && (
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ml-2 flex-shrink-0',
                  badgeVariant === 'default' && 'bg-white/20 text-white border border-white/30',
                  badgeVariant === 'secondary' && 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
                  badgeVariant === 'destructive' && 'bg-red-500 text-white',
                  badgeVariant === 'outline' && 'border border-current text-current'
                )}
              >
                {badge}
              </span>
            )}
          </div>
          {description && (
            <div className={cn(
              'text-xs truncate mt-1 font-medium transition-colors duration-300',
              isActive 
                ? 'text-white/90' 
                : descriptionThemeClass
            )}>
              {description}
            </div>
          )}
        </div>
      )}
      {isCollapsed && badge && (
        <div className="absolute -right-1 -top-1 h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
      )}
    </>
  )

  if (disabled) {
    return (
      <div
        onClick={handleClick}
        className={cn(
          'group flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 cursor-not-allowed opacity-60',
          disabledThemeClass
        )}
      >
        {linkContent}
      </div>
    )
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        'group flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 ease-out',
        hoverThemeClass,
        'hover:scale-[1.02] hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        focusThemeClass,
        isActive
          ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-[1.02] -translate-y-0.5'
          : textThemeClass
      )}
    >
      {linkContent}
    </Link>
  )
}
