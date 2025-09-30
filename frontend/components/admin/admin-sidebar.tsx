"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, Package, ShoppingCart, BarChart3, Settings, FileText, StoreIcon } from 'lucide-react'

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Stores", href: "/admin/stores", icon: StoreIcon }, // Added Stores link
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Sales", href: "/admin/sales", icon: ShoppingCart },
  { name: "Reports", href: "/admin/reports", icon: BarChart3 },
  { name: "Invoices", href: "/admin/invoices", icon: FileText },
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <nav className="space-y-2">
      {navigation.map((item) => {
        const isActive = pathname.startsWith(item.href) && (item.href === "/admin" ? pathname === item.href : true)
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center space-x-4 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-200 group",
              isActive
                ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
                : "text-foreground/70 hover:bg-primary/5 hover:text-primary/80"
            )}
          >
            <div className={cn(
              "w-1 h-8 rounded-r-full absolute left-0 transition-all duration-200",
              isActive ? "bg-primary" : "bg-transparent group-hover:bg-primary/30"
            )}></div>
            <item.icon className={cn(
              "h-6 w-6 transition-all duration-200",
              isActive ? "text-primary" : "text-foreground/60 group-hover:text-primary/80"
            )} />
            <span>{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
