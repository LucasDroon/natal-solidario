const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const criancas = require('./public/criancas.json');

const IDS_VALIDOS = new Set(criancas.map(c => c.id));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// O Railway injeta a variável DATABASE_URL automaticamente
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Tabela nova da campanha do Oratório (a tabela "sementes" da campanha anterior não é alterada)
pool.query(`
  CREATE TABLE IF NOT EXISTS apadrinhamentos_oratorio (
    crianca_id INTEGER PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(50) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).catch(err => console.error('Erro ao criar tabela', err));

app.get('/api/apadrinhamentos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM apadrinhamentos_oratorio');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

app.post('/api/apadrinhamentos', async (req, res) => {
  const { crianca_id, nome, telefone } = req.body;
  if (!IDS_VALIDOS.has(crianca_id) || !nome || !telefone) {
    return res.status(400).json({ error: 'Dados inválidos.' });
  }
  try {
    await pool.query(
      'INSERT INTO apadrinhamentos_oratorio (crianca_id, nome, telefone) VALUES ($1, $2, $3)',
      [crianca_id, nome, telefone]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Esta criança já foi apadrinhada.' });
    } else {
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));
