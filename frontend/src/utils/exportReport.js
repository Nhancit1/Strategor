/**
 * Full-report export — build the complete deliverable from the RENDERED report pages,
 * so the Word / PDF / PowerPoint output matches the on-screen design exactly.
 *
 * The design only exists in the browser (React + ECharts + Tailwind), so we rasterise
 * each rendered section with html2canvas and assemble the captures into each format.
 * All heavy libs are dynamically imported (code-split, loaded only on export).
 *
 * Each section node is expected to already include its own title (rendered by
 * ReportCanvas), so the capture is self-contained.
 */

async function nodeToCanvas(node) {
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch { /* ignore */ }
  }
  const html2canvas = (await import('html2canvas')).default;
  return html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Capture each report section sequentially (lower memory than all-at-once). */
async function captureSections(sectionEls, onProgress) {
  const shots = [];
  for (let i = 0; i < sectionEls.length; i++) {
    const canvas = await nodeToCanvas(sectionEls[i]);
    shots.push({ title: sectionEls[i].dataset.title || '', canvas });
    if (onProgress) onProgress(i + 1, sectionEls.length);
  }
  return shots;
}

// ── PDF (A4 portrait, one section per page, scaled to fit) ───────────────────
async function buildPdf(shots, meta) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;

  // Cover
  pdf.setFontSize(26); pdf.setTextColor(30, 26, 23);
  pdf.text('Stratégie', margin, 40);
  pdf.setFontSize(16); pdf.text(String(meta.name || ''), margin, 52);
  pdf.setFontSize(11); pdf.setTextColor(110, 106, 98);
  pdf.text('Strategor — ' + new Date().toLocaleDateString(), margin, 62);
  pdf.setTextColor(0, 0, 0);

  for (const sec of shots) {
    pdf.addPage();
    const data = sec.canvas.toDataURL('image/png');
    let w = pageW - margin * 2;
    let h = (sec.canvas.height * w) / sec.canvas.width;
    const availH = pageH - margin * 2;
    if (h > availH) { const s = availH / h; h = availH; w = w * s; }
    const x = (pageW - w) / 2;
    pdf.addImage(data, 'PNG', x, margin, w, h, undefined, 'FAST');
  }
  pdf.save(`strategie-${meta.projectId}.pdf`);
}

// ── Word (one section per page, image scaled to fit) ─────────────────────────
function canvasToArrayBuffer(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? b.arrayBuffer().then(resolve, reject) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

async function buildDocx(shots, meta) {
  const { Document, Packer, Paragraph, ImageRun, TextRun, AlignmentType, PageBreak } = await import('docx');
  const CONTENT_W = 600;   // px ≈ A4 content width
  const MAX_H = 850;       // px ≈ A4 content height at this width

  const children = [
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'Stratégie', bold: true, size: 44, font: 'Arial', color: 'E8621A' })] }),
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: String(meta.name || ''), size: 28, font: 'Arial' })] }),
    new Paragraph({ children: [new TextRun({ text: 'Strategor — ' + new Date().toLocaleDateString(), size: 20, color: '6E6A62', font: 'Arial' })] }),
  ];
  for (const sec of shots) {
    let w = CONTENT_W;
    let h = (sec.canvas.height * w) / sec.canvas.width;
    if (h > MAX_H) { const s = MAX_H / h; h = MAX_H; w = w * s; }
    const data = await canvasToArrayBuffer(sec.canvas);
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ data, transformation: { width: Math.round(w), height: Math.round(h) } })],
    }));
  }
  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
      children,
    }],
  });
  triggerDownload(await Packer.toBlob(doc), `strategie-${meta.projectId}.docx`);
}

// ── PowerPoint (16:9, one slide per section, image fit + centered) ───────────
async function buildPptx(shots, meta) {
  const pptxgen = (await import('pptxgenjs')).default;
  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'W', width: 13.333, height: 7.5 });
  pptx.layout = 'W';
  const SW = 13.333, SH = 7.5;

  // Title slide
  const t = pptx.addSlide();
  t.background = { color: 'FFFFFF' };
  t.addText('Stratégie', { x: 0.6, y: 2.7, w: 12, h: 1.1, fontSize: 40, bold: true, color: 'E8621A', fontFace: 'Arial' });
  t.addText(String(meta.name || ''), { x: 0.6, y: 3.9, w: 12, h: 0.8, fontSize: 22, color: '1C1A17', fontFace: 'Arial' });
  t.addText('Strategor — ' + new Date().toLocaleDateString(), { x: 0.6, y: 6.6, w: 12, h: 0.5, fontSize: 12, color: '6E6A62', fontFace: 'Arial' });

  const margin = 0.3;
  for (const sec of shots) {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };
    const data = sec.canvas.toDataURL('image/png');
    const availW = SW - margin * 2;
    const availH = SH - margin * 2;
    const ar = sec.canvas.width / sec.canvas.height;
    let w = availW, h = w / ar;
    if (h > availH) { h = availH; w = h * ar; }
    slide.addImage({ data, x: (SW - w) / 2, y: (SH - h) / 2, w, h });
  }
  await pptx.writeFile({ fileName: `strategie-${meta.projectId}.pptx` });
}

/**
 * Capture the given section nodes and assemble them into `format`.
 * @param {HTMLElement[]} sectionEls  nodes (each a rendered report section incl. title)
 * @param {'pdf'|'docx'|'pptx'} format
 * @param {{name:string, projectId:string}} meta
 * @param {(done:number,total:number)=>void} [onProgress]
 */
export async function exportFullReport(sectionEls, format, meta, onProgress) {
  if (!sectionEls || sectionEls.length === 0) throw new Error('no report sections to export');
  const shots = await captureSections(sectionEls, onProgress);
  if (format === 'pdf') return buildPdf(shots, meta);
  if (format === 'docx') return buildDocx(shots, meta);
  if (format === 'pptx') return buildPptx(shots, meta);
  throw new Error('unsupported design-export format: ' + format);
}
