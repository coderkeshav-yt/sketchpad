# Excalidraw Clone

A fully functional virtual whiteboard application inspired by Excalidraw, built with React, TypeScript, and Tailwind CSS. Features hand-drawn sketchy aesthetics and local storage persistence.

## Features

- **Drawing Tools**: Rectangle, Circle, Arrow, Line, Text, and Select tools
- **Hand-drawn Style**: Rough, sketchy aesthetic using rough.js library
- **Interactive Canvas**: Infinite canvas with grid background
- **Element Manipulation**: Select, move, and resize drawn elements
- **Property Controls**: Stroke color, fill color, and stroke width customization
- **Persistence**: Automatic save/load using browser's Local Storage
- **Export/Import**: Export to PNG/SVG and JSON, import from JSON

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Usage

1. **Select Tool**: Click to select and move elements
2. **Drawing Tools**: Click and drag to create shapes
3. **Properties**: Adjust stroke color, fill color, and stroke width in the toolbar
4. **Export**: Save your drawings as PNG or JSON files
5. **Import**: Load previously saved JSON files
6. **Persistence**: Your drawings are automatically saved to browser storage

## Build for Production

```bash
npm run build
```

## Technologies Used

- React 18
- TypeScript
- Tailwind CSS
- Rough.js (for hand-drawn aesthetics)
- Vite (build tool)

## Project Structure

```
src/
├── components/
│   ├── Canvas.tsx      # Main drawing canvas
│   └── Toolbar.tsx     # Top toolbar with tools and controls
├── utils/
│   ├── storage.ts      # Local storage utilities
│   └── geometry.ts     # Geometric calculations
├── types.ts            # TypeScript type definitions
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
```

## Project Structure

```
.
├── index.html             # Vite index HTML
├── package.json           # npm manifest & scripts
├── postcss.config.js      # PostCSS config for Tailwind
├── tailwind.config.js     # Tailwind config
├── tsconfig.json          # TypeScript config
├── tsconfig.node.json     # TypeScript config for Node tooling
├── vite.config.ts         # Vite config
├── vercel.json            # Vercel deployment config
├── README.md              # Project README
└── src/
	├── App.tsx            # Main application component
	├── main.tsx           # App entry & bootstrapping
	├── index.css          # Global CSS (Tailwind imports)
	├── types.ts           # Shared TypeScript types
	├── components/
	│   ├── Canvas.tsx     # Canvas for drawing and interaction
	│   └── Toolbar.tsx    # Toolbar with tools and controls
	└── utils/
		├── geometry.ts    # Geometry helpers
		└── storage.ts     # Local storage helpers
```