"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"

export default function HomePage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      // Redirect based on role
      switch (user.role) {
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
    } else {
      router.push("/login")
    }
  }, [user, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  )
}
