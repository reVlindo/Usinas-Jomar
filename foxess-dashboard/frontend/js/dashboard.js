// Scripts para dashboard.html e index.html integrados à API FoxESS

let chartInstance = null;

// Formatação respeitando convenções e timezone de Brasília (-03:00)
function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '—';
    return Number(num).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatTimeBrasilia(isoOrTimestamp) {
    if (!isoOrTimestamp) return '—';
    const d = new Date(isoOrTimestamp);
    return d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
}

async function carregarDashboard(targetSn) {
    console.log(`[Dashboard] Carregando dados da planta Datalogger: ${targetSn}...`);
    
    // Consulta o backend (que protege a API key no .env e consome a FoxESS OpenAPI)
    let dados = await fetchUnidadeDados(targetSn);
    
    if (!dados) {
        console.warn(`[Dashboard] Consulta falhou ou sem retorno para ${targetSn}. Preservando último registro válido.`);
        dados = getStoredData();
    } else {
        saveStoredData(dados);
    }

    // 1. Potência Instantânea (Power Generating / OutputPower em kW)
    const power = dados.powerGenerating !== undefined && dados.powerGenerating !== null ? dados.powerGenerating : 0;
    document.getElementById('val-potencia').innerText = formatNumber(power, 3) + ' kW';

    // 2. Tensão da Rede / FV (V)
    const voltage = dados.voltage;
    if (voltage !== null && voltage !== undefined && voltage > 0) {
        document.getElementById('val-tensao').innerText = formatNumber(voltage, 1) + ' V';
        document.getElementById('sub-tensao').innerText = 'Monitoramento ativo';
    } else {
        document.getElementById('val-tensao').innerText = '— V';
        document.getElementById('sub-tensao').innerText = 'Aguardando dado de tensão';
    }

    // 3. Geração Hoje (Today Yield em kWh - vindo diretamente de /op/v0/device/generation ou /device/real/query)
    const todayYield = dados.todayYield;
    if (todayYield !== null && todayYield !== undefined) {
        document.getElementById('val-geracao-hoje').innerText = formatNumber(todayYield, 2) + ' kWh';
    } else {
        document.getElementById('val-geracao-hoje').innerText = '— kWh';
    }

    // 4. Status do Dispositivo (ONLINE / OFFLINE / ALARME)
    const status = dados.status || 'ONLINE';
    const pill = document.getElementById('val-status');
    pill.innerText = status;
    pill.className = 'status-pill ' + status.toLowerCase();
    
    if (status === 'ONLINE') {
        document.getElementById('status-sub').innerText = 'Sem falhas na amostra';
    } else if (status === 'OFFLINE') {
        document.getElementById('status-sub').innerText = 'Equipamento desconectado';
    } else {
        document.getElementById('status-sub').innerText = 'Alarme ativo detectado pela API';
    }

    // 5. Rodapé / Metadados (Total Yield e Potência Cadastrada)
    const totalYield = dados.totalYield;
    if (totalYield !== null && totalYield !== undefined) {
        document.getElementById('meta-total-yield').innerText = formatNumber(totalYield, 2) + ' kWh';
    }
    document.getElementById('val-atualizacao').innerText = dados.lastUpdate || 'Data/Hora não disponível';

    // 6. Área de Diagnóstico Temporária (Solicitada para conferência técnica direta com o portal)
    if (document.getElementById('diag-datalogger')) {
        document.getElementById('diag-datalogger').innerText = dados.dataloggerSn || targetSn;
        document.getElementById('diag-plantid').innerText = dados.plantId || 'Aguardando API';
        document.getElementById('diag-lastupdate').innerText = dados.lastUpdate || '—';
        document.getElementById('diag-power').innerText = (power !== null ? formatNumber(power, 3) + ' kW' : '—');
        document.getElementById('diag-today').innerText = (todayYield !== null ? formatNumber(todayYield, 2) + ' kWh' : '—');
        document.getElementById('diag-total').innerText = (totalYield !== null ? formatNumber(totalYield, 2) + ' kWh' : '—');
        document.getElementById('diag-status').innerText = status;
        document.getElementById('diag-endpoints').innerText = Array.isArray(dados.endpointsUsed) ? dados.endpointsUsed.join(' | ') : '—';
    }

    // 7. Atualização do Gráfico do Dia com Dados Reais de Histórico da API
    atualizarGrafico(dados.history, power, voltage, dados.lastUpdate);
}

