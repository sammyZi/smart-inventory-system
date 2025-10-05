'use client'

import React from 'react'
import { useAuth } from '../auth-provider'
import { RoleBasedSidebar } from '../role-based/RoleBasedSidebar'
import { MobileRoleBasedNavigation } from '../role-based/RoleBasedNavigation'
import { UserRole } from '../../lib/permissions'
import { Button } from '../ui/button'
import { Menu, Bell, Search } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet'
import { Input } from '../ui/input'

interface RoleBasedLayoutProps {
  children: React.ReactNode
  title?: string
  showSearch?: boolean
  showNotifications?: boolean
}

export function RoleBasedLayout({ 
  children, 
  title, 
  showSearch = true, 
  showNotifications = true 
}: RoleBasedLayoutProps) {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  const userRole = user.role as UserRole

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Layout */}
      <div className="hidden md:flex h-screen">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <RoleBasedSidebar />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-6">
              <div className="flex-1">
                {title && (
                  <h1 className="text-lg font-semibold">{title}</h1>
                )}
              </div>

              <div className="flex items-center gap-4">
                {/* Search */}
                {showSearch && (
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      className="pl-8 w-64"
                    />
                  </div>
                )}

                {/* Notifications */}
                {showNotifications && (
                  <Button variant="ghost" size="icon">
                    <Bell className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Mobile Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <RoleBasedSidebar />
              </SheetContent>
            </Sheet>

            <div className="flex-1 px-4">
              {title && (
                <h1 className="text-lg font-semibold truncate">{title}</h1>
              )}
            </div>

            {showNotifications && (
              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
            )}
          </div>
        </header>

        {/* Mobile Content */}
        <main className="pb-16">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background">
          <MobileRoleBasedNavigation />
        </div>
      </div>
    </div>
  )
}

// Role-specific layout variants
export function AdminLayout({ children, title }: { children: React.ReactNode, title?: string }) {
  return (
    <RoleBasedLayout title={title || "Admin Dashboard"}>
      {children}
    </RoleBasedLayout>
  )
}

export function ManagerLayout({ children, title }: { children: React.ReactNode, title?: string }) {
  return (
    <RoleBasedLayout title={title || "Manager Dashboard"}>
      {children}
    </RoleBasedLayout>
  )
}

export function StaffLayout({ children, title }: { children: React.ReactNode, title?: string }) {
  return (
    <RoleBasedLayout 
      title={title || "Point of Sale"} 
      showSearch={false}
      showNotifications={false}
    >
      {children}
    </RoleBasedLayout>
  )
}

export function CustomerLayout({ children, title }: { children: React.ReactNode, title?: string }) {
  return (
    <RoleBasedLayout 
      title={title || "Shop"} 
      showNotifications={false}
    >
      {children}
    </RoleBasedLayout>
  )
}