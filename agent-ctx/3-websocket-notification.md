# Task 3: WebSocket Real-Time Notification Service

## Work Summary

Added a complete real-time notification system using Socket.io so that when a device is submitted/edited/deleted, or a user logs in, all connected admin dashboards instantly show a notification toast and update the notification bell count.

## Changes Made

### 1. WebSocket Mini-Service (`/mini-services/notification-service/`)

- **package.json**: Created with socket.io and cors dependencies, dev script using `bun --hot`
- **index.ts**: Socket.io server on port 3003
  - Uses default socket.io path (`/socket.io/`) to avoid conflict with REST endpoints
  - Listens for client connections with logging
  - Handles `subscribe` event (client joins a room based on role)
  - REST endpoint `POST /notify` that broadcasts to all connected clients
  - The REST endpoint accepts `{ type, title, message, data? }` and adds timestamp
  - CORS enabled for all origins
  - Connection/disconnection logging
  - Graceful shutdown handlers for SIGTERM/SIGINT

### 2. WebSocket Notify Helper (`/src/lib/ws-notify.ts`)

- Simple async function `wsNotify(type, title, message, data?)`
- Makes a fetch to `http://localhost:3003/notify` with the notification payload
- Silently catches errors if the WebSocket service is not running
- Non-blocking (fire-and-forget pattern)

### 3. API Route Integration

Modified 4 API routes to emit real-time notifications after successful operations:

- **`/api/devices/route.ts` POST**: After creating a device, notifies with:
  - `{ type: 'device_submit', title: '新设备提交', message: '用户XXX提交了设备XXX' }`

- **`/api/devices/[id]/route.ts` PUT**: After editing a device, notifies with:
  - `{ type: 'device_edit', title: '设备信息更新', message: '设备XXX已更新' }`

- **`/api/devices/[id]/route.ts` DELETE**: After deleting a device, notifies with:
  - `{ type: 'device_delete', title: '设备已删除', message: '设备XXX已删除' }`

- **`/api/login/route.ts` POST**: After successful login, notifies with:
  - `{ type: 'user_login', title: '用户登录', message: '用户XXX已登录' }`

### 4. Frontend Socket.io Client Integration (`/src/app/page.tsx`)

- Installed `socket.io-client` package
- Added `io as socketIo` import from `socket.io-client`
- Added `Wifi` and `WifiOff` icons from lucide-react
- Added `wsConnected` state and `socketRef` ref for socket instance
- Added WebSocket useEffect that:
  - Connects to `io('/?XTransformPort=3003')` when user is logged in
  - Emits `subscribe` event with role and userId on connection
  - Listens for `notification` events
  - When notification arrives:
    - Shows appropriate toast (success/info/warning) based on type
    - Prepends the new notification to the notifications state
    - Increments unreadCount
    - Invalidates relevant queries (stats, devices, logs) for data refresh
  - Disconnects on logout or unmount

### 5. Real-Time Connection Indicator

- **Bell button**: Added a small green dot with `animate-pulse` when connected, red dot when disconnected (bottom-left of bell icon)
- **Notification panel header**: Added "实时" (green Wifi badge) when connected, "离线" (red WifiOff badge) when disconnected
- Unread count badge now has amber color scheme (was emerald) for visual distinction

## Technical Notes

- The WebSocket service is **optional** - if it's not running, the app works fine (wsNotify helper silently catches errors)
- The notification service uses the default socket.io path (`/socket.io/`) instead of `/` to avoid conflicts with the REST `/notify` endpoint
- Frontend connects via `io('/?XTransformPort=3003')` which works with Caddy gateway
- The service auto-starts with `bun --hot` for development with auto-reload

## How to Start the Notification Service

```bash
cd /home/z/my-project/mini-services/notification-service
bun install
bun run dev
```

Or directly:
```bash
/usr/local/bin/bun /home/z/my-project/mini-services/notification-service/index.ts
```

## Lint Status
- All lint checks pass with zero errors
