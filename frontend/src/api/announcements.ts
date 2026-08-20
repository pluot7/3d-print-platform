import client from './client'

export interface Announcement {
  id: number
  title: string
  content: string
  summary: string | null
  cover_url: string | null
  status: string
  is_pinned: boolean
  view_count: number
  author: string
  published_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface AnnouncementListResponse {
  total: number
  items: Announcement[]
}

// 获取公告列表
export async function getAnnouncements(params?: {
  page?: number
  page_size?: number
  search?: string
}): Promise<AnnouncementListResponse> {
  const { data } = await client.get<AnnouncementListResponse>('/api/announcements', { params })
  return data
}

// 获取公告速览（首页小榜单）
export async function getBriefAnnouncements(limit = 5): Promise<AnnouncementListResponse> {
  const { data } = await client.get<AnnouncementListResponse>('/api/announcements/brief', {
    params: { limit },
  })
  return data
}

// 获取单条公告
export async function getAnnouncement(id: number): Promise<Announcement> {
  const { data } = await client.get<Announcement>(`/api/announcements/${id}`)
  return data
}

// 创建公告（管理员）
export async function createAnnouncement(body: {
  title: string
  content: string
  summary?: string
  cover_url?: string
  status?: string
  author?: string
  is_pinned?: boolean
}): Promise<Announcement> {
  const { data } = await client.post<Announcement>('/api/announcements', body)
  return data
}

// 更新公告（管理员）
export async function updateAnnouncement(id: number, body: Partial<{
  title: string
  content: string
  summary: string
  cover_url: string
  status: string
  is_pinned: boolean
  author: string
}>): Promise<Announcement> {
  const { data } = await client.put<Announcement>(`/api/announcements/${id}`, body)
  return data
}

// 删除公告（管理员）
export async function deleteAnnouncement(id: number): Promise<void> {
  await client.delete(`/api/announcements/${id}`)
}
