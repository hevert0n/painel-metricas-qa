// VARIÁVEL GLOBAL DE SEGURANÇA
var TOKEN_ACESSO_ADMIN = "heverton.tester";

function doGet(e) {
  var tokenEnviado = e && e.parameter && e.parameter.token;
  if (tokenEnviado === TOKEN_ACESSO_ADMIN) {
    return HtmlService.createHtmlOutputFromFile('Index')
                      .setTitle('Painel Avançado de QA - Admin')
                      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createHtmlOutputFromFile('Visualizacao')
                    .setTitle('Dashboard de Engenharia & Qualidade de QA')
                    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function obterMetricas() {
  try {
    var ID_DA_PLANILHA = "1foYc8Qez9I2l4s_Ot6RDbIsSjJqQm5GV_znonDU9rCI"; 
    var planilha = SpreadsheetApp.openById(ID_DA_PLANILHA).getActiveSheet();
    var dados = planilha.getDataRange().getValues();
    
    var listaFormatada = [];
    for (var i = 1; i < dados.length; i++) {
      if (!dados[i][1]) continue; 
      
      listaFormatada.push({
        idLinha: i + 1,
        dataHora: dados[i][0] ? Utilities.formatDate(new Date(dados[i][0]), "GMT-3", "dd/MM/yyyy HH:mm") : "-",
        featureName: dados[i][1],
        bugsQa: dados[i][2],
        retrabalhoBugs: dados[i][3],
        reopenedBugs: dados[i][4],
        qaStatus: dados[i][5],
        notes: dados[i][6],
        bugsProd: dados[i][7],
        taxaEscape: dados[i][8],
        ttf: dados[i][9], 
        dataBugProd: dados[i][10] ? new Date(dados[i][10]).toISOString().substring(0,16) : "",
        dataDeploy: dados[i][11] ? new Date(dados[i][11]).toISOString().substring(0,16) : "",
        mttf: dados[i][12],
        score: dados[i][13],
        squad: dados[i][14], 
        ticket: dados[i][15],
        requisitos: dados[i][16] || 0,        
        casosExecutados: dados[i][17] || 0,   
        casosFalhas: dados[i][18] || 0        
      });
    }
    return { status: "sucesso", dados: listaFormatada };
  } catch (erro) {
    return { status: "erro", message: erro.toString() };
  }
}

function salvarDados(dados) {
  try {
    var ID_DA_PLANILHA = "1foYc8Qez9I2l4s_Ot6RDbIsSjJqQm5GV_znonDU9rCI"; 
    var planilha = SpreadsheetApp.openById(ID_DA_PLANILHA).getActiveSheet();
    
    var bQa = Number(dados.bugsQa) || 0;
    var bRetrabalho = Number(dados.retrabalhoBugs) || 0;
    var bReabertura = Number(dados.reopenedBugs) || 0;
    var bProd = Number(dados.bugsProd) || 0;
    var nTtf = Number(dados.ttf) || 0; 
    
    var nRequisitos = Number(dados.requisitos) || 0;
    var nCasosExec = Number(dados.casosExecutados) || 0;
    var nCasosFalhas = Number(dados.casosFalhas) || 0;
    
    // A) CÁLCULO DA TAXA DE ESCAPE
    var totalBugsUniverso = bQa + bRetrabalho + bReabertura + bProd;
    var calculoEscape = totalBugsUniverso > 0 ? (bProd / totalBugsUniverso) * 100 : 0;
    
    // B) REGRA DO SCORE
    var calculoScore = 100;
    if (bProd > 0) {
      if (bQa === 0) {
        calculoScore = 0; 
      } else {
        calculoScore = Math.max(0, 1 - (bProd / bQa)) * 100;
      }
    }
    
    // C) CÁLCULO DO MTTF AUTOMÁTICO
    var mttfResultado = "Sem bugs em prod";
    if (dados.dataDeploy && dados.dataBugProd) {
      var dDeploy = new Date(dados.dataDeploy);
      var dBug = new Date(dados.dataBugProd);
      var diferencaMs = dBug - dDeploy;
      
      if (diferencaMs > 0) {
        var totalHoras = Math.floor(diferencaMs / (1000 * 60 * 60));
        var dias = Math.floor(totalHoras / 24);
        var horasRestantes = totalHoras % 24;
        mttfResultado = dias + "d " + horasRestantes + "h";
      } else if (diferencaMs === 0) {
        mttfResultado = "Imediato (0h)";
      } else {
        mttfResultado = "Data inconsistente";
      }
    }
    
    var novaLinha = [
      dados.idLinha ? planilha.getRange(dados.idLinha, 1).getValue() : new Date(), 
      dados.featureName,
      bQa,
      bRetrabalho,
      bReabertura,
      dados.qaStatus,
      dados.notes,
      bProd,
      calculoEscape,
      nTtf,
      dados.dataBugProd ? new Date(dados.dataBugProd) : "", 
      dados.dataDeploy ? new Date(dados.dataDeploy) : "",   
      mttfResultado,
      calculoScore,
      dados.squad || "Geral", 
      dados.ticket || "",
      nRequisitos,   
      nCasosExec,    
      nCasosFalhas   
    ];
    
    if (dados.idLinha) {
      planilha.getRange(dados.idLinha, 1, 1, novaLinha.length).setValues([novaLinha]);
      return { status: "sucesso", mensagem: "Métricas atualizadas com sucesso! 🔄" };
    } else {
      planilha.appendRow(novaLinha);
      return { status: "sucesso", mensagem: "Métricas guardadas com sucesso! 🚀" };
    }
    
  } catch (erro) {
    return { status: "erro", mensagem: "Erro ao processar: " + erro.toString() };
  }
}

// FUNÇÃO DE EXPORTAÇÃO BLINDADA CONTRA CONVERSÕES DE TIPOS
function gerarPaginaImpressao(idLinha) {
  try {
    var resultado = obterMetricas();
    if (resultado.status !== "sucesso") return "<h3>Erro ao buscar dados na planilha</h3>";
    
    var targetId = Number(idLinha);
    var item = resultado.dados.find(function(d) { return Number(d.idLinha) === targetId; });
    if (!item) return "<h3>Erro: Feature com ID de linha " + idLinha + " não foi localizada.</h3>";
    
    var bQa = Number(item.bugsQa) || 0;
    var reqs = Number(item.requisitos) || 0;
    var cExec = Number(item.casosExecutados) || 0;
    var metaCobertura = reqs * 3;
    var efetividade = cExec > 0 ? ((bQa / cExec) * 100).toFixed(1) + "%" : "0.0%";
    var nScore = Number(item.score) || 0;
    
    var corScore = nScore >= 80 ? "#198754" : (nScore >= 50 ? "#ffc107" : "#dc3545");
    var textoScoreCor = nScore >= 50 && nScore < 80 ? "#000" : "#fff";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório do Teste de Qualidade - ${item.featureName}</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body { 
            padding: 0; 
            font-family: Arial, sans-serif; 
            background-color: #fff; 
            color: #333; 
            font-size: 11px;
            line-height: 1.3;
          }
          .report-header { 
            border-bottom: 2px solid #0d6efd; 
            padding-bottom: 5px; 
            margin-bottom: 12px; 
          }
          .report-header h4 { font-size: 16px; font-weight: bold; }
          .score-box { 
            background-color: ${corScore}; 
            color: ${textoScoreCor}; 
            padding: 10px; 
            border-radius: 6px; 
            text-align: center; 
          }
          .score-box h2 { font-size: 28px; font-weight: bold; margin: 0; }
          .section-title { 
            font-size: 12px; 
            font-weight: bold; 
            color: #495057; 
            background-color: #f8f9fa; 
            padding: 4px 8px; 
            border-left: 3px solid #0d6efd; 
            margin-top: 10px; 
            margin-bottom: 6px; 
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .table { margin-bottom: 8px; }
          .table th, .table td { padding: 5px 8px !important; font-size: 11px; }
          th { background-color: #f1f3f5 !important; width: 30%; font-weight: 600; }
          .bug-card { padding: 6px; border: 1px solid #dee2e6; border-radius: 4px; background-color: #f8f9fa; }
          .bug-card strong { font-size: 14px; }
          @media print { 
            .no-print { display: none; } 
            body { padding: 0; } 
          }
        </style>
      </head>
      <body>
        <div class="no-print mb-2 text-end">
          <button class="btn btn-sm btn-primary" onclick="window.print()">🖨️ Confirmar e Salvar como PDF</button>
        </div>
        
        <div class="report-header row align-items-center g-0">
          <div class="col-8">
            <h4 class="text-primary mb-0">📋 Relatório do Teste de Qualidade</h4>
            <p class="text-muted mb-0" style="font-size: 10px;">Evidência de Homologação e Indicadores Técnicos de QA</p>
          </div>
          <div class="col-4 text-end">
            <small class="text-muted" style="font-size: 10px;">Gerado em: ${new Date().toLocaleDateString('pt-BR')}</small>
          </div>
        </div>

        <div class="row g-2 align-items-center mb-2">
          <div class="col-8">
            <h5 class="mb-2 text-dark fw-bold" style="font-size: 13px;">${item.featureName}</h5>
            <table class="table table-bordered align-middle mb-0">
              <tr><th>Data Registro</th><td>${item.dataHora}</td></tr>
              <tr><th>Módulo</th><td><span class="badge bg-light text-dark border" style="font-size:10px; padding:3px 6px;">${item.squad || '-'}</span></td></tr>
              <tr><th>ID do Ticket</th><td><code>${item.ticket || '-'}</code></td></tr>
              <tr><th>Status QA</th><td><span class="badge bg-secondary" style="font-size:10px; padding:3px 6px;">${item.qaStatus}</span></td></tr>
            </table>
          </div>
          <div class="col-4">
            <div class="score-box">
              <small class="text-uppercase fw-bold d-block" style="font-size: 9px; opacity: 0.9; letter-spacing: 0.5px;">Score de Contenção</small>
              <h2>${nScore.toFixed(0)}</h2>
              <small class="fw-bold" style="font-size: 9px;">de 100 pontos</small>
            </div>
          </div>
        </div>

        <div class="section-title">📊 Engenharia e Execução de Testes</div>
        <table class="table table-bordered text-center mb-2">
          <thead>
            <tr class="table-light">
              <th style="width:34%; text-align:center;">Meta Cobertura (Requisitos × 3)</th>
              <th style="width:33%; text-align:center;">Casos Executados</th>
              <th style="width:33%; text-align:center;">Efetividade dos Testes (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr class="fw-bold" style="font-size: 12px;">
              <td class="text-secondary">${metaCobertura}</td>
              <td class="text-dark">${cExec}</td>
              <td class="text-info">${efetividade}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">🐛 Mapeamento de Defeitos (Bugs)</div>
        <div class="row g-2 text-center mb-2">
          <div class="col-3"><div class="bug-card"><strong>${item.bugsQa}</strong><br><small class="text-muted" style="font-size: 10px;">Bugs QA</small></div></div>
          <div class="col-3"><div class="bug-card"><strong>${item.retrabalhoBugs}</strong><br><small class="text-muted" style="font-size: 10px;">Retrabalhos</small></div></div>
          <div class="col-3"><div class="bug-card"><strong>${item.reopenedBugs}</strong><br><small class="text-muted" style="font-size: 10px;">Reabertos</small></div></div>
          <div class="col-3"><div class="bug-card border-danger bg-light text-danger"><strong>${item.bugsProd}</strong><br><small class="text-danger fw-bold" style="font-size: 10px;">Bugs Prod</small></div></div>
        </div>

        <div class="section-title">⏱️ Métricas de Tempo & Ciclo de Vida</div>
        <table class="table table-bordered mb-2">
          <tr><th style="width: 45%;">Tempo Total de Testes (TTF)</th><td>${item.ttf || '0'} horas úteis</td></tr>
          <tr><th>Data do Deploy em Produção</th><td>${item.dataDeploy ? item.dataDeploy.replace('T', ' ') : '-'}</td></tr>
          <tr><th>Data do 1º Bug em Prod</th><td>${item.dataBugProd ? item.dataBugProd.replace('T', ' ') : '-'}</td></tr>
          <tr><th>Tempo Médio para Falha (MTTF)</th><td class="fw-bold text-success">${item.mttf || '-'}</td></tr>
          <tr><th>Taxa de Escape (Vazamento para Prod)</th><td class="fw-bold text-primary">${Number(item.taxaEscape).toFixed(1)}%</td></tr>
        </table>

        <div class="section-title">📝 Observações / Impedimentos Mapeados</div>
        <div class="p-2 border rounded bg-light text-muted" style="min-height: 50px; font-size: 10.5px; white-space: pre-wrap; max-height: 90px; overflow: hidden;">${item.notes || 'Nenhuma observação registrada.'}</div>
        
        <div class="text-center text-muted" style="font-size: 9px; margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 5px;">
          Este documento atesta a conformidade dos critérios de aceitação avaliados pelo time de QA.
        </div>
        
        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 300); }
        </script>
      </body>
      </html>
    `;
  } catch(e) {
    return "<h3>Erro interno no servidor do relatório: " + e.toString() + "</h3>";
  }
}
