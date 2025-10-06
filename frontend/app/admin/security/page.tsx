'use client'

import { RoleGuard, ManagerAndAbove } from "@/components/role-based/RoleGuard"
import { RoleBasedLayout } from "@/components/layout/RoleBasedLayout"
import { SecurityDashboard } from "@/components/security/SecurityDashboard"

export default function SecurityPage() {
  return (
    <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
      <RoleBasedLayout title="Security & Audit">
        <div className="container mx-auto p-6">
          <SecurityDashboard />
        </div>
      </RoleBasedLayout>
    </RoleGuard>
  )
}