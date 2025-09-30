const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;

// Conexão com o banco
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Xelzin124",
  database: "hands_on_vii"
});

// Query base para obter dados dos pagamentos com info do imóvel
const baseQuery = `
  SELECT 
    p.id_pagamento AS id_venda,
    p.data_pagamento,
    p.valor_pagamento,
    i.codigo_imovel,
    i.descricao,
    t.nome_tipo AS tipo_imovel
  FROM pagamento p
  JOIN imovel i ON p.id_imovel = i.id_imovel
  JOIN tipo_imovel t ON i.id_tipo = t.id_tipo
  ORDER BY p.data_pagamento;
`;

// 1. Percentual de vendas por tipo de imóvel (gráfico de pizza)   http://localhost:3000/api/percentual-vendas-tipo
app.get("/api/percentual-vendas-tipo", (req, res) => {
  connection.query(baseQuery, (err, resultados) => {
    if (err) return res.status(500).json({ erro: err.message });

    const total = resultados.length;
    if (total === 0) return res.json([]);

    const agrupado = resultados.reduce((acc, item) => {
      acc[item.tipo_imovel] = (acc[item.tipo_imovel] || 0) + 1;
      return acc;
    }, {});

    const resultadoFinal = Object.entries(agrupado).map(([tipo, count]) => ({
      tipo_imovel: tipo,
      percentual: ((count / total) * 100).toFixed(2) + " %"
    }));

    res.json(resultadoFinal);
  });
});

// 2. Total de vendas por imóvel (gráfico de barras) http://localhost:3000/api/total-por-imovel

app.get("/api/total-por-imovel", (req, res) => {
  connection.query(baseQuery, (err, resultados) => {
    if (err) return res.status(500).json({ erro: err.message });

    // Agrupa soma de valor por imóvel
    const agrupado = resultados.reduce((acc, item) => {
      if (!acc[item.codigo_imovel]) {
        acc[item.codigo_imovel] = {
          codigo_imovel: item.codigo_imovel,
          descricao: item.descricao,
          total_vendas: 0
        };
      }
      acc[item.codigo_imovel].total_vendas += parseFloat(item.valor_pagamento);
      return acc;
    }, {});

    // Transforma em array e ordena por código do imóvel
    const resultadoFinal = Object.values(agrupado).sort((a, b) => a.codigo_imovel - b.codigo_imovel);

    res.json(resultadoFinal);
  });
});

// 3. Total de vendas por mês (gráfico de linha)  http://localhost:3000/api/total-por-mes
app.get("/api/total-por-mes", (req, res) => {
  connection.query(baseQuery, (err, resultados) => {
    if (err) return res.status(500).json({ erro: err.message });

    // Agrupa soma por mês e ano (ex: 2023-08)
    const agrupado = resultados.reduce((acc, item) => {
      const mesAno = item.data_pagamento.toISOString().slice(0,7); // "YYYY-MM"
      acc[mesAno] = (acc[mesAno] || 0) + parseFloat(item.valor_pagamento);
      return acc;
    }, {});

    // Formata para array ordenado por data
    const resultadoFinal = Object.entries(agrupado)
      .map(([mesAno, total]) => ({ mes: mesAno, total_vendas: total.toFixed(2) }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    res.json(resultadoFinal);
  });
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
