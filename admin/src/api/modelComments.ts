import client from './client'

export interface Author {
  id: number
  username: string
  full_name: string | null
  avatar_url: string | null
}

export interface ModelComment {
  id: number
  model_id: number
  user_id: number
  parent_id: number | null
  author: Author
  reply_to_author: Author | null
  model_name?: string
  content: string
  replies: ModelComment[]
  created_at: string
}

export interface ModelCommentListResponse {
  total: number
  items: ModelComment[]
}

// 获取模型评论列表
export async function getModelComments(modelId: number, params?: {
  page?: number
  page_size?: number
}): Promise<ModelCommentListResponse> {
  const { data } = await client.get<ModelCommentListResponse>(
    `/api/models/${modelId}/comments`,
    { params }
  )
  return data
}

// 发布评论
export async function createModelComment(modelId: number, content: string, parentId?: number): Promise<ModelComment> {
  const { data } = await client.post<ModelComment>(
    `/api/models/${modelId}/comments`,
    { content, parent_id: parentId }
  )
  return data
}

// 获取所有评论（管理员）
export async function getAllModelComments(params?: {
  search?: string
  page?: number
  page_size?: number
}): Promise<ModelCommentListResponse> {
  const { data } = await client.get<ModelCommentListResponse>(
    '/api/model-comments',
    { params }
  )
  return data
}

// 删除评论
export async function deleteModelComment(commentId: number): Promise<void> {
  await client.delete(`/api/model-comments/${commentId}`)
}

// 获取头像（优先本地完整URL，否则 DiceBear 兜底）
export function getAvatarUrl(author: Author): string {
  if (author.avatar_url) {
    // 如果已经是完整 URL 则直接用，否则补全
    if (author.avatar_url.startsWith('http')) return author.avatar_url
    return `/${author.avatar_url}`
  }
  const seed = encodeURIComponent(author.username)
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=f97316,3b82f6,eab308,22c55e,8b5cf6,ec4899&textColor=ffffff`
}
