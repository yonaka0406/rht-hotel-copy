export const getContrastColor = (hexcolor) => {
  if (!hexcolor || typeof hexcolor !== 'string') return '#000000';
  let processedHex = hexcolor.startsWith('#') ? hexcolor.slice(1) : hexcolor;
  
  if (processedHex.length === 3) {
    processedHex = processedHex.split('').map(char => char + char).join('');
  }
  if (processedHex.length !== 6) return '#000000'; // Invalid hex

  const r = parseInt(processedHex.substring(0, 2), 16);
  const g = parseInt(processedHex.substring(2, 4), 16);
  const b = parseInt(processedHex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#000000'; // Parsing failed

  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#FFFFFF';
};
