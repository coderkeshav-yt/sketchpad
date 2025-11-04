import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, DrawingElement, Tool, Point } from './types';
import { saveToLocalStorage, loadFromLocalStorage, exportToJSON } from './utils/storage';
import { generateId, isPointInElement, normalizeRect } from './utils/geometry';
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';

const initialState: AppState = {
  elements: [],
  selectedElementId: null,
  currentTool: 'select',
  strokeColor: '#000000',
  fillColor: 'transparent',
  strokeWidth: 2,
  isDrawing: false,
  dragStart: null,
  isEditingText: false,
  editingElementId: null,
};

function App() {
  const [state, setState] = useState<AppState>(initialState);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedElements = loadFromLocalStorage();
    if (savedElements.length > 0) {
      setState(prev => ({ ...prev, elements: savedElements }));
    }
  }, []);

  // Save to localStorage whenever elements change
  useEffect(() => {
    if (state.elements.length > 0) {
      saveToLocalStorage(state.elements);
    }
  }, [state.elements]);

  const updateElements = useCallback((updater: (elements: DrawingElement[]) => DrawingElement[]) => {
    setState(prev => ({
      ...prev,
      elements: updater(prev.elements)
    }));
  }, []);

  const handleToolChange = (tool: Tool) => {
    setState(prev => ({ ...prev, currentTool: tool, selectedElementId: null }));
  };

  const handlePropertyChange = (property: string, value: string | number) => {
    setState(prev => ({ ...prev, [property]: value }));
    
    // Update selected element if any
    if (state.selectedElementId) {
      updateElements(elements =>
        elements.map(el =>
          el.id === state.selectedElementId
            ? { ...el, [property]: value }
            : el
        )
      );
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Stop text editing if clicking elsewhere
    if (state.isEditingText) {
      setState(prev => ({
        ...prev,
        isEditingText: false,
        editingElementId: null,
      }));
    }

    if (state.currentTool === 'select') {
      // Find element at click position
      const clickedElement = state.elements
        .slice()
        .reverse()
        .find(el => isPointInElement({ x, y }, el));

      setState(prev => ({
        ...prev,
        selectedElementId: clickedElement?.id || null,
        dragStart: clickedElement ? { x, y } : null,
      }));
    } else if (state.currentTool === 'eraser') {
      // Find and delete element at click position
      const elementToDelete = state.elements
        .slice()
        .reverse()
        .find(el => isPointInElement({ x, y }, el));

      if (elementToDelete) {
        updateElements(elements => elements.filter(el => el.id !== elementToDelete.id));
      }
    } else if (state.currentTool === 'text') {
      // Create text element and start editing
      const newElement: DrawingElement = {
        id: generateId(),
        type: 'text',
        x,
        y,
        width: 100,
        height: 20,
        strokeColor: state.strokeColor,
        fillColor: state.fillColor,
        strokeWidth: state.strokeWidth,
        seed: Math.floor(Math.random() * 1000000),
        text: '',
      };

      updateElements(elements => [...elements, newElement]);
      setState(prev => ({
        ...prev,
        selectedElementId: newElement.id,
        isEditingText: true,
        editingElementId: newElement.id,
      }));
    } else {
      // Start drawing new element
      const newElement: DrawingElement = {
        id: generateId(),
        type: state.currentTool as any,
        x,
        y,
        width: 0,
        height: 0,
        strokeColor: state.strokeColor,
        fillColor: state.fillColor,
        strokeWidth: state.strokeWidth,
        seed: Math.floor(Math.random() * 1000000),
      };

      updateElements(elements => [...elements, newElement]);
      setState(prev => ({
        ...prev,
        isDrawing: true,
        dragStart: { x, y },
        selectedElementId: newElement.id,
      }));
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle eraser tool
    if (state.currentTool === 'eraser' && e.buttons === 1) {
      const elementToDelete = state.elements
        .slice()
        .reverse()
        .find(el => isPointInElement({ x, y }, el));

      if (elementToDelete) {
        updateElements(elements => elements.filter(el => el.id !== elementToDelete.id));
      }
      return;
    }

    if (!state.dragStart) return;

    if (state.isDrawing && state.selectedElementId) {
      // Update drawing element
      const normalized = normalizeRect(state.dragStart.x, state.dragStart.y, x, y);
      
      updateElements(elements =>
        elements.map(el =>
          el.id === state.selectedElementId
            ? { ...el, ...normalized }
            : el
        )
      );
    } else if (state.selectedElementId && state.currentTool === 'select') {
      // Move selected element
      const dx = x - state.dragStart.x;
      const dy = y - state.dragStart.y;

      updateElements(elements =>
        elements.map(el =>
          el.id === state.selectedElementId
            ? { ...el, x: el.x + dx, y: el.y + dy }
            : el
        )
      );

      setState(prev => ({ ...prev, dragStart: { x, y } }));
    }
  };

  const handleMouseUp = () => {
    s