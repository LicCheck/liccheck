// public/js/utils.js - вспомогательные функции

const Utils = {
    // Экранирование HTML (защита от XSS)
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // Склонение числительных
    getNumeral(n, one, two, five) {
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return two;
        return five;
    },

    // Показ уведомления (тост)
    showToast(message, type = '') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = 'toast ' + type + ' show';
        
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    },

    // Дебаунс для поиска
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Задержка (промис)
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Генерация уникального ID
    generateId() {
        return Date.now() + Math.random() * 10000;
    },

    // Копирование в буфер обмена
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Ошибка копирования:', err);
            return false;
        }
    },

    // Форматирование даты
    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Получить цветовую иконку
    getColorIcon(color) {
        switch(color) {
            case 'green': return '🟢';
            case 'yellow': return '🟡';
            case 'red': return '🔴';
            default: return '⚪';
        }
    },

    // Получить класс цвета
    getColorClass(color) {
        switch(color) {
            case 'green': return 'green';
            case 'yellow': return 'yellow';
            case 'red': return 'red';
            default: return '';
        }
    },

    // Обновить счётчик на странице
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

    // Показать/скрыть скелетон загрузки
    showSkeleton(show) {
        const grid = document.getElementById('cardsGrid');
        if (!grid) return;
        
        if (show && (!grid.children.length || grid.children[0].classList?.contains('skeleton-card') === false)) {
            grid.innerHTML = `
                <div class="loading-skeleton">
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                </div>
            `;
        } else if (!show && grid.children[0]?.classList?.contains('skeleton-card')) {
            grid.innerHTML = '';
        }
    },

    // Показать пустое состояние
    showEmpty(message = 'Ничего не найдено') {
        const grid = document.getElementById('cardsGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1; text-align:center; padding:60px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
                    <h3 style="color: rgba(255,255,255,0.7);">${message}</h3>
                    <p style="color: rgba(255,255,255,0.4); margin-top: 8px;">Попробуйте изменить поисковый запрос</p>
                </div>
            `;
        }
    },

    // Получить параметры из URL
    getUrlParams() {
        const params = {};
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        for (const [key, value] of urlParams.entries()) {
            params[key] = value;
        }
        return params;
    },

    // Обновить URL без перезагрузки
    updateUrlParams(params) {
        const url = new URL(window.location.href);
        for (const [key, value] of Object.entries(params)) {
            if (value) {
                url.searchParams.set(key, value);
            } else {
                url.searchParams.delete(key);
            }
        }
        window.history.pushState({}, '', url);
    },

    // Валидация email
    isValidEmail(email) {
        const re = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
        return re.test(email);
    },

    // Троттлинг (ограничение частоты вызовов)
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Глобальный доступ
window.Utils = Utils;