import { ImagePlus, Minus, Move, Plus, RotateCcw, RotateCw, Scan } from 'lucide-react';
import { ChangeEvent, PointerEvent, useEffect, useRef, useState } from 'react';

type ImageCropEditorProps = {
  label: string;
  width: number;
  height: number;
  maxBytes: number;
  value: File | null;
  onChange: (file: File | null) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function ImageCropEditor({ label, width, height, maxBytes, value, onChange }: ImageCropEditorProps) {
  const [sourceFile, setSourceFile] = useState<File | null>(value);
  const [sourceUrl, setSourceUrl] = useState('');
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number }>();

  useEffect(() => {
    setSourceFile(value);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setRotation(0);
  }, [value]);

  useEffect(() => {
    if (!sourceFile) {
      setSourceUrl('');
      return;
    }
    const url = URL.createObjectURL(sourceFile);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [sourceFile]);

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('JPG, PNG, WebP 파일만 선택할 수 있습니다.');
      return;
    }
    if (file.size > maxBytes) {
      setMessage(`${Math.round(maxBytes / (1024 * 1024))}MB 이하의 이미지를 선택해 주세요.`);
      return;
    }
    setMessage('');
    setSourceFile(file);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setRotation(0);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!sourceUrl) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, offsetX, offsetY };
    setDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!start) return;
    setOffsetX(clamp(start.offsetX + (event.clientX - start.x) / 2, -100, 100));
    setOffsetY(clamp(start.offsetY + (event.clientY - start.y) / 2, -100, 100));
  };

  const stopDragging = () => {
    dragRef.current = undefined;
    setDragging(false);
  };

  const applyCrop = async () => {
    if (!sourceUrl) return;
    setProcessing(true);
    setMessage('');
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const loaded = new Image();
        loaded.onload = () => resolve(loaded);
        loaded.onerror = () => reject(new Error('decode'));
        loaded.src = sourceUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('canvas');
      const coverScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const drawWidth = image.naturalWidth * coverScale * zoom;
      const drawHeight = image.naturalHeight * coverScale * zoom;
      const x = (width - drawWidth) / 2 + (offsetX / 100) * Math.max(0, (drawWidth - width) / 2);
      const y = (height - drawHeight) / 2 + (offsetY / 100) * Math.max(0, (drawHeight - height) / 2);
      context.save();
      context.translate(width / 2, height / 2);
      context.rotate((rotation * Math.PI) / 180);
      context.drawImage(image, x - width / 2, y - height / 2, drawWidth, drawHeight);
      context.restore();
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('encode');
      const safeName = (sourceFile?.name || label).replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
      const output = new File([blob], `${safeName}-${width}x${height}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
      onChange(output);
      setMessage('미리보기 편집이 적용되었습니다.');
    } catch {
      setMessage('이미지를 편집하지 못했습니다. 다른 파일을 선택해 주세요.');
    } finally {
      setProcessing(false);
    }
  };

  return <div className="image-crop-editor">
    <div className="image-crop-editor-heading"><strong>{label}</strong><small>{width} × {height}px · 드래그해서 위치 조정</small></div>
    <div className="image-crop-preview" style={{ aspectRatio: `${width} / ${height}` }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={stopDragging} onPointerCancel={stopDragging}>
      {sourceUrl ? <img src={sourceUrl} alt={`${label} 미리보기`} draggable={false} className={dragging ? 'dragging' : ''} style={{ transform: `translate(${offsetX / 2}%, ${offsetY / 2}%) scale(${zoom}) rotate(${rotation}deg)` }} /> : <div className="image-crop-empty"><ImagePlus size={22} /><span>사진을 선택하면 미리보기가 표시됩니다.</span></div>}
      <span className="image-crop-frame" aria-hidden="true"><Scan size={16} /></span>
    </div>
    <div className="image-crop-controls">
      <label><span><Move size={14} /> 가로 위치</span><input type="range" min="-100" max="100" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} disabled={!sourceUrl} /></label>
      <label><span><Move size={14} /> 세로 위치</span><input type="range" min="-100" max="100" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} disabled={!sourceUrl} /></label>
      <label><span><Minus size={14} /> 확대·축소 <b>{zoom.toFixed(1)}x</b><Plus size={14} /></span><input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} disabled={!sourceUrl} /></label>
      <div className="image-crop-rotate"><button type="button" onClick={() => setRotation((value) => value - 90)} disabled={!sourceUrl} aria-label="왼쪽으로 회전"><RotateCcw size={15} /></button><span>{rotation}°</span><button type="button" onClick={() => setRotation((value) => value + 90)} disabled={!sourceUrl} aria-label="오른쪽으로 회전"><RotateCw size={15} /></button></div>
    </div>
    <div className="image-crop-actions"><label className="secondary-button small"><ImagePlus size={14} /> {sourceUrl ? '사진 바꾸기' : '사진 선택'}<input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={selectFile} /></label><button type="button" className="primary-button small" onClick={applyCrop} disabled={!sourceUrl || processing}>{processing ? '적용 중…' : '미리보기 적용'}</button>{sourceUrl && <button type="button" className="text-button small" onClick={() => { setZoom(1); setOffsetX(0); setOffsetY(0); setRotation(0); }}>초기화</button>}</div>
    {message && <p className="image-crop-message" role="status">{message}</p>}
  </div>;
}
