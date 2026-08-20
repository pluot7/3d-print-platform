import client from './client'

export interface HelpArticleData {
  id: number
  section: string
  title: string
  content: string | null
  sort_order: number
}

// 获取帮助中心某个分区的文章（公开）
export async function getHelpSection(section: string): Promise<HelpArticleData[]> {
  const { data } = await client.get<HelpArticleData[]>(`/api/help/${section}`)
  return data
}

// 获取所有帮助文章（管理员）
export async function getAllHelpArticles(): Promise<HelpArticleData[]> {
  const { data } = await client.get<HelpArticleData[]>('/api/help/all/list')
  return data
}

// 创建文章（管理员）
export async function createHelpArticle(body: {
  section: string
  title: string
  content?: string
  sort_order?: number
}): Promise<HelpArticleData> {
  const { data } = await client.post<HelpArticleData>('/api/help', body)
  return data
}

// 更新文章（管理员）
export async function updateHelpArticle(id: number, body: Partial<{
  title: string
  content: string
  section: string
  sort_order: number
  is_active: boolean
}>): Promise<HelpArticleData> {
  const { data } = await client.put<HelpArticleData>(`/api/help/${id}`, body)
  return data
}

// 删除文章（管理员）
export async function deleteHelpArticle(id: number): Promise<void> {
  await client.delete(`/api/help/${id}`)
}
