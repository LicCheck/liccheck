// api/user-license.js - добавление запроса на лицензию от пользователя (POST /api/user/license)

const { addPendingRequest } = require('../lib/github');

module.exports = async (req, res) => {
    // Разрешаем только POST запросы
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Метод не разрешён' });
    }
    
    try {
        const { name, color, canDo, cannotDo, mustDo, submittedBy } = req.body;
        
        // Валидация обязательных полей
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
        
        // Ограничение длины названия
        if (name.length > 100) {
            return res.status(400).json({ 
                success: false, 
                error: 'Название лицензии не должно превышать 100 символов' 
            });
        }
        
        // Подготовка данных для запроса
        const requestData = {
            name: name.trim(),
            color: color,
            canDo: canDo || [],
            cannotDo: cannotDo || [],
            mustDo: mustDo || [],
            submittedBy: submittedBy || 'anonymous',
            type: 'user_request'
        };
        
        // Добавляем запрос в очередь модерации
        const newRequest = await addPendingRequest(requestData);
        
        res.status(201).json({
            success: true,
            message: 'Ваша лицензия отправлена на модерацию',
            request: {
                id: newRequest.id,
                name: newRequest.name,
                status: 'pending',
                submittedAt: newRequest.submittedAt
            }
        });
        
    } catch (error) {
        console.error('Add user license error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при отправке запроса. Попробуйте позже.' 
        });
    }
};