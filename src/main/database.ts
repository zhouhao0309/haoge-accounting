import initSqlJs, { Database as SqlJsDatabase, Statement } from 'sql.js'
import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'

let db: SqlJsDatabase | null = null

/** 预设分类数据 */
export const DEFAULT_CATEGORIES: { name: string; icon: string; sub: string[] }[] = [
  {
    name: '餐饮饮食',
    icon: '🍽️',
    sub: ['早餐', '午餐', '晚餐', '零食水果', '饮品', '聚餐请客']
  },
  {
    name: '交通出行',
    icon: '🚗',
    sub: ['公交地铁', '打车', '加油充电', '停车费', '火车飞机']
  },
  {
    name: '购物消费',
    icon: '🛒',
    sub: ['服装鞋帽', '数码产品', '家居日用', '美妆护肤', '其他购物']
  },
  {
    name: '住房居住',
    icon: '🏠',
    sub: ['房租', '水电燃气', '物业费', '维修保养', '家居用品']
  },
  {
    name: '休闲娱乐',
    icon: '🎮',
    sub: ['电影演出', '游戏充值', '运动健身', '旅游度假', 'KTV酒吧']
  },
  {
    name: '医疗健康',
    icon: '💊',
    sub: ['门诊挂号', '药品购买', '住院治疗', '体检保健', '牙科眼科']
  },
  {
    name: '教育学习',
    icon: '📚',
    sub: ['培训课程', '书籍资料', '考试报名', '文具用品', '网课会员']
  },
  {
    name: '人情往来',
    icon: '🎁',
    sub: ['红包送礼', '婚丧嫁娶', '请客吃饭', '捐款慈善', '聚会分摊']
  },
  {
    name: '金融服务',
    icon: '💰',
    sub: ['银行手续费', '贷款利息', '保险缴费', '投资亏损', '其他金融']
  },
  {
    name: '其他支出',
    icon: '📦',
    sub: ['快递物流', '宠物用品', '美容美发', '彩票博彩', '其他杂项']
  }
]

/** 获取数据库文件路径 */
function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }
  return join(userDataPath, 'haoge-accounting.db')
}

/** 将数据库写入磁盘 */
export function saveDb(): void {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(getDbPath(), buffer)
}

/** 初始化数据库：创建表并插入预设分类 */
export async function initDatabase(): Promise<void> {
  const dbPath = getDbPath()
  console.log('[DB] 数据库路径:', dbPath)

  const SQL = await initSqlJs()

  // 尝试加载已有数据库文件
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
    console.log('[DB] 已加载现有数据库')
  } else {
    db = new SQL.Database()
    console.log('[DB] 创建新数据库')
  }

  // 创建分类表
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '',
      parent_id INTEGER,
      is_default INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `)

  // 创建支出记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      category_id INTEGER NOT NULL,
      sub_category_id INTEGER,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (sub_category_id) REFERENCES categories(id)
    )
  `)

  // 检查是否已插入预设分类
  const countResult = db.exec('SELECT COUNT(*) as cnt FROM categories WHERE parent_id IS NULL')
  const cnt = countResult[0]?.values[0]?.[0] ?? 0

  if (cnt === 0) {
    seedCategories()
  }

  // 持久化保存
  saveDb()
}

/** 插入预设分类数据 */
function seedCategories(): void {
  if (!db) return

  DEFAULT_CATEGORIES.forEach((cat, index) => {
    const result = db!.run(
      'INSERT INTO categories (name, icon, parent_id, is_default, sort_order) VALUES (?, ?, ?, 1, ?)',
      [cat.name, cat.icon, null, index]
    )
    const parentId = result.lastInsertRowid
    cat.sub.forEach((subName, subIndex) => {
      db!.run(
        'INSERT INTO categories (name, icon, parent_id, is_default, sort_order) VALUES (?, ?, ?, 1, ?)',
        [subName, '', parentId, subIndex]
      )
    })
  })

  console.log('[DB] 预设分类已插入')
}

/** 获取数据库实例 */
export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()')
  }
  return db
}

/** 关闭数据库 */
export function closeDatabase(): void {
  if (db) {
    saveDb()
    db.close()
    db = null
  }
}

/**
 * 辅助函数：执行查询并返回对象数组
 * sql.js 的 exec() 返回的是列名+值数组，需要转换为对象
 */
export function queryAll(sql: string, params?: any[]): any[] {
  const db = getDb()

  if (params && params.length > 0) {
    // 使用参数化查询
    const stmt = db.prepare(sql)
    stmt.bind(params)
    const rows: any[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject())
    }
    stmt.free()
    return rows
  } else {
    // 无参数查询
    const stmt = db.prepare(sql)
    const rows: any[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject())
    }
    stmt.free()
    return rows
  }
}

/** 执行写操作并自动保存 */
export function executeAndSave(sql: string, params?: any[]): { lastInsertRowid: number; changes: number } {
  const db = getDb()
  if (params && params.length > 0) {
    db.run(sql, params)
  } else {
    db.run(sql)
  }
  // 每次写操作后自动保存到磁盘
  saveDb()
  return {
    lastInsertRowid: (db as any).lastInsertRowId ?? 0,
    changes: db.getRowsModified()
  }
}
