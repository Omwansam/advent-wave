const { contextBridge, ipcRenderer } = require('electron');

/**
 * The only thing the website sees of the desktop app: `window.adventwaveDesktop`. The page has
 * no Node.js and no Electron; it can tell the app what is playing (for the tray), hear the
 * tray's Play/Pause, Next and Previous, and ask to reload after being offline. The main process
 * checks that each message came from the AdventWave site before acting on it.
 */
contextBridge.exposeInMainWorld('adventwaveDesktop', {
  platform: process.platform,

  /** @param {(command: 'toggle' | 'next' | 'previous') => void} listener @returns {() => void} unsubscribe */
  onCommand(listener) {
    const handler = (_event, command) => listener(command);
    ipcRenderer.on('adventwave:command', handler);
    return () => ipcRenderer.removeListener('adventwave:command', handler);
  },

  /** @param {{ title?: string, artist?: string, playing?: boolean } | null} info */
  setNowPlaying(info) {
    const clean = info
      ? {
          title: String(info.title ?? '').slice(0, 200),
          artist: String(info.artist ?? '').slice(0, 200),
          playing: Boolean(info.playing),
        }
      : null;
    ipcRenderer.send('adventwave:now-playing', clean);
  },

  retry() {
    ipcRenderer.send('adventwave:retry');
  },
});
