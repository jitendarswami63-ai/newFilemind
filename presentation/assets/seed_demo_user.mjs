import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = fs.readFileSync('.env.local', 'utf8')
const envVars = {}
env.split('\n').forEach((l) => {
  const parts = l.split('=')
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '')
  }
})

const client = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  const email = 'presentation_demo@filemind.app'
  const password = 'FileMindPresentation2026!'

  // Check if user exists
  const { data: users } = await client.auth.admin.listUsers()
  const existing = users.users.find((u) => u.email === email)

  let userId
  if (!existing) {
    const { data: created, error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'FileMind Presenter' },
    })
    if (error) {
      console.error('Failed to create user:', error)
      return
    }
    userId = created.user.id
    console.log('Created presentation demo user:', userId)
  } else {
    userId = existing.id
    await client.auth.admin.updateUserById(userId, { password })
    console.log('Updated presentation demo user password:', userId)
  }

  // Check if demo user has documents, if not insert 3 illustrative documents for real screenshot
  const { data: existingDocs } = await client.from('documents').select('id').eq('user_id', userId)
  if (!existingDocs || existingDocs.length === 0) {
    console.log('Adding sample documents for demo user...')
    const sampleDocs = [
      {
        user_id: userId,
        filename: 'Quarterly_Financial_Report_Q3.pdf',
        storage_path: `${userId}/demo-1/Quarterly_Financial_Report_Q3.pdf`,
        file_size: 2450820,
        mime_type: 'application/pdf',
        status: 'completed',
        doc_category: 'Financial Report',
        tags: ['Finance', 'Q3', 'Revenue', 'Audit'],
        page_count: 14,
        is_scanned: false,
        extracted_data: { total_revenue: '$1.4M', ebitda: '$420K', period: 'Q3 2026' },
      },
      {
        user_id: userId,
        filename: 'AI_Research_Transformers_Survey.pdf',
        storage_path: `${userId}/demo-2/AI_Research_Transformers_Survey.pdf`,
        file_size: 4892100,
        mime_type: 'application/pdf',
        status: 'completed',
        doc_category: 'Research Paper',
        tags: ['Machine Learning', 'Attention', 'LLMs', 'Neural Networks'],
        page_count: 22,
        is_scanned: false,
        extracted_data: { authors: 'Vaswani et al.', conference: 'NeurIPS' },
      },
      {
        user_id: userId,
        filename: 'Enterprise_Service_Agreement_Signed.pdf',
        storage_path: `${userId}/demo-3/Enterprise_Service_Agreement_Signed.pdf`,
        file_size: 1120400,
        mime_type: 'application/pdf',
        status: 'completed',
        doc_category: 'Contract',
        tags: ['Legal', 'SLA', 'Enterprise', 'Confidential'],
        page_count: 8,
        is_scanned: true,
        extracted_data: { effective_date: '2026-04-01', jurisdiction: 'Delaware' },
      },
    ]

    const { error: insErr } = await client.from('documents').insert(sampleDocs)
    if (insErr) {
      console.error('Error inserting sample docs:', insErr)
    } else {
      console.log('Successfully inserted 3 sample presentation docs!')
    }
  } else {
    console.log(`Demo user already has ${existingDocs.length} documents.`)
  }
}

main()
