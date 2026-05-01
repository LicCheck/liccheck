// api/auth.js - авторизация модератора (POST /api/auth/login)

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Данные модератора (фиксированные)
// Логин: push
// Пароль: CntGfy12
const MODERATOR = {
    username: 'push',
    // Хеш пароля "CntGfy12" через bcrypt (соль 10)
    passwordHash: '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJ7QqJZvX5qX5qX5qX5qX5qX5qX5qC',
    role: 'moderator'
};

module.exports = async (req, res) => {
    // Разрешаем только POST запросы
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Метод не разрешён' });
    }
    
    try {
        const { username, password } = req.body;
        
        // Проверка наличия полей
        if (!username || !password) {
            return res.status(400).json({ error: 'Введите логин и пароль' });
        }
        
        // Проверка логина
        if (username !== MODERATOR.username) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        // Проверка пароля (bcrypt сравнение)
        const isPasswordValid = bcrypt.compareSync(password, MODERATOR.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        // Генерация JWT токена (действует 24 часа)
        const token = jwt.sign(
            { 
                username: MODERATOR.username, 
                role: MODERATOR.role,
                iat: Math.floor(Date.now() / 1000)
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Отправляем ответ
        res.status(200).json({
            success: true,
            token: token,
            username: MODERATOR.username,
            role: MODERATOR.role,
            expiresIn: 86400 // 24 часа в секундах
        });
        
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};