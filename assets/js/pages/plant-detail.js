/**
 * Plant Detail Page
 */
const PlantDetailPage = {
  dayChartInstance: null,
  historyChartInstance: null,
  
  render(unitId) {
    const container = document.getElementById('page-container');
    const unit = Store.getUnit(unitId);
    
    if (!unit) {
      container.innerHTML = `<div class="card"><h2 class="text-danger">Unidade não encontrada.</h2><br><button class="btn btn-primary" onclick="Router.navigate('/dashboard')">Voltar</button></div>`;
      return;
    }
    
    const cached = Store.getCachedData(unitId);
    const statusCode = cached ? cached.status : 4;
    const status = FoxESS.mapStatus(statusCode);
    
    const power = cached?.realtime?.generationPower || 0;
    const genToday = cached?.generation?.today || 0;
    const genAcc = cached?.generation?.accumulated || 0;
    const expected = EnergyUtils.calculateDailyExpected(unit.annualExpectedKwh);
    const perf = EnergyUtils.calculatePerformance(genToday, expected);
    const perfStatus = EnergyUtils.getPerformanceStatus(perf);
    
    // Cleanup previous charts
    this.destroyCharts();
    
    let html = `
      <div class="page-header" style="display: flex; flex-direction: column; align-items: flex-start; gap: 12px;">
        <button class="btn btn-secondary" style="font-size: 13px;" onclick="window.history.back()">← Voltar</button>
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
          <h1 class="page-title" style="margin:0">${unit.name}</h1>
          <span class="badge ${status.className}" style="font-size: 14px; padding: 6px 14px;">${status.icon} ${status.label}</span>
        </div>
      </div>
      
      <div class="metrics-grid">
        <div class="card summary-card">
          <span class="label">Potência Atual</span>
          <span class="value" style="color: var(--primary)">${EnergyUtils.formatKw(power)}</span>
        </div>
        <div class="card summary-card">
          <span class="label">Geração Hoje</span>
          <span class="value">${EnergyUtils.formatKwh(genToday)}</span>
        </div>
        <div class="card summary-card">
          <span class="label">Geração Acumulada</span>
          <span class="value">${EnergyUtils.formatMwh(genAcc)}</span>
        </div>
        <div class="card summary-card">
          <span class="label">Desempenho Diário</span>
          <span class="value ${perfStatus.class}">${perf.toFixed(1)}%</span>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 24px;">
        
        <!-- Coluna Esquerda -->
        <div>
          <!-- Gráfico do Dia -->
          <div class="card mb-4">
            <h2 style="font-size: 16px; margin-bottom: 16px;">Curva de Geração — Hoje</h2>
            <div class="chart-container">
              <canvas id="day-chart"></canvas>
            </div>
          </div>
          
          <!-- Histórico -->
          <div class="card">
            <h2 style="font-size: 16px; margin-bottom: 16px;">Histórico (7 Dias)</h2>
            <div class="chart-container" style="height: 250px;">
              <canvas id="history-chart"></canvas>
            </div>
          </div>
        </div>
        
        <!-- Coluna Direita -->
        <div>
          <!-- Relatório Resumo -->
          <div class="card mb-4">
            <h2 style="font-size: 16px; margin-bottom: 16px;">Relatório de Desempenho</h2>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span class="text-secondary">Esperado:</span>
              <strong>${EnergyUtils.formatKwh(expected)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span class="text-secondary">Realizado:</span>
              <strong>${EnergyUtils.formatKwh(genToday)}</strong>
            </div>
            
            <div class="performance-bar-container">
              <div class="performance-bar" style="width: ${Math.min(perf, 100)}%; background-color: ${perf >= 95 ? 'var(--success)' : (perf >= 75 ? 'var(--warning)' : 'var(--danger)')}"></div>
            </div>
            
            <div style="text-align: right; font-weight: 600; margin-bottom: 16px;" class="${perfStatus.class}">
              ${perfStatus.icon} ${perfStatus.label} (${perf.toFixed(1)}%)
            </div>
          </div>
          
          <!-- Parâmetros Elétricos -->
          <div class="card mb-4">
            <h2 style="font-size: 16px; margin-bottom: 16px;">Parâmetros Elétricos</h2>
            <div class="electrical-grid">
              <div class="electrical-item">
                <span class="text-secondary">Tensão PV</span>
                <strong>${cached?.realtime?.pvVolt || '0'} V</strong>
              </div>
              <div class="electrical-item">
                <span class="text-secondary">Corrente PV</span>
                <strong>${cached?.realtime?.pvCurrent || '0'} A</strong>
              </div>
              <div class="electrical-item">
                <span class="text-secondary">Temp. Inversor</span>
                <strong>${cached?.realtime?.invTemperat || '0'} °C</strong>
              </div>
              <div class="electrical-item">
                <span class="text-secondary">Pot. Injeção</span>
                <strong>${EnergyUtils.formatKw(cached?.realtime?.feedinPower || 0)}</strong>
              </div>
            </div>
          </div>
          
          <!-- Alarmes -->
          ${this.renderAlarms(cached?.alarms)}
        </div>
      </div>
    `;
    
    container.innerHTML = html;
    
    // Render Charts after DOM updates
    setTimeout(() => {
      this.renderDayChart(cached?.generation);
      this.renderHistoryChart(unit);
    }, 100);
  },
  
  renderAlarms(alarms) {
    if (!alarms || alarms.length === 0) return '';
    
    let alarmsHtml = alarms.map(a => `
      <div style="padding: 12px; border-left: 3px solid var(--danger); background: var(--danger-light); margin-bottom: 10px; border-radius: 4px;">
        <div style="font-weight: 600; color: var(--danger); font-size: 14px;">${a.code}: ${a.message}</div>
        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${DateUtils.formatDateTime(a.time)}</div>
      </div>
    `).join('');
    
    return `
      <div class="card border-danger">
        <h2 style="font-size: 16px; margin-bottom: 16px; color: var(--danger)">Alarmes Ativos</h2>
        ${alarmsHtml}
      </div>
    `;
  },
  
  destroyCharts() {
    if (this.dayChartInstance) this.dayChartInstance.destroy();
    if (this.historyChartInstance) this.historyChartInstance.destroy();
  },
  
  renderDayChart(generationData) {
    const ctx = document.getElementById('day-chart');
    if (!ctx) return;
    
    let labels = [];
    let data = [];
    
    if (generationData && generationData.series) {
      labels = generationData.series.labels;
      data = generationData.series.data;
    } else {
      // Empty mock
      for(let i=0; i<24; i++) {
        labels.push(`${i}:00`);
        data.push(0);
      }
    }
    
    this.dayChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Potência (kW)',
          data: data,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }
        }
      }
    });
  },
  
  renderHistoryChart(unit) {
    const ctx = document.getElementById('history-chart');
    if (!ctx) return;
    
    const expectedDaily = EnergyUtils.calculateDailyExpected(unit.annualExpectedKwh);
    
    // In a real scenario, we would load Store.getHistory(unit.id)
    // For demo purposes if it's empty we create mock 7 day data based on expected
    let history = Store.getHistory(unit.id);
    
    const dates = DateUtils.getLast7Days().reverse();
    const labels = dates.map(d => d.label);
    
    let realData = [];
    let expectedData = [];
    
    dates.forEach(d => {
      expectedData.push(expectedDaily);
      
      const entry = history.find(h => h.date === d.date);
      if (entry) {
        realData.push(entry.generated);
      } else {
        // Mock past data logic if no history
        if (d.label === 'Hoje') {
          const cached = Store.getCachedData(unit.id);
          realData.push(cached?.generation?.today || 0);
        } else {
          realData.push(expectedDaily * (0.7 + Math.random() * 0.5)); // Random between 70% and 120%
        }
      }
    });
    
    this.historyChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Realizado (kWh)',
            data: realData,
            backgroundColor: '#3b82f6',
            borderRadius: 4
          },
          {
            type: 'line',
            label: 'Esperado (kWh)',
            data: expectedData,
            borderColor: '#f59e0b',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  }
};
