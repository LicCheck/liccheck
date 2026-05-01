// Загрузка запросов в панель модератора
async function loadPendingRequests() {
    const token = localStorage.getItem('moderatorToken');
    
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    
    showLoader(true);
    
    try {
        const response = await fetch('/api/admin/requests', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (!data.success) {
            if (response.status === 401) {
                localStorage.removeItem('moderatorToken');
                window.location.href = '/login.html';
            }
            showToast(data.error, 'error');
            return;
        }
        
        renderRequestsList(data.requests);
        updateRequestsCount(data.total);
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка загрузки запросов', 'error');
    } finally {
        showLoader(false);
    }
}