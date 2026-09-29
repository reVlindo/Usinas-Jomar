const express = require('express');
const router = express.Router();
const db = require('../database/database');
const foxessService = require('../services/foxessService');

// Retorna lista de unidades cadastradas no banco de dados
router.get('/unidades', (req, res) => {
    db.all(`SELECT * FROM unidades`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Retorna dados reais e consolidados de uma usina específica
router.get('/unidades/:dataloggerSn/dados', (req, res) => {
    const sn = req.params.dataloggerSn;
    const data = foxessService.getPlantData(sn);
    
    if (data) {
        res.json(data);
    } else {
        res.status(404).json({ error: 'Dados ainda não disponíveis. Aguardando primeira consulta à API FoxESS.' });
    }
});

// Rota de Sincronização Obrigatória (Item 6, 7, 8, 9)
// Endpoint: POST /api/foxess/sync
router.post('/foxess/sync', async (req, res) => {
    const sn = req.body.datalogger || req.body.dataloggerSn || '769W2DTF132A592';
    try {
        console.log(`[SYNC] Iniciando sincronização manual para Datalogger: ${sn}`);
        const data = await foxessService.fetchAndCacheData(sn);

        // Logs exigidos no item 15
        console.log("\n================ FOXESS RESPONSE ================");
        console.log(`Power:       ${data.powerGenerating} kW`);
        console.log(`Today Yield: ${data.todayYield} kWh`);
        console.log(`Total Yield: ${data.totalYield} kWh`);
        console.log("============== DASHBOARD CALCULATION ============");
        console.log(`todayYield:  ${data.todayYield}`);
        console.log("================= FRONTEND VALUE ================");
        console.log(`Power: ${data.powerGenerating} kW | Today: ${data.todayYield} kWh`);
        console.log("=================================================\n");

        res.json({
            success: true,
            plantId: data.plantId,
            datalogger: data.dataloggerSn,
            deviceSn: data.deviceSn,
            power: data.powerGenerating,
            todayYield: data.todayYield,
            totalYield: data.totalYield,
            voltage: data.voltage,
            status: data.status,
            updatedAt: data.lastUpdate,
            history: data.history,
            diagnostico: data.diagnostico
        });
    } catch (error) {
        console.error(`[SYNC ERROR] Falha ao sincronizar: ${error.message}`);
        // Preserva o último dado válido se disponível para nunca zerar a tela
        const lastValid = foxessService.getPlantData(sn);
        if (lastValid) {
            return res.json({
                success: false,
                warning: 'Não foi possível atualizar os dados da API FoxESS. Preservando último registro válido.',
                plantId: lastValid.plantId,
                datalogger: lastValid.dataloggerSn,
                deviceSn: lastValid.deviceSn,
                power: lastValid.powerGenerating,
                todayYield: lastValid.todayYield,
                totalYield: lastValid.totalYield,
                voltage: lastValid.voltage,
                status: lastValid.status,
                updatedAt: lastValid.lastUpdate,
                history: lastValid.history,
                diagnostico: lastValid.diagnostico
            });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// Alias para sincronização por parâmetro de rota
router.post('/unidades/:dataloggerSn/sync', async (req, res) => {
    req.body.datalogger = req.params.dataloggerSn;
    // Redireciona para o handler de sync
    const sn = req.params.dataloggerSn;
    try {
        const data = await foxessService.fetchAndCacheData(sn);
        res.json({
            success: true,
            plantId: data.plantId,
            datalogger: data.dataloggerSn,
            deviceSn: data.deviceSn,
            power: data.powerGenerating,
            todayYield: data.todayYield,
            totalYield: data.totalYield,
            voltage: data.voltage,
            status: data.status,
            updatedAt: data.lastUpdate,
            history: data.history,
            diagnostico: data.diagnostico
        });
    } catch (error) {
        const lastValid = foxessService.getPlantData(sn);
        if (lastValid) {
            return res.json({
                success: false,
                warning: 'Não foi possível atualizar. Preservando último registro.',
                ...lastValid
            });
        }
        res.status(500).json({ error: error.message });
    }
});

// Cadastra uma nova unidade
router.post('/unidades', (req, res) => {
    const { nome, endereco, foxess_plant_id, datalogger_sn, kwp, geracao_esperada_anual } = req.body;
    
    if (!nome || !datalogger_sn || !kwp || !geracao_esperada_anual) {
        return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
    }

    const sql = `INSERT INTO unidades (nome, endereco, foxess_plant_id, datalogger_sn, kwp, geracao_esperada_anual)
                 VALUES (?, ?, ?, ?, ?, ?)`;
                 
    db.run(sql, [nome, endereco, foxess_plant_id, datalogger_sn, kwp, geracao_esperada_anual], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: 'Unidade cadastrada com sucesso.' });
    });
});

// Histórico de geração do DB
router.get('/unidades/:id/historico', (req, res) => {
    const id = req.params.id;
    db.all(`SELECT * FROM historico_geracao WHERE unit_id = ? ORDER BY timestamp DESC LIMIT 100`, [id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

module.exports = router;
