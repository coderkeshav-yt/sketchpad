import React from 'react';
import { Tool } from '../types';

interface ToolbarProps {
  currentTool: Tool;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  onToolChange: (tool: Tool) => void;
  onPropertyChange: (property: string, value: string | number) => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  strokeColor,
  fillColor,
  strokeWidth,
  onToolChange,
  onPropertyChange,
  onExportPNG,
  onExportJSON,
  onImportJSON,
}) => {
  const tools: { id: Tool; label: string; icon: string }[] = [
    { id: 'select', label: 'Select', icon: '↖' },
    { id: 'rectangle', label: 'Rectangle', icon: '▭' },
    { id: 'circle', label: 'Circle', icon: '○' },
    { id: 'arrow', label: 'Arrow', icon: '→' },
    { id: 'line', label: 'Line', icon: '/' },
    { id: 'text', label: 'Text', icon: 'T' },
    { id: 'eraser', label: 'Eraser', icon: '🧽' },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center space-x-2">
          {/* Tools */}
          <div className="flex items-center space-x-1 mr-4">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  currentTool === tool.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          {/* Properties */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <label className="text-xs text-gray-600">Stroke:</label>
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => onPropertyChange('strokeColor', e.target.value)}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
              />
            </div>

            <div className="flex items-center space-x-1">
              <label className="text-xs text-gray-600">Fill:</label>
              <input
                type="color"
                value={fillColor === 'transparent' ? '#ffffff' : fillColor}
                onChange={(e) => onPropertyChange('fillColor', e.target.value)}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
              />
              <button
                onClick={() => onPropertyChange('fillColor', 'transparent')}
                className={`px-2 py-1 text-xs rounded ${
                  fillColor === 'transparent'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                None
              </button>
            </div>

            <div className="flex items-center space-x-1">
              <label className="text-xs text-gray-600">Width:</label>
              <select
                value={strokeWidth}
                onChange={(e) => onPropertyChange('strokeWidth', parseInt(e.target.value))}
                className="px-2 py-1 text-xs border border-gray-300 rounded"
              >
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
            </div>
          </div>
        </div>

        {/* File Operations */}
        <div className="flex items-center space-x-2">
          <label className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm cursor-pointer hover:bg-green-200 transition-colors">
            Import JSON
            <input
              type="file"
              accept=".json,.excalidraw"
              onChange={onImportJSON}
              className="hidden"
            />
          </label>
          <button
            onClick={onExportJSON}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
          >
            Export JSON
          </button>
          <button
            onClick={onExportPNG}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 transition-colors"
          >
            Export PNG
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;