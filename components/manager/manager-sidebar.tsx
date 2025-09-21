"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Package, ShoppingCart, BarChart3, FileText, Settings, AlertTriangle, TrendingUp } from 'lucide-react'

const navigation = [
  { name: "Dashboard", href: "/manager", icon: LayoutDashboard },
  { name: "Products", href: "/manager/products", icon: Package },
  { name: "Sales", href: "/manager/sales", icon: ShoppingCart },
  { name: "Stock Management", href: "/manager/stock", icon: TrendingUp },
  { name: "Reports", href: "/manager/reports", icon: BarChart3 },
  { name: "Invoices", href: "/manager/invoices", icon: FileText },
  { name: "Alerts", href: "/manager/alerts", icon: AlertTriangle },
  { name: "Settings", href: "/manager/settings", icon: Settings },
]

export function ManagerSidebar() {
  const pathname = usePathname()

  return (
    <nav className="space-y-2">
      {navigation.map((item) => {
        const isActive = pathname.startsWith(item.href) && (item.href === "/manager" ? pathname === item.href : true)
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
