const { app, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

/**
 * The window's size and place, kept between launches. A saved position on a monitor that has
 * since been unplugged is dropped, so the window never opens off-screen.
 */
const FILE = () => path.join(app.getPath('userData'), 'window-state.json');
const DEFAULT = { width: 1280, height: 820 };

function onSomeDisplay(bounds) {
  return screen.getAllDisplays().some(({ workArea: a }) => {
    const x = Math.max(a.x, bounds.x);
    const y = Math.max(a.y, bounds.y);
    const right = Math.min(a.x + a.width, bounds.x + bounds.width);
    const bottom = Math.min(a.y + a.height, bounds.y + bounds.height);
    // At least a grabbable strip of the title bar is visible.
    return right - x >= 120 && bottom - y >= 40;
  });
}

function load() {
  try {
    const saved = JSON.parse(fs.readFileSync(FILE(), 'utf8'));
    const { bounds, maximized } = saved;
    if (bounds && Number.isFinite(bounds.width) && Number.isFinite(bounds.height)) {
      const sized = { width: Math.max(480, bounds.width), height: Math.max(560, bounds.height) };
      const placed = Number.isFinite(bounds.x) && onSomeDisplay(bounds) ? { x: bounds.x, y: bounds.y } : {};
      return { bounds: { ...sized, ...placed }, maximized: Boolean(maximized) };
    }
  } catch {
    // First launch, or an unreadable file: start from the default.
  }
  return { bounds: { ...DEFAULT }, maximized: false };
}

/** Saves as the window moves and resizes, at most twice a second. */
function track(win) {
  let timer;
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (win.isDestroyed()) return;
      const state = { bounds: win.getNormalBounds(), maximized: win.isMaximized() };
      fs.promises.writeFile(FILE(), JSON.stringify(state)).catch(() => {
        // A full disk costs the window its position, nothing more.
      });
    }, 500);
  };
  for (const event of ['resize', 'move', 'maximize', 'unmaximize']) win.on(event, save);
}

module.exports = { load, track };
