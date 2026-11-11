import { getAdminClient } from './data'
import { logAdminAction } from './audit'
import { CMSData, DEFAULT_CMS_DATA } from './types'

export { type CMSData, DEFAULT_CMS_DATA }

export async function getCMSSection(sectionId = 'global'): Promise<{
  draft: CMSData
  published: CMSData
  publishedAt: string | null
  updatedAt: string
  hasUnpublishedChanges: boolean
}> {
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('website_content')
      .select('*')
      .eq('id', sectionId)
      .maybeSingle()

    if (error || !data) {
      return {
        draft: DEFAULT_CMS_DATA,
        published: DEFAULT_CMS_DATA,
        publishedAt: null,
        updatedAt: new Date().toISOString(),
        hasUnpublishedChanges: false,
      }
    }

    const draft = { ...DEFAULT_CMS_DATA, ...(data.draft_content || {}) }
    const published = { ...DEFAULT_CMS_DATA, ...(data.published_content || {}) }
    const hasUnpublishedChanges = JSON.stringify(draft) !== JSON.stringify(published)

    return {
      draft,
      published,
      publishedAt: data.published_at || null,
      updatedAt: data.updated_at || new Date().toISOString(),
      hasUnpublishedChanges,
    }
  } catch {
    return {
      draft: DEFAULT_CMS_DATA,
      published: DEFAULT_CMS_DATA,
      publishedAt: null,
      updatedAt: new Date().toISOString(),
      hasUnpublishedChanges: false,
    }
  }
}

export async function saveCMSDraft(
  draft: CMSData,
  adminUser: { id: string; email: string },
  sectionId = 'global'
) {
  const supabase = getAdminClient()
  const { data: existing } = await supabase
    .from('website_content')
    .select('published_content')
    .eq('id', sectionId)
    .maybeSingle()

  const publishedContent = existing?.published_content || DEFAULT_CMS_DATA

  const { error } = await supabase.from('website_content').upsert(
    {
      id: sectionId,
      draft_content: draft,
      published_content: publishedContent,
      updated_by: adminUser.email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  if (error) {
    throw new Error(`Failed to save CMS draft: ${error.message}`)
  }

  await logAdminAction({
    adminId: adminUser.id,
    adminEmail: adminUser.email,
    actionType: 'cms.draft_saved',
    targetId: sectionId,
    reason: `Saved CMS draft for section: ${sectionId}`,
    details: { sectionId },
  })

  return { success: true }
}

export async function publishCMSContent(
  adminUser: { id: string; email: string },
  sectionId = 'global'
) {
  const supabase = getAdminClient()
  const { data: existing, error: fetchErr } = await supabase
    .from('website_content')
    .select('draft_content')
    .eq('id', sectionId)
    .maybeSingle()

  if (fetchErr || !existing) {
    throw new Error('No draft content found to publish.')
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('website_content')
    .update({
      published_content: existing.draft_content,
      published_at: now,
      updated_by: adminUser.email,
      updated_at: now,
    })
    .eq('id', sectionId)

  if (error) {
    throw new Error(`Failed to publish CMS content: ${error.message}`)
  }

  await logAdminAction({
    adminId: adminUser.id,
    adminEmail: adminUser.email,
    actionType: 'cms.published',
    targetId: sectionId,
    reason: `Published CMS content for section: ${sectionId}`,
    details: { sectionId, publishedAt: now },
  })

  return { success: true, publishedAt: now }
}

export async function discardCMSDraft(
  adminUser: { id: string; email: string },
  sectionId = 'global'
) {
  const supabase = getAdminClient()
  const { data: existing, error: fetchErr } = await supabase
    .from('website_content')
    .select('published_content')
    .eq('id', sectionId)
    .maybeSingle()

  if (fetchErr || !existing) {
    throw new Error('No content found to revert.')
  }

  const { error } = await supabase
    .from('website_content')
    .update({
      draft_content: existing.published_content,
      updated_by: adminUser.email,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sectionId)

  if (error) {
    throw new Error(`Failed to discard CMS draft: ${error.message}`)
  }

  await logAdminAction({
    adminId: adminUser.id,
    adminEmail: adminUser.email,
    actionType: 'cms.draft_discarded',
    targetId: sectionId,
    reason: `Discarded CMS draft for section: ${sectionId}`,
    details: { sectionId },
  })

  return { success: true }
}
