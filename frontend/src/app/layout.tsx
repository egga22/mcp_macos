import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI macOS Control',
  description: 'AI-powered macOS control via chat interface',
  keywords: ['AI', 'macOS', 'automation', 'chat', 'control'],
  authors: [{ name: 'AI macOS Control Team' }],
  icons: {
    icon: '/favicon.svg',
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' }
  ]
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // Prevent flash of wrong theme
                const theme = localStorage.getItem('theme-storage') ? 
                  JSON.parse(localStorage.getItem('theme-storage')).state.theme : 'system';
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const isDark = theme === 'dark' || (theme === 'system' && systemDark);
                document.documentElement.classList.add(isDark ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
              } catch (e) {
                console.warn('Theme initialization failed:', e);
              }
            `
          }}
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
} 