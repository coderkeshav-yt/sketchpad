import React, { useEffect, forwardRef, useRef } from 'react';
import rough from 'roughjs';
import { DrawingElement } from '../types';

interface CanvasProps {
  elements: DrawingElement[];
  selectedElementId: string | null;
  currentTool: string;
  isEditingText: boolean;
  editingElementId: string | null;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: () => void;
  onDoubleClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onTextChange: (text: string) => void;
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
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onDoubleClick,
  onTextChange,
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

    // Skip drawing if element has no dimensions (except for text)
    if (type !== 'text' && (width === 0 || height === 0)) return;

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
      }
    } catch (error) {
      console.warn('Error drawing element:', error);
    }

    // Draw selection bounds with smooth animation
    if (isSelected) {
      const canvas = roughCanvas.canvas;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();

        // Animated selection border
        const time = Date.now() * 0.005;
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.lineDashOffset = time * 20;
        ctx.strokeRect(x - 4, y - 4, width + 8, height + 8);

        // Draw resize handles with smooth appearance
        const handleSize = 8;
        const handles = [
          [x - handleSize / 2, y - handleSize / 2], // top-left
          [x + width - handleSize / 2, y - handleSize / 2], // top-right
          [x - handleSize / 2, y + height - handleSize / 2], // bottom-left
          [x + width - handleSize / 2, y + height - handleSize / 2], // bottom-right
        ];

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);

        handles.forEach(([hx, hy]) => {
          ctx.fillRect(hx, hy, handleSize, handleSize);
          ctx.strokeRect(hx, hy, handleSize, handleSize);
        });

        ctx.restore();
      }
    }
  };

  const getCursorStyle = () => {
    switch (currentTool) {
      case 'eraser':
        return 'cursor-pointer';
      case 'text':
        return 'cursor-text';
      def