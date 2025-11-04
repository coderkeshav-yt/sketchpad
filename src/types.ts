export type Tool = 'select' | 'rectangle' | 'circle' | 'arrow' | 'line' | 'text' | 'eraser' | 'draw' | 'diamond' | 'ellipse' | 'star' | 'triangle' | 'hexagon';

export interface Point {
  x: number;
  y: number;
}

export interface DrawingElement {
  id: string;
  type: 'rectangle' | 'circle' | 'arrow' | 'line' | 'text' | 'draw' | 'diamond' | 'ellipse' | 'star' | 'triangle' | 'hexagon';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  text?: string;
  points?: Point[];
  seed?: number;
  opacity?: number;
  rotation?: number;
  locked?: boolean;
  layer?: number;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  roughness?: number;
  bowing?: number;
}

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;

export interface AppState {
  elements: DrawingElement[];
  selectedElementId: string | null;
  selectedElementIds: string[];
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
  zoom: number;
  panOffset: Point;
  history: DrawingElement[][];
  historyIndex: number;
  gridEnabled: boolean;
  snapToGrid: boolean;
  darkMode: boolean;
  multiSelectMode: boolean;
  clipboard: DrawingElement[];
}