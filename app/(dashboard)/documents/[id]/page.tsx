import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { PDFViewer } from '@/components/pdf/PDFViewer'

export default async function DocumentViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const sParams = searchParams ? await searchParams : undefined
  const rawPage = typeof sParams?.page === 'string' ? sParams.page : undefined
  const parsedPage = rawPage ? parseInt(rawPage, 10) : undefined
  const initialPage = parsedPage && !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : undefined

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, filename, status, error_message, doc_category, tags, processing_locked_at, storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !doc) {
    notFound()
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar documentId={doc.id} filename={doc.filename} />
      <PDFViewer
        documentId={doc.id}
        initialStatus={doc.status}
        errorMessage={doc.error_message}
        initialCategory={doc.doc_category}
        initialTags={doc.tags}
        initialLockedAt={doc.processing_locked_at}
        initialPage={initialPage}
        storagePath={doc.storage_path}
      />
    </div>
  )
}
