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