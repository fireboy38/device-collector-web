import { NextResponse } from 'next/server';

export async function GET() {
  const csv = '单位名称,单位编码,描述\n示例部门A,DEPT-001,这是一个示例部门\n示例部门B,DEPT-002,另一个示例部门';
  const bom = '\uFEFF';
  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename*=UTF-8\'\'' + encodeURIComponent('单位导入模板.csv'),
    },
  });
}
