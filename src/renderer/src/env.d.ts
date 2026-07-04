/// <reference types="vite/client" />

// ===== 数据类型定义 =====

interface Category {
  id: number
  name: string
  icon: string
  parent_id: number | null
  is_default: boolean
  sort_order: number
  created_at: string
}

interface Expense {
  id: number
  amount: number
  category_id: number
  sub_category_id: number | null
  date: string
  note: string
  created_at: string
  updated_at: string
  category_name?: string
  category_icon?: string
  sub_category_name?: string
}

interface MonthlySummary {
  total: number
  byCategory: {
    categoryId: number
    categoryName: string
    icon: string
    total: number
    count: number
  }[]
}

interface MonthlyTrendItem {
  month: string
  total: number
}
