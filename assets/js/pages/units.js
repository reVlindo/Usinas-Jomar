/**
 * Units Management Page
 */
const UnitsPage = {
  render() {
    const container = document.getElementById('page-container');
    const units = Store.getUnits();
    
    let html = `
      <div class="page-header">
        <h1 class="page-title">Gerenciamento de Unidades</h1>
        <button class="btn btn-primary" onclick="UnitsPage.openModal(null)">+ Nova Unidade</button>
      </div>
      
      <div class="mb-4" style="max-width: 400px;">
        <input type="text" id="units-search" class="form-control" placeholder="Pesquisar unidade...">
      </div>
      
      <div id="units-grid" class="units-grid">
        <!-- Units injected here -->
      </div>
      
      <!-- Modal -->
      <div id="unit-modal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title" id="modal-title">Nova Unidade</h3>
            <button class="modal-close" onclick="UnitsPage.closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="unit-form">
              <input type="hidden" id="unit-id">
              
              <div class="form-group">
                <label class="form-label">Nome da Unidade *</label>
                <input type="text" id="unit-name" class="form-control" required placeholder="Ex: Casa Praia">
              </div>
              
              <div class="form-group">
                <label class="form-label">ID da Planta (FoxESS) *</label>
                <div style="display: flex; gap: 10px;">
                  <input type="text" id="unit-plant-id" class="form-control" required placeholder="Ex: a1b2c3d4">
                  <button type="button" class="btn btn-secondary" onclick="UnitsPage.searchFoxPlants()">Buscar</button>
                </div>
                <div id="plant-dropdown-container" style="margin-top: 8px; display: none;">
                  <select id="plant-dropdown" class="form-control" onchange="UnitsPage.selectPlant()"></select>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">Número de Série do Inversor *</label>
                <input type="text" id="unit-device-sn" class="form-control" required placeholder="Ex: 60BE000000">
              </div>
              
              <div class="electrical-grid">
                <div class="form-group">
                  <label class="form-label">Potência Instalada (kWp) *</label>
                  <input type="number" id="unit-kwp" class="form-control" step="0.01" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Ger. Esperada (kWh/ano) *</label>
                  <input type="number" id="unit-kwh" class="form-control" required>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="UnitsPage.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="UnitsPage.saveUnit()">Salvar</button>
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
    this.renderUnitsGrid(units, '');
    
    document.getElementById('units-search').addEventListener('input', (e) => {
      this.renderUnitsGrid(units, e.target.value);
    });
  },
  
  renderUnitsGrid(units, filterText) {
    const grid = document.getElementById('units-grid');
    if (!grid) return;
    
    const filtered = units.filter(u => u.name.toLowerCase().includes(filterText.toLowerCase()));
    
    let html = '';
    
    if (filtered.length === 0) {
      html = `<div style="grid-column: 1 / -1; padding: 40px; text-align: center; background: white; border-radius: var(--radius); border: 1px solid var(--border);">Nenhuma unidade encontrada.</div>`;
    } else {
      filtered.forEach(unit => {
        const cached = Store.getCachedData(unit.id);
        const statusCode = cached ? cached.status : 4;
        const status = FoxESS.mapStatus(statusCode);
        
        html += `
          <div class="card">
            <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
              <h3 style="font-size: 16px;">${unit.name}</h3>
              <span class="badge ${status.className}">${status.icon}</span>
            </div>
            
            <div style="margin-bottom: 20px; font-size: 14px; color: var(--text-secondary);">
              <div><strong style="color: var(--text-primary)">SN:</strong> ${unit.deviceSn}</div>
              <div><strong style="color: var(--text-primary)">Potência:</strong> ${unit.installedKwp} kWp</div>
              <div><strong style="color: var(--text-primary)">Esp. Anual:</strong> ${unit.annualExpectedKwh} kWh</div>
            </div>
            
            <div style="display: flex; gap: 8px; border-top: 1px solid var(--border); padding-top: 16px;">
              <button class="btn btn-primary" style="flex: 1" onclick="Router.navigate('/plant/${unit.id}')">Ver Planta</button>
              <button class="btn btn-secondary" onclick="UnitsPage.openModal('${unit.id}')">Editar</button>
              <button class="btn btn-danger" onclick="UnitsPage.deleteUnit('${unit.id}')">🗑️</button>
            </div>
          </div>
        `;
      });
    }
    
    grid.innerHTML = html;
  },
  
  openModal(unitId) {
    const modal = document.getElementById('unit-modal');
    const form = document.getElementById('unit-form');
    form.reset();
    document.getElementById('plant-dropdown-container').style.display = 'none';
    
    if (unitId) {
      document.getElementById('modal-title').innerText = 'Editar Unidade';
      const unit = Store.getUnit(unitId);
      if (unit) {
        document.getElementById('unit-id').value = unit.id;
        document.getElementById('unit-name').value = unit.name;
        document.getElementById('unit-plant-id').value = unit.plantId;
        document.getElementById('unit-device-sn').value = unit.deviceSn;
        document.getElementById('unit-kwp').value = unit.installedKwp;
        document.getElementById('unit-kwh').value = unit.annualExpectedKwh;
      }
    } else {
      document.getElementById('modal-title').innerText = 'Nova Unidade';
      document.getElementById('unit-id').value = '';
    }
    
    modal.classList.add('active');
  },
  
  closeModal() {
    document.getElementById('unit-modal').classList.remove('active');
  },
  
  saveUnit() {
    const form = document.getElementById('unit-form');
    if (!form.checkValidity()) {
      App.showNotification('Preencha os campos obrigatórios', 'error');
      return;
    }
    
    const id = document.getElementById('unit-id').value;
    const unitData = {
      name: document.getElementById('unit-name').value,
      plantId: document.getElementById('unit-plant-id').value,
      deviceSn: document.getElementById('unit-device-sn').value,
      installedKwp: parseFloat(document.getElementById('unit-kwp').value),
      annualExpectedKwh: parseFloat(document.getElementById('unit-kwh').value)
    };
    
    if (id) {
      Store.updateUnit(id, unitData);
      App.showNotification('Unidade atualizada com sucesso', 'success');
    } else {
      Store.addUnit(unitData);
      App.showNotification('Unidade cadastrada com sucesso', 'success');
    }
    
    this.closeModal();
    this.render(); // Re-render
    App.fetchAllData(); // Fetch dados para a nova unidade
  },
  
  deleteUnit(id) {
    if (confirm('Tem certeza que deseja excluir esta unidade? Todos os dados em cache serão perdidos.')) {
      Store.deleteUnit(id);
      App.showNotification('Unidade excluída', 'success');
      this.render();
    }
  },
  
  async searchFoxPlants() {
    const settings = Store.getSettings();
    if (settings.dataMode === 'mock') {
      const mockList = MockData.plants.map(p => ({ plantID: p.plantId, name: p.name }));
      this.populatePlantDropdown(mockList);
      return;
    }
    
    if (!settings.apiKey) {
      App.showNotification('API Key não configurada', 'error');
      return;
    }
    
    try {
      document.getElementById('plant-dropdown-container').style.display = 'block';
      const dropdown = document.getElementById('plant-dropdown');
      dropdown.innerHTML = '<option>Buscando...</option>';
      
      const response = await FoxESS.getPlantList();
      if (response && response.data) {
        this.populatePlantDropdown(response.data);
      } else {
        dropdown.innerHTML = '<option>Nenhuma planta encontrada</option>';
      }
    } catch (e) {
      App.showNotification('Erro ao buscar plantas', 'error');
    }
  },
  
  populatePlantDropdown(plants) {
    const container = document.getElementById('plant-dropdown-container');
    const dropdown = document.getElementById('plant-dropdown');
    
    if (!plants || plants.length === 0) {
      dropdown.innerHTML = '<option>Nenhuma planta encontrada</option>';
      return;
    }
    
    let html = '<option value="">-- Selecione uma Planta --</option>';
    plants.forEach(p => {
      html += `<option value="${p.plantID}">${p.name}</option>`;
    });
    
    dropdown.innerHTML = html;
    container.style.display = 'block';
  },
  
  selectPlant() {
    const dropdown = document.getElementById('plant-dropdown');
    const plantId = dropdown.value;
    const plantName = dropdown.options[dropdown.selectedIndex].text;
    
    if (plantId) {
      document.getElementById('unit-plant-id').value = plantId;
      if (!document.getElementById('unit-name').value) {
        document.getElementById('unit-name').value = plantName;
      }
      
      // Attempt to fetch device SN automatically
      const settings = Store.getSettings();
      if (settings.dataMode === 'real' && settings.apiKey) {
        FoxESS.getDeviceList(plantId).then(res => {
          if (res && res.data && res.data.length > 0) {
            document.getElementById('unit-device-sn').value = res.data[0].deviceSN;
          }
        });
      } else if (settings.dataMode === 'mock') {
        const mockP = MockData.plants.find(p => p.plantId === plantId);
        if (mockP) {
          document.getElementById('unit-device-sn').value = mockP.deviceSn;
          document.getElementById('unit-kwp').value = mockP.installedKwp;
          document.getElementById('unit-kwh').value = mockP.annualExpectedKwh;
        }
      }
    }
  }
};
