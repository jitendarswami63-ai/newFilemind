-- =========================================================================
-- FILEMIND MIGRATION 12: UNIVERSAL MULTI-FORMAT DOCUMENT SUPPORT
-- Supports Documents, Spreadsheets, Presentations, Images, Audio, Video, Archives, Code
-- =========================================================================

-- 1. Performance indexes for category & mime_type queries
CREATE INDEX IF NOT EXISTS idx_documents_mime_type ON public.documents(mime_type);
CREATE INDEX IF NOT EXISTS idx_documents_doc_category ON public.documents(doc_category);
CREATE INDEX IF NOT EXISTS idx_documents_user_category ON public.documents(user_id, doc_category);

-- 2. Ensure documents table accepts any valid MIME type
ALTER TABLE public.documents ALTER COLUMN mime_type DROP DEFAULT;
ALTER TABLE public.documents ALTER COLUMN mime_type SET DEFAULT 'application/octet-stream';

-- 3. Comments describing multi-format storage
COMMENT ON TABLE public.documents IS 'Universal file management and intelligent document storage table';
COMMENT ON COLUMN public.documents.mime_type IS 'Standard MIME type (e.g. application/pdf, image/png, text/csv, application/zip)';
COMMENT ON COLUMN public.documents.doc_category IS 'Classification: Document, Spreadsheet, Presentation, Image, Audio, Video, Archive, Code, Other';
