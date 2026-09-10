/**
 * LAIFT Studio — Web Worker de Indexação
 * Processa 2500+ compostos em thread separada para não travar a UI.
 * 
 * Mensagens recebidas:
 *   { tipo: 'INDEXAR', payload: { labDb, synthDb, expandidoDb, reserva } }
 * 
 * Mensagens enviadas:
 *   { tipo: 'INDEXADO', compostos: [...] }
 *   { tipo: 'PROGRESSO', etapa: 'texto', percentual: 0-100 }
 *   { tipo: 'ERRO', mensagem: 'texto' }
 */

self.onmessage = function(event) {
  const { tipo, payload } = event.data;

  if (tipo === 'INDEXAR') {
    try {
      self.postMessage({ tipo: 'PROGRESSO', etapa: 'Iniciando indexação...', percentual: 0 });
      const resultado = indexarAcervo(
        payload.labDb,
        payload.synthDb,
        payload.expandidoDb,
        payload.reserva || []
      );
      self.postMessage({ tipo: 'PROGRESSO', etapa: 'Concluído', percentual: 100 });
      self.postMessage({ tipo: 'INDEXADO', compostos: resultado });
    } catch (err) {
      self.postMessage({ tipo: 'ERRO', mensagem: err.message || String(err) });
    }
  }
};

function indexarAcervo(labDb, synthDb, expandidoDb, reserva) {
  const mapaUnico = new Map();

  // ── FASE 1: Laboratório principal ──────────────────────────────
  if (labDb && labDb.species) {
    const entradas = Object.entries(labDb.species);
    entradas.forEach(([chave, dados]) => {
      const id = chave.replace(/_s|_l|_aq|_g/g, '');
      mapaUnico.set(id.toLowerCase(), {
        id: id,
        chaveOriginal: chave,
        nome: dados.label || id,
        formula: dados.formula || '--',
        molarMass: dados.molarMass || '--',
        smiles: dados.smiles || '--',
        iupac: dados.iupac || '',
        categoria: classificarCategoria(chave, dados.label),
        pubchemQuery: dados.pubchemQuery || dados.label || id,
        fonte: 'lab-database'
      });
    });
  }

  // ── FASE 2: Banco de sínteses farmacêuticas ────────────────────
  if (synthDb && Array.isArray(synthDb)) {
    synthDb.forEach(synth => {
      if (!synth || !synth.nomeComposto) return;
      const id = synth.produtoId || synth.id || synth.nomeComposto;
      const norm = id.toLowerCase();
      if (!mapaUnico.has(norm)) {
        mapaUnico.set(norm, {
          id: id,
          chaveOriginal: synth.produtoId || synth.id,
          nome: synth.nomeComposto,
          formula: synth.formula || '--',
          molarMass: synth.molarMass || '--',
          smiles: synth.smiles || '--',
          iupac: synth.iupac || '',
          categoria: 'farmacos',
          pubchemQuery: synth.pubchemQuery || synth.nomeComposto,
          fonte: 'sinteses-database'
        });
      }
    });
  }

  // ── FASE 3: Catálogo expandido ─────────────────────────────────
  if (expandidoDb && Array.isArray(expandidoDb)) {
    expandidoDb.forEach(c => {
      if (!c || !c.nome) return;
      const norm = (c.id || c.nome).toLowerCase();
      if (!mapaUnico.has(norm)) {
        mapaUnico.set(norm, {
          id: c.id || c.nome,
          chaveOriginal: c.chave || c.id || c.nome,
          nome: c.nome,
          formula: c.formula || '--',
          molarMass: c.molarMass || '--',
          smiles: c.smiles || '--',
          iupac: c.iupac || '',
          categoria: c.categoria || classificarCategoria(c.chave || '', c.nome),
          pubchemQuery: c.pubchemQuery || c.nome,
          fonte: 'expandido'
        });
      }
    });
  }

  // ── FASE 4: Acervo de reserva ──────────────────────────────────
  if (Array.isArray(reserva)) {
    reserva.forEach(comp => {
      if (!comp || !comp.id) return;
      const norm = comp.id.toLowerCase();
      if (!mapaUnico.has(norm)) {
        mapaUnico.set(norm, { ...comp, fonte: comp.fonte || 'reserva' });
      }
    });
  }

  // ── FASE 5: Ordenação alfabética ───────────────────────────────
  const arr = Array.from(mapaUnico.values());
  arr.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
  return arr;
}

/**
 * Classifica o composto em uma categoria semântica.
 * Ordem de prioridade: toxicos > solventes > reagentes > farmacos.
 */
function classificarCategoria(chave, label) {
  const txt = ((chave || '') + ' ' + (label || '')).toLowerCase();
  if (/custom|derivado|editado|análogo|scaffold_/.test(txt)) return 'custom';
  if (/sarin|vx|estricnina|toxina|mostarda|cianeto|arsenio|arsênio|fentanil/.test(txt)) return 'toxicos';
  if (/agua|etanol|metanol|acetona|hexano|cloroformio|dmso|thf|tolueno|benzeno|dichlorometano/.test(txt)) return 'solventes';
  if (/acido|ácido|hidroxido|hidróxido|cloreto|sulfato|nitrato|anidrido|sodio|sódio|potassio|potássio|carbonato|fosfato/.test(txt)) return 'reagentes';
  return 'farmacos';
}
