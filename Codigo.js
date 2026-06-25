// VARIÁVEL GLOBAL DE SEGURANÇA (Pode alterar a senha se desejar)
var TOKEN_ACESSO_ADMIN = "heverton.tester";

function doGet(e) {
  // Captura o token enviado na URL (?token=...)
  var tokenEnviado = e && e.parameter && e.parameter.token;
  
  // SE O TOKEN ESTIVER CORRETO: O servidor entrega a página de Admin (Index)
  if (tokenEnviado === TOKEN_ACESSO_ADMIN) {
    return HtmlService.createHtmlOutputFromFile('Index')
                      .setTitle('Painel Avançado de QA - Admin')
                      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  // CASO CONTRÁRIO (Link puro, aba anônima, chefe, etc): O servidor entrega APENAS a Visualização
  // É fisicamente impossível o usuário ver o formulário aqui, pois o arquivo 'Index' nem é enviado.
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
      if (!dados[i][1]) continue; // Pula linhas vazias sem nome de feature
      
      listaFormatada.push({
        idLinha: i + 1,
        dataHora: dados[i][0] ? Utilities.formatDate(new Date(dados[i][0]), "GMT", "dd/MM/yyyy HH:mm") : "-",
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
        ticket: dados[i][15]
      });
    }
    return { status: "sucesso", dados: listaFormatada };
  } catch (erro) {
    return { status: "erro", mensagem: erro.toString() };
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
    
    // A) CÁLCULO DA TAXA DE ESCAPE
    var totalBugsUniverso = bQa + bRetrabalho + bReabertura + bProd;
    var calculoEscape = totalBugsUniverso > 0 ? (bProd / totalBugsUniverso) * 100 : 0;
    
    // B) REGRA DO SCORE: Apenas Pune se houver Bugs em Produção
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
      dados.ttf,
      dados.dataBugProd ? new Date(dados.dataBugProd) : "", 
      dados.dataDeploy ? new Date(dados.dataDeploy) : "",   
      mttfResultado,
      calculoScore,
      dados.squad || "Geral",
      dados.ticket || ""
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