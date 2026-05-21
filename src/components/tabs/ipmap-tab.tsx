'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Device, Project, Department, CHART_COLORS, formatDate, formatShortDate } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Monitor, Pencil, Trash2, Eye, AlertTriangle, Search, Download, Upload, RefreshCw,
  CheckCircle2, XCircle, Copy, Loader2, ChevronLeft, ChevronRight,
  Server, Cpu, HardDrive, Network, Wifi, Users, Globe, FileText, KeyRound, Plus } from 'lucide-react';

export function IpMapTab() {
  const { data: devices } = useQuery<Device[]>({ queryKey: ['devices'], queryFn: () => fetch('/api/devices').then(r => r.json()) });
  const [subnet, setSubnet] = useState('');
  const [hoveredIp, setHoveredIp] = useState<{ ip: string; x: number; y: number; device?: Device } | null>(null);

  // Extract subnets from device IPs
  const subnets = new Map<string, number>();
  devices?.forEach(d => {
    if (d.ipAddress && d.ipAddress !== '未知' && d.ipAddress !== '0.0.0.0') {
      const parts = d.ipAddress.split('.');
      if (parts.length === 4) {
        const sn = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
        subnets.set(sn, (subnets.get(sn) || 0) + 1);
      }
    }
  });

  const subnetList = Array.from(subnets.entries()).sort((a, b) => b[1] - a[1]);
  const selectedSubnet = subnet || subnetList[0]?.[0] || '';
  const subnetPrefix = selectedSubnet.replace('.0/24', '');

  // Build IP map
  const ipMap = new Map<string, Device>();
  devices?.forEach(d => {
    if (d.ipAddress && d.ipAddress !== '未知' && d.ipAddress !== '0.0.0.0') {
      ipMap.set(d.ipAddress, d);
    }
  });

  const usedInSubnet = devices?.filter(d => d.ipAddress?.startsWith(subnetPrefix)).length || 0;
  const totalInSubnet = 254;
  const usagePercent = Math.round((usedInSubnet / totalInSubnet) * 100);

  // Calculate gradient color for used IPs based on index
  const getUsedColor = (host: number) => {
    // Alternate between emerald-400 and emerald-600 for visual variety
    return host % 2 === 0 ? 'bg-emerald-500' : 'bg-emerald-600';
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">IP 地址使用分布</h2>
        <Select value={selectedSubnet} onValueChange={setSubnet}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="-- 选择网段 --" /></SelectTrigger>
          <SelectContent>
            {subnetList.map(([sn, count]) => <SelectItem key={sn} value={sn}>{sn} ({count} 台)</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedSubnet && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">已使用</p>
                  <p className="text-xl font-bold text-emerald-700 tabular-nums">{usedInSubnet}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
                  <Server className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">可用</p>
                  <p className="text-xl font-bold tabular-nums">{totalInSubnet - usedInSubnet}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">使用率</p>
                  <p className="text-sm font-bold text-emerald-700 tabular-nums">{usagePercent}%</p>
                </div>
                <Progress value={usagePercent} className="h-2" />
              </CardContent>
            </Card>
          </div>

          {/* IP Grid */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-8 sm:grid-cols-16 lg:grid-cols-32 gap-1">
                {Array.from({ length: 254 }, (_, i) => i + 1).map(host => {
                  const ip = `${subnetPrefix}.${host}`;
                  const device = ipMap.get(ip);
                  return (
                    <div
                      key={host}
                      className={`aspect-square rounded-sm flex items-center justify-center text-[8px] sm:text-[10px] cursor-pointer transition-all duration-150 hover:scale-125 hover:z-10 hover:shadow-md ${device ? `${getUsedColor(host)} text-white` : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = rect.right + window.scrollX + 8;
                        const y = rect.top + window.scrollY;
                        setHoveredIp({ ip, x, y, device });
                      }}
                      onMouseLeave={() => setHoveredIp(null)}
                    >
                      {host}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-6 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-emerald-400 to-emerald-600" />
                  <span>已使用</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200" />
                  <span>未使用</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Tooltip - Fixed positioning */}
      {hoveredIp && (
        <div
          className="fixed bg-popover border rounded-lg shadow-xl p-3 text-xs z-[100] max-w-[280px] pointer-events-none"
          style={{
            left: Math.min(hoveredIp.x, window.innerWidth - 300),
            top: Math.min(hoveredIp.y, window.innerHeight - 200),
          }}
        >
          <p className="font-mono font-semibold mb-1.5 text-emerald-700">{hoveredIp.ip}</p>
          {hoveredIp.device ? (
            <div className="space-y-1">
              <div className="flex gap-1"><span className="text-muted-foreground">使用人:</span><span className="font-medium">{hoveredIp.device.userName}</span></div>
              <div className="flex gap-1"><span className="text-muted-foreground">电脑:</span><span className="font-mono">{hoveredIp.device.computerName || '-'}</span></div>
              <div className="flex gap-1"><span className="text-muted-foreground">MAC:</span><span className="font-mono">{hoveredIp.device.macAddress || '-'}</span></div>
              <div className="flex gap-1"><span className="text-muted-foreground">单位:</span><span>{hoveredIp.device.departmentName || '-'}</span></div>
            </div>
          ) : <p className="text-muted-foreground">未分配</p>}
        </div>
      )}

      {!selectedSubnet && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>暂无IP地址数据，请先添加设备信息</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
