import React, { useEffect, forwardRef, useRef, useState } from 'react';
import rough from 'roughjs';
import { DrawingElement } from '../types';
import { getResizeHandle, getCursorForResizeHandle } from '../utils/geometry';

interface CanvasProps {
  elements: DrawingElement[];
  selectedElementId: string | null;
  currentTool: string;
  isEditingText: boolean;
  editingElementId: string | null;
  isResizing: boolean;
  resizeHandle: string | null;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: () => void;
  onDoubleClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onTextChange: (text: string) => void;
  onMouseHover: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

// Cache for rough.js drawable objects to prevent trembling
const drawableCache = new Map<string, any>();

// Clean up cache periodically to prevent memory leaks
const cleanupCache = () => {
  if (drawableCache.size > 1000) {
    drawableCache.clear();
  }
};

const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>(({
  elements,
  selectedElementId,
  currentTool,
  isEditingText,
  editingElementId,
  isResizing,
  resizeHandle,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onDoubleClick,
  onTextChange,
  onMouseHover,
}, ref) => {
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = ref as React.RefObject<HTMLCanvasElement>;
    if (!canvas.current) return;

    // Cancel previous animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Use requestAnimationFrame for smoother rendering
    animationFrameRef.current = requestAnimationFrame(() => {
      const ctx = canvas.current!.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.current!.width = window.innerWidth;
      canvas.current!.height = window.innerHeight - 80; // Account for toolbar

      // Clear canvas
      ctx.clearRect(0, 0, canvas.current!.width, canvas.current!.height);

      // Draw grid background
      drawGrid(ctx, canvas.current!.width, canvas.current!.height);

      // Initialize rough.js
      const roughCanvas = rough.canvas(canvas.current!);

      // Clean up cache periodically
      cleanupCache();

      // Draw all elements
      elements.forEach((element) => {
        drawElement(roughCanvas, element, element.id === selectedElementId);
      });
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [elements, selectedElementId, ref]);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 20; // Same as Excalidraw's grid spacing
    ctx.save();

    // Set the exact dot color and size as Excalidraw
    ctx.fillStyle = '#e9ecef'; // Excalidraw's dot color
    ctx.globalAlpha = 1;

    // Draw dots at grid intersections
    for (let x = 0; x <= width; x += gridSize) {
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 0.5, 0, Math.PI * 2); // Small dots like Excalidraw
        ctx.fill();
      }
    }

    ctx.restore();
  };

