const fs = require('fs');
const path = require('path');

window.fs = fs;
window.path = path;
window.process = process;

const logFile = path.join(require('os').tmpdir(), 'qwerty-learner-debug.log');
const log = (msg) => {
  const timestamp = new Date().toISOString().substr(11, 12);
  const line = `[${timestamp}] ${msg}\n`;
  try {
    fs.appendFileSync(logFile, line);
  } catch (e) {}
  console.log(line.trim());
};
window.debugLog = log;
log('=== preload.js loaded ===');

let currentMode = null;
let currentAction = null;
if (typeof utools !== 'undefined') {
  log('Registering onPluginEnter callback');
  utools.onPluginEnter((action) => {
    log(`onPluginEnter triggered: code=${action.code}, payload=${action.payload}`);
    currentMode = action.code;
    currentAction = action;
    window.dispatchEvent(new CustomEvent('utools-mode-change', { detail: action }));
    log('utools-mode-change event dispatched');
  });
}
window.getMode = () => currentMode;
window.getAction = () => currentAction;

if (typeof utools === 'undefined') {
  console.log('uTools environment not detected. Using localStorage mock.');

  currentMode = 'typing';

  // localStorage-backed mock database for web environment
  const STORAGE_KEY = 'qwerty-learner-db';

  function loadDb() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Failed to load db from localStorage:', e);
      return {};
    }
  }

  function saveDb(db) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Failed to save db to localStorage:', e);
    }
  }

  // Generate a simple revision ID
  function generateRev() {
    return Math.random().toString(36).substr(2, 9);
  }

  window.utools = {
    isDev: () => true,
    getFeatures: () => [],
    setFeature: () => {},
    removeFeature: () => {},
    fetchUserPayments: () => Promise.resolve([]),
    db: {
      get: (id) => {
        const db = loadDb();
        const doc = db[id];
        if (!doc) return null;
        // Return a copy to prevent direct mutations
        return JSON.parse(JSON.stringify(doc));
      },
      put: (doc) => {
        const db = loadDb();
        const existing = db[doc._id];
        const newDoc = {
          _id: doc._id,
          _rev: existing ? existing._rev : generateRev(),
          data: doc.data
        };
        db[doc._id] = newDoc;
        saveDb(db);
        console.log('localStorage mockDb put:', doc._id);
        return { ok: true, id: doc._id, rev: newDoc._rev };
      },
      remove: (id) => {
        const db = loadDb();
        if (db[id]) {
          delete db[id];
          saveDb(db);
          return { ok: true, id };
        }
        return { ok: false, id };
      },
      allDocs: () => {
        const db = loadDb();
        return Object.values(db).map(doc => JSON.parse(JSON.stringify(doc)));
      },
      // For bulk operations (used by clearAllData)
      bulkDocs: (docs) => {
        const db = loadDb();
        docs.forEach(doc => {
          if (doc._deleted) {
            delete db[doc._id];
          } else {
            db[doc._id] = {
              _id: doc._id,
              _rev: generateRev(),
              data: doc.data
            };
          }
        });
        saveDb(db);
        return docs.map(d => ({ ok: true, id: d._id }));
      }
    }
  };

  // Expose for debugging
  window.mockDb = {
    getStorage: () => loadDb(),
    clear: () => {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Mock database cleared');
    }
  };

  console.log('localStorage-backed uTools mock initialized');
} else {
  window.utools.db.allDocs = function() {
    const docs = [];
    const allKeys = Object.keys(this.storage || {});
    for (const key of allKeys) {
      const doc = this.get(key);
      if (doc) docs.push(doc);
    }
    return docs;
  };
}

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

const WORD_BANK_CONFIG_KEY = 'local-wordbank-config';

window.readLocalWordBankConfig = () => {
  const doc = utools.db.get(WORD_BANK_CONFIG_KEY);
  console.log('readLocalWordBankConfig:', doc);
  return doc ? doc.data : [];
};

window.writeLocalWordBankConfig = (config) => {
  const doc = utools.db.get(WORD_BANK_CONFIG_KEY);
  utools.db.put({
    _id: WORD_BANK_CONFIG_KEY,
    data: config,
    _rev: doc ? doc._rev : undefined
  });
};

window.newLocalWordBankFromJson = (jsonData, wordBankMeta) => {
  const contentDoc = utools.db.get(wordBankMeta.id);
  utools.db.put({
    _id: wordBankMeta.id,
    data: jsonData,
    _rev: contentDoc ? contentDoc._rev : undefined
  });
  
  const config = window.readLocalWordBankConfig();
  const existingIndex = config.findIndex(d => d.id === wordBankMeta.id);
  
  if (existingIndex >= 0) {
    config[existingIndex] = wordBankMeta;
  } else {
    config.push(wordBankMeta);
  }
  
  window.writeLocalWordBankConfig(config);
};

