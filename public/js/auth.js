// public/js/auth.js - авторизация на клиенте

const Auth = {
    // Ключ для хранения токена в localStorage
    TOKEN_KEY: 'moderatorToken',
    USERNAME_KEY: 'moderatorUsername',
    ROLE_KEY: 'moderatorRole',

    // Сохранить токен после входа
    setToken(token, username, role) {
        if (token) {
            localStorage.setItem(this.TOKEN_KEY, token);
        }
        if (username) {
            localStorage.setItem(this.USERNAME_KEY, username);
        }
        if (role) {
            localStorage.setItem(this.ROLE_KEY, role);
        }
    },

    // Получить токен
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    // Получить имя пользователя
    getUsername() {
        return localStorage.getItem(this.USERNAME_KEY);
    },

    // Получить роль
    getRole() {
        return localStorage.getItem(this.ROLE_KEY);
    },

    // Проверить, авторизован ли пользователь
    isAuthenticated() {
        const token = this.getToken();
        return !!token;
    },

    // Проверить валидность токена на сервере
    async verifyToken() {
        const token = this.getToken();
        
        if (!token) {
            return false;
        }
        
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.valid) {
                // Обновляем информацию о пользователе
                if (data.username) {
                    localStorage.setItem(this.USERNAME_KEY, data.username);
                }
                if (data.role) {
                    localStorage.setItem(this.ROLE_KEY, data.role);
                }
                return true;
            } else {
                this.clearToken();
                return false;
            }
        } catch (error) {
            console.error('Token verification error:', error);
            return false;
        }
    },

    // Очистить токен (выход)
    clearToken() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USERNAME_KEY);
        localStorage.removeItem(this.ROLE_KEY);
    },

    // Выход из системы
    logout(redirectUrl = '/login.html') {
        this.clearToken();
        if (redirectUrl) {
            window.location.href = redirectUrl;
        }
    },

    // Получить заголовки для авторизованных запросов
    getAuthHeaders() {
        const token = this.getToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    },

    // Авторизованный запрос к API
    async fetchAuth(url, options = {}) {
        const token = this.getToken();
        
        if (!token) {
            throw new Error('Не авторизован');
        }
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        // Если токен недействителен, очищаем его
        if (response.status === 401) {
            this.clearToken();
            throw new Error('Сессия истекла');
        }
        
        return response;
    },

    // Вход в систему
    async login(username, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.setToken(data.token, data.username, data.role);
                return { success: true, data };
            } else {
                return { success: false, error: data.error || 'Ошибка входа' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Ошибка соединения' };
        }
    },

    // Защита страницы админки
    async protectAdminPage() {
        const isValid = await this.verifyToken();
        
        if (!isValid) {
            this.logout('/login.html');
            return false;
        }
        
        return true;
    },

    // Получить роль с преобразованием
    getRoleDisplay() {
        const role = this.getRole();
        switch(role) {
            case 'admin': return 'Администратор';
            case 'moderator': return 'Модератор';
            default: return 'Пользователь';
        }
    }
};

// Глобальный доступ
window.Auth = Auth;