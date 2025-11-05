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
  gridEnabled: boolean;
  darkMode: boolean;
  zoom: number;
  panOffset: { x: number; y: number };
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: () => void;
  onDoubleClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onTextChange: (text: string) => void;
  onMouseHover: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
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
  gridEnabled,
  darkMode,
  zoom,
  panOffset,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onDoubleClick,
  onTextChange,
  onMouseHover,
  onWheel,
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

      // Set canvas size - keep it simple for performance
      canvas.current!.width = window.innerWidth;
      canvas.current!.height = window.innerHeight - 80; // Account for toolbar

      // Clear canvas
      ctx.clearRect(0, 0, canvas.current!.width, canvas.current!.height);

      // Apply zoom and pan transformations
      ctx.save();
      ctx.scale(zoom, zoom);
      ctx.translate(panOffset.x, panOffset.y);

      // Draw simple grid background if enabled
      if (gridEnabled) {
        drawSimpleGrid(ctx, canvas.current!.width / zoom, canvas.current!.height / zoom);
      }

      // Initialize rough.js
      const roughCanvas = rough.canvas(canvas.current!);

      // Clean up cache periodically
      cleanupCache();

      // Draw all elements
      elements.forEach((element) => {
        drawElement(roughCanvas, element, element.id === selectedElementId);
      });

      ctx.restore();
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [elements, selectedElementId, gridEnabled, darkMode, zoom, panOffset, isResizing]);

  const drawSimpleGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 20;
    ctx.save();

    // Adapt colors for dark/light mode
    const dotColor = darkMode ? '#374151' : '#e5e7eb';
    
    ctx.fillStyle = dotColor;
    ctx.globalAlpha = darkMode ? 0.6 : 0.8;

    // Draw a simple grid within visible area only for performance
    const startX = Math.max(0, Math.floor(-panOffset.x / gridSize) * gridSize);
    const endX = Math.min(width, startX + width + gridSize * 2);
    const startY = Math.max(0, Math.floor(-panOffset.y / gridSize) * gridSize);
    const endY = Math.min(height, startY + height + gridSize * 2);

    // Draw dots at grid intersections
    for (let x = startX; x <= endX; x += gridSize) {
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
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
        case 'ellipse':
          if (!drawableCache.has(cacheKey)) {
            drawableCache.set(cacheKey, roughCanvas.generator.ellipse(x + width / 2, y + height / 2, width, height, options));
          }
          roughCanvas.draw(drawableCache.get(cacheKey));
          break;
        case 'diamond':
          if (!drawableCache.has(cacheKey)) {
            const centerX = x + width / 2;
            const centerY = y + height / 2;
            const points = [
              [centerX, y], // top
              [x + width, centerY], // right
              [centerX, y + height], // bottom
              [x, centerY], // left
              [centerX, y] // close
            ];
            drawableCache.set(cacheKey, roughCanvas.generator.polygon(points, options));
          }
          roughCanvas.draw(drawableCache.get(cacheKey));
          break;
        case 'triangle':
          if (!drawableCache.has(cacheKey)) {
            const points = [
              [x + width / 2, y], // top
              [x + width, y + height], // bottom right
              [x, y + height], // bottom left
              [x + width / 2, y] // close
            ];
            drawableCache.set(cacheKey, roughCanvas.generator.polygon(points, options));
          }
          roughCanvas.draw(drawableCache.get(cacheKey));
          break;
        case 'star':
          if (!drawableCache.has(cacheKey)) {
            const centerX = x + width / 2;
            const centerY = y + height / 2;
            const outerRadius = Math.min(width, height) / 2;
            const innerRadius = outerRadius * 0.4;
            const points = [];

            for (let i = 0; i < 10; i++) {
              const angle = (i * Math.PI) / 5;
              const radius = i % 2 === 0 ? outerRadius : innerRadius;
              points.push([
                centerX + radius * Math.cos(angle - Math.PI / 2),
                centerY + radius * Math.sin(angle - Math.PI / 2)
              ]);
            }
            points.push(points[0]); // close
            drawableCache.set(cacheKey, roughCanvas.generator.polygon(points, options));
          }
          roughCanvas.draw(drawableCache.get(cacheKey));
          break;
        case 'hexagon':
          if (!drawableCache.has(cacheKey)) {
            const centerX = x + width / 2;
            const centerY = y + height / 2;
            const radius = Math.min(width, height) / 2;
            const points = [];

            for (let i = 0; i < 6; i++) {
              const angle = (i * Math.PI) / 3;
              points.push([
                centerX + radius * Math.cos(angle),
                centerY + radius * Math.sin(angle)
              ]);
            }
            points.push(points[0]); // close
            drawableCache.set(cacheKey, roughCanvas.generator.polygon(points, options));
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
          // Draw smooth, filled free-hand path using native canvas for better quality
          if (element.points && element.points.length > 1) {
            const canvas = roughCanvas.canvas;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.save();

              // Set up smooth, high-quality drawing
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = strokeWidth;
              ctx.globalCompositeOperation = 'source-over';

              // Enable anti-aliasing for smoother lines
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';

              // Create smooth path using quadratic curves
              ctx.beginPath();
              const points = element.points;

              if (points.length === 1) {
                // Single point - draw a circle
                ctx.arc(points[0].x, points[0].y, strokeWidth / 2, 0, Math.PI * 2);
                ctx.fill();
              } else if (points.length === 2) {
                // Two points - draw a line
                ctx.moveTo(points[0].x, points[0].y);
                ctx.lineTo(points[1].x, points[1].y);
                ctx.stroke();
              } else {
                // Multiple points - create smooth curves
                ctx.moveTo(points[0].x, points[0].y);

                for (let i = 1; i < points.length - 1; i++) {
                  const currentPoint = points[i];
                  const nextPoint = points[i + 1];

                  // Calculate control point for smooth curve
                  const controlX = (currentPoint.x + nextPoint.x) / 2;
                  const controlY = (currentPoint.y + nextPoint.y) / 2;

                  ctx.quadraticCurveTo(currentPoint.x, currentPoint.y, controlX, controlY);
                }

                // Draw to the last point
                const lastPoint = points[points.length - 1];
                ctx.lineTo(lastPoint.x, lastPoint.y);
                ctx.stroke();

                // Add filled circles at each point for better coverage
                ctx.fillStyle = strokeColor;
                points.forEach(point => {
                  ctx.beginPath();
                  ctx.arc(point.x, point.y, strokeWidth / 3, 0, Math.PI * 2);
                  ctx.fill();
                });
              }

              ctx.restore();
            }
          }
          break;
        case 'image':
          // Draw image element with caching to prevent blinking
          if (element.imageData) {
            const canvas = roughCanvas.canvas;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Use image cache to prevent blinking
              const imageCacheKey = `img-${element.id}`;
              if (!drawableCache.has(imageCacheKey)) {
                const img = new Image();
                img.onload = () => {
                  drawableCache.set(imageCacheKey, img);
                  // Force re-render when image loads
                  const event = new CustomEvent('imageLoaded');
                  canvas.dispatchEvent(event);
                };
                img.src = element.imageData;
                // Store loading state
                drawableCache.set(imageCacheKey, 'loading');
              }
              
              const cachedImg = drawableCache.get(imageCacheKey);
              if (cachedImg && cachedImg !== 'loading') {
                ctx.save();
                ctx.globalAlpha = element.opacity || 1;
                ctx.drawImage(cachedImg, x, y, width, height);
                ctx.restore();
              }
            }
          }
          break;
      }
    } catch (error) {
      console.warn('Error drawing element:', error);
    }

    // Draw selection bounds and resize handles for selected elements (only in select mode)
    if (isSelected && width > 0 && height > 0 && currentTool === 'select') {
      const canvas = roughCanvas.canvas;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();

        // Selection border with subtle animation
        const time = Date.now() * 0.003;
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.lineDashOffset = time * 15;
        ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
        
        // Show size info while resizing
        if (isResizing) {
          ctx.save();
          ctx.fillStyle = darkMode ? '#1f2937' : '#ffffff';
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          
          const sizeText = `${Math.round(width)} × ${Math.round(height)}`;
          ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const textMetrics = ctx.measureText(sizeText);
          const textWidth = textMetrics.width;
          const textHeight = 16;
          
          // Position the size indicator above the element
          const textX = x + width / 2 - textWidth / 2;
          const textY = y - 20;
          
          // Draw background
          ctx.fillRect(textX - 4, textY - textHeight + 2, textWidth + 8, textHeight + 4);
          ctx.strokeRect(textX - 4, textY - textHeight + 2, textWidth + 8, textHeight + 4);
          
          // Draw text
          ctx.fillStyle = darkMode ? '#ffffff' : '#1f2937';
          ctx.fillText(sizeText, textX, textY);
          ctx.restore();
        }

        // Only show resize handles for resizable elements (not draw elements)
        if (type !== 'draw') {
          // Draw 8 resize handles with improved visibility
          const handleSize = 10; // Larger handles for better UX
          const handles = [
            { x: x - handleSize / 2, y: y - handleSize / 2, type: 'nw' }, // top-left
            { x: x + width / 2 - handleSize / 2, y: y - handleSize / 2, type: 'n' }, // top
            { x: x + width - handleSize / 2, y: y - handleSize / 2, type: 'ne' }, // top-right
            { x: x + width - handleSize / 2, y: y + height / 2 - handleSize / 2, type: 'e' }, // right
            { x: x + width - handleSize / 2, y: y + height - handleSize / 2, type: 'se' }, // bottom-right
            { x: x + width / 2 - handleSize / 2, y: y + height - handleSize / 2, type: 's' }, // bottom
            { x: x - handleSize / 2, y: y + height - handleSize / 2, type: 'sw' }, // bottom-left
            { x: x - handleSize / 2, y: y + height / 2 - handleSize / 2, type: 'w' }, // left
          ];

          // Draw handle backgrounds
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);

          handles.forEach((handle) => {
            // Draw handle with rounded corners (fallback for older browsers)
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(handle.x, handle.y, handleSize, handleSize, 2);
            } else {
              ctx.rect(handle.x, handle.y, handleSize, handleSize);
            }
            ctx.fill();
            ctx.stroke();
          });

          // Add hover effect for current resize handle
          if (resizeHandle) {
            const currentHandle = handles.find(h => h.type === resizeHandle);
            if (currentHandle) {
              ctx.fillStyle = '#3b82f6';
              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(currentHandle.x, currentHandle.y, handleSize, handleSize, 2);
              } else {
                ctx.rect(currentHandle.x, currentHandle.y, handleSize, handleSize);
              }
              ctx.fill();
            }
          }
        }

        ctx.restore();
      }
    }
  };

  const [currentCursor, setCurrentCursor] = useState('cursor-crosshair');

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Update cursor based on hover position
    if (currentTool === 'select' && selectedElementId && !isResizing) {
      const canvas = ref as React.RefObject<HTMLCanvasElement>;
      if (canvas.current) {
        const rect = canvas.current.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        // Apply coordinate transformation
        const x = (screenX / zoom) - panOffset.x;
        const y = (screenY / zoom) - panOffset.y;

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
          currentTool === 'draw' ? 'cursor-default' : 'cursor-crosshair';
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
        onWheel={onWheel}
        style={{
          backgroundColor: darkMode ? '#1f2937' : '#ffffff',
          imageRendering: 'auto',
          WebkitFontSmoothing: 'antialiased',
          width: '100%',
          height: '100%',
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
            left: (editingElement.x + panOffset.x) * zoom,
            top: (editingElement.y + panOffset.y) * zoom,
            fontSize: `${Math.max(14, editingElement.strokeWidth * 6) * zoom}px`,
            color: editingElement.strokeColor,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            minWidth: `${100 * zoom}px`,
            minHeight: `${20 * zoom}px`,
            padding: '2px',
            transform: `scale(${1/zoom})`,
            transformOrigin: 'top left',
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