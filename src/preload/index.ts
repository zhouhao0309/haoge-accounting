import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('api', {
  // ===== 分类相关 =====
  /** 获取所有一级分类 */
  getCategories: (): Promise<any[]> =>
    ipcRenderer.invoke('db:get-categories'),

  /** 获取某个一级分类下的二级分类 */
  getSubCategories: (parentId: number): Promise<any[]> =>
    ipcRenderer.invoke('db:get-sub-categories', parentId),

  /** 添加自定义二级分类 */
  addSubCategory: (parentId: number, name: string): Promise<any> =>
    ipcRenderer.invoke('db:add-sub-category', parentId, name),

  /** 删除自定义二级分类 */
  deleteSubCategory: (id: number): Promise<void> =>
    ipcRenderer.invoke('db:delete-sub-category', id),

  // ===== 支出记录相关 =====
  /** 添加支出记录 */
  addExpense: (data: {
    amount: number
    categoryId: number
    subCategoryId: number
    date: string
    note?: string
  }): Promise<any> =>
    ipcRenderer.invoke('db:add-expense', data),

  /** 获取支出记录列表 */
  getExpenses: (filters?: {
    startDate?: string
    endDate?: string
    categoryId?: number
    keyword?: string
  }): Promise<any[]> =>
    ipcRenderer.invoke('db:get-expenses', filters),

  /** 更新支出记录 */
  updateExpense: (id: number, data: {
    amount?: number
    categoryId?: number
    subCategoryId?: number
    date?: string
    note?: string
  }): Promise<void> =>
    ipcRenderer.invoke('db:update-expense', id, data),

  /** 删除支出记录 */
  deleteExpense: (id: number): Promise<void> =>
    ipcRenderer.invoke('db:delete-expense', id),

  // ===== 统计相关 =====
  /** 获取月度汇总数据 */
  getMonthlySummary: (year: number, month: number): Promise<{
    total: number
    byCategory: { categoryId: number; categoryName: string; icon: string; total: number; count: number }[]
  }> =>
    ipcRenderer.invoke('db:get-monthly-summary', year, month),

  /** 获取月度趋势数据 */
  getMonthlyTrend: (months: number): Promise<{ month: string; total: number }[]> =>
    ipcRenderer.invoke('db:get-monthly-trend', months)
})

// TypeScript 类型声明
export interface ElectronAPI {
  getCategories: () => Promise<any[]>
  getSubCategories: (parentId: number) => Promise<any[]>
  addSubCategory: (parentId: number, name: string) => Promise<any>
  deleteSubCategory: (id: number) => Promise<void>
  addExpense: (data: {
    amount: number
    categoryId: number
    subCategoryId: number
    date: string
    note?: string
  }) => Promise<any>
  getExpenses: (filters?: {
    startDate?: string
    endDate?: string
    categoryId?: number
    keyword?: string
  }) => Promise<any[]>
  updateExpense: (id: number, data: {
    amount?: number
    categoryId?: number
    subCategoryId?: number
    date?: string
    note?: string
  }) => Promise<void>
  deleteExpense: (id: number) => Promise<void>
  getMonthlySummary: (year: number, month: number) => Promise<{
    total: number
    byCategory: { categoryId: number; categoryName: string; icon: string; total: number; count: number }[]
  }>
  getMonthlyTrend: (months: number) => Promise<{ month: string; total: number }[]>
}
