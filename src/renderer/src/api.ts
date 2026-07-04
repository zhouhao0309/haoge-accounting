// API 封装层：使用 Tauri invoke 调用 Rust 后端
import { invoke } from '@tauri-apps/api/core'

// 安全调用包装
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    console.log(`[API] Calling ${cmd}`, args)
    const result = await invoke<T>(cmd, args)
    console.log(`[API] ${cmd} success`, result)
    return result
  } catch (err) {
    console.error(`[API] ${cmd} failed:`, err)
    throw err
  }
}

// ===== 分类相关 =====
export async function getCategories(): Promise<Category[]> {
  return safeInvoke<Category[]>('get_categories')
}

export async function getSubCategories(parentId: number): Promise<Category[]> {
  return safeInvoke<Category[]>('get_sub_categories', { parentId })
}

export async function addSubCategory(parentId: number, name: string): Promise<Category> {
  return safeInvoke<Category>('add_sub_category', { parentId, name })
}

export async function deleteSubCategory(id: number): Promise<void> {
  return safeInvoke('delete_sub_category', { id })
}

// ===== 支出记录相关 =====
export async function addExpense(payload: {
  amount: number
  categoryId: number
  subCategoryId: number
  date: string
  note?: string
}): Promise<Expense> {
  return safeInvoke<Expense>('add_expense', { data: payload })
}

export async function getExpenses(filters?: {
  startDate?: string
  endDate?: string
  categoryId?: number
  keyword?: string
}): Promise<Expense[]> {
  return safeInvoke<Expense[]>('get_expenses', { filters: filters || null })
}

export async function updateExpense(
  id: number,
  payload: {
    amount?: number
    categoryId?: number
    subCategoryId?: number
    date?: string
    note?: string
  }
): Promise<void> {
  return safeInvoke('update_expense', { id, data: payload })
}

export async function deleteExpense(id: number): Promise<void> {
  return safeInvoke('delete_expense', { id })
}

// ===== 统计相关 =====
export async function getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
  return safeInvoke<MonthlySummary>('get_monthly_summary', { year, month })
}

export async function getMonthlyTrend(months: number): Promise<MonthlyTrendItem[]> {
  return safeInvoke<MonthlyTrendItem[]>('get_monthly_trend', { months })
}
