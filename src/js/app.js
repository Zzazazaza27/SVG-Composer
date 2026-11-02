/**
 * SVG Composer — Main Application Entry Point
 * Конструктор иллюстрационных композиций из SVG-компонентов
 */

import { Library } from './library.js';
import { Canvas } from './canvas.js';
import { Colorizer } from './colorizer.js';
import { Composer } from './composer.js';
import { Exporter } from './exporter.js';
import { showToast } from './toast.js';

class App {
  constructor() {
    this.currentPalette = 'violet';
    this.currentSize = 'L';
    this.currentTab = 'main';
    this.library = null;
    this.canvas = null;
    this.colorizer = null;
    this.composer = null;
    this.exporter = null;
  }

  async init() {
    // Initialize modules
    this.colorizer = new Colorizer();
    this.library = new Library(this);
    this.canvas = new Canvas(this);
    this.composer = new Composer(this);
    this.exporter = new Exporter(this);

    // Load library
    await this.library.load(this.currentSize, this.currentTab);

    // Bind events
    this.bindPaletteSelector();
    this.bindSizeToggle();
    this.bindTabSwitcher();
    this.bindToolbar();
    this.bindFormatSelector();
    this.bindAutoModal();
    this.bindExport();
    this.bindPanelTabs();
    this.bindSearch();
    this.bindKeyboard();

    // Initial state
    this.updateCanvasSize(1200, 630);

    showToast('SVG Composer загружен', 'success');
  }