  const drawElement = (roughCanvas: any, element: DrawingElement, isSelected: boolean) => {
    const { x, y, width, height, strokeColor, fillColor, strokeWidth, type, id, seed } = element;

    // Skip drawing if element has no dimensions (except for text and draw)
    if (type !== 'text' && type !== 'draw' && (width === 0 || height === 0)) return;

    const options = {
      stroke: strokeColor,
      fill: fillColor === 'transparent' ? undefined : fillColor,
      strokeWidth,
      roughness: 1.2,
      bowing: 1,
      seed: seed || 1, // Use consistent seed to prevent trembling
    };

    // Create a cache key for this element's current state
    const cacheKey = `${id}-${x}-${y}-${width}-${height}-${strokeColor}-${fillColor}-${strokeWidth}`;

    try {
      switch (type) {
        case 'rectangle':
          if (!drawableCache.has(cacheKey)) {
            drawableCache.set(cacheKey, roughCanvas.generator.rectangle(x, y, width, height, options));
          }
          roughCanvas.draw(drawableCache.get(cacheKey));
          break;
        case 'circle':
          if (!drawableCache.has(cacheKey)) {
            drawableCache.set(cacheKey, roughCanvas.generator.ellipse(x + width / 2, y + height / 2, width, height, options));
          }
          roughCanvas.draw(drawableCache.get(cacheKey));
          break;
        case 'line':
          if (!drawableCache.has(cacheKey)) {
            drawableCache.set(cacheKey, roughCanvas.generator.line(x, y, x + width, y + height, options));
          }
          roughCanvas.draw(drawableCache.get(cacheKey));
          break;
        case 'arrow':
          // Draw line
          const lineCacheKey = `${cacheKey}-line`;
          if (!drawableCache.has(lineCacheKey)) {
            drawableCache.set(lineCacheKey, roughCanvas.generator.line(x, y, x + width, y + height, options));
          }
          roughCanvas.draw(drawableCache.get(lineCacheKey));

          // Draw arrowhead
          const arrowSize = Math.max(8, strokeWidth * 3);
          const angle = Math.atan2(height, width);
          const arrowX = x + width;
          const arrowY = y + height;

          const arrow1CacheKey = `${cacheKey}-arrow1`;
          const arrow2CacheKey = `${cacheKey}-arrow2`;

          if (!drawableCache.has(arrow1CacheKey)) {
            drawableCache.set(arrow1CacheKey, roughCanvas.generator.line(
              arrowX,
              arrowY,
              arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
              arrowY - arrowSize * Math.sin(angle - Math.PI / 6),
              options
            ));
          }
          if (!drawableCache.has(arrow2CacheKey)) {
            drawableCache.set(arrow2CacheKey, roughCanvas.generator.line(
              arrowX,
              arrowY,
              arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
              arrowY - arrowSize * Math.sin(angle + Math.PI / 6),
              options
            ));
          }

          roughCanvas.draw(drawableCache.get(arrow1CacheKey));
          roughCanvas.draw(drawableCache.get(arrow2CacheKey));
          break;
        case 'text':
          // For text, we'll use regular canvas text (rough.js doesn't support text)
          const canvas = roughCanvas.canvas;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.font = `${Math.max(14, strokeWidth * 6)}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
            ctx.fillStyle = strokeColor;
            ctx.textBaseline = 'top';
            ctx.fillText(element.text || 'Text', x, y);
          }
          break;
        case 'draw':
          // Draw free-hand path
          if (element.points && element.points.length > 1) {
            const pathCacheKey = `${cacheKey}-path-${element.points.length}`;
            if (!drawableCache.has(pathCacheKey)) {
              // Create a smooth curve through the points
              const pathPoints = element.points.map(p => [p.x, p.y]);
              drawableCache.set(pathCacheKey, roughCanvas.generator.curve(pathPoints, options));
            }
            roughCanvas.draw(drawableCache.get(pathCacheKey));
          }
          break;
      }
    } catch (error) {
      console.warn('Error drawing element:', error);
    }

    // Selection bounds and resize handles removed - no visual selection indicator
  };

  const [currentCursor, setCurrentCursor] = useState('cursor-crosshair');

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Update cursor based on hover position
    if (currentTool === 'select' && selectedElementId && !isResizing) {
      const canvas = ref as React.RefObject<HTMLCanvasElement>;
      if (canvas.current) {
        const rect = canvas.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const selectedElement = elements.find(el => el.id === selectedElementId);
        if (selectedElement) {
          const handle = getResizeHandle({ x, y }, selectedElement);
          const cursor = handle ? getCursorForResizeHandle(handle) : 'cursor-move';
          setCurrentCursor(cursor);
        }
      }
    } else {
      const baseCursor = currentTool === 'eraser' ? 'cursor-pointer' :
        currentTool === 'text' ? 'cursor-text' :
          currentTool === 'draw' ? 'cursor-crosshair' : 'cursor-crosshair';
      setCurrentCursor(baseCursor);
    }

    onMouseMove(e);
    onMouseHover(e);
  };

  const getCursorStyle = () => {
    return currentCursor;
  };

  const editingElement = elements.find(el => el.id === editingElementId);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={ref}
        className={getCursorStyle()}
        onMouseDown={onMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDoubleClick={onDoubleClick}
        style={{
          backgroundColor: '#ffffff', // Pure white background like Excalidraw
          imageRendering: 'auto',
          WebkitFontSmoothing: 'antialiased',
        }}
      />

      {/* Text input overlay */}
      {isEditingText && editingElement && (
        <textarea
          autoFocus
          value={editingElement.text || ''}
          onChange={(e) => onTextChange(e.target.value)}
          onBlur={() => {
            // Handle blur if needed
          }}
          className="absolute border-2 border-blue-400 bg-transparent resize-none outline-none"
          style={{
            left: editingElement.x,
            top: editingElement.y,
            fontSize: `${Math.max(14, editingElement.strokeWidth * 6)}px`,
            color: editingElement.strokeColor,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            minWidth: '100px',
            minHeight: '20px',
            padding: '2px',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.currentTarget.blur();
            }
          }}
        />
      )}
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;