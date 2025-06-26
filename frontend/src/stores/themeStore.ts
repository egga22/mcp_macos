import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  initTheme: () => void
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

const getResolvedTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return getSystemTheme()
  }
  return theme
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',
      
      setTheme: (theme: Theme) => {
        const resolvedTheme = getResolvedTheme(theme)
        
        // Update document class
        if (typeof window !== 'undefined') {
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(resolvedTheme)
          document.documentElement.setAttribute('data-theme', resolvedTheme)
        }
        
        set({ theme, resolvedTheme })
      },
      
      toggleTheme: () => {
        const { theme, resolvedTheme } = get()
        if (theme === 'system') {
          // If currently system, switch to opposite of current resolved theme
          get().setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
        } else {
          // Toggle between light and dark
          get().setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
        }
      },
      
      initTheme: () => {
        const { theme } = get()
        const resolvedTheme = getResolvedTheme(theme)
        
        // Apply theme immediately
        if (typeof window !== 'undefined') {
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(resolvedTheme)
          document.documentElement.setAttribute('data-theme', resolvedTheme)
          
          // Listen for system theme changes
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
          const handleChange = () => {
            if (get().theme === 'system') {
              get().setTheme('system') // This will re-evaluate the resolved theme
            }
          }
          
          mediaQuery.addEventListener('change', handleChange)
          
          // Cleanup function would be called when component unmounts
          return () => mediaQuery.removeEventListener('change', handleChange)
        }
        
        set({ resolvedTheme })
      }
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ theme: state.theme })
    }
  )
) 