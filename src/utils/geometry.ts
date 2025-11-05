import { DrawingElement, Point } from '../types';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const isPointInElement = (point: Point, element: DrawingElement): boolean => {
  const { x, y, width, height } = element;
  return (
    point.x >= x &&
    point.x <= x + width &&
    point.y >= y &&
    point.y <= y + height
  );
};

export const getElementBounds = (element: DrawingElement) => {
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
};

export const normalizeRect = (startX: number, startY: number, endX: number, endY: number) => {
  return {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };
};

export const getResizeHandle = (point: Point, element: DrawingElement): string | null => {
  const { x, y, width, height } = element;
  const handleSize = 10; // Slightly larger handles for easier grabbing
  const tolerance = handleSize; // Increased tolerance for better UX

  // Check corners first
  if (Math.abs(point.x - x) <= tolerance && Math.abs(point.y - y) <= tolerance) {
    return 'nw'; // top-left
  }
  if (Math.abs(point.x - (x + width)) <= tolerance && Math.abs(point.y - y) <= tolerance) {
    return 'ne'; // top-right
  }
  if (Math.abs(point.x - x) <= tolerance && Math.abs(point.y - (y + height)) <= tolerance) {
    return 'sw'; // bottom-left
  }
  if (Math.abs(point.x - (x + width)) <= tolerance && Math.abs(point.y - (y + height)) <= tolerance) {
    return 'se'; // bottom-right
  }

  // Check edges
  if (Math.abs(point.x - (x + width / 2)) <= tolerance && Math.abs(point.y - y) <= tolerance) {
    return 'n'; // top
  }
  if (Math.abs(point.x - (x + width / 2)) <= tolerance && Math.abs(point.y - (y + height)) <= tolerance) {
    return 's'; // bottom
  }
  if (Math.abs(point.x - x) <= tolerance && Math.abs(point.y - (y + height / 2)) <= tolerance) {
    return 'w'; // left
  }
  if (Math.abs(point.x - (x + width)) <= tolerance && Math.abs(point.y - (y + height / 2)) <= tolerance) {
    return 'e'; // right
  }

  return null;
};

export const getCursorForResizeHandle = (handle: string | null): string => {
  switch (handle) {
    case 'nw':
    case 'se':
      return 'cursor-nw-resize';
    case 'ne':
    case 'sw':
      return 'cursor-ne-resize';
    case 'n':
    case 's':
      return 'cursor-ns-resize';
    case 'e':
    case 'w':
      return 'cursor-ew-resize';
    default:
      return 'cursor-move';
  }
};

export const resizeElement = (
  element: DrawingElement,
  handle: string,
  deltaX: number,
  deltaY: number
): Partial<DrawingElement> => {
  const { x, y, width, height } = element;
  
  // Apply much lower sensitivity factor to make resizing much less aggressive
  const sensitivity = 0.3; // Reduce sensitivity by 70% - much more controlled
  const adjustedDeltaX = deltaX * sensitivity;
  const adjustedDeltaY = deltaY * sensitivity;
  
  // Add minimum movement threshold to prevent tiny changes
  const threshold = 5; // Increased threshold to prevent micro-movements
  if (Math.abs(adjustedDeltaX) < threshold && Math.abs(adjustedDeltaY) < threshold) {
    return { x, y, width, height }; // No change if movement is too small
  }
  
  let newX = x;
  let newY = y;
  let newWidth = width;
  let newHeight = height;

  switch (handle) {
    case 'nw':
      newX = x + adjustedDeltaX;
      newY = y + adjustedDeltaY;
      newWidth = width - adjustedDeltaX;
      newHeight = height - adjustedDeltaY;
      break;
    case 'ne':
      newY = y + adjustedDeltaY;
      newWidth = width + adjustedDeltaX;
      newHeight = height - adjustedDeltaY;
      break;
    case 'sw':
      newX = x + adjustedDeltaX;
      newWidth = width - adjustedDeltaX;
      newHeight = height + adjustedDeltaY;
      break;
    case 'se':
      newWidth = width + adjustedDeltaX;
      newHeight = height + adjustedDeltaY;
      break;
    case 'n':
      newY = y + adjustedDeltaY;
      newHeight = height - adjustedDeltaY;
      break;
    case 's':
      newHeight = height + adjustedDeltaY;
      break;
    case 'w':
      newX = x + adjustedDeltaX;
      newWidth = width - adjustedDeltaX;
      break;
    case 'e':
      newWidth = width + adjustedDeltaX;
      break;
  }

  // Ensure minimum and maximum sizes for better UX
  const minSize = 15; // Slightly larger minimum for better usability
  const maxSize = 2000; // Prevent elements from becoming too large
  
  // Apply size constraints
  if (newWidth < minSize) {
    if (handle.includes('w')) {
      newX = x + width - minSize;
    }
    newWidth = minSize;
  } else if (newWidth > maxSize) {
    if (handle.includes('w')) {
      newX = x + width - maxSize;
    }
    newWidth = maxSize;
  }
  
  if (newHeight < minSize) {
    if (handle.includes('n')) {
      newY = y + height - minSize;
    }
    newHeight = minSize;
  } else if (newHeight > maxSize) {
    if (handle.includes('n')) {
      newY = y + height - maxSize;
    }
    newHeight = maxSize;
  }

  // Round values to prevent sub-pixel positioning
  return { 
    x: Math.round(newX), 
    y: Math.round(newY), 
    width: Math.round(newWidth), 
    height: Math.round(newHeight) 
  };
};

export const smoothPath = (points: Point[]): Point[] => {
  if (points.length < 3) return points;
  
  const smoothed: Point[] = [points[0]];
  
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    
    // Simple smoothing using average
    smoothed.push({
      x: (prev.x + curr.x + next.x) / 3,
      y: (prev.y + curr.y + next.y) / 3,
    });
  }
  
  smoothed.push(points[points.length - 1]);
  return smoothed;
};

export const getPathBounds = (points: Point[]) => {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  
  points.forEach(point => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

export const isPointInPath = (point: Point, pathPoints: Point[], strokeWidth: number = 2): boolean => {
  const tolerance = Math.max(strokeWidth / 2, 5);
  
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const p1 = pathPoints[i];
    const p2 = pathPoints[i + 1];
    
    const distance = distanceToLineSegment(point, p1, p2);
    if (distance <= tolerance) {
      return true;
    }
  }
  
  return false;
};

const distanceToLineSegment = (point: Point, lineStart: Point, lineEnd: Point): number => {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    return Math.sqrt(A * A + B * B);
  }
  
  let param = dot / lenSq;
  
  if (param < 0) {
    return Math.sqrt(A * A + B * B);
  } else if (param > 1) {
    const dx = point.x - lineEnd.x;
    const dy = point.y - lineEnd.y;
    return Math.sqrt(dx * dx + dy * dy);
  } else {
    const projX = lineStart.x + param * C;
    const projY = lineStart.y + param * D;
    const dx = point.x - projX;
    const dy = point.y - projY;
    return Math.sqrt(dx * dx + dy * dy);
  }
};