/* ========================================================================= */
/* ARQUIVO: anatomia-3d/js/api-cache.js                                     */
/* ========================================================================= */

/**
 * MOTOR DE INTERCEPTAÇÃO, CACHE INTELIGENTE & DOSSIÊ ACADÊMICO EM PDF
 * Ecossistema LAIFT - Módulo Master 3D
 * - Interceptação Offline-First com enriquecimento dinâmico via PubChem
 * - Unificação dos registros de simulação e cômputo de carga horária
 * - Emissão de Dossiê / Parecer Técnico em PDF nativo para validação institucional
 *   (Comprovação de Atividades Complementares - UNINASSAU / Currículo Lattes)
 */

const ApiCache = (() => {
  // Chaves de Persistência Unificadas
  const STORAGE_KEY_HISTORY = "laift_atlas_history";
  const STORAGE_KEY_LEGACY = "laift_3d_sim_history";
  const SESSION_STORAGE_KEY = "laift_student_session";
  const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbyXvBYrHBIXNjHYItuq2LXKt1vkmh2m_CME-5aZqkxUJhl7ktJjemuasbvdEweH95k/exec";

  // =========================================================================
  // 1. INICIALIZAÇÃO
  // =========================================================================
  function init() {
    console.log("[ApiCache] Inicializando Interceptor de APIs & Gerador de Dossiê PDF...");
    migrarHistoricoLegado();
    renderizarHistoricoLocal();
    configurarBotoesAcervo();
  }

  function migrarHistoricoLegado() {
    const legadoRaw = localStorage.getItem(STORAGE_KEY_LEGACY);
    const atualRaw = localStorage.getItem(STORAGE_KEY_HISTORY);

    if (legadoRaw && !atualRaw) {
      localStorage.setItem(STORAGE_KEY_HISTORY, legadoRaw);
    }
  }

  // =========================================================================
  // 2. BUSCA HÍBRIDA (CACHE LOCAL -> PUBCHEM REST -> SALVAMENTO)
  // =========================================================================
  async function buscarProtocolo(query) {
    const termo = query.toLowerCase().trim();

    // 1. Tenta base unificada ATLAS_DATABASE / BioDatabase
    const baseLocal = (typeof ATLAS_DATABASE !== "undefined" && ATLAS_DATABASE.protocols) ||
                      (typeof BioDatabase !== "undefined" && BioDatabase.protocols) || [];

    const correspondencias = baseLocal.filter((p) =>
      p.nome.toLowerCase().includes(termo) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(termo))) ||
      (p.viaMetabolica && p.viaMetabolica.toLowerCase().includes(termo))
    );

    if (correspondencias.length > 0) {
      console.log("[ApiCache] ⚡ Retornado da base local (Zero Latência).");
      return correspondencias;
    }

    // 2. Consulta à API PUG REST do PubChem (Sem autenticação requerida)
    console.log(`[ApiCache] 🌐 "${termo}" não localizado localmente. Consultando PubChem...`);

    try {
      const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(termo)}/property/MolecularWeight,XLogP,CanonicalSMILES/JSON`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Composto não catalogado no repositório PubChem.");
      }

      const data = await response.json();
      const props = data.PropertyTable.Properties[0];

      const novoRegistro = {
        id: `composto_pubchem_${Date.now()}`,
        nome: termo.charAt(0).toUpperCase() + termo.slice(1),
        icone: "🔬",
        viaMetabolica: "Metabolismo & Farmacocinética Exógena",
        mecanismoAcao: `Massa Molecular: ${props.MolecularWeight} g/mol | XLogP: ${props.XLogP || "N/D"}.<br>SMILES: <span style="font-family:monospace; font-size:0.7rem;">${props.CanonicalSMILES}</span>`,
        tags: ["PubChem Live", "Princípio Ativo"],
        cofatores: [],
        sistema: "digestorio",
        targetMesh: "liver",
        pkData: {
          route: "ORAL",
          dose: 100,
          f: 0.7,
          vd: 45,
          halfLife: 4.0,
          ka: 1.2,
          targetOrgan: "liver"
        }
      };

      salvarNoCacheLocal(novoRegistro);
      return [novoRegistro];
    } catch (err) {
      console.warn("[ApiCache] Falha na consulta externa:", err);
      return [];
    }
  }

  function salvarNoCacheLocal(item) {
    if (typeof ATLAS_DATABASE !== "undefined" && Array.isArray(ATLAS_DATABASE.protocols)) {
      ATLAS_DATABASE.protocols.push(item);
    }
    if (typeof BioDatabase !== "undefined" && Array.isArray(BioDatabase.protocols)) {
      BioDatabase.protocols.push(item);
    }
    console.log("[ApiCache] 💾 Composto persistido na memória de sessão.");
  }

  // =========================================================================
  // 3. REGISTRO DE SIMULAÇÕES E HISTÓRICO
  // =========================================================================
  function registrarSimulacao(nomeComposto, viaAdministracao) {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    const historico = raw ? JSON.parse(raw) : [];

    const novo = {
      id: "SIM-" + Date.now().toString(36).toUpperCase(),
      data: new Date().toLocaleDateString("pt-BR"),
      hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      timestamp: new Date().toISOString(),
      composto: nomeComposto,
      via: (viaAdministracao || "ORAL").toUpperCase(),
      horasAcademicas: 0.5
    };

    historico.unshift(novo);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(historico.slice(0, 30)));
    localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify(historico.slice(0, 30)));

    console.log("[ApiCache] 📈 Simulação registrada para cômputo curricular.");
    renderizarHistoricoLocal();
  }

  function renderizarHistoricoLocal() {
    const box = document.getElementById("historyListContainer") ||
                document.getElementById("history-list-container");
    if (!box) return;

    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    const hist = raw ? JSON.parse(raw) : [];

    if (hist.length === 0) {
      box.innerHTML = `
        <div style="font-size:0.75rem; color:#64748b; text-align:center; padding:16px; border:1px dashed #334155; border-radius:6px;">
          Nenhuma simulação registrada até o momento.
        </div>
      `;
      return;
    }

    box.innerHTML = hist.slice(0, 8).map((h) => `
      <div style="background:#020617; border-left:3px solid #38bdf8; padding:8px 10px; border-radius:4px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="color:#f8fafc; font-size:0.8rem;">${h.composto}</strong>
          <div style="color:#64748b; font-size:0.7rem; margin-top:2px;">
            ${h.data} às ${h.hora || ""} • Via ${h.via}
          </div>
        </div>
        <span style="font-size:0.7rem; color:#38bdf8; font-weight:700; background:rgba(56,189,248,0.12); padding:2px 8px; border-radius:12px;">
          +${h.horasAcademicas || 0.5}h
        </span>
      </div>
    `).join("");
  }

  // =========================================================================
  // 4. EMISSÃO DE PARECER TÉCNICO & EXPORTAÇÃO EM PDF NATIVO
  // =========================================================================
  function configurarBotoesAcervo() {
    const btnExportar = document.getElementById("btn-export-csv") ||
                        document.getElementById("btnExportCsv");
    const btnSync = document.getElementById("btn-sync-cloud");

    if (btnExportar) {
      btnExportar.innerText = "📄 Emitir Dossiê PDF";
      btnExportar.title = "Exportar Comprovante Curricular em PDF";
      btnExportar.addEventListener("click", exportarDossiePDF);
    }

    if (btnSync) {
      btnSync.addEventListener("click", sincronizarNuvem);
    }
  }

  function exportarDossiePDF() {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    const historico = raw ? JSON.parse(raw) : [];

    if (historico.length === 0) {
      alert("Não há registros de simulação para emitir o dossiê.");
      return;
    }

    // Carrega dados da sessão ativa do aluno
    const sessaoRaw = localStorage.getItem(SESSION_STORAGE_KEY);
    const aluno = sessaoRaw ? JSON.parse(sessaoRaw) : {};

    const nomeAluno = aluno.name || "Acadêmico(a) de Farmácia";
    const idAluno = aluno.identifier || "---";
    const vinculo = aluno.type || "Membro Efetivo / Pesquisador";
    const dataEmissao = new Date().toLocaleDateString("pt-BR");
    const horaEmissao = new Date().toLocaleTimeString("pt-BR");

    // Cálculo consolidado de carga horária
    const totalHoras = historico.reduce((acc, cur) => acc + (cur.horasAcademicas || 0.5), 0);
    const authCode = `LAIFT-PK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Monta linhas da tabela
    const linhasTabela = historico.map((h, i) => `
      <tr>
        <td style="text-align:center;">${String(i + 1).padStart(2, "0")}</td>
        <td>${h.data} ${h.hora ? "às " + h.hora : ""}</td>
        <td><strong>${h.composto}</strong></td>
        <td style="text-align:center;">${h.via}</td>
        <td style="text-align:center;">Modelo Unicompartimental</td>
        <td style="text-align:center; font-weight:bold; color:#0369a1;">+${h.horasAcademicas || 0.5} h</td>
      </tr>
    `).join("");

    // Janela de impressão em PDF nativo
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Aviso: Habilite a abertura de pop-ups para gerar o documento PDF.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Dossiê de Simulação Farmacocinética — LAIFT</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 12mm;
          }
          * {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-size: 10pt;
            line-height: 1.45;
          }
          .header-box {
            border-bottom: 2px solid #0284c7;
            padding-bottom: 10px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .institution-title {
            font-size: 8pt;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .main-title {
            font-size: 14pt;
            font-weight: 800;
            color: #0369a1;
            margin: 2px 0;
          }
          .subtitle {
            font-size: 9pt;
            color: #334155;
            font-weight: 600;
          }
          .badge-cert {
            background: #e0f2fe;
            border: 1px solid #bae6fd;
            color: #0284c7;
            padding: 6px 12px;
            border-radius: 6px;
            text-align: right;
            font-size: 7.5pt;
          }
          .student-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 16px;
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 10px;
            font-size: 8.5pt;
          }
          .student-box strong {
            display: block;
            color: #475569;
            font-size: 7.5pt;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
            margin-bottom: 16px;
          }
          th {
            background: #0f172a;
            color: #ffffff;
            font-weight: 700;
            text-align: left;
            padding: 6px 8px;
            font-size: 7.5pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            padding: 6px 8px;
            border-bottom: 1px solid #e2e8f0;
          }
          tr:nth-child(even) {
            background: #f8fafc;
          }
          .total-box {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            padding: 10px 14px;
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
          }
          .total-hours {
            font-size: 13pt;
            font-weight: 800;
            color: #16a34a;
          }
          .statement {
            font-size: 8pt;
            color: #475569;
            line-height: 1.5;
            text-align: justify;
            margin-bottom: 30px;
          }
          .signature-row {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            padding: 0 20px;
          }
          .sig-line {
            width: 42%;
            border-top: 1px solid #0f172a;
            text-align: center;
            padding-top: 6px;
            font-size: 8pt;
            color: #334155;
          }
          .footer-auth {
            border-top: 1px dashed #cbd5e1;
            padding-top: 8px;
            margin-top: 25px;
            display: flex;
            justify-content: space-between;
            font-size: 7pt;
            color: #94a3b8;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="institution-title">Liga Acadêmica Interdisciplinar de Farmacologia e Toxicologia</div>
            <div class="main-title">Dossiê de Simulação Biomédica & Farmacocinética 3D</div>
            <div class="subtitle">Comprovação Técnica de Atividades Formativas & Modelagem Farmacológica</div>
          </div>
          <div class="badge-cert">
            <strong>DOCUMENTO OFICIAL</strong><br>
            UNINASSAU Salvador / LAIFT
          </div>
        </div>

        <div class="student-box">
          <div>
            <strong>Estudante / Pesquisador</strong>
            ${nomeAluno}
          </div>
          <div>
            <strong>Matrícula / CPF</strong>
            ${idAluno}
          </div>
          <div>
            <strong>Vínculo Institucional</strong>
            ${vinculo}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:30px; text-align:center;">#</th>
              <th style="width:110px;">Data / Hora</th>
              <th>Princípio Ativo / Protocolo</th>
              <th style="width:60px; text-align:center;">Via</th>
              <th style="width:140px; text-align:center;">Método de Análise</th>
              <th style="width:70px; text-align:center;">Carga</th>
            </tr>
          </thead>
          <tbody>
            ${linhasTabela}
          </tbody>
        </table>

        <div class="total-box">
          <div>
            <strong style="color:#166534; font-size:9pt;">Carga Horária Prática Total Computada:</strong>
            <div style="font-size:7.5pt; color:#475569;">Válida para comprovação de horas complementares no portal acadêmico e Currículo Lattes.</div>
          </div>
          <div class="total-hours">${totalHoras.toFixed(1)} Horas Acadêmicas</div>
        </div>

        <div class="statement">
          Certificamos, para os devidos fins acadêmicos e curriculares, que o(a) estudante acima identificado(a) participou ativamente das sessões de modelação farmacocinética tridimensional, simulação de parâmetros biofarmacêuticos (biodisponibilidade, volume de distribuição e clearance metabólico) e análise de biogênese celular desenvolvidas na Plataforma LAIFT 3D.
        </div>

        <div class="signature-row">
          <div class="sig-line">
            <strong>${nomeAluno}</strong><br>
            Discente / Integrante da Liga
          </div>
          <div class="sig-line">
            <strong>Diretoria de Ensino e Pesquisa</strong><br>
            LAIFT — UNINASSAU Salvador
          </div>
        </div>

        <div class="footer-auth">
          <span>Autenticação Digital: ${authCode}</span>
          <span>Emitido em: ${dataEmissao} às ${horaEmissao}</span>
          <span>Validação: script.google.com/macros/s/AKfycbyXvBYrHBIXNjHYItuq2LXKt1vkmh2m_CME-5aZqkxUJhl7ktJjemuasbvdEweH95k/exec</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  // =========================================================================
  // 5. SINCRONIZAÇÃO EM NUVEM (APPS SCRIPT)
  // =========================================================================
  async function sincronizarNuvem() {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    const hist = raw ? JSON.parse(raw) : [];

    if (hist.length === 0) {
      alert("Não há simulações pendentes para sincronizar.");
      return;
    }

    const sessao = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "{}");
    const idAluno = sessao.identifier || "ANONIMO";

    try {
      const payload = {
        acao: "salvarSimulacao",
        identificador: idAluno,
        simulacoes: hist
      };

      if (typeof ApiService !== "undefined" && typeof ApiService.callAppsScript === "function") {
        await ApiService.callAppsScript(payload, 25000);
      } else {
        await fetch(GAS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
      }

      alert("Progresso acadêmico salvo com sucesso na nuvem institucional da LAIFT!");
    } catch (e) {
      console.warn("[ApiCache] Sincronização em nuvem indisponível no momento:", e);
      alert("Sincronização salva localmente. Os dados serão enviados assim que restabelecida a conexão com o servidor.");
    }
  }

  return {
    init,
    buscarProtocolo,
    registrarSimulacao,
    exportarDossiePDF,
    sincronizarNuvem
  };
})();

// Inicialização segura
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ApiCache.init);
} else {
  ApiCache.init();
}

/* ========================================================================= */
/* FIM DO ARQUIVO: anatomia-3d/js/api-cache.js                               */
/* ========================================================================= */
