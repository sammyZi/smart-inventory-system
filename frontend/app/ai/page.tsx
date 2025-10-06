'use client'

/**
 * AI Demand Forecasting Page
 * Role-based access to AI features with basic and advanced dashboards
 */

import React, { useState } from 'react'
import { RoleGuard } from '@/components/role-based/RoleGuard'
import { useAuth } from '@/components/auth-provider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AIDashboard from '@/components/ai/AIDashboard'
import AdvancedAIDashboard from '@/components/ai/AdvancedAIDashboard'

export default function AIPage() {
  const { user } = useAuth()

  return (
    <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList>
            <TabsTrigger value="basic">Basic AI Features</TabsTrigger>
            {user?.role === 'ADMIN' && (
              <TabsTrigger value="advanced">Advanced Automation</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="basic">
            <AIDashboard />
          </TabsContent>

          {user?.role === 'ADMIN' && (
            <TabsContent value="advanced">
              <AdvancedAIDashboard />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </RoleGuard>
  )
}