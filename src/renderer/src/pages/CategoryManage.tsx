import { useState, useEffect } from 'react'
import * as api from '../api'
import {
  Card,
  Table,
  Button,
  Modal,
  Input,
  message,
  Popconfirm,
  Tag,
  Space,
  Empty
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'

function CategoryManage(): JSX.Element {
  const [categories, setCategories] = useState<Category[]>([])
  const [subCategories, setSubCategories] = useState<Record<number, Category[]>>({})
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [currentParent, setCurrentParent] = useState<Category | null>(null)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async (): Promise<void> => {
    setLoading(true)
    try {
      const cats = await api.getCategories()
      setCategories(cats)
      // 加载每个一级分类的二级分类
      const subMap: Record<number, Category[]> = {}
      for (const cat of cats) {
        subMap[cat.id] = await api.getSubCategories(cat.id)
      }
      setSubCategories(subMap)
    } catch (err) {
      message.error('加载分类失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSub = async (): Promise<void> => {
    if (!currentParent || !newName.trim()) return
    try {
      await api.addSubCategory(currentParent.id, newName.trim())
      message.success(`已添加 "${newName.trim()}"`)
      setModalVisible(false)
      setNewName('')
      loadCategories()
    } catch (err) {
      message.error('添加失败')
    }
  }

  const handleDeleteSub = async (id: number): Promise<void> => {
    try {
      await api.deleteSubCategory(id)
      message.success('已删除')
      loadCategories()
    } catch (err) {
      message.error('删除失败（可能存在关联的记账记录）')
    }
  }

  const columns = [
    {
      title: '一级分类',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record: Category) => (
        <Space>
          <span style={{ fontSize: 18 }}>{record.icon}</span>
          <strong>{name}</strong>
          <Tag color={record.is_default ? 'orange' : 'blue'}>
            {record.is_default ? '系统内置' : '自定义'}
          </Tag>
        </Space>
      )
    },
    {
      title: '二级分类',
      key: 'sub',
      render: (_: unknown, record: Category) => {
        const subs = subCategories[record.id] || []
        return (
          <Space wrap>
            {subs.map((sub) => (
              <Tag
                key={sub.id}
                closable={!sub.is_default}
                onClose={() => handleDeleteSub(sub.id)}
                color={sub.is_default ? 'default' : 'blue'}
              >
                {sub.name}
              </Tag>
            ))}
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setCurrentParent(record)
                setModalVisible(true)
              }}
            >
              添加
            </Button>
          </Space>
        )
      }
    }
  ]

  return (
    <Card className="page-card" title="分类管理">
      <p style={{ color: '#8c8c8c', marginBottom: 16 }}>
        💡 系统内置分类不可删除；你可以在一级分类下添加自定义二级分类。
      </p>
      <Table
        dataSource={categories}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
      />

      <Modal
        title={`为 "${currentParent?.name}" 添加二级分类`}
        open={modalVisible}
        onOk={handleAddSub}
        onCancel={() => {
          setModalVisible(false)
          setNewName('')
        }}
        okText="添加"
        cancelText="取消"
      >
        <Input
          placeholder="输入二级分类名称"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={20}
          onPressEnter={handleAddSub}
        />
      </Modal>
    </Card>
  )
}

export default CategoryManage
