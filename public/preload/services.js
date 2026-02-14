const fs = require('fs');
const path = require('path');

window.fs = fs;
window.path = path;
// window.process = process;
const csharpModulePath = fs.existsSync(path.join(__dirname, 'csharp'))
  ? path.join(__dirname, 'csharp')
  : path.join(__dirname, '..', 'csharp')
const { setActiveWindowOpacity, setWindowOpacityByTitle } = require(csharpModulePath)
if (typeof setActiveWindowOpacity === 'function') {
  window.setActiveWindowOpacity = (opacity) => setActiveWindowOpacity(opacity)
}

// Mode Handling
let currentMode = 'typing';
let moyuWindow = null;
let readerWindow = null;
const moyuWindowOptions = {
  title: 'Qwerty Learner Moyu',
  width: 800,
  height: 600,
  useContentSize: true,
  transparent: true,
  backgroundColor: '#00000000',
  frame: false,
  alwaysOnTop: true,
  resizable: true,
  hasShadow: false,
  skipTaskbar: true,
  minimizable: false,
  maximizable: false,
  fullscreenable: false,
  webPreferences: {
    preload: 'preload.js',
    nodeIntegration: true,
    contextIsolation: false,
    backgroundThrottling: false
  }
};
const readerWindowOptions = {
  title: 'Qwerty Learner Reader',
  width: 900,
  height: 680,
  useContentSize: true,
  transparent: true,
  backgroundColor: '#00000000',
  frame: false,
  hasShadow: false,
  resizable: true,
  minimizable: true,
  maximizable: true,
  fullscreenable: true,
  webPreferences: {
    preload: 'preload.js',
    nodeIntegration: true,
    contextIsolation: false,
    backgroundThrottling: false
  }
};
if (typeof utools !== 'undefined') {
  utools.onPluginEnter(({ code }) => {
    currentMode = code;
    window.dispatchEvent(new CustomEvent('utools-mode-change', { detail: code }));

    if (code === 'conceal' || code === 'moyu') {
      if (moyuWindow) {
        moyuWindow.show();
        moyuWindow.focus();
        if (typeof moyuWindow.setOpacity === 'function') {
          moyuWindow.setOpacity(0.75);
        }
        utools.hideMainWindow();
        return;
      }

      if (typeof utools.createBrowserWindow === 'function') {
        moyuWindow = utools.createBrowserWindow(
          'index.html',
          moyuWindowOptions,
          () => {
            if (moyuWindow) {
              if (moyuWindow.webContents) {
                moyuWindow.webContents.executeJavaScript(`
                  const style = document.createElement('style');
                  style.textContent = \`
                    html, body, #root, #app {
                      background: transparent !important;
                    }
                  \`;
                  document.head.appendChild(style);
                `);
              }
              setTimeout(() => {
                moyuWindow.show();
                if (typeof moyuWindow.setOpacity === 'function') {
                  moyuWindow.setOpacity(0.75);
                }
                utools.hideMainWindow();
                setActiveWindowOpacity(75).catch(() => setWindowOpacityByTitle('Qwerty Learner Moyu', 75))
              }, 100);
            }
          }
        );

        if (moyuWindow) {
          moyuWindow.on('closed', () => {
            moyuWindow = null;
            utools.outPlugin(); 
          });
        }
      } else {
        console.error('utools.createBrowserWindow API is not available.');
      }
    } else if (code === 'reader') {
      if (readerWindow) {
        readerWindow.show();
        readerWindow.focus();
        utools.hideMainWindow();
        return;
      }

      if (typeof utools.createBrowserWindow === 'function') {
        readerWindow = utools.createBrowserWindow(
          'index.html?reader=1',
          readerWindowOptions,
          () => {
            if (readerWindow) {
              if (readerWindow.webContents) {
                readerWindow.webContents.executeJavaScript(`
                  const style = document.createElement('style');
                  style.textContent = \`
                    html, body, #root, #app {
                      background: transparent !important;
                    }
                  \`;
                  document.head.appendChild(style);
                `);
              }
              setTimeout(() => {
                readerWindow.show();
                if (typeof readerWindow.setOpacity === 'function') {
                  readerWindow.setOpacity(0.9);
                }
                utools.hideMainWindow();
                setActiveWindowOpacity(90).catch(() => setWindowOpacityByTitle('Qwerty Learner Reader', 90))
              }, 100);
            }
          }
        );

        if (readerWindow) {
          readerWindow.on('closed', () => {
            readerWindow = null;
            utools.outPlugin(); 
          });
        }
      } else {
        console.error('utools.createBrowserWindow API is not available.');
      }
    } else {
      if (moyuWindow) {
        moyuWindow.close();
        moyuWindow = null;
      }
      if (readerWindow) {
        readerWindow.close();
        readerWindow = null;
      }
    }
  });
}
window.getMode = () => currentMode;

