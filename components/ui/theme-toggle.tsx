'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useProfileTheme } from '@/hooks/useProfileTheme'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { theme, setTheme, mounted, isSynced } = useProfileTheme()

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled>
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Memuat tema</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="pos-focus-visible">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Ubah tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="pos-modal-content">
        <DropdownMenuItem
          onSelect={() => {
            setTheme('light');
            toast.success('Tema diubah ke Terang');
          }}
          className={theme === 'light' ? 'bg-primary/10 text-primary' : ''}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Terang</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            setTheme('dark');
            toast.success('Tema diubah ke Gelap');
          }}
          className={theme === 'dark' ? 'bg-primary/10 text-primary' : ''}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Gelap</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            setTheme('system');
            toast.success('Tema diubah ke Sistem');
          }}
          className={theme === 'system' ? 'bg-primary/10 text-primary' : ''}
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>Sistem</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
