// Конфигурация API
const API_BASE_URL = 'http://localhost:9999/api';

// Глобальные переменные
let currentChannel = 'general';
let currentServer = null;
let messages = [];
let servers = [];
let users = [];

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
        
        // Загружаем серверы пользователя
        loadUserServers();
    } else {
        showGuestMessage();
    }
}

// Проверка авторизации и загрузка данных
function checkAuthAndLoad() {
    if (Auth.checkAuth()) {
        loadChannelMessages(currentChannel);
        loadOnlineUsers();
    } else {
        showGuestMessage();
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Создание сервера
    document.getElementById('createServerBtn').addEventListener('click', function() {
        if (!Auth.checkAuth()) {
            showNotification('Для создания сервера необходимо войти в систему', 'warning');
            return;
        }
        document.getElementById('createServerModal').style.display = 'block';
    });

    // Присоединение к серверу
    document.getElementById('joinServerBtn').addEventListener('click', function() {
        if (!Auth.checkAuth()) {
            showNotification('Для присоединения к серверу необходимо войти в систему', 'warning');
            return;
        }
        document.getElementById('joinServerModal').style.display = 'block';
    });

    // Настройки сервера
    document.getElementById('serverSettingsBtn').addEventListener('click', function() {
        if (!currentServer) {
            showNotification('Выберите сервер для настройки', 'warning');
            return;
        }
        openServerSettings(currentServer);
    });

    // Выход
    document.getElementById('logoutBtn').addEventListener('click', function() {
        Auth.handleLogout();
    });

    // Форма создания сервера
    document.getElementById('createServerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await createServer();
    });

    // Форма присоединения к серверу
    document.getElementById('joinServerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await joinServer();
    });

    // Форма настроек сервера
    document.getElementById('serverSettingsForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await updateServer();
    });

    // Удаление сервера
    document.getElementById('deleteServerBtn').addEventListener('click', async function() {
        await deleteServer();
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
    
    // Отправка сообщения
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Закрытие модальных окон
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
        
        if (e.target.classList.contains('close')) {
            e.target.closest('.modal').style.display = 'none';
        }
    });

    // Переключение видимости участников
    document.getElementById('membersToggleBtn').addEventListener('click', function() {
        const membersPanel = document.getElementById('membersPanel');
        membersPanel.classList.toggle('visible');
    });
}

// Загрузка серверов пользователя
async function loadUserServers() {
    try {
        // В реальном приложении здесь будет API для получения серверов пользователя
        // Пока используем заглушку
        servers = [
            { id: 1, name: 'Мой сервер', description: 'Мой первый сервер', is_public: true, is_owner: true },
            { id: 2, name: 'Игровой чат', description: 'Для игровых сессий', is_public: true, is_owner: false }
        ];
        
        renderServers();
    } catch (error) {
        console.error('Ошибка загрузки серверов:', error);
    }
}

