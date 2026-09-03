/**
 * TERMINAL FISCAL, VALIDAÇÃO DE QR CODE E AÇÕES DE CREDENCIAL
 * Liga Acadêmica Interdisciplinar de Farmacologia e Toxicologia (LAIFT)
 */

const FiscalEngine = (() => {
  let fiscalSession = '';
  let scannerInstance = null;
  let scanInProgress = false;
  let logoPressTimer = null;

  const QR_PREFIX = 'LAIFT:v1:';

  // --- REENVIO DE CREDENCIAL POR E-MAIL ---
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

  // --- ACESSO AO TERMINAL FISCAL (PORTARIA ADMINISTRATIVA) ---
  async function openFiscalLogin() {
    if (fiscalSession) return;

    const password = prompt('Terminal restrito da Diretoria LAIFT. Digite a senha fiscal:');
    if (!password) return;

    showStatus('Validando autorização administrativa...', 'loading');
    try {
      const res = await ApiService.loginFiscal(password);
      if (!res.sucesso || !res.sessao) {
        showStatus(res.mensagem || 'Acesso não autorizado.', 'error');
        return;
      }

      fiscalSession = res.sessao;
      hideStatus();

      // Alterna visibilidade do formulário público para o terminal fiscal
      document.getElementById('identityForm').classList.add('hidden');
      document.getElementById('registrationForm').classList.add('hidden');
      document.getElementById('otpForm').classList.add('hidden');
      document.getElementById('credentialScreen').classList.add('hidden');
      document.getElementById('fiscalArea').classList.remove('hidden');

      document.getElementById('eventName').value = res.evento || 'EVENTO_PADRAO';
    } catch (err) {
      showStatus('Falha ao autenticar terminal fiscal.', 'error');
    }
  }

  async function saveActiveEvent() {
    const eventName = document.getElementById('eventName').value.trim();
    if (!eventName) {
      showStatus('Informe o identificador do evento.', 'error');
      return;
    }

    showStatus('Atualizando evento ativo...', 'loading');
    try {
      const res = await ApiService.salvarEvento(eventName, fiscalSession);
      if (res.sucesso) {
        document.getElementById('eventName').value = res.novoEvento || eventName;
        showStatus('Evento ativo atualizado com sucesso.', 'success');
      } else {
        showStatus(res.mensagem || 'Não foi possível salvar o evento.', 'error');
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

    readerEl.classList.remove('hidden');
    scannerBtn.classList.add('hidden');
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
          showStatus('Código lido não é uma credencial LAIFT válida.', 'error');
          scanInProgress = false;
          return;
        }

        showStatus('Validando presença...', 'loading');
        await closeScanner();

        try {
          const res = await ApiService.carimbarPresenca(validCred, fiscalSession);
          if (res.sucesso) {
            showStatus(`Presença confirmada: ${res.nomeExibicao || 'Participante'}`, 'success');
          } else {
            showStatus(res.mensagem || 'Falha ao validar presença.', 'error');
          }
        } catch (err) {
          showStatus('Erro na validação do QR Code.', 'error');
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
      console.warn('Encerramento do leitor de câmera:', e);
    }
    scannerInstance = null;
    document.getElementById('reader').classList.add('hidden');
    document.getElementById('scannerButton').classList.remove('hidden');
  }

  async function submitManualCheckin() {
    const idInput = document.getElementById('manualIdentifier');
    const identifier = idInput.value.trim();

    if (!identifier) {
      showStatus('Informe a matrícula ou CPF.', 'error');
      return;
    }

    showStatus('Registrando presença manual...', 'loading');
    try {
      const res = await ApiService.carimbarPresencaManual(identifier, fiscalSession);
      idInput.value = '';
      if (res.sucesso) {
        showStatus(`Presença registrada: ${res.nomeExibicao || 'Participante'}`, 'success');
      } else {
        showStatus(res.mensagem || 'Falha ao registrar presença manual.', 'error');
      }
    } catch (err) {
      showStatus('Erro ao comunicar com o servidor.', 'error');
    }
  }

  async function logoutFiscal() {
    showStatus('Encerrando terminal fiscal...', 'loading');
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

    document.getElementById('fiscalArea').classList.add('hidden');
    document.getElementById('identityForm').classList.remove('hidden');
    hideStatus();
    restartPublicFlow();
  }

  function initListeners() {
    const logo = document.getElementById('laiftLogo');

    // Desktop: Duplo clique no logotipo LAIFT
    logo.addEventListener('dblclick', openFiscalLogin);

    // Teclado: Enter ou Espaço quando em foco no logo
    logo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFiscalLogin();
      }
    });

    // Mobile: Toque contínuo por 700ms no logotipo
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
    logoutFiscal,
    resendCredentialEmail
  };
})();

// Exposição global das funções chamadas diretamente por onclick no index.html
window.resendCredentialEmail = FiscalEngine.resendCredentialEmail;
window.saveActiveEvent = FiscalEngine.saveActiveEvent;
window.startFiscalScanner = FiscalEngine.startFiscalScanner;
window.submitManualCheckin = FiscalEngine.submitManualCheckin;
window.logoutFiscal = FiscalEngine.logoutFiscal;

window.addEventListener('DOMContentLoaded', FiscalEngine.initListeners);
