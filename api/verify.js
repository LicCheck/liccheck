// api/verify.js - проверка JWT токена (GET /api/auth/verify)

const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
    // Разрешаем только GET запросы
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Метод не разрешён' });
    }
    
    try {
        // Получаем токен из заголовка Authorization
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                valid: false, 
                error: 'Токен не предоставлен' 
            });
        }
        
        const token = authHeader.split(' ')[1];
        
        // Проверяем токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Токен валиден
        return res.status(200).json({
            valid: true,
            username: decoded.username,
            role: decoded.role,
            exp: decoded.exp
        });
        
    } catch (error) {
        // Обрабатываем разные ошибки JWT
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                valid: false, 
                error: 'Токен истёк. Войдите заново.' 
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                valid: false, 
                error: 'Неверный токен' 
            });
        }
        
        console.error('Verify error:', error);
        return res.status(500).json({ 
            valid: false, 
            error: 'Внутренняя ошибка сервера' 
        });
    }
};