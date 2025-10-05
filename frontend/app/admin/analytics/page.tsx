'use client'

import { RoleGuard, ManagerAndAbove } from "@/components/role-based/RoleGuard"
import { RoleBasedLayout } from "@/components/layout/RoleBasedLayout"
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard"

export default function AnalyticsPage() {
  return (
    <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'STAFF']}>
      <RoleBasedLayout title="Analytics & Reports">
        <div className="container mx-auto p-6">
          <AnalyticsDashboard />
        </div>
      </RoleBasedLayout>
    </RoleGuard>
  )
}