// ---- Helpers compartilhados por todas as páginas do painel ----

function sidebarHTML(active) {
  const items = [
    { href: 'dashboard.html', label: 'Estabelecimentos', key: 'dashboard' },
    { href: 'cidades.html', label: 'Cidades', key: 'cidades' },
    { href: 'destaques.html', label: 'Destaques da home', key: 'destaques' }
  ];
  return `
    <div class="sidebar-logo"><span class="dot"></span> Próxima Parada</div>
    ${items.map(i => `<a href="${i.href}" class="${active === i.key ? 'active' : ''}">${i.label}</a>`).join('')}
    <div class="logout" id="logoutBtn">Sair</div>
  `;
}

function initSidebar(active) {
  document.getElementById('sidebar').innerHTML = sidebarHTML(active);
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/index.html';
  });
}

function showToast(message, isError = false) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: options.body instanceof FormData
      ? options.headers
      : { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (res.status === 401) {
    window.location.href = '/admin/index.html';
    throw new Error('Sessão expirada.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro na requisição.');
  return data;
}

const TYPE_LABELS = {
  restaurante: 'Restaurante',
  hotel: 'Hotel',
  loja: 'Loja',
  passeio: 'Passeio',
  'ponto-turistico': 'Ponto turístico'
  ,cafe: 'Café'
  ,familia: 'Família'
};
