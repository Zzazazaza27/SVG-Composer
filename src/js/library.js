/**
 * Library Module — manages the SVG component library panel
 */

// SVG component metadata
const COMPONENTS = [
  { name: 'laptop', label: 'Ноутбук', type: 'main', keywords: ['технологии', 'работа', 'компьютер', 'обучение'] },
  { name: 'folder', label: 'Папка', type: 'main', keywords: ['работа', 'документы', 'офис'] },
  { name: 'monitor', label: 'Монитор', type: 'main', keywords: ['технологии', 'работа', 'компьютер'] },
  { name: 'notebook', label: 'Блокнот', type: 'main', keywords: ['обучение', 'работа', 'заметки', 'креативность'] },
  { name: 'phone', label: 'Телефон', type: 'main', keywords: ['технологии', 'коммуникация', 'мобильный'] },
  { name: 'tablet', label: 'Планшет', type: 'main', keywords: ['технологии', 'обучение', 'работа'] },
  { name: 'pencil-cup', label: 'Стакан', type: 'main', keywords: ['работа', 'офис', 'креативность'] },
  { name: 'coffee', label: 'Кофе', type: 'main', keywords: ['работа', 'офис', 'отдых'] },
  { name: 'book', label: 'Книга', type: 'main', keywords: ['обучение', 'знания', 'работа'] },
  { name: 'clock', label: 'Часы', type: 'main', keywords: ['время', 'работа', 'офис'] },
  { name: 'envelope', label: 'Конверт', type: 'main', keywords: ['коммуникация', 'почта', 'работа'] },
  { name: 'camera', label: 'Камера', type: 'main', keywords: ['креативность', 'фото', 'развлечения'] },
  { name: 'chart', label: 'Диаграмма', type: 'main', keywords: ['аналитика', 'работа', 'данные'] },
  { name: 'headphones', label: 'Наушники', type: 'background', keywords: ['развлечения', 'музыка', 'работа'] },
  { name: 'usb', label: 'USB', type: 'background', keywords: ['технологии', 'данные', 'хранение'] },
  { name: 'plant', label: 'Растение', type: 'background', keywords: ['офис', 'декор', 'уют'] },
  { name: 'lamp', label: 'Лампа', type: 'background', keywords: ['офис', 'работа', 'декор'] },
  { name: 'mouse', label: 'Мышь', type: 'background', keywords: ['технологии', 'работа', 'компьютер'] },
  { name: 'keyboard', label: 'Клавиатура', type: 'background', keywords: ['технологии', 'работа', 'компьютер'] },
  { name: 'glasses', label: 'Очки', type: 'background', keywords: ['обучение', 'работа', 'офис'] },
  { name: 'gamepad', label: 'Геймпад', type: 'background', keywords: ['развлечения', 'игры', 'отдых'] },
  { name: 'cloud', label: 'Облако', type: 'background', keywords: ['технологии', 'данные', 'хранение'] },
];

export { COMPONENTS };

export class Library {
  constructor(app) {
    this.app = app;
    this.grid = document.getElementById('library-grid');
    this.svgCache = {};
    this.allItems = [];
  }

  async load(size, tabType) {
    this.grid.innerHTML = '';
    this.allItems = [];

    const filtered = COMPONENTS.filter(c => c.type === tabType);

    for (const comp of filtered) {
      await this.createLibraryItem(comp, size);
    }
  }

  async createLibraryItem(comp, size) {
    const cacheKey = `${size}/${comp.name}`;
    let svgContent;

    if (this.svgCache[cacheKey]) {
      svgContent = this.svgCache[cacheKey];
    } else {
      try {
        const response = await fetch(`/svg/${size}/${comp.name}.svg`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        svgContent = await response.text();
        this.svgCache[cacheKey] = svgContent;
      } catch (err) {
        console.warn(`Could not load /svg/${size}/${comp.name}.svg:`, err);
        return;
      }
    }

    // Apply current palette
    svgContent = this.app.colorizer.colorize(svgContent, this.app.currentPalette);

    const item = document.createElement('div');
    item.className = 'library-item';
    item.dataset.name = comp.name;
    item.dataset.type = comp.type;
    item.dataset.label = comp.label;
    item.dataset.keywords = comp.keywords.join(',');
    item.draggable = true;
    item.innerHTML = svgContent;

    // Label
    const label = document.createElement('div');
    label.className = 'library-item__name';
    label.textContent = comp.label;
    item.appendChild(label);

    // Drag events
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({
        name: comp.name,
        type: comp.type,
        size: this.app.currentSize,
        label: comp.label,
      }));
      item.classList.add('dragging-from-library');
      setTimeout(() => {
        document.getElementById('canvas-wrapper').classList.add('drag-over');
      }, 0);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging-from-library');
      document.getElementById('canvas-wrapper').classList.remove('drag-over');
    });

    // Double click to add to center
    item.addEventListener('dblclick', () => {
      this.app.canvas.addObject(comp.name, comp.type, comp.label);
    });

    this.grid.appendChild(item);
    this.allItems.push(item);
  }

  filter(query) {
    const q = query.toLowerCase().trim();
    this.allItems.forEach(item => {
      const name = item.dataset.label.toLowerCase();
      const keywords = item.dataset.keywords.toLowerCase();
      const match = !q || name.includes(q) || keywords.includes(q);
      item.style.display = match ? '' : 'none';
    });
  }

  async getSVGContent(name, size) {
    const cacheKey = `${size}/${name}`;
    if (this.svgCache[cacheKey]) {
      return this.svgCache[cacheKey];
    }
    try {
      const response = await fetch(`/svg/${size}/${name}.svg`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const content = await response.text();
      this.svgCache[cacheKey] = content;
      return content;
    } catch (err) {
      console.error(`Failed to load SVG: ${name}`, err);
      return null;
    }
  }
}
