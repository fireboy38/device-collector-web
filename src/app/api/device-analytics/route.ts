import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

function parseRamGB(ramInfo: string): number | null {
  // Match patterns like "8GB", "16 GB", "8192MB", "16384 MB", "8192M", "16G"
  const tbMatch = ramInfo.match(/(\d+(?:\.\d+)?)\s*TB/i);
  if (tbMatch) return parseFloat(tbMatch[1]) * 1024;

  const gbMatch = ramInfo.match(/(\d+(?:\.\d+)?)\s*GB/i);
  if (gbMatch) return parseFloat(gbMatch[1]);

  const mbMatch = ramInfo.match(/(\d+(?:\.\d+)?)\s*MB/i);
  if (mbMatch) return parseFloat(mbMatch[1]) / 1024;

  // Fallback: "16G", "8192M" without B
  const gMatch = ramInfo.match(/(\d+(?:\.\d+)?)\s*G\b/i);
  if (gMatch) return parseFloat(gMatch[1]);

  const mMatch = ramInfo.match(/(\d+(?:\.\d+)?)\s*M\b/i);
  if (mMatch) return parseFloat(mMatch[1]) / 1024;

  return null;
}

function bucketRam(gb: number): string {
  if (gb < 4) return '4GB以下';
  if (gb < 8) return '4-8GB';
  if (gb < 16) return '8-16GB';
  if (gb < 32) return '16-32GB';
  return '32GB以上';
}

function parseDiskGB(diskInfo: string): number | null {
  // Match patterns like "256GB", "512 GB", "1TB", "2 TB", "256G", "1T"
  const tbMatch = diskInfo.match(/(\d+(?:\.\d+)?)\s*TB/i);
  if (tbMatch) return parseFloat(tbMatch[1]) * 1024;

  const gbMatch = diskInfo.match(/(\d+(?:\.\d+)?)\s*GB/i);
  if (gbMatch) return parseFloat(gbMatch[1]);

  // Fallback: "1T", "256G" without B
  const tMatch = diskInfo.match(/(\d+(?:\.\d+)?)\s*T\b/i);
  if (tMatch) return parseFloat(tMatch[1]) * 1024;

  const gMatch = diskInfo.match(/(\d+(?:\.\d+)?)\s*G\b/i);
  if (gMatch) return parseFloat(gMatch[1]);

  const mbMatch = diskInfo.match(/(\d+(?:\.\d+)?)\s*MB/i);
  if (mbMatch) return parseFloat(mbMatch[1]) / 1024;

  return null;
}

function bucketDisk(gb: number): string {
  if (gb < 128) return '128GB以下';
  if (gb < 256) return '128-256GB';
  if (gb < 512) return '256-512GB';
  if (gb < 1024) return '512GB-1TB';
  return '1TB以上';
}

function parseCpuFamily(cpuInfo: string): string | null {
  const lower = cpuInfo.toLowerCase();

  // Intel Core i-series
  const intelCoreMatch = cpuInfo.match(/intel[^]*?core[^]*?(i[3579])/i);
  if (intelCoreMatch) return `Intel i${intelCoreMatch[1][1]}`;

  // Intel other (Celeron, Pentium, Xeon, etc.)
  if (lower.includes('intel')) {
    const celeronMatch = cpuInfo.match(/celeron/i);
    if (celeronMatch) return 'Intel Celeron';
    const pentiumMatch = cpuInfo.match(/pentium/i);
    if (pentiumMatch) return 'Intel Pentium';
    const xeonMatch = cpuInfo.match(/xeon/i);
    if (xeonMatch) return 'Intel Xeon';
    return 'Intel (其他)';
  }

  // AMD Ryzen series
  const ryzenMatch = cpuInfo.match(/ryzen[^]*?(\d)/i);
  if (ryzenMatch) return `AMD Ryzen ${ryzenMatch[1]}`;

  // AMD other
  if (lower.includes('amd')) {
    const athlonMatch = cpuInfo.match(/athlon/i);
    if (athlonMatch) return 'AMD Athlon';
    return 'AMD (其他)';
  }

  // Apple M-series
  const appleMatch = cpuInfo.match(/apple\s*m([1234])/i) || cpuInfo.match(/\bm([1234])\b/i);
  if (appleMatch && (lower.includes('apple') || lower.includes('mac'))) return `Apple M${appleMatch[1]}`;

  // Apple Silicon fallback
  if (lower.includes('apple') || (lower.includes('mac') && lower.includes('silicon'))) return 'Apple Silicon';

  // 飞腾/鲲鹏
  if (lower.includes('飞腾') || lower.includes('phytium')) return '飞腾';
  if (lower.includes('鲲鹏') || lower.includes('kunpeng')) return '鲲鹏';

  // 龙芯
  if (lower.includes('龙芯') || lower.includes('loongson')) return '龙芯';

  // 兆芯
  if (lower.includes('兆芯') || lower.includes('zhaoxin')) return '兆芯';

  // 海光
  if (lower.includes('海光') || lower.includes('hygon')) return '海光';

  return null;
}

