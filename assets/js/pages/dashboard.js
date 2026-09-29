/**
 * Dashboard Page
 */
const DashboardPage = {
  render() {
    const container = document.getElementById('page-container');
    const units = Store.getUnits();
    
    if (units.length === 0) {
      this.renderEmptyState(container);
      return;
    }
    
    const stats = this.calculateStats(units);
    
    let html = `
      <div class="page-header">
        <h1 class="page-title">Dashboard Geral</h1>
      </div>
      
      <div class="summary-grid">
        <div class="card summary-card">
          <span class="label">Total Unidades</span>
          <span class="value">${stats.total}</span>
        </div>
        <div class="card summary-card" style="border-left: 4px solid var(--success)">
          <span class="label">Online</span>
          <span class="value">${stats.online}</span>
        </div>
        <div class="card summary-card" style="border-left: 4px solid var(--danger)">
          <span class="label">Offline</span>
          <span class="value">${stats.offline}</span>
        </div>
        <div class="card summary-card" style="border-left: 4px solid var(--warning)">
          <span class="label">Em Alarme</span>
          <span class="value">${stats.alarm}</span>
        </div>
      </div>
      
      <div class="summary-grid">
        <div class="card summary-card">
          <span class="label">Geração Hoje</span>
          <span class="value">${EnergyUtils.formatKwh(stats.todayGen)}</span>
        </div>
        <div class="card summary-card">
          <span class="label">Geração Acumulada</span>
          <span class="value">${EnergyUtils.formatMwh(stats.accumulatedGen)}</span>
        </div>
        <div class="card summary-card">
          <span class="label">Dentro do Esperado</span>
          <span class="value text-success">${stats.onExpected}</span>
        </div>
        <div class="card summary-card">
          <span class="label">Abaixo do Esperado</span>
          <span class="value text-danger">${stats.belowExpected}</span>
        </div>
      </div>
      
      <div class="card mb-4">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="font-size: 18px;">Usinas Monitoradas</h2>
          <div style="width: 300px;">
            <input type="text" id="dash-search" class="form-control" placeholder="Pesquisar usina...">
          </div>
        </div>
        
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Unidade</th>
                <th>Status</th>
                <th>Potência Atual</th>
                <th>Geração Hoje</th>
                <th>Desempenho</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody id="dash-units-tbody">
              <!-- Rows inserted here -->
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
    
    this.renderUnitsTable(units, '');
    
    document.getElementById('dash-search').addEventListener('input', (e) => {
      this.renderUnitsTable(units, e.target.value);
    });
  },
  
  renderEmptyState(container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 100px 20px;">
        <div style="font-size: 48px; margin-bottom: 20px;">☀️</div>
        <h2>Bem-vindo ao Solar Monitor FoxESS</h2>
        <p class="text-muted mb-4" style="margin-top: 10px;">Nenhuma unidade cadastrada. Comece adicionando sua primeira usina.</p>
        <button class="btn btn-primary" onclick="Router.navigate('/units')">
          + Cadastrar Unidade
        </button>
      </div>
    `;
  },
  
  calculateStats(units) {
    let stats = {
      total: units.length,
      online: 0, offline: 0, alarm: 0, noComm: 0,
      todayGen: 0, accumulatedGen: 0,
      onExpected: 0, belowExpected: 0
    };
    
    units.forEach(unit => {
      const cached = Store.getCachedData(unit.id);
      if (!cached) {
        stats.noComm++;
        return;
      }
      
      const status = cached.status;
      if (status === 1) stats.online++;
      else if (status === 2) stats.alarm++;
      else if (status === 3) stats.offline++;
      else stats.noComm++;
      
      const genToday = cached.generation?.today || 0;
      stats.todayGen += genToday;
      stats.accumulatedGen += cached.generation?.accumulated || 0;
      
      const expected = EnergyUtils.calculateDailyExpected(unit.annualExpectedKwh);
      const perf = EnergyUtils.calculatePerformance(genToday, expected);
      
      if (perf >= 95) stats.onExpected++;
      else if (perf > 0) stats.belowExpected++;
    });
    
    return stats;
  },
  
  renderUnitsTable(units, filterText) {
    const tbody = document.getElementById('dash-units-tbody');
    if (!tbody) return;
    
    let html = '';
    
    const filtered = units.filter(u => u.name.toLowerCase().includes(filterText.toLowerCase()));
    
    filtered.forEach(unit => {
      const cached = Store.getCachedData(unit.id);
      const statusCode = cached ? cached.status : 4;
      const status = FoxESS.mapStatus(statusCode);
      
      const power = cached?.realtime?.generationPower || 0;
      const genToday = cached?.generation?.today || 0;
      const expected = EnergyUtils.calculateDailyExpected(unit.annualExpectedKwh);
      const perf = EnergyUtils.calculatePerformance(genToday, expected);
      const perfStatus = EnergyUtils.getPerformanceStatus(perf);
      
      html += `
        <tr class="clickable" onclick="Router.navigate('/plant/${unit.id}')">
          <td><strong style="color: var(--text-primary)">${unit.name}</strong><br><small class="text-muted">${unit.installedKwp} kWp</small></td>
          <td><span class="badge ${status.className}">${status.icon} ${status.label}</span></td>
          <td>${EnergyUtils.formatKw(power)}</td>
          <td>${EnergyUtils.formatKwh(genToday)}</td>
          <td><span class="${perfStatus.class}" style="font-weight: 500">${perf.toFixed(1)}% ${perfStatus.icon}</span></td>
          <td><button class="btn btn-secondary">Ver</button></td>
        </tr>
      `;
    });
    
    if (filtered.length === 0) {
      html = `<tr><td colspan="6" style="text-align: center; padding: 30px;">Nenhuma usina encontrada</td></tr>`;
    }
    
    tbody.innerHTML = html;
  }
};
