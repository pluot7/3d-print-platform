import client from './client'

export type ReportTargetType = 'model' | 'discussion' | 'reply' | 'comment'
export type ReportStatus = 'pending' | 'dismissed' | 'actioned'

export interface ReportResponse {
  id: number
  target_type: ReportTargetType
  target_id: number
  reporter_id: number
  reporter_name: string | null
  reason: string
  detail: string | null
  status: ReportStatus
  handled_by: number | null
  created_at: string | null
}

export interface ReportListResponse {
  total: number
  items: ReportResponse[]
}

// 提交举报
export async function createReport(payload: {
  target_type: ReportTargetType
  target_id: number
  reason: string
  detail?: string
}): Promise<ReportResponse> {
  const { data } = await client.post<ReportResponse>('/api/reports', payload)
  return data
}

// 管理员获取举报列表
export async function getReports(params?: {
  status_filter?: ReportStatus
  target_type?: ReportTargetType
  page?: number
  page_size?: number
}): Promise<ReportListResponse> {
  const { data } = await client.get<ReportListResponse>('/api/reports', { params })
  return data
}

// 管理员处理举报
export async function handleReport(reportId: number, action: 'dismissed' | 'actioned'): Promise<ReportResponse> {
  const { data } = await client.put<ReportResponse>(`/api/reports/${reportId}/handle`, null, {
    params: { action }
  })
  return data
}

// 举报原因选项
export const reportReasons: Record<string, string> = {
  spam: '垃圾广告',
  porn: '色情内容',
  abusive: '辱骂攻击',
  illegal: '违法违规',
  copyright: '侵权盗版',
  other: '其他',
}
