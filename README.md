# Device Collector - 设备信息采集管理系统

一个基于 Next.js 16 构建的全功能设备信息采集与管理平台，支持多项目管理、设备信息采集、IP地址分布可视化、数据导入导出等功能。

## ✨ 功能特性

### 核心功能
- **多项目管理** - 支持创建和管理多个采集项目，独立数据隔离
- **设备信息采集** - 采集电脑硬件、网络、人员等详细信息
- **IP 地址分布图** - 可视化展示子网 IP 使用情况
- **数据导入导出** - 支持 CSV/XLSX 格式导出，CSV 批量导入
- **数据备份恢复** - 全库 JSON 备份与一键恢复
- **日志审计** - 完整的操作日志记录与查询
- **API Key 管理** - 支持只读/读写权限的 API 密钥管理

### 管理功能
- **用户管理** - 多用户支持，admin/user 角色权限控制
- **单位管理** - 支持按项目分组管理单位/部门
- **仪表盘** - 数据统计、设备分布图表、采集趋势、硬件分析
- **系统设置** - 备份恢复、系统信息、快捷操作

### UI/UX
- 🌙 深色/浅色模式切换
- 📱 响应式设计，移动端侧边栏导航
- 🔔 通知铃铛，实时系统通知
- 🎨 微交互动画，流畅的用户体验
- 🖨️ 打印优化样式

## 🛠️ 技术栈

| 技术 | 说明 |
|------|------|
| **Next.js 16** | React 全栈框架 (App Router) |
| **TypeScript** | 类型安全 |
| **Tailwind CSS 4** | 原子化 CSS |
| **shadcn/ui** | UI 组件库 |
| **Prisma** | ORM (SQLite) |
| **Recharts** | 数据可视化图表 |
| **TanStack Query** | 服务端状态管理 |
| **next-themes** | 主题切换 |

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

#### 使用 Docker Compose

```bash
# 克隆仓库
git clone https://github.com/fireboy38/device-collector-web.git
cd device-collector-web

# 一键启动
docker compose up -d

# 查看日志
docker compose logs -f
```

应用将在 `http://localhost:3000` 启动。

#### 使用 Docker 命令

```bash
# 构建镜像
docker build -t device-collector .

# 运行容器
docker run -d \
  --name device-collector \
  -p 3000:3000 \
  -v device-collector-data:/app/data \
  -e NEXTAUTH_SECRET=your-random-secret-here \
  -e NEXTAUTH_URL=http://localhost:3000 \
  device-collector
```

#### 环境变量说明

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | `file:./data/device-collector.db` | SQLite 数据库路径 |
| `NEXTAUTH_SECRET` | - | NextAuth 加密密钥（生产环境必填） |
| `NEXTAUTH_URL` | `http://localhost:3000` | 应用访问地址 |

### 方式二：本地开发

#### 前置要求

- **Node.js** >= 18
- **Bun** (推荐) 或 npm/yarn/pnpm

#### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/fireboy38/device-collector-web.git
cd device-collector-web

# 安装依赖
bun install

# 初始化数据库
bun run db:push

# 启动开发服务器
bun run dev
```

开发服务器将在 `http://localhost:3000` 启动。

#### 生产构建

```bash
# 构建
bun run build

# 启动生产服务器
bun run start
```

## 🔑 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | 123456 | 管理员 |

> ⚠️ 首次登录后请立即修改默认密码！

## 📁 项目结构

