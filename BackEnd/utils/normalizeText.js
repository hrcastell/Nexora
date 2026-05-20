/**
 * normalizeText.js
 *
 * Utilidades de normalización de texto para catálogos del Core 1.
 * Previene duplicados por variaciones de mayúsculas, acentos y espacios.
 *
 * Ejemplos:
 *   " Diésel "        → "diesel"
 *   "TOYOTA"          → "toyota"
 *   "Gasolina  Premium" → "gasolina premium"
 *   "Sedán"           → "sedan"
 */

/**
 * Normaliza un valor de catálogo para comparación y almacenamiento único.
 * - Trim de espacios extremos
 * - Lowercase
 * - Descompone caracteres Unicode (NFD) y elimina diacríticos (acentos, tildes)
 * - Colapsa espacios internos múltiples en uno solo
 *
 * @param {string} value
 * @returns {string}
 */
function normalizeCatalogText(value) {
    if (typeof value !== 'string') return '';
    return value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

/**
 * Normaliza un SKU de producto:
 * - Uppercase
 * - Trim
 * - Colapsa espacios
 *
 * @param {string} value
 * @returns {string}
 */
function normalizeSku(value) {
    if (typeof value !== 'string') return '';
    return value
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '-');
}

/**
 * Normaliza una matrícula/placa de vehículo:
 * - Uppercase
 * - Elimina espacios y guiones
 *
 * @param {string} value
 * @returns {string}
 */
function normalizePlate(value) {
    if (typeof value !== 'string') return '';
    return value
        .trim()
        .toUpperCase()
        .replace(/[\s\-]/g, '');
}

module.exports = { normalizeCatalogText, normalizeSku, normalizePlate };
