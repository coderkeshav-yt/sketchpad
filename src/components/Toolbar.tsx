import React from 'react';
import { Tool } from '../types';

interface ToolbarProps {
  currentTool: Tool;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  zoom: number;
  gridEnabled: boolean;
  snapToGrid: boolean;
  darkMode: boolean;
  onToolChange: (tool: Tool) => void;
  onPropertyChange: (property: string, value: string | number) => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onToggleDarkMode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSelectAll: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  strokeColor,
  fillColor,
  strokeWidth,
  zoom,
  gridEnabled,
  snapToGrid,
  darkMode,
  onToolChange,
  onPropertyChange,
  onExportPNG,
  onExportJSON,
  onImportJSON,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onToggleGrid,
  onToggleSnap,
  onToggleDarkMode,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onDelete,
  onDuplicate,
  onSelectAll,
  canUndo,
  canRedo,
}) => {
  const tools: { id: Tool; label: string; icon: string }[] = [
    { id: 'select', label: 'Select (V)', icon: '↖' },
    { id: 'rectangle', label: 'Rectangle (R)', icon: '▭' },
    { id: 'circle', label: 'Circle (C)', icon: '○' },
    { id: 'diamond', label: 'Diamond (D)', icon: '◇' },
    { id: 'triangle', label: 'Triangle (T)', icon: '△' },
    { id: 'star', label: 'Star (S)', icon: '★' },
    { id: 'hexagon', label: 'Hexagon (H)', icon: '⬡' },
    { id: 'arrow', label: 'Arrow (A)', icon: '→' },
    { id: 'line', label: 'Line (L)', icon: '/' },
    { id: 'draw', label: 'Draw (P)', icon: '✏️' },
    { id: 'text', label: 'Text (T)', icon: 'T' },
    { id: 'eraser', label: 'Eraser (E)', icon: '🧽' },
  ];

  return (
    <div className={`fixed top-0 left-0 right-0 z-10 border-b shadow-sm ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left Section - Tools and Actions */}
        <div className="flex items-center space-x-4">
          {/* Undo/Redo */}
          <div className="flex items-center space-x-1">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`px-2 py-1 rounded text-sm transition-colors ${
                canUndo
                  ? darkMode
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`px-2 py-1 rounded text-sm transition-colors ${
                canRedo
                  ? darkMode
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y)"
            >
              ↷
            </button>
          </div>

          {/* Tools */}
          <div className="flex items-center space-x-1">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
                  currentTool === tool.id
                    ? 'bg-blue-500 text-white'
                    : darkMode
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          {/* Edit Actions */}
          <div className="flex items-center space-x-1">
            <button
              onClick={onCopy}
              className={`px-2 py-1 rounded text-sm transition-colors ${
                darkMode
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Copy (Ctrl+C)"
            >
              📋
            </button>
            <button
              onClick={onPaste}
              className={`px-2 py-1 rounded text-sm transition-colors ${
                darkMode
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Paste (Ctrl+V)"
            >
              📄
            </button>
            <button
              onClick={onDuplicate}
              className={`px-2 py-1 rounded text-sm transition-colors ${
                darkMode
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Duplicate (Ctrl+D)"
            >
              📑
            </button>
            <button
              onClick={onDelete}
              className={`px-2 py-1 rounded text-sm transition-colors ${
                darkMode
                  ? 'bg-red-800 text-red-200 hover:bg-red-700'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
              title="Delete (Del)"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Center Section - Properties */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Stroke:</label>
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => onPropertyChange('strokeColor', e.target.value)}
              className="w-6 h-6 rounded border cursor-pointer"
            />
          </div>

          <div className="flex items-center space-x-1">
            <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Fill:</label>
            <input
              type="color"
              value={fillColor === 'transparent' ? '#ffffff' : fillColor}
              onChange={(e) => onPropertyChange('fillColor', e.target.value)}
              className="w-6 h-6 rounded border cursor-pointer"
            />
            <button
              onClick={() => onPropertyChange('fillColor', 'transparent')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                fillColor === 'transparent'
                  ? 'bg-blue-500 text-white'
                  : darkMode
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              None
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Width:</label>
            <select
              value={strokeWidth}
              onChange={(e) => onPropertyChange('strokeWidth', parseInt(e.target.value))}
              className={`px-2 py-1 text-xs border rounded ${
                darkMode
                  ? 'bg-gray-700 text-gray-200 border-gray-600'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              <option value={1}>1px</option>
              <option value={2}>2px</option>
              <option value={3}>3px</option>
              <option value={4}>4px</option>
              <option value={5}>5px</option>
              <option value={8}>8px</option>
              <option value={12}>12px</option>
            </select>
          </div>
        </div>

        {/* Right Section - View and File Operations */}
        <div className="flex items-center space-x-2">
          {/* View Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={onZoomOut}
              className={`px-2 py-1 rounded text-sm transition-colors ${
                darkMode
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Zoom Out (-)"
            >
              −
            </button>
            <span className={`px-2 py-1 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={onZoomIn}
              className={`px-2 py-1 rounded text-sm transition-colors ${
                darkMode
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Zoom In (+)"
            >
              +
            </button>
            <button
              onClick={onZoomReset}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                darkMode
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Reset Zoom (0)"
            >
              Reset
            </button>
          </div>

          {/* Grid and Snap */}
          <div className="flex items-center space-x-1">
            <button
              onClick={onToggleGrid}
              className={`px-2 py-1 rounded text-sm transition-colors ${
                gridEnabled
                  ? 'bg-blue-500 text-white'
                  : darkMode
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Toggle Grid (G)"
            >
              ⊞
            </button>
            <button
              onClick={onToggleSnap}
              className={`px-2 py-1 rounded text-sm transition-colors ${
                snapToGrid
                  ? 'bg-blue-500 text-white'
                  : darkMode
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Snap to Grid (Shift+G)"
            >
              🧲
            </button>
          </div>

          {/* Dark Mode */}
          <button
            onClick={onToggleDarkMode}
            className={`px-2 py-1 rounded text-sm transition-colors ${
              darkMode
                ? 'bg-yellow-600 text-yellow-100 hover:bg-yellow-500'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
            title="Toggle Dark Mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* File Operations */}
          <div className="flex items-center space-x-1">
            <label className={`px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
              darkMode
                ? 'bg-green-700 text-green-100 hover:bg-green-600'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}>
              Import
              <input
                type="file"
                accept=".json,.excalidraw"
                onChange={onImportJSON}
                className="hidden"
              />
            </label>
            <button
              onClick={onExportJSON}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                darkMode
                  ? 'bg-blue-700 text-blue-100 hover:bg-blue-600'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              Export JSON
            </button>
            <button
              onClick={onExportPNG}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                darkMode
                  ? 'bg-purple-700 text-purple-100 hover:bg-purple-600'
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              Export PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;