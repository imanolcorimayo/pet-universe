/**
 * Composable for handling decimal inputs with locale-agnostic decimal separator
 * Accepts both comma (,) and period (.) as decimal separators
 * Normalizes to numeric value for processing
 */

export function useDecimalInput() {
  /**
   * Parse a string value that may use comma or period as decimal separator
   * @param value - The string value from input
   * @returns The parsed number, or 0 if invalid
   */
  function parseDecimal(value: string | number | null | undefined): number|string {

    if (value === null || value === undefined || value === '') {
      return 0;
    }

    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value;
    }

    // Replace comma with period for parsing (handles Spanish keyboard)
    const normalized = value.toString().replace(',', '.');

    // If last value is a point, then return the normalized string
    if (normalized.endsWith('.')) {
      return normalized;
    }

    const parsed = parseFloat(normalized);
    if (isNaN(parsed)) return 0;

    // Preserve the raw string when trailing zeros after decimal would be lost
    // e.g. "3.0" → parseFloat → 3 → toString → "3" ≠ "3.0", so keep "3.0"
    // This lets the user type "3.025" without "3.0" collapsing to "3"
    if (normalized.includes('.') && parsed.toString() !== normalized) {
      return normalized;
    }

    return parsed;
  }

  /**
   * Format a number for display in input field
   * Uses period as decimal separator (consistent with internal representation)
   * @param value - The numeric value
   * @param decimals - Number of decimal places (default: 2)
   * @returns Formatted string
   */
  function formatForInput(value: number | null | undefined, decimals = 2): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '';
    }
    // Only show decimals if the value has them
    if (Number.isInteger(value)) {
      return value.toString();
    }
    return value.toFixed(decimals);
  }

  /**
   * Format a number for display (using locale formatting with comma)
   * @param value - The numeric value
   * @param decimals - Number of decimal places (default: 2)
   * @returns Formatted string with comma as decimal separator
   */
  function formatForDisplay(value: number | null | undefined, decimals = 2): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '0';
    }
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    }).format(value);
  }

  return {
    parseDecimal,
    formatForInput,
    formatForDisplay
  };
}
