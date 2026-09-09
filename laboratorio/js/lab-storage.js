/**
 * LAIFT — GERENCIADOR DE BANCO DE DADOS LOCAL (IndexedDB) & MOTOR 3D (3Dmol.js)
 * Cobre cache offline, conformações 3D e aprendizado de máquina contínuo.
 */

const LabStorageEngine = {
  DB_NAME: 'LAIFT_ChemRepository_v1',
  DB_VERSION: 1,
  dbInstance: null,
  viewer3DInstance: null,
  modoAtual: '2D', // '2D' ou '3D'

  /**
   * Inicializa o banco IndexedDB no navegador do estudante
   */
  async initDB() {
    if (this.dbInstance) return this.dbInstance;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        // Tabela 1: Compostos Químicos (Identificadores, 3D SDF, Propriedades físicas)
        if (!db.objectStoreNames.contains('compostos')) {
          const compStore = db.createObjectStore('compostos', { keyPath: 'termoChave' });
          compStore.createIndex('cid', 'cid', { unique: false });
        }
        // Tabela 2: Sínteses Destiladas (Mecanismos, Passos curados pelo Groq 120B)
        if (!db.objectStoreNames.contains('rotas_sintese')) {
          db.createObjectStore('rotas_sintese', { keyPath: 'compostoAlvo' });
        }
      };

      request.onsuccess = (e) => {
        this.dbInstance = e.target.result;
        resolve(this.dbInstance);
      };

      request.onerror = (e) => reject(e);
    });
  },

  /**
   * Recupera composto armazenado localmente
   */
  async obterCompostoLocal(termo) {
    const db = await this.initDB();
    const chave = termo.trim().toLowerCase();
    return new Promise((resolve) => {
      const tx = db.transaction('compostos', 'readonly');
      const store = tx.objectStore('compostos');
      const req = store.get(chave);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  },

  /**
   * Salva composto e suas propriedades físicas no banco local
   */
  async salvarCompostoLocal(termo, dados) {
    const db = await this.initDB();
    const chave = termo.trim().toLowerCase();
    return new Promise((resolve) => {
      const tx = db.transaction('compostos', 'readwrite');
      const store = tx.objectStore('compostos');
      dados.termoChave = chave;
      dados.timestamp = Date.now();
      store.put(dados);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  },

  /**
   * Armazena rotas geradas pelo Preceptor para não gastar novos tokens
   */
  async obterRotaSinteseLocal(termo) {
    const db = await this.initDB();
    const chave = termo.trim().toLowerCase();
    return new Promise((resolve) => {
      const tx = db.transaction('rotas_sintese', 'readonly');
      const store = tx.objectStore('rotas_sintese');
      const req = store.get(chave);
      req.onsuccess = () => resolve(req.result ? req.result.conteudo : null);
      req.onerror = () => resolve(null);
    });
  },

  async salvarRotaSinteseLocal(termo, textoResposta) {
    const db = await this.initDB();
    const chave = termo.trim().toLowerCase();
    return new Promise((resolve) => {
      const tx = db.transaction('rotas_sintese', 'readwrite');
      const store = tx.objectStore('rotas_sintese');
      store.put({
        compostoAlvo: chave,
        conteudo: textoResposta,
        timestamp: Date.now()
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  },

  /**
   * Baixa a estrutura tridimensional real (3D Conformer SDF) da PubChem
   */
  async baixarEstrutura3D_SDF(cidOuNome) {
    try {
      let url = "";
      if (typeof cidOuNome === 'number' || /^\d+$/.test(cidOuNome)) {
        url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cidOuNome}/SDF?record_type=3d`;
      } else {
        url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(cidOuNome)}/SDF?record_type=3d`;
      }

      const res = await fetch(url);
      if (!res.ok) return null;
      const sdfText = await res.text();
      return (sdfText && sdfText.includes("$$$$")) ? sdfText : null;
    } catch (e) {
      console.warn('[3D Engine] Falha ao baixar conformação 3D:', e);
      return null;
    }
  },

  /**
   * Renderiza a molécula tridimensional interativa com WebGL via 3Dmol.js
   */
  renderizar3DMol(sdfData, containerId = 'viewer3D') {
    const container = document.getElementById(containerId);
    if (!container || !window.$3Dmol) return;

    container.innerHTML = '';
    container.style.display = 'block';

    const config = { backgroundColor: '#020617' };
    this.viewer3DInstance = $3Dmol.createViewer(container, config);
    this.viewer3DInstance.addModel(sdfData, "sdf");

    // Estilo Farmacêutico: Bastão e Esferas (Stick & Ball) com superfícies de Van der Waals suaves
    this.viewer3DInstance.setStyle({}, {
      stick: { radius: 0.14, colorscheme: 'Jmol' },
      sphere: { scale: 0.26, colorscheme: 'Jmol' }
    });

    this.viewer3DInstance.zoomTo();
    this.viewer3DInstance.render();
    this.viewer3DInstance.animate({ loop: "backAndForth", step: 0.4 });
  },

  /**
   * Alterna a visualização entre Projeção 2D e Conformer 3D
   */
  alternarModo(modo) {
    this.modoAtual = modo;
    const canvas2D = document.getElementById('moleculeCanvas');
    const img2D = document.getElementById('moleculeImg');
    const div3D = document.getElementById('viewer3D');
    const btn2D = document.getElementById('btnModo2D');
    const btn3D = document.getElementById('btnModo3D');

    if (btn2D) btn2D.classList.toggle('active-btn', modo === '2D');
    if (btn3D) btn3D.classList.toggle('active-btn', modo === '3D');

    if (modo === '2D') {
      if (div3D) div3D.style.display = 'none';
      if (canvas2D) canvas2D.style.display = 'block';
    } else {
      if (canvas2D) canvas2D.style.display = 'none';
      if (img2D) img2D.style.display = 'none';
      if (div3D) div3D.style.display = 'block';
      if (this.viewer3DInstance) {
        this.viewer3DInstance.resize();
        this.viewer3DInstance.render();
      }
    }
  }
};

window.setModoVisualizacao = function(modo) {
  LabStorageEngine.alternarModo(modo);
};

// Exportação global
if (typeof window !== "undefined") {
  window.LabStorageEngine = LabStorageEngine;
}
