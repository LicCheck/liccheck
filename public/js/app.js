// public/js/app.js - основная логика пользовательской части

const App = {
    // Состояние
    currentLicenses: [],
    currentFilter: 'all',
    currentSearch: '',
    currentPage: 0,
    limit: 20,
    total: 0,
    hasMore: true,
    isLoading: false,
    
    // Инициализация
    async init() {
        // Проверяем, не на странице ли админки
        if (window.location.pathname.includes('/admin.html')) return;
        
        // Загружаем первую страницу
        await this.loadLicenses();
        
        // Настраиваем обработчики
        this.setupEventListeners();
        
        // Проверяем токен для кнопки модератора (не перенаправляем, просто для отображения)
        // Кнопка всегда видна, редирект на login при клике без токена
    },
    
    // Загрузка лицензий с API
    async loadLicenses(reset = true) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        if (reset) {
            this.currentPage = 0;
            this.currentLicenses = [];
            Render.showSkeleton();
        }
        
        try {
            const offset = this.currentPage * this.limit;
            let url = `/api/licenses?limit=${this.limit}&offset=${offset}`;
            
            if (this.currentSearch && this.currentSearch.trim()) {
                url += `&search=${encodeURIComponent(this.currentSearch)}`;
            }
            if (this.currentFilter !== 'all') {
                url += `&color=${this.currentFilter}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                if (reset) {
                    this.currentLicenses = data.licenses;
                } else {
                    this.currentLicenses = [...this.currentLicenses, ...data.licenses];
                }
                
                this.total = data.total;
                this.hasMore = data.hasMore;
                
                Render.renderCards(this.currentLicenses);
                Render.updateStats(this.currentLicenses.length, this.total);
                Render.renderPagination(this.currentPage, Math.ceil(this.total / this.limit), this.hasMore);
            } else {
                Render.showError(data.error || 'Ошибка загрузки');
            }
        } catch (error) {
            console.error('Load error:', error);
            Render.showError('Не удалось загрузить лицензии');
        } finally {
            this.isLoading = false;
        }
    },
    
    // Загрузить ещё
    async loadMore() {
        if (this.isLoading || !this.hasMore) return;
        
        this.currentPage++;
        await this.loadLicenses(false);
    },
    
    // Поиск
    async search(query) {
        this.currentSearch = query;
        this.currentPage = 0;
        await this.loadLicenses(true);
    },
    
    // Фильтр по цвету
    async filterByColor(color) {
        this.currentFilter = color;
        this.currentPage = 0;
        await this.loadLicenses(true);
    },
    
    // Обработчик ввода поиска (с дебаунсом)
    handleSearchInput: Utils.debounce(async function() {
        const input = document.getElementById('searchInput');
        const query = input ? input.value : '';
        await App.search(query);
        
        // Показать/скрыть кнопку очистки
        const clearBtn = document.getElementById('searchClear');
        if (clearBtn) {
            clearBtn.classList.toggle('visible', query.length > 0);
        }
    }, 500),
    
    // Очистка поиска
    async clearSearch() {
        const input = document.getElementById('searchInput');
        if (input) {
            input.value = '';
        }
        await this.search('');
        
        const clearBtn = document.getElementById('searchClear');
        if (clearBtn) {
            clearBtn.classList.remove('visible');
        }
    },
    
    // Установка фильтра
    setFilter(color, element) {
        // Обновляем активный класс
        document.querySelectorAll('.chip').forEach(chip => {
            chip.classList.remove('active');
        });
        element.classList.add('active');
        
        this.filterByColor(color);
    },
    
    // Настройка обработчиков событий
    setupEventListeners() {
        // Поиск
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.handleSearchInput());
        }
        
        // Кнопка загрузить ещё
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMore());
        }
        
        // Модалка открывается через onclick в HTML
    },
    
    // Открыть модальное окно
    openAddModal() {
        const modal = document.getElementById('licenseModal');
        if (modal) {
            modal.style.display = 'block';
        }
    },
    
    // Закрыть модальное окно
    closeModal() {
        const modal = document.getElementById('licenseModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
};

// Глобальные функции для onclick
window.handleSearchInput = () => App.handleSearchInput();
window.clearSearch = () => App.clearSearch();
window.setFilter = (color, element) => App.setFilter(color, element);
window.loadMore = () => App.loadMore();
window.openAddModal = () => App.openAddModal();
window.closeModal = () => App.closeModal();

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});