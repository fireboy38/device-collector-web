import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const device = await db.device.findUnique({
    where: { id: parseInt(id) },
    include: { department: { include: { project: true } } }
  });

  if (!device) return NextResponse.json({ error: '设备不存在' }, { status: 404 });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>设备信息报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; color: #1a1a1a; }
    h1 { font-size: 24px; border-bottom: 2px solid #059669; padding-bottom: 8px; color: #065f46; }
    h2 { font-size: 16px; margin-top: 24px; color: #059669; border-left: 3px solid #059669; padding-left: 8px; }
    .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: 200px 1fr; gap: 4px 16px; font-size: 13px; margin: 8px 0 16px; }
    .label { color: #666; font-weight: 500; }
    .value { color: #1a1a1a; word-break: break-all; }
    .mono { font-family: monospace; }
    .footer { margin-top: 40px; padding-top: 8px; border-top: 1px solid #e5e5e5; font-size: 11px; color: #999; text-align: center; }
    @media print { body { margin: 20px; } }
  </style></head><body>
  <h1>设备信息报告</h1>
  <div class="meta">报告生成时间: ${new Date().toLocaleString('zh-CN')} | 设备ID: ${device.id}</div>

  <h2>人员信息</h2>
  <div class="grid">
    <span class="label">使用人</span><span class="value">${device.userName}</span>
    <span class="label">联系电话</span><span class="value">${device.userPhone || '-'}</span>
    <span class="label">安装位置</span><span class="value">${device.userPosition || '-'}</span>
  </div>

  <h2>网络信息</h2>
  <div class="grid">
    <span class="label">电脑名称</span><span class="value">${device.computerName || '-'}</span>
    <span class="label">IP地址</span><span class="value mono">${device.ipAddress || '-'}</span>
    <span class="label">MAC地址</span><span class="value mono">${device.macAddress || '-'}</span>
    <span class="label">DHCP</span><span class="value">${device.dhcpEnabled || '-'}</span>
    <span class="label">网卡</span><span class="value">${device.networkAdapter || '-'}</span>
    <span class="label">子网掩码</span><span class="value mono">${device.subnetMask || '-'}</span>
    <span class="label">默认网关</span><span class="value mono">${device.gateway || '-'}</span>
    <span class="label">DNS服务器</span><span class="value mono">${device.dnsServers || '-'}</span>
  </div>

  <h2>硬件信息</h2>
  <div class="grid">
    <span class="label">操作系统</span><span class="value">${device.osInfo || '-'}</span>
    <span class="label">CPU</span><span class="value">${device.cpuInfo || '-'}</span>
    <span class="label">内存</span><span class="value">${device.ramInfo || '-'}</span>
    <span class="label">硬盘</span><span class="value">${device.diskInfo || '-'}</span>
    <span class="label">主板</span><span class="value">${device.motherboardInfo || '-'}</span>
    <span class="label">显卡</span><span class="value">${device.gpuInfo || '-'}</span>
  </div>

  <h2>归属信息</h2>
  <div class="grid">
    <span class="label">所属项目</span><span class="value">${device.department?.project?.name || '-'}</span>
    <span class="label">所属单位</span><span class="value">${device.department?.name || '-'}</span>
    <span class="label">采集时间</span><span class="value">${device.collectedAt ? new Date(device.collectedAt).toLocaleString('zh-CN') : '-'}</span>
  </div>

  <div class="footer">设备信息采集器 · 管理端 | Powered by Next.js</div>
  </body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
