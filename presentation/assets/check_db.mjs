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
  const { data: users, error } = await client.auth.admin.listUsers()
  if (error) {
    console.error('Error listing users:', error)
    return
  }
  console.log('Total users in DB:', users.users.length)
  users.users.slice(0, 5).forEach((u) => console.log('User:', u.email, u.id))

  const { data: docs } = await client
    .from('documents')
    .select('id, filename, status, doc_category, tags, file_size, created_at')
    .limit(10)
  console.log('Sample documents:', docs?.length || 0)
  if (docs && docs.length > 0) {
    console.log(JSON.stringify(docs.slice(0, 3), null, 2))
  }
}

main()
