// Открытие модальных окон
document.addEventListener('DOMContentLoaded', function() {
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
        });
    });
    
    // Закрытие при клике вне окна
    window.addEventListener('click', function(e) {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
        if (e.target === registerModal) {
            registerModal.style.display = 'none';
        }
    });
    
    // Обработка форм
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        // Здесь должна быть логика входа
        loginModal.style.display = 'none';
    });
    
    document.getElementById('registerForm').addEventListener('submit', function(e) {
        e.preventDefault();
        // Здесь должна быть логика регистрации
        registerModal.style.display = 'none';
    });
    
    // Переключение серверов
    const serverItems = document.querySelectorAll('.server-item:not(.add-server)');
    serverItems.forEach(item => {
        item.addEventListener('click', function() {
            serverItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Переключение каналов
    const channelItems = document.querySelectorAll('.channel-item:not(.voice)');
    channelItems.forEach(item => {
        item.addEventListener('click', function() {
            channelItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Отправка сообщения
    const messageInput = document.querySelector('.message-input');
    const sendButton = document.querySelector('.send-btn');
    
    function sendMessage() {
        const text = messageInput.value.trim();
        if (text) {
            const messagesContainer = document.querySelector('.messages-container');
            const newMessage = document.createElement('div');
            newMessage.className = 'message own-message';
            newMessage.innerHTML = `
                <div class="avatar"></div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="username">Вы</span>
                        <span class="timestamp">Только что</span>
                    </div>
                    <div class="message-text">${text}</div>
                </div>
            `;
            messagesContainer.appendChild(newMessage);
            messageInput.value = '';
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    sendButton.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});