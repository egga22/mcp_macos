'use client'

import { useThemeStore } from '@/stores/themeStore'
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

interface ThemeToggleProps {
  variant?: 'dropdown' | 'button'
  showLabel?: boolean
}

export default function ThemeToggle({ variant = 'button', showLabel = false }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme, initTheme } = useThemeStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    initTheme()
  }, [initTheme])

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="w-10 h-10 bg-background-tertiary animate-pulse rounded-md"></div>
    )
  }

  const themes = [
    { value: 'light', label: 'Light', icon: SunIcon },
    { value: 'dark', label: 'Dark', icon: MoonIcon },
    { value: 'system', label: 'System', icon: ComputerDesktopIcon }
  ] as const

  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as any)}
          className="input pr-10 appearance-none cursor-pointer"
        >
          {themes.map((themeOption) => (
            <option key={themeOption.value} value={themeOption.value}>
              {themeOption.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {(() => {
            const currentTheme = themes.find(t => t.value === theme)
            if (currentTheme) {
              const Icon = currentTheme.icon
              return <Icon className="w-4 h-4 text-foreground-secondary" />
            }
            return null
          })()}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Quick toggle button */}
      <button
        onClick={toggleTheme}
        className="btn-secondary p-2 relative overflow-hidden group"
        title={`Switch theme (currently ${theme === 'system' ? `system - ${resolvedTheme}` : theme})`}
      >
        <div className="relative">
          {resolvedTheme === 'light' ? (
            <SunIcon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-45" />
          ) : (
            <MoonIcon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
          )}
          
          {/* Theme indicator dot */}
          {theme === 'system' && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse"></div>
          )}
        </div>
      </button>

      {/* Theme selector for more options */}
      <div className="flex bg-background-tertiary rounded-lg p-1">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon
          const isActive = theme === themeOption.value
          
          return (
            <button
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value)}
              className={`
                p-2 rounded-md transition-all duration-200 relative
                ${isActive 
                  ? 'bg-background-elevated text-foreground shadow-sm' 
                  : 'text-foreground-secondary hover:text-foreground hover:bg-background-secondary'
                }
              `}
              title={`${themeOption.label} theme${themeOption.value === 'system' ? ` (currently ${resolvedTheme})` : ''}`}
            >
              <Icon className="w-4 h-4" />
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute inset-0 bg-primary/10 rounded-md animate-fade-in"></div>
              )}
              
              {showLabel && (
                <span className="text-xs ml-2">{themeOption.label}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
} 