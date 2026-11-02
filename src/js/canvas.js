/**
 * Canvas Module — manages SVG composition canvas, object interactions,
 * transformations, selections, and layer hierarchy.
 */

export class Canvas {
  constructor(app) {
    this.app = app;
    this.svg = document.getElementById('main-canvas');
    this.wrapper = document.getElementById('canvas-wrapper');
    this.container = document.getElementById('canvas-container');
    this.dropHint = document.getElementById('drop-hint');

    this.canvasWidth = 1200;
    this.canvasHeight = 630;
    this.zoomLevel = 1.0;

    this.objects = [];
    this.selectedObject = null;

    // Dragging state
    this.isDragging = false;
    this.dragStartPos = { x: 0, y: 0 };
    this.dragObjStartPos = { x: 0, y: 0 };

    this.initEvents();
    this.initPropertiesBinding();
    this.updateDropHint();
  }

  initEvents() {
    // Drag & Drop from library
    this.wrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      this.wrapper.classList.add('drag-over');
    });

    this.wrapper.addEventListener('dragleave', (e) => {
      if (!this.wrapper.contains(e.relatedTarget)) {
        this.wrapper.classList.remove('drag-over');
      }
    });

    this.wrapper.addEventListener('drop', async (e) => {
      e.preventDefault();
      this.wrapper.classList.remove('drag-over');

      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (!raw) return;
        const data = JSON.parse(raw);
        const svgCoords = this.clientToSvg(e.clientX, e.clientY);

        await this.addObject(
          data.name,
          data.type,
          data.label,
          svgCoords.x,
          svgCoords.y,
          data.size || this.app.currentSize
        );
      } catch (err) {
        console.error('Error handling drop:', err);
      }
    });

    // Deselect on empty canvas click
    this.svg.addEventListener('pointerdown', (e) => {
      if (e.target === this.svg || e.target.tagName === 'rect' && e.target.parentElement === this.svg) {
        this.deselectAll();
      }
    });

    // Object movement via window pointer events
    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging || !this.selectedObject) return;

      const currentSvgCoords = this.clientToSvg(e.clientX, e.clientY);
      const dx = currentSvgCoords.x - this.dragStartPos.x;
      const dy = currentSvgCoords.y - this.dragStartPos.y;

      this.selectedObject.x = Math.round(this.dragObjStartPos.x + dx);
      this.selectedObject.y = Math.round(this.dragObjStartPos.y + dy);

      this.applyTransform(this.selectedObject);
      this.updatePropertiesPanel(this.selectedObject);
    });

    window.addEventListener('pointerup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.updateLayersList();
      }
    });
  }

  initPropertiesBinding() {
    const propX = document.getElementById('prop-x');
    const propY = document.getElementById('prop-y');
    const propW = document.getElementById('prop-w');
    const propH = document.getElementById('prop-h');
    const propRot = document.getElementById('prop-rotation');
    const propRotVal = document.getElementById('prop-rotation-value');
    const propScale = document.getElementById('prop-scale');
    const propScaleVal = document.getElementById('prop-scale-value');
    const propOpacity = document.getElementById('prop-opacity');
    const propOpacityVal = document.getElementById('prop-opacity-value');
    const typeMain = document.getElementById('type-main');
    const typeBg = document.getElementById('type-bg');

    propX?.addEventListener('input', () => {
      if (!this.selectedObject) return;
      this.selectedObject.x = parseFloat(propX.value) || 0;
      this.applyTransform(this.selectedObject);
    });

    propY?.addEventListener('input', () => {
      if (!this.selectedObject) return;
      this.selectedObject.y = parseFloat(propY.value) || 0;
      this.applyTransform(this.selectedObject);
    });

    propW?.addEventListener('input', () => {
      if (!this.selectedObject) return;
      this.selectedObject.width = Math.max(10, parseFloat(propW.value) || 10);
      this.applyTransform(this.selectedObject);
    });

    propH?.addEventListener('input', () => {
      if (!this.selectedObject) return;
      this.selectedObject.height = Math.max(10, parseFloat(propH.value) || 10);
      this.applyTransform(this.selectedObject);
    });

    propRot?.addEventListener('input', () => {
      if (!this.selectedObject) return;
      const val = parseInt(propRot.value) || 0;
      this.selectedObject.rotation = val;
      propRotVal.textContent = `${val}°`;
      this.applyTransform(this.selectedObject);
    });

    propScale?.addEventListener('input', () => {
      if (!this.selectedObject) return;
      const val = parseInt(propScale.value) || 100;
      this.selectedObject.scale = val / 100;
      propScaleVal.textContent = `${val}%`;
      this.applyTransform(this.selectedObject);
    });

    propOpacity?.addEventListener('input', () => {
      if (!this.selectedObject) return;
      const val = parseInt(propOpacity.value) || 100;
      this.selectedObject.opacity = val / 100;
      propOpacityVal.textContent = `${val}%`;
      this.selectedObject.element.style.opacity = this.selectedObject.opacity;
    });

    typeMain?.addEventListener('click', () => {
      if (!this.selectedObject) return;
      this.setObjectType(this.selectedObject, 'main');
    });

    typeBg?.addEventListener('click', () => {
      if (!this.selectedObject) return;
      this.setObjectType(this.selectedObject, 'background');
    });
  }

  setObjectType(obj, type) {
    obj.type = type;
    const typeMain = document.getElementById('type-main');
    const typeBg = document.getElementById('type-bg');

    if (type === 'background') {
      obj.element.classList.add('background-type');
      obj.opacity = 0.45;
      typeBg?.classList.add('active');
      typeMain?.classList.remove('active');
    } else {
      obj.element.classList.remove('background-type');
      obj.opacity = 1.0;
      typeMain?.classList.add('active');
      typeBg?.classList.remove('active');
    }

    obj.element.style.opacity = obj.opacity;
    const propOpacity = document.getElementById('prop-opacity');
    const propOpacityVal = document.getElementById('prop-opacity-value');
    if (propOpacity && propOpacityVal) {
      propOpacity.value = Math.round(obj.opacity * 100);
      propOpacityVal.textContent = `${Math.round(obj.opacity * 100)}%`;
    }

    this.updateLayersList();
  }

  clientToSvg(clientX, clientY) {
    const pt = this.svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = this.svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  /**
   * Add a new component to the canvas
   */
  async addObject(name, type = 'main', label = '', x = null, y = null, size = 'L') {
    let svgContent = await this.app.library.getSVGContent(name, size);
    if (!svgContent) return null;

    // Recolor with current palette
    svgContent = this.app.colorizer.colorize(svgContent, this.app.currentPalette);

    // Parse SVG to extract viewBox and contents
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const rootSvg = doc.documentElement;

    const viewBoxAttr = rootSvg.getAttribute('viewBox') || '0 0 160 160';
    const vbParts = viewBoxAttr.split(/[\s,]+/).map(Number);
    const natWidth = vbParts[2] || 160;
    const natHeight = vbParts[3] || 160;

    // Default sizing
    const scaleFactor = size === 'S' ? 0.65 : 1.0;
    const width = natWidth * scaleFactor;
    const height = natHeight * scaleFactor;

    // Place at specified point (centered) or at center of canvas with slight random offset
    let posX = x !== null ? x - width / 2 : (this.canvasWidth - width) / 2 + (Math.random() * 80 - 40);
    let posY = y !== null ? y - height / 2 : (this.canvasHeight - height) / 2 + (Math.random() * 80 - 40);

    const id = 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

    // Create SVG Group element for the canvas object
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `canvas-object ${type === 'background' ? 'background-type' : ''}`);
    g.setAttribute('id', id);
    g.dataset.id = id;

    // Create an inner SVG to retain viewBox aspect ratio and vector sharpness
    const innerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    innerSvg.setAttribute('viewBox', viewBoxAttr);
    innerSvg.setAttribute('width', width);
    innerSvg.setAttribute('height', height);
    innerSvg.setAttribute('overflow', 'visible');

    // Transfer children from parsed SVG
    Array.from(rootSvg.childNodes).forEach(node => {
      innerSvg.appendChild(document.importNode(node, true));
    });

    g.appendChild(innerSvg);
    this.svg.appendChild(g);

    const obj = {
      id,
      name,
      label: label || name,
      type,
      size,
      x: Math.round(posX),
      y: Math.round(posY),
      width: Math.round(width),
      height: Math.round(height),
      rotation: 0,
      scale: 1,
      opacity: type === 'background' ? 0.45 : 1.0,
      element: g,
      innerSvg
    };

    if (obj.opacity !== 1.0) {
      g.style.opacity = obj.opacity;
    }

    this.applyTransform(obj);

    // Click & Drag on object
    g.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.selectObject(obj);
      this.isDragging = true;
      this.dragStartPos = this.clientToSvg(e.clientX, e.clientY);
      this.dragObjStartPos = { x: obj.x, y: obj.y };
    });

    this.objects.push(obj);
    this.selectObject(obj);
    this.updateDropHint();
    this.updateLayersList();

    return obj;
  }

  applyTransform(obj) {
    if (!obj || !obj.element) return;
    const { x, y, width, height, rotation, scale } = obj;
    const cx = width / 2;
    const cy = height / 2;

    // Center-origin transform
    obj.element.setAttribute(
      'transform',
      `translate(${x}, ${y}) translate(${cx}, ${cy}) rotate(${rotation}) scale(${scale}) translate(${-cx}, ${-cy})`
    );

    // Update inner svg size if width/height changed
    if (obj.innerSvg) {
      obj.innerSvg.setAttribute('width', width);
      obj.innerSvg.setAttribute('height', height);
    }
  }

  selectObject(obj) {
    if (this.selectedObject === obj) return;

    this.deselectAll();

    this.selectedObject = obj;
    obj.element.classList.add('selected');

    this.updatePropertiesPanel(obj);
    this.highlightLayer(obj.id);
  }

  deselectAll() {
    if (this.selectedObject) {
      this.selectedObject.element.classList.remove('selected');
      this.selectedObject = null;
    }

    document.getElementById('props-empty')?.classList.remove('hidden');
    document.getElementById('props-form')?.classList.add('hidden');

    const layerItems = document.querySelectorAll('.layer-item');
    layerItems.forEach(item => item.classList.remove('active'));
  }

  updatePropertiesPanel(obj) {
    const propsEmpty = document.getElementById('props-empty');
    const propsForm = document.getElementById('props-form');
    if (!propsEmpty || !propsForm) return;

    propsEmpty.classList.add('hidden');
    propsForm.classList.remove('hidden');

    const propX = document.getElementById('prop-x');
    const propY = document.getElementById('prop-y');
    const propW = document.getElementById('prop-w');
    const propH = document.getElementById('prop-h');
    const propRot = document.getElementById('prop-rotation');
    const propRotVal = document.getElementById('prop-rotation-value');
    const propScale = document.getElementById('prop-scale');
    const propScaleVal = document.getElementById('prop-scale-value');
    const propOpacity = document.getElementById('prop-opacity');
    const propOpacityVal = document.getElementById('prop-opacity-value');
    const typeMain = document.getElementById('type-main');
    const typeBg = document.getElementById('type-bg');

    if (propX) propX.value = obj.x;
    if (propY) propY.value = obj.y;
    if (propW) propW.value = obj.width;
    if (propH) propH.value = obj.height;
    if (propRot) propRot.value = obj.rotation;
    if (propRotVal) propRotVal.textContent = `${obj.rotation}°`;
    if (propScale) propScale.value = Math.round(obj.scale * 100);
    if (propScaleVal) propScaleVal.textContent = `${Math.round(obj.scale * 100)}%`;
    if (propOpacity) propOpacity.value = Math.round(obj.opacity * 100);
    if (propOpacityVal) propOpacityVal.textContent = `${Math.round(obj.opacity * 100)}%`;

    if (obj.type === 'background') {
      typeBg?.classList.add('active');
      typeMain?.classList.remove('active');
    } else {
      typeMain?.classList.add('active');
      typeBg?.classList.remove('active');
    }
  }

  duplicateSelected() {
    if (!this.selectedObject) return;
    const orig = this.selectedObject;
    const newX = orig.x + 30;
    const newY = orig.y + 30;

    this.addObject(orig.name, orig.type, orig.label, newX + orig.width / 2, newY + orig.height / 2, orig.size).then(newObj => {
      if (newObj) {
        newObj.rotation = orig.rotation;
        newObj.scale = orig.scale;
        newObj.opacity = orig.opacity;
        newObj.width = orig.width;
        newObj.height = orig.height;
        this.applyTransform(newObj);
        newObj.element.style.opacity = newObj.opacity;
        this.updatePropertiesPanel(newObj);
      }
    });
  }

  deleteSelected() {
    if (!this.selectedObject) return;
    const idx = this.objects.indexOf(this.selectedObject);
    if (idx !== -1) {
      this.selectedObject.element.remove();
      this.objects.splice(idx, 1);
    }
    this.deselectAll();
    this.updateDropHint();
    this.updateLayersList();
  }

  moveLayerUp() {
    if (!this.selectedObject) return;
    const el = this.selectedObject.element;
    const next = el.nextElementSibling;
    if (next) {
      this.svg.insertBefore(next, el);
      // Synchronize array order
      const idx = this.objects.indexOf(this.selectedObject);
      if (idx < this.objects.length - 1) {
        const temp = this.objects[idx];
        this.objects[idx] = this.objects[idx + 1];
        this.objects[idx + 1] = temp;
      }
      this.updateLayersList();
    }
  }

  moveLayerDown() {
    if (!this.selectedObject) return;
    const el = this.selectedObject.element;
    const prev = el.previousElementSibling;
    // Don't move behind defs and background rects (first 3 children)
    if (prev && prev.tagName === 'g') {
      this.svg.insertBefore(el, prev);
      const idx = this.objects.indexOf(this.selectedObject);
      if (idx > 0) {
        const temp = this.objects[idx];
        this.objects[idx] = this.objects[idx - 1];
        this.objects[idx - 1] = temp;
      }
      this.updateLayersList();
    }
  }

  rotateSelected(deg) {
    if (!this.selectedObject) return;
    let newRot = (this.selectedObject.rotation + deg) % 360;
    if (newRot < 0) newRot += 360;
    this.selectedObject.rotation = newRot;
    this.applyTransform(this.selectedObject);
    this.updatePropertiesPanel(this.selectedObject);
  }

  zoom(delta) {
    this.zoomLevel = Math.min(2.5, Math.max(0.3, this.zoomLevel + delta));
    this.container.style.transform = `scale(${this.zoomLevel})`;
    this.container.style.transformOrigin = 'center center';
    const zoomText = document.getElementById('zoom-level');
    if (zoomText) {
      zoomText.textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }
  }

  fitToView() {
    this.zoomLevel = 1.0;
    this.container.style.transform = 'scale(1)';
    const zoomText = document.getElementById('zoom-level');
    if (zoomText) {
      zoomText.textContent = '100%';
    }
    this.app.updateCanvasSize(this.canvasWidth, this.canvasHeight);
  }

  updateDropHint() {
    if (this.dropHint) {
      this.dropHint.style.display = this.objects.length === 0 ? 'flex' : 'none';
    }
  }

  updateLayersList() {
    const list = document.getElementById('layers-list');
    const empty = document.getElementById('layers-empty');
    if (!list) return;

    list.innerHTML = '';

    if (this.objects.length === 0) {
      empty?.classList.remove('hidden');
      return;
    }
    empty?.classList.add('hidden');

    // Display topmost elements at top of layers panel (reversed order)
    const reversed = [...this.objects].reverse();

    reversed.forEach(obj => {
      const item = document.createElement('div');
      item.className = `layer-item ${this.selectedObject === obj ? 'active' : ''}`;
      item.dataset.id = obj.id;

      item.innerHTML = `
        <div class="layer-item__preview">
          <svg viewBox="0 0 40 40" width="24" height="24">
            <rect width="40" height="40" rx="4" fill="${obj.type === 'background' ? '#444' : '#7C4DFF'}" opacity="0.2"/>
            <text x="20" y="24" font-size="10" text-anchor="middle" fill="#ccc">${obj.size}</text>
          </svg>
        </div>
        <span class="layer-item__name">${obj.label}</span>
        <button class="layer-item__visibility" title="Скрыть/показать">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 7S3.5 2.5 7 2.5 13 7 13 7s-2.5 4.5-6 4.5S1 7 1 7Z" stroke="currentColor" stroke-width="1.2"/>
            <circle cx="7" cy="7" r="2" stroke="currentColor" stroke-width="1.2"/>
          </svg>
        </button>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.layer-item__visibility')) {
          // Toggle visibility
          const isHidden = obj.element.style.display === 'none';
          obj.element.style.display = isHidden ? '' : 'none';
          item.style.opacity = isHidden ? '1' : '0.4';
          return;
        }
        this.selectObject(obj);
      });

      list.appendChild(item);
    });
  }

  highlightLayer(id) {
    const items = document.querySelectorAll('.layer-item');
    items.forEach(it => {
      it.classList.toggle('active', it.dataset.id === id);
    });
  }

  clear() {
    this.objects.forEach(obj => obj.element.remove());
    this.objects = [];
    this.deselectAll();
    this.updateDropHint();
    this.updateLayersList();
  }
}
