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
    window.dispatchEvent(new CustomEvent('utools-mode-change', { detail: code }));
  });
}
window.getMode = () => currentMode;

// Dev Mock - 必须在其他函数之前初始化
if (typeof utools === 'undefined') {
  console.log('uTools environment not detected. Using mock.');
  
  let mockDb = {};
  
  window.utools = {
    isDev: () => true,
    getFeatures: () => [],
    setFeature: () => {},
    removeFeature: () => {},
    fetchUserPayments: () => Promise.resolve([]),
    db: {
      get: (id) => mockDb[id] || null,
      put: (doc) => {
        mockDb[doc._id] = doc;
        console.log('mockDb put:', doc._id, doc.data?.length || 'no length');
        return { ok: true };
      },
      remove: (id) => {
        delete mockDb[id];
        return { ok: true };
      }
    }
  };
  
  // 暴露 mockDb 供调试
  window.mockDb = mockDb;
}

// Database Helpers
window.postDB = (id, data) => {
  if (typeof utools === 'undefined') return;
  const doc = utools.db.get(id);
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
  if (doc && doc.data) {
    if (Array.isArray(doc.data) && id === 'user-data') {
       return new Uint8Array(doc.data);
    }
    return doc.data;
  }
  return null;
};

// User Data & Mistake DB
window.postUToolsUserData = (data) => window.postDB('user-data', data);
window.getUToolsUserData = () => window.getDB('user-data');

// Local Dictionary Management
window.readLocalDictConfig = () => {
  const doc = utools.db.get('local-dict-config');
  console.log('readLocalDictConfig:', doc);
  return doc ? doc.data : [];
};

window.writeLocalDictConfig = (config) => {
  const doc = utools.db.get('local-dict-config');
  utools.db.put({
    _id: 'local-dict-config',
    data: config,
    _rev: doc ? doc._rev : undefined
  });
};

window.newLocalDictFromJson = (jsonData, dictMeta) => {
  // Save dictionary content
  const contentDoc = utools.db.get(dictMeta.id);
  utools.db.put({
    _id: dictMeta.id,
    data: jsonData,
    _rev: contentDoc ? contentDoc._rev : undefined
  });
  
  // Check if dict already exists in config
  const config = window.readLocalDictConfig();
  const existingIndex = config.findIndex(d => d.id === dictMeta.id);
  
  if (existingIndex >= 0) {
    // Update existing dict
    config[existingIndex] = dictMeta;
  } else {
    // Add new dict
    config.push(dictMeta);
  }
  
  window.writeLocalDictConfig(config);
};

window.readLocalDict = (id) => {
  const doc = utools.db.get(id);
  return doc ? doc.data : [];
};

window.delLocalDict = (id) => {
  const config = window.readLocalDictConfig();
  const newConfig = config.filter(d => d.id !== id);
  if (newConfig.length !== config.length) {
    window.writeLocalDictConfig(newConfig);
  }
  
  const doc = utools.db.get(id);
  if (doc) {
    return utools.db.remove(id).ok;
  }
  return true;
};

// Initialize Local Dictionaries
window.initLocalDictionries = () => {
  const config = window.readLocalDictConfig();
  if (typeof window.updateLocalDictionaries === 'function') {
    window.updateLocalDictionaries(config);
  }
};

// Export Database
window.exportDatabase2UTools = () => {
};

// Migration
window.migrateLocalStorageToUtools = () => {
};

// Clear All Data
window.clearAllData = () => {
  try {
    const config = window.readLocalDictConfig();
    config.forEach((dict) => {
      if (dict.id) {
        utools.db.remove(dict.id);
      }
    });
    utools.db.remove('local-dict-config');
    utools.db.remove('user-data');
    utools.db.remove('x-typing-mistake');
    localStorage.clear();
    console.log('All data cleared');
    return true;
  } catch (err) {
    console.error('Clear all data failed:', err);
    return false;
  }
};

// Restart Plugin
window.restartPlugin = () => {
  if (typeof utools !== 'undefined') {
    utools.outPlugin();
    setTimeout(() => {
      utools.showMainWindow();
    }, 100);
  } else {
    window.location.reload();
  }
};
