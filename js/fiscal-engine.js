/**
 * TERMINAL FISCAL, VALIDAÇÃO DE QR CODE E AÇÕES DE CREDENCIAL
 * Liga Acadêmica Interdisciplinar de Farmacologia e Toxicologia (LAIFT)
 */

const FiscalEngine = (() => {
  let fiscalSession = '';
  let scannerInstance = null;
  let scanInProgress = false;
  let logoPressTimer = null;
  let memberSearchTimer = null;

  const QR_PREFIX = 'LAIFT:v1:';

  // --- REENVIO DE CREDENCIAL ---
  async function resendCredentialEmail() {
    const session = JSON.parse(localStorage.getItem(STORAGE_SESSION_KEY) || '{}');
    if (!session.sessionToken) {
      showStatus('Sessão expirada. Autentique-se novamente.', 'error');
      return;
    }

    showStatus('Enviando QR Code para seu e-mail...', 'loading');
    try {
      const res = await ApiService.reenviarCredencialEmail(session.sessionToken);
      if (res.sucesso) {
        showStatus(res.mensagem || 'QR Code reenviado com sucesso.', 'success');
      } else {
        showStatus(res.mensagem || 'Não foi possível reenviar a credencial.', 'error');
      }
    } catch (err) {
      showStatus('Erro de conexão ao reenviar e-mail.', 'error');
    }
  }

  // --- ACESSO AO TERMINAL FISCAL ---
  async function openFiscalLogin() {
    if (fiscalSession) return;

    const password = prompt('Terminal restrito. Digite a senha fiscal:');
    if (!password) return;

    showStatus('Validando acesso fiscal...', 'loading');
    try {
      const res = await ApiService.loginFiscal(password);
      if (!res.sucesso || !res.sessao) {
        showStatus(res.mensagem || 'Credenciais inválidas.', 'error');
        return;
      }

      fiscalSession = res.sessao;
      hideStatus();

      // Esconde o fluxo público e exibe o painel fiscal
      ['identityForm', 'registrationForm', 'otpForm', 'credentialScreen'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });

      const fiscalArea = document.getElementById('fiscalArea');
      if (fiscalArea) fiscalArea.classList.remove('hidden');

      const subtitle = document.getElementById('headerSubtitle');
      if (subtitle) subtitle.textContent = 'Terminal de Validação';

      const eventInput = document.getElementById('eventName');
      if (eventInput) eventInput.value = res.evento || '';
    } catch (err) {
      showStatus('Falha ao autenticar terminal fiscal.', 'error');
    }
  }

  async function saveActiveEvent() {
    const eventInput = document.getElementById('eventName');
    const eventName = eventInput ? eventInput.value.trim() : '';

    if (!eventName) {
      showStatus('Digite o nome do evento ativo.', 'error');
      return;
    }

    showStatus('Atualizando evento...', 'loading');
    try {
      const res = await ApiService.salvarEvento(eventName, fiscalSession);
      if (res.sucesso) {
        if (eventInput) eventInput.value = res.novoEvento || eventName;
        showStatus('Evento ativo atualizado com sucesso.', 'success');
      } else {
        showStatus(res.mensagem || 'Não foi possível atualizar o evento.', 'error');
      }
    } catch (err) {
      showStatus('Erro ao atualizar evento.', 'error');
    }
  }

  function extractQrCredential(decodedText) {
    const cred = String(decodedText || '').trim();
    if (!cred.startsWith(QR_PREFIX)) return '';
    const token = cred.substring(QR_PREFIX.length);
    return /^[a-f0-9]{64}$/i.test(token) ? cred : '';
  }

  function startFiscalScanner() {
    if (scanInProgress || scannerInstance) return;

    const readerEl = document.getElementById('reader');
    const scannerBtn = document.getElementById('scannerButton');

    if (readerEl) readerEl.classList.remove('hidden');
    if (scannerBtn) scannerBtn.classList.add('hidden');
    hideStatus();

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
          showStatus('QR Code não reconhecido como credencial LAIFT.', 'error');
          scanInProgress = false;
          return;
        }

        showStatus('Credencial lida. Validando presença...', 'loading');
        await closeScanner();

        try {
          const res = await ApiService.carimbarPresenca(validCred, fiscalSession);
          if (res.sucesso) {
            showStatus(res.mensagem || 'Presença confirmada.', 'success');
          } else {
            showStatus(res.mensagem || 'Não foi possível registrar a presença.', 'error');
          }
        } catch (err) {
          showStatus('Erro ao comunicar com o servidor.', 'error');
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
      showStatus('Digite a matrícula ou CPF do participante.', 'error');
      return;
    }

    showStatus('Registrando presença...', 'loading');
    try {
      const res = await ApiService.carimbarPresencaManual(identifier, fiscalSession);
      if (idInput) idInput.value = '';

      if (res.sucesso) {
        showStatus(res.mensagem || 'Presença confirmada.', 'success');
      } else {
        showStatus(res.mensagem || 'Não foi possível registrar a presença.', 'error');
      }
    } catch (err) {
      showStatus('Erro ao registrar presença.', 'error');
    }
  }

  // --- PESQUISA NA LISTA DE MEMBROS ---
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
        Buscando participantes...
      </div>
    `;

    try {
      const res = await ApiService.callAppsScript({
        acao: 'listarMembros',
        termo: term,
        sessao: fiscalSession
      });

      if (!res.sucesso) {
        list.innerHTML = `
          <div class="member-list-empty">
            ${res.mensagem || 'Não foi possível consultar a lista.'}
          </div>
        `;
        return;
      }

      renderMemberList(res.membros || []);
    } catch (err) {
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

    if (!members.length) {
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

      const info = document.createElement('div');
      info.className = 'member-info';

      const name = document.createElement('div');
      name.className = 'member-name';
      name.textContent = member.nomeExibicao || 'Participante';

      const meta = document.createElement('div');
      meta.className = 'member-meta';
      meta.textContent = `${member.tipo || 'Participante'} · ${member.identificador || ''}`;

      info.appendChild(name);
      info.appendChild(meta);

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Presença';
      button.addEventListener('click', () => {
        markPresenceFromList(member.identificador);
      });

      item.appendChild(info);
      item.appendChild(button);
      list.appendChild(item);
    });
  }

  async function markPresenceFromList(identifier) {
    if (!identifier) return;

    showStatus('Registrando presença pela lista...', 'loading');
    try {
      const res = await ApiService.callAppsScript({
        acao: 'marcarPresencaLista',
        identificador: identifier,
        sessao: fiscalSession
      });

      if (res.sucesso) {
        showStatus(res.mensagem || 'Presença confirmada.', 'success');
      } else {
        showStatus(res.mensagem || 'Não foi possível registrar a presença.', 'error');
      }
    } catch (err) {
      showStatus('Erro ao registrar presença.', 'error');
    }
  }

  async function logoutFiscal() {
    try {
      if (fiscalSession) {
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

    hideStatus();
    restartPublicFlow();
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
    resendCredentialEmail
  };
})();

// Declarações globais para compatibilidade direta com os atributos onclick/oninput do HTML
window.resendCredentialEmail = FiscalEngine.resendCredentialEmail;
window.saveActiveEvent = FiscalEngine.saveActiveEvent;
window.startFiscalScanner = FiscalEngine.startFiscalScanner;
window.submitManualCheckin = FiscalEngine.submitManualCheckin;
window.scheduleMemberSearch = FiscalEngine.scheduleMemberSearch;
window.logoutFiscal = FiscalEngine.logoutFiscal;

window.addEventListener('DOMContentLoaded', FiscalEngine.initListeners);
