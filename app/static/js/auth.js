// Конфигурация API
const API_BASE_URL = 'http://node3.dom4k.ru:9999/api';

// Обработка авторизации
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, есть ли уже токен
    if (this.location.pathname === '/login') {
        const token = localStorage.getItem('rucord_token');
        if (token) {
            // Если токен есть, перенаправляем в чат
            window.location.href = '/';
            return;
        }
        // Переключение между вкладками входа и регистрации
        const tabs = document.querySelectorAll('.auth-tab');
        const forms = document.querySelectorAll('.auth-form');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const targetTab = this.dataset.tab;
                
                // Обновляем активные вкладки
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // Показываем соответствующую форму
                forms.forEach(form => {
                    form.classList.remove('active');
                    if (form.id === `${targetTab}Form`) {
                        form.classList.add('active');
                    }
                });

                // Очищаем ошибки при переключении
                clearErrors();
            });
        });
        
        // Обработка формы входа
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            
            await handleLogin(username, password);
        });
        
        // Обработка формы регистрации
        document.getElementById('registerForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
            
            // Валидация пароля
            if (password !== passwordConfirm) {
                showFieldError('passwordError', 'Пароли не совпадают');
                return;
            }

            if (password.length < 4) {
                showFieldError('passwordError', 'Пароль должен содержать минимум 4 символа');
                return;
            }

            clearErrors();
            await handleRegister(username, password, email);
        });

        // Автозаполнение тестовых данных
        const demoLogin = document.querySelector('.auth-demo');
        if (demoLogin) {
            demoLogin.addEventListener('click', function() {
                document.getElementById('loginUsername').value = 'dom4k';
                document.getElementById('loginPassword').value = '1234';
            });
        }

        // Очистка ошибок при вводе
        const inputs = document.querySelectorAll('.neon-input');
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                clearErrors();
            });
        });
    }
});

// Функция входа
async function handleLogin(username, password) {
    const submitBtn = document.querySelector('#loginForm .neon-button');
    const originalText = submitBtn.textContent;
    
    try {
        submitBtn.textContent = 'Вход...';
        submitBtn.disabled = true;

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Сохраняем токен в localStorage
            localStorage.setItem('rucord_token', result.token);
            localStorage.setItem('rucord_username', username);
            
            showNotification('Вход выполнен успешно!', 'success');
            
            // Перенаправляем на главную страницу
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            showNotification(result.message || 'Неверное имя пользователя или пароль', 'error');
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Функция регистрации
async function handleRegister(username, password, email) {
    const submitBtn = document.querySelector('#registerForm .neon-button');
    const originalText = submitBtn.textContent;
    
    try {
        submitBtn.textContent = 'Регистрация...';
        submitBtn.disabled = true;

        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, email })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Сохраняем токен в localStorage
            localStorage.setItem('rucord_token', result.token);
            localStorage.setItem('rucord_username', username);
            
            showNotification('Регистрация выполнена успешно!', 'success');
            
            // Перенаправляем на главную страницу
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            // Обработка ошибок валидации
            if (result.value === 'username') {
                showFieldError('usernameError', result.message);
            } else if (result.value === 'email') {
                showFieldError('emailError', result.message);
            } else {
                showNotification(result.message || 'Ошибка регистрации', 'error');
            }
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Функция выхода
function handleLogout() {
    localStorage.removeItem('rucord_token');
    localStorage.removeItem('rucord_username');
    window.location.href = '/login';
}

// Показать ошибку поля
function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(fieldId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Добавляем класс ошибки к полю ввода
        const inputField = errorElement.previousElementSibling;
        if (inputField && inputField.classList.contains('neon-input')) {
            inputField.classList.add('error');
        }
    }
}

// Очистить все ошибки
function clearErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
        element.textContent = '';
        element.style.display = 'none';
    });

    const errorInputs = document.querySelectorAll('.neon-input.error');
    errorInputs.forEach(input => {
        input.classList.remove('error');
    });
}

// Функция показа уведомлений
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

// Проверка авторизации
function checkAuth() {
    return localStorage.getItem('rucord_token') !== null;
}

// Получение токена
function getToken() {
    return localStorage.getItem('rucord_token');
}

// Получение имени пользователя
function getUsername() {
    return localStorage.getItem('rucord_username') || 'Пользователь';
}

// Экспорт функций для использования в других скриптах
window.Auth = {
    checkAuth,
    getToken,
    getUsername,
    handleLogout
};