window.readLocalWordBank = (id) => {
  const doc = utools.db.get(id);
  return doc ? doc.data : [];
};

window.delLocalWordBank = (id) => {
  const config = window.readLocalWordBankConfig();
  const newConfig = config.filter(d => d.id !== id);
  if (newConfig.length !== config.length) {
    window.writeLocalWordBankConfig(newConfig);
  }
  
  const doc = utools.db.get(id);
  if (doc) {
    return utools.db.remove(id).ok;
  }
  return true;
};

window.initLocalWordBanks = () => {
  const config = window.readLocalWordBankConfig();
  if (typeof window.updateLocalWordBanks === 'function') {
    window.updateLocalWordBanks(config);
  }
};

window.readLocalDictConfig = window.readLocalWordBankConfig;
window.writeLocalDictConfig = window.writeLocalWordBankConfig;
window.newLocalDictFromJson = window.newLocalWordBankFromJson;
window.readLocalDict = window.readLocalWordBank;
window.delLocalDict = window.delLocalWordBank;
window.initLocalDictionries = window.initLocalWordBanks;

window.clearAllData = () => {
  try {
    const allDocs = utools.db.allDocs();
    
    for (const doc of allDocs) {
      const id = doc._id;
      if (id.startsWith('progress:') || 
          id.startsWith('daily:') || 
          id.startsWith('session:') ||
          id.startsWith('local-wordbank') ||
          id === 'local-wordbank-config' ||
          id === 'local-dict-config' ||
          id === 'mdict-config') {
        utools.db.remove(id);
      }
    }
    
    console.log('All data cleared');
    return true;
  } catch (err) {
    console.error('Clear all data failed:', err);
    return false;
  }
};

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

