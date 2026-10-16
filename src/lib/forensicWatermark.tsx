const GRID_SIZE = 24;
const PAYLOAD_SIZE = 16;
const TOKEN_HEX_LENGTH = 32;
const WATERMARK_SIZE = 116;
const WATERMARK_PLACEMENTS = [
  [12, 16], [12, 50], [12, 84],
  [32, 16], [32, 50], [32, 84],
  [52, 16], [52, 50], [52, 84],
  [72, 16], [72, 50], [72, 84],
  [92, 16], [92, 50], [92, 84],
] as const;

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
    // The pattern is intentionally subtle, but it is only 116 CSS pixels wide.
    // Downscaling a desktop screenshot to 900px makes each finder cell smaller
    // than a pixel and guarantees false negatives, so retain more detail.
    const maxSide = 1800;
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
    const sample = (x: number, y: number) => luminance(image.data, (Math.floor(y) * width + Math.floor(x)) * 4);
    const markerCells = (row: number, column: number) => {
      const cells: { x: number; y: number; on: boolean }[] = [];
      for (let y = 0; y < 5; y += 1) for (let x = 0; x < 5; x += 1) {
        cells.push({ x: column + x, y: row + y, on: y === 0 || x === 0 || y === 4 || x === 4 || (x === 2 && y === 2) });
      }
      return cells;
    };
    const finders = [markerCells(1, 1), markerCells(1, GRID_SIZE - 6), markerCells(GRID_SIZE - 6, 1)];
    const candidate = (originX: number, originY: number, regionSize: number) => {
      if (originX < 0 || originY < 0 || originX + regionSize >= width || originY + regionSize >= height) return null;
      const values: number[] = [];
      for (let row = 0; row < GRID_SIZE; row += 1) for (let column = 0; column < GRID_SIZE; column += 1) {
        const x = originX + (column + .5) * regionSize / GRID_SIZE;
        const y = originY + (row + .5) * regionSize / GRID_SIZE;
        values.push(sample(x, y));
      }
      const metrics = finders.map((cells) => {
        const on = cells.filter((cell) => cell.on).map((cell) => values[cell.y * GRID_SIZE + cell.x]);
        const off = cells.filter((cell) => !cell.on).map((cell) => values[cell.y * GRID_SIZE + cell.x]);
        const onMean = on.reduce((sum, value) => sum + value, 0) / on.length;
        const offMean = off.reduce((sum, value) => sum + value, 0) / off.length;
        const threshold = (onMean + offMean) / 2;
        const correct = cells.filter((cell) => (values[cell.y * GRID_SIZE + cell.x] < threshold) === cell.on).length;
        return { score: correct / cells.length, contrast: offMean - onMean, threshold };
      });
      const markerScore = metrics.reduce((sum, item) => sum + item.score, 0) / metrics.length;
      const contrast = metrics.reduce((sum, item) => sum + item.contrast, 0) / metrics.length;
      return { values, markerScore, contrast, threshold: metrics.reduce((sum, item) => sum + item.threshold, 0) / metrics.length };
    };

    // First check the known reader placements. A second coarse pass catches
    // cropped or reframed screenshots without making upload-time analysis heavy.
    // Chat apps and screenshot tools often resize a capture before upload. In
    // addition to the native size, derive candidates from the shortest image
    // side so a 116px reader pattern reduced to 35–50px is still searchable.
    const dimensionBase = Math.min(width, height) * .08;
    const sizes = Array.from(new Set([
      WATERMARK_SIZE * scale * .55,
      WATERMARK_SIZE * scale * .7,
      WATERMARK_SIZE * scale * .9,
      WATERMARK_SIZE * scale,
      WATERMARK_SIZE * scale * 1.2,
      WATERMARK_SIZE * scale * 1.5,
      dimensionBase * .65,
      dimensionBase * .85,
      dimensionBase,
      dimensionBase * 1.2,
      dimensionBase * 1.5,
      dimensionBase * 1.9,
    ].map((size) => Math.max(22, Math.round(size)))));
    const candidates: { x: number; y: number; size: number }[] = [];
    for (const size of sizes) for (const [top, left] of WATERMARK_PLACEMENTS) candidates.push({ x: width * left / 100 - size / 2, y: height * top / 100 - size / 2, size });
    const coarseStep = Math.max(24, Math.round(Math.min(width, height) / 18));
    for (const size of sizes.slice(1, 4)) for (let y = 0; y <= height - size; y += coarseStep) for (let x = 0; x <= width - size; x += coarseStep) candidates.push({ x, y, size });

    let best: { values: number[]; markerScore: number; contrast: number; threshold: number } | null = null;
    for (const item of candidates) {
      const result = candidate(item.x, item.y, item.size);
      if (result && (!best || result.markerScore > best.markerScore || (result.markerScore === best.markerScore && result.contrast > best.contrast))) best = result;
    }
    const markerScore = best?.markerScore ?? 0;
    const contrast = best?.contrast ?? 0;
    if (!best || markerScore < .68 || contrast < 2.5) return { detected: false, confidence: Math.round(markerScore * 100) / 100, method: 'pixel-grid', note: '글리프 픽셀 패턴을 확인하지 못했습니다. 원본 이미지로 운영자 확인이 필요합니다.' };

    const active = best.values.map((value) => value < best!.threshold);
    const bits: boolean[] = [];
    for (let row = 4; row < 4 + PAYLOAD_SIZE; row += 1) for (let column = 4; column < 4 + PAYLOAD_SIZE; column += 1) bits.push(active[row * GRID_SIZE + column]);
    let token = '';
    for (let index = 0; index < bits.length; index += 4) token += Number.parseInt(bits.slice(index, index + 4).map((bit) => bit ? '1' : '0').join(''), 2).toString(16);
    return { detected: true, token: token.slice(0, TOKEN_HEX_LENGTH), confidence: Math.round(Math.min(1, markerScore * .8 + Math.min(1, contrast / 24) * .2) * 100) / 100, method: 'pixel-grid', note: '워터마크 후보 토큰을 추출했습니다. 서버 검증 후 사용자 정보를 표시합니다.' };
  } catch {
    return { detected: false, confidence: 0, method: 'unavailable', note: '이미지 분석에 실패했습니다. 원본은 신고 증거로 보존됩니다.' };
  }
}
