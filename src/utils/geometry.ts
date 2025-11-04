import { DrawingElement, Point } from '../types';

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
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
  const handleSize = 8;
  const tolerance = handleSize / 2;

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
  let newX = x;
  let newY = y;
  let newWidth = width;
  let newHeight = height;

  switch (handle) {
    case 'nw':
      newX = x + deltaX;
      newY = y + deltaY;
      newWidth = width - deltaX;
      newHeight = height - deltaY;
      break;
    case 'ne':
      newY = y + deltaY;
      newWidth = width + deltaX;
      newHeight = height - deltaY;
      break;
    case 'sw':
      newX = x + deltaX;
      newWidth = width - deltaX;
      newHeight = height + deltaY;
      break;
    case 'se':
      newWidth = width + deltaX;
      newHeight = height + deltaY;
      break;
    case 'n':
      newY = y + deltaY;
      newHeight = height - deltaY;
      break;
    case 's':
      newHeight = height + deltaY;
      break;
    case 'w':
      newX = x + deltaX;
      newWidth = width - deltaX;
      break;
    case 'e':
      newWidth = width + deltaX;
      break;
  }

  // Ensure minimum size
  const minSize = 10;
  if (newWidth < minSize) {
    if (handle.includes('w')) {
      newX = x + width - minSize;
    }
    newWidth = minSize;
  }
  if (newHeight < minSize) {
    if (handle.includes('n')) {
      newY = y + height - minSize;
    }
    newHeight = minSize;
  }

  return { x: newX, y: newY, width: newWidth, height: newHeight };
};