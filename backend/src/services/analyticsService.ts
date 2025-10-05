/**
 * Tenant-Scoped Analytics and Reporting Service
 * Provides role-filtered analytics with data isolation
 */

import { UserContext } from '../middleware/permissions'

export interface AnalyticsMetrics {
  // Sales Metrics
  totalSales: number
  totalTransactions: number
  averageOrderValue: number
  salesGrowth: number
  
  // Inventory Metrics
  totalProducts: number
  lowStockItems: number
  inventoryValue: number
  inventoryTurnover: number
  
  // Performance Metrics
  topProducts: ProductPerformance[]
  salesByCategory: CategorySales[]
  salesByLocation: LocationSales[]
  salesByTimeframe: TimeframeSales[]
  
  // Staff Metrics (Manager/Admin only)
  staffPerformance?: StaffPerformance[]
  customerSatisfaction?: number
  
  // Financial Metrics (Admin only)
  revenue?: number
  profit?: number
  expenses?: number
  profitMargin?: number
}

export interface ProductPerformance {
  productId: string
  productName: string
  quantity: number
  revenue: number
  profit?: number // Admin/Manager only
}

export interface CategorySales {
  category: string
  sales: number
  growth: number
}

export interface LocationSales {
  locationId: string
  locationName: string
  sales: number
  transactions: number
  growth: number
}

export interface TimeframeSales {
  period: string
  sales: number
  transactions: number
}

export interface StaffPerformance {
  staffId: string
  staffName: string
  sales: number
  transactions: number
  averageServiceTime: number
  customerRating: number
}

export interface ReportFilters {
  dateRange: {
    startDate: Date
    endDate: Date
  }
  locationIds?: string[]
  categoryIds?: string[]
  productIds?: string[]
  staffIds?: string[]
  reportType: 'sales' | 'inventory' | 'staff' | 'financial' | 'comprehensive'
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv'
  includeCharts: boolean
  includeDetails: boolean
  template?: string
}

export class AnalyticsService {
  /**
   * Get dashboard metrics with role-based filtering
   */
  async getDashboardMetrics(
    userContext: UserContext,
    filters?: Partial<ReportFilters>
  ): Promise<AnalyticsMetrics> {
    const { role, storeIds, tenantId } = userContext

    // Base query with tenant isolation
    const baseQuery = { tenantId }
    
    // Apply role-based store filtering
    if (role === 'MANAGER' || role === 'STAFF') {
      baseQuery.storeId = { in: storeIds }
    }

    // Apply date range filter
    const dateRange = filters?.dateRange || this.getDefaultDateRange()
    
    try {
      // Get sales metrics
      const salesMetrics = await this.getSalesMetrics(baseQuery, dateRange, role)
      
      // Get inventory metrics
      const inventoryMetrics = await this.getInventoryMetrics(baseQuery, role)
      
      // Get performance metrics
      const performanceMetrics = await this.getPerformanceMetrics(baseQuery, dateRange, role)
      
      // Combine metrics based on role permissions
      const metrics: AnalyticsMetrics = {
        ...salesMetrics,
        ...inventoryMetrics,
        ...performanceMetrics
      }

      // Add role-specific metrics
      if (role === 'ADMIN' || role === 'MANAGER') {
        metrics.staffPerformance = await this.getStaffPerformance(baseQuery, dateRange)
        metrics.customerSatisfaction = await this.getCustomerSatisfaction(baseQuery, dateRange)
      }

      if (role === 'ADMIN') {
        const financialMetrics = await this.getFinancialMetrics(baseQuery, dateRange)
        metrics.revenue = financialMetrics.revenue
        metrics.profit = financialMetrics.profit
        metrics.expenses = financialMetrics.expenses
        metrics.profitMargin = financialMetrics.profitMargin
      }

      return metrics
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
      throw new Error('Failed to fetch analytics data')
    }
  }

