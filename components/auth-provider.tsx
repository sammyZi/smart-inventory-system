"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export type UserRole = "admin" | "store_manager" | "pos_staff"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  storeId?: string // Added storeId
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Sample users for demonstration
const sampleUsers: User[] = [
  {
    id: "1",
    email: "admin@company.com",
    name: "John Admin",
    role: "admin",
    avatar: "/placeholder.svg?height=40&width=40",
    storeId: undefined // Admin is not tied to a specific store
  },
  {
    id: "2",
    email: "manager@company.com",
    name: "Sarah Manager",
    role: "store_manager",
    avatar: "/placeholder.svg?height=40&width=40",
    storeId: "store1" // Assigned to store1
  },
  {
    id: "3",
    email: "staff@company.com",
    name: "Mike Staff",
    role: "pos_staff",
    avatar: "/placeholder.svg?height=40&width=40",
    storeId: "store1" // Assigned to store1
  },
  {
    id: "4",
    email: "manager2@company.com",
    name: "Emily Manager",
    role: "store_manager",
    avatar: "/placeholder.svg?height=40&width=40",
    storeId: "store2" // Assigned to store2
  },
  {
    id: "5",
    email: "staff2@company.com",
    name: "David Staff",
    role: "pos_staff",
    avatar: "/placeholder.svg?height=40&width=40",
    storeId: "store2" // Assigned to store2
  }
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call
    const foundUser = sampleUsers.find(u => u.email === email)
    
    if (foundUser && password === "password") {
      setUser(foundUser)
      localStorage.setItem("user", JSON.stringify(foundUser))
      
      // Redirect based on role
      switch (foundUser.role) {
        case "admin":
          router.push("/admin")
          break
        case "store_manager":
          router.push("/manager")
          break
        case "pos_staff":
          router.push("/pos")
          break
      }
      
      return true
    }
    
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
