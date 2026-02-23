import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { PDFDocument, rgb } from 'pdf-lib';
import { Download, ChevronLeft, ChevronRight, PenTool, Eraser, Trash2, Upload, ZoomIn, ZoomOut, Hand, Type, Image as ImageIcon, Pen } from 'lucide-react';
import { Rnd } from 'react-rnd';
import SignatureCanvas from 'react-signature-canvas';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

type Point = { x: number; y: number };
type Stroke = {
  points: Point[];
  color: string;
  size: number;
  tool: 'pen' | 'eraser';
};

type TextObject = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  fontSize: number;
};

type ImageObject = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
};

const TextOverlay = ({ textObj, scale, visualScale, isSelected, onSelect, onChange, onDelete }: {
  key?: string;
  textObj: TextObject;
  scale: number;
  visualScale: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (t: TextObject) => void;
  onDelete: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(textObj.text === 'Type here');

  return (
    <Rnd
      scale={visualScale}
      position={{ x: textObj.x * scale, y: textObj.y * scale }}
      size={{ width: textObj.width * scale, height: textObj.height * scale }}
      onDragStart={(e) => {
        if (!isEditing) onSelect();
      }}
      onDragStop={(e, d) => {
        onChange({ ...textObj, x: d.x / scale, y: d.y / scale });
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        const newHeight = parseInt(ref.style.height) / scale;
        const scaleFactor = newHeight / textObj.height;
        onChange({
          ...textObj,
          width: parseInt(ref.style.width) / scale,
          height: newHeight,
          x: position.x / scale,
          y: position.y / scale,
          fontSize: textObj.fontSize * scaleFactor
        });
      }}
      disableDragging={!isSelected || isEditing}
      enableResizing={isSelected && !isEditing}
      className={`absolute ${isSelected ? 'ring-1 ring-indigo-500 ring-dashed bg-indigo-50/10' : ''}`}
      style={{ zIndex: isSelected ? 50 : 10 }}
      bounds="parent"
    >
      {isSelected && !isEditing && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 shadow-md z-50 hover:bg-red-600"
          onTouchEnd={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 size={14} />
        </button>
      )}
      {isEditing ? (
        <textarea
          autoFocus
          value={textObj.text}
          onChange={(e) => onChange({ ...textObj, text: e.target.value })}
          onBlur={() => setIsEditing(false)}
          className="w-full h-full resize-none bg-transparent outline-none p-0 m-0 border-none"
          style={{ 
            color: textObj.color, 
            fontSize: `${textObj.fontSize * scale}px`,
            lineHeight: 1.2,
            fontFamily: 'Helvetica, Arial, sans-serif'
          }}
        />
      ) : (
        <div 
          onDoubleClick={() => { onSelect(); setIsEditing(true); }}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          onTouchEnd={(e) => { 
            if (!isSelected) {
              e.stopPropagation(); 
              onSelect(); 
            }
          }}
          className="w-full h-full cursor-text whitespace-pre-wrap break-words overflow-hidden"
          style={{ 
            color: textObj.color, 
            fontSize: `${textObj.fontSize * scale}px`,
            lineHeight: 1.2,
            fontFamily: 'Helvetica, Arial, sans-serif'
          }}
        >
          {textObj.text}
        </div>
      )}
      {isSelected && !isEditing && (
        <button 
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          onTouchEnd={(e) => { e.stopPropagation(); setIsEditing(true); }}
          className="absolute -bottom-3 -right-3 bg-indigo-500 text-white rounded-full p-1.5 shadow-md z-50 hover:bg-indigo-600"
        >
          <PenTool size={14} />
        </button>
      )}
    </Rnd>
  );
};

const ImageOverlay = ({ imgObj, scale, visualScale, isSelected, onSelect, onChange, onDelete }: {
  key?: string;
  imgObj: ImageObject;
  scale: number;
  visualScale: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (t: ImageObject) => void;
  onDelete: () => void;
}) => {
  return (
    <Rnd
      scale={visualScale}
      position={{ x: imgObj.x * scale, y: imgObj.y * scale }}
      size={{ width: imgObj.width * scale, height: imgObj.height * scale }}
      onDragStart={(e) => {
        onSelect();
      }}
      onDragStop={(e, d) => {
        onChange({ ...imgObj, x: d.x / scale, y: d.y / scale });
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        onChange({
          ...imgObj,
          width: parseInt(ref.style.width) / scale,
          height: parseInt(ref.style.height) / scale,
          x: position.x / scale,
          y: position.y / scale,
        });
      }}
      disableDragging={!isSelected}
      enableResizing={isSelected}
      lockAspectRatio={true}
      className={`absolute ${isSelected ? 'ring-1 ring-indigo-500 ring-dashed bg-indigo-50/10' : ''}`}
      style={{ zIndex: isSelected ? 50 : 10 }}
      bounds="parent"
    >
      {isSelected && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 shadow-md z-50 hover:bg-red-600"
          onTouchEnd={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 size={14} />
        </button>
      )}
      <img 
        src={imgObj.dataUrl} 
        alt="Inserted" 
        className="w-full h-full object-contain pointer-events-none"
      />
      <div 
        className="absolute inset-0 cursor-pointer"
        onDoubleClick={() => onSelect()}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onTouchEnd={(e) => { 
          if (!isSelected) {
            e.stopPropagation(); 
            onSelect(); 
          }
        }}
      />
    </Rnd>
  );
};

export default function PDFEditor() {
  const [pdfFile, setPdfFile] = useState<ArrayBuffer | null>(null);
  const [pdfFileBytes, setPdfFileBytes] = useState<Uint8Array | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  
  const [pageStrokes, setPageStrokes] = useState<Record<number, Stroke[]>>({});
  const [pageTexts, setPageTexts] = useState<Record<number, TextObject[]>>({});
  const [pageImages, setPageImages] = useState<Record<number, ImageObject[]>>({});
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'pan' | 'text'>('pan');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{x: number, y: number} | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const [visualScale, setVisualScale] = useState(1);
  const [pinchStartDist, setPinchStartDist] = useState<number | null>(null);
  const [pinchStartCenter, setPinchStartCenter] = useState<{x: number, y: number} | null>(null);
  const [pinchStartPanOffset, setPinchStartPanOffset] = useState<{x: number, y: number} | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
  }, [currentPage]);

  const [showExportModal, setShowExportModal] = useState(false);
  const [fileName, setFileName] = useState('edited_document.pdf');
  const [isExporting, setIsExporting] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [successfulPassword, setSuccessfulPassword] = useState<string | undefined>(undefined);
  const passwordCallbackRef = useRef<((pwd: string) => void) | null>(null);

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const sigWrapperRef = useRef<HTMLDivElement>(null);
  const [sigCanvasSize, setSigCanvasSize] = useState({ width: 300, height: 150 });

  useEffect(() => {
    if (!showSignatureModal || !sigWrapperRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setSigCanvasSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    
    observer.observe(sigWrapperRef.current);
    return () => observer.disconnect();
  }, [showSignatureModal]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const arrayBuffer = await file.arrayBuffer();
    // Keep a copy of the bytes for pdf-lib to avoid detached ArrayBuffer issues
    const bytes = new Uint8Array(arrayBuffer);
    setPdfFileBytes(bytes);
    
    // Pass a copy to pdf.js
    const bufferForPdfJs = bytes.buffer.slice(0);
    setPdfFile(bufferForPdfJs);
    setSuccessfulPassword(undefined);
    
    loadPdf(bufferForPdfJs);
  };

  const loadPdf = async (buffer: ArrayBuffer) => {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      
      loadingTask.onPassword = (updatePassword: (pwd: string) => void, reason: number) => {
        if (reason === 2) { // INCORRECT_PASSWORD
          setPasswordError(true);
        } else {
          setPasswordError(false);
        }
        passwordCallbackRef.current = updatePassword;
        setShowPasswordModal(true);
      };

      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setCurrentPage(1);
      setPageStrokes({});
      setPageTexts({});
      setPageImages({});
      setSelectedObjectId(null);
      setShowPasswordModal(false);
      
      if (passwordCallbackRef.current) {
        setSuccessfulPassword(password);
      }
    } catch (error) {
      console.error("Error loading PDF:", error);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordCallbackRef.current) {
      passwordCallbackRef.current(password);
    }
  };

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !pdfCanvasRef.current || !drawCanvasRef.current) return;
    
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale });
    
    const canvas = pdfCanvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const drawCanvas = drawCanvasRef.current;
    drawCanvas.height = viewport.height;
    drawCanvas.width = viewport.width;
    
    const renderContext: any = {
      canvasContext: context,
      viewport: viewport,
    };
    
    await page.render(renderContext).promise;
    redrawStrokes();
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    return {
      x: (clientX - rect.left) / visualScale,
      y: (clientY - rect.top) / visualScale
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.target === drawCanvasRef.current) {
      setSelectedObjectId(null);
    }

    if ('touches' in e && e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      
      setPinchStartDist(dist);
      setPinchStartCenter({ x: centerX, y: centerY });
      setPinchStartPanOffset({ ...panOffset });
      setIsPinching(true);
      return;
    }

    if (currentTool === 'text') {
      e.preventDefault();
      const coords = getCoordinates(e);
      const normalizedCoords = { x: coords.x / scale, y: coords.y / scale };
      const newText: TextObject = {
        id: Date.now().toString(),
        x: normalizedCoords.x,
        y: normalizedCoords.y,
        width: 150 / scale,
        height: 40 / scale,
        text: 'Type here',
        color,
        fontSize: 16 / scale,
      };
      setPageTexts(prev => ({
        ...prev,
        [currentPage]: [...(prev[currentPage] || []), newText]
      }));
      setSelectedObjectId(newText.id);
      setCurrentTool('pan');
      return;
    }

    if (currentTool === 'pan') {
      setIsPanning(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      setLastPanPoint({ x: clientX, y: clientY });
      return;
    }

    e.preventDefault();
    setIsDrawing(true);
    const coords = getCoordinates(e);
    const normalizedCoords = { x: coords.x / scale, y: coords.y / scale };
    const newStroke: Stroke = {
      points: [normalizedCoords],
      color,
      size: brushSize / scale,
      tool: currentTool as 'pen' | 'eraser'
    };
    setCurrentStroke(newStroke);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
      if (pinchStartDist !== null && pinchStartCenter && pinchStartPanOffset && containerRef.current) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const currentCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const currentCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        const newVisualScale = dist / pinchStartDist;
        const boundedVisualScale = Math.min(Math.max(0.5 / scale, newVisualScale), 3 / scale);
        setVisualScale(boundedVisualScale);

        const rect = containerRef.current.getBoundingClientRect();
        const O_x = rect.left + rect.width / 2;
        const O_y = rect.top + rect.height / 2;

        const v_x = pinchStartCenter.x - O_x - pinchStartPanOffset.x;
        const v_y = pinchStartCenter.y - O_y - pinchStartPanOffset.y;

        const T_x = currentCenterX - O_x - v_x * boundedVisualScale;
        const T_y = currentCenterY - O_y - v_y * boundedVisualScale;

        setPanOffset({ x: T_x, y: T_y });
      }
      return;
    }

    if (currentTool === 'pan' && isPanning && lastPanPoint) {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      
      const dx = clientX - lastPanPoint.x;
      const dy = clientY - lastPanPoint.y;
      
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPoint({ x: clientX, y: clientY });
      return;
    }

    if (!isDrawing || !currentStroke || !drawCanvasRef.current) return;
    e.preventDefault();
    
    const coords = getCoordinates(e);
    const normalizedCoords = { x: coords.x / scale, y: coords.y / scale };
    const newPoints = [...currentStroke.points, normalizedCoords];
    const updatedStroke = { ...currentStroke, points: newPoints };
    setCurrentStroke(updatedStroke);
    
    const ctx = drawCanvasRef.current.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    const prevPoint = currentStroke.points[currentStroke.points.length - 1];
    ctx.moveTo(prevPoint.x * scale, prevPoint.y * scale);
    ctx.lineTo(normalizedCoords.x * scale, normalizedCoords.y * scale);
    
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = (brushSize / scale) * 5 * scale;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = (brushSize / scale) * scale;
    }
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (isPinching) {
      setScale(s => Math.min(Math.max(0.5, s * visualScale), 3));
      setVisualScale(1);
      setIsPinching(false);
      setPinchStartDist(null);
      setPinchStartCenter(null);
      setPinchStartPanOffset(null);
      return;
    }

    setIsPanning(false);
    setLastPanPoint(null);
    
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    
    setPageStrokes(prev => {
      const currentStrokes = prev[currentPage] || [];
      return {
        ...prev,
        [currentPage]: [...currentStrokes, currentStroke]
      };
    });
    setCurrentStroke(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.min(Math.max(0.5, scale + zoomDelta), 3);
      
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const O_x = rect.left + rect.width / 2;
        const O_y = rect.top + rect.height / 2;
        
        const P_x = e.clientX;
        const P_y = e.clientY;
        
        const scaleRatio = newScale / scale;
        const v_x = P_x - O_x - panOffset.x;
        const v_y = P_y - O_y - panOffset.y;
        
        const T_x = P_x - O_x - v_x * scaleRatio;
        const T_y = P_y - O_y - v_y * scaleRatio;
        
        setPanOffset({ x: T_x, y: T_y });
      }
      
      setScale(newScale);
    } else {
      setPanOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  const redrawStrokes = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const strokes = pageStrokes[currentPage] || [];
    
    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * scale, stroke.points[0].y * scale);
      
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * scale, stroke.points[i].y * scale);
      }
      
      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.size * 5 * scale;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size * scale;
      }
      
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    });
  };

  useEffect(() => {
    redrawStrokes();
  }, [pageStrokes, currentPage]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;
      insertImageToCanvas(dataUrl);
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const insertImageToCanvas = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = 200 / scale;
      const maxHeight = 200 / scale;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      const container = containerRef.current;
      let x = 50 / scale;
      let y = 50 / scale;

      if (container && pdfCanvasRef.current) {
        const containerRect = container.getBoundingClientRect();
        const canvasRect = pdfCanvasRef.current.getBoundingClientRect();
        
        const screenCenterX = containerRect.left + containerRect.width / 2;
        const screenCenterY = containerRect.top + containerRect.height / 2;
        
        const canvasPixelX = (screenCenterX - canvasRect.left) * (pdfCanvasRef.current.width / canvasRect.width);
        const canvasPixelY = (screenCenterY - canvasRect.top) * (pdfCanvasRef.current.height / canvasRect.height);
        
        x = canvasPixelX / scale - width / 2;
        y = canvasPixelY / scale - height / 2;
      }

      const newImage: ImageObject = {
        id: Date.now().toString(),
        x,
        y,
        width,
        height,
        dataUrl,
      };

      setPageImages(prev => ({
        ...prev,
        [currentPage]: [...(prev[currentPage] || []), newImage]
      }));
      setSelectedObjectId(newImage.id);
      setCurrentTool('pan');
    };
    img.src = dataUrl;
  };

  const handleSignatureInsert = () => {
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      const canvas = sigCanvasRef.current.getCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const l = pixels.data.length;
        let bound = {
          top: canvas.height,
          left: canvas.width,
          right: 0,
          bottom: 0
        };
        let i, x, y;
        for (i = 0; i < l; i += 4) {
          if (pixels.data[i + 3] !== 0) {
            x = (i / 4) % canvas.width;
            y = ~~((i / 4) / canvas.width);
            if (x < bound.left) bound.left = x;
            if (x > bound.right) bound.right = x;
            if (y < bound.top) bound.top = y;
            if (y > bound.bottom) bound.bottom = y;
          }
        }
        
        const trimHeight = bound.bottom - bound.top + 1;
        const trimWidth = bound.right - bound.left + 1;
        
        if (trimWidth > 0 && trimHeight > 0) {
          const trimmed = document.createElement('canvas');
          trimmed.width = trimWidth;
          trimmed.height = trimHeight;
          const tCtx = trimmed.getContext('2d');
          if (tCtx) {
            tCtx.putImageData(ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight), 0, 0);
            insertImageToCanvas(trimmed.toDataURL('image/png'));
          }
        }
      }
    }
    setShowSignatureModal(false);
  };

  const clearPage = () => {
    setPageStrokes(prev => ({
      ...prev,
      [currentPage]: []
    }));
    setPageTexts(prev => ({
      ...prev,
      [currentPage]: []
    }));
    setPageImages(prev => ({
      ...prev,
      [currentPage]: []
    }));
    setSelectedObjectId(null);
  };

  const exportPDF = async () => {
    if (!pdfFileBytes) return;
    setIsExporting(true);
    
    try {
      let pdfBytes: Uint8Array;

      // Always create a new PDF and render each page as an image to avoid encryption issues
      const newPdfDoc = await PDFDocument.create();
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc?.getPage(i);
        if (!page) continue;
        
        // Use a higher scale for better quality
        const exportScale = 2;
        const viewport = page.getViewport({ scale: exportScale });
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) continue;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Render PDF page to canvas
        await page.render({
          canvasContext: ctx,
          viewport: viewport,
        } as any).promise;
        
        // Draw strokes on top
        const strokes = pageStrokes[i] || [];
        strokes.forEach(stroke => {
          if (stroke.points.length < 2) return;
          
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x * exportScale, stroke.points[0].y * exportScale);
          
          for (let j = 1; j < stroke.points.length; j++) {
            ctx.lineTo(stroke.points[j].x * exportScale, stroke.points[j].y * exportScale);
          }
          
          if (stroke.tool === 'eraser') {
            // Eraser on a flattened image just draws white (or background color)
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = stroke.size * 5 * exportScale;
          } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size * exportScale;
          }
          
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        });
        
        const jpegDataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
        const jpegImage = await newPdfDoc.embedJpg(jpegDataUrl);
        
        const newPage = newPdfDoc.addPage([viewport.width / exportScale, viewport.height / exportScale]);
        newPage.drawImage(jpegImage, {
          x: 0,
          y: 0,
          width: viewport.width / exportScale,
          height: viewport.height / exportScale,
        });

        const texts = pageTexts[i] || [];
        const images = pageImages[i] || [];
        
        for (const imgObj of images) {
          let embeddedImage;
          if (imgObj.dataUrl.startsWith('data:image/png')) {
            embeddedImage = await newPdfDoc.embedPng(imgObj.dataUrl);
          } else {
            embeddedImage = await newPdfDoc.embedJpg(imgObj.dataUrl);
          }
          newPage.drawImage(embeddedImage, {
            x: imgObj.x,
            y: (viewport.height / exportScale) - imgObj.y - imgObj.height,
            width: imgObj.width,
            height: imgObj.height,
          });
        }

        for (const textObj of texts) {
          const { r, g, b } = hexToRgb(textObj.color);
          const lines = textObj.text.split('\n');
          const lineHeight = textObj.fontSize * 1.2;
          
          lines.forEach((line, lineIdx) => {
            newPage.drawText(line, {
              x: textObj.x,
              y: (viewport.height / exportScale) - textObj.y - textObj.fontSize - (lineIdx * lineHeight),
              size: textObj.fontSize,
              color: rgb(r, g, b),
            });
          });
        }
      }
      
      pdfBytes = await newPdfDoc.save();
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      let finalName = fileName.trim();
      if (!finalName) finalName = 'edited_document';
      if (!finalName.toLowerCase().endsWith('.pdf')) {
        finalName += '.pdf';
      }
      a.download = finalName;
      
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-100 font-sans overflow-hidden">
      <header className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-white border-b border-neutral-200 shadow-sm z-10 gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
          <h1 className="text-xl font-semibold text-neutral-800 hidden sm:block">PDF Editor</h1>
          
          {pdfDoc && (
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-white disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium px-2 min-w-[3rem] text-center">
                {currentPage} / {numPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                disabled={currentPage === numPages}
                className="p-1 rounded hover:bg-white disabled:opacity-50 transition-colors"
                title="Next Page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {pdfDoc && (
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
              <button 
                onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                className="p-1 rounded hover:bg-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-sm font-medium px-1 min-w-[2.5rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button 
                onClick={() => setScale(s => Math.min(3, s + 0.25))}
                className="p-1 rounded hover:bg-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>
            </div>
          )}
        </div>

        {pdfDoc && (
          <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg overflow-x-auto max-w-full">
              <button
                onClick={() => setCurrentTool('pan')}
                className={`p-2 rounded transition-colors shrink-0 ${currentTool === 'pan' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-600 hover:bg-white/50'}`}
                title="Pan Tool"
              >
                <Hand size={18} />
              </button>
              <button
                onClick={() => setCurrentTool('text')}
                className={`p-2 rounded transition-colors shrink-0 ${currentTool === 'text' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-600 hover:bg-white/50'}`}
                title="Text Tool"
              >
                <Type size={18} />
              </button>
              <button
                onClick={() => imageInputRef.current?.click()}
                className={`p-2 rounded transition-colors shrink-0 text-neutral-600 hover:bg-white/50`}
                title="Insert Image"
              >
                <ImageIcon size={18} />
                <input 
                  type="file" 
                  ref={imageInputRef} 
                  className="hidden" 
                  accept="image/png, image/jpeg, image/jpg" 
                  onChange={handleImageUpload} 
                />
              </button>
              <button
                onClick={() => setShowSignatureModal(true)}
                className={`p-2 rounded transition-colors shrink-0 text-neutral-600 hover:bg-white/50`}
                title="Insert Signature"
              >
                <Pen size={18} />
              </button>
              <button
                onClick={() => setCurrentTool('pen')}
                className={`p-2 rounded transition-colors shrink-0 ${currentTool === 'pen' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-600 hover:bg-white/50'}`}
                title="Pen Tool"
              >
                <PenTool size={18} />
              </button>
              <button
                onClick={() => setCurrentTool('eraser')}
                className={`p-2 rounded transition-colors shrink-0 ${currentTool === 'eraser' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-600 hover:bg-white/50'}`}
                title="Eraser"
              >
                <Eraser size={18} />
              </button>
              <div className="w-px h-6 bg-neutral-300 mx-1 shrink-0" />
              <input 
                type="color" 
                value={color} 
                onChange={e => setColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0"
                disabled={currentTool === 'eraser' || currentTool === 'pan'}
                title="Color"
              />
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={brushSize} 
                onChange={e => setBrushSize(parseInt(e.target.value))}
                className="w-16 sm:w-24 mx-1 accent-indigo-600 shrink-0"
                disabled={currentTool === 'pan' || currentTool === 'text'}
                title="Brush Size"
              />
              <div className="w-px h-6 bg-neutral-300 mx-1 shrink-0" />
              <button
                onClick={clearPage}
                className="p-2 rounded text-red-600 hover:bg-red-50 transition-colors shrink-0"
                title="Clear Page"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm text-sm shrink-0"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        )}
      </header>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-neutral-800 mb-4">Export PDF</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                File Name
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="document.pdf"
                disabled={isExporting}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={exportPDF}
                disabled={isExporting || !fileName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Exporting...
                  </>
                ) : (
                  'Export'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-neutral-800 mb-4">Password Required</h2>
            <p className="text-sm text-neutral-600 mb-4">
              This document is password protected. Please enter the password to open it.
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-6">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    passwordError ? 'border-red-500' : 'border-neutral-300'
                  }`}
                  placeholder="Enter password"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-500 text-sm mt-2">Incorrect password. Please try again.</p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPdfFile(null);
                  }}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!password}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Open Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSignatureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
            <div className="p-4 border-b border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-800">Draw Signature</h2>
            </div>
            <div className="flex-1 bg-neutral-50 p-4 overflow-hidden">
              <div ref={sigWrapperRef} className="w-full h-full bg-white rounded-lg border border-neutral-300 shadow-inner overflow-hidden">
                <SignatureCanvas 
                  ref={sigCanvasRef} 
                  penColor="black"
                  clearOnResize={false}
                  canvasProps={{
                    width: sigCanvasSize.width, 
                    height: sigCanvasSize.height, 
                    className: 'sigCanvas'
                  }} 
                />
              </div>
            </div>
            <div className="p-4 border-t border-neutral-200 flex justify-between items-center bg-white">
              <button
                onClick={() => sigCanvasRef.current?.clear()}
                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors text-sm font-medium"
              >
                Clear
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignatureInsert}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  Insert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main 
        ref={containerRef} 
        className="flex-1 overflow-hidden bg-neutral-100 flex items-center justify-center relative touch-none"
        onWheel={handleWheel}
      >
        {!pdfDoc ? (
          <div className="flex flex-col items-center justify-center h-full w-full max-w-md mx-auto">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-neutral-300 rounded-2xl bg-white hover:bg-neutral-50 cursor-pointer transition-colors shadow-sm">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-12 h-12 text-neutral-400 mb-4" />
                <p className="mb-2 text-lg font-medium text-neutral-700">Click to upload PDF</p>
                <p className="text-sm text-neutral-500">or drag and drop</p>
              </div>
              <input type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
            </label>
          </div>
        ) : (
          <div 
            className="relative shadow-xl rounded-lg bg-white" 
            style={{ 
              width: 'fit-content',
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${visualScale})`,
              transformOrigin: 'center center',
              transition: isPinching || isPanning ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            <canvas ref={pdfCanvasRef} className="block" />
            <canvas 
              ref={drawCanvasRef} 
              className={`absolute top-0 left-0 touch-none ${currentTool === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : currentTool === 'text' ? 'cursor-text' : 'cursor-crosshair'}`}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseOut={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              onTouchCancel={handlePointerUp}
            />
            {pageTexts[currentPage]?.map(textObj => (
              <TextOverlay 
                key={textObj.id}
                textObj={textObj}
                scale={scale}
                visualScale={visualScale}
                isSelected={selectedObjectId === textObj.id}
                onSelect={() => setSelectedObjectId(textObj.id)}
                onChange={(updated) => {
                  setPageTexts(prev => ({
                    ...prev,
                    [currentPage]: prev[currentPage].map(t => t.id === updated.id ? updated : t)
                  }));
                }}
                onDelete={() => {
                  setPageTexts(prev => ({
                    ...prev,
                    [currentPage]: prev[currentPage].filter(t => t.id !== textObj.id)
                  }));
                }}
              />
            ))}
            {pageImages[currentPage]?.map(imgObj => (
              <ImageOverlay 
                key={imgObj.id}
                imgObj={imgObj}
                scale={scale}
                visualScale={visualScale}
                isSelected={selectedObjectId === imgObj.id}
                onSelect={() => setSelectedObjectId(imgObj.id)}
                onChange={(updated) => {
                  setPageImages(prev => ({
                    ...prev,
                    [currentPage]: prev[currentPage].map(t => t.id === updated.id ? updated : t)
                  }));
                }}
                onDelete={() => {
                  setPageImages(prev => ({
                    ...prev,
                    [currentPage]: prev[currentPage].filter(t => t.id !== imgObj.id)
                  }));
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
