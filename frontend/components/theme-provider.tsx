'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

interface ExtendedThemeProviderProps extends ThemeProviderProps {
  enableSystem?: boolean
  defaultTheme?: string
  storageKey?: string
}

export function ThemeProvider({ 
  children, 
  enableSystem = true,
  defaultTheme = "system",
  storageKey = "inventory-billing-theme",
  ...props 
}: ExtendedThemeProviderProps) {
  return (
    <NextThemesProvider 
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      storageKey={storageKey}
      disableTransitionOnChange={false}
      {...props}
    >
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        {children}
      </div>
    </NextThemesProvider>
  )
}

// Theme Toggle Hook
export function useTheme() {
  const { theme, setTheme, resolvedTheme } = require('next-themes').useTheme()
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }
  
  return {
    theme,
    setTheme,
    resolvedTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light'
  }
}
