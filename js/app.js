/* ==================================================================
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

/* ==================================================================
CONFIGURAÇÃO DO IMGBB
==================================================================
*/
const imgbbApiKey = "57cb1c5a02fb6e5ef2700543d6245b70";

/* ==================================================================
SISTEMA DE NOTIFICAÇÕES
==================================================================
*/
function showNotification(message, type = 'success') {
  const existing = document.getElementById('notification');
  if (existing) {
    existing.remove();
  }
  const notification = document.createElement('div');
  notification.id = 'notification';
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 500);
  }, 4000);
}

/* ==================================================================
INICIALIZAÇÃO DO SISTEMA
==================================================================
*/
document.addEventListener('DOMContentLoaded', () => {
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  
  let currentUser = null;
  let allServiceOrders = {};
  let lightboxMedia = [];
  let currentLightboxIndex = 0;
  let filesToUpload = null;
  let appStartTime = Date.now();
  
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
    'Servico-Autorizado': { label: 'SERVIÇO AUTORIZADO', color: 'green', blinkClass: 'blinking-autorizado' }
  };
  const LED_TRIGGER_STATUSES = ['Aguardando-Mecanico', 'Servico-Autorizado'];
  
  // Elementos da UI
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
  const deleteOsBtn = document.getElementById('deleteOsBtn');

  // Elementos do novo Modal de Confirmação de Exclusão
  const confirmDeleteModal = document.getElementById('confirmDeleteModal');
  const confirmDeleteText = document.getElementById('confirmDeleteText');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  
  const formatStatus = (status) => status.replace(/-/g, ' ');
  
  const updateAttentionPanel = () => {
    let vehiclesTriggeringAlert = new Set();
    Object.values(allServiceOrders).forEach(os => {
        if (LED_TRIGGER_STATUSES.includes(os.status)) {
            vehiclesTriggeringAlert.add(os.id);
        }
    });

    attentionPanel.innerHTML = Object.entries(ATTENTION_STATUSES).map(([statusKey, config]) => {
        const vehiclesInStatus = Object.values(allServiceOrders).filter(os => os.status === statusKey);
        const hasVehicles = vehiclesInStatus.length > 0;
        const blinkingClass = (hasVehicles && config.blinkClass && !attentionPanelContainer.classList.contains('collapsed')) ? config.blinkClass : '';
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
    updateLedState(vehiclesTriggeringAlert);
  };
  
  const loginUser = (user) => {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    document.getElementById('currentUserName').textContent = user.name;
    userScreen.classList.add('hidden');
    app.classList.remove('hidden');
    listenToServiceOrders();
    listenToNotifications();
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
      if (os.status === 'Entregue' && deliveredFilter) {
        const searchableText = `${os.placa} ${os.modelo} ${os.cliente}`.toLowerCase();
        if (!searchableText.includes(lowerCaseFilter)) return;
      }
      
      const list = kanbanBoard.querySelector(`.vehicle-list[data-status="${os.status}"]`);
      if (list) list.insertAdjacentHTML('beforeend', createCardHTML(os));
    });
    
    updateAttentionPanel();
    
    if (document.getElementById('searchDeliveredInput')) {
      document.getElementById('searchDeliveredInput').value = deliveredFilter;
      document.getElementById('searchDeliveredInput').addEventListener('input', (e) => {
        renderKanban(e.target.value);
      });
    }
  };
  
  const createCardHTML = (os) => {
    const currentIndex = STATUS_LIST.indexOf(os.status);
    const prevStatus = currentIndex > 0 ? STATUS_LIST[currentIndex - 1] : null;
    const nextStatus = currentIndex < STATUS_LIST.length - 1 ? STATUS_LIST[currentIndex + 1] : null;
    
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
    
    let responsibleInfo = `<p class="text-xs text-gray-500 mt-1">Atendente: ${os.responsible || 'N/D'}</p>`;
    if (os.status === 'Em-Execucao' && os.responsibleForService) {
        responsibleInfo = `<p class="text-xs text-red-600 font-medium mt-1">Mecânico: ${os.responsibleForService}</p>`;
    } else if (os.status === 'Em-Analise' && os.responsibleForBudget) {
        responsibleInfo = `<p class="text-xs text-purple-600 font-medium mt-1">Orçamento: ${os.responsibleForBudget}</p>`;
    }
    
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
  
  function sendTeamNotification(message) {
      if (!currentUser) return;
      const notificationRef = db.ref('notifications').push();
      notificationRef.set({
          message: message,
          user: currentUser.name,
          timestamp: firebase.database.ServerValue.TIMESTAMP
      });
  }

  function listenToNotifications() {
      const notificationsRef = db.ref('notifications').orderByChild('timestamp').startAt(appStartTime);
      notificationsRef.on('child_added', snapshot => {
          const notification = snapshot.val();
          if (notification && notification.user !== currentUser.name) {
              showNotification(notification.message, 'success');
          }
          snapshot.ref.remove();
      });
  }
  
  const updateLedState = (vehiclesTriggeringAlert) => {
    if (vehiclesTriggeringAlert.size > 0 && attentionPanelContainer.classList.contains('collapsed')) {
        alertLed.classList.remove('hidden');
    } else {
        alertLed.classList.add('hidden');
    }
  };
  
  const updateServiceOrderStatus = (osId, newStatus) => {
    const os = allServiceOrders[osId];
    if (!os) return;
    
    const updates = { 
      status: newStatus, 
      lastUpdate: new Date().toISOString() 
    };
    
    if (newStatus === 'Em-Analise') updates.responsibleForBudget = currentUser.name;
    else if (newStatus === 'Em-Execucao') updates.responsibleForService = currentUser.name;
    else if (newStatus === 'Entregue') updates.responsibleForDelivery = currentUser.name;
    
    db.ref(`serviceOrders/${osId}`).update(updates);
    
    sendTeamNotification(`O.S. ${os.placa} movida para ${formatStatus(newStatus)} por ${currentUser.name}`);
  };
  
  const openDetailsModal = (osId) => {
    const os = allServiceOrders[osId];
    if (!os) return;
    
    document.getElementById('detailsPlacaModelo').textContent = `${os.placa} - ${os.modelo}`;
    document.getElementById('detailsCliente').textContent = `Cliente: ${os.cliente}`;
    document.getElementById('detailsKm').textContent = `KM: ${os.km ? new Intl.NumberFormat('pt-BR').format(os.km) : 'N/A'}`;
    
    document.getElementById('responsible-attendant').textContent = os.responsible || 'N/D';
    document.getElementById('responsible-budget').textContent = os.responsibleForBudget || 'N/D';
    document.getElementById('responsible-service').textContent = os.responsibleForService || 'N/D';
    document.getElementById('responsible-delivery').textContent = os.responsibleForDelivery || 'N/D';
    
    const observacoesContainer = document.getElementById('detailsObservacoes');
    if (os.observacoes) {
      observacoesContainer.innerHTML = `
        <h4 class="text-sm font-semibold text-gray-500 mb-1">Queixa do Cliente:</h4>
        <p class="text-gray-800 bg-yellow-100 p-3 rounded-md whitespace-pre-wrap">${os.observacoes}</p>
      `;
      observacoesContainer.classList.remove('hidden');
    } else {
      observacoesContainer.classList.add('hidden');
    }
    
    // Mostra ou esconde o botão de excluir com base no perfil do usuário
    if (currentUser && (currentUser.role === 'Gestor' || currentUser.role === 'Atendente')) {
        deleteOsBtn.classList.remove('hidden');
    } else {
        deleteOsBtn.classList.add('hidden');
    }

    document.getElementById('logOsId').value = osId;
    logForm.reset();
    document.getElementById('fileName').textContent = '';
    filesToUpload = null;
    postLogActions.style.display = 'none';
    
    renderTimeline(os);
    renderMediaGallery(os);
    
    detailsModal.classList.remove('hidden');
    detailsModal.classList.add('flex');
  };
  
  const renderTimeline = (os) => {
    const timelineContainer = document.getElementById('timelineContainer');
    const logs = os.logs || [];
    
    timelineContainer.innerHTML = Object.values(logs).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map(log => {
      const date = new Date(log.timestamp);
      const formattedDate = date.toLocaleDateString('pt-BR');
      const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      let iconClass = 'bx-message-detail';
      let itemClass = 'timeline-item-log';
      
      if (log.type === 'status') {
        iconClass = 'bx-transfer';
        itemClass = 'timeline-item-status';
      } else if (log.value) {
        iconClass = 'bx-dollar';
        itemClass = 'timeline-item-value';
      }
      
      return `
        <div class="timeline-item ${itemClass}">
          <div class="timeline-icon">
            <i class='bx ${iconClass}'></i>
          </div>
          <div class="bg-gray-50 p-3 rounded-lg">
            <div class="flex justify-between items-start mb-1">
              <h4 class="font-semibold text-gray-800 text-sm">${log.user}</h4>
              <span class="text-xs text-gray-500">${formattedDate} ${formattedTime}</span>
            </div>
            <p class="text-gray-700 text-sm">${log.description}</p>
            ${log.parts ? `<p class="text-gray-600 text-xs mt-1"><strong>Peças:</strong> ${log.parts}</p>` : ''}
            ${log.value ? `<p class="text-green-600 text-xs mt-1"><strong>Valor:</strong> R$ ${parseFloat(log.value).toFixed(2)}</p>` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    if (Object.keys(logs).length === 0) {
      timelineContainer.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhum registro encontrado.</p>';
    }
  };
  
  const renderMediaGallery = (os) => {
    const thumbnailGrid = document.getElementById('thumbnail-grid');
    const media = os.media || [];
    
    lightboxMedia = Object.values(media);
    
    thumbnailGrid.innerHTML = lightboxMedia.map((item, index) => {
        const isImage = item.type.startsWith('image/');
        const isVideo = item.type.startsWith('video/');
        const isPdf = item.type === 'application/pdf';

        let thumbnailContent = `<i class='bx bx-file text-4xl text-gray-500'></i>`; // Ícone padrão
        if (isImage) {
            thumbnailContent = `<img src="${item.url}" alt="Imagem ${index + 1}" loading="lazy" class="w-full h-full object-cover">`;
        } else if (isVideo) {
            thumbnailContent = `<i class='bx bx-play-circle text-4xl text-blue-500'></i>`;
        } else if (isPdf) {
            thumbnailContent = `<i class='bx bxs-file-pdf text-4xl text-red-500'></i>`;
        }

        return `
          <div class="aspect-square bg-gray-200 rounded-md overflow-hidden cursor-pointer thumbnail-item flex items-center justify-center" data-index="${index}">
            ${thumbnailContent}
          </div>
        `;
    }).join('');
    
    if (lightboxMedia.length === 0) {
      thumbnailGrid.innerHTML = `
        <div class="col-span-full text-center py-8 text-gray-400">
          <i class='bx bx-image text-4xl mb-2'></i>
          <p class="text-sm">Nenhuma mídia adicionada</p>
        </div>
      `;
    }
  };
  
  const uploadToImgBB = async (file) => {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
          method: 'POST',
          body: formData,
      });
      if (!response.ok) {
          throw new Error(`Erro no upload da imagem: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success) {
          return data.data.url;
      } else {
          throw new Error(data.error.message || 'Falha ao obter URL da imagem.');
      }
  };

  const uploadToGofile = async (file) => {
      // 1. Obter o melhor servidor para upload
      const serverResponse = await fetch(`https://api.gofile.io/getServer`);
      if (!serverResponse.ok) throw new Error('Não foi possível conectar ao servidor de arquivos.');
      const serverData = await serverResponse.json();
      if (serverData.status !== 'ok') throw new Error('Servidor de arquivos indisponível.');
      const server = serverData.data.server;

      // 2. Fazer o upload do arquivo
      const formData = new FormData();
      formData.append('file', file);
      const uploadResponse = await fetch(`https://${server}.gofile.io/uploadFile`, {
          method: 'POST',
          body: formData,
      });
      if (!uploadResponse.ok) throw new Error('Erro durante o upload do PDF.');
      const uploadData = await uploadResponse.json();
      if (uploadData.status !== 'ok') throw new Error('Falha ao processar o PDF no servidor.');
      
      return uploadData.data.downloadPage; // Retorna o link para a página de download
  };
  
  const openLightbox = (index) => {
    if (!lightboxMedia || lightboxMedia.length === 0) return;
    
    currentLightboxIndex = index;
    const media = lightboxMedia[index];

    // Se for PDF, abre em nova aba e não mostra o lightbox
    if (media.type === 'application/pdf') {
        window.open(media.url, '_blank');
        return;
    }
    
    const lightboxContent = document.getElementById('lightbox-content');
    const isImage = media.type.startsWith('image/');
    if (isImage) {
      lightboxContent.innerHTML = `<img src="${media.url}" alt="Imagem" class="max-w-full max-h-full object-contain">`;
    } else {
      lightboxContent.innerHTML = `<video src="${media.url}" controls class="max-w-full max-h-full"></video>`;
    }
    
    document.getElementById('lightbox-prev').style.display = index > 0 ? 'block' : 'none';
    document.getElementById('lightbox-next').style.display = index < lightboxMedia.length - 1 ? 'block' : 'none';
    
    const downloadBtn = document.getElementById('lightbox-download');
    downloadBtn.href = media.url;
    downloadBtn.download = `media_${index + 1}`;
    
    lightbox.classList.remove('hidden');
    lightbox.classList.add('flex');
  };
  
  // ==================================================================
  // LISTENERS DE EVENTOS
  // ==================================================================
  
  userList.addEventListener('click', (e) => {
    const userBtn = e.target.closest('.user-btn');
    if (userBtn) {
      const user = JSON.parse(userBtn.dataset.user);
      loginUser(user);
    }
  });
  
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    location.reload();
  });
  
  togglePanelBtn.addEventListener('click', () => {
    attentionPanelContainer.classList.toggle('collapsed');
    const icon = togglePanelBtn.querySelector('i');
    icon.classList.toggle('rotate-180');
    updateAttentionPanel();
  });
  
  attentionPanel.addEventListener('click', (e) => {
    const vehicleElement = e.target.closest('.attention-vehicle');
    if (vehicleElement) {
      const osId = vehicleElement.dataset.osId;
      openDetailsModal(osId);
    }
  });
  
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
  
  kanbanBoard.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('.toggle-column-btn');
    if (toggleBtn) {
      const status = toggleBtn.dataset.status;
      const vehicleList = kanbanBoard.querySelector(`.vehicle-list[data-status="${status}"]`);
      const icon = toggleBtn.querySelector('i');
      
      vehicleList.classList.toggle('collapsed');
      icon.classList.toggle('rotate-180');
      
      const collapsedState = JSON.parse(localStorage.getItem('collapsedColumns')) || {};
      collapsedState[status] = vehicleList.classList.contains('collapsed');
      localStorage.setItem('collapsedColumns', JSON.stringify(collapsedState));
      
      setTimeout(() => renderKanban(), 100);
    }
  });
  
  document.addEventListener('click', (e) => {
    if (e.target.closest('.btn-close-modal') || e.target.id === 'detailsModal') {
      detailsModal.classList.add('hidden');
    }
     if (e.target.closest('.btn-close-modal') || e.target.id === 'osModal') {
      osModal.classList.add('hidden');
    }
  });
  
  addOSBtn.addEventListener('click', () => {
    document.getElementById('osModalTitle').textContent = 'Nova Ordem de Serviço';
    document.getElementById('osId').value = '';
    osForm.reset();
    
    const responsavelSelect = document.getElementById('osResponsavel');
    responsavelSelect.innerHTML = '<option value="">Selecione um responsável...</option>' +
      USERS.map(user => `<option value="${user.name}">${user.name}</option>`).join('');
    
    osModal.classList.remove('hidden');
    osModal.classList.add('flex');
  });
  
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
      db.ref(`serviceOrders/${osId}`).update(osData);
      sendTeamNotification(`O.S. ${osData.placa} foi atualizada por ${currentUser.name}`);
    } else {
      const newOsRef = db.ref('serviceOrders').push();
      newOsRef.set(osData);
      sendTeamNotification(`Nova O.S. para ${osData.placa} criada por ${currentUser.name}`);
    }
    
    osModal.classList.add('hidden');
  });
  
  logForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Salvando...`;

    const osId = document.getElementById('logOsId').value;
    const description = document.getElementById('logDescricao').value;
    const parts = document.getElementById('logPecas').value;
    const value = document.getElementById('logValor').value;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      description: description,
      type: 'log',
      parts: parts || null,
      value: value || null
    };
    
    try {
        if (filesToUpload && filesToUpload.length > 0) {
            submitBtn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Enviando mídia...`;
            
            const mediaPromises = Array.from(filesToUpload).map(file => {
                if (file.type === 'application/pdf') {
                    return uploadToGofile(file).then(url => ({ type: file.type, url: url, timestamp: new Date().toISOString() }));
                } else {
                    return uploadToImgBB(file).then(url => ({ type: file.type, url: url, timestamp: new Date().toISOString() }));
                }
            });

            const mediaResults = await Promise.all(mediaPromises);
            const mediaRef = db.ref(`serviceOrders/${osId}/media`);
            const snapshot = await mediaRef.once('value');
            const currentMedia = snapshot.val() || [];
            await mediaRef.set([...currentMedia, ...mediaResults]);
        }
        
        const logsRef = db.ref(`serviceOrders/${osId}/logs`);
        const snapshot = await logsRef.once('value');
        const currentLogs = snapshot.val() || [];
        await logsRef.set([...currentLogs, logEntry]);

        logForm.reset();
        filesToUpload = null;
        document.getElementById('fileName').textContent = '';
        postLogActions.style.display = 'flex';
        sendTeamNotification(`Novo registro adicionado à O.S. ${allServiceOrders[osId].placa} por ${currentUser.name}`);

    } catch (error) {
        console.error("Erro ao salvar registro:", error);
        showNotification(`Erro: ${error.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class='bx bx-message-square-add'></i> Adicionar ao Histórico`;
    }
  });
  
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
  });
  
  kmUpdateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const osId = document.getElementById('logOsId').value;
    const newKm = parseInt(document.getElementById('updateKmInput').value);
    
    if (newKm && newKm > 0) {
      db.ref(`serviceOrders/${osId}/km`).set(newKm);
      document.getElementById('updateKmInput').value = '';
      sendTeamNotification(`KM da O.S. ${allServiceOrders[osId].placa} atualizado para ${newKm} por ${currentUser.name}`);
    }
  });
  
  // --- LÓGICA DE EXCLUSÃO ATUALIZADA ---
  deleteOsBtn.addEventListener('click', () => {
    const osId = document.getElementById('logOsId').value;
    const os = allServiceOrders[osId];
    
    // Verifica a permissão antes de abrir o modal
    if (currentUser.role === 'Gestor' || currentUser.role === 'Atendente') {
      confirmDeleteText.innerHTML = `Você tem certeza que deseja excluir a O.S. da placa <strong>${os.placa}</strong>? <br><br>Esta ação não pode ser desfeita.`;
      confirmDeleteBtn.dataset.osId = osId; // Armazena o ID da O.S. no botão de confirmação
      confirmDeleteModal.classList.remove('hidden');
      confirmDeleteModal.classList.add('flex');
    } else {
      showNotification('Você não tem permissão para excluir Ordens de Serviço.', 'error');
    }
  });

  // Evento para o botão de confirmação final no novo modal
  confirmDeleteBtn.addEventListener('click', () => {
    const osId = confirmDeleteBtn.dataset.osId;
    if (osId) {
      const os = allServiceOrders[osId];
      db.ref(`serviceOrders/${osId}`).remove();
      detailsModal.classList.add('hidden');
      confirmDeleteModal.classList.add('hidden');
      confirmDeleteModal.classList.remove('flex');
      showNotification(`O.S. ${os.placa} foi excluída com sucesso.`, 'success');
      sendTeamNotification(`O.S. ${os.placa} foi excluída por ${currentUser.name}`);
    }
  });

  // Evento para o botão de cancelar no novo modal
  cancelDeleteBtn.addEventListener('click', () => {
    confirmDeleteModal.classList.add('hidden');
    confirmDeleteModal.classList.remove('flex');
  });

  // Evento para fechar o modal de exclusão ao clicar fora
  confirmDeleteModal.addEventListener('click', (e) => {
      if (e.target.id === 'confirmDeleteModal') {
          confirmDeleteModal.classList.add('hidden');
          confirmDeleteModal.classList.remove('flex');
      }
  });
  
  openCameraBtn.addEventListener('click', () => {
    mediaInput.setAttribute('accept', 'image/*,video/*');
    mediaInput.setAttribute('capture', 'camera');
    mediaInput.click();
  });
  
  openGalleryBtn.addEventListener('click', () => {
    mediaInput.setAttribute('accept', 'image/*,video/*,application/pdf');
    mediaInput.removeAttribute('capture');
    mediaInput.click();
  });
  
  mediaInput.addEventListener('change', (e) => {
    filesToUpload = e.target.files;
    if (filesToUpload.length > 0) {
      const fileNames = Array.from(filesToUpload).map(f => f.name).join(', ');
      document.getElementById('fileName').textContent = `${filesToUpload.length} arquivo(s) selecionado(s)`;
    } else {
      document.getElementById('fileName').textContent = '';
    }
  });
  
  document.addEventListener('click', (e) => {
    const thumbnailItem = e.target.closest('.thumbnail-item');
    if (thumbnailItem && thumbnailItem.dataset.index !== undefined) {
      openLightbox(parseInt(thumbnailItem.dataset.index));
    }
  });
  
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
  
  document.getElementById('lightbox-copy').addEventListener('click', () => {
    const media = lightboxMedia[currentLightboxIndex];
    navigator.clipboard.writeText(media.url).then(() => {
      showNotification('URL copiada para a área de transferência!');
    });
  });
  
  checkLoggedInUser();
});
