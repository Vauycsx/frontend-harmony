// Глобальні змінні
let api = null;
let currentUser = null;
let audioPlayer = null;
let currentSong = null;
let queue = [];
let currentPlaylist = null;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let currentTime = 0;
let currentRoom = null;

// DOM елементи
const appContainer = document.getElementById('appContainer');
const loginModal = document.getElementById('loginModal');
const loginBtn = document.getElementById('loginBtn');
const secretCodeInput = document.getElementById('secretCode');
const themeToggle = document.getElementById('themeToggle');
const userAvatar = document.getElementById('userAvatar');
const apiConfigBtn = document.getElementById('apiConfigBtn');
const apiConfigModal = document.getElementById('apiConfigModal');
const apiUrlInput = document.getElementById('apiUrlInput');
const saveApiConfigBtn = document.getElementById('saveApiConfigBtn');
const testApiBtn = document.getElementById('testApiBtn');
const apiTestResult = document.getElementById('apiTestResult');
const notification = document.getElementById('notification');

// Ініціалізація
document.addEventListener('DOMContentLoaded', async () => {
    // Ініціалізація API
    api = new HarmonyAPI();
    
    // Перевірка API статусу
    const isApiOnline = await api.checkAPIStatus();
    updateApiStatus(isApiOnline);
    
    // Перевірка збереженого користувача
    const savedUser = localStorage.getItem('harmony_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            api.user = currentUser;
            showApp();
        } catch (e) {
            localStorage.removeItem('harmony_user');
            showLogin();
        }
    } else {
        showLogin();
    }

    // Завантаження збереженої теми
    const savedTheme = localStorage.getItem('harmony_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    // Ініціалізація аудіоплеєра
    initAudioPlayer();
    
    // Завантаження даних користувача
    if (currentUser) {
        loadUserData();
    }

    // Ініціалізація FAQ
    initFAQ();
});

// Функції
function showApp() {
    document.body.classList.remove('not-logged-in');
    appContainer.classList.remove('hidden');
    loginModal.classList.remove('active');
}

function showLogin() {
    document.body.classList.add('not-logged-in');
    appContainer.classList.add('hidden');
    loginModal.classList.add('active');
}

function updateApiStatus(isOnline) {
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.textContent = `API статус: ${isOnline ? 'підключено' : 'не підключено'}`;
        apiStatus.style.color = isOnline ? 'var(--success-dark)' : 'var(--error-dark)';
    }
}

async function loadUserData() {
    if (!currentUser) return;

    try {
        // Завантаження пісень користувача
        const songs = await api.getUserSongs(currentUser.id);
        updateQueue(songs);
        
        // Завантаження плейлистів
        const playlists = await api.getUserPlaylists(currentUser.id);
        updatePlaylists(playlists);
        
        showNotification('Дані завантажено успішно', 'success');
    } catch (error) {
        showNotification('Помилка завантаження даних', 'error');
    }
}

// Авторизація
loginBtn.addEventListener('click', async () => {
    const secretCode = secretCodeInput.value.trim();
    
    if (!secretCode) {
        showNotification('Будь ласка, введіть секретний код', 'error');
        return;
    }

    try {
        const result = await api.login(secretCode);
        currentUser = result.user;
        showApp();
        loadUserData();
        showNotification('Вхід успішний!', 'success');
    } catch (error) {
        showNotification('Невірний код або помилка сервера', 'error');
    }
});

// Перемикання теми
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    
    if (document.body.classList.contains('dark-theme')) {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('harmony_theme', 'dark');
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('harmony_theme', 'light');
    }
});

// Налаштування API
apiConfigBtn.addEventListener('click', () => {
    apiConfigModal.classList.add('active');
    apiUrlInput.value = window.API_URL;
});

testApiBtn.addEventListener('click', async () => {
    const url = apiUrlInput.value.trim();
    if (!url) {
        apiTestResult.textContent = 'Будь ласка, введіть URL API';
        apiTestResult.style.display = 'block';
        apiTestResult.style.backgroundColor = 'var(--error)';
        return;
    }

    try {
        const response = await fetch(`${url}/health`);
        if (response.ok) {
            apiTestResult.textContent = 'API працює коректно!';
            apiTestResult.style.display = 'block';
            apiTestResult.style.backgroundColor = 'var(--success)';
        } else {
            throw new Error('API не відповідає');
        }
    } catch (error) {
        apiTestResult.textContent = 'Помилка підключення до API';
        apiTestResult.style.display = 'block';
        apiTestResult.style.backgroundColor = 'var(--error)';
    }
});

saveApiConfigBtn.addEventListener('click', () => {
    const url = apiUrlInput.value.trim();
    if (!url) {
        showNotification('Будь ласка, введіть URL API', 'error');
        return;
    }

    window.API_URL = url;
    localStorage.setItem('harmony_api_url', url);
    api = new HarmonyAPI(url);
    apiConfigModal.classList.remove('active');
    showNotification('Налаштування API збережено', 'success');
});

