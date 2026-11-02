/**
 * Composer Module — Automatic scene assembly
 * Scenario 1: Metaphor / title keyword search & scene generation
 * Scenario 2: User manually selects components & assembles into scene
 */

import { COMPONENTS } from './library.js';
import { showToast } from './toast.js';

export class Composer {
  constructor(app) {
    this.app = app;
    this.selectedForAuto = new Set();
  }

  /**
   * Populate the manual selection grid in the auto-compose modal
   */
  async populateAutoGrid() {
    const grid = document.getElementById('auto-grid');
    if (!grid) return;

    grid.innerHTML = '';

    for (const comp of COMPONENTS) {
      const item = document.createElement('div');
      item.className = `auto-item ${this.selectedForAuto.has(comp.name) ? 'selected' : ''}`;
      item.dataset.name = comp.name;

      let svg = await this.app.library.getSVGContent(comp.name, 'L');
      if (svg) {
        svg = this.app.colorizer.colorize(svg, this.app.currentPalette);
      }

      item.innerHTML = `
        <div class="auto-item__preview">${svg || ''}</div>
        <span class="auto-item__label">${comp.label}</span>
        <span class="auto-item__badge">${comp.type === 'main' ? 'Главный' : 'Фон'}</span>
      `;

      item.addEventListener('click', () => {
        if (this.selectedForAuto.has(comp.name)) {
          this.selectedForAuto.delete(comp.name);
          item.classList.remove('selected');
        } else {
          this.selectedForAuto.add(comp.name);
          item.classList.add('selected');
        }
      });

      grid.appendChild(item);
    }
  }

  /**
   * Execute composition assembly
   */
  async compose() {
    const isMetaphorMode = document.getElementById('auto-tab-metaphor')?.classList.contains('active');
    const count = parseInt(document.getElementById('auto-count')?.value) || 5;

    let chosenComponents = [];

    if (isMetaphorMode) {
      const input = document.getElementById('auto-metaphor-input')?.value.trim() || 'технологии и работа';
      chosenComponents = this.pickComponentsByMetaphor(input, count);
    } else {
      // Manual selection mode
      if (this.selectedForAuto.size === 0) {
        showToast('Выберите хотя бы один компонент', 'error');
        return;
      }
      chosenComponents = COMPONENTS.filter(c => this.selectedForAuto.has(c.name));
    }

    if (chosenComponents.length === 0) {
      showToast('Не удалось подобрать компоненты', 'error');
      return;
    }

    // Clear current canvas
    this.app.canvas.clear();

    // Assemble the scene
    await this.assembleScene(chosenComponents);

    showToast(`Собрана композиция из ${chosenComponents.length} объектов`, 'success');
  }

  /**
   * Find matching components based on keyword matching and scoring
   */
  pickComponentsByMetaphor(metaphorText, targetCount) {
    const words = metaphorText.toLowerCase().split(/[\s,.;:!?]+/).filter(w => w.length > 2);

    const scored = COMPONENTS.map(comp => {
      let score = 0;
      const compLabel = comp.label.toLowerCase();
      const compKeywords = comp.keywords.map(k => k.toLowerCase());

      words.forEach(word => {
        if (compLabel.includes(word)) score += 10;
        compKeywords.forEach(kw => {
          if (kw.includes(word) || word.includes(kw)) score += 5;
        });
      });

      return { comp, score };
    });

    // Sort by relevance score
    scored.sort((a, b) => b.score - a.score);

    // Pick top scored items
    let top = scored.filter(s => s.score > 0).map(s => s.comp);

    // If score-based didn't produce enough, fill from default pool
    if (top.length < targetCount) {
      const remaining = COMPONENTS.filter(c => !top.includes(c));
      while (top.length < targetCount && remaining.length > 0) {
        const randIdx = Math.floor(Math.random() * remaining.length);
        top.push(remaining.splice(randIdx, 1)[0]);
      }
    }

    top = top.slice(0, targetCount);

    // Ensure we have at least 1 main and at least 1 background if possible
    const hasMain = top.some(c => c.type === 'main');
    const hasBg = top.some(c => c.type === 'background');

    if (!hasMain) {
      const mainComp = COMPONENTS.find(c => c.type === 'main');
      if (mainComp) top[0] = mainComp;
    }
    if (!hasBg && top.length > 2) {
      const bgComp = COMPONENTS.find(c => c.type === 'background');
      if (bgComp) top[top.length - 1] = bgComp;
    }

    return top;
  }

