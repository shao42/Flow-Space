# Flow Space 信箱功能规格（MVP）

**状态：** 需求已澄清（见 [requirements-decisions.md](./requirements-decisions.md)）  
**版本：** 0.1  
**日期：** 2026-05-17

---

## 1. 概述

在 Flow Space 内增加 **一对一、链接配对的异步信箱**：用户创建房间、分享链接，双方在保持 Cyber Zen 气质的面板中互发纯文本，消息保存在云端以便跨设备查看。

### 1.1 目标用户故事

1. **作为写作者**，我想把写完的一段文字寄给一位朋友，以便 TA 在同样的沉浸式界面里阅读并回复，而不必导出文件或切换微信。  
2. **作为收信人**，我想通过朋友发来的链接打开对话，看到历史消息并回复，以便延续交流。  
3. **作为注重隐私的用户**，我想知道链接等同于钥匙，并能在泄露后轮换链接作废旧地址。  
4. **作为写作者**，我希望信箱默认不打断写作，只有在主动打开 MAIL 时才处理消息。

### 1.2 非目标（MVP 不做）

- 群聊、公开广场、陌生人发现/搜索用户  
- 注册登录、OAuth、通讯录集成  
- 富文本、图片/附件、Markdown 渲染  
- 推送通知、未读角标、提示音  
- 端到端加密、内容审核后台、举报工单  
- 实时正在输入、已读回执（可 Phase 2）  
- 替代 RELEASE 或自动清空草稿  

---

## 2. 功能需求

### 2.1 房间生命周期

| ID | 需求 | 验收标准 |
|----|------|----------|
| R1 | 创建房间 | 用户点击「新建信箱」→ 生成 `roomId` + `roomSecret` → 展示可复制的完整 URL |
| R2 | 加入房间 | 持有效 URL 的第二个参与者加入后，房间状态为 `active`（2/2） |
| R3 | 房间上限 | 已有 2 个参与者时，第三打开者看到「房间已满」 |
| R4 | 轮换链接 | 任一方可「轮换链接」→ 旧 secret 失效，新 URL 可复制 |
| R5 | 房间列表 | 本地记住访问过的房间（id、备注名、最后一条预览、lastActivityAt） |

### 2.2 消息

| ID | 需求 | 验收标准 |
|----|------|----------|
| M1 | 发送 | 在房间内输入文本并发送 → 对方刷新或打开面板可见（轮询 ≤30s 或手动刷新） |
| M2 | 历史 | 按时间升序展示；进入房间拉取最近 200 条 |
| M3 | 长度 | 单条 1–20000 字符；超限禁止发送并提示 |
| M4 | 删除 | 仅可删除自己发送的消息；删除后双方列表显示「已撤回」 |
| M5 | 元数据 | 可选勾选「附带当前氛围」→ 消息带 `atmosphereMode: rain \| snow \| kk11` 只读标签 |
| M6 | 从草稿寄出 | MAIL 面板内「从编辑器寄出」→ 预填当前 `draftText` 副本，发送后不修改草稿 |

### 2.3 身份与展示

| ID | 需求 | 验收标准 |
|----|------|----------|
| I1 | 昵称 | 首次进入房间设置昵称；后续发送带该昵称快照 |
| I2 | 区分双方 | UI 用左右或对齐区分 `senderSlot` a/b |
| I3 | 本地配置 | 昵称按房间存 localStorage；换浏览器需重新设置昵称但可看历史 |

### 2.4 UI / UX

| ID | 需求 | 验收标准 |
|----|------|----------|
| U1 | 入口 | [`ChromeActions`](../../src/components/ChromeActions.tsx) 增加 `MAIL` 按钮，与 SAVE/RELEASE 并列 |
| U2 | 面板 | 侧栏/抽屉 `MailboxPanel`，可关闭；打开时不遮挡编辑器主体（宽度 ≤ 360px） |
| U3 | 视图 | 房间列表 → 房间详情（时间线 + 输入框）；空房间显示创建/粘贴链接引导 |
| U4 | 提醒 | 无全局 toast/声音；面板内显示「有新消息」仅当上次打开后 `lastSeenAt` < 最新消息时间 |
| U5 | 快捷键 | 不占用 Alt+M / Alt+F / Alt+V；可选 Alt+L 打开 MAIL（实现时文档化） |
| U6 | 错误 | 存储/API 失败时顶部横幅模式复用 `storageError` 样式 |

