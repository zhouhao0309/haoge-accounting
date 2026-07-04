import { useState, useEffect } from 'react'
import * as api from '../api'
import {
  Card,
  Form,
  InputNumber,
  Select,
  DatePicker,
  Input,
  Button,
  message
} from 'antd'
import dayjs from 'dayjs'

const { TextArea } = Input

interface Props {
  onSuccess?: () => void
}

function AddExpense({ onSuccess }: Props): JSX.Element {
  const [form] = Form.useForm()
  const [categories, setCategories] = useState<Category[]>([])
  const [subCategories, setSubCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async (): Promise<void> => {
    const cats = await api.getCategories()
    setCategories(cats)
  }

  const handleCategoryChange = async (categoryId: number): Promise<void> => {
    form.setFieldValue('subCategoryId', undefined)
    const subs = await api.getSubCategories(categoryId)
    setSubCategories(subs)
  }

  const handleSubmit = async (values: {
    amount: number
    categoryId: number
    subCategoryId: number
    date: dayjs.Dayjs
    note?: string
  }): Promise<void> => {
    setLoading(true)
    try {
      await api.addExpense({
        amount: values.amount,
        categoryId: values.categoryId,
        subCategoryId: values.subCategoryId,
        date: values.date.format('YYYY-MM-DD'),
        note: values.note || ''
      })
      message.success('记账成功！')
      form.resetFields()
      setSubCategories([])
      onSuccess?.()
    } catch (err) {
      message.error('记账失败，请重试')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="page-card" style={{ maxWidth: 600, margin: '0 auto' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ date: dayjs() }}
      >
        <Form.Item
          name="amount"
          label="金额（元）"
          rules={[{ required: true, message: '请输入金额' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="请输入花销金额"
            min={0.01}
            max={999999.99}
            precision={2}
            size="large"
            prefix="¥"
          />
        </Form.Item>

        <Form.Item
          name="categoryId"
          label="支出分类"
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <Select
            placeholder="选择一级分类"
            onChange={handleCategoryChange}
            size="large"
            options={categories.map((c) => ({
              value: c.id,
              label: `${c.icon} ${c.name}`
            }))}
          />
        </Form.Item>

        <Form.Item
          name="subCategoryId"
          label="支出子分类"
          rules={[{ required: true, message: '请选择子分类' }]}
        >
          <Select
            placeholder="选择二级分类"
            size="large"
            disabled={subCategories.length === 0}
            options={subCategories.map((c) => ({
              value: c.id,
              label: c.name
            }))}
          />
        </Form.Item>

        <Form.Item
          name="date"
          label="日期"
          rules={[{ required: true, message: '请选择日期' }]}
        >
          <DatePicker style={{ width: '100%' }} size="large" />
        </Form.Item>

        <Form.Item name="note" label="备注（可选）">
          <TextArea
            placeholder="记录这笔花销的详情..."
            rows={3}
            maxLength={200}
            showCount
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            size="large"
            block
          >
            记一笔 ✍️
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default AddExpense
