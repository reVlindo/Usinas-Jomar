const axios = require('axios');
const crypto = require('crypto');
const db = require('../database/database');

const BASE_URL = 'https://www.foxesscloud.com';

class FoxessService {
    constructor() {
        this.apiKey = process.env.FOXESS_API_KEY;
        this.cache = {}; // Cache por datalogger_sn
        this.deviceMap = {}; // Mapeamento datalogger_sn -> { deviceSN, stationID, stationName }
    }

    _getHeaders(apiPath) {
        const timestamp = Date.now().toString();
        // Regra oficial de assinatura da FoxESS OpenAPI: path + \r\n + token + \r\n + timestamp
        const sigString = `${apiPath}\r\n${this.apiKey}\r\n${timestamp}`;
        const signature = crypto.createHash('md5').update(sigString).digest('hex');
        
        return {
            'token': this.apiKey,
            'timestamp': timestamp,
            'signature': signature,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            'lang': 'pt'
        };
    }

    async _request(method, apiPath, body = null, params = null) {
        try {
            const options = {
                method,
                url: BASE_URL + apiPath,
                headers: this._getHeaders(apiPath),
                timeout: 15000
            };
            
            if (body && (method === 'POST' || method === 'PUT')) {
                options.data = body;
            }
            if (params && method === 'GET') {
                options.params = params;
            }
            
            const response = await axios(options);
            
            if (response.data.errno !== 0) {
                throw new Error(`FoxESS API [${apiPath}] retornou código ${response.data.errno}: ${response.data.msg}`);
            }
            
            return response.data.result;
        } catch (error) {
            const status = error.response ? error.response.status : 'SEM_RESPOSTA';
            const detail = error.response && error.response.data ? JSON.stringify(error.response.data) : error.message;
            console.error(`Falha na requisição FoxESS [${method} ${apiPath}] (HTTP ${status}): ${detail}`);
            throw error;
        }
    }

    // Calcula o timestamp de início do dia no fuso horário de Brasília (UTC-3)
    getBrasiliaStartOfDay() {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const parts = formatter.formatToParts(now);
        const year = parts.find(p => p.type === 'year').value;
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        const startOfDay = new Date(`${year}-${month}-${day}T00:00:00-03:00`);
        return startOfDay.getTime();
    }

    // 1. Identificar o inversor (deviceSN) e a usina (stationID) a partir do Datalogger SN
    async getDeviceInfo(dataloggerSn) {
        if (this.deviceMap[dataloggerSn]) {
            return this.deviceMap[dataloggerSn];
        }

        try {
            console.log(`[FoxESS] Consultando lista de dispositivos (/op/v0/device/list) para o Datalogger ${dataloggerSn}...`);
            const result = await this._request('POST', '/op/v0/device/list', {
                currentPage: 1,
                pageSize: 100
            });

            if (result && result.data && Array.isArray(result.data)) {
                const device = result.data.find(d => 
                    d.moduleSN === dataloggerSn || 
                    d.deviceSN === dataloggerSn
                );
                
                if (device) {
                    const info = {
                        deviceSN: device.deviceSN,
                        stationID: device.stationID || 'N/A',
                        stationName: device.stationName || 'Usina Fotovoltaica',
                        statusNum: device.status // 1: online, 2: fault, 3: offline
                    };
                    this.deviceMap[dataloggerSn] = info;
                    console.log(`[FoxESS] Dispositivo identificado com sucesso: Inversor SN=${info.deviceSN}, Station ID=${info.stationID}`);
                    return info;
                }
            }
        } catch (e) {
            console.warn(`[FoxESS] Não foi possível obter /op/v0/device/list: ${e.message}`);
        }

        // Fallback: se a lista não estiver acessível, utiliza o SN fornecido
        const fallback = {
            deviceSN: dataloggerSn,
            stationID: 'Não identificado',
            stationName: 'Usina Datalogger ' + dataloggerSn,
            statusNum: 1
        };
        return fallback;
    }

