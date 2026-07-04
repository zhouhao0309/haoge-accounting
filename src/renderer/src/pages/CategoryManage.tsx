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
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'

function CategoryManage(): JSX.Element {
  const [categories, setCategories] = useState<Category[]>([])
  const [subCategories, setSubCategories] = useState<Record<number, Category[]>>({})
  const [loading, setLoading] = useState(false)
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [currentParent, setCurrentParent] = useState<Category | null>(null)
  const [editingSub, setEditingSub] = useState<Category | null>(null)
  const [newName, setNewName] = useState('')
  const [editName, setEditName] = useState('')

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
      setAddModalVisible(false)
      setNewName('')
      loadCategories()
    } catch (err) {
      message.error('添加失败')
    }
  }

  const handleEditSub = async (): Promise<void> => {
    if (!editingSub || !editName.trim()) return
    try {
      await api.updateSubCategory(editingSub.id, editName.trim())
      message.success(`已修改为 "${editName.trim()}"`)
      setEditModalVisible(false)
      setEditingSub(null)
      setEditName('')
      loadCategories()
    } catch (err) {
      message.error('修改失败')
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
                style={{ cursor: sub.is_default ? 'default' : 'pointer' }}
                onClick={sub.is_default ? undefined : () => {
                  setEditingSub(sub)
                  setEditName(sub.name)
                  setEditModalVisible(true)
                }}
              >
                {!sub.is_default && <EditOutlined style={{ marginRight: 4, fontSize: 11 }} />}
                {sub.name}
              </Tag>
            ))}
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setCurrentParent(record)
                setAddModalVisible(true)
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
        💡 系统内置分类（灰色标签）不可修改或删除；自定义分类（蓝色标签）可点击编辑、可删除。
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
        open={addModalVisible}
        onOk={handleAddSub}
        onCancel={() => {
          setAddModalVisible(false)
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

      <Modal
        title="修改分类名称"
        open={editModalVisible}
        onOk={handleEditSub}
        onCancel={() => {
          setEditModalVisible(false)
          setEditingSub(null)
          setEditName('')
        }}
        okText="保存"
        cancelText="取消"
      >
        <Input
          placeholder="输入新名称"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          maxLength={20}
          onPressEnter={handleEditSub}
        />
      </Modal>
    </Card>
  )
}

export default CategoryManage
