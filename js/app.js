/**
 * CONTROLADOR PRINCIPAL SPA, GESTÃO DE SESSÃO E ROTEAMENTO
 * Liga Acadêmica Interdisciplinar de Farmacologia e Toxicologia (LAIFT)
 */

const STORAGE_SESSION_KEY = 'laift_student_session';
const SESSION_TTL_DAYS = 7;

const appState = {
  activeView: 'authSection',
  user: null,
  fiscalSession: '',
  scanInProgress: false,
  scannerInstance: null
};

// =========================================================
// ROTEAMENTO E TRANSIÇÃO DE TELAS SPA
// =========================================================

function navigateTo(viewId) {
  const views = ['authSection', 'dashboardSection', 'quizSection', 'clinicSection', 'labSection'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  const target = document.getElementById(viewId);
  if (target) {
    target.classList.remove('hidden');
    appState.activeView = viewId;
  }

  // Atualiza botões no cabeçalho
  const controls = document.getElementById('sessionHeaderControls');
  if (viewId === 'authSection') {
    controls.classList.add('hidden');
    document.body.className = 'theme-default';
  } else {
    controls.classList.remove('hidden');
  }
}

function launchModule(moduleType) {
  switch (moduleType) {
    case 'farmaco':
      document.body.className = 'theme-default';
      // Garante recarregamento limpo do quiz ao acessar
      const frame = document.getElementById('quizFrame');
      if (frame && frame.contentWindow) {
        frame.contentWindow.location.reload();
      }
      navigateTo('quizSection');
      break;

    case 'clinica':
      document.body.className = 'theme-clinic';
      ClinicEngine.startCase('caso_tox_01');
      navigateTo('clinicSection');
      break;

    case 'lab':
      document.body.className = 'theme-default';
      navigateTo('labSection');
      break;

    default:
      navigateTo('dashboardSection');
  }
}

// =========================================================
// SESSÃO DO ALUNO E PERSISTÊNCIA (LOCALSTORAGE)
// =========================================================

function checkExistingSession() {
  const raw = localStorage.getItem(STORAGE_SESSION_KEY);
  if (!raw) return false;

  try {
    const session = JSON.parse(raw);
    if (session.expiresAt && Date.now() < session.expiresAt) {
      appState.user = session;
      applyUserToUI(session);
      transitionToDashboard();
      return true;
    } else {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    }
  } catch (e) {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  }
  return false;
}

function persistSession(userData) {
  const session = {
    ...userData,
    expiresAt: Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  };
  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  appState.user = session;
  applyUserToUI(session);
}

function applyUserToUI(user) {
  document.getElementById('headerUserName').textContent = user.name || 'Estudante';
  document.getElementById('headerUserBadge').textContent = user.type || 'Membro';
  
  document.getElementById('dashUserName').textContent = user.name || 'Estudante';
  document.getElementById('dashUserRole').textContent = user.type || 'Membro';
  document.getElementById('dashUserId').textContent = user.identifier || '---';

  const initials = (user.name || 'LA')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');
  document.getElementById('userInitials').textContent = initials || 'LF';
}

function logout() {
  if (confirm('Deseja realmente encerrar sua sessão?')) {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    appState.user = null;
    navigateTo('authSection');
    restartPublicFlow();
  }
}

// =========================================================
// SINCRONIZAÇÃO DO DASHBOARD E MÉTRICAS
// =========================================================

async function refreshDashboard() {
  if (!appState.user || !appState.user.identifier) return;

  try {
    const data = await ApiService.obterDashboardAluno(appState.user.identifier);
    if (data.sucesso && data.aluno) {
      document.getElementById('statAccuracy').textContent = `${data.aluno.taxaAcertoGeral}%`;
      document.getElementById('statAnswered').textContent = data.aluno.totalQuestoes;
      document.getElementById('statCasesSolved').textContent = data.aluno.simuladosConcluidos;

      // Desbloqueio dinâmico de medalhas
      if (data.aluno.totalQuestoes > 0) {
        document.getElementById('badgeTox')?.classList.remove('locked');
      }
      if (data.aluno.simuladosConcluidos > 0) {
        document.getElementById('badgeClinic')?.classList.remove('locked');
      }
    }
  } catch (err) {
    console.warn('Dashboard carregado em modo offline.');
  }
}

function resetVisualMetrics() {
  if (confirm('Deseja zerar os contadores visuais locais da tela?')) {
    document.getElementById('statAccuracy').textContent = '0%';
    document.getElementById('statAnswered').textContent = '0';
    document.getElementById('statCasesSolved').textContent = '0';
  }
}

// =========================================================
// FLUXO PÚBLICO DE AUTENTICAÇÃO (OTP / CADASTRO)
// =========================================================

function showPublicStep(stepId) {
  ['identityForm', 'registrationForm', 'otpForm', 'credentialScreen'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(stepId).classList.remove('hidden');
}

function showStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = `status-banner ${type}`;
  el.classList.remove('hidden');
}

function hideStatus() {
  document.getElementById('status').classList.add('hidden');
}

async function requestAccessCode() {
  hideStatus();
  const identifier = document.getElementById('studentId').value.trim();
  const email = document.getElementById('studentEmail').value.trim().toLowerCase();

  if (!identifier || !email) {
    showStatus('Preencha a matrícula/CPF e seu e-mail.', 'error');
    return;
  }

  showStatus('Verificando cadastro...', 'loading');

  try {
    const res = await ApiService.solicitarCodigoAcesso(identifier, email, '', '', false);
    hideStatus();

    if (res.novoCadastro) {
      showPublicStep('registrationForm');
    } else if (res.sucesso) {
      showPublicStep('otpForm');
    } else {
      showStatus(res.mensagem || 'Não foi possível solicitar o código.', 'error');
    }
  } catch (err) {
    showStatus('Erro ao conectar com a portaria digital.', 'error');
  }
}

async function sendRegistrationCode() {
  hideStatus();
  const identifier = document.getElementById('studentId').value.trim();
  const email = document.getElementById('studentEmail').value.trim().toLowerCase();
  const type = document.getElementById('participantType').value;
  const name = document.getElementById('participantName').value.trim();
  const consent = document.getElementById('privacyConsent').checked;

  if (!type || !name) {
    showStatus('Preencha todos os campos do cadastro.', 'error');
    return;
  }
  if (!consent) {
    showStatus('É obrigatório aceitar a política de privacidade.', 'error');
    return;
  }

  showStatus('Enviando código de ativação...', 'loading');

  try {
    const res = await ApiService.solicitarCodigoAcesso(identifier, email, type, name, consent);
    hideStatus();

    if (res.sucesso) {
      showPublicStep('otpForm');
    } else {
      showStatus(res.mensagem || 'Falha ao registrar dados.', 'error');
    }
  } catch (err) {
    showStatus('Erro de conexão com o servidor.', 'error');
  }
}

async function validateAccessCode() {
  hideStatus();
  const identifier = document.getElementById('studentId').value.trim();
  const email = document.getElementById('studentEmail').value.trim().toLowerCase();
  const code = document.getElementById('otpCode').value.replace(/\D/g, '');

  if (code.length !== 6) {
    showStatus('Digite o código de 6 dígitos enviado por e-mail.', 'error');
    return;
  }

  showStatus('Autenticando...', 'loading');

  try {
    const res = await ApiService.validarCodigoAcesso(identifier, email, code);
    hideStatus();

    if (res.sucesso) {
      persistSession({
        identifier,
        email,
        name: document.getElementById('participantName').value.trim() || 'Estudante',
        type: document.getElementById('participantType').value || 'Membro',
        sessionToken: res.sessao
      });

      // Carrega QR Code da credencial
      loadCredential(res.sessao);
    } else {
      showStatus(res.mensagem || 'Código incorreto ou expirado.', 'error');
    }
  } catch (err) {
    showStatus('Falha ao autenticar o código.', 'error');
  }
}

async function loadCredential(tokenSessao) {
  try {
    const cred = await ApiService.obterCredencial(tokenSessao);
    if (cred.sucesso && cred.qrcodeUrl) {
      document.getElementById('credentialQrImage').src = cred.qrcodeUrl;
      document.getElementById('modalQrImage').src = cred.qrcodeUrl;
      document.getElementById('modalQrMeta').textContent = `Matrícula: ${appState.user.identifier}`;
      showPublicStep('credentialScreen');
    } else {
      transitionToDashboard();
    }
  } catch (err) {
    transitionToDashboard();
  }
}

function returnToIdentity() {
  hideStatus();
  showPublicStep('identityForm');
}

function restartPublicFlow() {
  hideStatus();
  document.getElementById('studentId').value = '';
  document.getElementById('studentEmail').value = '';
  document.getElementById('otpCode').value = '';
  showPublicStep('identityForm');
}

// =========================================================
// CONTROLE DE MODAIS
// =========================================================

function showUserCredentialModal() {
  document.getElementById('credentialModal').classList.add('active');
}

function closeCredentialModal() {
  document.getElementById('credentialModal').classList.remove('active');
}

function closePreceptorModal() {
  document.getElementById('preceptorModal').classList.remove('active');
  transitionToDashboard();
}

// =========================================================
// INICIALIZAÇÃO DO ECOSSISTEMA
// =========================================================

window.addEventListener('DOMContentLoaded', () => {
  // Inicialização dos submotores
  QuizEngine.init();
  ClinicEngine.init();
  LabEngine.init();

  // Listeners de navegação fixa
  document.getElementById('navHubBtn').addEventListener('click', transitionToDashboard);
  document.getElementById('globalLogoutBtn').addEventListener('click', logout);
  document.getElementById('infoBtn').addEventListener('click', () => {
    document.getElementById('instructionsModal').classList.add('active');
  });
  document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('instructionsModal').classList.remove('active');
  });

  // Listener para fechamento de modais clicando fora
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('active');
    }
  });

  // Verifica se já existe sessão persistida válida
  const hasSession = checkExistingSession();
  if (!hasSession) {
    navigateTo('authSection');
  }
});
