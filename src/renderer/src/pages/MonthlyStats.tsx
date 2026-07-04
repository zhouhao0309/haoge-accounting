import { useState, useEffect } from 'react'
import * as api from '../api'
import { Card, DatePicker, Row, Col, Table, Spin, Button, message, Empty } from 'antd'
import dayjs from 'dayjs'

function MonthlyStats(): JSX.Element {
  const [selectedMonth, setSelectedMonth] = useState(dayjs())
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getMonthlySummary(selectedMonth.year(), selectedMonth.month() + 1)
      setSummary(data)
    } catch (err) {
      console.error('Stats error:', err)
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSummary() }, [selectedMonth])

  if (error) {
    return <Card><div style={{ textAlign: 'center', padding: 40, color: '#999' }}>加载失败：{error}<br /><Button onClick={loadSummary} style={{ marginTop: 16 }}>重试</Button></div></Card>
  }

  const tableData = (summary?.byCategory || [])
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((c, i) => ({
      key: c.categoryId, rank: i + 1, icon: c.icon, name: c.categoryName,
      total: c.total, count: c.count,
      percent: summary && summary.total > 0 ? ((c.total / summary.total) * 100).toFixed(1) : '0'
    }))

  const totalCount = (summary?.byCategory || []).reduce((s, c) => s + c.count, 0)

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <DatePicker picker="month" value={selectedMonth} onChange={(d) => { if (d) setSelectedMonth(d) }} size="large" allowClear={false} />
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}><Card><div className="stat-number">¥ {(summary?.total || 0).toFixed(2)}</div><div className="stat-label">月度总支出</div></Card></Col>
        <Col span={8}><Card><div className="stat-number">{totalCount}</div><div className="stat-label">记账笔数</div></Card></Col>
        <Col span={8}><Card><div className="stat-number">{tableData.length}</div><div className="stat-label">涉及分类</div></Card></Col>
      </Row>

      <Card title="分类排行榜">
        <Spin spinning={loading}>
          {tableData.length > 0 ? (
            <Table dataSource={tableData} pagination={false} size="small"
              columns={[
                { title: '#', dataIndex: 'rank', width: 40 },
                { title: '分类', dataIndex: 'name', render: (n: string, r: typeof tableData[0]) => `${r.icon} ${n}` },
                { title: '金额', dataIndex: 'total', render: (v: number) => (<span style={{ color: '#fa541c', fontWeight: 600 }}>¥{v.toFixed(2)}</span>) },
                { title: '笔数', dataIndex: 'count' },
                { title: '占比', dataIndex: 'percent', render: (v: string) => `${v}%` }
              ]}
            />
          ) : (<Empty description="本月暂无支出记录" />)}
        </Spin>
      </Card>
    </div>
  )
}

export default MonthlyStats
