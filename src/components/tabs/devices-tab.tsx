'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Device, LogEntry, ApiKeyItem, Project, Department, CHART_COLORS, formatDate, formatShortDate } from '@/lib/types';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Monitor, Pencil, Trash2, Eye, AlertTriangle, Search, Download, Upload, RefreshCw,
  CheckCircle2, XCircle, Copy, Loader2, ChevronLeft, ChevronRight,
  Server, Cpu, HardDrive, Network, Wifi, Users, Globe, FileText, KeyRound, Plus, ChevronDown,
  Filter, X, SlidersHorizontal, Printer } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function DevicesTab() {
  const qc = useQueryClient();
  const [filterProject, setFilterProject] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [keyword, setKeyword] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPrintReport, setShowPrintReport] = useState(false);
  const [filterOs, setFilterOs] = useState('');
  const [filterDhcp, setFilterDhcp] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const { data: projects } = useQuery<Project[]>({ queryKey: ['projects'], queryFn: () => fetch('/api/projects').then(r => r.json()) });
  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments', filterProject],
    queryFn: () => fetch(`/api/departments${filterProject && filterProject !== 'all' ? `?project_id=${filterProject}` : ''}`).then(r => r.json()),
    enabled: !!filterProject && filterProject !== 'all',
  });
  const { data: devices, isLoading } = useQuery<Device[]>({
    queryKey: ['devices', filterProject, filterDept, keyword, filterOs, filterDhcp, filterDateFrom, filterDateTo],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterProject && filterProject !== 'all') params.set('project_id', filterProject);
      if (filterDept && filterDept !== 'all') params.set('department_id', filterDept);
      if (keyword) params.set('keyword', keyword);
      if (filterOs) params.set('os', filterOs);
      if (filterDhcp) params.set('dhcp', filterDhcp);
      if (filterDateFrom) params.set('date_from', filterDateFrom);
      if (filterDateTo) params.set('date_to', filterDateTo);
      return fetch(`/api/devices?${params}`).then(r => r.json());
    },
  });

  const [viewDevice, setViewDevice] = useState<Device | null>(null);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [deleteItem, setDeleteItem] = useState<Device | null>(null);
  const [dupResult, setDupResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // Batch import state
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [batchProjectId, setBatchProjectId] = useState('');
  const [batchDeptId, setBatchDeptId] = useState('');
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchImporting, setBatchImporting] = useState(false);
  const [batchResult, setBatchResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch import departments query
  const { data: batchDepartments } = useQuery<Department[]>({
    queryKey: ['departments', batchProjectId],
    queryFn: () => fetch(`/api/departments?project_id=${batchProjectId}`).then(r => r.json()),
    enabled: !!batchProjectId && batchProjectId !== 'all',
  });

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    try {
      await fetch(`/api/devices/${deleteItem.id}`, { method: 'DELETE' });
      toast.success('删除成功');
      qc.invalidateQueries({ queryKey: ['devices'] });
      setDeleteItem(null);
    } catch { toast.error('删除失败'); } finally { setSaving(false); }
  };

  const handleEditSave = async () => {
    if (!editDevice) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/devices/${editDevice.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('更新成功');
      qc.invalidateQueries({ queryKey: ['devices'] });
      setEditDevice(null);
    } catch { toast.error('更新失败'); } finally { setSaving(false); }
  };

  const checkDuplicates = async () => {
    try {
      const res = await fetch('/api/devices/check-duplicates');
      const data = await res.json();
      setDupResult(data);
      if (data.totalDuplicateDevices === 0) toast.success('未发现重复设备');
    } catch { toast.error('查重失败'); }
  };

  const handleBatchImport = async () => {
    if (!batchProjectId || !batchDeptId) {
      toast.error('请选择项目和单位');
      return;
    }
    if (!batchFile) {
      toast.error('请选择CSV文件');
      return;
    }

    setBatchImporting(true);
    setBatchResult(null);
    try {
      const text = await batchFile.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) {
        toast.error('CSV文件至少需要包含标题行和一行数据');
        setBatchImporting(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const devices = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: any = { departmentId: batchDeptId };
        headers.forEach((h, idx) => {
          const key = h;
          row[key] = values[idx] || '';
        });
        devices.push(row);
      }

      const res = await fetch('/api/devices/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); setBatchImporting(false); return; }
      setBatchResult(data);
      qc.invalidateQueries({ queryKey: ['devices'] });
      toast.success(`导入完成：成功 ${data.created} 台，跳过 ${data.skipped} 台`);
    } catch { toast.error('导入失败'); } finally { setBatchImporting(false); }
  };

  // Count active filters
  const activeFilterCount = [filterOs, filterDhcp, filterDateFrom, filterDateTo].filter(Boolean).length;

  const clearAdvancedFilters = () => {
    setFilterOs('');
    setFilterDhcp('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const deviceFields = [
    { key: 'departmentId', label: '所属单位ID', type: 'number' },
    { key: 'userName', label: '使用人' }, { key: 'userPhone', label: '联系电话' }, { key: 'userPosition', label: '安装位置' },
    { key: 'computerName', label: '电脑名称' }, { key: 'ipAddress', label: 'IP地址' }, { key: 'macAddress', label: 'MAC地址' },
    { key: 'dhcpEnabled', label: 'DHCP' }, { key: 'osInfo', label: '操作系统' }, { key: 'cpuInfo', label: 'CPU' },
    { key: 'ramInfo', label: '内存' }, { key: 'diskInfo', label: '硬盘' }, { key: 'motherboardInfo', label: '主板' },
    { key: 'gpuInfo', label: '显卡' }, { key: 'networkAdapter', label: '网卡' }, { key: 'subnetMask', label: '子网掩码' },
    { key: 'gateway', label: '默认网关' }, { key: 'dnsServers', label: 'DNS服务器' },
  ];

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-4 pb-6">
      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">项目筛选</Label>
            <Select value={filterProject} onValueChange={v => { setFilterProject(v); setFilterDept(''); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="全部项目" /></SelectTrigger>
              <SelectContent><SelectItem value="all">全部项目</SelectItem>{projects?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">单位筛选</Label>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="全部单位" /></SelectTrigger>
              <SelectContent><SelectItem value="all">全部单位</SelectItem>{departments?.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">关键词搜索</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-8 w-[200px]" placeholder="姓名/电脑名/IP/MAC" value={keyword} onChange={e => setKeyword(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={showAdvanced ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={showAdvanced ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              <SlidersHorizontal className="w-4 h-4 mr-1" />
              高级筛选
              {activeFilterCount > 0 && (
                <Badge className="ml-1.5 h-5 min-w-[20px] px-1 bg-white/20 text-white border-0 text-[10px]">{activeFilterCount}</Badge>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={checkDuplicates}><AlertTriangle className="w-4 h-4 mr-1" />查重</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />导出<ChevronDown className="w-3 h-3 ml-0.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={`/api/devices/export?format=csv${filterProject && filterProject !== 'all' ? `&project_id=${filterProject}` : ''}`} download className="cursor-pointer">
                    <FileText className="w-4 h-4 mr-2" />导出 CSV
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`/api/devices/export?format=xlsx${filterProject && filterProject !== 'all' ? `&project_id=${filterProject}` : ''}`} download className="cursor-pointer">
                    <FileText className="w-4 h-4 mr-2" />导出 XLSX
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={() => setShowPrintReport(true)}><Printer className="w-4 h-4 mr-1" />打印报告</Button>
            <Button variant="outline" size="sm" onClick={() => { setShowBatchImport(true); setBatchResult(null); setBatchFile(null); setBatchProjectId(''); setBatchDeptId(''); }}>
              <Upload className="w-4 h-4 mr-1" />批量导入
            </Button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <Filter className="w-4 h-4" />
                  高级筛选条件
                </div>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-foreground" onClick={clearAdvancedFilters}>
                    <X className="w-3 h-3 mr-1" />清除筛选
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">操作系统</Label>
                  <Select value={filterOs} onValueChange={setFilterOs}>
                    <SelectTrigger><SelectValue placeholder="全部系统" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部系统</SelectItem>
                      <SelectItem value="Windows 10">Windows 10</SelectItem>
                      <SelectItem value="Windows 11">Windows 11</SelectItem>
                      <SelectItem value="Windows 7">Windows 7</SelectItem>
                      <SelectItem value="macOS">macOS</SelectItem>
                      <SelectItem value="Linux">Linux</SelectItem>
                      <SelectItem value="麒麟">麒麟OS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">DHCP 状态</Label>
                  <Select value={filterDhcp} onValueChange={setFilterDhcp}>
                    <SelectTrigger><SelectValue placeholder="全部" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="是">DHCP 启用</SelectItem>
                      <SelectItem value="否">DHCP 禁用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">采集日期 (起始)</Label>
                  <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">采集日期 (截止)</Label>
                  <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="text-sm" />
                </div>
              </div>
              {/* Active filter tags */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-emerald-200/50 dark:border-emerald-800/50">
                  {filterOs && filterOs !== 'all' && (
                    <Badge variant="secondary" className="text-[10px] gap-1 pr-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                      系统: {filterOs}
                      <button onClick={() => setFilterOs('')} className="hover:bg-emerald-200 dark:hover:bg-emerald-800/50 rounded p-0.5"><X className="w-3 h-3" /></button>
                    </Badge>
                  )}
                  {filterDhcp && filterDhcp !== 'all' && (
                    <Badge variant="secondary" className="text-[10px] gap-1 pr-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                      DHCP: {filterDhcp === '是' ? '启用' : '禁用'}
                      <button onClick={() => setFilterDhcp('')} className="hover:bg-emerald-200 dark:hover:bg-emerald-800/50 rounded p-0.5"><X className="w-3 h-3" /></button>
                    </Badge>
                  )}
                  {filterDateFrom && (
                    <Badge variant="secondary" className="text-[10px] gap-1 pr-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                      从: {filterDateFrom}
                      <button onClick={() => setFilterDateFrom('')} className="hover:bg-emerald-200 dark:hover:bg-emerald-800/50 rounded p-0.5"><X className="w-3 h-3" /></button>
                    </Badge>
                  )}
                  {filterDateTo && (
                    <Badge variant="secondary" className="text-[10px] gap-1 pr-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                      至: {filterDateTo}
                      <button onClick={() => setFilterDateTo('')} className="hover:bg-emerald-200 dark:hover:bg-emerald-800/50 rounded p-0.5"><X className="w-3 h-3" /></button>
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Duplicate Results */}
      {dupResult && dupResult.totalDuplicateDevices > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-700 mb-2"><AlertTriangle className="w-5 h-5" /><span className="font-semibold">发现重复设备</span></div>
            <p className="text-sm text-amber-600">IP重复: {dupResult.ipDuplicateCount} 组, MAC重复: {dupResult.macDuplicateCount} 组, 涉及设备: {dupResult.totalDuplicateDevices} 台</p>
            <Button variant="outline" size="sm" className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => setDupResult(null)}>关闭</Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-12">ID</TableHead>
                <TableHead>所属项目</TableHead>
                <TableHead>所属单位</TableHead>
                <TableHead>使用人</TableHead>
                <TableHead className="hidden md:table-cell">电话</TableHead>
                <TableHead>电脑名称</TableHead>
                <TableHead>IP地址</TableHead>
                <TableHead className="hidden lg:table-cell">MAC地址</TableHead>
                <TableHead>DHCP</TableHead>
                <TableHead className="hidden lg:table-cell">采集时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {devices?.map(d => (
                  <TableRow key={d.id} className="table-row-hover">
                    <TableCell>{d.id}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{d.projectName || '-'}</Badge></TableCell>
                    <TableCell className="text-sm">{d.departmentName || '-'}</TableCell>
                    <TableCell className="font-medium">{d.userName}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{d.userPhone || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{d.computerName || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{d.ipAddress || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-xs">{d.macAddress || '-'}</TableCell>
                    <TableCell><Badge className={d.dhcpEnabled === '是' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'} variant="outline">{d.dhcpEnabled || '-'}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(d.collectedAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewDevice(d)} title="查看详情"><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          setEditForm({
                            departmentId: String(d.departmentId), userName: d.userName, userPhone: d.userPhone || '',
                            userPosition: d.userPosition || '', computerName: d.computerName || '', ipAddress: d.ipAddress || '',
                            macAddress: d.macAddress || '', dhcpEnabled: d.dhcpEnabled || '', osInfo: d.osInfo || '',
                            cpuInfo: d.cpuInfo || '', ramInfo: d.ramInfo || '', diskInfo: d.diskInfo || '',
                            motherboardInfo: d.motherboardInfo || '', gpuInfo: d.gpuInfo || '', networkAdapter: d.networkAdapter || '',
                            subnetMask: d.subnetMask || '', gateway: d.gateway || '', dnsServers: d.dnsServers || '',
                          });
                          setEditDevice(d);
                        }} title="编辑"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setDeleteItem(d)} title="删除"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!devices || devices.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={11} className="py-12">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Monitor className="w-10 h-10 text-muted-foreground/30" />
                        <p className="text-sm font-medium">暂无设备</p>
                        <p className="text-xs text-muted-foreground">可通过批量导入或API提交添加设备</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Detail Dialog */}
      <Dialog open={!!viewDevice} onOpenChange={v => !v && setViewDevice(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-emerald-600" />
              设备详细信息
            </DialogTitle>
          </DialogHeader>
          {viewDevice && (
            <div className="space-y-4">
              {/* Header Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{viewDevice.projectName || '未知项目'}</Badge>
                <Badge variant="outline">{viewDevice.departmentName || '未知单位'}</Badge>
                <Badge variant="secondary" className="text-xs">{formatDate(viewDevice.collectedAt)}</Badge>
              </div>

              {/* Personnel Info */}
              <div>
                <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />人员信息</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/50 rounded-lg p-3">
                  {[['使用人', viewDevice.userName], ['联系电话', viewDevice.userPhone], ['安装位置', viewDevice.userPosition]].map(([l, v]) => (
                    <div key={String(l)}><p className="text-xs text-muted-foreground">{String(l)}</p><p className="text-sm font-medium">{v || '-'}</p></div>
                  ))}
                </div>
              </div>

              {/* Network Info */}
              <div>
                <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5" />网络信息</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/50 rounded-lg p-3">
                  {[
                    ['IP地址', viewDevice.ipAddress, true], ['MAC地址', viewDevice.macAddress, true],
                    ['DHCP', viewDevice.dhcpEnabled, false], ['网卡', viewDevice.networkAdapter, false],
                    ['子网掩码', viewDevice.subnetMask, true], ['默认网关', viewDevice.gateway, true],
                    ['DNS服务器', viewDevice.dnsServers, true],
                  ].map(([l, v, mono]) => (
                    <div key={String(l)}><p className="text-xs text-muted-foreground">{String(l)}</p><p className={`text-sm font-medium break-all ${mono ? 'font-mono' : ''}`}>{v || '-'}</p></div>
                  ))}
                </div>
              </div>

              {/* Hardware Info */}
              <div>
                <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" />硬件信息</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/50 rounded-lg p-3">
                  {[
                    ['电脑名称', viewDevice.computerName], ['操作系统', viewDevice.osInfo],
                    ['CPU', viewDevice.cpuInfo], ['内存', viewDevice.ramInfo],
                    ['硬盘', viewDevice.diskInfo], ['主板', viewDevice.motherboardInfo],
                    ['显卡', viewDevice.gpuInfo],
                  ].map(([l, v]) => (
                    <div key={String(l)}><p className="text-xs text-muted-foreground">{String(l)}</p><p className="text-sm font-medium break-all">{v || '-'}</p></div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDevice} onOpenChange={v => !v && setEditDevice(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-emerald-600" />
              编辑设备信息
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Personnel */}
            <div>
              <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />人员信息</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {deviceFields.filter(f => ['userName', 'userPhone', 'userPosition'].includes(f.key)).map(f => (
                  <div key={f.key} className="space-y-1"><Label className="text-xs">{f.label}</Label><Input value={editForm[f.key] || ''} onChange={e => setEditForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))} /></div>
                ))}
              </div>
            </div>
            {/* Network */}
            <div>
              <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5" />网络信息</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {deviceFields.filter(f => ['computerName', 'ipAddress', 'macAddress', 'dhcpEnabled', 'networkAdapter', 'subnetMask', 'gateway', 'dnsServers'].includes(f.key)).map(f => (
                  <div key={f.key} className="space-y-1"><Label className="text-xs">{f.label}</Label><Input value={editForm[f.key] || ''} onChange={e => setEditForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))} className={(['ipAddress', 'macAddress', 'subnetMask', 'gateway', 'dnsServers'].includes(f.key)) ? 'font-mono' : ''} /></div>
                ))}
              </div>
            </div>
            {/* Hardware */}
            <div>
              <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" />硬件信息</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {deviceFields.filter(f => ['osInfo', 'cpuInfo', 'ramInfo', 'diskInfo', 'motherboardInfo', 'gpuInfo'].includes(f.key)).map(f => (
                  <div key={f.key} className="space-y-1"><Label className="text-xs">{f.label}</Label><Input value={editForm[f.key] || ''} onChange={e => setEditForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))} /></div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDevice(null)}>取消</Button>
            <Button onClick={handleEditSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Import Dialog */}
      <Dialog open={showBatchImport} onOpenChange={v => { if (!v) setShowBatchImport(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              批量导入设备
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>所属项目 *</Label>
                <Select value={batchProjectId} onValueChange={v => { setBatchProjectId(v); setBatchDeptId(''); }}>
                  <SelectTrigger><SelectValue placeholder="选择项目" /></SelectTrigger>
                  <SelectContent>{projects?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>所属单位 *</Label>
                <Select value={batchDeptId} onValueChange={setBatchDeptId}>
                  <SelectTrigger><SelectValue placeholder="选择单位" /></SelectTrigger>
                  <SelectContent>{batchDepartments?.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>CSV 文件</Label>
              <div className="flex items-center gap-3">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={e => setBatchFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                CSV 格式：首行为标题行，需包含 userName, computerName, ipAddress, macAddress 等字段
              </p>
            </div>

            {/* Batch Result */}
            {batchResult && (
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="w-4 h-4" /><span className="font-semibold text-sm">导入结果</span></div>
                  <p className="text-sm">成功导入: <strong className="text-emerald-700">{batchResult.created}</strong> 台</p>
                  <p className="text-sm">跳过: <strong className="text-amber-600">{batchResult.skipped}</strong> 台</p>
                  {batchResult.errors?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">错误详情：</p>
                      <ScrollArea className="max-h-24">
                        {batchResult.errors.map((err: string, i: number) => (
                          <p key={i} className="text-xs text-red-600">{err}</p>
                        ))}
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowBatchImport(false)}>关闭</Button>
            <Button onClick={handleBatchImport} disabled={batchImporting || !batchProjectId || !batchDeptId || !batchFile} className="bg-emerald-600 hover:bg-emerald-700">
              {batchImporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
              开始导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)} title="删除设备" message={`确定要删除设备"${deleteItem?.computerName || deleteItem?.id}"吗？`} onConfirm={handleDelete} loading={saving} />

      {/* Print Report Dialog */}
      <Dialog open={showPrintReport} onOpenChange={setShowPrintReport}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-600" />
              设备信息报告
            </DialogTitle>
          </DialogHeader>
          <div id="print-report" className="space-y-4 print-area">
            {/* Report Header */}
            <div className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">设备信息采集报告</h2>
                  <p className="text-xs text-muted-foreground mt-1">生成时间：{new Date().toLocaleString('zh-CN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">设备信息采集器 v2.0</p>
                  <p className="text-xs text-muted-foreground">共 {devices?.length || 0} 台设备</p>
                </div>
              </div>
              {/* Filter summary */}
              <div className="flex flex-wrap gap-2 mt-3">
                {filterProject && filterProject !== 'all' && (
                  <Badge variant="outline" className="text-[10px]">项目: {projects?.find(p => String(p.id) === filterProject)?.name || filterProject}</Badge>
                )}
                {filterDept && filterDept !== 'all' && (
                  <Badge variant="outline" className="text-[10px]">单位: {departments?.find(d => String(d.id) === filterDept)?.name || filterDept}</Badge>
                )}
                {keyword && <Badge variant="outline" className="text-[10px]">关键词: {keyword}</Badge>}
                {filterOs && filterOs !== 'all' && <Badge variant="outline" className="text-[10px]">系统: {filterOs}</Badge>}
                {filterDhcp && filterDhcp !== 'all' && <Badge variant="outline" className="text-[10px]">DHCP: {filterDhcp === '是' ? '启用' : '禁用'}</Badge>}
              </div>
            </div>

            {/* Device Table for Print */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse print-table">
                <thead>
                  <tr className="border-b-2 border-slate-300 dark:border-slate-600">
                    <th className="text-left py-2 px-2 font-semibold text-xs">使用人</th>
                    <th className="text-left py-2 px-2 font-semibold text-xs">电脑名称</th>
                    <th className="text-left py-2 px-2 font-semibold text-xs">IP地址</th>
                    <th className="text-left py-2 px-2 font-semibold text-xs">MAC地址</th>
                    <th className="text-left py-2 px-2 font-semibold text-xs">所属项目</th>
                    <th className="text-left py-2 px-2 font-semibold text-xs">所属单位</th>
                    <th className="text-left py-2 px-2 font-semibold text-xs">操作系统</th>
                    <th className="text-left py-2 px-2 font-semibold text-xs">CPU</th>
                    <th className="text-left py-2 px-2 font-semibold text-xs">内存</th>
                    <th className="text-left py-2 px-2 font-semibold text-xs">硬盘</th>
                    <th className="text-left py-2 px-2 font-semibold text-xs">采集时间</th>
                  </tr>
                </thead>
                <tbody>
                  {devices?.map((d, i) => (
                    <tr key={d.id} className={i % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800/30' : ''}>
                      <td className="py-1.5 px-2 text-xs font-medium">{d.userName}</td>
                      <td className="py-1.5 px-2 text-xs font-mono">{d.computerName || '-'}</td>
                      <td className="py-1.5 px-2 text-xs font-mono">{d.ipAddress || '-'}</td>
                      <td className="py-1.5 px-2 text-xs font-mono">{d.macAddress || '-'}</td>
                      <td className="py-1.5 px-2 text-xs">{d.projectName || '-'}</td>
                      <td className="py-1.5 px-2 text-xs">{d.departmentName || '-'}</td>
                      <td className="py-1.5 px-2 text-xs">{d.osInfo || '-'}</td>
                      <td className="py-1.5 px-2 text-xs">{d.cpuInfo || '-'}</td>
                      <td className="py-1.5 px-2 text-xs">{d.ramInfo || '-'}</td>
                      <td className="py-1.5 px-2 text-xs">{d.diskInfo || '-'}</td>
                      <td className="py-1.5 px-2 text-xs text-muted-foreground">{formatDate(d.collectedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Report Footer */}
            <div className="border-t pt-3 text-xs text-muted-foreground flex justify-between">
              <span>设备信息采集器 · 管理端</span>
              <span>第 1 页</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPrintReport(false)}>关闭</Button>
            <Button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700">
              <Printer className="w-4 h-4 mr-1" />打印
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
