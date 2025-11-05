import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, DrawingElement, Tool, Point } from './types';
import { saveToLocalStorage, loadFromLocalStorage, exportToJSON } from './utils/storage';
import { generateId, isPointInElement, normalizeRect, getResizeHandle, resizeElement, getPathBounds, isPointInPath } from './utils/geometry';
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';

const initialState: AppState = {
  elements: [],
  selectedElementId: null,
  selectedElementIds: [],
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
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  history: [[]],
  historyIndex: 0,
  gridEnabled: true,
  snapToGrid: false,
  darkMode: false,
  multiSelectMode: false,
  clipboard: [],
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
    setState(prev => {
      const newElements = updater(prev.elements);
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push([...newElements]);
      
      return {
        ...prev,
        elements: newElements,
        history: newHistory.slice(-50), // Keep last 50 states
        historyIndex: Math.min(newHistory.length - 1, 49)
      };
    });
  }, []);



  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'v': handleToolChange('select'); break;
          case 'r': handleToolChange('rectangle'); break;
          case 'c': handleToolChange('circle'); break;
          case 'd': handleToolChange('diamond'); break;
          case 't': handleToolChange('triangle'); break;
          case 's': handleToolChange('star'); break;
          case 'h': handleToolChange('hexagon'); break;
          case 'a': handleToolChange('arrow'); break;
          case 'l': handleToolChange('line'); break;
          case 'p': handleToolChange('draw'); break;
          case 'e': handleToolChange('eraser'); break;
          case 'g': 
            if (e.shiftKey) {
              handleToggleSnap();
            } else {
              handleToggleGrid();
            }
            break;
          case 'delete':
          case 'backspace':
            handleDelete();
            break;
          case '0': handleZoomReset(); break;
          case '+':
          case '=': handleZoomIn(); break;
          case '-': handleZoomOut(); break;
          case 'arrowup': 
            setState(prev => ({ ...prev, panOffset: { x: prev.panOffset.x, y: prev.panOffset.y + 20 } }));
            break;
          case 'arrowdown':
            setState(prev => ({ ...prev, panOffset: { x: prev.panOffset.x, y: prev.panOffset.y - 20 } }));
            break;
          case 'arrowleft':
            setState(prev => ({ ...prev, panOffset: { x: prev.panOffset.x + 20, y: prev.panOffset.y } }));
            break;
          case 'arrowright':
            setState(prev => ({ ...prev, panOffset: { x: prev.panOffset.x - 20, y: prev.panOffset.y } }));
            break;
        }
      }

      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
          case 'c':
            e.preventDefault();
            handleCopy();
            break;
          case 'v':
            e.preventDefault();
            handlePaste();
            break;
          case 'd':
            e.preventDefault();
            handleDuplicate();
            break;
          case 'a':
            e.preventDefault();
            handleSelectAll();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedElementId, state.elements]);

  // New handler functions
  const handleUndo = () => {
    if (state.historyIndex > 0) {
      setState(prev => ({
        ...prev,
        elements: prev.history[prev.historyIndex - 1],
        historyIndex: prev.historyIndex - 1,
        selectedElementId: null,
      }));
    }
  };

  const handleRedo = () => {
    if (state.historyIndex < state.history.length - 1) {
      setState(prev => ({
        ...prev,
        elements: prev.history[prev.historyIndex + 1],
        historyIndex: prev.historyIndex + 1,
        selectedElementId: null,
      }));
    }
  };

  const handleZoomIn = () => {
    setState(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 5) }));
  };

  const handleZoomOut = () => {
    setState(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.1) }));
  };

  const handleZoomReset = () => {
    setState(prev => ({ ...prev, zoom: 1, panOffset: { x: 0, y: 0 } }));
  };

  const handleToggleGrid = () => {
    setState(prev => ({ ...prev, gridEnabled: !prev.gridEnabled }));
  };

  const handleToggleSnap = () => {
    setState(prev => ({ ...prev, snapToGrid: !prev.snapToGrid }));
  };

  const handleToggleDarkMode = () => {
    setState(prev => ({ ...prev, darkMode: !prev.darkMode }));
  };

  const handleCopy = () => {
    if (state.selectedElementId) {
      const selectedElement = state.elements.find(el => el.id === state.selectedElementId);
      if (selectedElement) {
        setState(prev => ({ ...prev, clipboard: [selectedElement] }));
      }
    }
  };

  const handlePaste = async () => {
    try {
      // First try to paste from system clipboard
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        
        for (const clipboardItem of clipboardItems) {
          // Handle images
          for (const type of clipboardItem.types) {
            if (type.startsWith('image/')) {
              const blob = await clipboardItem.getType(type);
              const reader = new FileReader();
              
              reader.onload = (e) => {
                const imageData = e.target?.result as string;
                const img = new Image();
                
                img.onload = () => {
                  // Calculate appropriate size (max 400px width/height)
                  const maxSize = 400;
                  let newWidth = img.width;
                  let newHeight = img.height;
                  
                  if (newWidth > maxSize || newHeight > maxSize) {
                    const ratio = Math.min(maxSize / newWidth, maxSize / newHeight);
                    newWidth = newWidth * ratio;
                    newHeight = newHeight * ratio;
                  }
                  
                  const newElement: DrawingElement = {
                    id: generateId(),
                    type: 'image',
                    x: 100, // Default position
                    y: 100,
                    width: newWidth,
                    height: newHeight,
                    strokeColor: '#000000',
                    fillColor: 'transparent',
                    strokeWidth: 1,
                    imageData,
                    originalWidth: img.width,
                    originalHeight: img.height,
                    seed: Math.floor(Math.random() * 1000000),
                  };
                  
                  updateElements(elements => [...elements, newElement]);
                  setState(prev => ({ ...prev, selectedElementId: newElement.id }));
                };
                
                img.src = imageData;
              };
              
              reader.readAsDataURL(blob);
              return; // Exit after handling first image
            }
          }
          
          // Handle text
          if (clipboardItem.types.includes('text/plain')) {
            const textBlob = await clipboardItem.getType('text/plain');
            const text = await textBlob.text();
            
            if (text.trim()) {
              const newElement: DrawingElement = {
                id: generateId(),
                type: 'text',
                x: 100,
                y: 100,
                width: Math.max(200, text.length * 8),
                height: 30,
                strokeColor: state.strokeColor,
                fillColor: 'transparent',
                strokeWidth: state.strokeWidth,
                text: text.trim(),
                fontSize: 16,
                fontFamily: 'Arial, sans-serif',
                textAlign: 'left',
                seed: Math.floor(Math.random() * 1000000),
              };
              
              updateElements(elements => [...elements, newElement]);
              setState(prev => ({ ...prev, selectedElementId: newElement.id }));
              return;
            }
          }
        }
      }
      
      // Fallback to text-only clipboard API
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text.trim()) {
          const newElement: DrawingElement = {
            id: generateId(),
            type: 'text',
            x: 100,
            y: 100,
            width: Math.max(200, text.length * 8),
            height: 30,
            strokeColor: state.strokeColor,
            fillColor: 'transparent',
            strokeWidth: state.strokeWidth,
            text: text.trim(),
            fontSize: 16,
            fontFamily: 'Arial, sans-serif',
            textAlign: 'left',
            seed: Math.floor(Math.random() * 1000000),
          };
          
          updateElements(elements => [...elements, newElement]);
          setState(prev => ({ ...prev, selectedElementId: newElement.id }));
          return;
        }
      }
    } catch (error) {
      console.log('Clipboard access denied or not supported, using internal clipboard');
    }
    
    // Fallback to internal clipboard
    if (state.clipboard.length > 0) {
      const newElements = state.clipboard.map(el => ({
        ...el,
        id: generateId(),
        x: el.x + 20,
        y: el.y + 20,
      }));
      
      updateElements(elements => [...elements, ...newElements]);
      setState(prev => ({ ...prev, selectedElementId: newElements[0].id }));
    }
  };

  const handleDelete = () => {
    if (state.selectedElementId) {
      updateElements(elements => elements.filter(el => el.id !== state.selectedElementId));
      setState(prev => ({ ...prev, selectedElementId: null }));
    }
  };

  const handleDuplicate = () => {
    if (state.selectedElementId) {
      const selectedElement = state.elements.find(el => el.id === state.selectedElementId);
      if (selectedElement) {
        const newElement = {
          ...selectedElement,
          id: generateId(),
          x: selectedElement.x + 20,
          y: selectedElement.y + 20,
        };
        
        updateElements(elements => [...elements, newElement]);
        setState(prev => ({ ...prev, selectedElementId: newElement.id }));
      }
    }
  };

  const handleSelectAll = () => {
    if (state.elements.length > 0) {
      setState(prev => ({ 
        ...prev, 
        selectedElementIds: prev.elements.map(el => el.id),
        multiSelectMode: true 
      }));
    }
  };

  // Handle wheel events for zooming and panning (throttled for performance)
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom with Ctrl/Cmd + wheel
      const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05; // Smaller increments for smoother zoom
      const newZoom = Math.max(0.1, Math.min(3, state.zoom * zoomFactor));
      
      setState(prev => ({ ...prev, zoom: newZoom }));
    } else if (e.shiftKey) {
      // Horizontal pan with Shift + wheel
      setState(prev => ({
        ...prev,
        panOffset: {
          x: prev.panOffset.x - e.deltaY * 0.3,
          y: prev.panOffset.y
        }
      }));
    } else {
      // Vertical pan with wheel
      setState(prev => ({
        ...prev,
        panOffset: {
          x: prev.panOffset.x - e.deltaX * 0.3,
          y: prev.panOffset.y - e.deltaY * 0.3
        }
      }));
    }
  }, [state.zoom]);

  // Handle middle mouse button panning
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

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
    // Simplified coordinate transformation
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    // Apply zoom and pan transformation
    const x = (screenX / state.zoom) - state.panOffset.x;
    const y = (screenY / state.zoom) - state.panOffset.y;

    // Handle middle mouse button for panning
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: screenX, y: screenY });
      return;
    }

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
        .find(el => {
          if (el.type === 'draw' && el.points) {
            return isPointInPath({ x, y }, el.points, el.strokeWidth);
          }
          return isPointInElement({ x, y }, el);
        });

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
    } else if (state.currentTool === 'draw') {
      // Start free-hand drawing
      const newElement: DrawingElement = {
        id: generateId(),
        type: 'draw',
        x,
        y,
        width: 0,
        height: 0,
        strokeColor: state.strokeColor,
        fillColor: 'transparent',
        strokeWidth: state.strokeWidth,
        seed: Math.floor(Math.random() * 1000000),
        points: [{ x, y }],
      };

      updateElements(elements => [...elements, newElement]);
      setState(prev => ({
        ...prev,
        isDrawing: true,
        dragStart: { x, y },
        selectedElementId: newElement.id,
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
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    // Handle panning first
    if (isPanning && panStart) {
      const deltaX = (screenX - panStart.x) / state.zoom;
      const deltaY = (screenY - panStart.y) / state.zoom;
      
      setState(prev => ({
        ...prev,
        panOffset: {
          x: prev.panOffset.x + deltaX,
          y: prev.panOffset.y + deltaY
        }
      }));
      
      setPanStart({ x: screenX, y: screenY });
      return;
    }

    // Apply coordinate transformation for drawing operations
    const x = (screenX / state.zoom) - state.panOffset.x;
    const y = (screenY / state.zoom) - state.panOffset.y;

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
      const selectedElement = state.elements.find(el => el.id === state.selectedElementId);
      
      if (selectedElement?.type === 'draw') {
        // Add point to free-hand drawing
        updateElements(elements =>
          elements.map(el =>
            el.id === state.selectedElementId
              ? {
                  ...el,
                  points: [...(el.points || []), { x, y }],
                  ...getPathBounds([...(el.points || []), { x, y }])
                }
              : el
          )
        );
      } else {
        // Update other drawing elements
        const normalized = normalizeRect(state.dragStart.x, state.dragStart.y, x, y);
        
        updateElements(elements =>
          elements.map(el =>
            el.id === state.selectedElementId
              ? { ...el, ...normalized }
              : el
          )
        );
      }
    } else if (state.selectedElementId && state.currentTool === 'select') {
      const dx = x - state.dragStart.x;
      const dy = y - state.dragStart.y;

      if (state.isResizing && state.resizeHandle) {
        // Resize selected element with improved control
        const selectedElement = state.elements.find(el => el.id === state.selectedElementId);
        if (selectedElement) {
          // Apply grid snapping if enabled
          let adjustedDx = dx;
          let adjustedDy = dy;
          
          if (state.snapToGrid) {
            const gridSize = 20;
            adjustedDx = Math.round(dx / gridSize) * gridSize;
            adjustedDy = Math.round(dy / gridSize) * gridSize;
          }
          
          updateElements(elements =>
            elements.map(el =>
              el.id === state.selectedElementId
                ? { ...el, ...resizeElement(el, state.resizeHandle!, adjustedDx, adjustedDy) }
                : el
            )
          );
        }
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
    
    // Stop panning
    setIsPanning(false);
    setPanStart(null);
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

  // Drag and drop visual feedback
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);
      
      const files = Array.from(e.dataTransfer?.files || []);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      
      imageFiles.forEach((file, index) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          const imageData = event.target?.result as string;
          const img = new Image();
          
          img.onload = () => {
            // Calculate appropriate size
            const maxSize = 400;
            let newWidth = img.width;
            let newHeight = img.height;
            
            if (newWidth > maxSize || newHeight > maxSize) {
              const ratio = Math.min(maxSize / newWidth, maxSize / newHeight);
              newWidth = newWidth * ratio;
              newHeight = newHeight * ratio;
            }
            
            const rect = canvasRef.current?.getBoundingClientRect();
            const x = rect ? e.clientX - rect.left : 100;
            const y = rect ? e.clientY - rect.top : 100;
            
            const newElement: DrawingElement = {
              id: generateId(),
              type: 'image',
              x: x + (index * 20), // Offset multiple images
              y: y + (index * 20),
              width: newWidth,
              height: newHeight,
              strokeColor: '#000000',
              fillColor: 'transparent',
              strokeWidth: 1,
              imageData,
              originalWidth: img.width,
              originalHeight: img.height,
              seed: Math.floor(Math.random() * 1000000),
            };
            
            updateElements(elements => [...elements, newElement]);
            setState(prev => ({ ...prev, selectedElementId: newElement.id }));
          };
          
          img.src = imageData;
        };
        
        reader.readAsDataURL(file);
      });
    };

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, [updateElements]);

  return (
    <div className={`h-screen w-screen overflow-hidden relative ${
      state.darkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <Toolbar
        currentTool={state.currentTool}
        strokeColor={state.strokeColor}
        fillColor={state.fillColor}
        strokeWidth={state.strokeWidth}
        zoom={state.zoom}
        gridEnabled={state.gridEnabled}
        snapToGrid={state.snapToGrid}
        darkMode={state.darkMode}
        onToolChange={handleToolChange}
        onPropertyChange={handlePropertyChange}
        onExportPNG={handleExportPNG}
        onExportJSON={() => exportToJSON(state.elements)}
        onImportJSON={handleImportJSON}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onToggleGrid={handleToggleGrid}
        onToggleSnap={handleToggleSnap}
        onToggleDarkMode={handleToggleDarkMode}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onSelectAll={handleSelectAll}
        canUndo={state.historyIndex > 0}
        canRedo={state.historyIndex < state.history.length - 1}
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
          gridEnabled={state.gridEnabled}
          darkMode={state.darkMode}
          zoom={state.zoom}
          panOffset={state.panOffset}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          onTextChange={handleTextChange}
          onMouseHover={handleMouseHover}
          onWheel={handleWheel}
        />
      </div>

      {/* Drag and Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 pointer-events-none">
          <div className={`p-8 rounded-lg border-2 border-dashed border-blue-400 ${
            state.darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
          }`}>
            <div className="text-center">
              <div className="text-4xl mb-4">📷</div>
              <div className="text-xl font-semibold mb-2">Drop Images Here</div>
              <div className="text-sm opacity-75">
                Supports JPG, PNG, GIF, WebP and more
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;