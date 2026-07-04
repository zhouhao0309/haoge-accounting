import { useState, useEffect } from 'react'
import * as api from '../api'
import { Card, Table, Button, Popconfirm, message, Space, Tag, Select, DatePicker, Input, Spin } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'

const { RangePicker } = DatePicker

function ExpenseList(): JSX.Element {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>(undefined)
  const [dateRange, setDateRange] = useState<[string, string] | null>(null)

  const loadData = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const filters: Record<string, unknown> = {}
      if (dateRange) { filters.startDate = dateRange[0]; filters.endDate = dateRange[1] }
      if (categoryFilter) filters.categoryId = categoryFilter
      if (keyword) filters.keyword = keyword

      const [data, cats] = await Promise.all([
        api.getExpenses(Object.keys(filters).length > 0 ? filters as never : undefined),
        api.getCategories()
      ])
      setExpenses(data)
      setCategories(cats)
    } catch (err) {
      console.error('Load failed:', err)
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [dateRange, categoryFilter, keyword])

  const handleDelete = async (id: number): Promise<void> => {
    try { await api.deleteExpense(id); message.success('已删除'); loadData() }
    catch { message.error('删除失败') }
  }

  const columns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 120, sorter: (a: Expense, b: Expense) => a.date.localeCompare(b.date) },
    { title: '分类', key: 'category', width: 180, render: (_: unknown, r: Expense) => (<Space><Tag color="orange">{r.category_icon} {r.category_name}</Tag><span style={{ color: '#8c8c8c' }}>{r.sub_category_name}</span></Space>) },
    { title: '金额', dataIndex: 'amount', key: 'amount', width: 120, render: (v: number) => (<span style={{ color: '#fa541c', fontWeight: 600 }}>¥ {v.toFixed(2)}</span>) },
    { title: '备注', dataIndex: 'note', key: 'note', ellipsis: true, render: (n: string) => (<span style={{ color: n ? '#262626' : '#d9d9d9' }}>{n || '无备注'}</span>) },
    { title: '操作', key: 'action', width: 80, render: (_: unknown, r: Expense) => (
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)} okText="确定" cancelText="取消">
          <Button type="link" danger icon={<DeleteOutlined />} size="small">删除</Button>
        </Popconfirm>
      ) }
  ]

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0)

  if (error) {
    return <Card><div style={{ textAlign: 'center', padding: 40, color: '#999' }}>加载失败：{error}<br /><Button onClick={loadData} style={{ marginTop: 16 }}>重试</Button></div></Card>
  }

  return (
    <Card>
      <Space wrap style={{ marginBottom: 16 }}>
        <RangePicker placeholder={['开始日期', '结束日期']} onChange={(dates) => { if (dates && dates[0] && dates[1]) { setDateRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]) } else { setDateRange(null) } }} />
        <Select placeholder="按分类筛选" allowClear style={{ width: 160 }} onChange={(v) => setCategoryFilter(v)} options={categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))} />
        <Input placeholder="搜索备注" style={{ width: 200 }} allowClear onPressEnter={(e) => setKeyword((e.target as HTMLInputElement).value)} />
      </Space>

      <div style={{ background: '#FFF7E6', padding: '12px 16px', borderRadius: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>共 <strong>{expenses.length}</strong> 条记录</span>
        <span>合计：<span style={{ fontSize: 24, fontWeight: 700, color: '#FA8C16' }}>¥ {totalAmount.toFixed(2)}</span></span>
      </div>

      <Spin spinning={loading}>
        <Table dataSource={expenses} columns={columns} rowKey="id" pagination={{ pageSize: 20, showTotal: (t: number) => `共 ${t} 条` }} locale={{ emptyText: '暂无记账记录，快去记一笔吧 ✍️' }} />
      </Spin>
    </Card>
  )
}

export default ExpenseList
