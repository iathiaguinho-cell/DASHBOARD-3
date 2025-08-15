/* 
==================================================================
CONFIGURAÇÃO DO FIREBASE
==================================================================
*/
const firebaseConfig = {
  apiKey: "AIzaSyB5JpYm8l0AlF5ZG3HtkyFZgmrpsUrDhv0",
  authDomain: "dashboard-oficina-pro.firebaseapp.com",
  databaseURL: "https://dashboard-oficina-pro-default-rtdb.firebaseio.com",
  projectId: "dashboard-oficina-pro",
  storageBucket: "dashboard-oficina-pro.appspot.com",
  messagingSenderId: "736157192887",
  appId: "1:736157192887:web:c23d3daade848a33d67332"
};

/* 
==================================================================
CONFIGURAÇÃO DO IMGBB
==================================================================
*/
const imgbbApiKey = "57cb1c5a02fb6e5ef2700543d6245b70";

/* 
==================================================================
SISTEMA DE NOTIFICAÇÕES
==================================================================
*/
function showNotification(message, type = 'success') {
  // Remove notificações antigas
  const existing = document.getElementById('notification');
  if (existing) {
    existing.remove();
  }
  
  // Cria nova notificação
  const notification = document.createElement('div');
  notification.id = 'notification';
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Adiciona ao DOM
  document.body.appendChild(notification);
  
  // Anima entrada
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Anima saída
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 500);
  }, 4000);
}

