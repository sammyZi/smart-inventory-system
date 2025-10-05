"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export type UserRole = "ADMIN" | "MANAGER" | "STAFF" | "CUSTOMER"

// Role hierarchy and permissions
export const ROLE_HIERARCHY = {
  ADMIN: 4,    // Business Owner/Top Manager - Complete Access
  MANAGER: 3,  // Store Manager/Department Head - Store Operations
  STAFF: 2,    // Cashier/Sales Person - POS Only
  CUSTOMER: 1  // End User - Browse & Purchase
}

export const PERMISSIONS = {
  // Store Management
  CREATE_STORE: ["ADMIN"],
  EDIT_STORE: ["ADMIN", "MANAGER"], // Manager can edit own store only
  DELETE_STORE: ["ADMIN"],
  VIEW_ALL_STORES: ["ADMIN"],
  VIEW_OWN_STORE: ["ADMIN", "MANAGER"],
  
  // User Management
  ADD_ADMIN: ["ADMIN"],
  ADD_MANAGER: ["ADMIN"],
  ADD_STAFF: ["ADMIN", "MANAGER"],
  REMOVE_STAFF: ["ADMIN", "MANAGER"],
  VIEW_ALL_USERS: ["ADMIN"],
  VIEW_OWN_STAFF: ["ADMIN", "MANAGER"],
  
  // Product Management
  ADD_PRODUCT: ["ADMIN", "MANAGER"],
  EDIT_PRODUCT: ["ADMIN", "MANAGER"],
  DELETE_PRODUCT: ["ADMIN"], // Only admin can permanently delete
  VIEW_PRODUCTS: ["ADMIN", "MANAGER", "STAFF", "CUSTOMER"],
  SET_MASTER_PRICE: ["ADMIN"],
  REQUEST_PRICE_CHANGE: ["MANAGER"],
  BULK_IMPORT: ["ADMIN"],
  
  // Inventory Management
  STOCK_IN: ["ADMIN", "MANAGER"],
  STOCK_OUT: ["ADMIN", "MANAGER"],
  STOCK_ADJUSTMENT: ["ADMIN", "MANAGER"],
  STOCK_TRANSFER: ["ADMIN"],
  REQUEST_TRANSFER: ["MANAGER"],
  PHYSICAL_COUNT: ["ADMIN", "MANAGER"],
  VIEW_STOCK_LEVELS: ["ADMIN", "MANAGER"],
  VIEW_AVAILABILITY: ["ADMIN", "MANAGER", "STAFF", "CUSTOMER"],
  
  // Sales & Billing
  PROCESS_SALE: ["ADMIN", "MANAGER", "STAFF"],
  APPLY_DISCOUNT: ["ADMIN", "MANAGER", "STAFF"], // Staff: pre-approved only
  CUSTOM_DISCOUNT: ["ADMIN", "MANAGER"], // Manager: limited %
  PROCESS_REFUND: ["ADMIN", "MANAGER"],
  CANCEL_INVOICE: ["ADMIN", "MANAGER"],
  VIEW_ALL_SALES: ["ADMIN"],
  VIEW_STORE_SALES: ["ADMIN", "MANAGER"],
  VIEW_OWN_SALES: ["ADMIN", "MANAGER", "STAFF"],
  
  // Reports & Analytics
  VIEW_ALL_REPORTS: ["ADMIN"],
  VIEW_STORE_REPORTS: ["ADMIN", "MANAGER"],
  VIEW_FINANCIAL_REPORTS: ["ADMIN"],
  EXPORT_DATA: ["ADMIN"],
  AI_PREDICTIONS: ["ADMIN"],
  
  // System Settings
  SYSTEM_CONFIG: ["ADMIN"],
  BACKUP_RESTORE: ["ADMIN"],
  IOT_BLOCKCHAIN: ["ADMIN"],
  SUPPLIER_MANAGEMENT: ["ADMIN"],
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  locationId?: string
  tenantId?: string // For multi-tenant support
  isActive: boolean
}

export interface TenantInfo {
  id: string
  companyName: string
  adminEmail: string
  locations: Array<{
    id: string
    name: string
    address?: string
  }>
}

interface AuthContextType {
  user: User | null
  tenant: TenantInfo | null
  accessToken: string | null
  login: (email: string, password: string) => Promise<boolean>
  adminSignup: (data: AdminSignupData) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  refreshToken: () => Promise<boolean>
}

export interface AdminSignupData {
  email: string
  password: string
  firstName: string
  lastName: string
  companyName: string
  phone?: string
  businessType?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for stored session
    const storedToken = localStorage.getItem("accessToken")
    const storedUser = localStorage.getItem("user")
    const storedTenant = localStorage.getItem("tenant")
    
    if (storedToken && storedUser) {
      setAccessToken(storedToken)
      setUser(JSON.parse(storedUser))
      if (storedTenant) {
        setTenant(JSON.parse(storedTenant))
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const { user: userData, accessToken: token } = data.data
        
        setUser(userData)
        setAccessToken(token)
        
        // Store in localStorage
        localStorage.setItem("accessToken", token)
        localStorage.setItem("user", JSON.stringify(userData))
        
        // If user is admin, fetch tenant info
        if (userData.role === 'ADMIN') {
          await fetchTenantInfo(token)
        }
        
        // Redirect based on role
        redirectUserByRole(userData.role)
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const adminSignup = async (data: AdminSignupData): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/saas/admin/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        const { admin, accessToken: token, mainLocation } = result.data
        
        setUser(admin)
        setAccessToken(token)
        
        // Create tenant info from signup response
        const tenantInfo: TenantInfo = {
          id: admin.id,
          companyName: data.companyName,
          adminEmail: admin.email,
          locations: [mainLocation]
        }
        
        setTenant(tenantInfo)
        
        // Store in localStorage
        localStorage.setItem("accessToken", token)
        localStorage.setItem("user", JSON.stringify(admin))
        localStorage.setItem("tenant", JSON.stringify(tenantInfo))
        
        // Redirect to admin dashboard
        router.push("/admin")
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Admin signup error:', error)
      return false
    }
  }

  const fetchTenantInfo = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE}/saas/tenant/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setTenant(data.data)
        localStorage.setItem("tenant", JSON.stringify(data.data))
      }
    } catch (error) {
      console.error('Error fetching tenant info:', error)
    }
  }

  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const newToken = data.data.accessToken
        setAccessToken(newToken)
        localStorage.setItem("accessToken", newToken)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Token refresh error:', error)
      return false
    }
  }

  const redirectUserByRole = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        router.push("/admin")
        break
      case "MANAGER":
        router.push("/manager")
        break
      case "STAFF":
        router.push("/pos")
        break
      default:
        router.push("/login")
    }
  }

  const logout = () => {
    setUser(null)
    setTenant(null)
    setAccessToken(null)
    localStorage.removeItem("accessToken")
    localStorage.removeItem("user")
    localStorage.removeItem("tenant")
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      tenant, 
      accessToken, 
      login, 
      adminSignup, 
      logout, 
      isLoading, 
      refreshToken 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
