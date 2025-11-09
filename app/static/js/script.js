// Конфигурация API
const API_BASE_URL = 'http://node3.dom4k.ru:9999/api';

// Глобальные переменные
let currentChannel = 'general';
let messages = [];
let users = [];
let socket = null;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    setupEventListeners();
    checkAuthAndLoad();
});

// Инициализация приложения
function initApp() {
    console.log('RuCord initialized');
    
    // Проверяем авторизацию и обновляем интерфейс
    if (Auth.checkAuth()) {
        const username = Auth.getUsername();
        document.getElementById('currentUsername').textContent = username;
        document.querySelector('.user-welcome strong').textContent = username;
        
        // Активируем функционал для авторизованных пользователей
        document.getElementById('messageInput').disabled = false;
        document.getElementById('messageInput').placeholder = 'Написать сообщение в #общий';
        document.getElementById('sendMessageBtn').disabled = false;
    }
}

// Проверка авторизации и загрузка данных
function checkAuthAndLoad() {
    if (Auth.checkAuth()) {
        loadChannelMessages(currentChannel);
        loadOnlineUsers();
        initWebSocket();
    } else {
        // Показываем сообщение для гостей
        showGuestMessage();
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Переключение серверов
    const serverItems = document.querySelectorAll('.server-item:not(.add-server)');
    serverItems.forEach(item => {
        item.addEventListener('click', function() {
            if (!Auth.checkAuth()) {
                showNotification('Для переключения серверов необходимо войти в систему', 'warning');
                return;
            }
            
            serverItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            const server = this.dataset.server;
            loadServerData(server);
        });
    });
    
    // Переключение каналов
    const channelItems = document.querySelectorAll('.channel-item:not(.voice)');
    channelItems.forEach(item => {
        item.addEventListener('click', function() {
            if (!Auth.checkAuth()) {
                showNotification('Для переключения каналов необходимо войти в систему', 'warning');
                return;
            }
            
            channelItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            currentChannel = this.textContent.replace('# ', '');
            document.getElementById('currentChannel').textContent = currentChannel;
            loadChannelMessages(currentChannel);
        });
    });
    
    // Голосовые каналы
    const voiceChannels = document.querySelectorAll('.channel-item.voice');
    voiceChannels.forEach(channel => {
        channel.addEventListener('click', function() {
            if (!Auth.checkAuth()) {
                showNotification('Для участия в голосовых каналах необходимо войти в систему', 'warning');
                return;
            }
            document.getElementById('voiceCallModal').style.display = 'block';
        });
    });
    
    // Отправка сообщения
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Голосовой звонок
    document.getElementById('voiceCallBtn').addEventListener('click', function() {
        if (!Auth.checkAuth()) {
            showNotification('Для звонков необходимо войти в систему', 'warning');
            return;
        }
        document.getElementById('voiceCallModal').style.display = 'block';
    });
    
    document.getElementById('endCallBtn').addEventListener('click', function() {
        document.getElementById('voiceCallModal').style.display = 'none';
        showNotification('Звонок завершен');
    });

    // Кнопка выхода
    const logoutBtn = document.querySelector('.control-btn[href="/login"]');
    if (logoutBtn && Auth.checkAuth()) {
        logoutBtn.textContent = '🚪';
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            Auth.handleLogout();
        });
    }
}

// Загрузка сообщений канала
async function loadChannelMessages(channel) {
    try {
        if (!Auth.checkAuth()) {
            showGuestMessage();
            return;
        }

        const token = Auth.getToken();
        const response = await fetch(`${API_BASE_URL}/messages/${channel}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            messages = await response.json();
            renderMessages();
        } else if (response.status === 401) {
            // Токен невалидный, разлогиниваем
            Auth.handleLogout();
        }
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
        // Заглушка с демо-сообщениями
        if (Auth.checkAuth()) {
            messages = [
                {
                    id: 1,
                    username: Auth.getUsername(),
                    content: 'Добро пожаловать в RuCord! Это ваш первый вход.',
                    timestamp: new Date().toISOString(),
                    userId: 'current'
                }
            ];
            renderMessages();
        }
    }
}

// Отправка сообщения
async function sendMessage() {
    if (!Auth.checkAuth()) {
        showNotification('Для отправки сообщений необходимо войти в систему', 'warning');
        return;
    }

    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content) return;
    
    const message = {
        content: content,
        channel: currentChannel
    };
    
    try {
        const token = Auth.getToken();
        const response = await fetch(`${API_BASE_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(message)
        });
        
        if (response.ok) {
            input.value = '';
            // Сообщение будет добавлено через WebSocket или обновление списка
            loadChannelMessages(currentChannel);
        } else if (response.status === 401) {
            Auth.handleLogout();
        } else {
            throw new Error('Ошибка отправки сообщения');
        }
    } catch (error) {
        showNotification('Ошибка отправки: ' + error.message, 'error');
    }
}

