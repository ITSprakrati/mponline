import * as pdfjsLib from 'pdfjs-dist';

// Use CDN for the worker to avoid Vite import analysis and bundling issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;


export async function processPDF(file, onProgress = () => {}) {
  try {
    onProgress('File received ✓');
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    onProgress('Opening PDF...');
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDoc = await loadingTask.promise;
    onProgress('PDF opened ✓');
    
    const numPages = pdfDoc.numPages;
    onProgress(`Pages detected: ${numPages}`);
    const canvases = [];

    // For performance, we'll only render the first few pages right away, 
    // or we can render all of them if the document isn't too huge.
    // For EvalOS prototype, we will render up to 12 pages.
    const pagesToRender = Math.min(numPages, 12);
    
    onProgress(`Rendering ${pagesToRender} pages...`);
    for (let i = 1; i <= pagesToRender; i++) {
      const page = await pdfDoc.getPage(i);
      
      // Calculate scale to fit our 1024x1448 canvas expectation (approximate)
      // Standard A4 is ~595x842 at 72dpi. 1.7x scale gets us near 1024x1448.
      const viewport = page.getViewport({ scale: 1.7 });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Render PDF page into canvas context
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      canvases.push(canvas);
    }
    onProgress('Page rendering ✓');
    onProgress('Text extraction — OCR pending');

    return {
      name: file.name,
      size: file.size,
      pages: numPages,
      renderedCanvases: canvases,
      pdfDoc: pdfDoc
    };
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw error;
  }
}

