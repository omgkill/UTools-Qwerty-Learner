const fs = require('fs');
const path = require('path');

window.fs = fs;
window.path = path;
window.process = process;

// Mode Handling
let currentMode = 'typing';
let currentAction = null;
if (typeof utools !== 'undefined') {
  utools.onPluginEnter((action) => {
    currentMode = action.code;
    currentAction = action;
    window.dispatchEvent(new CustomEvent('utools-mode-change', { detail: action }));
  });
}
window.getMode = () => currentMode;
window.getAction = () => currentAction;

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

// Local Word Bank Management (词库管理 - 用于背单词)
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

// 兼容旧接口名称 (Dictionary → WordBank)
window.readLocalDictConfig = window.readLocalWordBankConfig;
window.writeLocalDictConfig = window.writeLocalWordBankConfig;
window.newLocalDictFromJson = window.newLocalWordBankFromJson;
window.readLocalDict = window.readLocalWordBank;
window.delLocalDict = window.delLocalWordBank;
window.initLocalDictionries = window.initLocalWordBanks;

// Export Database
window.exportDatabase2UTools = () => {
};

// Migration
window.migrateLocalStorageToUtools = () => {
};

// Clear All Data
window.clearAllData = () => {
  try {
    const config = window.readLocalWordBankConfig();
    config.forEach((wordBank) => {
      if (wordBank.id) {
        utools.db.remove(wordBank.id);
      }
    });
    utools.db.remove(WORD_BANK_CONFIG_KEY);
    utools.db.remove('local-dict-config'); // 兼容旧数据
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

// ============================================
// MDX Dictionary Support (only in uTools environment)
// ============================================

if (typeof utools !== 'undefined') {
  // 动态加载 mdict，只在 uTools 环境中
  let mdictParser = null;
  try {
    mdictParser = require('mdict/mdict-parser.js');
  } catch (e) {
    console.warn('mdict module not available:', e.message);
  }

  const mdxInstances = new Map();

  // 获取 MIME 类型
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

  // 替换 HTML 中的资源为 base64
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
      } catch (e) {
        // 资源未找到是正常的，忽略错误
      }
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

  // MDX Dictionary Management (使用与 voca-plugin 相同的 key)
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

  // 在单个词典中查询 (与 voca-plugin queryInDict 逻辑一致)
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
      
      // 如果有结果且有 MDD，替换资源
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

  // Query word in MDX dictionaries (与 voca-plugin queryWord 逻辑一致)
  window.queryMdxWord = async (word) => {
    const w = (word || '').trim();
    if (!w) return [];
    
    const config = window.getMdxDictConfig();
    
    // 过滤存在的词典文件，并行查询
    const promises = config
      .filter(d => fs.existsSync(d.path))
      .map(d => queryInDict(d.path, w));
    
    return await Promise.all(promises);
  };

  // 兼容 voca-plugin 的接口命名
  window.services = {
    selectDictFiles: window.selectMdxFiles,
    getDictList: window.getMdxDictConfig,
    updateDictOrder: window.updateMdxDictOrder,
    removeDict: window.removeMdxDict,
    queryWord: window.queryMdxWord
  };
} else {
  // 开发环境 mock
  window.getMdxDictConfig = () => [];
  window.saveMdxDictConfig = () => {};
  window.selectMdxFiles = () => null;
  window.removeMdxDict = () => [];
  window.updateMdxDictOrder = () => [];
  window.queryMdxWord = async () => [];
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
