'use client'

import { RoleGuard, ManagerAndAbove } from "@/components/role-based/RoleGuard"
import { RoleBasedLayout } from "@/components/layout/RoleBasedLayout"
import { ReportGenerator } from "@/components/analytics/ReportGenerator"

export default function ReportsPage() {
  return (
    <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
      <RoleBasedLayout title="Reports & Analytics">
        <div className="container mx-auto p-6">
          <ReportGenerator />
        </div>
      </RoleBasedLayout>
    </RoleGuard>
  )
}