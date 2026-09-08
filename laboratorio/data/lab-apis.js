/**
 * SISTEMA UNIFICADO DE SERVIÇOS CIENTÍFICOS & QUEMOINFORMÁTICA (LAIFT)
 * Conexão com PubChem, CACTUS, Wikidata e ChEBI.
 */

const ChemicalAPIEngine = {
  
  // 1. PUBCHEM PUG-REST: Propriedades Físico-Químicas e Estruturais
  async fetchPubChem(name) {
    try {
      const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name.trim())}/property/MolecularWeight,MolecularFormula,CanonicalSMILES,IUPACName/JSON`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const prop = data?.PropertyTable?.Properties?.[0];
      if (!prop) return null;

      return {
        origem: 'PubChem',
        cid: prop.CID,
        formula: prop.MolecularFormula,
        molarMass: parseFloat(prop.MolecularWeight),
        smiles: prop.CanonicalSMILES,
        iupac: prop.IUPACName
      };
    } catch (e) {
      console.warn('[API Engine] PubChem indisponível:', e);
      return null;
    }
  },

  // 2. CACTUS (NCI/NIH): Resolução Rápida de Identificadores e SMILES
  async fetchCactus(name, representation = 'smiles') {
    try {
      const url = `https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(name.trim())}/${representation}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const text = await res.text();
      return text.trim();
    } catch (e) {
      console.warn('[API Engine] CACTUS indisponível:', e);
      return null;
    }
  },

  // 3. WIKIDATA SPARQL: Cruzamento de Identificadores Globais e CAS
  async fetchWikidata(name) {
    try {
      const sparqlQuery = `
        SELECT ?item ?cas ?chembl ?pubchem WHERE {
          ?item ?label "${name}"@en.
          OPTIONAL { ?item wdt:P231 ?cas. }
          OPTIONAL { ?item wdt:P592 ?chembl. }
          OPTIONAL { ?item wdt:P662 ?pubchem. }
        } LIMIT 1
      `;
      const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;
      const res = await fetch(url, { headers: { 'Accept': 'application/sparql-results+json' } });
      if (!res.ok) return null;
      const data = await res.json();
      const binding = data?.results?.bindings?.[0];
      if (!binding) return null;

      return {
        cas: binding.cas?.value || null,
        chemblId: binding.chembl?.value || null,
        pubchemCid: binding.pubchem?.value || null
      };
    } catch (e) {
      console.warn('[API Engine] Wikidata indisponível:', e);
      return null;
    }
  },

  // 4. ChEBI via EBI Search REST: Papel Biológico e Aplicação Farmacêutica
  async fetchChebiOntology(name) {
    try {
      const url = `https://www.ebi.ac.uk/ebisearch/ws/rest/chebi?query=${encodeURIComponent(name)}&format=json&fields=name,definition`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const hit = data?.entries?.[0];
      if (!hit) return null;

      return {
        chebiId: hit.id,
        definicao: hit.fields?.definition?.[0] || 'Sem definição biológica indexada.'
      };
    } catch (e) {
      console.warn('[API Engine] ChEBI indisponível:', e);
      return null;
    }
  },

  // 5. ORQUESTRADOR EM CASCATA: Consolidação de Dados
  async resolveCompleteCompound(name) {
    let compoundData = await this.fetchPubChem(name);

    // Se a PubChem falhar, aciona CACTUS como contingência estrutural
    if (!compoundData) {
      const [smiles, iupac, formula] = await Promise.all([
        this.fetchCactus(name, 'smiles'),
        this.fetchCactus(name, 'iupac_name'),
        this.fetchCactus(name, 'formula')
      ]);

      if (smiles) {
        compoundData = {
          origem: 'CACTUS Fallback',
          cid: '--',
          formula: formula || 'Indeterminada',
          molarMass: '--',
          smiles: smiles,
          iupac: iupac || name
        };
      }
    }

    if (!compoundData) return null;

    // Enriquecimento contextual com ChEBI e Wikidata em paralelo
    const [wikiInfo, chebiInfo] = await Promise.all([
      this.fetchWikidata(name),
      this.fetchChebiOntology(name)
    ]);

    return {
      ...compoundData,
      cas: wikiInfo?.cas || '--',
      chemblId: wikiInfo?.chemblId || '--',
      chebiId: chebiInfo?.chebiId || '--',
      papelBiologico: chebiInfo?.definicao || '--'
    };
  }
};