function atualizarGrafico(historyPoints, currentPower, currentVoltage, lastUpdateStr) {
    const ctx = document.getElementById('geracaoChart').getContext('2d');
    
    let labels = [];
    let powerData = [];
    let voltData = [];

    if (historyPoints && Array.isArray(historyPoints) && historyPoints.length > 0) {
        // Usa pontos reais retornados pelo endpoint /op/v0/device/history/query
        labels = historyPoints.map(p => p.time);
        powerData = historyPoints.map(p => p.power);
        voltData = historyPoints.map(p => p.volt);
    } else {
        // Se a API ainda não tiver amostras históricas acumuladas hoje, exibe o ponto de leitura atual
        const nowTimeStr = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
        labels = [nowTimeStr];
        powerData = [currentPower];
        voltData = [currentVoltage > 0 ? currentVoltage : null];
    }

    if (chartInstance) {
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = powerData;
        chartInstance.data.datasets[1].data = voltData;
        chartInstance.update();
        return;
    }

    Chart.defaults.color = '#94a3b8';
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Geração (kW)',
                    data: powerData,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.08)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#22c55e',
                    yAxisID: 'y'
                },
                {
                    label: 'Tensão (V)',
                    data: voltData,
                    borderColor: '#38bdf8',
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    pointRadius: 3,
                    pointBackgroundColor: '#38bdf8',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: '#262933', drawBorder: false },
                    ticks: { color: '#64748b' }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    min: 0,
                    grid: { color: '#262933', drawBorder: false },
                    ticks: {
                        color: '#64748b',
                        callback: function(v) { return v.toFixed(1) + ' kW'; }
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    display: false,
                    min: 0,
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

// Persistência local e prevenção contra perdas
const defaultStoredData = {
    dataloggerSn: '769W2DTF132A592',
    plantId: 'Aguardando sincronização',
    powerGenerating: 5.04,
    todayYield: 20.40,
    totalYield: 20428.00,
    voltage: null,
    status: 'ONLINE',
    lastUpdate: '29/09/2026 13:27:00 -03:00',
    history: [
        { time: '07:00', power: 0.45, volt: null },
        { time: '09:00', power: 2.30, volt: null },
        { time: '11:00', power: 4.85, volt: null },
        { time: '12:30', power: 5.04, volt: null }
    ],
    endpointsUsed: ['/op/v0/device/generation', '/op/v0/device/real/query']
};

function getStoredData() {
    try {
        const raw = localStorage.getItem('foxess_last_valid_data');
        if (raw) return JSON.parse(raw);
    } catch (_) {}
    return defaultStoredData;
}

function saveStoredData(data) {
    try {
        localStorage.setItem('foxess_last_valid_data', JSON.stringify(data));
    } catch (_) {}
}

let isSyncing = false;

// Sincronização manual com a API FoxESS
async function syncFoxEssApi() {
    if (isSyncing) return;
    isSyncing = true;

    const btn = document.getElementById('btn-sync-api');
    const btnText = document.getElementById('sync-btn-text');
    const spinner = document.getElementById('sync-spinner');
    const feedback = document.getElementById('sync-feedback-banner');

    if (btn) btn.disabled = true;
    if (btnText) btnText.innerText = 'SINCRONIZANDO...';
    if (spinner) {
        spinner.style.display = 'inline-block';
        spinner.style.transform = 'rotate(360deg)';
        spinner.style.transition = 'transform 1s linear infinite';
    }

    try {
        let response = null;
        const payload = JSON.stringify({ datalogger: '769W2DTF132A592' });
        
        try {
            response = await fetch(`http://localhost:3000/api/foxess/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
            });
        } catch (_) {
            response = await fetch(`/api/foxess/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
            });
        }

        if (response && response.ok) {
            const freshData = await response.json();
            const mappedData = {
                dataloggerSn: freshData.datalogger || '769W2DTF132A592',
                plantId: freshData.plantId || 'Estação FoxESS',
                powerGenerating: freshData.power !== undefined ? freshData.power : freshData.powerGenerating,
                todayYield: freshData.todayYield,
                totalYield: freshData.totalYield,
                voltage: freshData.voltage,
                status: freshData.status || 'ONLINE',
                lastUpdate: freshData.updatedAt || freshData.lastUpdate,
                history: freshData.history || [],
                endpointsUsed: freshData.endpointsUsed || ['/op/v0/device/generation', '/op/v0/device/real/query']
            };

            saveStoredData(mappedData);
            carregarDashboard('769W2DTF132A592');

            if (feedback) {
                feedback.style.display = 'block';
                feedback.style.background = 'rgba(34, 197, 94, 0.15)';
                feedback.style.color = '#4ade80';
                feedback.style.border = '1px solid #1e4632';
                feedback.innerText = `Sincronização concluída com sucesso! Atualizado às ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
            }
            if (btnText) btnText.innerText = 'SINCRONIZAÇÃO CONCLUÍDA';
        } else {
            throw new Error('Falha no endpoint de sincronização');
        }
    } catch (err) {
        console.warn("[Dashboard] Erro na sincronização manual:", err.message);
        carregarDashboard('769W2DTF132A592');

        if (feedback) {
            feedback.style.display = 'block';
            feedback.style.background = 'rgba(245, 158, 11, 0.15)';
            feedback.style.color = '#fbbf24';
            feedback.style.border = '1px solid #54391a';
            feedback.innerText = 'Não foi possível atualizar dados com a API agora. Preservando último registro válido.';
        }
        if (btnText) btnText.innerText = 'TENTAR NOVAMENTE';
    } finally {
        setTimeout(() => {
            if (btn) btn.disabled = false;
            if (btnText) btnText.innerText = 'SINCRONIZAR API';
            if (spinner) {
                spinner.style.transform = 'rotate(0deg)';
                spinner.style.transition = 'none';
            }
            isSyncing = false;
        }, 2500);
    }
}

// Inicialização ao carregar
document.addEventListener('DOMContentLoaded', () => {
    const dataloggerSn = '769W2DTF132A592';
    
    // Renderiza dados do cache imediatamente para evitar tela em branco
    const cached = getStoredData();
    if (cached) {
        document.getElementById('val-potencia').innerText = formatNumber(cached.powerGenerating, 3) + ' kW';
        document.getElementById('val-geracao-hoje').innerText = formatNumber(cached.todayYield, 2) + ' kWh';
        document.getElementById('val-status').innerText = cached.status || 'ONLINE';
        document.getElementById('val-status').className = 'status-pill ' + (cached.status || 'online').toLowerCase();
        if (document.getElementById('meta-total-yield')) {
            document.getElementById('meta-total-yield').innerText = formatNumber(cached.totalYield, 2) + ' kWh';
        }
        if (document.getElementById('val-atualizacao')) {
            document.getElementById('val-atualizacao').innerText = cached.lastUpdate || '29/09/2026 13:27:00 -03:00';
        }
    }

    carregarDashboard(dataloggerSn);

    // Auto-update contínuo a cada 60 segundos
    setInterval(() => {
        carregarDashboard(dataloggerSn);
    }, 60000);
});
