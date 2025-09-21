import type { Metadata } from "next"
import { Poppins } from 'next/font/google'
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins'
})

export const metadata: Metadata = {
  title: "Inventory & Billing Management System",
  description: "Modern business management solution with advanced inventory and billing features",
  generator: 'v0.dev',
  keywords: ["inventory", "billing", "business", "management", "POS", "modern"],
  authors: [{ name: "Your Company" }],
  viewport: "width=device-width, initial-scale=1",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} font-poppins antialiased`}>
        <ThemeProvider
          enableSystem={true}
          defaultTheme="system"
          storageKey="inventory-billing-theme"
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
