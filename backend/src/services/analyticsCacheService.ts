/**
 * Analytics Caching Service
 * Provides efficient caching for analytics data with role-based invalidation
 */

import { UserContext } from '../middleware/permissions'

interface CacheEntry {
  data: any
  timestamp: Date
  ttl: number // Time to live in seconds
  tenantId: string
  role: string
  storeIds: string[]
}

interface CacheKey {
  type: 'dashboard' | 'sales' | 'inventory' | 'staff' | 'financial'
  tenantId: string
  role: string
  storeIds: string[]
  filters?: any
}

export class AnalyticsCacheService {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly DEFAULT_TTL = 300 // 5 minutes
  private readonly REALTIME_TTL = 30 // 30 seconds for realtime data

  /**
   * Generate cache key from parameters
   */
  private generateCacheKey(key: CacheKey): string {
    const keyParts = [
      key.type,
      key.tenantId,
      key.role,
      key.storeIds.sort().join(','),
      key.filters ? JSON.stringify(key.filters) : ''
    ]
    return keyParts.join('|')
  }

  /**
   * Get cached data if available and not expired
   */
  async get(key: CacheKey): Promise<any | null> {
    const cacheKey = this.generateCacheKey(key)
    const entry = this.cache.get(cacheKey)

    if (!entry) {
      return null
    }

    // Check if cache entry has expired
    const now = new Date()
    const expiryTime = new Date(entry.timestamp.getTime() + entry.ttl * 1000)

    if (now > expiryTime) {
      this.cache.delete(cacheKey)
      return null
    }

    // Verify tenant and role match for security
    if (entry.tenantId !== key.tenantId || entry.role !== key.role) {
      this.cache.delete(cacheKey)
      return null
    }

    return entry.data
  }

  /**
   * Store data in cache with appropriate TTL
   */
  async set(key: CacheKey, data: any, customTtl?: number): Promise<void> {
    const cacheKey = this.generateCacheKey(key)
    const ttl = customTtl || this.getTtlForType(key.type)

    const entry: CacheEntry = {
      data,
      timestamp: new Date(),
      ttl,
      tenantId: key.tenantId,
      role: key.role,
      storeIds: [...key.storeIds]
    }

    this.cache.set(cacheKey, entry)

    // Clean up expired entries periodically
    this.cleanupExpiredEntries()
  }

