// public/js/admin.js - логика панели модератора

// Глобальные переменные
let pendingRequests = [];
let allLicenses = [];

// Загрузка запросов на добавление
async function loadPendingRequests() {
    const token = Auth.getToken();
    
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    
    const listEl = document.getElementById('requestsList');
    if (listEl) {
        listEl.innerHTML = '<div class="empty-state">⏳ Загрузка запросов...</div>';
    }
    
    try {
        const response = await Auth.fetchAuth('/api/admin/requests');
        const data = await response.json();
        
        if (data.success) {
            pendingRequests = data.requests;
            renderRequestsList(pendingRequests);
            updateRequestsCount(pendingRequests.length);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Load requests error:', error);
        if (listEl) {
            listEl.innerHTML = '<div class="empty-state">❌ Ошибка загрузки запросов</div>';
        }
        Utils.showToast('Ошибка загрузки запросов', 'error');
    }
}

// Отрисовка списка запросов
function renderRequestsList(requests) {
    const listEl = document.getElementById('requestsList');
    if (!listEl) return;
    
    if (!requests || requests.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                <div>Нет запросов на добавление</div>
                <div style="font-size: 13px; margin-top: 8px; color: rgba(255,255,255,0.4);">Все запросы обработаны</div>
            </div>
        `;
        return;
    }
    
    listEl.innerHTML = requests.map(request => `
        <div class="table-row" data-id="${request.id}">
            <div class="license-name">${Utils.escapeHtml(request.name)}</div>
            <div>
                <span class="license-color color-${request.color}"></span>
                <span style="text-transform: capitalize;">${request.color === 'green' ? 'Свободная' : (request.color === 'yellow' ? 'Осторожно' : 'Строгая')}</span>
            </div>
            <div>
                <div>${Utils.escapeHtml(request.submittedBy || 'anonymous')}</div>
                <div class="submitter-info">${Utils.formatDate(request.submittedAt)}</div>
            </div>
            <div class="request-actions">
                <button class="btn-approve" onclick="approveRequest(${request.id})">✅ Одобрить</button>
                <button class="btn-reject" onclick="rejectRequest(${request.id})">❌ Отклонить</button>
            </div>
        </div>
    `).join('');
}

// Одобрение запроса
async function approveRequest(requestId) {
    const token = Auth.getToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    
    if (!confirm('Одобрить эту лицензию? Она будет добавлена в общий список.')) return;
    
    Utils.showToast('⏳ Одобрение...', '');
    
    try {
        const response = await Auth.fetchAuth(`/api/admin/approve/${requestId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            Utils.showToast('✅ Лицензия одобрена и добавлена', 'success');
            await loadPendingRequests();
            await loadAllLicenses();
        } else {
            Utils.showToast(data.error || 'Ошибка', 'error');
        }
    } catch (error) {
        console.error('Approve error:', error);
        Utils.showToast('Ошибка при одобрении', 'error');
    }
}

// Отклонение запроса
async function rejectRequest(requestId) {
    const token = Auth.getToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    
    const reason = prompt('Укажите причину отклонения (необязательно):');
    if (reason === null) return;
    
    Utils.showToast('⏳ Отклонение...', '');
    
    try {
        const response = await Auth.fetchAuth(`/api/admin/reject/${requestId}`, {
            method: 'POST',
            body: JSON.stringify({ reason: reason || 'Не указана' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            Utils.showToast('❌ Запрос отклонён', 'warning');
            await loadPendingRequests();
        } else {
            Utils.showToast(data.error || 'Ошибка', 'error');
        }
    } catch (error) {
        console.error('Reject error:', error);
        Utils.showToast('Ошибка при отклонении', 'error');
    }
}

// Загрузка всех лицензий (для управления)
async function loadAllLicenses() {
    const token = Auth.getToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    
    const listEl = document.getElementById('licensesList');
    if (listEl) {
        listEl.innerHTML = '<div class="empty-state">⏳ Загрузка лицензий...</div>';
    }
    
    try {
        const response = await Auth.fetchAuth('/api/licenses?limit=1000');
        const data = await response.json();
        
        if (data.success) {
            allLicenses = data.licenses;
            renderAllLicenses(allLicenses);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Load licenses error:', error);
        if (listEl) {
            listEl.innerHTML = '<div class="empty-state">❌ Ошибка загрузки лицензий</div>';
        }
        Utils.showToast('Ошибка загрузки лицензий', 'error');
    }
}

// Отрисовка списка всех лицензий (для управления)
function renderAllLicenses(licenses) {
    const listEl = document.getElementById('licensesList');
    if (!listEl) return;
    
    // Фильтруем, показываем только не базовые лицензии (которые можно редактировать)
    const editableLicenses = licenses.filter(l => !l.isBase);
    
    if (editableLicenses.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 48px; margin-bottom: 16px;">✏️</div>
                <div>Нет лицензий для редактирования</div>
                <div style="font-size: 13px; margin-top: 8px; color: rgba(255,255,255,0.4);">Все лицензии базовые или ещё не добавлены</div>
            </div>
        `;
        return;
    }
    
    listEl.innerHTML = editableLicenses.map(license => `
        <div class="table-row" data-id="${license.id}">
            <div class="license-name">${Utils.escapeHtml(license.name)}</div>
            <div>
                <span class="license-color color-${license.color}"></span>
                <span style="text-transform: capitalize;">${license.color === 'green' ? 'Свободная' : (license.color === 'yellow' ? 'Осторожно' : 'Строгая')}</span>
            </div>
            <div>
                ${license.isGenerated ? '🎲 Сгенерированная' : (license.isUserAdded ? '✏️ Добавленная' : '📋 Базовая')}
                ${license.isGenerated ? '<div class="submitter-info">Можно удалить</div>' : ''}
            </div>
            <div class="license-actions">
                <button class="btn-edit" onclick="openEditModal(${license.id})">✏️ Редактировать</button>
                <button class="btn-delete" onclick="deleteLicenseItem(${license.id})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}

// Открытие модального окна редактирования
function openEditModal(licenseId) {
    const license = allLicenses.find(l => l.id === licenseId);
    if (!license) return;
    
    document.getElementById('editLicenseId').value = license.id;
    document.getElementById('editLicenseName').value = license.name;
    
    // Выбираем цвет
    const colorRadios = document.querySelectorAll('input[name="editLicenseColor"]');
    colorRadios.forEach(radio => {
        if (radio.value === license.color) {
            radio.checked = true;
        }
    });
    
    document.getElementById('editCanDo').value = (license.canDo || []).join('\n');
    document.getElementById('editCannotDo').value = (license.cannotDo || []).join('\n');
    document.getElementById('editMustDo').value = (license.mustDo || []).join('\n');
    
    document.getElementById('editModal').style.display = 'block';
}

// Закрытие модального окна редактирования
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// Сохранение отредактированной лицензии
async function saveEditedLicense(event) {
    event.preventDefault();
    
    const licenseId = document.getElementById('editLicenseId').value;
    const name = document.getElementById('editLicenseName').value.trim();
    const color = document.querySelector('input[name="editLicenseColor"]:checked').value;
    const canDo = document.getElementById('editCanDo').value.split('\n').filter(l => l.trim());
    const cannotDo = document.getElementById('editCannotDo').value.split('\n').filter(l => l.trim());
    const mustDo = document.getElementById('editMustDo').value.split('\n').filter(l => l.trim());
    
    if (!name) {
        Utils.showToast('Введите название лицензии', 'error');
        return;
    }
    
    Utils.showToast('⏳ Сохранение...', '');
    
    try {
        const response = await Auth.fetchAuth(`/api/admin/licenses/${licenseId}?id=${licenseId}`, {
            method: 'PUT',
            body: JSON.stringify({ name, color, canDo, cannotDo, mustDo })
        });
        
        const data = await response.json();
        
        if (data.success) {
            Utils.showToast('✅ Лицензия обновлена', 'success');
            closeEditModal();
            await loadAllLicenses();
            // Обновляем основную страницу при необходимости
            if (window.App) {
                window.App.loadLicenses(true);
            }
        } else {
            Utils.showToast(data.error || 'Ошибка', 'error');
        }
    } catch (error) {
        console.error('Save error:', error);
        Utils.showToast('Ошибка при сохранении', 'error');
    }
}

// Удаление лицензии
async function deleteLicenseItem(licenseId) {
    if (!confirm('Удалить эту лицензию? Это действие необратимо.')) return;
    
    Utils.showToast('⏳ Удаление...', '');
    
    try {
        const response = await Auth.fetchAuth(`/api/admin/licenses/${licenseId}?id=${licenseId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            Utils.showToast('🗑️ Лицензия удалена', 'success');
            await loadAllLicenses();
            if (window.App) {
                window.App.loadLicenses(true);
            }
        } else {
            Utils.showToast(data.error || 'Ошибка', 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        Utils.showToast('Ошибка при удалении', 'error');
    }
}

// Обновление счётчика запросов
function updateRequestsCount(count) {
    const countSpan = document.getElementById('requestsCount');
    if (countSpan) {
        countSpan.textContent = `(${count})`;
        
        // Если есть запросы, подсвечиваем таб
        const requestsTab = document.querySelector('.admin-tab[data-tab="requests"]');
        if (requestsTab) {
            if (count > 0) {
                requestsTab.style.borderColor = '#fdcb6e';
            } else {
                requestsTab.style.borderColor = '';
            }
        }
    }
}

// Настройка обработчиков формы редактирования
function setupEditForm() {
    const form = document.getElementById('editLicenseForm');
    if (form) {
        form.addEventListener('submit', saveEditedLicense);
    }
    
    // Закрытие модалки по клику на оверлей
    const modal = document.getElementById('editModal');
    if (modal) {
        const overlay = modal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', closeEditModal);
        }
    }
}

// Инициализация админ-панели
document.addEventListener('DOMContentLoaded', () => {
    setupEditForm();
});

// Глобальные функции для onclick
window.loadPendingRequests = loadPendingRequests;
window.loadAllLicenses = loadAllLicenses;
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.deleteLicenseItem = deleteLicenseItem;
window.renderAllLicenses = renderAllLicenses;