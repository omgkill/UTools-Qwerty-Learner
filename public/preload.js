const fs = require('fs');
const path = require('path');

window.fs = fs;
window.path = path;
window.process = process;

// Mode Handling
let currentMode = 'typing';
if (typeof utools !== 'undefined') {
  utools.onPluginEnter(({ code }) => {
    currentMode = code;
    // Dispatch a custom event to notify React app
    window.dispatchEvent(new CustomEvent('utools-mode-change', { detail: code }));
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
