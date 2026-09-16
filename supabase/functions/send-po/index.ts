// Email a PO PDF to the vendor via Resend, and log the send on the PO timeline.
// Secrets required: RESEND_API_KEY, PO_FROM_EMAIL (e.g. "Makams Purchase <purchase@yourdomain.com>")

import { corsHeaders, json, serviceClient, requireRole } from '../_shared/utils.ts'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const svc = serviceClient()
  let appUser
  try {
    ;({ appUser } = await requireRole(req, svc, 'purchase'))
  } catch (resp) {
    return resp as Response
  }

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('PO_FROM_EMAIL')
  if (!apiKey || !from) {
    return json({ error: 'Email is not configured yet: set RESEND_API_KEY and PO_FROM_EMAIL secrets (see README)' }, 500)
  }

  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Bad request' }, 400)
  }
  const { po_id, to, cc, subject, message, pdf_base64, filename } = body
  if (!po_id || !to || !subject || !pdf_base64) return json({ error: 'Missing fields' }, 400)
  if (typeof pdf_base64 !== 'string' || pdf_base64.length > 8_000_000) return json({ error: 'PDF too large' }, 400)

  const { data: po, error: poErr } = await svc
    .from('purchase_orders')
    .select('id, po_number, status, sent_count')
    .eq('id', po_id)
    .single()
  if (poErr || !po) return json({ error: 'PO not found' }, 404)
  if (!['approved', 'closed'].includes(po.status)) {
    return json({ error: 'Only approved POs can be sent to vendors' }, 400)
  }

  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1e293b;white-space:pre-line">${esc(message || '')}</div>`

  const ccList = (cc || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      ...(ccList.length ? { cc: ccList } : {}),
      subject,
      html,
      attachments: [{ filename: filename || 'PO.pdf', content: pdf_base64 }],
    }),
  })

  const resendJson = await resendRes.json().catch(() => ({}))

  if (!resendRes.ok) {
    const errMsg = resendJson?.message || `Resend error ${resendRes.status}`
    await svc.from('po_events').insert({
      po_id, kind: 'send_failed', actor_id: appUser.id, detail: { to, error: errMsg },
    })
    return json({ error: `Email failed: ${errMsg}` }, 502)
  }

  await svc.from('po_events').insert({
    po_id, kind: 'sent', actor_id: appUser.id,
    detail: { to, cc: ccList.join(', ') || null, subject, message_id: resendJson?.id || null },
  })
  await svc.from('purchase_orders').update({
    sent_count: (po.sent_count || 0) + 1,
    last_sent_at: new Date().toISOString(),
  }).eq('id', po_id)

  return json({ ok: true, message_id: resendJson?.id })
})
