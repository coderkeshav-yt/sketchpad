import { DrawingElement } from '../types';

const STORAGE_KEY = 'excalidraw_data';

export const saveToLocalStorage = (elements: DrawingElement[]): void => {
  try {
    const data = JSON.stringify(elements);
    localStorage.setItem(STORAGE_KEY, data);
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

export const loadFromLocalStorage = (): DrawingElement[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
  }
  return [];
};

export const exportToJSON = (elements: DrawingElement[]): void => {
  const data = JSON.stringify(elements, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'drawing.excalidraw';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};