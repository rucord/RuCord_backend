// Конфигурация API
const API_BASE_URL = 'http://localhost:5000/api';

// Глобальные переменные
let currentUser = null;
let currentChannel = 'general';
let messages = [];
let users = [];

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    setupEventListeners();
    checkAuthStatus();
});

// Инициализация приложения
function initApp() {
    console.log('RuCord initialized');
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Модальные окна авторизации
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const closeButtons = document.querySelectorAll('.close');
    
    // Показываем окно входа при загрузке
    loginModal.style.display = 'block';
    
    // Переключение между окнами входа и регистрации
    showRegister.addEventListener('click', function(e) {
        e.preventDefault();
        loginModal.style.display = 'none';
        registerModal.style.display = 'block';
    });
    
    showLogin.addEventListener('click', function(e) {
        e.preventDefault();
        registerModal.style.display = 'none';
        loginModal.style.display = 'block';
    });
    
    // Закрытие модальных окон
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            loginModal.style.display = 'none';
            registerModal.style.display = 'none';
            document.getElementById('voiceCallModal').style.display = 'none';
        });
    });
    
    // Закрытие при клике вне окна
    window.addEventListener('click', function(e) {
        if (e.target === loginModal) loginModal.style.display = 'none';
        if (e.target === registerModal) registerModal.style.display = 'none';
        if (e.target === document.getElementById('voiceCallModal')) {
            document.getElementById('voiceCallModal').style.display = 'none';
        }
    });
    
    // Обработка форм
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Переключение серверов
    const serverItems = document.querySelectorAll('.server-item:not(.add-server)');
    serverItems.forEach(item => {
        item.addEventListener('click', function() {
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
        document.getElementById('voiceCallModal').style.display = 'block';
    });
    
    document.getElementById('endCallBtn').addEventListener('click', function() {
        document.getElementById('voiceCallModal').style.display = 'none';
        showNotification('Звонок завершен');
    });
}

// Обработка входа
async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            currentUser = result.user;
            localStorage.setItem('token', result.token);
            showMainInterface();
            showNotification('Успешный вход!');
        } else {
            throw new Error('Ошибка входа');
        }
    } catch (error) {
        showNotification('Ошибка входа: ' + error.message, 'error');
    }
}

// Обработка регистрации
async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showNotification('Регистрация успешна! Теперь войдите.');
            document.getElementById('registerModal').style.display = 'none';
            document.getElementById('loginModal').style.display = 'block';
        } else {
            throw new Error('Ошибка регистрации');
        }
    } catch (error) {
        showNotification('Ошибка регистрации: ' + error.message, 'error');
    }
}

// Проверка статуса авторизации
async function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                currentUser = await response.json();
                showMainInterface();
            }
        } catch (error) {
            console.log('Требуется вход');
        }
    }
}

// Показать основной интерфейс
function showMainInterface() {
    document.getElementById('authModals').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    document.getElementById('currentUsername').textContent = currentUser.username;
    document.getElementById('currentUserId').textContent = currentUser.id.slice(-4);
    
    // Загрузка начальных данных
    loadChannelMessages(currentChannel);
    loadOnlineUsers();
    
    // Запуск WebSocket соединения
    initWebSocket();
}

// Загрузка сообщений канала
async function loadChannelMessages(channel) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/messages/${channel}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            messages = await response.json();
            renderMessages();
        }
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
        // Заглушка с демо-сообщениями
        messages = [
            {
                id: 1,
                username: 'Алексей',
                content: 'Привет всем! Как дела?',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                userId: 'user2'
            },
            {
                id: 2,
                username: 'Мария',
                content: 'Привет! Всё отлично, только что закончила новый проект ✨',
                timestamp: new Date(Date.now() - 3500000).toISOString(),
                userId: 'user3'
            }
        ];
        renderMessages();
    }
}

// Отправка сообщения
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content) return;
    
    const message = {
        content: content,
        channel: currentChannel,
        timestamp: new Date().toISOString()
    };
    
    try {
        const token = localStorage.getItem('token');
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
            // Сообщение будет добавлено через WebSocket
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
        const token = localStorage.getItem('token');
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
        // Заглушка с демо-пользователями
        users = [
            { id: 'user2', username: 'Алексей', status: 'online' },
            { id: 'user3', username: 'Мария', status: 'online' },
            { id: currentUser.id, username: currentUser.username, status: 'idle' }
        ];
        renderOnlineUsers();
    }
}

// Рендер сообщений
function renderMessages() {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    
    messages.forEach(message => {
        const isOwn = message.userId === currentUser.id;
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

// Рендер онлайн пользователей
function renderOnlineUsers() {
    const container = document.getElementById('membersList');
    const onlineCount = users.filter(user => user.status === 'online').length;
    
    document.getElementById('onlineCount').textContent = onlineCount;
    container.innerHTML = '';
    
    users.forEach(user => {
        const memberElement = document.createElement('div');
        memberElement.className = 'member';
        memberElement.innerHTML = `
            <div class="avatar ${user.status}"></div>
            <span class="member-name">${user.username}</span>
        `;
        container.appendChild(memberElement);
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
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notificationText');
    
    text.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 300);
    }, 3000);
}

// Инициализация WebSocket
function initWebSocket() {
    const token = localStorage.getItem('token');
    const ws = new WebSocket(`ws://localhost:5000/ws?token=${token}`);
    
    ws.onopen = () => {
        console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
            case 'new_message':
                if (data.message.channel === currentChannel) {
                    messages.push(data.message);
                    renderMessages();
                }
                break;
                
            case 'user_joined':
                showNotification(`${data.username} присоединился к каналу`);
                loadOnlineUsers();
                break;
                
            case 'user_left':
                showNotification(`${data.username} покинул канал`);
                loadOnlineUsers();
                break;
                
            case 'call_started':
                showNotification(`Начался голосовой звонок в канале ${data.channel}`);
                break;
        }
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Попытка переподключения через 5 секунд
        setTimeout(initWebSocket, 5000);
    };
}

// Загрузка данных сервера
async function loadServerData(server) {
    showNotification(`Загрузка сервера: ${server}`);
    // Здесь будет загрузка данных конкретного сервера
}

// Экспорт для глобального использования
window.RuCord = {
    API_BASE_URL,
    currentUser,
    showNotification,
    loadChannelMessages
};