  /**
   * Generate comprehensive report with role-based data access
   */
  async generateReport(
    userContext: UserContext,
    filters: ReportFilters
  ): Promise<any> {
    const { role, storeIds, tenantId } = userContext

    // Validate report type permissions
    if (!this.canAccessReportType(role, filters.reportType)) {
      throw new Error(`Insufficient permissions for ${filters.reportType} report`)
    }

    // Apply role-based filtering
    const query = this.buildReportQuery(userContext, filters)

    try {
      switch (filters.reportType) {
        case 'sales':
          return await this.generateSalesReport(query, filters)
        case 'inventory':
          return await this.generateInventoryReport(query, filters)
        case 'staff':
          return await this.generateStaffReport(query, filters)
        case 'financial':
          return await this.generateFinancialReport(query, filters)
        case 'comprehensive':
          return await this.generateComprehensiveReport(query, filters)
        default:
          throw new Error('Invalid report type')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      throw new Error('Failed to generate report')
    }
  }

  /**
   * Export report data in specified format
   */
  async exportReport(
    userContext: UserContext,
    reportData: any,
    options: ExportOptions
  ): Promise<Buffer> {
    const { role } = userContext

    // Filter sensitive data based on role
    const filteredData = this.filterSensitiveData(reportData, role)

    try {
      switch (options.format) {
        case 'pdf':
          return await this.exportToPDF(filteredData, options)
        case 'excel':
          return await this.exportToExcel(filteredData, options)
        case 'csv':
          return await this.exportToCSV(filteredData, options)
        default:
          throw new Error('Unsupported export format')
      }
    } catch (error) {
      console.error('Error exporting report:', error)
      throw new Error('Failed to export report')
    }
  }

  /**
   * Get real-time analytics for live dashboards
   */
  async getRealtimeMetrics(
    userContext: UserContext
  ): Promise<Partial<AnalyticsMetrics>> {
    const { role, storeIds, tenantId } = userContext

    try {
      // Get today's metrics
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      
      const baseQuery = { 
        tenantId,
        createdAt: { gte: startOfDay }
      }

      if (role === 'MANAGER' || role === 'STAFF') {
        baseQuery.storeId = { in: storeIds }
      }

      // Get real-time sales data
      const todaysSales = await this.getTodaysSales(baseQuery)
      const todaysTransactions = await this.getTodaysTransactions(baseQuery)
      
      return {
        totalSales: todaysSales,
        totalTransactions: todaysTransactions,
        averageOrderValue: todaysTransactions > 0 ? todaysSales / todaysTransactions : 0
      }
    } catch (error) {
      console.error('Error fetching realtime metrics:', error)
      throw new Error('Failed to fetch realtime data')
    }
  }

  // Private helper methods

  private async getSalesMetrics(query: any, dateRange: any, role: string) {
    // Mock implementation - replace with actual database queries
    return {
      totalSales: 45231.89,
      totalTransactions: 1234,
      averageOrderValue: 36.67,
      salesGrowth: 15.2
    }
  }

  private async getInventoryMetrics(query: any, role: string) {
    // Mock implementation
    return {
      totalProducts: 456,
      lowStockItems: 23,
      inventoryValue: 125000,
      inventoryTurnover: 4.2
    }
  }

  private async getPerformanceMetrics(query: any, dateRange: any, role: string) {
    // Mock implementation
    return {
      topProducts: [
        { productId: '1', productName: 'Product A', quantity: 150, revenue: 4500 },
        { productId: '2', productName: 'Product B', quantity: 120, revenue: 3600 }
      ],
      salesByCategory: [
        { category: 'Electronics', sales: 15000, growth: 12.5 },
        { category: 'Clothing', sales: 12000, growth: 8.3 }
      ],
      salesByLocation: [
        { locationId: '1', locationName: 'Downtown', sales: 20000, transactions: 500, growth: 15.2 },
        { locationId: '2', locationName: 'Mall', sales: 15000, transactions: 380, growth: 10.1 }
      ],
      salesByTimeframe: [
        { period: '2024-01-01', sales: 5000, transactions: 125 },
        { period: '2024-01-02', sales: 5500, transactions: 140 }
      ]
    }
  }

  private async getStaffPerformance(query: any, dateRange: any): Promise<StaffPerformance[]> {
    // Mock implementation
    return [
      {
        staffId: '1',
        staffName: 'John Smith',
        sales: 8500,
        transactions: 215,
        averageServiceTime: 4.2,
        customerRating: 4.8
      }
    ]
  }

  private async getCustomerSatisfaction(query: any, dateRange: any): Promise<number> {
    return 4.6
  }

  private async getFinancialMetrics(query: any, dateRange: any) {
    return {
      revenue: 45231.89,
      profit: 13569.57,
      expenses: 31662.32,
      profitMargin: 30.0
    }
  }

  private canAccessReportType(role: string, reportType: string): boolean {
    const permissions = {
      'sales': ['ADMIN', 'MANAGER'],
      'inventory': ['ADMIN', 'MANAGER'],
      'staff': ['ADMIN', 'MANAGER'],
      'financial': ['ADMIN'],
      'comprehensive': ['ADMIN']
    }

    return permissions[reportType]?.includes(role) || false
  }

  private buildReportQuery(userContext: UserContext, filters: ReportFilters) {
    const { role, storeIds, tenantId } = userContext
    
    const query = {
      tenantId,
      createdAt: {
        gte: filters.dateRange.startDate,
        lte: filters.dateRange.endDate
      }
    }

    // Apply role-based store filtering
    if (role === 'MANAGER' || role === 'STAFF') {
      query.storeId = { in: storeIds }
    }

    // Apply additional filters
    if (filters.locationIds && role === 'ADMIN') {
      query.storeId = { in: filters.locationIds }
    }

    return query
  }

  private async generateSalesReport(query: any, filters: ReportFilters) {
    // Mock implementation
    return {
      title: 'Sales Report',
      period: `${filters.dateRange.startDate.toDateString()} - ${filters.dateRange.endDate.toDateString()}`,
      summary: {
        totalSales: 45231.89,
        totalTransactions: 1234,
        averageOrderValue: 36.67
      },
      details: []
    }
  }

  private async generateInventoryReport(query: any, filters: ReportFilters) {
    // Mock implementation
    return {
      title: 'Inventory Report',
      summary: {
        totalProducts: 456,
        lowStockItems: 23,
        inventoryValue: 125000
      }
    }
  }

  private async generateStaffReport(query: any, filters: ReportFilters) {
    // Mock implementation
    return {
      title: 'Staff Performance Report',
      summary: {
        totalStaff: 15,
        averagePerformance: 4.2
      }
    }
  }

  private async generateFinancialReport(query: any, filters: ReportFilters) {
    // Mock implementation
    return {
      title: 'Financial Report',
      summary: {
        revenue: 45231.89,
        profit: 13569.57,
        profitMargin: 30.0
      }
    }
  }

  private async generateComprehensiveReport(query: any, filters: ReportFilters) {
    // Mock implementation combining all reports
    return {
      title: 'Comprehensive Business Report',
      sections: {
        sales: await this.generateSalesReport(query, filters),
        inventory: await this.generateInventoryReport(query, filters),
        staff: await this.generateStaffReport(query, filters),
        financial: await this.generateFinancialReport(query, filters)
      }
    }
  }

  private filterSensitiveData(data: any, role: string) {
    // Remove sensitive financial data for non-admin roles
    if (role !== 'ADMIN') {
      delete data.profit
      delete data.expenses
      delete data.profitMargin
      delete data.cost
    }

    if (role === 'STAFF') {
      delete data.staffPerformance
      delete data.customerSatisfaction
    }

    return data
  }

  private async exportToPDF(data: any, options: ExportOptions): Promise<Buffer> {
    // Mock PDF generation - implement with library like puppeteer or jsPDF
    return Buffer.from('PDF content placeholder')
  }

  private async exportToExcel(data: any, options: ExportOptions): Promise<Buffer> {
    // Mock Excel generation - implement with library like exceljs
    return Buffer.from('Excel content placeholder')
  }

  private async exportToCSV(data: any, options: ExportOptions): Promise<Buffer> {
    // Mock CSV generation
    const csv = 'Date,Sales,Transactions\n2024-01-01,5000,125\n2024-01-02,5500,140'
    return Buffer.from(csv)
  }

  private getDefaultDateRange() {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30) // Last 30 days
    return { startDate, endDate }
  }

  private async getTodaysSales(query: any): Promise<number> {
    // Mock implementation
    return 1234.56
  }

  private async getTodaysTransactions(query: any): Promise<number> {
    // Mock implementation
    return 45
  }
}