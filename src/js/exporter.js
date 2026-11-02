/**
 * Exporter Module — Exports canvas composition as a clean, standalone SVG file
 * without rasterization or editor artifacts.
 */

import { showToast } from './toast.js';

export class Exporter {
  constructor(app) {
    this.app = app;
  }

  exportSVG() {
    const origSvg = document.getElementById('main-canvas');
    if (!origSvg) {
      showToast('Холст не найден', 'error');
      return;
    }

    if (this.app.canvas.objects.length === 0) {
      showToast('Холст пуст — нечего экспортировать', 'error');
      return;
    }

    // Clone the SVG DOM element
    const clone = origSvg.cloneNode(true);

    // Set explicit width and height matching viewBox
    const viewBox = clone.getAttribute('viewBox') || `0 0 ${this.app.canvas.canvasWidth} ${this.app.canvas.canvasHeight}`;
    const [vx, vy, vw, vh] = viewBox.split(/\s+/).map(Number);
    clone.setAttribute('width', vw || this.app.canvas.canvasWidth);
    clone.setAttribute('height', vh || this.app.canvas.canvasHeight);

    // Remove selection classes and editing styles
    clone.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    clone.querySelectorAll('.canvas-object').forEach(el => {
      el.removeAttribute('data-id');
      el.style.cursor = '';
      el.style.filter = '';
    });

    // Remove grid pattern rect if present, keeping clean solid background
    const gridRect = clone.querySelector('rect[fill="url(#grid-pattern)"]');
    if (gridRect) gridRect.remove();

    const gridPattern = clone.querySelector('#grid-pattern');
    if (gridPattern) gridPattern.remove();

    // Serialize to XML string
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clone);

    // Add standard XML declaration and doctype
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n';
    const finalSvg = xmlHeader + svgString;

    // Trigger download
    const blob = new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `composition-${this.app.currentPalette}-${timestamp}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('SVG файл успешно экспортирован!', 'success');
  }
}
