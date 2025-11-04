import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, DrawingElement, Tool, Point } from './types';
import { saveToLocalStorage, loadFromLocalStorage, exportToJSON } from './utils/storage';
import { generateId, isPointInElement, normalizeRect, getResizeHandle, resizeElement } from './utils/geometry';
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
  isResizing: false,
  resizeHandle: null,
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

      if (clickedElement) {
        // Check if clicking on a resize handle
        const handle = getResizeHandle({ x, y }, clickedElement);
        
        setState(prev => ({
          ...prev,
          selectedElementId: clickedElement.id,
          dragStart: { x, y },
          isResizing: !!handle,
          resizeHandle: handle,
        }));
      } else {
        setState(prev => ({
          ...prev,
          selectedElementId: null,
          dragStart: null,
          isResizing: false,
          resizeHandle: null,
        }));
      }
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
      const dx = x - state.dragStart.x;
      const dy = y - state.dragStart.y;

      if (state.isResizing && state.resizeHandle) {
        // Resize selected element
        updateElements(elements =>
          elements.map(el =>
            el.id === state.selectedElementId
              ? { ...el, ...resizeElement(el, state.resizeHandle!, dx, dy) }
              : el
          )
        );
      } else {
        // Move selected element
        updateElements(elements =>
          elements.map(el =>
            el.id === state.selectedElementId
              ? { ...el, x: el.x + dx, y: el.y + dy }
              : el
          )
        );

        setState(prev => ({ ...prev, dragStart: { x, y } }));
      }
    }
  };

  const handleMouseUp = () => {
    setState(prev => ({
      ...prev,
      isDrawing: false,
      dragStart: null,
      isResizing: false,
      resizeHandle: null,
    }));
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        setState(prev => ({ ...prev, elements: data }));
      } catch (error) {
        console.error('Failed to import JSON:', error);
      }
    };
    reader.readAsText(file);
  };

  const handleTextChange = (text: string) => {
    if (state.editingElementId) {
      updateElements(elements =>
        elements.map(el =>
          el.id === state.editingElementId
            ? { ...el, text }
            : el
        )
      );
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find text element at click position
    const clickedElement = state.elements
      .slice()
      .reverse()
      .find(el => el.type === 'text' && isPointInElement({ x, y }, el));

    if (clickedElement) {
      setState(prev => ({
        ...prev,
        isEditingText: true,
        editingElementId: clickedElement.id,
        selectedElementId: clickedElement.id,
      }));
    }
  };

  const handleMouseHover = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (state.currentTool !== 'select' || state.isDrawing || state.isResizing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find selected element and check for resize handles
    const selectedElement = state.elements.find(el => el.id === state.selectedElementId);
    if (selectedElement) {
      const handle = getResizeHandle({ x, y }, selectedElement);
      // The cursor will be handled in the Canvas component
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50">
      <Toolbar
        currentTool={state.currentTool}
        strokeColor={state.strokeColor}
        fillColor={state.fillColor}
        strokeWidth={state.strokeWidth}
        onToolChange={handleToolChange}
        onPropertyChange={handlePropertyChange}
        onExportPNG={handleExportPNG}
        onExportJSON={() => exportToJSON(state.elements)}
        onImportJSON={handleImportJSON}
      />
      
      <div className="h-full pt-16">
        <Canvas
          ref={canvasRef}
          elements={state.elements}
          selectedElementId={state.selectedElementId}
          currentTool={state.currentTool}
          isEditingText={state.isEditingText}
          editingElementId={state.editingElementId}
          isResizing={state.isResizing}
          resizeHandle={state.resizeHandle}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          onTextChange={handleTextChange}
          onMouseHover={handleMouseHover}
        />
      </div>
    </div>
  );
}

export default App;