```
├── prisma/
│   └── schema.prisma          # 数据库模型定义
├── src/
│   ├── app/
│   │   ├── api/               # API 路由
│   │   │   ├── backup/        # 数据备份恢复
│   │   │   ├── devices/       # 设备管理 API
│   │   │   ├── departments/   # 单位管理 API
│   │   │   ├── projects/      # 项目管理 API
│   │   │   ├── users/         # 用户管理 API
│   │   │   ├── apikeys/       # API Key 管理
│   │   │   ├── logs/          # 日志查询 API
│   │   │   ├── stats/         # 统计数据 API
│   │   │   ├── device-analytics/ # 设备分析 API
│   │   │   ├── system-info/   # 系统信息 API
│   │   │   └── ...
│   │   ├── globals.css        # 全局样式
│   │   ├── layout.tsx         # 根布局
│   │   └── page.tsx           # 主页面
│   ├── components/
│   │   ├── tabs/              # 各功能标签页组件
│   │   │   ├── dashboard-tab.tsx
│   │   │   ├── devices-tab.tsx
│   │   │   ├── projects-tab.tsx
│   │   │   ├── users-tab.tsx
│   │   │   ├── departments-tab.tsx
│   │   │   ├── ipmap-tab.tsx
│   │   │   ├── logs-tab.tsx
│   │   │   ├── apikeys-tab.tsx
│   │   │   └── settings-tab.tsx
│   │   ├── ui/                # shadcn/ui 组件
│   │   ├── shared/            # 共享组件
│   │   ├── login-page.tsx     # 登录页面
│   │   └── query-provider.tsx # React Query Provider
│   ├── lib/
│   │   ├── db.ts              # 数据库客户端
│   │   ├── session.ts         # 会话管理
│   │   ├── api-auth.ts        # API 认证中间件
│   │   ├── types.ts           # 类型定义
│   │   └── utils.ts           # 工具函数
│   ├── hooks/                 # 自定义 Hooks
│   └── store/                 # 状态管理
├── Dockerfile                 # Docker 构建文件
├── docker-compose.yml         # Docker Compose 配置
└── package.json
```

## 🔌 API 接口

### 认证相关
- `POST /api/login` - 用户登录
- `POST /api/logout` - 退出登录
- `GET /api/current-user` - 获取当前用户
- `POST /api/change-password` - 修改密码

### 项目管理
- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建项目（管理员）
- `PUT /api/projects/[id]` - 更新项目（管理员）
- `DELETE /api/projects/[id]` - 删除项目（管理员）

### 设备管理
- `GET /api/devices` - 获取设备列表
- `POST /api/devices` - 提交设备信息
- `PUT /api/devices/[id]` - 更新设备信息
- `DELETE /api/devices/[id]` - 删除设备
- `GET /api/devices/export` - 导出设备（CSV/XLSX）
- `POST /api/devices/batch` - 批量导入设备
- `POST /api/devices/check-duplicates` - 查重检查

### 其他接口
- `GET /api/stats` - 统计数据
- `GET /api/device-analytics` - 设备分析数据
- `GET /api/system-info` - 系统信息（管理员）
- `GET /api/backup` - 数据备份（管理员）
- `POST /api/backup` - 数据恢复（管理员）
- 更多接口请查看 `src/app/api/` 目录

## 📊 数据模型

- **Project** - 项目
- **User** - 用户
- **Department** - 单位/部门
- **Device** - 设备（含人员、网络、硬件信息）
- **Log** - 操作日志
- **ApiKey** - API 密钥

## 🐳 Docker 常用命令

```bash
# 构建并启动
docker compose up -d --build

# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f device-collector

# 停止服务
docker compose down

# 停止并删除数据卷
docker compose down -v

# 重新构建
docker compose build --no-cache
```

## 📝 数据备份与恢复

### 通过 Web 界面
1. 登录管理员账号
2. 进入「系统设置」标签页
3. 在「数据备份」区域点击下载按钮
4. 在「数据恢复」区域上传备份文件

### 通过 API
```bash
# 备份
curl -o backup.json http://localhost:3000/api/backup \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# 恢复
curl -X POST http://localhost:3000/api/backup \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d @backup.json
```

## 🔒 安全说明

- 所有写操作 API 需要认证
- 管理员操作需要 admin 角色
- 密码修改需验证旧密码
- API Key 支持只读/读写权限控制
- 生产环境请务必修改 `NEXTAUTH_SECRET`

## 📄 License

MIT

## 🙏 致谢

- 原始项目：[device-collector](https://github.com/fireboy38/device-collector)
- UI 组件：[shadcn/ui](https://ui.shadcn.com/)
- 图标：[Lucide](https://lucide.dev/)
