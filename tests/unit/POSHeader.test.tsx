import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { POSHeader } from '@/components/pos/POSHeader'

describe('POSHeader Component', () => {
  it('renders correctly with default props', () => {
    render(<POSHeader />)
    expect(screen.getByText(/TERMINAL POS/i)).toBeDefined()
    expect(screen.getByText(/Memuat.../i)).toBeDefined()
  })

  it('renders provided user info', () => {
    render(<POSHeader userName="Budi" userRole="Kasir" />)
    expect(screen.getByText(/Budi/i)).toBeDefined()
    expect(screen.getByText(/Kasir/i)).toBeDefined()
  })
})