// Показ повідомлень
function showNotification(message, type = 'success') {
    notification.querySelector('#notificationText').textContent = message;
    notification.className = 'notification';
    notification.classList.add(type);
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Функції для аудіоплеєра
function initAudioPlayer() {
    audioPlayer = new Audio();
    
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', playNextSong);
    audioPlayer.addEventListener('error', () => {
        showNotification('Помилка відтворення пісні', 'error');
    });
}

function updateProgress() {
    const progress = document.getElementById('progress');
    const currentTimeElement = document.getElementById('currentTime');
    const durationElement = document.getElementById('duration');
    
    if (audioPlayer.duration) {
        const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progress.style.width = `${progressPercent}%`;
        
        currentTimeElement.textContent = formatTime(audioPlayer.currentTime);
        durationElement.textContent = formatTime(audioPlayer.duration);
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function playSong(song) {
    if (!song) return;
    
    currentSong = song;
    
    // Оновлення інтерфейсу
    document.getElementById('currentSongTitle').textContent = song.title || 'Невідома пісня';
    document.getElementById('currentSongArtist').textContent = song.artist || 'Невідомий виконавець';
    
    // Завантаження аудіофайлу
    if (song.filename) {
        audioPlayer.src = `${window.API_URL}/uploads/${song.filename}`;
        audioPlayer.play()
            .then(() => {
                isPlaying = true;
                document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
            })
            .catch(error => {
                showNotification('Помилка відтворення', 'error');
            });
    }
}

function togglePlayPause() {
    if (!currentSong) return;
    
    if (isPlaying) {
        audioPlayer.pause();
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
    } else {
        audioPlayer.play();
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
    }
    
    isPlaying = !isPlaying;
}

function playNextSong() {
    if (queue.length === 0) return;
    
    const currentIndex = queue.findIndex(song => song._id === currentSong?._id);
    let nextIndex;
    
    if (isShuffle) {
        nextIndex = Math.floor(Math.random() * queue.length);
    } else {
        nextIndex = (currentIndex + 1) % queue.length;
    }
    
    playSong(queue[nextIndex]);
}

function updateQueue(songs) {
    queue = songs;
    const queueList = document.getElementById('queueList');
    const queueCount = document.getElementById('queueCount');
    
    if (songs.length === 0) {
        queueList.innerHTML = '<li class="queue-empty">Черга порожня. Додайте пісні.</li>';
        queueCount.textContent = '0';
        return;
    }
    
    queueCount.textContent = songs.length;
    queueList.innerHTML = '';
    
    songs.forEach((song, index) => {
        const li = document.createElement('li');
        li.className = 'queue-item';
        if (currentSong && song._id === currentSong._id) {
            li.classList.add('active');
        }
        
        li.innerHTML = `
            <div class="queue-item-info">
                <div class="queue-item-title">${song.title || 'Невідома пісня'}</div>
                <div class="queue-item-artist">${song.artist || 'Невідомий виконавець'}</div>
            </div>
            <div class="queue-item-duration">${song.duration ? formatTime(song.duration) : '--:--'}</div>
            <div class="queue-item-actions">
                <button class="queue-action-btn play-btn" data-index="${index}" title="Відтворити">
                    <i class="fas fa-play"></i>
                </button>
                <button class="queue-action-btn delete-btn" data-id="${song._id}" title="Видалити">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        queueList.appendChild(li);
    });
}

function updatePlaylists(playlists) {
    const playlistsList = document.getElementById('playlistsList');
    
    if (playlists.length === 0) {
        playlistsList.innerHTML = `
            <div class="playlist-empty">
                <i class="fas fa-music"></i>
                <p>У вас ще немає плейлистів</p>
                <button class="room-btn secondary" id="createFirstPlaylistBtn">
                    <i class="fas fa-plus"></i> Створити перший плейлист
                </button>
            </div>
        `;
        return;
    }
    
    playlistsList.innerHTML = '';
    
    playlists.forEach(playlist => {
        const template = document.querySelector('.playlist-item-template').cloneNode(true);
        const playlistItem = template.querySelector('.playlist-item');
        
        playlistItem.querySelector('.playlist-item-title').textContent = playlist.name;
        playlistItem.querySelector('.playlist-item-description').textContent = playlist.description || 'Без опису';
        playlistItem.querySelector('.playlist-item-count').textContent = `${playlist.songs?.length || 0} пісень`;
        
        // Додавання обробників подій
        playlistItem.querySelector('.playlist-play-btn').addEventListener('click', () => {
            playPlaylist(playlist);
        });
        
        playlistItem.querySelector('.playlist-edit-btn').addEventListener('click', () => {
            editPlaylist(playlist);
        });
        
        playlistItem.querySelector('.playlist-delete-btn').addEventListener('click', () => {
            deletePlaylist(playlist._id);
        });
        
        playlistsList.appendChild(playlistItem);
    });
}

function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            item.classList.toggle('active');
        });
    });
}

// Експорт для використання в інших файлах
window.HarmonyPlayer = {
    playSong,
    togglePlayPause,
    playNextSong,
    updateQueue,
    showNotification
};
