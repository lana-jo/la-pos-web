import React, { useState, forwardRef } from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface InteractiveButtonProps extends ButtonProps {
  children: React.ReactNode
}

const InteractiveButton = forwardRef<HTMLButtonElement, InteractiveButtonProps>(
  ({ className, children, disabled, ...props }, ref) => {
    const [isPressed, setIsPressed] = useState(false)
    const [isKeyDown, setIsKeyDown] = useState(false)

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled) {
        setIsPressed(true)
        props.onMouseDown?.(e)
      }
    }

    const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled) {
        setIsPressed(false)
        props.onMouseUp?.(e)
      }
    }

    const handleMouseLeave = () => {
      setIsPressed(false)
      setIsKeyDown(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
        setIsKeyDown(true)
        if (e.key === ' ') {
          e.preventDefault()
        }
        props.onKeyDown?.(e)
      }
    }

    const handleKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
        setIsKeyDown(false)
        setIsPressed(false)
        props.onKeyUp?.(e)
        if (e.key === ' ') {
          e.preventDefault()
          // Trigger click on space key up
          const button = e.currentTarget as HTMLButtonElement
          button.click()
        }
      }
    }

    // Define color classes based on state
    const getStateClasses = () => {
      if (disabled) {
        return 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
      }

      if (isPressed) {
        // Press state - darkest
        return 'bg-blue-700 hover:bg-blue-700 text-white border-blue-800 shadow-inner transform scale-95'
      }

      if (isKeyDown) {
        // Keydown state - medium dark
        return 'bg-blue-600 hover:bg-blue-600 text-white border-blue-700 shadow-md'
      }

      // Default/Idle state - lightest
      return 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500 shadow-sm hover:shadow-md transform transition-all duration-150'
    }

    return (
      <Button
        ref={ref}
        className={cn(
          // Base styling
          'relative font-medium py-2 px-4 rounded-lg border-2',
          'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2',
          'transition-all duration-150 ease-in-out',
          'select-none',
          
          // State-based styling
          getStateClasses(),
          
          className
        )}
        disabled={disabled}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        {...props}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
        
        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-transparent to-white opacity-0 hover:opacity-10 transition-opacity duration-150 pointer-events-none" />
      </Button>
    )
  }
)

InteractiveButton.displayName = 'InteractiveButton'

export { InteractiveButton, type InteractiveButtonProps }
