// Обработка авторизации
document.addEventListener('DOMContentLoaded', function() {
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
        });
    });
    
    // Обработка формы входа
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        await handleLogin(email, password);
    });
    
    // Обработка формы регистрации
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        
        if (password !== passwordConfirm) {
            showNotification('Пароли не совпадают', 'error');
            return;
        }
        
        await handleRegister(username, email, password);
    });
    
    // Автозаполнение демо данных
    const demoLogin = document.querySelector('.auth-demo');
    if (demoLogin) {
        demoLogin.addEventListener('click', function() {
            document.getElementById('loginEmail').value = 'demo@rucord.com';
            document.getElementById('loginPassword').value = 'demo123';
        });
    }
});

// Функция входа
async function handleLogin(email, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            // Перенаправляем на главную страницу после успешного входа
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    }
}

// Функция регистрации
async function handleRegister(username, email, password) {
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            // Перенаправляем на главную страницу после успешной регистрации
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    }
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
    }, 3000);
}