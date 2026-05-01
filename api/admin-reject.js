// api/admin-reject.js - отклонение запроса на добавление лицензии (POST /api/admin/reject/:id)
// Только для авторизованных модераторов

const jwt = require('jsonwebtoken');
const { rejectRequest } = require('../../lib/github');

module.exports = async (req, res) => {
    // Разрешаем только POST запросы
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Метод не разрешён' });
    }
    
    // Получаем токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false, 
            error: 'Токен не предоставлен' 
        });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        // Проверяем JWT токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Проверяем роль (только модератор или администратор)
        if (decoded.role !== 'moderator' && decoded.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: 'Доступ запрещён. Требуются права модератора.' 
            });
        }
        
        // Получаем ID запроса из URL
        const id = req.query.id || req.body.id;
        
        if (!id) {
            return res.status(400).json({ 
                success: false, 
                error: 'ID запроса не указан' 
            });
        }
        
        // Получаем причину отклонения (опционально)
        const reason = req.body.reason || 'Не указана';
        
        // Отклоняем запрос
        const rejectedRequest = await rejectRequest(id, decoded.username, reason);
        
        res.status(200).json({
            success: true,
            message: 'Запрос отклонён',
            request: rejectedRequest
        });
        
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                error: 'Токен истёк. Войдите заново.' 
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                error: 'Неверный токен' 
            });
        }
        
        console.error('Reject request error:', error);
        
        // Обработка ошибки "запрос не найден"
        if (error.message === 'Запрос не найден') {
            return res.status(404).json({ 
                success: false, 
                error: 'Запрос не найден' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при отклонении запроса' 
        });
    }
};