/* 
==================================================================
INICIALIZAÇÃO DO SISTEMA
==================================================================
*/
document.addEventListener('DOMContentLoaded', () => {
  // Inicializa Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  
  // Variáveis do sistema
  let currentUser = null;
  let allServiceOrders = {};
  let lightboxMedia = [];
  let currentLightboxIndex = 0;
  let filesToUpload = null;
  let vehiclesTriggeringAlert = new Set();
  
  /* 
  ==================================================================
  CONFIGURAÇÕES DO SISTEMA
  ==================================================================
  */
  const USERS = [
    { name: 'Augusto', role: 'Gestor' }, 
    { name: 'William Barbosa', role: 'Atendente' },
    { name: 'Thiago Ventura Valencio', role: 'Atendente' }, 
    { name: 'Fernando', role: 'Mecânico' },
    { name: 'Gustavo', role: 'Mecânico' }, 
    { name: 'Marcelo', role: 'Mecânico' }
  ];
  
  const STATUS_LIST = [
    'Aguardando-Mecanico', 'Em-Analise', 'Orcamento-Enviado', 'Aguardando-Aprovacao',
    'Servico-Autorizado', 'Em-Execucao', 'Finalizado-Aguardando-Retirada', 'Entregue'
  ];
  
  const ATTENTION_STATUSES = {
    'Aguardando-Mecanico': { label: 'AGUARDANDO MECÂNICO', color: 'yellow', blinkClass: 'blinking-aguardando' },
    'Servico-Autorizado': { label: 'SERVIÇO AUTORIZADO', color: 'green', blinkClass: 'blinking-autorizado' },
    'Finalizado-Aguardando-Retirada': { label: 'FINALIZADO / RETIRADA', color: 'orange', blinkClass: 'blinking-finalizado' }
  };
  
  /* 
  ==================================================================
  REFERÊNCIAS DOS ELEMENTOS DO DOM
  ==================================================================
  */
  const userScreen = document.getElementById('userScreen');
  const app = document.getElementById('app');
  const userList = document.getElementById('userList');
  const kanbanBoard = document.getElementById('kanbanBoard');
  const addOSBtn = document.getElementById('addOSBtn');
  const logoutButton = document.getElementById('logoutButton');
  const osModal = document.getElementById('osModal');
  const osForm = document.getElementById('osForm');
  const detailsModal = document.getElementById('detailsModal');
  const logForm = document.getElementById('logForm');
  const kmUpdateForm = document.getElementById('kmUpdateForm');
  const attentionPanel = document.getElementById('attention-panel');
  const attentionPanelContainer = document.getElementById('attention-panel-container');
  const togglePanelBtn = document.getElementById('toggle-panel-btn');
  const lightbox = document.getElementById('lightbox');
  const mediaInput = document.getElementById('media-input');
  const openCameraBtn = document.getElementById('openCameraBtn');
  const openGalleryBtn = document.getElementById('openGalleryBtn');
  const alertLed = document.getElementById('alert-led');
  const postLogActions = document.getElementById('post-log-actions');
  
  /* 
  ==================================================================
  FUNÇÕES AUXILIARES
  ==================================================================
  */
  const formatStatus = (status) => status.replace(/-/g, ' ');
  
  /* 
  ==================================================================
  PAINEL DE ALERTA
  ==================================================================
  */
  const updateAttentionPanel = () => {
    attentionPanel.innerHTML = Object.entries(ATTENTION_STATUSES).map(([statusKey, config]) => {
        const vehiclesInStatus = Object.values(allServiceOrders).filter(os => os.status === statusKey);
        const hasVehicles = vehiclesInStatus.length > 0;
        const blinkingClass = hasVehicles ? config.blinkClass : '';
        const vehicleListHTML = hasVehicles 
            ? vehiclesInStatus.map(os => `<p class="cursor-pointer attention-vehicle text-white hover:text-blue-300" data-os-id="${os.id}">${os.placa} - ${os.modelo}</p>`).join('')
            : `<p class="text-gray-400">- Vazio -</p>`;
        return `
            <div class="attention-box p-2 rounded-md bg-gray-900 border-2 border-gray-700 ${blinkingClass}" data-status-key="${statusKey}">
                <h3 class="text-center text-${config.color}-400 font-bold text-xs sm:text-sm truncate">${config.label}</h3>
                <div class="mt-1 text-center text-white text-xs space-y-1 h-16 overflow-y-auto">
                    ${vehicleListHTML}
                </div>
            </div>
        `;
    }).join('');
  };
  
  /* 
  ==================================================================
  AUTENTICAÇÃO E CONTROLE DE USUÁRIO
  ==================================================================
  */
  const loginUser = (user) => {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    document.getElementById('currentUserName').textContent = user.name;
    userScreen.classList.add('hidden');
    app.classList.remove('hidden');
    listenToServiceOrders();
  };
  
  const checkLoggedInUser = () => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) loginUser(JSON.parse(storedUser));
    else {
      userList.innerHTML = USERS.map(user =>
        `<div class="p-4 bg-gray-100 rounded-lg hover:bg-blue-100 cursor-pointer user-btn transition-all duration-200" data-user='${JSON.stringify(user)}'>
          <p class="font-semibold">${user.name}</p><p class="text-sm text-gray-500">${user.role}</p>
        </div>`
      ).join('');
    }
  };
  
  /* 
  ==================================================================
  RENDERIZAÇÃO DO KANBAN
  ==================================================================
  */
  const renderKanban = (deliveredFilter = '') => {
    const collapsedState = JSON.parse(localStorage.getItem('collapsedColumns')) || {};
    kanbanBoard.innerHTML = STATUS_LIST.map(status => {
      const isCollapsed = collapsedState[status];
      const isDeliveredColumn = status === 'Entregue';
      const searchInputHTML = isDeliveredColumn ? `
        <div class="mb-3">
          <input type="search" id="searchDeliveredInput" placeholder="Buscar em Entregues..." 
                 class="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
      ` : '';
      
      const hasVehicles = Object.values(allServiceOrders).some(os => os.status === status);
      const columnLedHTML = isCollapsed && hasVehicles ? `<div class="column-led ml-2"></div>` : '';
      
      return `
        <div class="status-column p-4">
          <div class="flex justify-between items-center cursor-pointer toggle-column-btn mb-2" data-status="${status}">
            <div class="flex items-center">
              <h3 class="font-bold text-gray-800">${formatStatus(status)}</h3>
              ${columnLedHTML}
            </div>
            <i class='bx bxs-chevron-down transition-transform ${isCollapsed ? 'rotate-180' : ''}'></i>
          </div>
          ${searchInputHTML}
          <div class="space-y-3 vehicle-list ${isCollapsed ? 'collapsed' : ''}" data-status="${status}"></div>
        </div>`;
    }).join('');
    
    const lowerCaseFilter = deliveredFilter.toLowerCase();
    Object.values(allServiceOrders).forEach(os => {
      // Filtra O.S. entregues se houver filtro
      if (os.status === 'Entregue' && deliveredFilter) {
        const searchableText = `${os.placa} ${os.modelo} ${os.cliente}`.toLowerCase();
        if (!searchableText.includes(lowerCaseFilter)) return;
      }
      
      // Renderiza o veículo na coluna adequada
      const list = kanbanBoard.querySelector(`.vehicle-list[data-status="${os.status}"]`);
      if (list) list.insertAdjacentHTML('beforeend', createCardHTML(os));
    });
    
    updateAttentionPanel();
    
    // Configura o filtro para O.S. entregues
    if (document.getElementById('searchDeliveredInput')) {
      document.getElementById('searchDeliveredInput').value = deliveredFilter;
      document.getElementById('searchDeliveredInput').addEventListener('input', (e) => {
        renderKanban(e.target.value);
      });
    }
  };
  
  /* 
  ==================================================================
  CRIAÇÃO DOS CARDS NO KANBAN
  ==================================================================
  */
  const createCardHTML = (os) => {
    const currentIndex = STATUS_LIST.indexOf(os.status);
    const prevStatus = currentIndex > 0 ? STATUS_LIST[currentIndex - 1] : null;
    const nextStatus = currentIndex < STATUS_LIST.length - 1 ? STATUS_LIST[currentIndex + 1] : null;
    
    // Botões de navegação entre status
    const prevButton = prevStatus ? 
      `<button data-os-id="${os.id}" data-new-status="${prevStatus}" class="btn-move-status p-2 rounded-full hover:bg-gray-100 transition-colors">
        <i class='bx bx-chevron-left text-xl text-gray-600'></i>
      </button>` : 
      `<div class="w-10 h-10"></div>`;
      
    const nextButton = nextStatus ? 
      `<button data-os-id="${os.id}" data-new-status="${nextStatus}" class="btn-move-status p-2 rounded-full hover:bg-gray-100 transition-colors">
        <i class='bx bx-chevron-right text-xl text-gray-600'></i>
      </button>` : 
      `<div class="w-10 h-10"></div>`;
    
    // Informações do responsável (varia conforme o status)
    let responsibleInfo = `<p class="text-xs text-gray-500 mt-1">Atendente: ${os.responsible || 'N/D'}</p>`;
    if (os.status === 'Em-Execucao' && os.responsibleForService) {
        responsibleInfo = `<p class="text-xs text-red-600 font-medium mt-1">Mecânico: ${os.responsibleForService}</p>`;
    } else if (os.status === 'Em-Analise' && os.responsibleForBudget) {
        responsibleInfo = `<p class="text-xs text-purple-600 font-medium mt-1">Orçamento: ${os.responsibleForBudget}</p>`;
    }
    
    // Informação de KM
    const kmInfo = `<p class="text-xs text-gray-500">KM: ${os.km ? new Intl.NumberFormat('pt-BR').format(os.km) : 'N/A'}</p>`;
    
    return `
      <div class="vehicle-card status-${os.status}" data-os-id="${os.id}">
        <div class="flex justify-between items-start">
            <div class="card-clickable-area cursor-pointer flex-grow">
              <p class="font-bold text-base text-gray-800">${os.placa}</p>
              <p class="text-sm text-gray-600">${os.modelo}</p>
              <div class="text-xs mt-1">${kmInfo}</div>
              <div class="text-xs">${responsibleInfo}</div>
            </div>
            <div class="flex flex-col -mt-1 -mr-1">
                ${nextButton}
                ${prevButton}
            </div>
        </div>
      </div>`;
  };
  
  /* 
  ==================================================================
  LISTENERS DO FIREBASE
  ==================================================================
  */
  const listenToServiceOrders = () => {
    db.ref('serviceOrders').on('value', snapshot => {
      allServiceOrders = snapshot.val() || {};
      Object.keys(allServiceOrders).forEach(id => allServiceOrders[id].id = id);
      const searchInput = document.getElementById('searchDeliveredInput');
      renderKanban(searchInput ? searchInput.value : '');
    }, error => {
      console.error(error);
      showNotification("Erro de conexão com o banco de dados.", 'error');
    });
  };
  
  /* 
  ==================================================================
  CONTROLE DO LED DE ALERTA
  ==================================================================
  */
  const updateLedState = () => {
    if (vehiclesTriggeringAlert.size > 0 && attentionPanelContainer.classList.contains('collapsed')) {
        alertLed.classList.remove('hidden');
    } else {
        alertLed.classList.add('hidden');
    }
  };
  
  /* 
  ==================================================================
  ATUALIZAÇÃO DE STATUS DA O.S.
  ==================================================================
  */
  const updateServiceOrderStatus = (osId, newStatus) => {
    const os = allServiceOrders[osId];
    if (!os) return;
    
    // Atualizações para o Firebase
    const updates = { 
      status: newStatus, 
      lastUpdate: new Date().toISOString() 
    };
    
    // Define responsáveis específicos conforme o status
    if (newStatus === 'Em-Analise') updates.responsibleForBudget = currentUser.name;
    else if (newStatus === 'Em-Execucao') updates.responsibleForService = currentUser.name;
    else if (newStatus === 'Entregue') updates.responsibleForDelivery = currentUser.name;
    
    // Atualiza no Firebase
    db.ref(`serviceOrders/${osId}`).update(updates);
    
    // Atualiza o estado de alerta
    vehiclesTriggeringAlert.delete(osId);
    if (Object.keys(ATTENTION_STATUSES).includes(newStatus)) {
        vehiclesTriggeringAlert.add(osId);
    }
    updateLedState();
    
    showNotification(`O.S. ${os.placa} movida para ${formatStatus(newStatus)}`);
  };
  
  /* 
  ==================================================================
  MODAL DE DETALHES DA O.S.
  ==================================================================
  */
  const openDetailsModal = (osId) => {
    const os = allServiceOrders[osId];
    if (!os) return;
    
    // Preenche informações principais
    document.getElementById('detailsPlacaModelo').textContent = `${os.placa} - ${os.modelo}`;
    document.getElementById('detailsCliente').textContent = `Cliente: ${os.cliente}`;
    document.getElementById('detailsKm').textContent = `KM: ${os.km ? new Intl.NumberFormat('pt-BR').format(os.km) : 'N/A'}`;
    
    // Preenche responsáveis
    document.getElementById('responsible-attendant').textContent = os.responsible || 'N/D';
    document.getElementById('responsible-budget').textContent = os.responsibleForBudget || 'N/D';
    document.getElementById('responsible-service').textContent = os.responsibleForService || 'N/D';
    document.getElementById('responsible-delivery').textContent = os.responsibleForDelivery || 'N/D';
    
    // Configura formulário de log
    document.getElementById('logOsId').value = osId;
    
    // Renderiza timeline
    renderTimeline(os);
    
    // Renderiza galeria de mídia
    renderMediaGallery(os);
    
    // Mostra modal
    detailsModal.classList.remove('hidden');
    detailsModal.classList.add('flex');
  };
  
  /* 
  ==================================================================
  RENDERIZAÇÃO DA TIMELINE
  ==================================================================
  */
  const renderTimeline = (os) => {
    const timelineContainer = document.getElementById('timelineContainer');
    const logs = os.logs || [];
    
    timelineContainer.innerHTML = logs.map(log => {
      const date = new Date(log.timestamp);
      const formattedDate = date.toLocaleDateString('pt-BR');
      const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      let iconClass = 'bx-message-detail';
      let itemClass = 'timeline-item-log';
      
      if (log.type === 'status') {
        iconClass = 'bx-transfer';
        itemClass = 'timeline-item-status';
      } else if (log.type === 'value') {
        iconClass = 'bx-dollar';
        itemClass = 'timeline-item-value';
      }
      
      return `
        <div class="timeline-item ${itemClass}">
          <div class="timeline-icon">
            <i class='bx ${iconClass}'></i>
          </div>
          <div class="timeline-content">
            <div class="flex justify-between items-start mb-1">
              <h4 class="font-semibold text-gray-800">${log.user}</h4>
              <span class="text-xs text-gray-500">${formattedDate} ${formattedTime}</span>
            </div>
            <p class="text-gray-700 text-sm">${log.description}</p>
            ${log.parts ? `<p class="text-gray-600 text-xs mt-1"><strong>Peças:</strong> ${log.parts}</p>` : ''}
            ${log.value ? `<p class="text-green-600 text-xs mt-1"><strong>Valor:</strong> R$ ${parseFloat(log.value).toFixed(2)}</p>` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    if (logs.length === 0) {
      timelineContainer.innerHTML = '<p class="text-gray-500 text-center">Nenhum registro encontrado.</p>';
    }
  };
  
  /* 
  ==================================================================
  RENDERIZAÇÃO DA GALERIA DE MÍDIA
  ==================================================================
  */
  const renderMediaGallery = (os) => {
    const thumbnailGrid = document.getElementById('thumbnail-grid');
    const media = os.media || [];
    
    lightboxMedia = media;
    
    thumbnailGrid.innerHTML = media.map((item, index) => {
      if (item.type === 'image') {
        return `
          <div class="thumbnail-item" data-index="${index}">
            <img src="${item.url}" alt="Imagem ${index + 1}" loading="lazy">
          </div>
        `;
      } else if (item.type === 'video') {
        return `
          <div class="thumbnail-item" data-index="${index}">
            <i class='bx bx-play-circle text-blue-500'></i>
          </div>
        `;
      }
      return '';
    }).join('');
    
    if (media.length === 0) {
      thumbnailGrid.innerHTML = `
        <div class="col-span-4 text-center py-8">
          <i class='bx bx-image text-4xl text-gray-400 mb-2'></i>
          <p class="text-gray-500">Nenhuma mídia adicionada</p>
        </div>
      `;
    }
  };
  
  /* 
  ==================================================================
  UPLOAD DE MÍDIA
  ==================================================================
  */
  const uploadToImgBB = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        return data.data.url;
      } else {
        throw new Error('Falha no upload');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      throw error;
    }
  };
  
  /* 
  ==================================================================
  LIGHTBOX
  ==================================================================
  */
  const openLightbox = (index) => {
    if (!lightboxMedia || lightboxMedia.length === 0) return;
    
    currentLightboxIndex = index;
    const media = lightboxMedia[index];
    const lightboxContent = document.getElementById('lightbox-content');
    
    if (media.type === 'image') {
      lightboxContent.innerHTML = `<img src="${media.url}" alt="Imagem" class="max-w-full max-h-full object-contain">`;
    } else if (media.type === 'video') {
      lightboxContent.innerHTML = `<video src="${media.url}" controls class="max-w-full max-h-full"></video>`;
    }
    
    // Configura botões de navegação
    document.getElementById('lightbox-prev').style.display = index > 0 ? 'block' : 'none';
    document.getElementById('lightbox-next').style.display = index < lightboxMedia.length - 1 ? 'block' : 'none';
    
    // Configura download
    const downloadBtn = document.getElementById('lightbox-download');
    downloadBtn.href = media.url;
    downloadBtn.download = `media_${index + 1}.${media.type === 'image' ? 'jpg' : 'mp4'}`;
    
    lightbox.classList.remove('hidden');
    lightbox.classList.add('flex');
  };
  
  /* 
  ==================================================================
  EVENT LISTENERS
  ==================================================================
  */
  
  // Login de usuário
  userList.addEventListener('click', (e) => {
    const userBtn = e.target.closest('.user-btn');
    if (userBtn) {
      const user = JSON.parse(userBtn.dataset.user);
      loginUser(user);
    }
  });
  
  // Logout
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    location.reload();
  });
  
  // Toggle painel de alertas
  togglePanelBtn.addEventListener('click', () => {
    attentionPanelContainer.classList.toggle('collapsed');
    const icon = togglePanelBtn.querySelector('i');
    icon.classList.toggle('rotate-180');
    updateLedState();
  });
  
  // Clique no painel de atenção para abrir detalhes
  attentionPanel.addEventListener('click', (e) => {
    const vehicleElement = e.target.closest('.attention-vehicle');
    if (vehicleElement) {
      const osId = vehicleElement.dataset.osId;
      openDetailsModal(osId);
    }
  });
  
  // Kanban - clique nos cards
  kanbanBoard.addEventListener('click', (e) => {
    const card = e.target.closest('.vehicle-card');
    const moveBtn = e.target.closest('.btn-move-status');
    const clickableArea = e.target.closest('.card-clickable-area');
    
    if (moveBtn) {
      e.stopPropagation();
      const osId = moveBtn.dataset.osId;
      const newStatus = moveBtn.dataset.newStatus;
      updateServiceOrderStatus(osId, newStatus);
    } else if (clickableArea && card) {
      const osId = card.dataset.osId;
      openDetailsModal(osId);
    }
  });
  
  // Toggle colunas do kanban
  kanbanBoard.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('.toggle-column-btn');
    if (toggleBtn) {
      const status = toggleBtn.dataset.status;
      const vehicleList = kanbanBoard.querySelector(`.vehicle-list[data-status="${status}"]`);
      const icon = toggleBtn.querySelector('i');
      
      vehicleList.classList.toggle('collapsed');
      icon.classList.toggle('rotate-180');
      
      // Salva estado no localStorage
      const collapsedState = JSON.parse(localStorage.getItem('collapsedColumns')) || {};
      collapsedState[status] = vehicleList.classList.contains('collapsed');
      localStorage.setItem('collapsedColumns', JSON.stringify(collapsedState));
      
      // Atualiza renderização para mostrar/ocultar LED
      setTimeout(() => renderKanban(), 100);
    }
  });
  
  // Modal - fechar
  document.addEventListener('click', (e) => {
    if (e.target.closest('.btn-close-modal') || e.target.classList.contains('modal')) {
      osModal.classList.add('hidden');
      detailsModal.classList.add('hidden');
      lightbox.classList.add('hidden');
    }
  });
  
  // Nova O.S.
  addOSBtn.addEventListener('click', () => {
    document.getElementById('osModalTitle').textContent = 'Nova Ordem de Serviço';
    document.getElementById('osId').value = '';
    osForm.reset();
    
    // Popula select de responsáveis
    const responsavelSelect = document.getElementById('osResponsavel');
    responsavelSelect.innerHTML = '<option value="">Selecione um responsável...</option>' +
      USERS.map(user => `<option value="${user.name}">${user.name}</option>`).join('');
    
    osModal.classList.remove('hidden');
    osModal.classList.add('flex');
  });
  
  // Formulário de O.S.
  osForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const osData = {
      placa: document.getElementById('osPlaca').value.toUpperCase(),
      modelo: document.getElementById('osModelo').value,
      cliente: document.getElementById('osCliente').value,
      telefone: document.getElementById('osTelefone').value,
      km: parseInt(document.getElementById('osKm').value) || 0,
      responsible: document.getElementById('osResponsavel').value,
      observacoes: document.getElementById('osObservacoes').value,
      status: 'Aguardando-Mecanico',
      createdAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      logs: [],
      media: []
    };
    
    const osId = document.getElementById('osId').value;
    
    if (osId) {
      // Editar O.S. existente
      db.ref(`serviceOrders/${osId}`).update(osData);
      showNotification('O.S. atualizada com sucesso!');
    } else {
      // Criar nova O.S.
      db.ref('serviceOrders').push(osData);
      showNotification('Nova O.S. criada com sucesso!');
    }
    
    osModal.classList.add('hidden');
  });
  
  // Formulário de log
  logForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const osId = document.getElementById('logOsId').value;
    const description = document.getElementById('logDescricao').value;
    const parts = document.getElementById('logPecas').value;
    const value = document.getElementById('logValor').value;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      description: description,
      type: 'log'
    };
    
    if (parts) logEntry.parts = parts;
    if (value) logEntry.value = parseFloat(value);
    
    // Upload de mídia se houver
    if (filesToUpload && filesToUpload.length > 0) {
      try {
        showNotification('Fazendo upload das mídias...', 'info');
        
        const mediaPromises = Array.from(filesToUpload).map(async (file) => {
          const url = await uploadToImgBB(file);
          return {
            type: file.type.startsWith('image/') ? 'image' : 'video',
            url: url,
            timestamp: new Date().toISOString()
          };
        });
        
        const mediaResults = await Promise.all(mediaPromises);
        
        // Adiciona mídia à O.S.
        const currentMedia = allServiceOrders[osId].media || [];
        db.ref(`serviceOrders/${osId}/media`).set([...currentMedia, ...mediaResults]);
        
        filesToUpload = null;
        document.getElementById('fileName').textContent = '';
      } catch (error) {
        showNotification('Erro no upload de mídia', 'error');
        return;
      }
    }
    
    // Adiciona log ao histórico
    const currentLogs = allServiceOrders[osId].logs || [];
    db.ref(`serviceOrders/${osId}/logs`).set([...currentLogs, logEntry]);
    
    // Limpa formulário
    logForm.reset();
    
    // Mostra ações pós-log
    postLogActions.style.display = 'flex';
    
    showNotification('Registro adicionado com sucesso!');
  });
  
  // Ações pós-log
  document.getElementById('btn-move-next').addEventListener('click', () => {
    const osId = document.getElementById('logOsId').value;
    const os = allServiceOrders[osId];
    const currentIndex = STATUS_LIST.indexOf(os.status);
    const nextStatus = STATUS_LIST[currentIndex + 1];
    
    if (nextStatus) {
      updateServiceOrderStatus(osId, nextStatus);
      detailsModal.classList.add('hidden');
    }
  });
  
  document.getElementById('btn-move-prev').addEventListener('click', () => {
    const osId = document.getElementById('logOsId').value;
    const os = allServiceOrders[osId];
    const currentIndex = STATUS_LIST.indexOf(os.status);
    const prevStatus = STATUS_LIST[currentIndex - 1];
    
    if (prevStatus) {
      updateServiceOrderStatus(osId, prevStatus);
      detailsModal.classList.add('hidden');
    }
  });
  
  document.getElementById('btn-stay').addEventListener('click', () => {
    postLogActions.style.display = 'none';
    const osId = document.getElementById('logOsId').value;
    renderTimeline(allServiceOrders[osId]);
    renderMediaGallery(allServiceOrders[osId]);
  });
  
  // Atualização de KM
  kmUpdateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const osId = document.getElementById('logOsId').value;
    const newKm = parseInt(document.getElementById('updateKmInput').value);
    
    if (newKm && newKm > 0) {
      db.ref(`serviceOrders/${osId}/km`).set(newKm);
      document.getElementById('updateKmInput').value = '';
      showNotification('KM atualizada com sucesso!');
    }
  });
  
  // Exclusão de O.S.
  document.getElementById('deleteOsBtn').addEventListener('click', () => {
    const osId = document.getElementById('logOsId').value;
    const os = allServiceOrders[osId];
    
    if (confirm(`Tem certeza que deseja excluir a O.S. ${os.placa}?`)) {
      db.ref(`serviceOrders/${osId}`).remove();
      detailsModal.classList.add('hidden');
      showNotification('O.S. excluída com sucesso!');
    }
  });
  
  // Mídia - câmera e galeria
  openCameraBtn.addEventListener('click', () => {
    mediaInput.setAttribute('capture', 'camera');
    mediaInput.click();
  });
  
  openGalleryBtn.addEventListener('click', () => {
    mediaInput.removeAttribute('capture');
    mediaInput.click();
  });
  
  mediaInput.addEventListener('change', (e) => {
    filesToUpload = e.target.files;
    if (filesToUpload.length > 0) {
      const fileNames = Array.from(filesToUpload).map(f => f.name).join(', ');
      document.getElementById('fileName').textContent = `${filesToUpload.length} arquivo(s) selecionado(s): ${fileNames}`;
    }
  });
  
  // Lightbox - galeria de mídia
  document.addEventListener('click', (e) => {
    const thumbnailItem = e.target.closest('.thumbnail-item');
    if (thumbnailItem && thumbnailItem.dataset.index !== undefined) {
      openLightbox(parseInt(thumbnailItem.dataset.index));
    }
  });
  
  // Lightbox - navegação
  document.getElementById('lightbox-prev').addEventListener('click', () => {
    if (currentLightboxIndex > 0) {
      openLightbox(currentLightboxIndex - 1);
    }
  });
  
  document.getElementById('lightbox-next').addEventListener('click', () => {
    if (currentLightboxIndex < lightboxMedia.length - 1) {
      openLightbox(currentLightboxIndex + 1);
    }
  });
  
  document.getElementById('lightbox-close').addEventListener('click', () => {
    lightbox.classList.add('hidden');
  });
  
  document.getElementById('lightbox-close-bg').addEventListener('click', () => {
    lightbox.classList.add('hidden');
  });
  
  // Lightbox - copiar URL
  document.getElementById('lightbox-copy').addEventListener('click', () => {
    const media = lightboxMedia[currentLightboxIndex];
    navigator.clipboard.writeText(media.url).then(() => {
      showNotification('URL copiada para a área de transferência!');
    });
  });
  
  // Inicialização
  checkLoggedInUser();
});

