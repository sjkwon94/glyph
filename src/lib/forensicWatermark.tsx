const GRID_SIZE = 24;
const PAYLOAD_SIZE = 16;
const TOKEN_HEX_LENGTH = 32;

export type WatermarkDetection = {
  detected: boolean;
  token?: string;
  confidence: number;
  method: 'pixel-grid' | 'unavailable';
  note: string;
};

function normalizeToken(token: string) {
  const compact = token.replace(/[^a-f0-9]/gi, '').toLowerCase();
  return compact.padEnd(TOKEN_HEX_LENGTH, '0').slice(0, TOKEN_HEX_LENGTH);
}

function tokenBits(token: string) {
  return normalizeToken(token).split('').flatMap((char) => Number.parseInt(char, 16).toString(2).padStart(4, '0').split('').map((bit) => bit === '1'));
}

export function watermarkMatrix(token: string) {
  const matrix = Array.from({ length: GRID_SIZE }, () => Array<boolean>(GRID_SIZE).fill(false));
  const finder = (row: number, column: number) => {
    for (let y = 0; y < 5; y += 1) for (let x = 0; x < 5; x += 1) {
      matrix[row + y][column + x] = y === 0 || x === 0 || y === 4 || x === 4 || (x === 2 && y === 2);
    }
  };
  finder(1, 1); finder(1, GRID_SIZE - 6); finder(GRID_SIZE - 6, 1);
  const bits = tokenBits(token);
  let index = 0;
  for (let row = 4; row < 4 + PAYLOAD_SIZE; row += 1) for (let column = 4; column < 4 + PAYLOAD_SIZE; column += 1) {
    matrix[row][column] = bits[index] ?? false;
    index += 1;
  }
  return matrix;
}

export function WatermarkPattern({ token, size = 132 }: { token: string; size?: number }) {
  const matrix = watermarkMatrix(token);
  const cell = size / GRID_SIZE;
  return <svg className="forensic-watermark-pattern" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
    {matrix.flatMap((row, rowIndex) => row.map((active, columnIndex) => active ? <rect key={`${rowIndex}-${columnIndex}`} x={columnIndex * cell} y={rowIndex * cell} width={cell + .15} height={cell + .15} /> : null))}
  </svg>;
}

function luminance(data: Uint8ClampedArray, index: number) {
  return data[index] * .2126 + data[index + 1] * .7152 + data[index + 2] * .0722;
}

/**
 * Best-effort browser-side scan for the Glyph pixel grid. This is deliberately
 * advisory: the uploaded original remains the evidence and the server must
 * verify any token before an account is sanctioned.
 */
export async function detectForensicWatermark(file: File): Promise<WatermarkDetection> {
  if (!file.type.startsWith('image/')) return { detected: false, confidence: 0, method: 'unavailable', note: '이미지 파일이 아닙니다.' };
  if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') return { detected: false, confidence: 0, method: 'unavailable', note: '이 브라우저에서는 픽셀 분석을 지원하지 않습니다.' };

  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 900;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return { detected: false, confidence: 0, method: 'unavailable', note: '이미지 분석 공간을 만들지 못했습니다.' };
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const image = context.getImageData(0, 0, width, height);
    const regionSize = Math.max(120, Math.min(width, height) * .42);
    const originX = (width - regionSize) / 2;
    const originY = (height - regionSize) / 2;
    const sample = (x: number, y: number) => luminance(image.data, (Math.floor(y) * width + Math.floor(x)) * 4);
    const values: number[] = [];
    for (let row = 0; row < GRID_SIZE; row += 1) for (let column = 0; column < GRID_SIZE; column += 1) {
      const x = originX + (column + .5) * regionSize / GRID_SIZE;
      const y = originY + (row + .5) * regionSize / GRID_SIZE;
      values.push(sample(x, y));
    }
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const active = values.map((value) => value < average - 2.5);
    const marker = (row: number, column: number) => {
      let score = 0;
      for (let y = 0; y < 5; y += 1) for (let x = 0; x < 5; x += 1) {
        const expected = y === 0 || x === 0 || y === 4 || x === 4 || (x === 2 && y === 2);
        if (active[(row + y) * GRID_SIZE + column + x] === expected) score += 1;
      }
      return score / 25;
    };
    const markerScore = (marker(1, 1) + marker(1, GRID_SIZE - 6) + marker(GRID_SIZE - 6, 1)) / 3;
    if (markerScore < .68) return { detected: false, confidence: Math.round(markerScore * 100) / 100, method: 'pixel-grid', note: '글리프 픽셀 패턴을 확인하지 못했습니다. 원본 이미지로 운영자 확인이 필요합니다.' };

    const bits: boolean[] = [];
    for (let row = 4; row < 4 + PAYLOAD_SIZE; row += 1) for (let column = 4; column < 4 + PAYLOAD_SIZE; column += 1) bits.push(active[row * GRID_SIZE + column]);
    let token = '';
    for (let index = 0; index < bits.length; index += 4) token += Number.parseInt(bits.slice(index, index + 4).map((bit) => bit ? '1' : '0').join(''), 2).toString(16);
    return { detected: true, token: token.slice(0, TOKEN_HEX_LENGTH), confidence: Math.round(markerScore * 100) / 100, method: 'pixel-grid', note: '워터마크 후보 토큰을 추출했습니다. 서버 검증 후 사용자 정보를 표시합니다.' };
  } catch {
    return { detected: false, confidence: 0, method: 'unavailable', note: '이미지 분석에 실패했습니다. 원본은 신고 증거로 보존됩니다.' };
  }
}
