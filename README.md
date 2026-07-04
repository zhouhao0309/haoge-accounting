# 💰 浩哥记账

跨平台桌面记账应用，帮你轻松管理日常开支。

## ✨ 功能

- 📝 **记一笔**：快速记录每笔花销（金额、分类、日期、备注）
- 📋 **账单列表**：按时间查看所有记录，支持筛选和搜索
- 📊 **月度统计**：按月查看总支出和各分类消费排行
- 🗂️ **分类管理**：10 个一级大类 + 50+ 个二级小类，支持自定义

## 🖥️ 运行环境

| 平台 | 支持 |
|------|------|
| Windows 10/11 | ✅ |
| macOS | ✅（待测试） |

## 🚀 快速开始

### 开发环境要求

- Node.js 24+
- Rust 1.96+

### 启动开发模式

```bash
cd haoge-accounting
npm install
npx tauri dev
```

### 打包发布

```bash
npx tauri build
```

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2 |
| 前端 | React 18 + TypeScript |
| UI 组件 | Ant Design 5 |
| 后端 | Rust |
| 数据存储 | JSON 文件（本地） |

## 📁 项目结构

```
├── src/                    # React 前端源码
│   └── renderer/src/
│       ├── pages/          # 4 个页面组件
│       ├── api.ts          # Tauri 后端 API 封装
│       └── App.tsx         # 主布局
├── src-tauri/              # Rust 后端源码
│   └── src/lib.rs          # 所有后端逻辑 + 数据库
├── CLAUDE.md               # 项目详细文档
└── package.json
```

## 👤 作者

周浩 · 2026
