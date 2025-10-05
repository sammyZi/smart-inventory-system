'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../auth-provider'
import { UserRole, getNavigationForRole } from '../../lib/permissions'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { ScrollArea } from '../ui/scroll-area'
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  Package, 
  BarChart3, 
  Settings,
  ShoppingCart,
  Calculator,
  Search,
  User,
  Brain,
  Wifi,
  Link as LinkIcon,
  Truck,
  Star,
  HelpCircle,
  ShoppingBag,
  FileText,
  ClipboardList,
  Building2,
  LogOut
} from 'lucide-react'

const iconMap = {
  LayoutDashboard,
  Store,
  Users,
  Package,
  BarChart3,
  Settings,
  ShoppingCart,
  Calculator,
  Search,
  User,
  Brain,
  Wifi,
  Link: LinkIcon,
  Truck,
  Star,
  HelpCircle,
  ShoppingBag,
  FileText,
  ClipboardList,
  Building2
}

interface RoleBasedSidebarProps {
  className?: string
}

export function RoleBasedSidebar({ className }: RoleBasedSidebarProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  if (!user) {
    return null
  }

  const navigation = getNavigationForRole(user.role as UserRole)

  return (
    <div className={cn("flex flex-col h-full bg-background border-r", className)}>
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-6 w-6" />
          <span className="font-semibold">Smart Inventory</span>
        </div>
        
        {/* User Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="w-full justify-center">
            {user.role}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-4">
          {/* Primary Navigation */}
          <div className="space-y-1">
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Main Menu
              </h3>
            </div>
            {navigation.primaryNav.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap] || LayoutDashboard
              const isActive = pathname === item.path
              
              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      isActive && "bg-secondary"
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </div>

          {/* Secondary Navigation */}
          {navigation.secondaryNav.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-1">
                <div className="px-3 py-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {getSecondaryNavTitle(user.role as UserRole)}
                  </h3>
                </div>
                {navigation.secondaryNav.map((item) => {
                  const Icon = iconMap[item.icon as keyof typeof iconMap] || Package
                  const isActive = pathname === item.path
                  
                  return (
                    <Link key={item.path} href={item.path}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start",
                          isActive && "bg-secondary"
                        )}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Button>
                    </Link>
                  )
                })}
              </div>
            </>
          )}

          {/* Role-specific features */}
          <Separator className="my-4" />
          <div className="space-y-1">
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Actions
              </h3>
            </div>
            {navigation.quickActions.slice(0, 3).map((action, index) => {
              const Icon = iconMap[action.icon as keyof typeof iconMap] || Package
              
              return (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleQuickAction(action.action)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {action.label}
                </Button>
              )
            })}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}

function getSecondaryNavTitle(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Advanced Features'
    case 'MANAGER':
      return 'Management Tools'
    case 'STAFF':
      return 'Tools'
    case 'CUSTOMER':
      return 'Services'
    default:
      return 'More'
  }
}

function handleQuickAction(action: string) {
  switch (action) {
    case 'createStore':
      console.log('Opening create store dialog')
      break
    case 'createManager':
      console.log('Opening create manager dialog')
      break
    case 'backup':
      console.log('Initiating system backup')
      break
    case 'createStaff':
      console.log('Opening create staff dialog')
      break
    case 'stockCount':
      console.log('Starting stock count')
      break
    case 'dailyReport':
      console.log('Generating daily report')
      break
    case 'newSale':
      console.log('Starting new sale')
      break
    case 'callManager':
      console.log('Calling manager for assistance')
      break
    case 'scanProduct':
      console.log('Opening barcode scanner')
      break
    case 'findStore':
      console.log('Opening store locator')
      break
    default:
      console.log('Unknown action:', action)
  }
}