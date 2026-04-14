/**
 * Utility to convert any CSS color string (hex, rgb, rgba) to Rainmeter's R,G,B,A format.
 */
export function toRainmeterColor(color: any, opacity: number = 1): string {
  if (!color) return `0,0,0,${Math.round(opacity * 255)}`;

  // If it's already a Rainmeter color (e.g. "255,255,255,255")
  if (typeof color === 'string' && /^\d+,\s*\d+,\s*\d+,\s*\d+$/.test(color)) {
    return color;
  }

  // Handle Hex
  if (typeof color === 'string' && color.startsWith('#')) {
    const hex = color.replace(/^#/, '');
    const bigint = parseInt(hex, 16);
    if (isNaN(bigint)) return `0,0,0,${Math.round(opacity * 255)}`;
    
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    const alpha = Math.round(opacity * 255);
    return `${r},${g},${b},${alpha}`;
  }

  // Handle rgb/rgba
  if (typeof color === 'string' && color.startsWith('rgb')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      const r = match[1];
      const g = match[2];
      const b = match[3];
      const a = match[4] ? Math.round(parseFloat(match[4]) * 255) : Math.round(opacity * 255);
      return `${r},${g},${b},${a}`;
    }
  }

  // Fallback
  return `0,0,0,${Math.round(opacity * 255)}`;
}

/**
 * Utility to convert Rainmeter's R,G,B,A format to CSS rgba(...) for Fabric/Web.
 */
export function fromRainmeterColor(rainmeterColor: string): string {
  if (!rainmeterColor) return 'rgba(0,0,0,0)';
  
  const parts = rainmeterColor.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    const r = parts[0];
    const g = parts[1];
    const b = parts[2];
    const a = parts[3] ? (parseInt(parts[3]) / 255).toFixed(2) : '1';
    return `rgba(${r},${g},${b},${a})`;
  }
  
  // If it's already a CSS color
  return rainmeterColor;
}

/**
 * Utility to convert Rainmeter's R,G,B,A format to Hex (stripping alpha).
 */
export function rainmeterToHex(rainmeterColor: string): string {
  const rgba = fromRainmeterColor(rainmeterColor);
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+).*\)/);
  if (match) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  return "#000000";
}
