# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an educational Conway's Game of Life implementation designed for elementary school students in an "Algorithm Laboratory" class. The project is built with vanilla JavaScript, HTML5 Canvas (via p5.js), and provides an interactive learning environment with Japanese UI.

## Architecture

### Core Structure
- **`index.html`**: Main HTML file containing UI layout, controls, tutorial system, and CSS styling
- **`lifegame.js`**: Core Game of Life implementation using p5.js for rendering and game logic
- **`README.md`**: Japanese documentation explaining the project's educational purpose

### Key Components

**Game Engine (`lifegame.js`)**:
- Uses p5.js for canvas rendering and event handling
- Implements Conway's Game of Life rules with toroidal (wraparound) world
- State management with `Set` for live cells using coordinate strings (`"x,y"`)
- History system for undo functionality (max 100 states)
- Real-time statistics tracking and population graphing

**User Interface (`index.html`)**:
- Interactive tutorial system with step-by-step guidance
- Pattern placement buttons for famous Game of Life patterns (glider, pulsar, etc.)
- Real-time controls (play/pause, speed, cell size)
- Statistics display (generation count, population)
- Population history graph rendered on HTML5 canvas

## Development Commands

This is a client-side only project with no build system or package management:

- **Run locally**: Open `index.html` directly in a web browser
- **Live development**: Use a local web server like `python -m http.server` or `npx serve .`
- **Testing**: Manual testing in browser only (no automated test suite)

## Key Technical Details

### Game Logic
- Cell coordinates stored as strings in Set: `"x,y"`
- Neighbor counting uses modulo arithmetic for toroidal world
- Two-phase generation calculation prevents mutation during iteration
- History snapshots created before each generation for undo functionality

### Performance Optimizations
- Only calculates neighbors for cells adjacent to live cells
- Graph updates throttled to 500ms intervals
- Limited history (100 generations) and population tracking (200 points)
- Efficient Set-based operations for cell state management

### UI Features
- Dynamic canvas sizing based on window dimensions
- Cell size and speed controls with real-time updates
- Visual preview of next generation changes when paused (green=birth, red=death)
- Keyboard controls (arrow keys for step forward/backward)

## Educational Context

This code is specifically designed for Japanese elementary school students learning basic algorithmic concepts. The UI text, variable names, and comments are in Japanese. The tutorial system guides students through understanding:
- Basic Game of Life rules
- Pattern recognition and emergent behavior
- Interactive experimentation with different configurations