// ===== Shared Types =====
export interface Project {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  createdAt: string;
  userCount?: number;
  deptCount?: number;
  deviceCount?: number;
}

export interface User {
  id: number;
  username: string;
  displayName: string | null;
  projectId: number | null;
  projectName: string | null;
  role: string;
  createdAt: string;
}

export interface Department {
  id: number;
  projectId: number;
  projectName: string | null;
  name: string;
  code: string | null;
  description: string | null;
  createdAt: string;
}

export interface Device {
  id: number;
  departmentId: number;
  departmentName: string | null;
  departmentCode: string | null;
  projectId: number | null;
  projectName: string | null;
  userName: string;
  userPhone: string | null;
  userPosition: string | null;
  computerName: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  dhcpEnabled: string | null;
  osInfo: string | null;
  cpuInfo: string | null;
  ramInfo: string | null;
  diskInfo: string | null;
  motherboardInfo: string | null;
  gpuInfo: string | null;
  networkAdapter: string | null;
  subnetMask: string | null;
  gateway: string | null;
  dnsServers: string | null;
  collectedAt: string;
}

export interface LogEntry {
  id: number;
  logType: string;
  content: string;
  detail: string | null;
  operator: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface ApiKeyItem {
  id: number;
  name: string;
  apiKey: string;
  description: string | null;
  permissions: string;
  isActive: number;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface Stats {
  deviceCount: number;
  todayCount: number;
  projectCount: number;
  deptCount: number;
  userCount: number;
  projectStats: {
    id: number;
    name: string;
    code: string | null;
    deviceCount: number;
    deptCount: number;
  }[];
  recentDevices: {
    id: number;
    userName: string;
    computerName: string | null;
    ipAddress: string | null;
    projectName: string | null;
    departmentName: string | null;
    collectedAt: string;
  }[];
  trendData?: TrendData[];
}

export interface TrendData {
  date: string;
  count: number;
}

export const CHART_COLORS = ['#059669', '#0d9488', '#0891b2', '#0284c7', '#7c3aed', '#c026d3', '#e11d48', '#ea580c'];

// ===== Helpers =====
export function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString('zh-CN');
}