  /**
   * Place components in a balanced, aesthetic composition
   */
  async assembleScene(components) {
    const canvasW = this.app.canvas.canvasWidth;
    const canvasH = this.app.canvas.canvasHeight;
    const cx = canvasW / 2;
    const cy = canvasH / 2;

    // Separate into main and background
    const mainComps = components.filter(c => c.type === 'main');
    const bgComps = components.filter(c => c.type === 'background');

    // Sort: Add background elements first (so they are rendered behind in SVG DOM order)
    const renderQueue = [
      ...bgComps.map(c => ({ comp: c, isBg: true })),
      ...mainComps.map(c => ({ comp: c, isBg: false }))
    ];

    // Layout slots based on total count
    const total = components.length;

    // Geometric anchor positions around the center stage
    const bgSlots = [
      { x: cx - 340, y: cy - 140, rot: -8, scale: 0.85 },
      { x: cx + 280, y: cy - 130, rot: 10, scale: 0.85 },
      { x: cx - 220, y: cy - 200, rot: -5, scale: 0.75 },
      { x: cx + 180, y: cy - 210, rot: 6, scale: 0.75 },
      { x: cx,       y: cy - 220, rot: 0, scale: 0.70 },
      { x: cx - 380, y: cy + 60,  rot: -12, scale: 0.80 },
      { x: cx + 360, y: cy + 70,  rot: 12, scale: 0.80 },
    ];

    const mainSlotsSingle = [
      { x: cx, y: cy + 40, rot: 0, scale: 1.15 }
    ];

    const mainSlotsDouble = [
      { x: cx - 140, y: cy + 30, rot: -4, scale: 1.05 },
      { x: cx + 150, y: cy + 40, rot: 4, scale: 1.05 }
    ];

    const mainSlotsTriple = [
      { x: cx,       y: cy + 40, rot: 0, scale: 1.1 },
      { x: cx - 230, y: cy + 50, rot: -6, scale: 0.95 },
      { x: cx + 230, y: cy + 50, rot: 6, scale: 0.95 }
    ];

    const mainSlotsMany = [
      { x: cx,       y: cy + 40, rot: 0, scale: 1.05 },
      { x: cx - 180, y: cy + 30, rot: -5, scale: 0.9 },
      { x: cx + 180, y: cy + 35, rot: 5, scale: 0.9 },
      { x: cx - 110, y: cy + 130, rot: -2, scale: 0.85 },
      { x: cx + 120, y: cy + 130, rot: 2, scale: 0.85 }
    ];

    let mainSlots = mainSlotsSingle;
    if (mainComps.length === 2) mainSlots = mainSlotsDouble;
    else if (mainComps.length === 3) mainSlots = mainSlotsTriple;
    else if (mainComps.length >= 4) mainSlots = mainSlotsMany;

    // 1. Place background elements
    for (let i = 0; i < bgComps.length; i++) {
      const comp = bgComps[i];
      const slot = bgSlots[i % bgSlots.length];
      const obj = await this.app.canvas.addObject(
        comp.name,
        'background',
        comp.label,
        slot.x,
        slot.y,
        'L'
      );
      if (obj) {
        obj.rotation = slot.rot;
        obj.scale = slot.scale;
        obj.opacity = 0.45;
        this.app.canvas.applyTransform(obj);
        obj.element.style.opacity = obj.opacity;
      }
    }

    // 2. Place main elements
    for (let i = 0; i < mainComps.length; i++) {
      const comp = mainComps[i];
      const slot = mainSlots[i % mainSlots.length];
      const obj = await this.app.canvas.addObject(
        comp.name,
        'main',
        comp.label,
        slot.x,
        slot.y,
        'L'
      );
      if (obj) {
        obj.rotation = slot.rot;
        obj.scale = slot.scale;
        obj.opacity = 1.0;
        this.app.canvas.applyTransform(obj);
      }
    }

    // Select the first main object
    if (this.app.canvas.objects.length > 0) {
      const lastObj = this.app.canvas.objects[this.app.canvas.objects.length - 1];
      this.app.canvas.selectObject(lastObj);
    }
  }
}
