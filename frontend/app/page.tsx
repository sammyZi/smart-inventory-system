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
