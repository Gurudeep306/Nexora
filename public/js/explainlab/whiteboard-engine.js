/**
 * Whiteboard Engine
 * Handles drawing, recording, and replay of whiteboard actions
 */

class WhiteboardEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = {
      backgroundColor: '#ffffff',
      gridColor: '#f0f0f0',
      ...options
    };

    // State
    this.isDrawing = false;
    this.currentTool = 'pen';
    this.currentColor = '#000000';
    this.brushSize = 3;
    this.currentPage = 0;
    this.pages = {};
    this.events = [];
    this.eventListeners = [];
    this.recordingStartTime = null;
    this.isRecording = false;

    // Objects for selection/manipulation
    this.objects = [];
    this.selectedObject = null;
    this.undoStack = [];
    this.redoStack = [];

    // Drawing state
    this.lastX = 0;
    this.lastY = 0;
    this.currentPath = [];

    // Initialize
    this.resize();
    this.setupEventListeners();
    this.initPage(0);
  }

  // ==================== Canvas Setup ====================

  resize() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.width = rect.width;
    this.height = rect.height;
    this.redraw();
  }

  setBackground(type) {
    this.options.backgroundType = type;
    this.redraw();
  }

  clearCanvas() {
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.drawBackground();
  }

  drawBackground() {
    const type = this.options.backgroundType || 'white';
    if (type === 'white') return;

    this.ctx.strokeStyle = this.options.gridColor;
    this.ctx.lineWidth = 0.5;

    if (type === 'grid') {
      const gridSize = 20;
      for (let x = 0; x < this.width; x += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.height);
        this.ctx.stroke();
      }
      for (let y = 0; y < this.height; y += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.width, y);
        this.ctx.stroke();
      }
    } else if (type === 'dotted') {
      const dotSize = 2;
      const dotSpacing = 20;
      this.ctx.fillStyle = this.options.gridColor;
      for (let x = dotSpacing; x < this.width; x += dotSpacing) {
        for (let y = dotSpacing; y < this.height; y += dotSpacing) {
          this.ctx.beginPath();
          this.ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    } else if (type === 'ruled') {
      const lineSpacing = 28;
      for (let y = lineSpacing; y < this.height; y += lineSpacing) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.width, y);
        this.ctx.stroke();
      }
    } else if (type === 'dark') {
      this.ctx.fillStyle = '#1a1a2e';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.strokeStyle = '#2a2a4e';
      const gridSize = 20;
      for (let x = 0; x < this.width; x += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.height);
        this.ctx.stroke();
      }
      for (let y = 0; y < this.height; y += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.width, y);
        this.ctx.stroke();
      }
    }
  }

  // ==================== Event Listeners ====================

  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.handlePointerDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handlePointerMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handlePointerUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.handlePointerUp(e));

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handlePointerDown(e.touches[0]);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.handlePointerMove(e.touches[0]);
    });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.handlePointerUp(e);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Window resize
    window.addEventListener('resize', () => this.resize());
  }

  getPointerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  // ==================== Pointer Handling ====================

  handlePointerDown(e) {
    const pos = this.getPointerPos(e);
    this.isDrawing = true;
    this.lastX = pos.x;
    this.lastY = pos.y;
    this.currentPath = [{ x: pos.x, y: pos.y, time: Date.now() }];

    if (this.currentTool === 'pen' || this.currentTool === 'marker' || this.currentTool === 'highlighter') {
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
    } else if (this.currentTool === 'eraser') {
      this.eraseAt(pos.x, pos.y);
    } else if (this.currentTool === 'text') {
      this.addText(pos.x, pos.y);
    }

    // Record event
    this.recordEvent('pointer_down', {
      x: pos.x, y: pos.y,
      tool: this.currentTool,
      color: this.currentColor,
      size: this.brushSize,
      page: this.currentPage
    });

    this.notifyListeners('pointerdown', pos);
  }

  handlePointerMove(e) {
    if (!this.isDrawing) return;
    const pos = this.getPointerPos(e);

    if (this.currentTool === 'pen') {
      this.drawPen(pos);
    } else if (this.currentTool === 'marker') {
      this.drawMarker(pos);
    } else if (this.currentTool === 'highlighter') {
      this.drawHighlighter(pos);
    } else if (this.currentTool === 'eraser') {
      this.eraseAt(pos.x, pos.y);
    }

    this.currentPath.push({ x: pos.x, y: pos.y, time: Date.now() });
    this.lastX = pos.x;
    this.lastY = pos.y;

    this.notifyListeners('pointermove', pos);
  }

  handlePointerUp(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    const pos = this.getPointerPos(e);

    // Record path event
    if (this.currentPath.length > 1 && ['pen', 'marker', 'highlighter'].includes(this.currentTool)) {
      this.recordEvent('path', {
        points: this.currentPath,
        tool: this.currentTool,
        color: this.currentColor,
        size: this.brushSize,
        page: this.currentPage
      });
    }

    this.recordEvent('pointer_up', {
      x: pos.x, y: pos.y,
      page: this.currentPage
    });

    this.currentPath = [];
    this.notifyListeners('pointerup', pos);
  }

  // ==================== Drawing Methods ====================

  drawPen(pos) {
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.brushSize;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  }

  drawMarker(pos) {
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.brushSize * 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.globalAlpha = 0.6;
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
    this.ctx.globalAlpha = 1.0;
  }

  drawHighlighter(pos) {
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.brushSize * 4;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.globalAlpha = 0.2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
    this.ctx.globalAlpha = 1.0;
  }

  eraseAt(x, y) {
    const eraseSize = this.brushSize * 5;
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.beginPath();
    this.ctx.arc(x, y, eraseSize, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // Redraw background in erased area
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(x, y, eraseSize, 0, Math.PI * 2);
    this.ctx.clip();
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.drawBackground();
    this.ctx.restore();
  }

  // ==================== Shape Tools ====================

  drawShape(type, startX, startY, endX, endY) {
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.brushSize;
    this.ctx.lineCap = 'round';

    switch (type) {
      case 'line':
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
        break;

      case 'arrow':
        this.drawArrow(startX, startY, endX, endY);
        break;

      case 'rectangle':
        this.ctx.strokeRect(startX, startY, endX - startX, endY - startY);
        break;

      case 'circle':
        const cx = (startX + endX) / 2;
        const cy = (startY + endY) / 2;
        const rx = Math.abs(endX - startX) / 2;
        const ry = Math.abs(endY - startY) / 2;
        this.ctx.beginPath();
        this.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
    }
  }

  drawArrow(fromX, fromY, toX, toY) {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }

  // ==================== Text ====================

  addText(x, y) {
    const text = prompt('Enter text:');
    if (!text) return;

    this.ctx.font = `${this.brushSize * 5}px sans-serif`;
    this.ctx.fillStyle = this.currentColor;
    this.ctx.fillText(text, x, y);

    this.recordEvent('add_text', {
      x, y, text,
      font: `${this.brushSize * 5}px sans-serif`,
      color: this.currentColor,
      page: this.currentPage
    });
  }

  // ==================== Page Management ====================

  initPage(pageIndex) {
    if (!this.pages[pageIndex]) {
      this.pages[pageIndex] = {
        objects: [],
        snapshot: null
      };
    }
  }

  switchPage(pageIndex) {
    // Save current page state
    this.saveCurrentPage();

    // Switch to new page
    this.currentPage = pageIndex;
    this.initPage(pageIndex);

    // Redraw
    this.clearCanvas();
    this.redraw();
  }

  saveCurrentPage() {
    this.pages[this.currentPage].snapshot = this.canvas.toDataURL();
  }

  addPage() {
    const newIndex = Object.keys(this.pages).length;
    this.initPage(newIndex);
    this.switchPage(newIndex);
    return newIndex;
  }

  deletePage(pageIndex) {
    if (Object.keys(this.pages).length <= 1) return;
    delete this.pages[pageIndex];
    if (this.currentPage === pageIndex) {
      this.switchPage(0);
    }
  }

  // ==================== Redraw ====================

  redraw() {
    this.clearCanvas();

    // Replay events for current page
    const pageEvents = this.events.filter(e => e.page === this.currentPage);
    this.replayEvents(pageEvents, true);
  }

  // ==================== Recording ====================

  startRecording() {
    this.isRecording = true;
    this.recordingStartTime = Date.now();
    this.events = [];
  }

  stopRecording() {
    this.isRecording = false;
    return this.events;
  }

  recordEvent(eventType, payload) {
    if (!this.isRecording) return;

    const event = {
      timestamp_ms: Date.now() - this.recordingStartTime,
      event_type: eventType,
      payload: payload,
      page: this.currentPage
    };

    this.events.push(event);
    this.notifyListeners('event_recorded', event);
  }

  // ==================== Replay ====================

  replayEvents(events, sync = false) {
    const sortedEvents = [...events].sort((a, b) => a.timestamp_ms - b.timestamp_ms);

    for (const event of sortedEvents) {
      if (!sync) {
        this.applyEvent(event);
      } else {
        // For sync replay, just apply without animation
        this.applyEventSync(event);
      }
    }
  }

  applyEvent(event) {
    const { event_type, payload } = event;

    switch (event_type) {
      case 'pointer_down':
        this.lastX = payload.x;
        this.lastY = payload.y;
        break;

      case 'path':
        this.replayPath(payload);
        break;

      case 'pointer_up':
        break;

      case 'add_text':
        this.ctx.font = payload.font;
        this.ctx.fillStyle = payload.color;
        this.ctx.fillText(payload.text, payload.x, payload.y);
        break;

      case 'clear_page':
        this.clearCanvas();
        break;
    }
  }

  applyEventSync(event) {
    // Same as applyEvent but for synchronous replay
    this.applyEvent(event);
  }

  replayPath(payload) {
    const { points, tool, color, size } = payload;
    if (points.length < 2) return;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (tool === 'marker') this.ctx.globalAlpha = 0.6;
    else if (tool === 'highlighter') this.ctx.globalAlpha = 0.2;
    else this.ctx.globalAlpha = 1.0;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.stroke();

    this.ctx.globalAlpha = 1.0;
  }

  // Animated replay
  async replayAnimated(events, onProgress, onComplete) {
    const sortedEvents = [...events].sort((a, b) => a.timestamp_ms - b.timestamp_ms);
    const totalDuration = sortedEvents[sortedEvents.length - 1]?.timestamp_ms || 1;
    const startTime = Date.now();

    this.clearCanvas();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);

      // Apply all events up to current time
      this.clearCanvas();
      const eventsToApply = sortedEvents.filter(e => e.timestamp_ms <= totalDuration * progress);
      this.replayEvents(eventsToApply, true);

      if (onProgress) onProgress(progress, elapsed);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (onComplete) onComplete();
      }
    };

    animate();
  }

  // ==================== Undo/Redo ====================

  undo() {
    if (this.events.length === 0) return;
    const lastEvent = this.events.pop();
    this.redoStack.push(lastEvent);
    this.redraw();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const event = this.redoStack.pop();
    this.events.push(event);
    this.redraw();
  }

  clearPage() {
    this.recordEvent('clear_page', { page: this.currentPage });
    this.clearCanvas();
    this.events = this.events.filter(e => e.page !== this.currentPage);
  }

  // ==================== Export ====================

  toDataURL(format = 'png') {
    return this.canvas.toDataURL(`image/${format}`);
  }

  toBlob(callback, format = 'png', quality = 0.92) {
    this.canvas.toBlob(callback, `image/${format}`, quality);
  }

  // ==================== Event Listener System ====================

  on(event, callback) {
    this.eventListeners.push({ event, callback });
  }

  off(event, callback) {
    this.eventListeners = this.eventListeners.filter(
      l => l.event !== event || l.callback !== callback
    );
  }

  notifyListeners(event, data) {
    this.eventListeners
      .filter(l => l.event === event)
      .forEach(l => l.callback(data));
  }

  // ==================== Keyboard Shortcuts ====================

  handleKeyDown(e) {
    // Don't handle if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key.toLowerCase()) {
      case 'p':
        this.setTool('pen');
        break;
      case 'm':
        this.setTool('marker');
        break;
      case 'h':
        this.setTool('highlighter');
        break;
      case 'e':
        this.setTool('eraser');
        break;
      case 't':
        this.setTool('text');
        break;
      case 'v':
        this.setTool('select');
        break;
      case 'z':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (e.shiftKey) this.redo();
          else this.undo();
        }
        break;
      case 'y':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.redo();
        }
        break;
    }
  }

  // ==================== Tool Management ====================

  setTool(tool) {
    this.currentTool = tool;
    this.notifyListeners('tool_change', tool);
  }

  setColor(color) {
    this.currentColor = color;
  }

  setBrushSize(size) {
    this.brushSize = size;
  }

  // ==================== Cleanup ====================

  destroy() {
    this.canvas.removeEventListener('mousedown', this.handlePointerDown);
    this.canvas.removeEventListener('mousemove', this.handlePointerMove);
    this.canvas.removeEventListener('mouseup', this.handlePointerUp);
    this.eventListeners = [];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WhiteboardEngine;
}