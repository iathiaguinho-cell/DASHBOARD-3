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
  let filesToUpload = [];
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
  const confirmDeleteModal = document.getElementById('confirmDeleteModal');
  const confirmDeleteText = document.getElementById('confirmDeleteText');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  
  const formatStatus = (status) => status.replace(/-/g, ' ');

  const initializeKanban = () => {
    const collapsedState = JSON.parse(localStorage.getItem('collapsedColumns')) || {};
    kanbanBoard.innerHTML = STATUS_LIST.map(status => {
      const isCollapsed = collapsedState[status];
      const searchInputHTML = `
        <div class="my-2">
          <input type="search" data-status="${status}" placeholder="Buscar por Placa..." 
                 class="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 search-input">
        </div>
      `;
      const columnLedHTML = isCollapsed ? `<div class="column-led ml-2"></div>` : '';
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
    updateAttentionPanel();
  };

  const createCardHTML = (os) => {
    const currentIndex = STATUS_LIST.indexOf(os.status);
    const prevStatus = currentIndex > 0 ? STATUS_LIST[currentIndex - 1] : null;
    const nextStatus = currentIndex < STATUS_LIST.length - 1 ? STATUS_LIST[currentIndex + 1] : null;
    const prevButton = prevStatus ? `<button data-os-id="${os.id}" data-new-status="${prevStatus}" class="btn-move-status p-2 rounded-full hover:bg-gray-100 transition-colors"><i class='bx bx-chevron-left text-xl text-gray-600'></i></button>` : `<div class="w-10 h-10"></div>`;
    const nextButton = nextStatus ? `<button data-os-id="${os.id}" data-new-status="${nextStatus}" class="btn-move-status p-2 rounded-full hover:bg-gray-100 transition-colors"><i class='bx bx-chevron-right text-xl text-gray-600'></i></button>` : `<div class="w-10 h-10"></div>`;
    let responsibleInfo = `<p class="text-xs text-gray-500 mt-1">Atendente: ${os.responsible || 'N/D'}</p>`;
    if (os.status === 'Em-Execucao' && os.responsibleForService) {
        responsibleInfo = `<p class="text-xs text-red-600 font-medium mt-1">Mecânico: ${os.responsibleForService}</p>`;
    } else if (os.status === 'Em-Analise' && os.responsibleForBudget) {
        responsibleInfo = `<p class="text-xs text-purple-600 font-medium mt-1">Orçamento: ${os.responsibleForBudget}</p>`;
    }
    const kmInfo = `<p class="text-xs text-gray-500">KM: ${os.km ? new Intl.NumberFormat('pt-BR').format(os.km) : 'N/A'}</p>`;
    const priorityIndicatorHTML = os.priority ? `<div class="priority-indicator priority-${os.priority}" title="Urgência: ${os.priority}"></div>` : '';
    return `
      <div id="${os.id}" class="vehicle-card status-${os.status}" data-os-id="${os.id}">
        ${priorityIndicatorHTML}
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

  const renderDeliveredColumn = () => {
      const list = kanbanBoard.querySelector('.vehicle-list[data-status="Entregue"]');
      if (!list) return;
      const searchInput = kanbanBoard.querySelector('.search-input[data-status="Entregue"]');
      const searchTerm = searchInput ? searchInput.value.toUpperCase().trim() : '';
      let deliveredItems = Object.values(allServiceOrders).filter(os => os.status === 'Entregue');
      if (searchTerm) {
          deliveredItems = deliveredItems.filter(os => os.placa.toUpperCase().includes(searchTerm) || os.modelo.toUpperCase().includes(searchTerm));
      }
      deliveredItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      list.innerHTML = deliveredItems.map(os => createCardHTML(os)).join('');
  };

  const listenToServiceOrdersOptimized = () => {
    const osRef = db.ref('serviceOrders');
    osRef.on('child_added', snapshot => {
      const os = { ...snapshot.val(), id: snapshot.key };
      allServiceOrders[os.id] = os; 
      if (os.status === 'Entregue') {
        renderDeliveredColumn();
      } else {
        const list = kanbanBoard.querySelector(`.vehicle-list[data-status="${os.status}"]`);
        if (list) {
          list.insertAdjacentHTML('beforeend', createCardHTML(os));
        }
      }
      updateAttentionPanel();
    });
    osRef.on('child_changed', snapshot => {
      const os = { ...snapshot.val(), id: snapshot.key };
      const oldOs = allServiceOrders[os.id];
      allServiceOrders[os.id] = os; 
      const existingCard = document.getElementById(os.id);
      if (oldOs && oldOs.status !== os.status) {
        if (existingCard) existingCard.remove();
        if (os.status === 'Entregue') {
          renderDeliveredColumn();
        } else {
          const newList = kanbanBoard.querySelector(`.vehicle-list[data-status="${os.status}"]`);
          if (newList) newList.insertAdjacentHTML('beforeend', createCardHTML(os));
        }
        if(oldOs.status === 'Entregue') {
            renderDeliveredColumn();
        }
      } 
      else if (existingCard) {
        if (os.status === 'Entregue') {
            renderDeliveredColumn();
        } else {
            existingCard.outerHTML = createCardHTML(os);
        }
      }
      updateAttentionPanel();
    });
    osRef.on('child_removed', snapshot => {
      const osId = snapshot.key;
      const removedOs = allServiceOrders[osId];
      delete allServiceOrders[osId];
      if (removedOs && removedOs.status === 'Entregue') {
          renderDeliveredColumn();
      } else {
          const cardToRemove = document.getElementById(osId);
          if (cardToRemove) cardToRemove.remove();
      }
      updateAttentionPanel();
    });
  };

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
    initializeKanban();
    listenToServiceOrdersOptimized(); 
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
  
  const updateServiceOrderStatus = async (osId, newStatus) => {
    const os = allServiceOrders[osId];
    if (!os) return;
    const oldStatus = os.status;
    const logEntry = {
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        description: `Status alterado de "${formatStatus(oldStatus)}" para "${formatStatus(newStatus)}".`,
        type: 'status'
    };
    const updates = { status: newStatus, lastUpdate: new Date().toISOString() };
    if (newStatus === 'Em-Analise') updates.responsibleForBudget = currentUser.name;
    else if (newStatus === 'Em-Execucao') updates.responsibleForService = currentUser.name;
    else if (newStatus === 'Entregue') updates.responsibleForDelivery = currentUser.name;
    try {
        const logsRef = db.ref(`serviceOrders/${osId}/logs`);
        const newLogRef = logsRef.push();
        await newLogRef.set(logEntry);
        await db.ref(`serviceOrders/${osId}`).update(updates);
        sendTeamNotification(`O.S. ${os.placa} movida para ${formatStatus(newStatus)} por ${currentUser.name}`);
    } catch (error) {
        console.error("Erro ao atualizar status e registrar log:", error);
        showNotification("Falha ao mover O.S. Tente novamente.", "error");
    }
  };
  
  const openDetailsModal = (osId) => {
    const os = allServiceOrders[osId];
    if (!os) {
        showNotification("Não foi possível carregar os detalhes desta O.S.", "error");
        return;
    }
    document.getElementById('detailsPlacaModelo').textContent = `${os.placa} - ${os.modelo}`;
    document.getElementById('detailsCliente').innerHTML = `Cliente: ${os.cliente} <br> <span class="text-sm text-gray-500">Telefone: ${os.telefone || 'Não informado'}</span>`;
    document.getElementById('detailsKm').textContent = `KM: ${os.km ? new Intl.NumberFormat('pt-BR').format(os.km) : 'N/A'}`;
    document.getElementById('responsible-attendant').textContent = os.responsible || 'N/D';
    document.getElementById('responsible-budget').textContent = os.responsibleForBudget || 'N/D';
    document.getElementById('responsible-service').textContent = os.responsibleForService || 'N/D';
    document.getElementById('responsible-delivery').textContent = os.responsibleForDelivery || 'N/D';
    const observacoesContainer = document.getElementById('detailsObservacoes');
    if (os.observacoes) {
      observacoesContainer.innerHTML = `<h4 class="text-sm font-semibold text-gray-500 mb-1">Queixa do Cliente:</h4><p class="text-gray-800 bg-yellow-100 p-3 rounded-md whitespace-pre-wrap">${os.observacoes}</p>`;
      observacoesContainer.classList.remove('hidden');
    } else {
      observacoesContainer.classList.add('hidden');
    }
    if (currentUser && (currentUser.role === 'Gestor' || currentUser.role === 'Atendente')) {
        deleteOsBtn.classList.remove('hidden');
    } else {
        deleteOsBtn.classList.add('hidden');
    }
    document.getElementById('logOsId').value = osId;
    logForm.reset();
    document.getElementById('fileName').textContent = '';
    filesToUpload = [];
    postLogActions.style.display = 'none';
    renderTimeline(os);
    renderMediaGallery(os);
    const existingSignature = detailsModal.querySelector('.dev-signature-modal');
    if (existingSignature) {
        existingSignature.remove();
    }
    const actionsSection = detailsModal.querySelector('.os-actions-section');
    if (actionsSection) {
        const signatureDiv = document.createElement('div');
        signatureDiv.className = 'dev-signature-modal text-center text-xs text-gray-500 mt-4 px-4';
        signatureDiv.innerHTML = `<p>Desenvolvido com 🤖 por <strong>thIAguinho Soluções</strong></p>`;
        actionsSection.appendChild(signatureDiv);
    }
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
      return `<div class="timeline-item ${itemClass}"><div class="timeline-icon"><i class='bx ${iconClass}'></i></div><div class="bg-gray-50 p-3 rounded-lg"><div class="flex justify-between items-start mb-1"><h4 class="font-semibold text-gray-800 text-sm">${log.user}</h4><span class="text-xs text-gray-500">${formattedDate} ${formattedTime}</span></div><p class="text-gray-700 text-sm">${log.description}</p>${log.parts ? `<p class="text-gray-600 text-xs mt-1"><strong>Peças:</strong> ${log.parts}</p>` : ''}${log.value ? `<p class="text-green-600 text-xs mt-1"><strong>Valor:</strong> R$ ${parseFloat(log.value).toFixed(2)}</p>` : ''}</div></div>`;
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
        let thumbnailContent = `<i class='bx bx-file text-4xl text-gray-500'></i>`; 
        if (isImage) {
            thumbnailContent = `<img src="${item.url}" alt="Imagem ${index + 1}" loading="lazy" class="w-full h-full object-cover">`;
        } else if (isVideo) {
            thumbnailContent = `<i class='bx bx-play-circle text-4xl text-blue-500'></i>`;
        } else if (isPdf) {
            thumbnailContent = `<i class='bx bxs-file-pdf text-4xl text-red-500'></i>`;
        }
        return `<div class="aspect-square bg-gray-200 rounded-md overflow-hidden cursor-pointer thumbnail-item flex items-center justify-center" data-index="${index}">${thumbnailContent}</div>`;
    }).join('');
    if (lightboxMedia.length === 0) {
      thumbnailGrid.innerHTML = `<div class="col-span-full text-center py-8 text-gray-400"><i class='bx bx-image text-4xl mb-2'></i><p class="text-sm">Nenhuma mídia adicionada</p></div>`;
    }
  };
  
  const exportOsToPrint = (osId) => {
    const os = allServiceOrders[osId];
    if (!os) {
      showNotification('Dados da O.S. não encontrados.', 'error');
      return;
    }
    const formatDate = (isoString) => {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    };
    const logs = os.logs ? Object.values(os.logs).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp)) : [];
    let totalValue = 0;
    const timelineHtml = logs.map(log => {
        if (log.value) {
            totalValue += parseFloat(log.value);
        }
        return `<tr><td>${formatDate(log.timestamp)}</td><td>${log.user}</td><td>${log.description}</td><td>${log.parts || '---'}</td><td style="text-align: right;">${log.value ? `R$ ${parseFloat(log.value).toFixed(2)}` : '---'}</td></tr>`;
    }).join('');
    const media = os.media ? Object.values(os.media) : [];
    const photos = media.filter(item => item.type.startsWith('image/'));
    const photosHtml = photos.length > 0 ? `<div class="section"><h2>Fotos Anexadas</h2><div class="photo-gallery">${photos.map(photo => `<img src="${photo.url}" alt="Foto da O.S.">`).join('')}</div></div>` : '';
    const printHtml = `<html><head><title>Ordem de Serviço - ${os.placa}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;margin:0;padding:20px;color:#333}.container{max-width:800px;margin:auto}.header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:20px}.header h1{margin:0;font-size:24px}.header p{margin:5px 0}.section{margin-bottom:20px;border:1px solid #ccc;border-radius:8px;padding:15px;page-break-inside:avoid}.section h2{margin-top:0;font-size:18px;border-bottom:1px solid #eee;padding-bottom:5px;margin-bottom:10px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.grid-item strong{display:block;color:#555}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:14px}th{background-color:#f2f2f2}.total{text-align:right;font-size:18px;font-weight:bold;margin-top:20px}.footer{text-align:center;margin-top:50px;padding-top:20px;border-top:1px solid #ccc}.signature{margin-top:60px}.signature-line{border-bottom:1px solid #000;width:300px;margin:0 auto}.signature p{margin-top:5px;font-size:14px}.photo-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:10px}.photo-gallery img{width:100%;height:auto;border:1px solid #ddd;border-radius:4px}.dev-signature{margin-top:40px;font-size:12px;color:#888}.dev-signature strong{color:#555}@media print{body{padding:10px}.no-print{display:none}}</style></head><body><div class="container"><div class="header"><h1>CHEVRON Bosch Car Service</h1><p>Ordem de Serviço</p></div><div class="section"><h2>Detalhes da O.S.</h2><div class="grid"><div class="grid-item"><strong>Placa:</strong> ${os.placa}</div><div class="grid-item"><strong>Modelo:</strong> ${os.modelo}</div><div class="grid-item"><strong>Cliente:</strong> ${os.cliente}</div><div class="grid-item"><strong>Telefone:</strong> ${os.telefone||"N/A"}</div><div class="grid-item"><strong>KM:</strong> ${os.km?new Intl.NumberFormat("pt-BR").format(os.km):"N/A"}</div><div class="grid-item"><strong>Data de Abertura:</strong> ${formatDate(os.createdAt)}</div><div class="grid-item"><strong>Atendente:</strong> ${os.responsible||"N/A"}</div></div></div>${os.observacoes?`<div class="section"><h2>Queixa do Cliente / Observações Iniciais</h2><p style="white-space: pre-wrap;">${os.observacoes}</p></div>`:""}<div class="section"><h2>Histórico de Serviços e Peças</h2><table><thead><tr><th>Data/Hora</th><th>Usuário</th><th>Descrição</th><th>Peças</th><th style="text-align: right;">Valor</th></tr></thead><tbody>${timelineHtml||'<tr><td colspan="5" style="text-align: center;">Nenhum registro no histórico.</td></tr>'}</tbody></table><div class="total">Total: R$ ${totalValue.toFixed(2)}</div></div>${photosHtml}<div class="footer"><div class="signature"><div class="signature-line"></div><p>Assinatura do Cliente</p></div><p>Documento gerado em: ${new Date().toLocaleString("pt-BR")}</p><div class="dev-signature"><p>Desenvolvido com 🚀 por <strong>thIAguinho Soluções</strong></p></div></div></div><script>window.onload=function(){window.print();setTimeout(function(){window.close()},100)}<\/script></body></html>`;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };
  
  const uploadFileToFirebase = async (file, osId) => {
    const storage = firebase.storage();
    const filePath = `media/${osId}/${Date.now()}-${file.name}`;
    const fileRef = storage.ref(filePath);
    try {
        const snapshot = await fileRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        return downloadURL;
    } catch (error) {
        console.error("Erro no upload para o Firebase Storage:", error);
        throw new Error(`Erro no upload do arquivo: ${file.name}`);
    }
  };
  
  const openLightbox = (index) => {
    if (!lightboxMedia || lightboxMedia.length === 0) return;
    currentLightboxIndex = index;
    const media = lightboxMedia[index];
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
  
  userList.addEventListener('click', (e) => {
    const userBtn = e.target.closest('.user-btn');
    if (userBtn) {
      const user = JSON.parse(userBtn.dataset.user);
      loginUser(user);
    }
  });
  
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    db.ref('serviceOrders').off();
    db.ref('notifications').off();
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
    const toggleBtn = e.target.closest('.toggle-column-btn');
    if (moveBtn) {
      e.stopPropagation();
      const osId = moveBtn.dataset.osId;
      const newStatus = moveBtn.dataset.newStatus;
      updateServiceOrderStatus(osId, newStatus);
    } else if (clickableArea && card) {
      const osId = card.dataset.osId;
      openDetailsModal(osId);
    } else if (toggleBtn) {
      const status = toggleBtn.dataset.status;
      const vehicleList = kanbanBoard.querySelector(`.vehicle-list[data-status="${status}"]`);
      const icon = toggleBtn.querySelector('i');
      vehicleList.classList.toggle('collapsed');
      icon.classList.toggle('rotate-180');
      const collapsedState = JSON.parse(localStorage.getItem('collapsedColumns')) || {};
      collapsedState[status] = vehicleList.classList.contains('collapsed');
      localStorage.setItem('collapsedColumns', JSON.stringify(collapsedState));
      const columnLed = toggleBtn.querySelector('.column-led');
      if (columnLed) columnLed.style.display = (collapsedState[status] && vehicleList.children.length > 0) ? 'block' : 'none';
    }
  });

  kanbanBoard.addEventListener('input', (e) => {
      if (e.target.matches('.search-input')) {
          const status = e.target.dataset.status;
          const searchTerm = e.target.value.toUpperCase().trim();
          if (status === 'Entregue') {
              renderDeliveredColumn();
              return;
          }
          const columnList = kanbanBoard.querySelector(`.vehicle-list[data-status="${status}"]`);
          const cards = columnList.querySelectorAll('.vehicle-card');
          cards.forEach(card => {
              const placa = card.querySelector('.font-bold').textContent.toUpperCase();
              const modelo = card.querySelector('.text-sm').textContent.toUpperCase();
              if (placa.includes(searchTerm) || modelo.includes(searchTerm)) {
                  card.style.display = '';
              } else {
                  card.style.display = 'none';
              }
          });
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

  detailsModal.addEventListener('click', (e) => {
    const exportBtn = e.target.closest('#exportOsBtn');
    if (exportBtn) {
        const osId = document.getElementById('logOsId').value;
        if (osId) {
            exportOsToPrint(osId);
        }
    }
  });
  
  addOSBtn.addEventListener('click', () => {
    document.getElementById('osModalTitle').textContent = 'Nova Ordem de Serviço';
    document.getElementById('osId').value = '';
    osForm.reset();
    const responsavelSelect = document.getElementById('osResponsavel');
    responsavelSelect.innerHTML = '<option value="">Selecione um responsável...</option>' + USERS.map(user => `<option value="${user.name}">${user.name}</option>`).join('');
    osModal.classList.remove('hidden');
    osModal.classList.add('flex');
  });
  
  osForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const priority = document.querySelector('input[name="osPrioridade"]:checked').value;
    const osData = {
      placa: document.getElementById('osPlaca').value.toUpperCase(),
      modelo: document.getElementById('osModelo').value,
      cliente: document.getElementById('osCliente').value,
      telefone: document.getElementById('osTelefone').value,
      km: parseInt(document.getElementById('osKm').value) || 0,
      responsible: document.getElementById('osResponsavel').value,
      observacoes: document.getElementById('osObservacoes').value,
      priority: priority,
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
            const mediaPromises = filesToUpload.map(file => 
                uploadFileToFirebase(file, osId).then(url => ({ 
                    type: file.type, 
                    url: url, 
                    name: file.name,
                    timestamp: new Date().toISOString() 
                }))
            );
            const mediaResults = await Promise.all(mediaPromises);
            const mediaRef = db.ref(`serviceOrders/${osId}/media`);
            const snapshot = await mediaRef.once('value');
            const currentMedia = snapshot.val() || [];
            await mediaRef.set([...currentMedia, ...mediaResults]);
        }
        const logsRef = db.ref(`serviceOrders/${osId}/logs`);
        const newLogRef = logsRef.push();
        await newLogRef.set(logEntry);
        logForm.reset();
        filesToUpload = [];
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
  
  kmUpdateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const osId = document.getElementById('logOsId').value;
    const newKm = parseInt(document.getElementById('updateKmInput').value);
    if (newKm && newKm > 0) {
      await db.ref(`serviceOrders/${osId}/km`).set(newKm);
      const logEntry = {
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        description: `KM do veículo atualizado para ${new Intl.NumberFormat('pt-BR').format(newKm)} km.`,
        type: 'log'
      };
      const logsRef = db.ref(`serviceOrders/${osId}/logs`);
      const newLogRef = logsRef.push();
      await newLogRef.set(logEntry);
      document.getElementById('updateKmInput').value = '';
      showNotification('KM atualizado e registrado no histórico!', 'success');
      sendTeamNotification(`KM da O.S. ${allServiceOrders[osId].placa} atualizado para ${newKm} por ${currentUser.name}`);
    }
  });
  
  deleteOsBtn.addEventListener('click', () => {
    const osId = document.getElementById('logOsId').value;
    const os = allServiceOrders[osId];
    if (currentUser.role === 'Gestor' || currentUser.role === 'Atendente') {
      confirmDeleteText.innerHTML = `Você tem certeza que deseja excluir a O.S. da placa <strong>${os.placa}</strong>? <br><br>Esta ação não pode ser desfeita.`;
      confirmDeleteBtn.dataset.osId = osId;
      confirmDeleteModal.classList.remove('hidden');
      confirmDeleteModal.classList.add('flex');
    } else {
      showNotification('Você não tem permissão para excluir Ordens de Serviço.', 'error');
    }
  });

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

  cancelDeleteBtn.addEventListener('click', () => {
    confirmDeleteModal.classList.add('hidden');
    confirmDeleteModal.classList.remove('flex');
  });

  confirmDeleteModal.addEventListener('click', (e) => {
      if (e.target.id === 'confirmDeleteModal') {
          confirmDeleteModal.classList.add('hidden');
          confirmDeleteModal.classList.remove('flex');
      }
  });
  
  openCameraBtn.addEventListener('click', () => {
    mediaInput.setAttribute('accept', 'image/*');
    mediaInput.setAttribute('capture', 'camera');
    mediaInput.multiple = true;
    mediaInput.value = null;
    mediaInput.click();
  });
  
  openGalleryBtn.addEventListener('click', () => {
    mediaInput.setAttribute('accept', 'image/*,video/*,application/pdf');
    mediaInput.removeAttribute('capture');
    mediaInput.multiple = true;
    mediaInput.value = null;
    mediaInput.click();
  });
  
  mediaInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        filesToUpload.push(...e.target.files);
    }
    if (filesToUpload.length > 0) {
      document.getElementById('fileName').textContent = `${filesToUpload.length} arquivo(s) na fila`;
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
