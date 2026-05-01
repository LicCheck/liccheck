// api/admin-licenses.js - редактирование и удаление лицензий (PUT/DELETE /api/admin/licenses/:id)
// Только для авторизованных модераторов

const jwt = require('jsonwebtoken');
const { updateLicense, deleteLicense, getLicenseById } = require('../../lib/github');

module.exports = async (req, res) => {
    // Получаем токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false, 
            error: 'Токен не предоставлен' 
        });
    }
    
    const token = authHeader.split(' ')[1];
    const method = req.method;
    
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
        
        // Получаем ID лицензии из URL
        const id = req.query.id;
        
        if (!id) {
            return res.status(400).json({ 
                success: false, 
                error: 'ID лицензии не указан' 
            });
        }
        
        // ========== PUT - ОБНОВЛЕНИЕ ЛИЦЕНЗИИ ==========
        if (method === 'PUT') {
            const { name, color, canDo, cannotDo, mustDo } = req.body;
            
            // Валидация
            if (!name || !name.trim()) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Название лицензии обязательно' 
                });
            }
            
            if (!color || !['green', 'yellow', 'red'].includes(color)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Укажите корректный цвет светофора' 
                });
            }
            
            // Обновляем лицензию
            const updatedLicense = await updateLicense(id, {
                name: name.trim(),
                color: color,
                canDo: canDo || [],
                cannotDo: cannotDo || [],
                mustDo: mustDo || [],
                updatedBy: decoded.username,
                updatedAt: new Date().toISOString()
            });
            
            return res.status(200).json({
                success: true,
                message: 'Лицензия обновлена',
                license: updatedLicense
            });
        }
        
        // ========== DELETE - УДАЛЕНИЕ ЛИЦЕНЗИИ ==========
        if (method === 'DELETE') {
            // Проверяем, существует ли лицензия
            const license = await getLicenseById(id);
            
            if (!license) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Лицензия не найдена' 
                });
            }
            
            // Запрещаем удаление базовых лицензий
            if (license.isBase) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Нельзя удалить базовую лицензию' 
                });
            }
            
            // Удаляем лицензию
            const deletedLicense = await deleteLicense(id);
            
            return res.status(200).json({
                success: true,
                message: 'Лицензия удалена',
                license: deletedLicense
            });
        }
        
        // Если метод не поддерживается
        return res.status(405).json({ 
            success: false, 
            error: 'Метод не разрешён. Используйте PUT или DELETE.' 
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
        
        console.error('Admin licenses error:', error);
        
        // Обработка ошибки "лицензия не найдена"
        if (error.message === 'Лицензия не найдена') {
            return res.status(404).json({ 
                success: false, 
                error: 'Лицензия не найдена' 
            });
        }
        
        // Обработка ошибки "нельзя редактировать базовую"
        if (error.message === 'Нельзя редактировать базовую лицензию') {
            return res.status(403).json({ 
                success: false, 
                error: 'Нельзя редактировать базовую лицензию' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Внутренняя ошибка сервера' 
        });
    }
};