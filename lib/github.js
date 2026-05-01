// lib/github.js - работа с GitHub API для обновления licenses.json

const https = require('https');

// Конфигурация из переменных окружения
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // формат: "username/repo"
const GITHUB_API_URL = 'https://api.github.com';
const FILE_PATH = 'public/data/licenses.json';

/**
 * Получение текущего содержимого licenses.json из репозитория
 */
async function getCurrentLicensesFile() {
    const url = `${GITHUB_API_URL}/repos/${GITHUB_REPO}/contents/${FILE_PATH}`;
    
    const options = {
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'User-Agent': 'LicCheck-App',
            'Accept': 'application/vnd.github.v3+json'
        }
    };
    
    return new Promise((resolve, reject) => {
        https.get(url, options, (res) => {
            let data = '';
            
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(data);
                        const content = Buffer.from(parsed.content, 'base64').toString('utf-8');
                        resolve({
                            sha: parsed.sha,
                            content: JSON.parse(content)
                        });
                    } catch (err) {
                        reject(new Error(`Ошибка парсинга: ${err.message}`));
                    }
                } else if (res.statusCode === 404) {
                    reject(new Error('Файл licenses.json не найден'));
                } else {
                    reject(new Error(`GitHub API error: ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

/**
 * Обновление licenses.json в репозитории
 * @param {Object} newContent - новое содержимое файла
 * @param {string} currentSha - SHA текущей версии (для предотвращения конфликтов)
 */
async function updateLicensesFile(newContent, currentSha) {
    const url = `${GITHUB_API_URL}/repos/${GITHUB_REPO}/contents/${FILE_PATH}`;
    
    const contentBase64 = Buffer.from(JSON.stringify(newContent, null, 2)).toString('base64');
    
    const postData = JSON.stringify({
        message: `Обновление лицензий от модератора ${new Date().toISOString()}`,
        content: contentBase64,
        sha: currentSha,
        branch: 'main'
    });
    
    const options = {
        method: 'PUT',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'User-Agent': 'LicCheck-App',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    resolve({ success: true, message: 'Файл обновлён' });
                } else {
                    try {
                        const error = JSON.parse(data);
                        reject(new Error(error.message || `Ошибка: ${res.statusCode}`));
                    } catch {
                        reject(new Error(`Ошибка GitHub API: ${res.statusCode}`));
                    }
                }
            });
        });
        
        req.write(postData);
        req.on('error', reject);
        req.end();
    });
}

/**
 * Получение всех лицензий из базы
 */
async function getAllLicenses() {
    try {
        const { content } = await getCurrentLicensesFile();
        return content.licenses || [];
    } catch (error) {
        console.error('Ошибка получения лицензий:', error);
        return [];
    }
}

/**
 * Получение лицензии по ID
 */
async function getLicenseById(id) {
    const licenses = await getAllLicenses();
    return licenses.find(l => l.id === parseInt(id));
}

/**
 * Добавление новой лицензии в базу
 */
async function addLicense(licenseData) {
    const { content, sha } = await getCurrentLicensesFile();
    const licenses = content.licenses || [];
    
    // Генерируем новый ID
    const newId = licenses.length > 0 ? Math.max(...licenses.map(l => l.id)) + 1 : 1;
    
    const newLicense = {
        id: newId,
        ...licenseData,
        isBase: false,
        createdAt: new Date().toISOString()
    };
    
    licenses.push(newLicense);
    
    const newContent = { ...content, licenses };
    await updateLicensesFile(newContent, sha);
    
    return newLicense;
}

/**
 * Обновление существующей лицензии
 */
async function updateLicense(id, updatedData) {
    const { content, sha } = await getCurrentLicensesFile();
    const licenses = content.licenses || [];
    
    const index = licenses.findIndex(l => l.id === parseInt(id));
    if (index === -1) {
        throw new Error('Лицензия не найдена');
    }
    
    // Нельзя менять базовые лицензии
    if (licenses[index].isBase) {
        throw new Error('Нельзя редактировать базовую лицензию');
    }
    
    licenses[index] = {
        ...licenses[index],
        ...updatedData,
        updatedAt: new Date().toISOString()
    };
    
    const newContent = { ...content, licenses };
    await updateLicensesFile(newContent, sha);
    
    return licenses[index];
}

/**
 * Удаление лицензии
 */
async function deleteLicense(id) {
    const { content, sha } = await getCurrentLicensesFile();
    const licenses = content.licenses || [];
    
    const index = licenses.findIndex(l => l.id === parseInt(id));
    if (index === -1) {
        throw new Error('Лицензия не найдена');
    }
    
    // Нельзя удалять базовые лицензии
    if (licenses[index].isBase) {
        throw new Error('Нельзя удалить базовую лицензию');
    }
    
    const deleted = licenses.splice(index, 1)[0];
    
    const newContent = { ...content, licenses };
    await updateLicensesFile(newContent, sha);
    
    return deleted;
}

/**
 * Одобрение запроса на добавление лицензии
 */
async function approveRequest(requestId, reviewedBy) {
    const { content, sha } = await getCurrentLicensesFile();
    const pendingRequests = content.pendingRequests || [];
    
    const requestIndex = pendingRequests.findIndex(r => r.id === parseInt(requestId));
    if (requestIndex === -1) {
        throw new Error('Запрос не найден');
    }
    
    const request = pendingRequests[requestIndex];
    
    // Добавляем лицензию в основной список
    const licenses = content.licenses || [];
    const newId = licenses.length > 0 ? Math.max(...licenses.map(l => l.id)) + 1 : 1;
    
    const newLicense = {
        id: newId,
        name: request.name,
        color: request.color,
        canDo: request.canDo,
        cannotDo: request.cannotDo,
        mustDo: request.mustDo,
        isBase: false,
        approvedBy: reviewedBy,
        approvedAt: new Date().toISOString(),
        createdAt: request.submittedAt
    };
    
    licenses.push(newLicense);
    
    // Удаляем запрос из pending
    pendingRequests.splice(requestIndex, 1);
    
    const newContent = { ...content, licenses, pendingRequests };
    await updateLicensesFile(newContent, sha);
    
    return newLicense;
}

/**
 * Отклонение запроса на добавление лицензии
 */
async function rejectRequest(requestId, reviewedBy, reason) {
    const { content, sha } = await getCurrentLicensesFile();
    const pendingRequests = content.pendingRequests || [];
    
    const requestIndex = pendingRequests.findIndex(r => r.id === parseInt(requestId));
    if (requestIndex === -1) {
        throw new Error('Запрос не найден');
    }
    
    const rejectedRequest = pendingRequests[requestIndex];
    rejectedRequest.status = 'rejected';
    rejectedRequest.reviewedBy = reviewedBy;
    rejectedRequest.reviewedAt = new Date().toISOString();
    rejectedRequest.rejectionReason = reason || 'Не указана';
    
    // Удаляем из pending (или можно переместить в rejectedRequests)
    pendingRequests.splice(requestIndex, 1);
    
    const newContent = { ...content, pendingRequests };
    await updateLicensesFile(newContent, sha);
    
    return rejectedRequest;
}

/**
 * Получение всех запросов на добавление
 */
async function getPendingRequests() {
    try {
        const { content } = await getCurrentLicensesFile();
        return content.pendingRequests || [];
    } catch (error) {
        console.error('Ошибка получения запросов:', error);
        return [];
    }
}

/**
 * Добавление запроса на добавление лицензии (от пользователя)
 */
async function addPendingRequest(requestData) {
    const { content, sha } = await getCurrentLicensesFile();
    const pendingRequests = content.pendingRequests || [];
    
    const newId = pendingRequests.length > 0 ? Math.max(...pendingRequests.map(r => r.id)) + 1 : 1;
    
    const newRequest = {
        id: newId,
        ...requestData,
        status: 'pending',
        submittedAt: new Date().toISOString()
    };
    
    pendingRequests.push(newRequest);
    
    const newContent = { ...content, pendingRequests };
    await updateLicensesFile(newContent, sha);
    
    return newRequest;
}

module.exports = {
    getCurrentLicensesFile,
    updateLicensesFile,
    getAllLicenses,
    getLicenseById,
    addLicense,
    updateLicense,
    deleteLicense,
    approveRequest,
    rejectRequest,
    getPendingRequests,
    addPendingRequest
};