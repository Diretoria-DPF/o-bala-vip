/**
 * TERMINAL FISCAL, VALIDAÇÃO DE QR CODE E STUDIO DE CRACHÁ
 * Liga Acadêmica Interdisciplinar de Farmacologia e Toxicologia (LAIFT)
 */

const FiscalEngine = (() => {
  let fiscalSession = '';
  let scannerInstance = null;
  let scanInProgress = false;
  let logoPressTimer = null;
  let memberSearchTimer = null;

  const QR_PREFIX = 'LAIFT:v1:';
  const SESSION_STORAGE_KEY = 'laift_student_session';

  function getStatusBanner(msg, type) {
    if (typeof window.showStatus === 'function') {
      window.showStatus(msg, type);
    } else {
      const el = document.getElementById('status');
      if (el) {
        el.textContent = msg;
        el.className = `status-banner ${type}`;
        el.classList.remove('hidden');
      }
    }
  }

  function clearStatusBanner() {
    if (typeof window.hideStatus === 'function') {
      window.hideStatus();
    } else {
      const el = document.getElementById('status');
      if (el) el.classList.add('hidden');
    }
  }

  // =========================================================
  // INTEGRAÇÃO COM O STUDIO DE CRACHÁS (CR-80)
  // =========================================================

  /**
   * Abre o Studio de Crachá preenchendo os parâmetros na URL
   */
  function abrirStudioCracha(membro) {
    if (!membro || !membro.identificador) {
      getStatusBanner('Identificador do participante não informado.', 'error');
      return;
    }

    const id = encodeURIComponent(membro.identificador);
    const nome = encodeURIComponent(membro.nome || membro.nomeExibicao || 'Participante LAIFT');
    const cargo = encodeURIComponent((membro.tipo || 'Membro').toUpperCase());
    const qr = encodeURIComponent(`LAIFT:ID:${membro.identificador}`);

    const url = `cracha/index.html?id=${id}&nome=${nome}&cargo=${cargo}&qr=${qr}`;
    window.open(url, '_blank');
  }

  /**
   * Acionado pelo botão '🏷️ Emitir Crachá' ao lado da Matrícula/CPF manual
   */
  function gerarCrachaDireto() {
    const idInput = document.getElementById('manualIdentifier');
    const identifier = idInput ? idInput.value.trim() : '';

    if (!identifier) {
      getStatusBanner('Digite a matrícula ou CPF no campo ao lado para emitir o crachá.', 'error');
      if (idInput) idInput.focus();
      return;
    }

    abrirStudioCracha({
      identificador: identifier,
      nome: 'Participante Credenciado',
      tipo: 'Membro Efetivo'
    });
  }

  // =========================================================
  // REENVIO DE CREDENCIAL AO ALUNO
  // =========================================================

  async function resendCredentialEmail() {
    const session = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '{}');
    if (!session.sessionToken) {
      getStatusBanner('Sessão expirada. Autentique-se novamente.', 'error');
      return;
    }

    getStatusBanner('Enviando QR Code para seu e-mail...', 'loading');
    try {
      const res = await ApiService.reenviarCredencialEmail(session.sessionToken);
      if (res && res.sucesso) {
        getStatusBanner(res.mensagem || 'QR Code reenviado com sucesso.', 'success');
      } else {
        getStatusBanner((res && res.mensagem) || 'Não foi possível reenviar a credencial.', 'error');
      }
    } catch (err) {
      console.error(err);
      getStatusBanner('Erro de conexão ao reenviar e-mail.', 'error');
    }
  }

  // =========================================================
  // ACESSO AO TERMINAL FISCAL
  // =========================================================

  async function openFiscalLogin() {
    if (fiscalSession) return;

    const password = prompt('Terminal restrito. Digite a senha fiscal:');
    if (!password) return;

    getStatusBanner('Validando acesso fiscal...', 'loading');
    try {
      const res = await ApiService.loginFiscal(password);
      if (!res || !res.sucesso || !res.sessao) {
        getStatusBanner((res && res.mensagem) || 'Credenciais inválidas.', 'error');
        return;
      }

      fiscalSession = res.sessao;
      clearStatusBanner();

      ['identityForm', 'registrationForm', 'otpForm', 'credentialScreen'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });

      const fiscalArea = document.getElementById('fiscalArea');
      if (fiscalArea) fiscalArea.classList.remove('hidden');

      const subtitle = document.getElementById('headerSubtitle');
      if (subtitle) subtitle.textContent = 'Terminal de Validação & Portaria';

      const eventInput = document.getElementById('eventName');
      if (eventInput) eventInput.value = res.evento || res.eventoAtivo || '';
    } catch (err) {
      console.error(err);
      getStatusBanner('Falha ao autenticar terminal fiscal.', 'error');
    }
  }

  async function saveActiveEvent() {
    const eventInput = document.getElementById('eventName');
    const eventName = eventInput ? eventInput.value.trim() : '';

    if (!eventName) {
      getStatusBanner('Digite o nome do evento ativo.', 'error');
      return;
    }

    getStatusBanner('Atualizando evento...', 'loading');
    try {
      const res = await ApiService.salvarEvento(eventName, fiscalSession);
      if (res && res.sucesso) {
        if (eventInput) eventInput.value = res.novoEvento || res.eventoAtivo || eventName;
        getStatusBanner('Evento ativo atualizado com sucesso.', 'success');
      } else {
        getStatusBanner((res && res.mensagem) || 'Não foi possível atualizar o evento.', 'error');
      }
    } catch (err) {
      console.error(err);
      getStatusBanner('Erro ao atualizar evento.', 'error');
    }
  }

  // =========================================================
  // SCANNER DE QR CODE
  // =========================================================

  function extractQrCredential(decodedText) {
    const cred = String(decodedText || '').trim();
    if (cred.startsWith(QR_PREFIX)) {
      const token = cred.substring(QR_PREFIX.length);
      return /^[a-f0-9]{64}$/i.test(token) ? cred : '';
    }
    if (cred.startsWith('LAIFT:ID:')) {
      return cred;
    }
    return '';
  }

  function startFiscalScanner() {
    if (scanInProgress || scannerInstance) return;

    const readerEl = document.getElementById('reader');
    const scannerBtn = document.getElementById('scannerButton');

    if (readerEl) readerEl.classList.remove('hidden');
    if (scannerBtn) scannerBtn.classList.add('hidden');
    clearStatusBanner();

    scannerInstance = new Html5QrcodeScanner(
      'reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scannerInstance.render(
      async (decodedText) => {
        if (scanInProgress) return;
        scanInProgress = true;

        const validCred = extractQrCredential(decodedText);
        if (!validCred) {
          getStatusBanner('QR Code não reconhecido como credencial LAIFT.', 'error');
          scanInProgress = false;
          return;
        }

        getStatusBanner('Credencial lida. Validando presença...', 'loading');
        await closeScanner();

        try {
          const res = await ApiService.carimbarPresenca(validCred, fiscalSession);
          if (res && res.sucesso) {
            getStatusBanner(res.mensagem || 'Presença confirmada.', 'success');
          } else {
            getStatusBanner((res && res.mensagem) || 'Não foi possível registrar a presença.', 'error');
          }
        } catch (err) {
          console.error(err);
          getStatusBanner('Erro ao comunicar com o servidor.', 'error');
        } finally {
          scanInProgress = false;
        }
      },
      () => {}
    );
  }

  async function closeScanner() {
    if (!scannerInstance) return;
    try {
      await scannerInstance.clear();
    } catch (e) {
      console.warn('Aviso ao encerrar scanner:', e);
    }
    scannerInstance = null;

    const readerEl = document.getElementById('reader');
    const scannerBtn = document.getElementById('scannerButton');
    if (readerEl) readerEl.classList.add('hidden');
    if (scannerBtn) scannerBtn.classList.remove('hidden');
  }

  async function submitManualCheckin() {
    const idInput = document.getElementById('manualIdentifier');
    const identifier = idInput ? idInput.value.trim() : '';

    if (!identifier) {
      getStatusBanner('Digite a matrícula ou CPF do participante.', 'error');
      return;
    }

    getStatusBanner('Registrando presença...', 'loading');
    try {
      const res = await ApiService.carimbarPresencaManual(identifier, fiscalSession);
      if (idInput) idInput.value = '';

      if (res && res.sucesso) {
        getStatusBanner(res.mensagem || 'Presença confirmada.', 'success');
      } else {
        getStatusBanner((res && res.mensagem) || 'Não foi possível registrar a presença.', 'error');
      }
    } catch (err) {
      console.error(err);
      getStatusBanner('Erro ao registrar presença.', 'error');
    }
  }

  // =========================================================
  // PESQUISA NOMINAL & LISTAGEM DE MEMBROS
  // =========================================================

  function scheduleMemberSearch() {
    clearTimeout(memberSearchTimer);
    memberSearchTimer = setTimeout(searchMembers, 350);
  }

  async function searchMembers() {
    const searchInput = document.getElementById('memberSearch');
    const term = searchInput ? searchInput.value.trim() : '';
    const list = document.getElementById('memberList');
    if (!list) return;

    if (term.length < 2) {
      list.innerHTML = `
        <div class="member-list-empty">
          Digite ao menos dois caracteres para pesquisar participantes.
        </div>
      `;
      return;
    }

    list.innerHTML = `
      <div class="member-list-empty">
        Buscando participantes na base da LAIFT...
      </div>
    `;

    try {
      let res;
      if (typeof ApiService.listarMembros === 'function') {
        res = await ApiService.listarMembros(term, fiscalSession);
      } else if (typeof ApiService.callAppsScript === 'function') {
        res = await ApiService.callAppsScript({
          acao: 'listarMembros',
          termo: term,
          sessao: fiscalSession
        });
      } else {
        throw new Error('Método de listagem não disponível no ApiService.');
      }

      if (!res || !res.sucesso) {
        list.innerHTML = `
          <div class="member-list-empty">
            ${(res && res.mensagem) || 'Não foi possível consultar a lista.'}
          </div>
        `;
        return;
      }

      renderMemberList(res.membros || []);
    } catch (err) {
      console.error('Falha na consulta de membros:', err);
      list.innerHTML = `
        <div class="member-list-empty">
          Não foi possível consultar a lista no momento.
        </div>
      `;
    }
  }

  function renderMemberList(members) {
    const list = document.getElementById('memberList');
    if (!list) return;

    if (!members || !members.length) {
      list.innerHTML = `
        <div class="member-list-empty">
          Nenhum participante encontrado.
        </div>
      `;
      return;
    }

    list.innerHTML = '';
    members.forEach((member) => {
      const item = document.createElement('div');
      item.className = 'member-item';
      item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--line, #e2e8f0); gap: 10px;';

      const info = document.createElement('div');
      info.className = 'member-info';
      info.style.cssText = 'flex: 1; text-align: left;';

      const name = document.createElement('div');
      name.className = 'member-name';
      name.style.cssText = 'font-weight: 600; color: var(--text-ui, #0f172a);';
      name.textContent = member.nomeExibicao || member.nome || 'Participante';

      const meta = document.createElement('div');
      meta.className = 'member-meta';
      meta.style.cssText = 'font-size: 0.8rem; color: var(--muted, #64748b); margin-top: 2px;';
      meta.textContent = `${member.tipo || 'Participante'} · ${member.identificador || ''}`;

      info.appendChild(name);
      info.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'member-actions';
      actions.style.cssText = 'display: flex; gap: 6px; align-items: center;';

      const btnPresence = document.createElement('button');
      btnPresence.type = 'button';
      btnPresence.className = 'btn btn-secondary btn-sm';
      btnPresence.textContent = '✅ Presença';
      btnPresence.addEventListener('click', () => {
        markPresenceFromList(member.identificador);
      });

      const btnCracha = document.createElement('button');
      btnCracha.type = 'button';
      btnCracha.className = 'btn btn-outline btn-sm';
      btnCracha.textContent = '🏷️ Crachá';
      btnCracha.addEventListener('click', () => {
        abrirStudioCracha(member);
      });

      actions.appendChild(btnPresence);
      actions.appendChild(btnCracha);

      item.appendChild(info);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  async function markPresenceFromList(identifier) {
    if (!identifier) return;

    getStatusBanner('Registrando presença pela lista...', 'loading');
    try {
      let res;
      if (typeof ApiService.marcarPresencaLista === 'function') {
        res = await ApiService.marcarPresencaLista(identifier, fiscalSession);
      } else if (typeof ApiService.callAppsScript === 'function') {
        res = await ApiService.callAppsScript({
          acao: 'marcarPresencaLista',
          identificador: identifier,
          sessao: fiscalSession
        });
      } else {
        throw new Error('Método de presença não disponível no ApiService.');
      }

      if (res && res.sucesso) {
        getStatusBanner(res.mensagem || 'Presença confirmada.', 'success');
      } else {
        getStatusBanner((res && res.mensagem) || 'Não foi possível registrar a presença.', 'error');
      }
    } catch (err) {
      console.error(err);
      getStatusBanner('Erro ao registrar presença.', 'error');
    }
  }

  // =========================================================
  // ENCERRAMENTO DE SESSÃO FISCAL
  // =========================================================

  async function logoutFiscal() {
    try {
      if (fiscalSession && typeof ApiService.logoutFiscal === 'function') {
        await ApiService.logoutFiscal(fiscalSession);
      }
    } catch (e) {
      console.warn('Aviso de logout fiscal:', e);
    }

    await closeScanner();
    fiscalSession = '';
    scanInProgress = false;

    const fiscalArea = document.getElementById('fiscalArea');
    if (fiscalArea) fiscalArea.classList.add('hidden');

    const identityForm = document.getElementById('identityForm');
    if (identityForm) identityForm.classList.remove('hidden');

    const subtitle = document.getElementById('headerSubtitle');
    if (subtitle) subtitle.textContent = 'Portal de Credencial Acadêmica';

    const eventName = document.getElementById('eventName');
    if (eventName) eventName.value = '';

    const manualId = document.getElementById('manualIdentifier');
    if (manualId) manualId.value = '';

    const searchInput = document.getElementById('memberSearch');
    if (searchInput) searchInput.value = '';

    const memberList = document.getElementById('memberList');
    if (memberList) {
      memberList.innerHTML = `
        <div class="member-list-empty">
          Digite ao menos dois caracteres para pesquisar participantes.
        </div>
      `;
    }

    clearStatusBanner();
    if (typeof window.restartPublicFlow === 'function') {
      window.restartPublicFlow();
    }
  }

  function initListeners() {
    const logo = document.getElementById('laiftLogo');
    if (!logo) return;

    logo.addEventListener('dblclick', openFiscalLogin);

    logo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFiscalLogin();
      }
    });

    logo.addEventListener('touchstart', () => {
      if (fiscalSession) return;
      logoPressTimer = setTimeout(openFiscalLogin, 700);
    }, { passive: true });

    logo.addEventListener('touchend', () => clearTimeout(logoPressTimer), { passive: true });
    logo.addEventListener('touchcancel', () => clearTimeout(logoPressTimer), { passive: true });
  }

  return {
    initListeners,
    openFiscalLogin,
    saveActiveEvent,
    startFiscalScanner,
    submitManualCheckin,
    scheduleMemberSearch,
    markPresenceFromList,
    logoutFiscal,
    resendCredentialEmail,
    abrirStudioCracha,
    gerarCrachaDireto
  };
})();

// Declarações globais para suporte aos botões e eventos inline do HTML
window.FiscalEngine = FiscalEngine;
window.resendCredentialEmail = FiscalEngine.resendCredentialEmail;
window.saveActiveEvent = FiscalEngine.saveActiveEvent;
window.startFiscalScanner = FiscalEngine.startFiscalScanner;
window.submitManualCheckin = FiscalEngine.submitManualCheckin;
window.scheduleMemberSearch = FiscalEngine.scheduleMemberSearch;
window.logoutFiscal = FiscalEngine.logoutFiscal;
window.gerarCrachaDireto = FiscalEngine.gerarCrachaDireto;
window.abrirStudioCracha = FiscalEngine.abrirStudioCracha;

window.addEventListener('DOMContentLoaded', FiscalEngine.initListeners);
