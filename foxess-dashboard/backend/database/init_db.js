const db = require('./database');

const createTables = () => {
    db.serialize(() => {
        // Tabela de unidades
        db.run(`
            CREATE TABLE IF NOT EXISTS unidades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                endereco TEXT,
                foxess_plant_id TEXT,
                datalogger_sn TEXT NOT NULL,
                kwp REAL NOT NULL,
                geracao_esperada_anual REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela de histórico de geração
        db.run(`
            CREATE TABLE IF NOT EXISTS historico_geracao (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                unit_id INTEGER NOT NULL,
                timestamp DATETIME NOT NULL,
                power REAL,
                energy REAL,
                voltage REAL,
                current REAL,
                status TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (unit_id) REFERENCES unidades (id)
            )
        `);

        // Tabela de logs/status da requisição API
        db.run(`
            CREATE TABLE IF NOT EXISTS api_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ultima_atualizacao DATETIME NOT NULL,
                status_requisicao TEXT NOT NULL,
                erro_requisicao TEXT
            )
        `);

        console.log("Tabelas criadas com sucesso.");
        
        // Inserir a planta de teste se não existir
        db.get(`SELECT id FROM unidades WHERE datalogger_sn = ?`, ['769W2DTF132A592'], (err, row) => {
            if (!row) {
                db.run(`
                    INSERT INTO unidades (nome, endereco, foxess_plant_id, datalogger_sn, kwp, geracao_esperada_anual)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, ['Unidade Teste', 'Endereço Teste', '', '769W2DTF132A592', 5.0, 6000], function(err) {
                    if (err) {
                        console.error('Erro ao inserir unidade de teste:', err.message);
                    } else {
                        console.log('Unidade de teste (769W2DTF132A592) inserida com sucesso.');
                    }
                });
            }
        });
    });
};

createTables();