### 2.5 安全与合规（MVP）

| ID | 需求 | 验收标准 |
|----|------|----------|
| S1 | 链接即密钥 | 创建/分享界面明示中文警告 |
| S2 | 传输 | 全站 HTTPS；API 校验 `roomId` + `roomSecret` |
| S3 | 速率限制 | 每房间每分钟 ≤ 30 条；每 IP 每分钟创建房间 ≤ 5 次 |
| S4 | 声明 | 关于页或 MAIL 面板底部链接「使用须知」（禁止违法内容、无保证永久存储） |

---

## 3. 数据模型（逻辑）

### Room

```ts
interface Room {
  id: string;           // uuid
  secretHash: string;   // server: hash(roomSecret)
  status: 'waiting' | 'active' | 'revoked';
  participantCount: number;
  createdAt: string;
  lastActivityAt: string;
}
```

### Message

```ts
interface Message {
  id: string;
  roomId: string;
  senderSlot: 'a' | 'b';
  displayName: string;
  body: string;
  atmosphereMode?: 'rain' | 'snow' | 'kk11';
  createdAt: string;
  deletedAt?: string;
}
```

### 客户端本地（localStorage）

```ts
// flowspace:mailbox:v1:rooms
interface LocalRoomRef {
  roomId: string;
  roomSecret: string;  // 仅本地，用于 API 鉴权
  label?: string;
  lastPreview?: string;
  lastActivityAt: number;
}

// flowspace:mailbox:v1:profile:<roomId>
interface LocalProfile {
  displayName: string;
  senderSlot?: 'a' | 'b';
  lastSeenAt?: number;
}
```

---

## 4. API 概要（实现参考）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/rooms` | 创建房间，返回 `roomId`, `roomSecret` |
| POST | `/api/rooms/:id/join` | Body: `{ secret }`，分配 `senderSlot` |
| POST | `/api/rooms/:id/rotate-secret` | 鉴权后轮换 secret |
| GET | `/api/rooms/:id/messages` | Query: `secret`, `since?` |
| POST | `/api/rooms/:id/messages` | 发送消息 |
| DELETE | `/api/rooms/:id/messages/:msgId` | 软删自己的消息 |

详细选型见 [architecture-spike.md](./architecture-spike.md)。

---

## 5. 实现阶段

### Phase 0 — 技术骨架（1–2 天）

- `VITE_MAILBOX_API_URL` 环境变量  
- API 客户端模块 + 类型  
- 部署最小 API（单环境）

### Phase 1 — MVP 用户可见（3–5 天）

- R1–R5, M1–M4, I1–I3, U1–U6  
- 轮询拉取消息（30s）+ 手动刷新按钮  

### Phase 2 — 体验增强

- 已读/lastSeen、房间口令、E2E 选项  
- 魔法链接账号、云同步房间列表  
- WebSocket 或 SSE 实时推送  

### Phase 3 — 可选

- 单条阅后即焚、导出会话、定时 RELEASE→寄信向导  

---

## 6. 验收测试清单（手动）

1. A 创建房间并复制链接；B 打开链接 → 双方互发消息可见。  
2. A 在电脑、B 在手机同一链接 → 历史一致。  
3. 轮换链接后，旧链接无法拉取消息。  
4. 「从编辑器寄出」发送后，编辑器内容未变。  
5. RELEASE 仍清空草稿，与 MAIL 无关。  
6. 关闭 MAIL 面板写作，无声音/弹窗；打开 MAIL 可看到新消息。  
7. 第三人打开已满房间 → 友好错误页。  
8. 删除自己的消息后，双方见「已撤回」。  

---

## 7. 相关文档

- [requirements-decisions.md](./requirements-decisions.md) — 追问拍板记录  
- [architecture-spike.md](./architecture-spike.md) — 同步方案与部署  
