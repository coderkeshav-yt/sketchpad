export type Tool = 'select' | 'rectangle' | 'circle' | 'arrow' | 'line' | 'text' | 'eraser' | 'draw';

export interface Point {
  x: number;
  y: number;
}

export interface DrawingElement {
  id: string;
  type: 'rectangle' | 'circle' | 'arrow' | 'line' | 'text' | 'draw';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  text?: string;
  points?: Point[];
  seed?: number; // Add seed for consistent rough.js rendering
}

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;

export interface AppState {
  elements: DrawingElement[];
  selectedElementId: string | null;
  currentTool: Tool;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  isDrawing: boolean;
  dragStart: Point | null;
  isEditingText: boolean;
  editingElementId: string | null;
  isResizing: boolean;
  resizeHandle: ResizeHandle;
}