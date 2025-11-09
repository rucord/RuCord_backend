const API_BASE = 'http://node3.dom4k.ru:9999/api';

// Общие утилиты
function showMessage(message, type = 'success') {
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
}

// Аутентификация
document.addEventListener('DOMContentLoaded', function() {
    // Вход
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                username: document.getElementById('username').value,
                password: document.getElementById('password').value
            };
            
            try {
                const response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('username', formData.username);
                    showMessage('Успешный вход! Перенаправление...', 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    showMessage(data.message, 'error');
                }
            } catch (error) {
                showMessage('Ошибка сети', 'error');
            }
        });
    }
    
    // Регистрация
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                username: document.getElementById('username').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            };
            
            try {
                const response = await fetch(`${API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('username', formData.username);
                    showMessage('Успешная регистрация! Перенаправление...', 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    showMessage(data.message, 'error');
                }
            } catch (error) {
                showMessage('Ошибка сети', 'error');
            }
        });
    }
    
    // Дашборд
    if (window.location.pathname.includes('dashboard.html')) {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        // Установка имени пользователя
        const usernameElements = document.querySelectorAll('#currentUsername, #currentMemberName');
        usernameElements.forEach(el => {
            if (el) el.textContent = username;
        });
        
        // Загрузка серверов
        loadServers();
        
        // Создание сервера
        const serverModal = document.getElementById('serverModal');
        const addServerBtn = document.getElementById('addServerBtn');
        const closeModal = document.querySelector('.close');
        const serverForm = document.getElementById('serverForm');
        
        if (addServerBtn) {
            addServerBtn.addEventListener('click', () => {
                serverModal.style.display = 'block';
            });
        }
        
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                serverModal.style.display = 'none';
            });
        }
        
        if (serverForm) {
            serverForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = {
                    token: token,
                    name: document.getElementById('serverName').value,
                    description: document.getElementById('serverDescription').value,
                    is_public: document.getElementById('serverPublic').checked
                };
                
                try {
                    const response = await fetch(`${API_BASE}/server/create`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        serverModal.style.display = 'none';
                        serverForm.reset();
                        loadServers();
                        showMessage('Сервер успешно создан!', 'success');
                    } else {
                        showMessage(data.message, 'error');
                    }
                } catch (error) {
                    showMessage('Ошибка сети', 'error');
                }
            });
        }
        
        // Выход
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                window.location.href = 'index.html';
            });
        }
    }
});

// Загрузка серверов
async function loadServers() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`${API_BASE}/server/list`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const serversList = document.getElementById('serversList');
            if (serversList) {
                serversList.innerHTML = '';
                
                data.servers.forEach(server => {
                    const serverItem = document.createElement('div');
                    serverItem.className = 'server-item';
                    serverItem.innerHTML = `<span>${server.name.charAt(0).toUpperCase()}</span>`;
                    serverItem.setAttribute('data-server-id', server.id);
                    
                    serverItem.addEventListener('click', () => {
                        // Обновляем информацию о текущем сервере
                        const serverName = document.getElementById('currentServerName');
                        if (serverName) {
                            serverName.textContent = server.name;
                        }
                    });
                    
                    serversList.appendChild(serverItem);
                });
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки серверов:', error);
    }
}