  /**
   * Invalidate cache entries for specific tenant/role/store combinations
   */
  async invalidate(pattern: Partial<CacheKey>): Promise<void> {
    const keysToDelete: string[] = []

    for (const [cacheKey, entry] of this.cache.entries()) {
      let shouldDelete = true

      // Check each pattern criteria
      if (pattern.tenantId && entry.tenantId !== pattern.tenantId) {
        shouldDelete = false
      }
      if (pattern.role && entry.role !== pattern.role) {
        shouldDelete = false
      }
      if (pattern.type && !cacheKey.startsWith(pattern.type)) {
        shouldDelete = false
      }
      if (pattern.storeIds && pattern.storeIds.length > 0) {
        const hasMatchingStore = pattern.storeIds.some(storeId => 
          entry.storeIds.includes(storeId)
        )
        if (!hasMatchingStore) {
          shouldDelete = false
        }
      }

      if (shouldDelete) {
        keysToDelete.push(cacheKey)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Get cached dashboard metrics
   */
  async getDashboardMetrics(userContext: UserContext, filters?: any): Promise<any | null> {
    const key: CacheKey = {
      type: 'dashboard',
      tenantId: userContext.tenantId,
      role: userContext.role,
      storeIds: userContext.storeIds,
      filters
    }

    return await this.get(key)
  }

  /**
   * Cache dashboard metrics
   */
  async setDashboardMetrics(userContext: UserContext, data: any, filters?: any): Promise<void> {
    const key: CacheKey = {
      type: 'dashboard',
      tenantId: userContext.tenantId,
      role: userContext.role,
      storeIds: userContext.storeIds,
      filters
    }

    await this.set(key, data)
  }

  /**
   * Get cached sales data
   */
  async getSalesData(userContext: UserContext, filters?: any): Promise<any | null> {
    const key: CacheKey = {
      type: 'sales',
      tenantId: userContext.tenantId,
      role: userContext.role,
      storeIds: userContext.storeIds,
      filters
    }

    return await this.get(key)
  }

  /**
   * Cache sales data
   */
  async setSalesData(userContext: UserContext, data: any, filters?: any): Promise<void> {
    const key: CacheKey = {
      type: 'sales',
      tenantId: userContext.tenantId,
      role: userContext.role,
      storeIds: userContext.storeIds,
      filters
    }

    await this.set(key, data)
  }

  /**
   * Invalidate cache when data changes
   */
  async invalidateOnDataChange(
    tenantId: string, 
    changeType: 'sale' | 'inventory' | 'user' | 'product',
    storeIds?: string[]
  ): Promise<void> {
    const patterns: Partial<CacheKey>[] = []

    switch (changeType) {
      case 'sale':
        // Invalidate sales and dashboard caches
        patterns.push(
          { type: 'sales', tenantId, storeIds },
          { type: 'dashboard', tenantId, storeIds }
        )
        break

      case 'inventory':
        // Invalidate inventory and dashboard caches
        patterns.push(
          { type: 'inventory', tenantId, storeIds },
          { type: 'dashboard', tenantId, storeIds }
        )
        break

      case 'user':
        // Invalidate staff-related caches
        patterns.push(
          { type: 'staff', tenantId, storeIds },
          { type: 'dashboard', tenantId, storeIds }
        )
        break

      case 'product':
        // Invalidate inventory and sales caches
        patterns.push(
          { type: 'inventory', tenantId, storeIds },
          { type: 'sales', tenantId, storeIds },
          { type: 'dashboard', tenantId, storeIds }
        )
        break
    }

    for (const pattern of patterns) {
      await this.invalidate(pattern)
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number
    entriesByType: Record<string, number>
    entriesByTenant: Record<string, number>
    memoryUsage: number
  } {
    const stats = {
      totalEntries: this.cache.size,
      entriesByType: {} as Record<string, number>,
      entriesByTenant: {} as Record<string, number>,
      memoryUsage: 0
    }

    for (const [key, entry] of this.cache.entries()) {
      const type = key.split('|')[0]
      stats.entriesByType[type] = (stats.entriesByType[type] || 0) + 1
      stats.entriesByTenant[entry.tenantId] = (stats.entriesByTenant[entry.tenantId] || 0) + 1
      
      // Rough memory usage calculation
      stats.memoryUsage += JSON.stringify(entry).length
    }

    return stats
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    this.cache.clear()
  }

  /**
   * Clear cache for specific tenant
   */
  async clearTenant(tenantId: string): Promise<void> {
    await this.invalidate({ tenantId })
  }

  /**
   * Get TTL based on data type
   */
  private getTtlForType(type: string): number {
    switch (type) {
      case 'dashboard':
        return this.REALTIME_TTL // Dashboard needs frequent updates
      case 'sales':
        return this.DEFAULT_TTL
      case 'inventory':
        return this.DEFAULT_TTL
      case 'staff':
        return this.DEFAULT_TTL * 2 // Staff data changes less frequently
      case 'financial':
        return this.DEFAULT_TTL * 4 // Financial data can be cached longer
      default:
        return this.DEFAULT_TTL
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = new Date()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      const expiryTime = new Date(entry.timestamp.getTime() + entry.ttl * 1000)
      if (now > expiryTime) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))

    // Limit cache size to prevent memory issues
    if (this.cache.size > 1000) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime())
      
      // Remove oldest 20% of entries
      const toRemove = Math.floor(sortedEntries.length * 0.2)
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(sortedEntries[i][0])
      }
    }
  }

  /**
   * Warm up cache with commonly requested data
   */
  async warmupCache(tenantId: string, userContexts: UserContext[]): Promise<void> {
    // This would typically pre-load common analytics queries
    // Implementation would depend on specific usage patterns
    console.log(`Warming up cache for tenant ${tenantId} with ${userContexts.length} user contexts`)
  }
}