// Создание сервера
async function createServer() {
    const form = document.getElementById('createServerForm');
    const submitBtn = form.querySelector('button');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.textContent = 'Создание...';
        submitBtn.disabled = true;

        const name = document.getElementById('serverName').value;
        const description = document.getElementById('serverDescription').value;
        const is_public = document.getElementById('serverIsPublic').checked;

        const response = await fetch(`${API_BASE_URL}/server/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: Auth.getToken(),
                name,
                description,
                is_public
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Сервер успешно создан!', 'success');
            document.getElementById('createServerModal').style.display = 'none';
            form.reset();
            
            // Обновляем список серверов
            await loadUserServers();
        } else {
            showNotification(result.message || 'Ошибка создания сервера', 'error');
        }
    } catch (error) {
        console.error('Ошибка создания сервера:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Присоединение к серверу
async function joinServer() {
    const form = document.getElementById('joinServerForm');
    const submitBtn = form.querySelector('button');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.textContent = 'Присоединение...';
        submitBtn.disabled = true;

        const server_id = parseInt(document.getElementById('joinServerId').value);

        const response = await fetch(`${API_BASE_URL}/server/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: Auth.getToken(),
                server_id
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Успешно присоединились к серверу!', 'success');
            document.getElementById('joinServerModal').style.display = 'none';
            form.reset();
            
            // Обновляем список серверов
            await loadUserServers();
        } else {
            showNotification(result.message || 'Ошибка присоединения к серверу', 'error');
        }
    } catch (error) {
        console.error('Ошибка присоединения к серверу:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Выход из сервера
async function leaveServer(serverId) {
    if (!confirm('Вы уверены, что хотите покинуть сервер?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/server/leave`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: Auth.getToken(),
                server_id: serverId
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Вы покинули сервер', 'success');
            await loadUserServers();
        } else {
            showNotification(result.message || 'Ошибка выхода из сервера', 'error');
        }
    } catch (error) {
        console.error('Ошибка выхода из сервера:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    }
}

// Обновление сервера
async function updateServer() {
    const form = document.getElementById('serverSettingsForm');
    const submitBtn = form.querySelector('button');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.textContent = 'Сохранение...';
        submitBtn.disabled = true;

        const server_id = parseInt(document.getElementById('editServerId').value);
        const name = document.getElementById('editServerName').value;
        const description = document.getElementById('editServerDescription').value;
        const is_public = document.getElementById('editServerIsPublic').checked;

        const response = await fetch(`${API_BASE_URL}/server/edit`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: Auth.getToken(),
                server_id,
                name,
                description,
                is_public
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Настройки сервера обновлены!', 'success');
            document.getElementById('serverSettingsModal').style.display = 'none';
            
            // Обновляем список серверов
            await loadUserServers();
        } else {
            showNotification(result.message || 'Ошибка обновления сервера', 'error');
        }
    } catch (error) {
        console.error('Ошибка обновления сервера:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Удаление сервера
async function deleteServer() {
    const server_id = parseInt(document.getElementById('editServerId').value);
    
    if (!confirm('Вы уверены, что хотите удалить сервер? Это действие нельзя отменить.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/server/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: Auth.getToken(),
                server_id
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Сервер успешно удален!', 'success');
            document.getElementById('serverSettingsModal').style.display = 'none';
            
            // Обновляем список серверов
            await loadUserServers();
        } else {
            showNotification(result.message || 'Ошибка удаления сервера', 'error');
        }
    } catch (error) {
        console.error('Ошибка удаления сервера:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    }
}

// Открытие настроек сервера
function openServerSettings(server) {
    document.getElementById('editServerId').value = server.id;
    document.getElementById('editServerName').value = server.name;
    document.getElementById('editServerDescription').value = server.description || '';
    document.getElementById('editServerIsPublic').checked = server.is_public;
    
    // Показываем/скрываем кнопку удаления в зависимости от прав
    const deleteBtn = document.getElementById('deleteServerBtn');
    deleteBtn.style.display = server.is_owner ? 'block' : 'none';
    
    document.getElementById('serverSettingsModal').style.display = 'block';
}

// Рендер серверов
function renderServers() {
    const serverList = document.getElementById('serverList');
    
    // Очищаем список, кроме домашнего сервера
    const homeServer = serverList.querySelector('[data-server="home"]').parentNode;
    serverList.innerHTML = '';
    serverList.appendChild(homeServer);

    servers.forEach(server => {
        const serverElement = document.createElement('div');
        serverElement.className = 'server-item';
        serverElement.innerHTML = `
            <span>${server.name.charAt(0).toUpperCase()}</span>
            <div class="server-tooltip">${server.name}${server.is_owner ? ' 👑' : ''}</div>
        `;
        
        serverElement.addEventListener('click', function() {
            document.querySelectorAll('.server-item').forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            currentServer = server;
            document.getElementById('currentServerName').textContent = server.name;
            loadServerChannels(server.id);
        });

        // Контекстное меню для сервера
        serverElement.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            showServerContextMenu(e, server);
        });

        serverList.appendChild(serverElement);
    });
}

// Контекстное меню сервера
function showServerContextMenu(e, server) {
    // Удаляем существующее контекстное меню
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu neon-border';
    contextMenu.style.position = 'fixed';
    contextMenu.style.left = e.pageX + 'px';
    contextMenu.style.top = e.pageY + 'px';

    let menuItems = '';

    if (server.is_owner) {
        menuItems += `<div class="context-item" data-action="settings">⚙️ Настройки</div>`;
        menuItems += `<div class="context-item" data-action="delete">🗑️ Удалить</div>`;
    } else {
        menuItems += `<div class="context-item" data-action="leave">🚪 Покинуть</div>`;
    }

    contextMenu.innerHTML = menuItems;
    document.body.appendChild(contextMenu);

    // Обработка выбора пунктов меню
    contextMenu.querySelectorAll('.context-item').forEach(item => {
        item.addEventListener('click', function() {
            const action = this.dataset.action;
            switch (action) {
                case 'settings':
                    openServerSettings(server);
                    break;
                case 'delete':
                    deleteServer(server.id);
                    break;
                case 'leave':
                    leaveServer(server.id);
                    break;
            }
            contextMenu.remove();
        });
    });

    // Закрытие меню при клике вне его
    document.addEventListener('click', function closeMenu() {
        contextMenu.remove();
        document.removeEventListener('click', closeMenu);
    });
}

// Загрузка каналов сервера
async function loadServerChannels(serverId) {
    try {
        // В реальном приложении здесь будет API для получения каналов сервера
        const channels = [
            { id: 1, name: 'общий', type: 'text' },
            { id: 2, name: 'игры', type: 'text' },
            { id: 3, name: 'музыка', type: 'text' }
        ];
        
        renderChannels(channels);
    } catch (error) {
        console.error('Ошибка загрузки каналов:', error);
    }
}

// Рендер каналов
function renderChannels(channels) {
    const channelList = document.getElementById('channelList');
    channelList.innerHTML = '';

    channels.forEach(channel => {
        const channelElement = document.createElement('div');
        channelElement.className = `channel-item ${channel.type === 'voice' ? 'voice' : ''}`;
        channelElement.innerHTML = channel.type === 'voice' ? `🔊 ${channel.name}` : `# ${channel.name}`;
        
        if (channel.type === 'text') {
            channelElement.addEventListener('click', function() {
                document.querySelectorAll('.channel-item').forEach(item => item.classList.remove('active'));
                this.classList.add('active');
                currentChannel = channel.name;
                document.getElementById('currentChannel').textContent = channel.name;
                document.getElementById('messageInput').placeholder = `Написать сообщение в #${channel.name}`;
                loadChannelMessages(channel.name);
            });
        }

        channelList.appendChild(channelElement);
    });
}

// Загрузка сообщений канала
async function loadChannelMessages(channel) {
    try {
        if (!Auth.checkAuth()) {
            showGuestMessage();
            return;
        }

        // В реальном приложении здесь будет API для получения сообщений
        messages = [
            {
                id: 1,
                username: Auth.getUsername(),
                content: 'Добро пожаловать в RuCord! Это ваш первый вход.',
                timestamp: new Date().toISOString(),
                userId: 'current'
            },
            {
                id: 2,
                username: 'dom4k',
                content: 'Привет! Как дела?',
                timestamp: new Date(Date.now() - 300000).toISOString(),
                userId: 'user2'
            }
        ];
        
        renderMessages();
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
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
    
    try {
        // В реальном приложении здесь будет API для отправки сообщений
        const message = {
            id: Date.now(),
            username: Auth.getUsername(),
            content: content,
            timestamp: new Date().toISOString(),
            userId: 'current'
        };
        
        messages.push(message);
        renderMessages();
        input.value = '';
        
        // Прокрутка к последнему сообщению
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
        
    } catch (error) {
        showNotification('Ошибка отправки: ' + error.message, 'error');
    }
}

// Загрузка онлайн пользователей
async function loadOnlineUsers() {
    try {
        if (!Auth.checkAuth()) return;

        // В реальном приложении здесь будет API для получения онлайн пользователей
        users = [
            { id: 'current', username: Auth.getUsername(), status: 'online' },
            { id: 'user2', username: 'dom4k', status: 'online' },
            { id: 'user3', username: 'test_user', status: 'idle' }
        ];
        
        renderOnlineUsers();
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

// Рендер онлайн пользователей
function renderOnlineUsers() {
    const container = document.getElementById('membersList');
    const onlineCount = users.filter(user => user.status === 'online').length;
    
    document.getElementById('onlineCount').textContent = users.length;
    container.innerHTML = '';
    
    users.forEach(user => {
        const isOwn = user.username === Auth.getUsername();
        const memberElement = document.createElement('div');
        memberElement.className = 'member';
        memberElement.innerHTML = `
            <div class="avatar ${user.status}"></div>
            <span class="member-name">${user.username}${isOwn ? ' (Вы)' : ''}</span>
        `;
        container.appendChild(memberElement);
    });
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
        notification.classList.add('hidden');
    }, 4000);
}