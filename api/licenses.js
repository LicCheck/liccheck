// api/licenses.js - получение списка лицензий (GET /api/licenses)

const { getAllLicenses } = require('../lib/github');

module.exports = async (req, res) => {
    // Разрешаем только GET запросы
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Метод не разрешён' });
    }
    
    try {
        // Получаем параметры запроса
        const { search, color, limit = 50, offset = 0 } = req.query;
        
        // Получаем все лицензии из базы
        let licenses = await getAllLicenses();
        
        // Фильтрация по цвету
        if (color && color !== 'all') {
            licenses = licenses.filter(lic => lic.color === color);
        }
        
        // Фильтрация по поисковому запросу
        if (search && search.trim()) {
            const searchLower = search.toLowerCase().trim();
            licenses = licenses.filter(lic => 
                lic.name.toLowerCase().includes(searchLower)
            );
        }
        
        // Сортировка по названию
        licenses.sort((a, b) => a.name.localeCompare(b.name));
        
        // Общее количество (до пагинации)
        const total = licenses.length;
        
        // Пагинация
        const start = parseInt(offset);
        const end = start + parseInt(limit);
        const paginatedLicenses = licenses.slice(start, end);
        
        // Возвращаем результат
        res.status(200).json({
            success: true,
            licenses: paginatedLicenses,
            total: total,
            offset: start,
            limit: parseInt(limit),
            hasMore: end < total
        });
        
    } catch (error) {
        console.error('Get licenses error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка загрузки лицензий' 
        });
    }
};