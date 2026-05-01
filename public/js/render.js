// public/js/render.js - отрисовка карточек лицензий

const Render = {
    // Текущий список лицензий
    currentLicenses: [],
    
    // Рендер карточек
    renderCards(licenses) {
        const grid = document.getElementById('cardsGrid');
        this.currentLicenses = licenses;
        
        if (!grid) return;
        
        if (!licenses || licenses.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1; text-align:center; padding:60px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
                    <h3 style="color: rgba(255,255,255,0.7);">Ничего не найдено</h3>
                    <p style="color: rgba(255,255,255,0.4); margin-top: 8px;">Попробуйте изменить поисковый запрос</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = licenses.map(lic => this.renderCard(lic)).join('');
        
        // Добавляем обработчики для карточек
        this.attachCardEvents();
    },
    
    // Рендер одной карточки
    renderCard(lic) {
        const colorEmoji = lic.color === 'green' ? '🟢' : (lic.color === 'yellow' ? '🟡' : '🔴');
        
        // Определяем бейдж источника
        let sourceBadge = '';
        if (lic.isGenerated) {
            sourceBadge = '<span class="source-badge generated">🎲 Сгенерированная</span>';
        } else if (lic.isUserAdded) {
            sourceBadge = '<span class="source-badge user">✏️ Добавленная</span>';
        } else if (lic.externalSource) {
            sourceBadge = `<span class="source-badge external">🌐 ${Utils.escapeHtml(lic.externalSource)}</span>`;
        }
        
        return `
            <div class="card ${lic.color} ${lic.expanded ? 'expanded' : ''}" data-id="${lic.id}">
                <div class="card-header" onclick="Render.toggleCard(${lic.id})">
                    <div class="traffic-light ${lic.color}"></div>
                    <span class="card-title">${colorEmoji} ${Utils.escapeHtml(lic.name)}</span>
                    ${sourceBadge}
                </div>
                <div class="card-body">
                    <div class="card-body-inner">
                        ${this.renderSection('canDo', '✅ Можно:', lic.canDo)}
                        ${this.renderSection('cannotDo', '❌ Нельзя:', lic.cannotDo)}
                        ${this.renderSection('mustDo', '⚠️ Нужно:', lic.mustDo)}
                        <div class="card-actions">
                            <button class="copy-btn" onclick="event.stopPropagation(); Render.copyLicenseName('${Utils.escapeHtml(lic.name)}', this)">
                                📋 Скопировать название
                            </button>
                        </div>
                    </div>
                </div>
                <div class="expand-hint" onclick="Render.toggleCard(${lic.id})">
                    👆 Нажмите, чтобы ${lic.expanded ? 'свернуть' : 'развернуть'} подробности
                </div>
            </div>
        `;
    },
    
    // Рендер секции (Можно, Нельзя, Нужно)
    renderSection(className, title, items) {
        if (!items || items.length === 0) return '';
        return `
            <div class="detail-section">
                <strong>${title}</strong>
                <ul class="${className}">
                    ${items.map(item => `<li>${Utils.escapeHtml(item)}</li>`).join('')}
                </ul>
            </div>
        `;
    },
    
    // Переключение состояния карточки (развернуть/свернуть)
    toggleCard(licenseId) {
        const card = document.querySelector(`.card[data-id="${licenseId}"]`);
        if (!card) return;
        
        card.classList.toggle('expanded');
        const isExpanded = card.classList.contains('expanded');
        
        // Обновляем hint
        const hint = card.querySelector('.expand-hint');
        if (hint) {
            hint.textContent = isExpanded 
                ? '👆 Нажмите, чтобы свернуть' 
                : '👆 Нажмите, чтобы развернуть подробности';
        }
        
        // Обновляем состояние в данных
        const license = this.currentLicenses.find(l => l.id == licenseId);
        if (license) {
            license.expanded = isExpanded;
        }
    },
    
    // Копирование названия лицензии
    async copyLicenseName(name, btn) {
        const success = await Utils.copyToClipboard(name);
        
        if (success) {
            const originalText = btn.textContent;
            btn.textContent = '✅ Скопировано!';
            btn.classList.add('copied');
            Utils.showToast(`📋 "${name}" скопировано`, 'success');
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('copied');
            }, 2000);
        } else {
            Utils.showToast('❌ Не удалось скопировать', 'error');
        }
    },
    
    // Обновление счётчика лицензий
    updateStats(count, total) {
        const statsCount = document.getElementById('statsCount');
        const statsLabel = document.getElementById('statsLabel');
        
        if (statsCount) {
            statsCount.textContent = count;
        }
        if (statsLabel) {
            statsLabel.textContent = Utils.getNumeral(count, 'лицензия', 'лицензии', 'лицензий');
        }
    },
    
    // Показать скелетон загрузки
    showSkeleton() {
        const grid = document.getElementById('cardsGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="loading-skeleton">
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                </div>
            `;
        }
    },
    
    // Показать ошибку загрузки
    showError(message) {
        const grid = document.getElementById('cardsGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1; text-align:center; padding:60px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <h3 style="color: rgba(255,255,255,0.7);">Ошибка загрузки</h3>
                    <p style="color: rgba(255,255,255,0.4); margin-top: 8px;">${Utils.escapeHtml(message)}</p>
                    <button class="btn-primary" style="margin-top: 20px;" onclick="location.reload()">🔄 Обновить страницу</button>
                </div>
            `;
        }
    },
    
    // Отрисовка пагинации
    renderPagination(currentPage, totalPages, hasMore) {
        const wrapper = document.getElementById('loadMoreWrapper');
        const btn = document.getElementById('loadMoreBtn');
        
        if (!wrapper) return;
        
        if (hasMore && totalPages > 0 && currentPage < totalPages - 1) {
            wrapper.style.display = 'block';
            if (btn) {
                btn.disabled = false;
                btn.textContent = '📥 Загрузить ещё';
            }
        } else if (hasMore && currentPage === 0 && totalPages === 0) {
            // Первая загрузка, показываем кнопку
            wrapper.style.display = 'block';
        } else {
            wrapper.style.display = 'none';
        }
    },
    
    // Прикрепление событий к карточкам (для восстановления после перерисовки)
    attachCardEvents() {
        // События уже привязаны через onclick в HTML
        // Этот метод может быть использован для дополнительных обработчиков
    },
    
    // Очистка кэша рендера
    clear() {
        this.currentLicenses = [];
    }
};

// Глобальный доступ
window.Render = Render;