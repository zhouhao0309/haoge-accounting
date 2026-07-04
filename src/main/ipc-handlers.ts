import { ipcMain } from 'electron'
import { getDb, queryAll, executeAndSave } from './database'

/** 注册所有 IPC 通信处理函数 */
export function registerIpcHandlers(): void {
  // ===== 分类相关 =====

  ipcMain.handle('db:get-categories', () => {
    return queryAll(
      'SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort_order ASC'
    )
  })

  ipcMain.handle('db:get-sub-categories', (_event, parentId: number) => {
    return queryAll(
      'SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order ASC',
      [parentId]
    )
  })

  ipcMain.handle('db:add-sub-category', (_event, parentId: number, name: string) => {
    const existing = queryAll(
      'SELECT id FROM categories WHERE parent_id = ? AND name = ?',
      [parentId, name]
    )
    if (existing.length > 0) {
      throw new Error(`分类"${name}"已存在`)
    }

    const result = executeAndSave(
      'INSERT INTO categories (name, icon, parent_id, is_default, sort_order) VALUES (?, ?, ?, 0, 99)',
      [name, '', parentId]
    )
    return queryAll('SELECT * FROM categories WHERE id = ?', [result.lastInsertRowid])[0]
  })

  ipcMain.handle('db:delete-sub-category', (_event, id: number) => {
    const cats = queryAll('SELECT * FROM categories WHERE id = ?', [id])
    if (cats.length === 0) throw new Error('分类不存在')
    if (cats[0].is_default) throw new Error('系统内置分类不可删除')

    const usageCount = queryAll(
      'SELECT COUNT(*) as cnt FROM expenses WHERE sub_category_id = ?',
      [id]
    )
    if (usageCount[0]?.cnt > 0) {
      throw new Error(`该分类下有 ${usageCount[0].cnt} 条记账记录，无法删除`)
    }

    executeAndSave('DELETE FROM categories WHERE id = ?', [id])
  })

  // ===== 支出记录相关 =====

  ipcMain.handle('db:add-expense', (_event, data: {
    amount: number
    categoryId: number
    subCategoryId: number
    date: string
    note?: string
  }) => {
    const result = executeAndSave(
      `INSERT INTO expenses (amount, category_id, sub_category_id, date, note)
       VALUES (?, ?, ?, ?, ?)`,
      [data.amount, data.categoryId, data.subCategoryId, data.date, data.note || '']
    )
    return queryAll('SELECT * FROM expenses WHERE id = ?', [result.lastInsertRowid])[0]
  })

  ipcMain.handle('db:get-expenses', (_event, filters?: {
    startDate?: string
    endDate?: string
    categoryId?: number
    keyword?: string
  }) => {
    let sql = `
      SELECT e.*,
        c.name as category_name,
        c.icon as category_icon,
        sc.name as sub_category_name
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN categories sc ON e.sub_category_id = sc.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters?.startDate) {
      sql += ' AND e.date >= ?'
      params.push(filters.startDate)
    }
    if (filters?.endDate) {
      sql += ' AND e.date <= ?'
      params.push(filters.endDate)
    }
    if (filters?.categoryId) {
      sql += ' AND e.category_id = ?'
      params.push(filters.categoryId)
    }
    if (filters?.keyword) {
      sql += ' AND e.note LIKE ?'
      params.push(`%${filters.keyword}%`)
    }

    sql += ' ORDER BY e.date DESC, e.created_at DESC'
    return queryAll(sql, params)
  })

  ipcMain.handle('db:update-expense', (_event, id: number, data: {
    amount?: number
    categoryId?: number
    subCategoryId?: number
    date?: string
    note?: string
  }) => {
    const fields: string[] = []
    const params: any[] = []

    if (data.amount !== undefined) { fields.push('amount = ?'); params.push(data.amount) }
    if (data.categoryId !== undefined) { fields.push('category_id = ?'); params.push(data.categoryId) }
    if (data.subCategoryId !== undefined) { fields.push('sub_category_id = ?'); params.push(data.subCategoryId) }
    if (data.date !== undefined) { fields.push('date = ?'); params.push(data.date) }
    if (data.note !== undefined) { fields.push('note = ?'); params.push(data.note) }

    if (fields.length === 0) return

    fields.push("updated_at = datetime('now', 'localtime')")
    params.push(id)

    executeAndSave(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`, params)
  })

  ipcMain.handle('db:delete-expense', (_event, id: number) => {
    executeAndSave('DELETE FROM expenses WHERE id = ?', [id])
  })

  // ===== 统计相关 =====

  ipcMain.handle('db:get-monthly-summary', (_event, year: number, month: number) => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`

    const totalRows = queryAll(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
       WHERE strftime('%Y-%m', date) = ?`,
      [monthStr]
    )
    const total = totalRows[0]?.total ?? 0

    const byCategory = queryAll(
      `SELECT
        c.id as categoryId,
        c.name as categoryName,
        c.icon,
        COALESCE(SUM(e.amount), 0) as total,
        COUNT(e.id) as count
      FROM categories c
      LEFT JOIN expenses e ON e.category_id = c.id
        AND strftime('%Y-%m', e.date) = ?
      WHERE c.parent_id IS NULL
      GROUP BY c.id
      ORDER BY total DESC`,
      [monthStr]
    )

    return { total, byCategory }
  })

  ipcMain.handle('db:get-monthly-trend', (_event, months: number) => {
    return queryAll(
      `SELECT
        strftime('%Y-%m', date) as month,
        COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE date >= date('now', '-' || ? || ' months', 'start of month')
      GROUP BY month
      ORDER BY month ASC`,
      [months]
    )
  })
}
