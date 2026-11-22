/*
  Pages for the teaching board from your own files: every page of a PDF, or a
  photo or screenshot. Everything happens on the device; pdf.js is loaded only
  the first time a PDF is opened.
*/

const MAX_PAGES = 80

/** Render width: sharp on the 1600×900 board, small enough for a tablet's memory. */
function scaleFor(w: number, h: number, bw: number, bh: number) {
  return Math.min(bw / w, bh / h) * 1.25
}

async function* pdfPages(file: File, bw: number, bh: number, progress: (n: number, total: number) => void) {
  const pdfjs = await import('pdfjs-dist')
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = worker
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const total = Math.min(doc.numPages, MAX_PAGES)
  try {
    for (let i = 1; i <= total; i++) {
      progress(i, total)
      const page = await doc.getPage(i)
      const base = page.getViewport({ scale: 1 })
      const vp = page.getViewport({ scale: scaleFor(base.width, base.height, bw, bh) })
      const c = document.createElement('canvas')
      c.width = Math.ceil(vp.width)
      c.height = Math.ceil(vp.height)
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, c.width, c.height)
      await page.render({ canvasContext: ctx, viewport: vp }).promise
      page.cleanup()
      yield c
    }
  } finally {
    void doc.destroy()
  }
}

async function imagePage(file: File, bw: number, bh: number) {
  const bmp = await createImageBitmap(file)
  // Large photos are drawn down once, so the board repaints quickly.
  const k = Math.min(1, scaleFor(bmp.width, bmp.height, bw, bh))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  return c
}

/** The pages in a file, one canvas each, in order. */
export async function* pageImages(file: File, bw: number, bh: number, progress: (n: number, total: number) => void = () => {}) {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    yield* pdfPages(file, bw, bh, progress)
  } else if (file.type.startsWith('image/')) {
    yield await imagePage(file, bw, bh)
  } else {
    throw new Error(`“${file.name}” isn’t a PDF or a picture.`)
  }
}
