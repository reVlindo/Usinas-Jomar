require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const foxessRoutes = require('./routes/foxess');
const foxessService = require('./services/foxessService');
const db = require('./database/database');

const app = express();
const PORT = process.env.PORT || 3000;
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 60000;

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api', foxessRoutes);

// Route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Polling Mechanism
const startPolling = () => {
    console.log(`Iniciando rotina de atualização (Intervalo: ${POLLING_INTERVAL}ms)`);
    
    const poll = async () => {
        // Fetch all dataloggers from DB
        db.all(`SELECT datalogger_sn FROM unidades`, [], async (err, rows) => {
            if (err) {
                console.error("Erro ao buscar unidades para polling:", err);
                return;
            }
            
            for (const row of rows) {
                try {
                    await foxessService.fetchAndCacheData(row.datalogger_sn);
                    console.log(`[${new Date().toISOString()}] Dados atualizados para datalogger ${row.datalogger_sn}`);
                } catch (error) {
                    console.error(`[${new Date().toISOString()}] Erro ao atualizar ${row.datalogger_sn}:`, error.message);
                }
            }
        });
    };

    // First poll immediately
    poll();
    
    // Set interval
    setInterval(poll, POLLING_INTERVAL);
};

app.listen(PORT, () => {
    console.log(`Backend rodando na porta ${PORT}`);
    startPolling();
});
