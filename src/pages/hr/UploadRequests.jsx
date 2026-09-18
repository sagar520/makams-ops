import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2, Copy, Ban } from 'lucide-react'
import { supabase, portalUrl } from '../../lib/supabase'
import { PageHeader, Table, Th, Td, Tr, Badge, Button, EmptyState, FullPageSpinner, useToast } from '../../components/ui'
import { docTypeLabel, profileFieldLabel } from '../../lib/constants'
import { fmtDateTime, daysUntil } from '../../lib/format'

function linkStatus(l) {
  if (l.revoked_at) return { label: 'Revoked', tone: 'gray' }
  if (new Date(l.expires_at) < new Date()) return { label: 'Expired', tone: 'gray' }
  if (l.submitted_at) return { label: 'Submitted', tone: 'green' }
  if (l.last_used_at) return { label: 'Opened', tone: 'blue' }
  return { label: 'Sent', tone: 'amber' }
}

export default function UploadRequests() {
  const toast = useToast()
  const qc = useQueryClient()

  const { data: links, isLoading } = useQuery({
    queryKey: ['upload-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upload_links')
        .select('*, people(id, full_name)')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data
    },
  })

  const copy = async (l) => {
    await navigator.clipboard.writeText(portalUrl(l.token))
    toast('Link copied')
  }

  const revoke = async (l) => {
    if (!window.confirm('Revoke this link? The employee will no longer be able to use it.')) return
    const { error } = await supabase.from('upload_links').update({ revoked_at: new Date().toISOString() }).eq('id', l.id)
    if (error) return toast(error.message, 'error')
    qc.invalidateQueries({ queryKey: ['upload-links'] })
  }

  if (isLoading) return <FullPageSpinner />

  return (
    <div>
      <PageHeader
        title="Upload requests"
        sub="Links sent to employees to submit documents or update their details. Create them from a person's Documents tab."
      />

      {!links?.length ? (
        <EmptyState icon={Link2} title="No upload links yet" hint="Open a person → Documents → “Request from …” to create one." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Asked for</Th>
              <Th>Status</Th>
              <Th>Expires</Th>
              <Th>Created</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {links.map((l) => {
              const st = linkStatus(l)
              const asked = [
                ...l.doc_types.map(docTypeLabel),
                ...(l.profile_fields.length ? [`${l.profile_fields.length} detail field${l.profile_fields.length > 1 ? 's' : ''}`] : []),
              ]
              const dleft = daysUntil(l.expires_at)
              return (
                <Tr key={l.id}>
                  <Td className="font-medium">
                    <Link to={`/people/${l.people?.id}`} className="text-slate-900 hover:text-red-600">{l.people?.full_name}</Link>
                  </Td>
                  <Td className="max-w-xs">
                    <span className="line-clamp-2 text-xs text-slate-500">{asked.join(', ') || '—'}</span>
                  </Td>
                  <Td><Badge tone={st.tone}>{st.label}</Badge></Td>
                  <Td className="text-slate-500">
                    {l.revoked_at ? '—' : dleft < 0 ? 'expired' : `${dleft}d left`}
                  </Td>
                  <Td className="text-xs text-slate-400">{fmtDateTime(l.created_at)}</Td>
                  <Td right>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="xs" icon={Copy} onClick={() => copy(l)}>Copy</Button>
                      {!l.revoked_at && new Date(l.expires_at) > new Date() && (
                        <Button variant="ghost" size="xs" icon={Ban} onClick={() => revoke(l)}>Revoke</Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      )}
    </div>
  )
}