// Загрузка онлайн пользователей
async function loadOnlineUsers() {
    try {
        if (!Auth.checkAuth()) return;

        const token = Auth.getToken();
        const response = await fetch(`${API_BASE_URL}/users/online`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            users = await response.json();
            renderOnlineUsers();
        }
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
    }
}

// Рендер сообщений
function renderMessages() {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="no-messages">
                <p>Пока нет сообщений в этом канале. Будьте первым!</p>
            </div>
        `;
        return;
    }
    
    messages.forEach(message => {
        const isOwn = message.username === Auth.getUsername();
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isOwn ? 'own-message' : ''}`;
        messageElement.innerHTML = `
            <div class="avatar ${isOwn ? 'idle' : 'online'}"></div>
            <div class="message-content">
                <div class="message-header">
                    <span class="username">${message.username}</span>
                    <span class="timestamp">${formatTime(message.timestamp)}</span>
                </div>
                <div class="message-text">${message.content}</div>
            </div>
        `;
        container.appendChild(messageElement);
    });
    
    container.scrollTop = container.scrollHeight;
}

// Показать сообщение для гостей
function showGuestMessage() {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = `
        <div class="guest-message">
            <div class="message">
                <div class="avatar online"></div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="username">Система</span>
                        <span class="timestamp">Сейчас</span>
                    </div>
                    <div class="message-text">
                        <p>Добро пожаловать в RuCord! Для полного доступа к чату необходимо <a href="/login" class="neon-link">войти в систему</a>.</p>
                        <p>Тестовые данные: <strong>dom4k</strong> / <strong>1234</strong></p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Рендер онлайн пользователей
function renderOnlineUsers() {
    const container = document.getElementById('membersList');
    const onlineCount = users.filter(user => user.status === 'online').length;
    
    document.getElementById('onlineCount').textContent = onlineCount + 1; // +1 текущий пользователь
    
    container.innerHTML = '';
    
    // Добавляем текущего пользователя
    const currentUserElement = document.createElement('div');
    currentUserElement.className = 'member';
    currentUserElement.innerHTML = `
        <div class="avatar idle"></div>
        <span class="member-name">${Auth.getUsername()} (Вы)</span>
    `;
    container.appendChild(currentUserElement);
    
    // Добавляем остальных пользователей
    users.forEach(user => {
        if (user.username !== Auth.getUsername()) {
            const memberElement = document.createElement('div');
            memberElement.className = 'member';
            memberElement.innerHTML = `
                <div class="avatar ${user.status}"></div>
                <span class="member-name">${user.username}</span>
            `;
            container.appendChild(memberElement);
        }
    });
}

// Форматирование времени
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('ru-RU');
}

// Показать уведомление
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notificationText');
    
    if (!notification || !text) return;
    
    text.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 300);
    }, 4000);
}

// Инициализация WebSocket
function initWebSocket() {
    if (!Auth.checkAuth()) return;

    const token = Auth.getToken();
    // WebSocket подключение будет здесь
    console.log('WebSocket connection initialized with token:', token);
}

// Загрузка данных сервера
async function loadServerData(server) {
    showNotification(`Загрузка сервера: ${server}`);
    // Здесь будет загрузка данных конкретного сервера
}

// Закрытие модальных окон
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
    
    if (e.target.classList.contains('close')) {
        e.target.closest('.modal').style.display = 'none';
    }
});