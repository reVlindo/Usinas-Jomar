/**
 * Settings Page
 */
const SettingsPage = {
  render() {
    const container = document.getElementById('page-container');
    const settings = Store.getSettings();
    
    let html = `
      <div class="page-header">
        <h1 class="page-title">Configurações</h1>
      </div>
      
      <div style="max-width: 800px;">
        
        <div class="card mb-4">
          <h2 style="font-size: 18px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--border)">Integração FoxESS API</h2>
          
          <div class="form-group">
            <label class="form-label">API Key</label>
            <div style="display: flex; gap: 10px;">
              <input type="password" id="setting-apikey" class="form-control" value="${settings.apiKey || ''}" placeholder="Cole sua API Key aqui">
              <button class="btn btn-secondary" onclick="SettingsPage.togglePassword()">👁️</button>
            </div>
            <small class="text-muted" style="display: block; margin-top: 8px;">Obtenha sua chave no FoxESS Cloud (Perfil > Gerenciamento de API).</small>
          </div>
          
          <div style="margin-top: 20px;">
            <button class="btn btn-primary" onclick="SettingsPage.testConnection()">Testar Conexão</button>
            <span id="test-result" style="margin-left: 15px; font-weight: 500;"></span>
          </div>
        </div>

        <div class="card mb-4">
          <h2 style="font-size: 18px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--border)">Sistema</h2>
          
          <div class="form-group mb-4">
            <label class="form-label">Modo de Dados</label>
            <div style="display: flex; gap: 20px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="radio" name="setting-datamode" value="real" ${settings.dataMode === 'real' ? 'checked' : ''}>
                Dados Reais (API FoxESS)
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="radio" name="setting-datamode" value="mock" ${settings.dataMode === 'mock' ? 'checked' : ''}>
                Modo Demonstração
              </label>
            </div>
            <div id="mock-warning" class="text-warning" style="margin-top: 8px; font-size: 13px; display: ${settings.dataMode === 'mock' ? 'block' : 'none'}">
              ⚠️ O modo demonstração está ativo. Os dados apresentados são simulados.
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Intervalo de Atualização (minutos)</label>
            <select id="setting-interval" class="form-control" style="max-width: 200px;">
              <option value="1" ${settings.updateInterval == 1 ? 'selected' : ''}>1 minuto</option>
              <option value="2" ${settings.updateInterval == 2 ? 'selected' : ''}>2 minutos</option>
              <option value="5" ${settings.updateInterval == 5 ? 'selected' : ''}>5 minutos (Recomendado)</option>
              <option value="10" ${settings.updateInterval == 10 ? 'selected' : ''}>10 minutos</option>
              <option value="15" ${settings.updateInterval == 15 ? 'selected' : ''}>15 minutos</option>
              <option value="30" ${settings.updateInterval == 30 ? 'selected' : ''}>30 minutos</option>
            </select>
          </div>
        </div>
        
        <div class="card mb-4">
          <h2 style="font-size: 18px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--border)">Gerenciamento de Dados</h2>
          
          <div style="display: flex; flex-wrap: wrap; gap: 15px;">
            <button class="btn btn-secondary" onclick="SettingsPage.clearCache()">Limpar Cache</button>
            <button class="btn btn-secondary" onclick="SettingsPage.exportData()">Exportar Backup</button>
            <label class="btn btn-secondary" style="margin: 0; display: inline-flex; cursor: pointer;">
              Importar Backup
              <input type="file" style="display: none" accept=".json" onchange="SettingsPage.importData(event)">
            </label>
            <button class="btn btn-danger" style="margin-left: auto;" onclick="SettingsPage.factoryReset()">Apagar Tudo</button>
          </div>
        </div>
        
        <div style="display: flex; justify-content: flex-end;">
          <button class="btn btn-primary" style="font-size: 16px; padding: 12px 24px;" onclick="SettingsPage.saveSettings()">Salvar Configurações</button>
        </div>
        
      </div>
    `;
    
    container.innerHTML = html;
    
    // Add event listener for radio change
    document.querySelectorAll('input[name="setting-datamode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        document.getElementById('mock-warning').style.display = e.target.value === 'mock' ? 'block' : 'none';
      });
    });
  },
  
  togglePassword() {
    const input = document.getElementById('setting-apikey');
    if (input.type === 'password') {
      input.type = 'text';
    } else {
      input.type = 'password';
    }
  },
  
  async testConnection() {
    const apiKey = document.getElementById('setting-apikey').value;
    const resultEl = document.getElementById('test-result');
    
    if (!apiKey) {
      resultEl.innerHTML = '<span class="text-danger">Por favor, insira a API Key primeiro.</span>';
      return;
    }
    
    resultEl.innerHTML = '<span class="text-muted">Testando conexão...</span>';
    
    // Temporarily set API key to test
    FoxESS.init(apiKey);
    
    try {
      const result = await FoxESS.getUserInfo();
      if (result) {
        resultEl.innerHTML = '<span class="text-success">✅ Conexão bem-sucedida!</span>';
      } else {
        resultEl.innerHTML = '<span class="text-danger">❌ Falha na conexão. Verifique a chave ou o proxy CORS.</span>';
      }
    } catch (e) {
      resultEl.innerHTML = '<span class="text-danger">❌ Erro de comunicação (Verifique console/CORS).</span>';
    }
  },
  
  saveSettings() {
    const newSettings = {
      apiKey: document.getElementById('setting-apikey').value,
      updateInterval: parseInt(document.getElementById('setting-interval').value),
      dataMode: document.querySelector('input[name="setting-datamode"]:checked').value
    };
    
    Store.saveSettings(newSettings);
    App.showNotification('Configurações salvas', 'success');
    
    // Restart logic
    App.startAutoUpdate();
    if (newSettings.dataMode === 'real') {
      FoxESS.init(newSettings.apiKey);
    }
  },
  
  clearCache() {
    Store.clearCache();
    App.showNotification('Cache de dados limpo', 'success');
    App.fetchAllData();
  },
  
  exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(Store.data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "solar_monitor_backup_" + DateUtils.formatApiDate() + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  },
  
  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.units && data.appSettings) {
          localStorage.setItem('solarMonitorState', JSON.stringify(data));
          App.showNotification('Backup restaurado. Recarregando...', 'success');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          App.showNotification('Arquivo de backup inválido', 'error');
        }
      } catch (err) {
        App.showNotification('Erro ao ler arquivo', 'error');
      }
    };
    reader.readAsText(file);
  },
  
  factoryReset() {
    if (confirm('ATENÇÃO: Isto apagará TODAS as unidades e configurações do sistema. Tem certeza?')) {
      Store.clearAll();
      App.showNotification('Sistema resetado', 'success');
      setTimeout(() => window.location.hash = '#/dashboard', 1000);
    }
  }
};
