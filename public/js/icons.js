/**
 * know — Sistema de Ícones Open Source (Lucide Icons - Licença ISC / Sem restrições de copyright)
 * Gera SVGs leves, nítidos e consistentes para toda a interface nos modos Claro e Escuro.
 */

(function (window) {
  'use strict';

  function toPascal(str) {
    if (!str) return '';
    return str
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  /**
   * Retorna a string HTML do SVG do ícone solicitado
   * @param {string} name Nome do ícone em kebab-case (ex: 'home', 'check-circle-2', 'sun')
   * @param {object} opts { size: 16, strokeWidth: 2, class: '', color: 'currentColor', fill: 'none' }
   */
  function iconSvg(name, opts = {}) {
    if (!name) return '';
    const size = opts.size || 16;
    const strokeWidth = opts.strokeWidth !== undefined ? opts.strokeWidth : 2;
    const extraClass = opts.class || opts.className || '';
    const color = opts.color || 'currentColor';
    const fill = opts.fill || 'none';

    const lucideObj = window.lucide;
    if (!lucideObj) {
      // Fallback básico se lucide não estiver pronto
      return `<span class="lucide-icon-fallback ${extraClass}"></span>`;
    }

    const pascalName = toPascal(name);
    const def = lucideObj[pascalName] || (lucideObj.icons && lucideObj.icons[pascalName]) || lucideObj[name];

    if (!def || !Array.isArray(def)) {
      console.warn(`[Icons] Ícone não encontrado: ${name} (${pascalName})`);
      return '';
    }

    const inner = def.map(([tag, attrs]) => {
      const attrStr = Object.entries(attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      return `<${tag} ${attrStr}></${tag}>`;
    }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-${name} ${extraClass}">${inner}</svg>`;
  }

  /**
   * Atualiza elementos no DOM com atributo data-lucide
   */
  function refreshIcons(root = document) {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try {
        window.lucide.createIcons({ root });
      } catch (err) {
        console.warn('[Icons] Erro ao executar createIcons:', err);
      }
    }
  }

  window.iconSvg = iconSvg;
  window.renderIcon = iconSvg;
  window.refreshIcons = refreshIcons;

})(typeof window !== 'undefined' ? window : this);