  bindPaletteSelector() {
    const chips = document.querySelectorAll('.palette-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentPalette = chip.dataset.palette;
        this.colorizer.applyPalette(this.currentPalette, this.canvas);
        showToast(`Палитра: ${this.getPaletteName(this.currentPalette)}`);
      });
    });
  }

  bindSizeToggle() {
    const btns = document.querySelectorAll('.size-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', async () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentSize = btn.dataset.size;
        await this.library.load(this.currentSize, this.currentTab);
        showToast(`Размер: ${this.currentSize}`);
      });
    });
  }

  bindTabSwitcher() {
    const mainTab = document.getElementById('tab-main');
    const bgTab = document.getElementById('tab-bg');

    mainTab.addEventListener('click', async () => {
      mainTab.classList.add('active');
      bgTab.classList.remove('active');
      this.currentTab = 'main';
      await this.library.load(this.currentSize, this.currentTab);
    });

    bgTab.addEventListener('click', async () => {
      bgTab.classList.add('active');
      mainTab.classList.remove('active');
      this.currentTab = 'background';
      await this.library.load(this.currentSize, this.currentTab);
    });
  }

  bindToolbar() {
    document.getElementById('tool-duplicate')?.addEventListener('click', () => this.canvas.duplicateSelected());
    document.getElementById('tool-delete')?.addEventListener('click', () => this.canvas.deleteSelected());
    document.getElementById('tool-layer-up')?.addEventListener('click', () => this.canvas.moveLayerUp());
    document.getElementById('tool-layer-down')?.addEventListener('click', () => this.canvas.moveLayerDown());
    document.getElementById('tool-rotate-left')?.addEventListener('click', () => this.canvas.rotateSelected(-15));
    document.getElementById('tool-rotate-right')?.addEventListener('click', () => this.canvas.rotateSelected(15));
    document.getElementById('tool-zoom-in')?.addEventListener('click', () => this.canvas.zoom(0.1));
    document.getElementById('tool-zoom-out')?.addEventListener('click', () => this.canvas.zoom(-0.1));
    document.getElementById('tool-fit')?.addEventListener('click', () => this.canvas.fitToView());
  }

  bindFormatSelector() {
    const btns = document.querySelectorAll('.format-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const w = parseInt(btn.dataset.w);
        const h = parseInt(btn.dataset.h);
        this.updateCanvasSize(w, h);
      });
    });
  }

  updateCanvasSize(w, h) {
    const svg = document.getElementById('main-canvas');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const container = document.getElementById('canvas-container');
    const wrapper = document.getElementById('canvas-wrapper');
    const wrapperRect = wrapper.getBoundingClientRect();

    const maxW = wrapperRect.width - 60;
    const maxH = wrapperRect.height - 40;
    const scale = Math.min(maxW / w, maxH / h, 1);

    container.style.width = `${w * scale}px`;
    container.style.height = `${h * scale}px`;

    this.canvas.canvasWidth = w;
    this.canvas.canvasHeight = h;
  }

  bindAutoModal() {
    const modal = document.getElementById('auto-modal');
    const btnAuto = document.getElementById('btn-auto');
    const btnClose = document.getElementById('auto-modal-close');
    const btnCancel = document.getElementById('auto-cancel');
    const btnCompose = document.getElementById('auto-compose');

    btnAuto?.addEventListener('click', () => {
      modal.classList.remove('hidden');
      this.composer.populateAutoGrid();
    });

    btnClose?.addEventListener('click', () => modal.classList.add('hidden'));
    btnCancel?.addEventListener('click', () => modal.classList.add('hidden'));

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });

    // Auto mode tabs
    const tabs = document.querySelectorAll('.auto-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.mode;
        document.getElementById('auto-metaphor-section').classList.toggle('hidden', mode !== 'metaphor');
        document.getElementById('auto-select-section').classList.toggle('hidden', mode !== 'select');
      });
    });

    // Suggestions
    document.querySelectorAll('.suggestion').forEach(sug => {
      sug.addEventListener('click', () => {
        document.getElementById('auto-metaphor-input').value = sug.dataset.kw;
      });
    });

    // Count slider
    const countSlider = document.getElementById('auto-count');
    const countValue = document.getElementById('auto-count-value');
    countSlider?.addEventListener('input', () => {
      countValue.textContent = countSlider.value;
    });

    // Compose button
    btnCompose?.addEventListener('click', () => {
      this.composer.compose();
      modal.classList.add('hidden');
    });
  }

  bindExport() {
    document.getElementById('btn-export')?.addEventListener('click', () => {
      this.exporter.exportSVG();
    });
  }

  bindPanelTabs() {
    const propsTab = document.getElementById('tab-props');
    const layersTab = document.getElementById('tab-layers');
    const propsContent = document.getElementById('properties-content');
    const layersContent = document.getElementById('layers-content');

    propsTab?.addEventListener('click', () => {
      propsTab.classList.add('active');
      layersTab.classList.remove('active');
      propsContent.classList.remove('hidden');
      layersContent.classList.add('hidden');
    });

    layersTab?.addEventListener('click', () => {
      layersTab.classList.add('active');
      propsTab.classList.remove('active');
      layersContent.classList.remove('hidden');
      propsContent.classList.add('hidden');
    });
  }

  bindSearch() {
    const input = document.getElementById('search-input');
    input?.addEventListener('input', () => {
      this.library.filter(input.value);
    });
  }

  bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          this.canvas.deleteSelected();
          break;
        case 'd':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.canvas.duplicateSelected();
          }
          break;
        case 'Escape':
          this.canvas.deselectAll();
          document.getElementById('auto-modal').classList.add('hidden');
          break;
        case '[':
          this.canvas.moveLayerDown();
          break;
        case ']':
          this.canvas.moveLayerUp();
          break;
        case '=':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.canvas.zoom(0.1);
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.canvas.zoom(-0.1);
          }
          break;
      }
    });
  }

  getPaletteName(palette) {
    const names = {
      violet: 'Фиолетовая',
      warm: 'Бежево-оранжевая',
      cool: 'Сине-голубая'
    };
    return names[palette] || palette;
  }
}

// Initialize app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch(err => {
    console.error('Failed to initialize app:', err);
    showToast('Ошибка инициализации', 'error');
  });
});