// Database Helpers
window.postDB = (id, data) => {
  if (typeof utools === 'undefined') return;
  const doc = utools.db.get(id);
  // Support Uint8Array by converting to regular Array for storage
  const payload = data instanceof Uint8Array ? Array.from(data) : data;
  return utools.db.put({
    _id: id,
    data: payload,
    _rev: doc ? doc._rev : undefined
  });
};

window.getDB = (id) => {
  if (typeof utools === 'undefined') return null;
  const doc = utools.db.get(id);
  // Convert Array back to Uint8Array if it looks like one (simple heuristic or context dependent)
  // For 'user-data' and 'x-typing-mistake', the app expects Uint8Array.
  if (doc && doc.data) {
    if (Array.isArray(doc.data) && (id === 'user-data' || id === 'x-typing-mistake')) {
       return new Uint8Array(doc.data);
    }
    return doc.data;
  }
  return null;
};

// User Data & Mistake DB (Alias to generic DB)
window.postUToolsUserData = (data) => window.postDB('user-data', data);
window.getUToolsUserData = () => window.getDB('user-data');

// Local Dictionary Management
window.readLocalDictConfig = () => {
  if (typeof utools === 'undefined') return [];
  const doc = utools.db.get('local-dict-config');
  return doc ? doc.data : [];
};

window.writeLocalDictConfig = (config) => {
  if (typeof utools === 'undefined') return;
  const doc = utools.db.get('local-dict-config');
  utools.db.put({
    _id: 'local-dict-config',
    data: config,
    _rev: doc ? doc._rev : undefined
  });
};

window.newLocalDictFromJson = (jsonData, dictMeta) => {
  if (typeof utools === 'undefined') return;
  // 1. Save dictionary content
  const contentDoc = utools.db.get(dictMeta.id);
  utools.db.put({
    _id: dictMeta.id,
    data: jsonData,
    _rev: contentDoc ? contentDoc._rev : undefined
  });
  
  // 2. Update config
  const config = window.readLocalDictConfig();
  config.push(dictMeta);
  window.writeLocalDictConfig(config);
};

window.readLocalDict = (id) => {
  if (typeof utools === 'undefined') return [];
  const doc = utools.db.get(id);
  return doc ? doc.data : [];
};

window.delLocalDict = (id) => {
  if (typeof utools === 'undefined') return false;
  // 1. Remove from config
  const config = window.readLocalDictConfig();
  const newConfig = config.filter(d => d.id !== id);
  if (newConfig.length !== config.length) {
    window.writeLocalDictConfig(newConfig);
  }
  
  // 2. Remove content
  const doc = utools.db.get(id);
  if (doc) {
    return utools.db.remove(id).ok;
  }
  return true;
};

// Migration Placeholder
window.migrateLocalStorageToUtools = () => {
  // Logic to migrate from web localStorage to uTools DB if needed
};

// Dev Mock
if (typeof utools === 'undefined') {
  console.log('uTools environment not detected. Using mock.');
  window.utools = {
    isDev: () => true,
    getFeatures: () => [],
    setFeature: () => {},
    removeFeature: () => {},
    fetchUserPayments: () => Promise.resolve([]),
    db: {
        get: () => null,
        put: () => ({ok: true}),
        remove: () => ({ok: true})
    }
  };
}
