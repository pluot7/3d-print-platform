import client from './client'

const API = 'http://localhost:8000'

export type DiscussionCategory = 'general' | 'help' | 'showcase' | 'tech'

export interface Author {
  id: number
  username: string
  full_name: string | null
  avatar_url: string | null
}

export interface DiscussionResponse {
  id: number
  title: string
  content: string
  category: DiscussionCategory
  user_id: number
  author: Author
  is_pinned: boolean
  is_locked: boolean
  view_count: number
  reply_count: number
  created_at: string
}

export interface ReplyResponse {
  id: number
  discussion_id: number
  user_id: number
  author: Author
  discussion_title?: string
  parent_id?: number | null
  reply_to_author?: Author | null
  replies?: ReplyResponse[]
  content: string
  created_at: string
}

export interface DiscussionListResponse {
  total: number
  items: DiscussionResponse[]
}

export interface ReplyListResponse {
  total: number
  items: ReplyResponse[]
}

// 获取讨论区列表
export async function getDiscussions(params: {
  category?: DiscussionCategory
  keyword?: string
  page?: number
  page_size?: number
}): Promise<DiscussionListResponse> {
  const { data } = await client.get<DiscussionListResponse>('/api/discussions', { params })
  return data
}

// 获取主题帖详情
export async function getDiscussion(id: number): Promise<DiscussionResponse> {
  const { data } = await client.get<DiscussionResponse>(`/api/discussions/${id}`)
  return data
}

// 创建主题帖
export async function createDiscussion(payload: {
  title: string
  content: string
  category: DiscussionCategory
}): Promise<DiscussionResponse> {
  const { data } = await client.post<DiscussionResponse>('/api/discussions', payload)
  return data
}

// 更新主题帖（管理员）
export async function updateDiscussion(id: number, payload: {
  title?: string
  content?: string
  category?: DiscussionCategory
  is_pinned?: boolean
  is_locked?: boolean
}): Promise<DiscussionResponse> {
  const { data } = await client.put<DiscussionResponse>(`/api/discussions/${id}`, payload)
  return data
}

// 删除主题帖
export async function deleteDiscussion(id: number): Promise<void> {
  await client.delete(`/api/discussions/${id}`)
}

// 获取回帖列表
export async function getReplies(discussionId: number, params?: {
  page?: number
  page_size?: number
}): Promise<ReplyListResponse> {
  const { data } = await client.get<ReplyListResponse>(`/api/discussions/${discussionId}/replies`, { params })
  return data
}

// 发布回帖（支持 parent_id 回复子回复）
export async function createReply(discussionId: number, content: string, parentId?: number): Promise<ReplyResponse> {
  const { data } = await client.post<ReplyResponse>(`/api/discussions/${discussionId}/replies`, {
    content,
    parent_id: parentId,
  })
  return data
}

// 删除回帖
export async function deleteReply(replyId: number): Promise<void> {
  await client.delete(`/api/discussions/replies/${replyId}`)
}

// 获取所有帖子（管理员）
export async function getAllDiscussions(params?: {
  page?: number
  page_size?: number
  search?: string
}): Promise<DiscussionListResponse> {
  const { data } = await client.get<DiscussionListResponse>('/api/discussions/all/list', { params })
  return data
}

// 获取所有回帖（管理员）
export async function getAllReplies(params?: {
  page?: number
  page_size?: number
  search?: string
}): Promise<ReplyListResponse> {
  const { data } = await client.get<ReplyListResponse>('/api/discussions/all/replies', { params })
  return data
}

// 获取默认头像URL
export function getAvatarUrl(author: Author): string {
  if (author.avatar_url) {
    // 如果已经是完整 URL 则直接用，否则补全
    if (author.avatar_url.startsWith('http')) return author.avatar_url
    return `/${author.avatar_url}`
  }
  // 使用 DiceBear 生成首字母头像
  const seed = encodeURIComponent(author.username)
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=f97316,3b82f6,eab308,22c55e,8b5cf6,ec4899&textColor=ffffff`
}

export const categoryNames: Record<DiscussionCategory, string> = {
  general: '综合',
  help: '求助',
  showcase: '作品展示',
  tech: '技术交流',
}

export const categoryColors: Record<DiscussionCategory, string> = {
  general: 'bg-brand-blue/15 text-brand-blue border-brand-blue/30',
  help: 'bg-brand-orange/15 text-brand-orange border-brand-orange/30',
  showcase: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  tech: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
}