if (typeof utools !== 'undefined') {
  let mdictParser = null;
  try {
    mdictParser = require('mdict/mdict-parser.js');
  } catch (e) {
    console.warn('mdict module not available:', e.message);
  }

  const mdxInstances = new Map();

  function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.jpg': case '.jpeg': return 'image/jpeg';
      case '.png': return 'image/png';
      case '.gif': return 'image/gif';
      case '.bmp': return 'image/bmp';
      case '.svg': return 'image/svg+xml';
      case '.mp3': return 'audio/mpeg';
      case '.wav': return 'audio/wav';
      case '.ogg': return 'audio/ogg';
      case '.css': return 'text/css';
      case '.js': return 'text/javascript';
      default: return 'application/octet-stream';
    }
  }

  async function replaceResources(html, mddLookup) {
    if (!html || !mddLookup) return html;
    
    const regex = /(src|href)=["']([^"']+)["']/g;
    const matches = [];
    let match;
    
    while ((match = regex.exec(html)) !== null) {
      matches.push({ full: match[0], attr: match[1], val: match[2] });
    }
    
    if (matches.length === 0) return html;
    
    const replacements = new Map();
    const uniqueVals = [...new Set(matches.map(m => m.val))];
    
    await Promise.all(uniqueVals.map(async (val) => {
      if (val.startsWith('entry://') || val.startsWith('http') || val.startsWith('https') || val.startsWith('data:')) {
        return;
      }
      
      try {
        const buffer = await mddLookup(val);
        if (buffer) {
          const base64 = Buffer.from(buffer).toString('base64');
          const mime = getMimeType(val);
          replacements.set(val, `data:${mime};base64,${base64}`);
        }
      } catch (e) {}
    }));
    
    return html.replace(regex, (match, attr, val) => {
      if (replacements.has(val)) {
        return `${attr}="${replacements.get(val)}"`;
      }
      return match;
    });
  }

  window.dictMdxLoader = {
    async load(filePath) {
      if (mdxInstances.has(filePath)) {
        return mdxInstances.get(filePath);
      }

      if (!mdictParser) {
        throw new Error('mdict module not loaded');
      }

      const files = [];

      const mdxBuf = Buffer.from(filePath);
      mdxBuf.name = filePath;
      files.push(mdxBuf);

      const mddPath = filePath.replace(/\.mdx$/i, '.mdd');
      if (fs.existsSync(mddPath)) {
        const mddBuf = Buffer.from(mddPath);
        mddBuf.name = mddPath;
        files.push(mddBuf);
      }

      try {
        const resources = await mdictParser.load(files);

        const mdxLookup = await resources.mdx;
        let mddLookup = null;

        if (resources.mdd) {
          try {
            mddLookup = await resources.mdd;
          } catch (e) {
            console.error('MDD load failed', e);
          }
        } else if (resources['.mdd']) {
          try {
            mddLookup = await resources['.mdd'];
          } catch (e) {
            console.error('MDD load failed', e);
          }
        }

        const result = { mdxLookup, mddLookup, filePath };
        mdxInstances.set(filePath, result);
        return result;

      } catch (e) {
        console.error('Load mdict failed', e);
        throw new Error(`词典加载失败: ${e.message}`);
      }
    },

    unload(filePath) {
      mdxInstances.delete(filePath);
    }
  };

  const MDX_CONFIG_KEY = 'mdict-config';

  window.getMdxDictConfig = () => {
    const doc = utools.db.get(MDX_CONFIG_KEY);
    if (!doc) return [];
    return doc.dicts || doc.data || [];
  };

  window.saveMdxDictConfig = (dicts) => {
    const doc = utools.db.get(MDX_CONFIG_KEY);
    utools.db.put({
      _id: MDX_CONFIG_KEY,
      dicts: dicts,
      _rev: doc ? doc._rev : undefined
    });
  };

  window.selectMdxFiles = () => {
    const files = utools.showOpenDialog({
      title: '选择 MDX 词典文件',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'MDX Dictionaries', extensions: ['mdx'] }]
    });
    
    if (!files || !files.length) return null;

    const config = window.getMdxDictConfig();
    const already = new Set(config.map(d => d.path));
    
    for (const f of files) {
      if (!already.has(f)) {
        config.push({
          path: f,
          name: path.basename(f)
        });
      }
    }
    
    window.saveMdxDictConfig(config);
    return config;
  };

  window.removeMdxDict = (filePath) => {
    const config = window.getMdxDictConfig();
    const newConfig = config.filter(d => d.path !== filePath);
    window.saveMdxDictConfig(newConfig);
    mdxInstances.delete(filePath);
    return newConfig;
  };

  window.updateMdxDictOrder = (dicts) => {
    window.saveMdxDictConfig(dicts);
    return dicts;
  };

  async function queryInDict(filePath, word) {
    try {
      const { mdxLookup, mddLookup } = await window.dictMdxLoader.load(filePath);
      
      if (!mdxLookup) {
        throw new Error('词典查询函数未就绪');
      }
      
      let result = '';
      try {
        const definitions = await mdxLookup(word);
        if (Array.isArray(definitions) && definitions.length > 0) {
          result = definitions.join('\n<hr>\n');
        }
      } catch (e) {
        if (typeof e === 'string' && e.includes('NOT FOUND')) {
          result = '';
        } else {
          throw e;
        }
      }
      
      if (result && mddLookup) {
        try {
          result = await replaceResources(result, mddLookup);
        } catch (e) {
          console.error('Resource replacement failed', e);
        }
      }

      return {
        dictPath: filePath,
        dictName: path.basename(filePath),
        ok: !!result,
        content: result
      };
    } catch (e) {
      const errMsg = e && e.message ? e.message : String(e);
      return {
        dictPath: filePath,
        dictName: path.basename(filePath),
        ok: false,
        error: errMsg
      };
    }
  }

  window.queryMdxWord = async (word) => {
    const w = (word || '').trim();
    if (!w) return [];
    
    const config = window.getMdxDictConfig();
    
    const promises = config
      .filter(d => fs.existsSync(d.path))
      .map(d => queryInDict(d.path, w));
    
    return await Promise.all(promises);
  };

  window.queryFirstMdxWord = async (word) => {
    const w = (word || '').trim();
    if (!w) return null;

    const config = window.getMdxDictConfig();
    const firstDict = config[0];
    if (!firstDict || !firstDict.path || !fs.existsSync(firstDict.path)) return null;

    return await queryInDict(firstDict.path, w);
  };

  window.services = {
    selectDictFiles: window.selectMdxFiles,
    getDictList: window.getMdxDictConfig,
    updateDictOrder: window.updateMdxDictOrder,
    removeDict: window.removeMdxDict,
    queryWord: window.queryMdxWord
  };
} else {
  window.getMdxDictConfig = () => [];
  window.saveMdxDictConfig = () => {};
  window.selectMdxFiles = () => null;
  window.removeMdxDict = () => [];
  window.updateMdxDictOrder = () => [];
  window.queryMdxWord = async () => [];
  window.queryFirstMdxWord = async () => null;
  window.dictMdxLoader = {
    load: async () => { throw new Error('mdict not available in dev mode'); },
    unload: () => {}
  };
  window.services = {
    selectDictFiles: window.selectMdxFiles,
    getDictList: window.getMdxDictConfig,
    updateDictOrder: window.updateMdxDictOrder,
    removeDict: window.removeMdxDict,
    queryWord: window.queryMdxWord
  };
}
