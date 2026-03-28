import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import {
  Pen, Square, Circle, Triangle, ArrowRight, Minus,
  Type, Trash2, Undo2, Redo2, Download, Save,
  MousePointer, Highlighter, X
} from 'lucide-react';

const TOOLS = [
  { id: 'select', icon: <MousePointer size={14} />, label: 'Select' },
  { id: 'pen', icon: <Pen size={14} />, label: 'Pen' },
  { id: 'highlighter', icon: <Highlighter size={14} />, label: 'Highlight' },
  { id: 'line', icon: <Minus size={14} />, label: 'Line' },
  { id: 'arrow', icon: <ArrowRight size={14} />, label: 'Arrow' },
  { id: 'rect', icon: <Square size={14} />, label: 'Rectangle' },
  { id: 'circle', icon: <Circle size={14} />, label: 'Ellipse' },
  { id: 'triangle', icon: <Triangle size={14} />, label: 'Triangle' },
  { id: 'text', icon: <Type size={14} />, label: 'Text' },
];

const COLORS = ['#F5C518', '#EF4444', '#22C55E', '#3B82F6', '#A855F7', '#F97316', '#000000', '#FFFFFF'];

export default function CoretCanvas({ imageUrl, onSave, onClose, readOnly = false }) {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#F5C518');
  const [strokeW, setStrokeW] = useState(3);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [imageError, setImageError] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });

  // Inisialisasi fabric canvas – hanya sekali, setelah DOM siap
  useEffect(() => {
    if (!canvasRef.current) return;
    if (fabricCanvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      preserveObjectStacking: true,
      backgroundColor: 'var(--bg-card)',
    });
    fabricCanvasRef.current = canvas;

    // Simpan state setiap perubahan
    const saveState = () => {
      const json = canvas.toJSON();
      setHistory(prev => [...prev, json]);
      setRedoStack([]);
    };
    canvas.on('object:added', saveState);
    canvas.on('object:modified', saveState);
    canvas.on('object:removed', saveState);

    // Tandai canvas siap setelah satu frame
    requestAnimationFrame(() => {
      setCanvasReady(true);
    });

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  // Muat gambar latar belakang dengan ukuran asli
  useEffect(() => {
    if (!canvasReady || !imageUrl || !fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    setImageError(false);
    setBackgroundLoaded(false);

    fabric.Image.fromURL(
      imageUrl,
      (img) => {
        if (!img) {
          setImageError(true);
          return;
        }

        // Simpan ukuran asli gambar
        const origW = img.width;
        const origH = img.height;
        setOriginalWidth(origW);
        setOriginalHeight(origH);

        // Set canvas ke ukuran asli gambar
        canvas.setWidth(origW);
        canvas.setHeight(origH);

        // Set background image dengan skala 1 (ukuran asli)
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
          scaleX: 1,
          scaleY: 1,
          originX: 'left',
          originY: 'top',
        });

        setBackgroundLoaded(true);
        // Simpan state awal setelah background terpasang
        const json = canvas.toJSON();
        setHistory([json]);
        setRedoStack([]);
      },
      { crossOrigin: 'anonymous' },
      (err) => {
        console.error('Gagal memuat gambar:', err);
        setImageError(true);
      }
    );
  }, [canvasReady, imageUrl]);

  // Update mode menggambar (pen/highlighter/select)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !backgroundLoaded) return;
    if (tool === 'pen') {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = strokeW;
      canvas.isDrawingMode = true;
    } else if (tool === 'highlighter') {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = color + '80';
      canvas.freeDrawingBrush.width = strokeW * 6;
      canvas.isDrawingMode = true;
    } else {
      canvas.isDrawingMode = false;
    }
  }, [tool, color, strokeW, backgroundLoaded]);

  // Fungsi undo/redo
  const restoreState = (json) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.loadFromJSON(json, () => canvas.renderAll());
  };

  const undo = () => {
    setHistory(prev => {
      if (prev.length < 2) return prev;
      const newHistory = prev.slice(0, -1);
      setRedoStack(r => [...r, prev[prev.length - 1]]);
      restoreState(newHistory[newHistory.length - 1]);
      return newHistory;
    });
  };

  const redo = () => {
    setRedoStack(prev => {
      if (!prev.length) return prev;
      const next = prev[prev.length - 1];
      setHistory(h => [...h, next]);
      restoreState(next);
      return prev.slice(0, -1);
    });
  };

  const clearCanvas = () => {
    if (!window.confirm('Hapus semua anotasi?')) return;
    const canvas = fabricCanvasRef.current;
    // Hanya hapus objek, background tetap
    canvas.getObjects().forEach(obj => canvas.remove(obj));
    canvas.renderAll();
    const json = canvas.toJSON();
    setHistory([json]);
    setRedoStack([]);
  };

  const handleSave = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Karena canvas sudah berukuran asli, multiplier = 1
    const dataUrl = canvas.toDataURL({
      format: 'jpeg',
      quality: 1.0,
      multiplier: 1,
    });
    onSave?.(dataUrl);
  };

  const handleDownload = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = 'spec-annotation.jpg';
    a.href = canvas.toDataURL({
      format: 'jpeg',
      quality: 1.0,
      multiplier: 1,
    });
    a.click();
  };

  // Fungsi untuk menampilkan modal input teks
  const showTextPrompt = (x, y) => {
    setTextPosition({ x, y });
    setTextInputValue('');
    setShowTextInput(true);
  };

  const handleTextSubmit = () => {
    if (!textInputValue.trim()) {
      setShowTextInput(false);
      return;
    }
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const textObj = new fabric.IText(textInputValue, {
      left: textPosition.x,
      top: textPosition.y,
      fontSize: 20,
      fill: color,
      fontFamily: 'Sora',
    });
    canvas.add(textObj);
    canvas.setActiveObject(textObj);
    canvas.renderAll();
    const json = canvas.toJSON();
    setHistory(prev => [...prev, json]);
    setRedoStack([]);
    setShowTextInput(false);
  };

  // Gambar bentuk dengan mouse drag (line, rect, dll)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !backgroundLoaded) return;

    let shape = null;
    let isDrawing = false;
    let startX, startY;

    const onMouseDown = (e) => {
      if (tool === 'pen' || tool === 'highlighter' || tool === 'select') return;
      if (tool === 'text') {
        showTextPrompt(e.absolutePointer.x, e.absolutePointer.y);
        return;
      }

      isDrawing = true;
      startX = e.absolutePointer.x;
      startY = e.absolutePointer.y;
    };

    const onMouseMove = (e) => {
      if (!isDrawing) return;
      const pointer = e.absolutePointer;
      const width = pointer.x - startX;
      const height = pointer.y - startY;

      if (shape) canvas.remove(shape);

      switch (tool) {
        case 'line':
          shape = new fabric.Line([startX, startY, pointer.x, pointer.y], {
            stroke: color,
            strokeWidth: strokeW,
          });
          break;
        case 'arrow':
          shape = new fabric.Line([startX, startY, pointer.x, pointer.y], {
            stroke: color,
            strokeWidth: strokeW,
          });
          break;
        case 'rect':
          shape = new fabric.Rect({
            left: startX,
            top: startY,
            width: width,
            height: height,
            fill: 'transparent',
            stroke: color,
            strokeWidth: strokeW,
          });
          break;
        case 'circle':
          shape = new fabric.Ellipse({
            left: startX,
            top: startY,
            rx: width / 2,
            ry: height / 2,
            fill: 'transparent',
            stroke: color,
            strokeWidth: strokeW,
          });
          break;
        case 'triangle':
          shape = new fabric.Triangle({
            left: startX,
            top: startY,
            width: width,
            height: height,
            fill: 'transparent',
            stroke: color,
            strokeWidth: strokeW,
          });
          break;
        default: break;
      }
      if (shape) canvas.add(shape);
      canvas.renderAll();
    };

    const onMouseUp = () => {
      if (isDrawing) {
        if (shape) {
          const json = canvas.toJSON();
          setHistory(prev => [...prev, json]);
          setRedoStack([]);
          shape = null;
        }
        isDrawing = false;
      }
    };

    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);

    return () => {
      canvas.off('mouse:down', onMouseDown);
      canvas.off('mouse:move', onMouseMove);
      canvas.off('mouse:up', onMouseUp);
    };
  }, [tool, color, strokeW, backgroundLoaded]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* Toolbar */}
      {!readOnly && (
        <div className="canvas-toolbar">
          {TOOLS.map(t => (
            <button
              key={t.id}
              className={`tool-btn ${tool === t.id ? 'active' : ''}`}
              onClick={() => setTool(t.id)}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
          <span className="tool-sep" />
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 22, height: 22, borderRadius: 4, background: c,
                border: color === c ? '2px solid var(--text)' : '1.5px solid var(--border)',
                cursor: 'pointer', transition: 'var(--transition)'
              }}
              title={c}
            />
          ))}
          <span className="tool-sep" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Size</span>
            <input
              type="range" min="1" max="12" value={strokeW}
              onChange={e => setStrokeW(+e.target.value)}
              style={{ width: 60, accentColor: 'var(--yellow)' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 14 }}>{strokeW}</span>
          </div>
          <span className="tool-sep" />
          <button className="tool-btn" onClick={undo} title="Undo" disabled={history.length < 2}><Undo2 size={13} /></button>
          <button className="tool-btn" onClick={redo} title="Redo" disabled={!redoStack.length}><Redo2 size={13} /></button>
          <button className="tool-btn" onClick={clearCanvas} title="Clear"><Trash2 size={13} /></button>
          <span className="tool-sep" />
          <button className="tool-btn" onClick={handleDownload} title="Download"><Download size={13} /></button>
          {onSave && (
            <button className="btn btn-primary btn-sm" onClick={handleSave} style={{ marginLeft: 4 }}>
              <Save size={12} /> Simpan Anotasi
            </button>
          )}
        </div>
      )}

      {/* Canvas Container dengan scroll */}
      <div style={{
        overflow: 'auto',
        flex: 1,
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        padding: 16,
        minHeight: 300
      }}>
        {imageError ? (
          <div className="empty-state">
            <span>Gagal memuat gambar. Periksa apakah gambar tersedia.</span>
          </div>
        ) : imageUrl ? (
          <canvas
            ref={canvasRef}
            style={{
              cursor: tool === 'select' ? 'default' : 'crosshair',
              borderRadius: 6,
              boxShadow: 'var(--shadow)',
              // Tidak ada max-width agar ukuran sesuai asli
            }}
          />
        ) : (
          <div className="empty-state">
            <span>Tidak ada gambar untuk dianotasi</span>
          </div>
        )}
      </div>

      {/* Modal input teks */}
      {showTextInput && (
        <div className="modal-overlay" onClick={() => setShowTextInput(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>Tambah Teks</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowTextInput(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Masukkan teks:</label>
                <input
                  type="text"
                  className="form-input"
                  value={textInputValue}
                  onChange={e => setTextInputValue(e.target.value)}
                  autoFocus
                  onKeyPress={e => e.key === 'Enter' && handleTextSubmit()}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowTextInput(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleTextSubmit}>Tambahkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}