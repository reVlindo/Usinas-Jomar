/**
 * Store - Gerenciamento de Estado e LocalStorage
 */
const Store = {
  data: {
    units: [],
    plantConfigs: {},
    cachedData: {},
    appSettings: {
      apiKey: '',
      updateInterval: 5,
      theme: 'light',
      dataMode: 'mock' // 'mock' or 'real'
    },
    history: {}
  },

  init() {
    this.load();
  },

  load() {
    const saved = localStorage.getItem('solarMonitorState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.data = { ...this.data, ...parsed };
      } catch (e) {
        console.error('Erro ao carregar dados do LocalStorage', e);
      }
    }
  },

  save() {
    localStorage.setItem('solarMonitorState', JSON.stringify(this.data));
  },

  // Units
  getUnits() {
    return this.data.units;
  },
  
  getUnit(id) {
    return this.data.units.find(u => u.id === id);
  },

  addUnit(unit) {
    unit.id = 'unit_' + Date.now();
    unit.createdAt = new Date().toISOString();
    this.data.units.push(unit);
    
    // Create config
    this.data.plantConfigs[unit.id] = {
      installedKwp: unit.installedKwp,
      annualExpectedKwh: unit.annualExpectedKwh
    };
    
    this.save();
    return unit;
  },

  updateUnit(id, unitData) {
    const index = this.data.units.findIndex(u => u.id === id);
    if (index !== -1) {
      this.data.units[index] = { ...this.data.units[index], ...unitData };
      this.data.plantConfigs[id] = {
        installedKwp: this.data.units[index].installedKwp,
        annualExpectedKwh: this.data.units[index].annualExpectedKwh
      };
      this.save();
    }
  },

  deleteUnit(id) {
    this.data.units = this.data.units.filter(u => u.id !== id);
    delete this.data.plantConfigs[id];
    delete this.data.cachedData[id];
    delete this.data.history[id];
    this.save();
  },

  // Cached Data
  getCachedData(unitId) {
    return this.data.cachedData[unitId] || null;
  },

  setCachedData(unitId, data) {
    this.data.cachedData[unitId] = {
      ...data,
      lastUpdate: new Date().toISOString()
    };
    this.save();
  },
  
  clearCache() {
    this.data.cachedData = {};
    this.save();
  },

  // Settings
  getSettings() {
    return this.data.appSettings;
  },

  saveSettings(settings) {
    this.data.appSettings = { ...this.data.appSettings, ...settings };
    this.save();
  },

  // History
  getHistory(unitId) {
    return this.data.history[unitId] || [];
  },

  addHistoryEntry(unitId, entry) {
    if (!this.data.history[unitId]) {
      this.data.history[unitId] = [];
    }
    // Remove if same date
    this.data.history[unitId] = this.data.history[unitId].filter(h => h.date !== entry.date);
    this.data.history[unitId].push(entry);
    
    // Sort and keep last 30
    this.data.history[unitId].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (this.data.history[unitId].length > 30) {
      this.data.history[unitId].shift();
    }
    this.save();
  },

  clearAll() {
    localStorage.removeItem('solarMonitorState');
    this.data = {
      units: [],
      plantConfigs: {},
      cachedData: {},
      appSettings: { apiKey: '', updateInterval: 5, theme: 'light', dataMode: 'mock' },
      history: {}
    };
  }
};

Store.init();
