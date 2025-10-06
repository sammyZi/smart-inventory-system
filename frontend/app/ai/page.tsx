'use client'

/**
 * AI Demand Forecasting Page
 * Role-based access to AI features
 */

import React from 'react'
import { RoleGuard } from '@/components/role-based/RoleGuard'
import AIDashboard from '@/components/ai/AIDashboard'

export default function AIPage() {
  return (
    <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
      <div className="container mx-auto px-4 py-8">
        <AIDashboard />
      </div>
    </RoleGuard>
  )
}