    // 2. Consulta Completa e Estruturada dos Dados Reais da Planta
    async fetchAndCacheData(dataloggerSn) {
        const endpointsUsed = [];
        let deviceSn = dataloggerSn;
        let stationId = 'N/A';
        let statusStr = 'ONLINE';

        try {
            // Passo 1: Descobrir o Inversor real e o ID da Estação
            endpointsUsed.push('/op/v0/device/list');
            const devInfo = await this.getDeviceInfo(dataloggerSn);
            deviceSn = devInfo.deviceSN;
            stationId = devInfo.stationID;

            if (devInfo.statusNum === 3) statusStr = 'OFFLINE';
            else if (devInfo.statusNum === 2) statusStr = 'ALARME';
            else statusStr = 'ONLINE';

            // Passo 2: Resumo Oficial de Geração (/op/v0/device/generation)
            // Este é o endpoint exclusivo da FoxESS que retorna Today Yield e Total Yield
            let todayYield = null;
            let monthYield = null;
            let totalYield = null;

            try {
                endpointsUsed.push('/op/v0/device/generation');
                console.log(`[FoxESS] Consultando geração acumulada (/op/v0/device/generation?sn=${deviceSn})...`);
                const genResult = await this._request('GET', '/op/v0/device/generation', null, { sn: deviceSn });
                if (genResult) {
                    todayYield = genResult.today !== undefined ? Number(genResult.today) : null;
                    monthYield = genResult.month !== undefined ? Number(genResult.month) : null;
                    totalYield = genResult.cumulative !== undefined ? Number(genResult.cumulative) : null;
                    console.log(`[FoxESS] Dados de Geração obtidos com sucesso: Today=${todayYield} kWh, Total=${totalYield} kWh`);
                }
            } catch (genErr) {
                console.warn(`[FoxESS] Aviso em /op/v0/device/generation: ${genErr.message}`);
            }

            // Passo 3: Dados em Tempo Real (/op/v0/device/real/query)
            // Obtém Potência Instantânea (Power Generating), Tensão e variáveis auxiliares
            endpointsUsed.push('/op/v0/device/real/query');
            console.log(`[FoxESS] Consultando tempo real (/op/v0/device/real/query) para ${deviceSn}...`);
            const realResult = await this._request('POST', '/op/v0/device/real/query', {
                sn: deviceSn,
                variables: [
                    'generationPower',
                    'pvPower',
                    'todayYield',
                    'PVEnergyTotal',
                    'pvVolt',
                    'pv1Volt',
                    'pvCurrent',
                    'pv1Current',
                    'invTemperat'
                ]
            });

            let powerGenerating = 0;
            let voltage = null;

            if (realResult && Array.isArray(realResult) && realResult.length > 0) {
                const deviceData = realResult[0];
                const datas = deviceData.datas || [];

                const getVar = (name) => {
                    const item = datas.find(d => d.variable === name);
                    return item && item.value !== undefined ? Number(item.value) : null;
                };

                // Potência instantânea (kW)
                const genPwr = getVar('generationPower');
                const pvPwr = getVar('pvPower');
                powerGenerating = genPwr !== null ? genPwr : (pvPwr !== null ? pvPwr : 0);

                // Tensão da rede/PV (V)
                const pvV = getVar('pvVolt');
                const pv1V = getVar('pv1Volt');
                voltage = pvV !== null ? pvV : (pv1V !== null ? pv1V : null);

                // Caso /op/v0/device/generation não tenha respondido, extrai de real/query
                if (todayYield === null) {
                    const rtToday = getVar('todayYield');
                    if (rtToday !== null) todayYield = rtToday;
                }
                if (totalYield === null) {
                    const rtTotal = getVar('PVEnergyTotal');
                    if (rtTotal !== null) totalYield = rtTotal;
                }
            }

            // Passo 4: Gráfico de Geração do Dia (/op/v0/device/history/query)
            // Coleta a curva real de geração ao longo do dia respeitando o fuso de Brasília (-03:00)
            endpointsUsed.push('/op/v0/device/history/query');
            const beginTime = this.getBrasiliaStartOfDay();
            const endTime = Date.now();
            let historyPoints = [];

            try {
                console.log(`[FoxESS] Consultando histórico do dia (/op/v0/device/history/query) de ${new Date(beginTime).toISOString()} até ${new Date(endTime).toISOString()}...`);
                const histResult = await this._request('POST', '/op/v0/device/history/query', {
                    sn: deviceSn,
                    variables: ['generationPower', 'pvPower', 'pvVolt', 'pv1Volt'],
                    begin: beginTime,
                    end: endTime
                });

                if (histResult && Array.isArray(histResult) && histResult.length > 0) {
                    const devHist = histResult[0];
                    const datas = devHist.datas || [];
                    const pwrData = datas.find(d => d.variable === 'generationPower' || d.variable === 'pvPower');
                    const voltData = datas.find(d => d.variable === 'pvVolt' || d.variable === 'pv1Volt');

                    if (pwrData && Array.isArray(pwrData.data)) {
                        historyPoints = pwrData.data.map(pt => {
                            // Converte timestamp para formato legível de hora em Brasília
                            const ptDate = new Date(pt.time);
                            const timeStr = ptDate.toLocaleTimeString('pt-BR', {
                                timeZone: 'America/Sao_Paulo',
                                hour: '2-digit',
                                minute: '2-digit'
                            });

                            let vVal = null;
                            if (voltData && Array.isArray(voltData.data)) {
                                const matchedV = voltData.data.find(v => v.time === pt.time);
                                if (matchedV && matchedV.value !== undefined) {
                                    vVal = Number(matchedV.value);
                                }
                            }

                            return {
                                time: timeStr,
                                power: Number(pt.value) || 0,
                                volt: vVal,
                                rawTime: pt.time
                            };
                        });
                    }
                }
            } catch (histErr) {
                console.warn(`[FoxESS] Aviso em /op/v0/device/history/query: ${histErr.message}`);
            }

            // Formatação do timestamp da última leitura em Brasília
            const now = new Date();
            const lastUpdateFormatted = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + 
                ' ' + now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ' -03:00';

            const consolidatedData = {
                dataloggerSn,
                deviceSn,
                plantId: stationId,
                powerGenerating: Number(powerGenerating.toFixed(3)),
                todayYield: todayYield !== null ? Number(todayYield.toFixed(2)) : null,
                totalYield: totalYield !== null ? Number(totalYield.toFixed(2)) : null,
                monthYield: monthYield !== null ? Number(monthYield.toFixed(2)) : null,
                voltage: voltage !== null ? Number(voltage.toFixed(1)) : null,
                status: statusStr,
                lastUpdate: lastUpdateFormatted,
                lastUpdateIso: now.toISOString(),
                endpointsUsed,
                history: historyPoints,
                diagnostico: {
                    datalogger: dataloggerSn,
                    deviceSn: deviceSn,
                    plantId: stationId,
                    lastUpdate: lastUpdateFormatted,
                    powerGenerating: `${Number(powerGenerating.toFixed(3))} kW`,
                    todayYield: todayYield !== null ? `${Number(todayYield.toFixed(2))} kWh` : 'Aguardando API',
                    totalYield: totalYield !== null ? `${Number(totalYield.toFixed(2))} kWh` : 'Aguardando API',
                    deviceStatus: statusStr,
                    endpoints: endpointsUsed.join(', ')
                }
            };

            this.cache[dataloggerSn] = consolidatedData;

            // Salva log de sucesso
            db.run(`INSERT INTO api_logs (ultima_atualizacao, status_requisicao) VALUES (?, ?)`, 
                  [new Date().toISOString(), 'SUCCESS']);

            // Armazena no banco de dados SQLite para histórico
            this._storeDatabaseHistory(dataloggerSn, consolidatedData);

            console.log("=== [VALIDAÇÃO DA CONSULTA REAL FOXESS] ===");
            console.log(`1. Planta: ${devInfo.stationName}`);
            console.log(`2. ID da Planta (stationID): ${stationId}`);
            console.log(`3. Datalogger SN: ${dataloggerSn}`);
            console.log(`4. Inversor SN (deviceSN): ${deviceSn}`);
            console.log(`5. Power Generating: ${consolidatedData.powerGenerating} kW`);
            console.log(`6. Today Yield: ${consolidatedData.todayYield} kWh`);
            console.log(`7. Total Yield: ${consolidatedData.totalYield} kWh`);
            console.log(`8. Device Status: ${statusStr}`);
            console.log(`9. Endpoints Utilizados: ${endpointsUsed.join(', ')}`);
            console.log("============================================");

            return consolidatedData;
        } catch (error) {
            console.error(`[FoxESS] Erro global na atualização de ${dataloggerSn}:`, error.message);
            
            db.run(`INSERT INTO api_logs (ultima_atualizacao, status_requisicao, erro_requisicao) VALUES (?, ?, ?)`, 
                  [new Date().toISOString(), 'ERROR', error.message]);

            // Se possuir cache prévio, preserva e marca status como OFFLINE/ERRO
            if (this.cache[dataloggerSn]) {
                const cached = { ...this.cache[dataloggerSn], status: 'OFFLINE' };
                return cached;
            }
            throw error;
        }
    }

    _storeDatabaseHistory(dataloggerSn, data) {
        db.get(`SELECT id FROM unidades WHERE datalogger_sn = ?`, [dataloggerSn], (err, row) => {
            if (row && data.powerGenerating !== undefined) {
                db.run(`
                    INSERT INTO historico_geracao (unit_id, timestamp, power, voltage, status)
                    VALUES (?, ?, ?, ?, ?)
                `, [row.id, new Date().toISOString(), data.powerGenerating, data.voltage, data.status]);
            }
        });
    }

    getPlantData(dataloggerSn) {
        return this.cache[dataloggerSn] || null;
    }
}

module.exports = new FoxessService();
