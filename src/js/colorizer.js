/**
 * Colorizer Module — manages 3 color schemes (Violet, Warm, Cool)
 * and dynamically recolors SVG components on canvas and library
 */

export const PALETTES = {
  violet: {
    name: 'Фиолетовая',
    primary: '#C4B0E0',
    secondary: '#A78BC5',
    accent: '#D6C8EE',
    light: '#E8E0F5',
    subtle: '#DDD5F0',
    highlight: '#FF6B8A',
    dark: '#524365',
    stroke: '#2D2D2D'
  },
  warm: {
    name: 'Бежево-оранжевая',
    primary: '#F0DFA0',
    secondary: '#E5C88A',
    accent: '#F5E8B0',
    light: '#FAF3D7',
    subtle: '#F2E5C2',
    highlight: '#FF8A65',
    dark: '#6A5636',
    stroke: '#2D2D2D'
  },
  cool: {
    name: 'Сине-голубая',
    primary: '#A0C4E8',
    secondary: '#7BA8D4',
    accent: '#C0D8F0',
    light: '#E3EEFA',
    subtle: '#CCE0F5',
    highlight: '#4DD0E1',
    dark: '#385575',
    stroke: '#2D2D2D'
  }
};

// Known color mappings across all palettes
const COLOR_ROLES = {
  // Primary colors
  '#C4B0E0': 'primary',
  '#c4b0e0': 'primary',
  '#F0DFA0': 'primary',
  '#f0dfa0': 'primary',
  '#A0C4E8': 'primary',
  '#a0c4e8': 'primary',

  // Secondary colors
  '#A78BC5': 'secondary',
  '#a78bc5': 'secondary',
  '#E5C88A': 'secondary',
  '#e5c88a': 'secondary',
  '#7BA8D4': 'secondary',
  '#7ba8d4': 'secondary',

  // Accent colors
  '#D6C8EE': 'accent',
  '#d6c8ee': 'accent',
  '#F5E8B0': 'accent',
  '#f5e8b0': 'accent',
  '#C0D8F0': 'accent',
  '#c0d8f0': 'accent',

  // Light tints
  '#E8E0F5': 'light',
  '#e8e0f5': 'light',
  '#FAF3D7': 'light',
  '#faf3d7': 'light',
  '#E3EEFA': 'light',
  '#e3eefa': 'light',

  // Subtle tints
  '#DDD5F0': 'subtle',
  '#ddd5f0': 'subtle',
  '#F2E5C2': 'subtle',
  '#f2e5c2': 'subtle',
  '#CCE0F5': 'subtle',
  '#cce0f5': 'subtle',
};

export class Colorizer {
  constructor() {
    this.palettes = PALETTES;
  }

  getPalette(name) {
    return this.palettes[name] || this.palettes.violet;
  }

  /**
   * Recolor an SVG string with the specified palette
   */
  colorize(svgString, paletteName) {
    const palette = this.getPalette(paletteName);
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');

    this.recolorElement(doc.documentElement, palette);

    return doc.documentElement.outerHTML;
  }

  /**
   * Recolor a DOM subtree (works on SVG element or <g> container)
   */
  recolorElement(rootElement, palette) {
    if (!rootElement) return;

    // 1. Recolor elements with explicit CSS utility classes
    rootElement.querySelectorAll('.fill-primary').forEach(el => el.setAttribute('fill', palette.primary));
    rootElement.querySelectorAll('.fill-secondary').forEach(el => el.setAttribute('fill', palette.secondary));
    rootElement.querySelectorAll('.fill-accent').forEach(el => el.setAttribute('fill', palette.accent));
    rootElement.querySelectorAll('.fill-highlight').forEach(el => el.setAttribute('fill', palette.highlight));
    rootElement.querySelectorAll('.fill-light').forEach(el => el.setAttribute('fill', palette.light));

    // 2. Also map any elements whose fill attribute matches a known palette role
    const allElements = rootElement.querySelectorAll('[fill]');
    allElements.forEach(el => {
      const fill = el.getAttribute('fill');
      if (fill && COLOR_ROLES[fill]) {
        const role = COLOR_ROLES[fill];
        if (palette[role]) {
          el.setAttribute('fill', palette[role]);
        }
      }
    });
  }

  /**
   * Apply palette to all objects currently on canvas and in library items
   */
  applyPalette(paletteName, canvas) {
    const palette = this.getPalette(paletteName);

    // Recolor canvas objects
    if (canvas && canvas.objects) {
      canvas.objects.forEach(obj => {
        if (obj.element) {
          this.recolorElement(obj.element, palette);
        }
      });
      canvas.updateLayersList?.();
    }

    // Recolor items in the library preview grid
    const libraryItems = document.querySelectorAll('.library-item svg');
    libraryItems.forEach(svg => {
      this.recolorElement(svg, palette);
    });
  }
}
