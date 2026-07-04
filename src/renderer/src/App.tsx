import { useState } from 'react'
import { Layout, Menu, Typography } from 'antd'
import {
  EditOutlined,
  UnorderedListOutlined,
  PieChartOutlined,
  TagsOutlined,
  BuildOutlined
} from '@ant-design/icons'
import AddExpense from './pages/AddExpense'
import ExpenseList from './pages/ExpenseList'
import MonthlyStats from './pages/MonthlyStats'
import CategoryManage from './pages/CategoryManage'
import SokobanGame from './pages/SokobanGame'

const { Sider, Content, Header } = Layout

type PageKey = 'add' | 'list' | 'stats' | 'categories' | 'game'

const menuItems = [
  { key: 'add', icon: <EditOutlined />, label: '记一笔' },
  { key: 'list', icon: <UnorderedListOutlined />, label: '账单列表' },
  { key: 'stats', icon: <PieChartOutlined />, label: '月度统计' },
  { key: 'categories', icon: <TagsOutlined />, label: '分类管理' },
  { key: 'game', icon: <BuildOutlined />, label: '推箱子' }
]

function App(): JSX.Element {
  const [currentPage, setCurrentPage] = useState<PageKey>('add')

  const renderPage = (): JSX.Element => {
    switch (currentPage) {
      case 'add':
        return <AddExpense onSuccess={() => setCurrentPage('list')} />
      case 'list':
        return <ExpenseList />
      case 'stats':
        return <MonthlyStats />
      case 'categories':
        return <CategoryManage />
      case 'game':
        return <SokobanGame />
      default:
        return <AddExpense onSuccess={() => setCurrentPage('list')} />
    }
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider
        width={200}
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0'
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0'
          }}
        >
          <Typography.Title level={3} style={{ margin: 0, color: '#FA8C16' }}>
            💰 浩哥记账
          </Typography.Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[currentPage]}
          onClick={({ key }) => setCurrentPage(key as PageKey)}
          items={menuItems}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            {menuItems.find((m) => m.key === currentPage)?.label}
          </Typography.Title>
        </Header>
        <Content
          style={{
            padding: 24,
            background: '#f5f5f5',
            overflow: 'auto'
          }}
        >
          {renderPage()}
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
