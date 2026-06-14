/**
 * Per-page export — capture a rendered report page EXACTLY as shown on screen
 * (charts, layout, fonts, colours) and save it as PDF or Word.
 *
 * It rasterises the live DOM node with html2canvas, so the output matches the
 * on-screen design pixel-for-pixel (the existing server-side exporters rebuild
 * content from JSON and cannot reproduce the React/ECharts visualisations).
 *
 * All heavy libraries are loaded with dynamic import() so they are code-split
 * into separate chunks and never weigh down the main bundle.
 */

async function captureNode(node) {
  // Ensure web fonts are loaded so captured text matches the screen.
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch { /* ignore */ }
  }
  const html2canvas = (await import('html2canvas')).default;
  return html2canvas(node, {
    scale: 2,                    // 2× for crisp text/lines
    backgroundColor: '#ffffff',  // fill transparent areas white
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
  });
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

/** Export the node as a (possibly multi-page) A4 PDF, design preserved. */
export async function exportViewToPdf(node, filename) {
  const canvas = await captureNode(node);
  const { jsPDF } = await import('jspdf');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;
  const imgData = canvas.toDataURL('image/png');

  // Place the full-height image and shift it up page-by-page to paginate.
  let heightLeft = imgH;
  let position = margin;
  pdf.addImage(imgData, 'PNG', margin, position, imgW, imgH, undefined, 'FAST');
  heightLeft -= (pageH - margin * 2);
  while (heightLeft > 0) {
    position = margin - (imgH - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', margin, position, imgW, imgH, undefined, 'FAST');
    heightLeft -= (pageH - margin * 2);
  }
  pdf.save(filename);
}

/** Slice a tall canvas into A4-proportioned tiles so Word paginates cleanly. */
function sliceCanvas(source, sliceHeightPx) {
  const slices = [];
  for (let y = 0; y < source.height; y += sliceHeightPx) {
    const h = Math.min(sliceHeightPx, source.height - y);
    const c = document.createElement('canvas');
    c.width = source.width;
    c.height = h;
    c.getContext('2d').drawImage(source, 0, y, source.width, h, 0, 0, source.width, h);
    slices.push(c);
  }
  return slices;
}

function canvasToArrayBuffer(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('toBlob failed'));
      blob.arrayBuffer().then(resolve, reject);
    }, 'image/png');
  });
}

/** Export the node into a .docx with the rendered design embedded (image), paginated. */
export async function exportViewToDocx(node, filename, title) {
  const canvas = await captureNode(node);
  const { Document, Packer, Paragraph, ImageRun, TextRun, AlignmentType } = await import('docx');

  // A4 printable aspect (≈ 281mm tall / 194mm wide) -> tile the capture per page.
  const A4_PRINTABLE_ASPECT = 281 / 194;
  const sliceHeightPx = Math.max(1, Math.round(canvas.width * A4_PRINTABLE_ASPECT));
  const slices = sliceCanvas(canvas, sliceHeightPx);

  const targetW = 600; // px ≈ A4 content width at the chosen margins
  const children = [];
  if (title) {
    children.push(new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ text: title, bold: true, size: 26, font: 'Arial' })],
    }));
  }
  for (const slice of slices) {
    const data = await canvasToArrayBuffer(slice);
    const h = Math.round((slice.height * targetW) / slice.width);
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ data, transformation: { width: targetW, height: h } })],
    }));
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 720, bottom: 720, left: 720, right: 720 },
        },
      },
      children,
    }],
  });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, filename);
}
