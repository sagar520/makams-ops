// Public endpoint used by the tokenised employee upload page (/u/:token).
// Accepts multipart form-data: token, doc_type, file.
// Validates the link, stores the file in the private employee-docs bucket,
// and records it in person_documents.

import { corsHeaders, json, serviceClient } from '../_shared/utils.ts'

const MAX_BYTES = 15 * 1024 * 1024
const ALLOWED_MIME = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
])
const ALLOWED_EXT = /\.(pdf|jpe?g|png|webp|heic|heif)$/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return json({ error: 'Expected form-data' }, 400)
  }

  const token = String(form.get('token') || '')
  const docType = String(form.get('doc_type') || '')
  const file = form.get('file')

  if (!token || !docType || !(file instanceof File)) return json({ error: 'Missing fields' }, 400)
  if (file.size === 0) return json({ error: 'Empty file' }, 400)
  if (file.size > MAX_BYTES) return json({ error: 'File is too large (max 15 MB)' }, 400)
  if (!ALLOWED_MIME.has(file.type) && !ALLOWED_EXT.test(file.name)) {
    return json({ error: 'Please upload a PDF or an image' }, 400)
  }

  const svc = serviceClient()

  const { data: link } = await svc.from('upload_links').select('*').eq('token', token).maybeSingle()
  if (!link) return json({ error: 'This link is not valid' }, 403)
  if (link.revoked_at) return json({ error: 'This link is no longer active' }, 403)
  if (new Date(link.expires_at) < new Date()) return json({ error: 'This link has expired' }, 403)
  if (!link.doc_types.includes(docType)) return json({ error: 'This document was not requested' }, 400)

  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(-80)
  const path = `${link.person_id}/${docType}/${Date.now()}_${safeName}`

  const { error: upErr } = await svc.storage
    .from('employee-docs')
    .upload(path, file, { contentType: file.type || 'application/octet-stream' })
  if (upErr) return json({ error: `Upload failed: ${upErr.message}` }, 500)

  // one document row per (link, doc_type): replaces on re-upload
  const { data: existing } = await svc
    .from('person_documents')
    .select('id, file_path')
    .eq('person_id', link.person_id)
    .eq('doc_type', docType)
    .eq('link_id', link.id)
    .maybeSingle()

  const docFields = {
    file_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    status: 'uploaded',
    source: 'employee',
    uploaded_at: new Date().toISOString(),
  }

  if (existing) {
    if (existing.file_path && existing.file_path !== path) {
      await svc.storage.from('employee-docs').remove([existing.file_path]).catch(() => {})
    }
    const { error } = await svc.from('person_documents').update(docFields).eq('id', existing.id)
    if (error) return json({ error: error.message }, 500)
  } else {
    const { error } = await svc.from('person_documents').insert({
      person_id: link.person_id, doc_type: docType, link_id: link.id, ...docFields,
    })
    if (error) return json({ error: error.message }, 500)
  }

  await svc.from('upload_links').update({ last_used_at: new Date().toISOString() }).eq('id', link.id)

  return json({ ok: true })
})