export async function GET() {
  try {
    // Fetch devices with hardware info
    const devices = await db.device.findMany({
      select: {
        osInfo: true,
        collectedAt: true,
        ramInfo: true,
        diskInfo: true,
        cpuInfo: true,
      },
    });

    // OS distribution
    const osDistribution: Record<string, number> = {};
    devices.forEach(d => {
      let os = '未知';
      if (d.osInfo) {
        const lower = d.osInfo.toLowerCase();
        if (lower.includes('windows 10') || lower.includes('windows10')) os = 'Windows 10';
        else if (lower.includes('windows 11') || lower.includes('windows11')) os = 'Windows 11';
        else if (lower.includes('windows 7') || lower.includes('windows7')) os = 'Windows 7';
        else if (lower.includes('windows')) os = 'Windows (其他)';
        else if (lower.includes('mac') || lower.includes('darwin')) os = 'macOS';
        else if (lower.includes('linux') || lower.includes('ubuntu') || lower.includes('centos')) os = 'Linux';
        else if (lower.includes('麒麟') || lower.includes('kylin')) os = '麒麟OS';
        else os = d.osInfo.length > 20 ? d.osInfo.substring(0, 20) + '...' : d.osInfo;
      }
      osDistribution[os] = (osDistribution[os] || 0) + 1;
    });

    const osData = Object.entries(osDistribution)
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Collection timeline (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDevices = devices.filter(d => d.collectedAt >= thirtyDaysAgo);
    const timelineMap: Record<string, number> = {};
    recentDevices.forEach(d => {
      const dateKey = d.collectedAt.toISOString().slice(0, 10);
      timelineMap[dateKey] = (timelineMap[dateKey] || 0) + 1;
    });

    const timeline = Object.entries(timelineMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // RAM distribution
    const ramDistribution: Record<string, number> = {};
    devices.forEach(d => {
      if (d.ramInfo) {
        const gb = parseRamGB(d.ramInfo);
        if (gb !== null) {
          const bucket = bucketRam(gb);
          ramDistribution[bucket] = (ramDistribution[bucket] || 0) + 1;
        }
      }
    });

    // Define RAM bucket order for consistent sorting
    const ramBucketOrder = ['4GB以下', '4-8GB', '8-16GB', '16-32GB', '32GB以上'];
    const ramData = ramBucketOrder
      .filter(b => ramDistribution[b])
      .map(name => ({ name, value: ramDistribution[name] }))
      .sort((a, b) => b.value - a.value);

    // Disk distribution
    const diskDistribution: Record<string, number> = {};
    devices.forEach(d => {
      if (d.diskInfo) {
        const gb = parseDiskGB(d.diskInfo);
        if (gb !== null) {
          const bucket = bucketDisk(gb);
          diskDistribution[bucket] = (diskDistribution[bucket] || 0) + 1;
        }
      }
    });

    // Define Disk bucket order for consistent sorting
    const diskBucketOrder = ['128GB以下', '128-256GB', '256-512GB', '512GB-1TB', '1TB以上'];
    const diskData = diskBucketOrder
      .filter(b => diskDistribution[b])
      .map(name => ({ name, value: diskDistribution[name] }))
      .sort((a, b) => b.value - a.value);

    // CPU distribution
    const cpuDistribution: Record<string, number> = {};
    devices.forEach(d => {
      if (d.cpuInfo) {
        const family = parseCpuFamily(d.cpuInfo);
        if (family) {
          cpuDistribution[family] = (cpuDistribution[family] || 0) + 1;
        } else {
          // Use truncated raw value as fallback
          const label = d.cpuInfo.length > 20 ? d.cpuInfo.substring(0, 20) + '...' : d.cpuInfo;
          cpuDistribution[label] = (cpuDistribution[label] || 0) + 1;
        }
      }
    });

    const cpuData = Object.entries(cpuDistribution)
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return NextResponse.json({
      osData,
      timeline,
      totalDevices: devices.length,
      ramDistribution: ramData,
      diskDistribution: diskData,
      cpuDistribution: cpuData,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
