// 通知·关注·动态·私信 API

const API_BASE = '/api'

// ============ 类型定义 =============

export interface NotificationItem {
  id: number
  user_id: number
  type: string
  title: string
  content?: string
  is_read: boolean
  related_user_id?: number
  related_model_id?: number
  related_discussion_id?: number
  related_comment_id?: number
  related_url?: string
  created_at: string
}

export interface NotificationListResponse {
  total: number
  unread_count: number
  items: NotificationItem[]
}

export interface FollowUserBrief {
  id: number
  username: string
  full_name?: string
  avatar_url?: string
}

export interface FollowItem {
  id: number
  user: FollowUserBrief
  created_at: string
}

export interface FollowListResponse {
  total: number
  items: FollowItem[]
}

export interface ActivityItem {
  id: number
  user_id: number
  username: string
  avatar_url?: string
  type: string
  title: string
  content_preview?: string
  discussion_id?: number
  model_id?: number
  created_at: string
}

export interface ActivityListResponse {
  total: number
  items: ActivityItem[]
}

export interface UserProfileResponse {
  id: number
  username: string
  full_name?: string
  avatar_url?: string
  bio?: string
  follower_count: number
  following_count: number
  discussion_count: number
  model_count: number
  is_following: boolean
  created_at: string
}

// 私信
export interface ConversationItem {
  id: number
  other_user: FollowUserBrief
  last_message?: string
  last_message_at?: string
  unread_count: number
  is_muted: boolean
}

export interface ConversationListResponse {
  total: number
  items: ConversationItem[]
}

export interface MessageItem {
  id: number
  conversation_id: number
  sender_id: number
  sender_username: string
  sender_avatar?: string
  content: string
  is_read: boolean
  created_at: string
}

export interface MessageListResponse {
  total: number
  items: MessageItem[]
}

export interface UnreadCountResponse {
  notifications: number
  conversations: number
}

// ============ 通知 API =============

export function getFullAvatarUrl(url?: string | null): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // 相对路径补全前导斜杠
  return '/' + url.replace(/^\/*/, '')
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('3dprint_token')
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function getNotifications(page = 1, pageSize = 20, unreadOnly = false): Promise<NotificationListResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (unreadOnly) params.set('unread_only', 'true')
  const res = await fetch(`${API_BASE}/notifications?${params}`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('获取通知失败')
  return res.json()
}

export async function markNotificationsRead(ids?: number[]): Promise<void> {
  await fetch(`${API_BASE}/notifications/read`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: ids || null }),
  })
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  try {
    const res = await fetch(`${API_BASE}/notifications/unread-count`, { headers: getAuthHeaders() })
    if (!res.ok) return { notifications: 0, conversations: 0 }
    return res.json()
  } catch { return { notifications: 0, conversations: 0 } }
}

// ============ 通知偏好 =============

export async function getNotificationPreferences(): Promise<{ notify_activities: boolean; notify_messages: boolean }> {
  const res = await fetch(`${API_BASE}/notifications/preferences`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('获取偏好失败')
  return res.json()
}

export async function updateNotificationPreferences(data: { notify_activities?: boolean; notify_messages?: boolean }): Promise<void> {
  await fetch(`${API_BASE}/notifications/preferences`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// ============ 关注 API =============

export async function followUser(userId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/users/${userId}/follow`, { method: 'POST', headers: getAuthHeaders() })
  if (!res.ok) throw new Error('关注失败')
}

export async function unfollowUser(userId: number): Promise<void> {
  await fetch(`${API_BASE}/users/${userId}/follow`, { method: 'DELETE', headers: getAuthHeaders() })
}

export async function getUserProfile(userId: number): Promise<UserProfileResponse> {
  const res = await fetch(`${API_BASE}/users/${userId}/profile`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('获取用户信息失败')
  return res.json()
}

export async function getUserFollowers(userId: number, page = 1): Promise<FollowListResponse> {
  const res = await fetch(`${API_BASE}/users/${userId}/followers?page=${page}&page_size=20`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('获取粉丝列表失败')
  return res.json()
}

export async function getUserFollowing(userId: number, page = 1): Promise<FollowListResponse> {
  const res = await fetch(`${API_BASE}/users/${userId}/following?page=${page}&page_size=20`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('获取关注列表失败')
  return res.json()
}

// ============ 动态 API =============

export async function getActivities(userId?: number, page = 1): Promise<ActivityListResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: String(20) })
  if (userId) params.set('user_id', String(userId))
  const res = await fetch(`${API_BASE}/activities?${params}`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('获取动态失败')
  return res.json()
}

// ============ 私信 API =============

export async function getConversations(page = 1): Promise<ConversationListResponse> {
  const res = await fetch(`${API_BASE}/conversations?page=${page}&page_size=50`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('获取会话列表失败')
  return res.json()
}

export async function getConversationMessages(convId: number, page = 1): Promise<MessageListResponse> {
  const res = await fetch(`${API_BASE}/conversations/${convId}/messages?page=${page}&page_size=50`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('获取消息失败')
  return res.json()
}

export async function sendMessage(receiverId: number, content: string): Promise<MessageItem> {
  const res = await fetch(`${API_BASE}/messages`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ receiver_id: receiverId, content }),
  })
  if (!res.ok) throw new Error('发送失败')
  return res.json()
}

export async function getOrCreateConversation(otherUserId: number): Promise<{ conversation_id: number }> {
  const res = await fetch(`${API_BASE}/conversations/with/${otherUserId}`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('创建/获取会话失败')
  return res.json()
}

export async function getConversationsUnread(): Promise<{ count: number }> {
  try {
    const res = await fetch(`${API_BASE}/conversations/unread-count`, { headers: getAuthHeaders() })
    if (!res.ok) return { count: 0 }
    return res.json()
  } catch { return { count: 0 } }
}
