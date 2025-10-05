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
  ClipboardList
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
  ClipboardList
}

interface RoleBasedNavigationProps {
  className?: string
}

export function RoleBasedNavigation({ className }: RoleBasedNavigationProps) {
  const { user } = useAuth()
  const pathname = usePathname()

  if (!user) {
    return null
  }

  const navigation = getNavigationForRole(user.role as UserRole)

  return (
    <nav className={cn("flex flex-col space-y-2", className)}>
      {/* Role Badge */}
      <div className="px-3 py-2">
        <Badge variant="outline" className="w-full justify-center">
          {user.role}
        </Badge>
      </div>

      <Separator />

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

      {/* Secondary Navigation (if exists) */}
      {navigation.secondaryNav.length > 0 && (
        <>
          <Separator />
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
      {user.role === 'ADMIN' && <AdminFeatures />}
      {user.role === 'MANAGER' && <ManagerFeatures />}
      {user.role === 'STAFF' && <StaffFeatures />}
      {user.role === 'CUSTOMER' && <CustomerFeatures />}
    </nav>
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

function AdminFeatures() {
  return (
    <>
      <Separator />
      <div className="space-y-1">
        <div className="px-3 py-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            System Admin
          </h3>
        </div>
        <div className="px-3 space-y-2">
          <div className="text-xs text-muted-foreground">
            • Multi-store management
          </div>
          <div className="text-xs text-muted-foreground">
            • Complete financial access
          </div>
          <div className="text-xs text-muted-foreground">
            • AI & IoT management
          </div>
          <div className="text-xs text-muted-foreground">
            • System configuration
          </div>
        </div>
      </div>
    </>
  )
}

function ManagerFeatures() {
  return (
    <>
      <Separator />
      <div className="space-y-1">
        <div className="px-3 py-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Store Management
          </h3>
        </div>
        <div className="px-3 space-y-2">
          <div className="text-xs text-muted-foreground">
            • Store-specific operations
          </div>
          <div className="text-xs text-muted-foreground">
            • Staff supervision
          </div>
          <div className="text-xs text-muted-foreground">
            • Inventory management
          </div>
          <div className="text-xs text-muted-foreground">
            • Limited financial access
          </div>
        </div>
      </div>
    </>
  )
}

function StaffFeatures() {
  return (
    <>
      <Separator />
      <div className="space-y-1">
        <div className="px-3 py-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            POS Operations
          </h3>
        </div>
        <div className="px-3 space-y-2">
          <div className="text-xs text-muted-foreground">
            • Sales processing only
          </div>
          <div className="text-xs text-muted-foreground">
            • Pre-approved discounts
          </div>
          <div className="text-xs text-muted-foreground">
            • Receipt generation
          </div>
          <div className="text-xs text-muted-foreground">
            • Manager assistance
          </div>
        </div>
        
        <Separator className="my-2" />
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => console.log('Calling manager for assistance')}
        >
          📞 Call Manager
        </Button>
      </div>
    </>
  )
}

function CustomerFeatures() {
  return (
    <>
      <Separator />
      <div className="space-y-1">
        <div className="px-3 py-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Customer Benefits
          </h3>
        </div>
        <div className="px-3 space-y-2">
          <div className="text-xs text-muted-foreground">
            • Product browsing
          </div>
          <div className="text-xs text-muted-foreground">
            • Self-checkout
          </div>
          <div className="text-xs text-muted-foreground">
            • Loyalty rewards
          </div>
          <div className="text-xs text-muted-foreground">
            • Order tracking
          </div>
        </div>
      </div>
    </>
  )
}

// Mobile navigation component
export function MobileRoleBasedNavigation() {
  const { user } = useAuth()
  const pathname = usePathname()

  if (!user) {
    return null
  }

  const navigation = getNavigationForRole(user.role as UserRole)

  return (
    <div className="flex overflow-x-auto space-x-1 p-2 bg-background border-t">
      {navigation.primaryNav.slice(0, 4).map((item) => {
        const Icon = iconMap[item.icon as keyof typeof iconMap] || LayoutDashboard
        const isActive = pathname === item.path
        
        return (
          <Link key={item.path} href={item.path}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "flex-col h-auto py-2 px-3 min-w-[60px]",
                isActive && "bg-secondary"
              )}
            >
              <Icon className="h-4 w-4 mb-1" />
              <span className="text-xs">{item.label}</span>
            </Button>
          </Link>
        )
      })}
      
      {navigation.primaryNav.length > 4 && (
        <Button variant="ghost" size="sm" className="flex-col h-auto py-2 px-3 min-w-[60px]">
          <LayoutDashboard className="h-4 w-4 mb-1" />
          <span className="text-xs">More</span>
        </Button>
      )}
    </div>
  )
}