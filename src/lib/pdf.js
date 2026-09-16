import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { amountInWords, fmtDate } from './format'

const money = (n) =>
  'Rs. ' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0))

const qty = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(Number(n || 0))

/**
 * Build the PO PDF.
 * @param {object} p { po, items, vendor, location, company }
 * @returns jsPDF document
 */
export function buildPoPdf({ po, items, vendor, location, company }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 14
  let y = 16

  const gray = [100, 116, 139]
  const dark = [15, 23, 42]
  const line = [226, 232, 240]

  // ---------- header ----------
  doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(...dark)
  doc.text(company?.name || 'Makams', M, y)

  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(79, 70, 229)
  doc.text('PURCHASE ORDER', W - M, y, { align: 'right' })

  y += 5.5
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...gray)
  const companyLines = [
    [company?.address, company?.city, company?.state, company?.pincode].filter(Boolean).join(', '),
    [company?.gstin ? `GSTIN: ${company.gstin}` : null, company?.phone, company?.email].filter(Boolean).join('  ·  '),
  ].filter((s) => s && s.trim())
  for (const l of companyLines) {
    doc.text(doc.splitTextToSize(l, 110), M, y)
    y += 4
  }

  doc.setFontSize(9.5).setTextColor(...dark).setFont('helvetica', 'bold')
  doc.text(po.po_number || 'DRAFT', W - M, 21.5, { align: 'right' })
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...gray)
  doc.text(`Date: ${fmtDate(po.order_date)}`, W - M, 26, { align: 'right' })
  if (po.expected_date) doc.text(`Expected delivery: ${fmtDate(po.expected_date)}`, W - M, 30, { align: 'right' })
  if (po.reference) doc.text(`Ref: ${po.reference}`, W - M, po.expected_date ? 34 : 30, { align: 'right' })

  y = Math.max(y, 38)
  doc.setDrawColor(...line).setLineWidth(0.3).line(M, y, W - M, y)
  y += 6

  // ---------- vendor / ship-to ----------
  const colW = (W - 2 * M - 8) / 2
  const boxTop = y

  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...gray)
  doc.text('VENDOR', M, y)
  doc.text('SHIP TO', M + colW + 8, y)
  y += 4.5

  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...dark)
  doc.text(vendor?.name || '—', M, y)
  doc.text(location?.name || '—', M + colW + 8, y)
  y += 4.5

  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...gray)
  const vendorLines = doc.splitTextToSize(
    [
      [vendor?.address, vendor?.city, vendor?.state, vendor?.pincode].filter(Boolean).join(', '),
      vendor?.gstin ? `GSTIN: ${vendor.gstin}` : null,
      [vendor?.contact_name, vendor?.phone, vendor?.email].filter(Boolean).join('  ·  '),
      vendor?.payment_terms ? `Payment terms: ${vendor.payment_terms}` : null,
    ].filter(Boolean).join('\n'),
    colW
  )
  const shipLines = doc.splitTextToSize(
    [
      location?.address,
      location?.state,
      location?.gstin ? `GSTIN: ${location.gstin}` : null,
    ].filter(Boolean).join('\n') || (company ? [company.address, [company.city, company.state, company.pincode].filter(Boolean).join(', ')].filter(Boolean).join('\n') : ''),
    colW
  )
  doc.text(vendorLines, M, y)
  doc.text(shipLines, M + colW + 8, y)
  y += Math.max(vendorLines.length, shipLines.length) * 3.8 + 6

  // ---------- items ----------
  const showTax = po.tax_mode !== 'none'
  const head = showTax
    ? [['#', 'Description', 'Qty', 'Unit', 'Rate', 'GST %', 'Amount']]
    : [['#', 'Description', 'Qty', 'Unit', 'Rate', 'Amount']]

  const body = items.map((it, i) => {
    const desc = it.hsn_code ? `${it.description}\nHSN: ${it.hsn_code}` : it.description
    const base = [String(i + 1), desc, qty(it.qty), it.unit, money(it.unit_price)]
    return showTax
      ? [...base, `${Number(it.tax_pct)}%`, money(it.line_total)]
      : [...base, money(it.line_total)]
  })

  autoTable(doc, {
    startY: y,
    head,
    body,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, textColor: [30, 41, 59], lineColor: line, lineWidth: 0.2, cellPadding: 2.2, valign: 'top' },
    headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold', fontSize: 8 },
    columnStyles: showTax
      ? { 0: { cellWidth: 8 }, 2: { halign: 'right', cellWidth: 18 }, 3: { cellWidth: 14 }, 4: { halign: 'right', cellWidth: 26 }, 5: { halign: 'right', cellWidth: 16 }, 6: { halign: 'right', cellWidth: 28 } }
      : { 0: { cellWidth: 8 }, 2: { halign: 'right', cellWidth: 18 }, 3: { cellWidth: 14 }, 4: { halign: 'right', cellWidth: 28 }, 5: { halign: 'right', cellWidth: 30 } },
  })

  y = doc.lastAutoTable.finalY + 5

  // ---------- totals ----------
  const totalsX = W - M - 70
  const rows = [['Subtotal', money(po.subtotal)]]
  if (po.tax_mode === 'cgst_sgst') {
    rows.push(['CGST', money(po.tax_total / 2)], ['SGST', money(po.tax_total / 2)])
  } else if (po.tax_mode === 'igst') {
    rows.push(['IGST', money(po.tax_total)])
  }
  rows.push(['TOTAL', money(po.grand_total)])

  doc.setFontSize(9)
  for (let i = 0; i < rows.length; i++) {
    const isTotal = i === rows.length - 1
    if (isTotal) {
      doc.setDrawColor(...line).line(totalsX, y - 2, W - M, y - 2)
      doc.setFont('helvetica', 'bold').setTextColor(...dark).setFontSize(10)
      y += 1
    } else {
      doc.setFont('helvetica', 'normal').setTextColor(...gray)
    }
    doc.text(rows[i][0], totalsX, y)
    doc.text(rows[i][1], W - M, y, { align: 'right' })
    y += 5.5
  }

  y += 1
  doc.setFont('helvetica', 'italic').setFontSize(8).setTextColor(...gray)
  const words = doc.splitTextToSize(amountInWords(po.grand_total), W - 2 * M)
  doc.text(words, M, y)
  y += words.length * 3.8 + 6

  // ---------- terms ----------
  if (po.terms) {
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...gray)
    doc.text('TERMS & CONDITIONS', M, y)
    y += 4
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
    const termLines = doc.splitTextToSize(po.terms, W - 2 * M)
    doc.text(termLines, M, y)
    y += termLines.length * 3.4 + 8
  }

  // ---------- signature ----------
  if (y > 255) { doc.addPage(); y = 30 }
  y = Math.max(y, 245)
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...dark)
  doc.text(`For ${company?.name || 'Makams'}`, W - M, y, { align: 'right' })
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...gray)
  doc.text('Authorised Signatory', W - M, y + 18, { align: 'right' })

  // footer on all pages
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(148, 163, 184)
    doc.text(`${po.po_number || 'Draft PO'} · Page ${i} of ${pages}`, W / 2, 291, { align: 'center' })
  }

  return doc
}

export function downloadPoPdf(data) {
  const doc = buildPoPdf(data)
  doc.save(`${(data.po.po_number || 'PO-draft').replace(/[\/\\]/g, '-')}.pdf`)
}

/** base64 (no data: prefix) for emailing as attachment */
export function poPdfBase64(data) {
  const doc = buildPoPdf(data)
  return doc.output('datauristring').split(',')[1]
}
