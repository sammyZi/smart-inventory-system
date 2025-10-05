'use client'

import React from 'react'
import { useAuth } from '../auth-provider'
import { UserRole, canManageUsers, canManageProducts, canManageInventory, canManageSales, canAccessAnalytics } from '../../lib/permissions'
import { Alert, AlertDescription } from '../ui/alert'
import { Button } from '../ui/button'
import { Shield, AlertTriangle, Lock } from 'lucide-react'

interface RoleGuardProps {
  allowedRoles?: UserRole[]
  requiredPermission?: {
    resource: 'stores' | 'users' | 'products' | 'inventory' | 'sales' | 'analytics'
    action: string
  }
  fallback?: React.ReactNode
  children: React.ReactNode
  showFallback?: boolean
}

export function RoleGuard({ 
  allowedRoles, 
  requiredPermission,
  fallback, 
  children, 
  showFallback = true 
}: RoleGuardProps) {
  const { user } = useAuth()

  // Show loading state if user is undefined (still loading)
  if (user === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // User not authenticated
  if (!user) {
    if (showFallback) {
      return fallback || (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Please log in to access this content.
          </AlertDescription>
        </Alert>
      )
    }
    return null
  }

  const userRole = user.role as UserRole

  // Check role-based access
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    if (showFallback) {
      return fallback || (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Access denied. Required role: {allowedRoles.join(' or ')}. Your role: {userRole}
          </AlertDescription>
        </Alert>
      )
    }
    return null
  }

  // Check permission-based access
  if (requiredPermission) {
    const hasPermission = checkPermission(userRole, requiredPermission.resource, requiredPermission.action)
    
    if (!hasPermission) {
      if (showFallback) {
        return fallback || (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Insufficient permissions. Required: {requiredPermission.resource}.{requiredPermission.action}
            </AlertDescription>
          </Alert>
        )
      }
      return null
    }
  }

  return <>{children}</>
}

// Permission checking helper
function checkPermission(role: UserRole, resource: string, action: string): boolean {
  switch (resource) {
    case 'users':
      return canManageUsers(role, 'STAFF' as UserRole, action as any)
    case 'products':
      return canManageProducts(role, action as any)
    case 'inventory':
      return canManageInventory(role, action as any)
    case 'sales':
      return canManageSales(role, action as any)
    case 'analytics':
      return canAccessAnalytics(role, action as any)
    default:
      return false
  }
}

// Specific role guard components for common use cases
export function AdminOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['ADMIN']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export function ManagerAndAbove({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['ADMIN', 'MANAGER']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export function StaffAndAbove({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'STAFF']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export function CustomerOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['CUSTOMER']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

// Permission-based guards
export function CanCreateProducts({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleGuard 
      requiredPermission={{ resource: 'products', action: 'create' }} 
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  )
}

export function CanDeleteProducts({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleGuard 
      requiredPermission={{ resource: 'products', action: 'delete' }} 
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  )
}

export function CanManageInventory({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleGuard 
      requiredPermission={{ resource: 'inventory', action: 'stockIn' }} 
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  )
}

export function CanProcessRefunds({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleGuard 
      requiredPermission={{ resource: 'sales', action: 'processRefund' }} 
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  )
}

export function CanViewAnalytics({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleGuard 
      requiredPermission={{ resource: 'analytics', action: 'viewDashboard' }} 
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  )
}

// Conditional rendering based on role
interface ConditionalRenderProps {
  role: UserRole
  children: React.ReactNode
}

export function ShowForAdmin({ children }: ConditionalRenderProps) {
  return <RoleGuard allowedRoles={['ADMIN']} showFallback={false}>{children}</RoleGuard>
}

export function ShowForManager({ children }: ConditionalRenderProps) {
  return <RoleGuard allowedRoles={['MANAGER']} showFallback={false}>{children}</RoleGuard>
}

export function ShowForStaff({ children }: ConditionalRenderProps) {
  return <RoleGuard allowedRoles={['STAFF']} showFallback={false}>{children}</RoleGuard>
}

export function ShowForCustomer({ children }: ConditionalRenderProps) {
  return <RoleGuard allowedRoles={['CUSTOMER']} showFallback={false}>{children}</RoleGuard>
}

// Hide for specific roles
export function HideForStaff({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'CUSTOMER']} showFallback={false}>{children}</RoleGuard>
}

export function HideForCustomer({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'STAFF']} showFallback={false}>{children}</RoleGuard>
}

// Role-based button component
interface RoleBasedButtonProps {
  allowedRoles?: UserRole[]
  requiredPermission?: {
    resource: 'stores' | 'users' | 'products' | 'inventory' | 'sales' | 'analytics'
    action: string
  }
  children: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  disabled?: boolean
}

export function RoleBasedButton({ 
  allowedRoles, 
  requiredPermission, 
  children, 
  onClick,
  variant = 'default',
  size = 'default',
  className,
  disabled = false
}: RoleBasedButtonProps) {
  return (
    <RoleGuard 
      allowedRoles={allowedRoles} 
      requiredPermission={requiredPermission}
      showFallback={false}
    >
      <Button 
        variant={variant}
        size={size}
        className={className}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </Button>
    </RoleGuard>
  )
}

// Usage examples in comments:
/*
// Basic role guard
<RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
  <AdminPanel />
</RoleGuard>

// Permission-based guard
<RoleGuard requiredPermission={{ resource: 'products', action: 'delete' }}>
  <DeleteButton />
</RoleGuard>

// Specific role components
<AdminOnly>
  <SystemSettings />
</AdminOnly>

<ManagerAndAbove>
  <InventoryManagement />
</ManagerAndAbove>

// Conditional rendering
<ShowForAdmin>
  <AdminFeatures />
</ShowForAdmin>

<HideForStaff>
  <FinancialData />
</HideForStaff>

// Role-based button
<RoleBasedButton 
  allowedRoles={['ADMIN']} 
  onClick={deleteStore}
  variant="destructive"
>
  Delete Store
</RoleBasedButton>
*/