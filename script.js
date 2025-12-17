
let secretCodeInput;

document.addEventListener('DOMContentLoaded', function() {
    secretCodeInput = document.getElementById('secretCodeInput');
    // переконайтеся, що елемент знайдено
    if (!secretCodeInput) {
        console.error('Елемент secretCodeInput не знайдено в DOM!');
    }
});

// Harmony Web Player - Фіксована версія 2025
console.log('🎵 Harmony Player завантажується...');

// Глобальні змінні
let isLoggedIn = false;
let currentTheme = 'light';
let currentUser = {
    nickname: 'Користувач',
    avatar: 'fas fa-user',
    secretCode: '',
    role: 'user',
    color: '#ffcfe1'
};

// Аудіо плеєр
let audioPlayer = new Audio();
let isPlaying = false;
let currentSongIndex = -1;
let isShuffled = false;
let repeatMode = 'none';
let queue = [];
let room = null;
let roomMembers = [];

// Плейлисти
let playlists = [];
let currentPlaylistId = null;
let songToSaveToPlaylist = null;

// API налаштування
window.HarmonyAPI = {
    BASE_URL: window.API_URL || 'https://harmony-backend-4f00.onrender.com',
    token: localStorage.getItem('harmony_token') || null,
    
    async login(secretCode) {
        try {
            const response = await fetch(`${this.BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secretCode })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Помилка сервера' }));
                throw new Error(errorData.error || 'Помилка входу');
            }
            
            const data = await response.json();
            
            if (data.token) {
                this.token = data.token;
                localStorage.setItem('harmony_token', data.token);
                localStorage.setItem('harmony_user', JSON.stringify(data.user));
            }
            
            return data;
        } catch (error) {
            console.error('API Login error:', error);
            throw error;
        }
    },
    
    async getProfile() {
        if (!this.token) return null;
        
        try {
            const response = await fetch(`${this.BASE_URL}/api/profile`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (!response.ok) throw new Error('Profile fetch failed');
            return await response.json();
        } catch (error) {
            console.error('API Profile error:', error);
            return null;
        }
    },
    
    async checkHealth() {
        try {
            const response = await fetch(`${this.BASE_URL}/health`);
            return response.ok;
        } catch (error) {
            console.error('Health check error:', error);
            return false;
        }
    },
    
    async getDemoSongs() {
        try {
            const response = await fetch(`${this.BASE_URL}/api/demo-songs`);
            if (!response.ok) throw new Error('Failed to get demo songs');
            return await response.json();
        } catch (error) {
            console.error('Demo songs error:', error);
            return demoQueue;
        }
    }
};

// Основна функція ініціалізації
function init() {
    console.log('🎵 Harmony Player ініціалізується...');
    
    // Перевірка API статусу
    updateApiStatus();
    
    // Перевірка локального сховища
    const savedUser = localStorage.getItem('harmony_user');
    const savedTheme = localStorage.getItem('harmony_theme');
    const savedQueue = localStorage.getItem('harmony_queue');
    const savedPlaylists = localStorage.getItem('harmony_playlists');
    
    // Встановлення теми
    if (savedTheme) {
        currentTheme = savedTheme;
        setTheme(currentTheme);
    }
    
    // Перевірка авторизації
    if (savedUser && HarmonyAPI.token) {
        try {
            const parsedUser = JSON.parse(savedUser);
            currentUser = parsedUser;
            isLoggedIn = true;
            showApp();
            
            // Завантаження демо пісень
            loadDemoSongs();
        } catch (e) {
            console.error('Помилка завантаження даних користувача');
            showLoginModal();
        }
    } else {
        showLoginModal();
    }
    
    // Завантаження черги
    if (savedQueue) {
        try {
            queue = JSON.parse(savedQueue);
        } catch (e) {
            console.error('Помилка завантаження черги');
            queue = [...demoQueue];
        }
    } else {
        queue = [...demoQueue];
    }
    
    // Завантаження плейлистів
    if (savedPlaylists) {
        try {
            playlists = JSON.parse(savedPlaylists);
        } catch (e) {
            console.error('Помилка завантаження плейлистів');
            playlists = [...demoPlaylists];
        }
    } else {
        playlists = [...demoPlaylists];
    }
    
    // Ініціалізація демо-даних
    roomMembers = [...demoMembers];
    
    // Ініціалізація плеєра
    setupAudioPlayer();
    
    // Оновлення інтерфейсу
    if (isLoggedIn) {
        updateUserDisplay();
        updateQueueDisplay();
        updateMembersDisplay();
        updatePlaylistsDisplay();
        updateAvatarOptions();
        setupFAQ();
        setupTabs();
        addCurrentUserToMembers();
        
        if (currentSongIndex >= 0 && currentSongIndex < queue.length) {
            loadSong(currentSongIndex, false);
        }
    }
    
    // Налаштування обробників подій
    setupEventListeners();
}

// Функція для оновлення статусу API
function updateApiStatus() {
    const apiStatusElement = document.getElementById('apiStatus');
    if (!apiStatusElement) return;
    
    HarmonyAPI.checkHealth().then(isHealthy => {
        if (isHealthy) {
            apiStatusElement.textContent = 'API статус: підключено';
            apiStatusElement.style.color = '#4CAF50';
        } else {
            apiStatusElement.textContent = 'API статус: не підключено';
            apiStatusElement.style.color = '#FF5252';
        }
    }).catch(() => {
        apiStatusElement.textContent = 'API статус: помилка';
        apiStatusElement.style.color = '#FF5252';
    });
}

// Функція для завантаження демо пісень з API
function loadDemoSongs() {
    HarmonyAPI.getDemoSongs().then(songs => {
        if (queue.length === 0 || queue.every(song => song.demo)) {
            queue = [...songs];
            saveQueue();
            updateQueueDisplay();
        }
    }).catch(() => {
        // Якщо API недоступне, використовуємо локальні демо
        if (queue.length === 0) {
            queue = [...demoQueue];
            saveQueue();
            updateQueueDisplay();
        }
    });
}

// ============ ДОПОМІЖНІ ФУНКЦІЇ ============

// Показати модальне вікно входу
function showLoginModal() {
    document.body.classList.add('not-logged-in');
    document.getElementById('loginModal').classList.add('active');
    document.getElementById('appContainer').classList.add('hidden');
    
    setTimeout(() => {
        document.getElementById('secretCode').focus();
    }, 300);
}

// Показати основний додаток
function showApp() {
    document.body.classList.remove('not-logged-in');
    document.getElementById('loginModal').classList.remove('active');
    document.getElementById('appContainer').classList.remove('hidden');
    document.getElementById('appContainer').style.animation = 'fadeIn 0.8s forwards';
    
    setTimeout(() => {
        showNotification(`Вітаємо з поверненням, ${currentUser.nickname}!`);
    }, 500);
}

// Налаштування вкладок
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tabId = btn.getAttribute('data-tab');
            
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            const tabContent = document.getElementById(`${tabId}Tab`);
            if (tabContent) {
                tabContent.classList.add('active');
            }
            
            if (tabId === 'playlists') {
                updatePlaylistsDisplay();
            }
        });
    });
}

// Налаштування плеєра
function setupAudioPlayer() {
    audioPlayer.addEventListener('loadedmetadata', function() {
        if (!isNaN(audioPlayer.duration)) {
            document.getElementById('duration').textContent = formatTime(audioPlayer.duration);
        }
    });
    
    audioPlayer.addEventListener('timeupdate', updateProgress);
    
    audioPlayer.addEventListener('ended', function() {
        if (repeatMode === 'one') {
            audioPlayer.currentTime = 0;
            audioPlayer.play();
        } else {
            nextSong();
        }
    });
    
    audioPlayer.addEventListener('error', function(e) {
        console.error('Помилка відтворення аудіо:', e);
        showNotification('Помилка відтворення аудіо', true);
        pauseSong();
    });
    
    audioPlayer.volume = 0.8;
}

// Оновлення прогресу
function updateProgress() {
    if (!isNaN(audioPlayer.duration) && !isNaN(audioPlayer.currentTime)) {
        const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        document.getElementById('progress').style.width = `${progressPercent}%`;
        document.getElementById('currentTime').textContent = formatTime(audioPlayer.currentTime);
    }
}

// Форматування часу
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// Завантаження пісні
function loadSong(index, playImmediately = true) {
    if (queue.length === 0 || index < 0 || index >= queue.length) {
        resetPlayer();
        return;
    }
    
    currentSongIndex = index;
    const song = queue[currentSongIndex];
    
    document.getElementById('currentSongTitle').textContent = song.title;
    document.getElementById('currentSongArtist').textContent = song.artist;
    updateAlbumArt(song.color || currentUser.color);
    updateActiveQueueItem();
    
    if (song.url) {
        audioPlayer.src = song.url;
        audioPlayer.load();
        
        audioPlayer.onloadedmetadata = function() {
            if (!isNaN(audioPlayer.duration)) {
                document.getElementById('duration').textContent = formatTime(audioPlayer.duration);
            }
        };
        
        if (playImmediately) {
            playSong();
        }
    } else {
        resetPlayer();
        showNotification('Для цієї пісні немає аудіофайлу', true);
    }
}

// Оновлення обкладинки альбому
function updateAlbumArt(color) {
    document.getElementById('albumArt').style.background = `linear-gradient(135deg, ${color}, ${color}80)`;
}

// Оновлення активної пісні в черзі
function updateActiveQueueItem() {
    document.querySelectorAll('.queue-item').forEach((item, i) => {
        if (i === currentSongIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Скидання плеєра
function resetPlayer() {
    document.getElementById('currentSongTitle').textContent = 'Оберіть пісню';
    document.getElementById('currentSongArtist').textContent = 'Додайте пісні до черги';
    document.getElementById('currentTime').textContent = '0:00';
    document.getElementById('duration').textContent = '0:00';
    document.getElementById('progress').style.width = '0%';
    updateAlbumArt(currentUser.color);
    
    if (isPlaying) {
        pauseSong();
    }
}

// Відтворення пісні
function playSong() {
    if (queue.length === 0 || currentSongIndex < 0) {
        showNotification('Немає пісень для відтворення', true);
        return;
    }
    
    audioPlayer.play().then(() => {
        isPlaying = true;
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
        showNotification(`Грає: ${queue[currentSongIndex].title}`);
    }).catch(error => {
        console.error('Помилка відтворення:', error);
        showNotification('Не вдалося відтворити пісню', true);
    });
}

// Пауза
function pauseSong() {
    audioPlayer.pause();
    isPlaying = false;
    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
}

// Наступна пісня
function nextSong() {
    if (queue.length === 0) return;
    
    let nextIndex = currentSongIndex + 1;
    
    if (isShuffled) {
        nextIndex = Math.floor(Math.random() * queue.length);
        while (nextIndex === currentSongIndex && queue.length > 1) {
            nextIndex = Math.floor(Math.random() * queue.length);
        }
    } else if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
            nextIndex = 0;
        } else {
            pauseSong();
            return;
        }
    }
    
    loadSong(nextIndex);
}

// Попередня пісня
function prevSong() {
    if (queue.length === 0) return;
    
    let prevIndex = currentSongIndex - 1;
    
    if (isShuffled) {
        prevIndex = Math.floor(Math.random() * queue.length);
        while (prevIndex === currentSongIndex && queue.length > 1) {
            prevIndex = Math.floor(Math.random() * queue.length);
        }
    } else if (prevIndex < 0) {
        if (repeatMode === 'all') {
            prevIndex = queue.length - 1;
        } else {
            return;
        }
    }
    
    loadSong(prevIndex);
}

// Додавання поточного користувача до списку учасників
function addCurrentUserToMembers() {
    const existingUserIndex = roomMembers.findIndex(member => member.id === 0);
    
    if (existingUserIndex !== -1) {
        roomMembers[existingUserIndex] = {
            id: 0,
            name: currentUser.nickname,
            avatar: currentUser.avatar,
            color: currentUser.color
        };
    } else {
        roomMembers.unshift({
            id: 0,
            name: currentUser.nickname,
            avatar: currentUser.avatar,
            color: currentUser.color
        });
    }
    
    updateMembersDisplay();
}

// Оновлення відображення користувача
function updateUserDisplay() {
    const userAvatar = document.getElementById('userAvatar');
    userAvatar.innerHTML = `<i class="${currentUser.avatar}"></i>`;
    userAvatar.style.background = `linear-gradient(135deg, ${currentUser.color}, ${currentUser.color}80)`;
}

// Оновлення відображення черги
function updateQueueDisplay() {
    const queueList = document.getElementById('queueList');
    const queueCount = document.getElementById('queueCount');
    
    queueList.innerHTML = '';
    queueCount.textContent = queue.length;
    
    if (queue.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'queue-empty';
        emptyItem.textContent = 'Черга порожня. Додайте пісні.';
        queueList.appendChild(emptyItem);
        return;
    }
    
    queue.forEach((song, index) => {
        const li = document.createElement('li');
        li.className = `queue-item ${index === currentSongIndex ? 'active' : ''}`;
        li.innerHTML = `
            <div class="queue-item-info">
                <div class="queue-item-title">${song.title}</div>
                <div class="queue-item-artist">${song.artist} <span class="queue-item-duration">• ${song.duration}</span></div>
            </div>
            <div class="queue-item-actions">
                <button class="queue-action-btn" data-index="${index}" data-action="remove">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        
        li.addEventListener('click', (e) => {
            if (!e.target.closest('.queue-action-btn')) {
                loadSong(index);
            }
        });
        
        queueList.appendChild(li);
    });
    
    document.querySelectorAll('.queue-action-btn[data-action="remove"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            removeFromQueue(index);
        });
    });
}

// Оновлення відображення учасників
function updateMembersDisplay() {
    const membersList = document.getElementById('membersList');
    membersList.innerHTML = '';
    
    roomMembers.forEach(member => {
        const memberElement = document.createElement('div');
        memberElement.className = 'member';
        memberElement.innerHTML = `
            <div class="member-avatar" style="background: linear-gradient(135deg, ${member.color}, ${member.color}80)">
                <i class="${member.avatar}"></i>
            </div>
            <div class="member-name">${member.name}</div>
        `;
        membersList.appendChild(memberElement);
    });
}

// Оновлення відображення плейлистів
function updatePlaylistsDisplay() {
    const playlistsList = document.getElementById('playlistsList');
    playlistsList.innerHTML = '';
    
    if (playlists.length === 0) {
        const emptyElement = document.createElement('div');
        emptyElement.className = 'playlist-empty';
        emptyElement.innerHTML = `
            <i class="fas fa-music"></i>
            <p>У вас ще немає плейлистів</p>
            <button class="room-btn secondary" id="createFirstPlaylistBtn">
                <i class="fas fa-plus"></i> Створити перший плейлист
            </button>
        `;
        playlistsList.appendChild(emptyElement);
        
        const createFirstBtn = emptyElement.querySelector('#createFirstPlaylistBtn');
        createFirstBtn.addEventListener('click', () => {
            document.getElementById('createPlaylistModal').classList.add('active');
        });
        
        document.getElementById('currentPlaylistView').innerHTML = '';
        return;
    }
    
    const sortedPlaylists = [...playlists].sort((a, b) => b.created - a.created);
    
    sortedPlaylists.forEach(playlist => {
        const playlistElement = document.createElement('div');
        const template = document.querySelector('.playlist-item-template').innerHTML;
        playlistElement.innerHTML = template;
        
        const playlistItem = playlistElement.querySelector('.playlist-item');
        playlistItem.dataset.id = playlist.id;
        
        playlistItem.querySelector('.playlist-item-cover i').className = playlist.id % 2 === 0 ? 'fas fa-heart' : 'fas fa-music';
        playlistItem.querySelector('.playlist-item-title').textContent = playlist.name;
        playlistItem.querySelector('.playlist-item-description').textContent = playlist.description || 'Без опису';
        
        const songCount = playlist.songs ? playlist.songs.length : 0;
        playlistItem.querySelector('.playlist-item-count').textContent = `${songCount} ${getSongWordForm(songCount)}`;
        
        const playBtn = playlistItem.querySelector('.playlist-play-btn');
        const editBtn = playlistItem.querySelector('.playlist-edit-btn');
        const deleteBtn = playlistItem.querySelector('.playlist-delete-btn');
        
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            playPlaylist(playlist.id);
        });
        
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editPlaylist(playlist.id);
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePlaylist(playlist.id);
        });
        
        playlistItem.addEventListener('click', () => {
            showPlaylistSongs(playlist.id);
        });
        
        playlistsList.appendChild(playlistItem);
    });
    
    if (currentPlaylistId) {
        showPlaylistSongs(currentPlaylistId);
    }
}

// Функція для отримання правильної форми слова "пісня"
function getSongWordForm(count) {
    if (count % 10 === 1 && count % 100 !== 11) return 'пісня';
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'пісні';
    return 'пісень';
}

// Показати пісні плейлиста
function showPlaylistSongs(playlistId) {
    currentPlaylistId = playlistId;
    const playlist = playlists.find(p => p.id === playlistId);
    
    if (!playlist) return;
    
    const currentPlaylistView = document.getElementById('currentPlaylistView');
    currentPlaylistView.innerHTML = '';
    
    const header = document.createElement('div');
    header.className = 'current-playlist-header';
    header.innerHTML = `
        <h4><i class="fas fa-music"></i> ${playlist.name}</h4>
        <button class="icon-btn" id="closePlaylistViewBtn" title="Закрити">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    const songsList = document.createElement('ul');
    songsList.className = 'current-playlist-songs';
    
    if (!playlist.songs || playlist.songs.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'playlist-song-item';
        emptyItem.style.justifyContent = 'center';
        emptyItem.style.padding = '30px 15px';
        emptyItem.innerHTML = `
            <div style="text-align: center; color: var(--text-light);">
                <i class="fas fa-music" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                <p>Плейлист порожній</p>
            </div>
        `;
        songsList.appendChild(emptyItem);
    } else {
        playlist.songs.forEach(songId => {
            const song = queue.find(s => s.id === songId);
            if (song) {
                const songElement = document.createElement('li');
                songElement.className = 'playlist-song-item';
                songElement.dataset.songId = song.id;
                songElement.innerHTML = `
                    <div class="playlist-song-info">
                        <div class="playlist-song-title">${song.title}</div>
                        <div class="playlist-song-artist">${song.artist}</div>
                    </div>
                    <div class="playlist-song-actions">
                        <button class="icon-btn playlist-song-play-btn" title="Відтворити">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="icon-btn playlist-song-remove-btn" title="Видалити з плейлиста">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                
                const playBtn = songElement.querySelector('.playlist-song-play-btn');
                const removeBtn = songElement.querySelector('.playlist-song-remove-btn');
                
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const songIndex = queue.findIndex(s => s.id === song.id);
                    if (songIndex !== -1) {
                        loadSong(songIndex);
                    }
                });
                
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeSongFromPlaylist(playlistId, song.id);
                });
                
                songElement.addEventListener('click', () => {
                    const songIndex = queue.findIndex(s => s.id === song.id);
                    if (songIndex !== -1) {
                        loadSong(songIndex);
                    }
                });
                
                songsList.appendChild(songElement);
            }
        });
    }
    
    const closeBtn = header.querySelector('#closePlaylistViewBtn');
    closeBtn.addEventListener('click', () => {
        currentPlaylistView.innerHTML = '';
        currentPlaylistId = null;
    });
    
    currentPlaylistView.appendChild(header);
    currentPlaylistView.appendChild(songsList);
}

// Відтворення плейлиста
function playPlaylist(playlistId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist || !playlist.songs || playlist.songs.length === 0) {
        showNotification('Плейлист порожній', true);
        return;
    }
    
    queue = [];
    
    playlist.songs.forEach(songId => {
        const song = getSongById(songId);
        if (song) {
            queue.push({...song});
        }
    });
    
    saveQueue();
    updateQueueDisplay();
    
    if (queue.length > 0) {
        loadSong(0);
    }
    
    showNotification(`Плейлист "${playlist.name}" завантажено до черги`);
    document.querySelector('.tab-btn[data-tab="queue"]').click();
}

// Редагування плейлиста
function editPlaylist(playlistId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    document.getElementById('playlistName').value = playlist.name;
    document.getElementById('playlistDescription').value = playlist.description || '';
    document.querySelector('#createPlaylistModal .modal-title').textContent = 'Редагувати плейлист';
    document.getElementById('confirmCreatePlaylistBtn').textContent = 'Зберегти зміни';
    document.getElementById('confirmCreatePlaylistBtn').dataset.playlistId = playlistId;
    
    document.getElementById('createPlaylistModal').classList.add('active');
}

// Видалення плейлиста
function deletePlaylist(playlistId) {
    if (!confirm('Ви впевнені, що хочете видалити цей плейлист?')) return;
    
    const index = playlists.findIndex(p => p.id === playlistId);
    if (index !== -1) {
        playlists.splice(index, 1);
        savePlaylists();
        updatePlaylistsDisplay();
        showNotification('Плейлист видалено');
        
        if (currentPlaylistId === playlistId) {
            document.getElementById('currentPlaylistView').innerHTML = '';
            currentPlaylistId = null;
        }
    }
}

// Видалення пісні з плейлиста
function removeSongFromPlaylist(playlistId, songId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist || !playlist.songs) return;
    
    const index = playlist.songs.indexOf(songId);
    if (index !== -1) {
        playlist.songs.splice(index, 1);
        savePlaylists();
        showPlaylistSongs(playlistId);
        showNotification('Пісню видалено з плейлиста');
    }
}

// Отримати пісню за ID
function getSongById(songId) {
    return queue.find(song => song.id === songId);
}

// Збереження черги
function saveQueue() {
    localStorage.setItem('harmony_queue', JSON.stringify(queue));
}

// Оновлення опцій аватарів
function updateAvatarOptions() {
    const detailedAvatars = [
        { icon: "fas fa-fox", name: "Лисичка", color: "#ffcfe1" },
        { icon: "fas fa-paw", name: "Вовк", color: "#ffb6d0" },
        { icon: "fas fa-cat", name: "Кіт", color: "#ffa8d9" },
        { icon: "fas fa-dog", name: "Пес", color: "#ff9ac8" },
        { icon: "fas fa-dove", name: "Голуб", color: "#ff8cb7" },
        { icon: "fas fa-fish", name: "Рибка", color: "#ff7ea6" },
        { icon: "fas fa-dragon", name: "Дракон", color: "#ff7095" },
        { icon: "fas fa-unicorn", name: "Єдиноріг", color: "#ff6284" },
        { icon: "fas fa-crown", name: "Корона", color: "#ffcfe1" },
        { icon: "fas fa-star", name: "Зірочка", color: "#ffb6d0" },
        { icon: "fas fa-heart", name: "Серце", color: "#ffa8d9" },
        { icon: "fas fa-moon", name: "Місяць", color: "#ff9ac8" },
        { icon: "fas fa-sun", name: "Сонце", color: "#ff8cb7" },
        { icon: "fas fa-cloud", name: "Хмаринка", color: "#ff7ea6" },
        { icon: "fas fa-feather", name: "Пір'їнка", color: "#ff7095" },
        { icon: "fas fa-seedling", name: "Рослинка", color: "#ff6284" },
        { icon: "fas fa-music", name: "Нота", color: "#ffcfe1" },
        { icon: "fas fa-user", name: "Користувач", color: "#ffb6d0" }
    ];
    
    const avatarOptions = document.getElementById('avatarOptions');
    avatarOptions.innerHTML = '';
    
    detailedAvatars.forEach((avatarData, index) => {
        const avatarElement = document.createElement('div');
        avatarElement.className = `avatar-option ${avatarData.icon === currentUser.avatar ? 'selected' : ''}`;
        avatarElement.innerHTML = `<i class="${avatarData.icon}" title="${avatarData.name}"></i>`;
        avatarElement.dataset.avatar = avatarData.icon;
        avatarElement.dataset.color = avatarData.color;
        avatarElement.style.background = `linear-gradient(135deg, ${avatarData.color}, ${avatarData.color}80)`;
        
        avatarElement.addEventListener('click', function() {
            document.querySelectorAll('.avatar-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            this.classList.add('selected');
            currentUser.avatar = this.dataset.avatar;
            currentUser.color = this.dataset.color;
        });
        
        avatarOptions.appendChild(avatarElement);
    });
}

// Видалення пісні з черги
function removeFromQueue(index) {
    if (index < 0 || index >= queue.length) return;
    
    const removedSongId = queue[index].id;
    
    if (index === currentSongIndex) {
        if (isPlaying) {
            pauseSong();
        }
    }
    
    queue.splice(index, 1);
    
    playlists.forEach(playlist => {
        if (playlist.songs) {
            const songIndex = playlist.songs.indexOf(removedSongId);
            if (songIndex !== -1) {
                playlist.songs.splice(songIndex, 1);
            }
        }
    });
    
    saveQueue();
    savePlaylists();
    
    if (index === currentSongIndex) {
        if (queue.length > 0) {
            currentSongIndex = Math.min(index, queue.length - 1);
            loadSong(currentSongIndex, false);
        } else {
            currentSongIndex = -1;
            resetPlayer();
        }
    } else if (index < currentSongIndex) {
        currentSongIndex--;
    }
    
    updateQueueDisplay();
    
    if (currentPlaylistId) {
        showPlaylistSongs(currentPlaylistId);
    }
    
    showNotification('Пісню видалено з черги');
}

// Налаштування FAQ
function setupFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            
            item.classList.toggle('active');
        });
    });
}

// Збереження плейлистів
function savePlaylists() {
    localStorage.setItem('harmony_playlists', JSON.stringify(playlists));
}

// Показати сповіщення
function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notificationText.textContent = message;
    notification.classList.remove('error');
    
    if (isError) {
        notification.classList.add('error');
        notification.querySelector('i').className = 'fas fa-exclamation-circle';
    } else {
        notification.querySelector('i').className = 'fas fa-check-circle';
    }
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Встановлення теми
function setTheme(theme) {
    currentTheme = theme;
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.classList.remove('dark-theme');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-moon"></i>';
    }
    
    localStorage.setItem('harmony_theme', theme);
}

// ============ ОБРОБНИКИ ПОДІЙ ============

// Налаштування обробників подій
function setupEventListeners() {
    // Перемикання теми
    document.getElementById('themeToggle').addEventListener('click', () => {
        setTheme(currentTheme === 'light' ? 'dark' : 'light');
    });
    
    // Вхід з секретним кодом
    const loginBtn = document.getElementById('loginBtn');
    const secretCodeInput = document.getElementById('secretCode');
    
    loginBtn.addEventListener('click', handleLogin);
    secretCodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    
    // Відкриття модального вікна профілю
    document.getElementById('userAvatar').addEventListener('click', () => {
        document.getElementById('nickname').value = currentUser.nickname;
        
        document.querySelectorAll('.avatar-option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.avatar === currentUser.avatar) {
                opt.classList.add('selected');
            }
        });
        
        document.getElementById('profileModal').classList.add('active');
    });
    
    // Закриття модальних вікон
    document.getElementById('closeProfileModal').addEventListener('click', () => {
        document.getElementById('profileModal').classList.remove('active');
    });
    
    document.getElementById('closeUploadModal').addEventListener('click', () => {
        document.getElementById('uploadModal').classList.remove('active');
    });
    
    document.getElementById('closeCreateRoomModal').addEventListener('click', () => {
        document.getElementById('createRoomModal').classList.remove('active');
    });
    
    document.getElementById('closeJoinRoomModal').addEventListener('click', () => {
        document.getElementById('joinRoomModal').classList.remove('active');
    });
    
    document.getElementById('closeCreatePlaylistModal').addEventListener('click', () => {
        const modal = document.getElementById('createPlaylistModal');
        modal.classList.remove('active');
        document.getElementById('playlistName').value = '';
        document.getElementById('playlistDescription').value = '';
        document.querySelector('#createPlaylistModal .modal-title').textContent = 'Створити плейлист';
        document.getElementById('confirmCreatePlaylistBtn').textContent = 'Створити плейлист';
        delete document.getElementById('confirmCreatePlaylistBtn').dataset.playlistId;
    });
    
    document.getElementById('closeSaveToPlaylistModal').addEventListener('click', () => {
        document.getElementById('saveToPlaylistModal').classList.remove('active');
        songToSaveToPlaylist = null;
    });
    
    // Закриття модальних вікон при кліку на задній фон
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal && modal.id !== 'loginModal') {
                modal.classList.remove('active');
                if (modal.id === 'createPlaylistModal') {
                    document.getElementById('playlistName').value = '';
                    document.getElementById('playlistDescription').value = '';
                    document.querySelector('#createPlaylistModal .modal-title').textContent = 'Створити плейлист';
                    document.getElementById('confirmCreatePlaylistBtn').textContent = 'Створити плейлист';
                    delete document.getElementById('confirmCreatePlaylistBtn').dataset.playlistId;
                } else if (modal.id === 'saveToPlaylistModal') {
                    songToSaveToPlaylist = null;
                }
            }
        });
    });
    
    // Збереження профілю
    document.getElementById('saveProfileBtn').addEventListener('click', () => {
        const nickname = document.getElementById('nickname').value.trim();
        
        if (!nickname) {
            showNotification('Будь ласка, введіть нікнейм', true);
            return;
        }
        
        currentUser.nickname = nickname;
        localStorage.setItem('harmony_user', JSON.stringify(currentUser));
        updateUserDisplay();
        addCurrentUserToMembers();
        document.getElementById('profileModal').classList.remove('active');
        showNotification('Профіль оновлено');
    });
    
    // Вихід з акаунту
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm('Ви впевнені, що хочете вийти з акаунту?')) {
            localStorage.removeItem('harmony_user');
            localStorage.removeItem('harmony_token');
            localStorage.removeItem('harmony_queue');
            localStorage.removeItem('harmony_playlists');
            
            isLoggedIn = false;
            currentSongIndex = -1;
            queue = [...demoQueue];
            playlists = [...demoPlaylists];
            
            pauseSong();
            showLoginModal();
            secretCodeInput.value = '';
            
            showNotification('Ви успішно вийшли з акаунту');
        }
    });
    
    // Завантаження пісні
    document.getElementById('uploadSongBtn').addEventListener('click', () => {
        document.getElementById('uploadModal').classList.add('active');
    });
    
    // Обробка області завантаження файлів
    const fileUploadArea = document.getElementById('fileUploadArea');
    const audioFileInput = document.getElementById('audioFileInput');
    
    fileUploadArea.addEventListener('click', () => {
        audioFileInput.click();
    });
    
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'var(--accent-dark)';
        fileUploadArea.style.backgroundColor = 'rgba(255, 207, 225, 0.1)';
    });
    
    fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.style.borderColor = 'var(--accent-pastel)';
        fileUploadArea.style.backgroundColor = 'rgba(255, 207, 225, 0.05)';
    });
    
    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'var(--accent-pastel)';
        fileUploadArea.style.backgroundColor = 'rgba(255, 207, 225, 0.05)';
        
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('audio/')) {
                audioFileInput.files = e.dataTransfer.files;
                handleFileSelect(file);
            } else {
                showNotification('Будь ласка, виберіть аудіофайл', true);
            }
        }
    });
    
    audioFileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            handleFileSelect(this.files[0]);
        }
    });
    
    // Підтвердження завантаження
    document.getElementById('confirmUploadBtn').addEventListener('click', handleFileUpload);
    
    // Створення кімнати
    document.getElementById('createRoomBtn').addEventListener('click', () => {
        document.getElementById('createRoomModal').classList.add('active');
    });
    
    document.getElementById('confirmCreateRoomBtn').addEventListener('click', () => {
        const roomName = document.getElementById('roomName').value.trim();
        const roomCode = document.getElementById('roomCode').value.trim();
        
        if (!roomName) {
            showNotification('Будь ласка, введіть назву кімнати', true);
            return;
        }
        
        room = {
            id: Date.now(),
            name: roomName,
            code: roomCode || Math.random().toString(36).substring(2, 8).toUpperCase(),
            password: roomCode,
            host: currentUser.nickname,
            members: [...roomMembers]
        };
        
        document.querySelector('.room-indicator span').textContent = room.name;
        document.getElementById('createRoomModal').classList.remove('active');
        document.getElementById('roomName').value = '';
        document.getElementById('roomCode').value = '';
        
        showNotification(`Кімнату "${room.name}" створено! Код: ${room.code}`);
    });
    
    // Приєднання до кімнати
    document.getElementById('joinRoomBtn').addEventListener('click', () => {
        document.getElementById('joinRoomModal').classList.add('active');
    });
    
    document.getElementById('confirmJoinRoomBtn').addEventListener('click', () => {
        const joinCode = document.getElementById('joinRoomCode').value.trim();
        const joinPassword = document.getElementById('joinRoomPassword').value.trim();
        
        if (!joinCode) {
            showNotification('Будь ласка, введіть код кімнати', true);
            return;
        }
        
        room = {
            id: 1,
            name: 'Демо-кімната',
            code: joinCode,
            password: joinPassword,
            host: 'Марія',
            members: [...demoMembers, {
                id: 0,
                name: currentUser.nickname,
                avatar: currentUser.avatar,
                color: currentUser.color
            }]
        };
        
        document.querySelector('.room-indicator span').textContent = room.name;
        roomMembers = [...room.members];
        updateMembersDisplay();
        
        document.getElementById('joinRoomModal').classList.remove('active');
        document.getElementById('joinRoomCode').value = '';
        document.getElementById('joinRoomPassword').value = '';
        
        showNotification(`Ви приєдналися до кімнати "${room.name}"`);
        });
        
        // Кнопки управління плеєром
        playPauseBtn.addEventListener('click', () => {
            if (queue.length === 0 || currentSongIndex < 0) {
                if (queue.length > 0) {
                    loadSong(0);
                } else {
                    showNotification('Немає пісень для відтворення', true);
                }
                return;
            }
            
            if (isPlaying) {
                pauseSong();
            } else {
                playSong();
            }
        });
        
        prevBtn.addEventListener('click', prevSong);
        nextBtn.addEventListener('click', nextSong);
        
        shuffleBtn.addEventListener('click', () => {
            isShuffled = !isShuffled;
            shuffleBtn.style.color = isShuffled ? 'var(--accent-pastel)' : 'var(--text-dark)';
            showNotification(isShuffled ? 'Перемішування увімкнено' : 'Перемішування вимкнено');
        });
        
        repeatBtn.addEventListener('click', () => {
            const modes = ['none', 'one', 'all'];
            const currentIndex = modes.indexOf(repeatMode);
            repeatMode = modes[(currentIndex + 1) % modes.length];
            
            // Оновлюємо іконку
            const icons = ['fa-redo', 'fa-redo', 'fa-sync-alt'];
            repeatBtn.innerHTML = `<i class="fas ${icons[currentIndex + 1] || icons[0]}"></i>`;
            
            // Змінюємо колір для режимів 'one' і 'all'
            repeatBtn.style.color = repeatMode === 'none' ? 'var(--text-dark)' : 'var(--accent-pastel)';
            
            showNotification(
                repeatMode === 'none' ? 'Повтор вимкнено' : 
                repeatMode === 'one' ? 'Повтор однієї пісні' : 
                'Повтор всієї черги'
            );
        });
        
        // Прогрес-бар
        progressBar.addEventListener('click', (e) => {
            if (queue.length === 0 || currentSongIndex < 0) return;
            
            const width = progressBar.clientWidth;
            const clickX = e.offsetX;
            const duration = audioPlayer.duration;
            
            if (duration && !isNaN(duration)) {
                const newTime = (clickX / width) * duration;
                audioPlayer.currentTime = newTime;
            }
        });
        
        // Збереження до плейлиста
        saveToPlaylistBtn.addEventListener('click', () => {
            if (queue.length === 0 || currentSongIndex < 0) {
                showNotification('Немає пісні для збереження', true);
                return;
            }
            
            songToSaveToPlaylist = queue[currentSongIndex];
            showSaveToPlaylistModal();
        });
        
        // Створення плейлиста
        createPlaylistBtn.addEventListener('click', () => {
            createPlaylistModal.classList.add('active');
        });
        
        createFirstPlaylistBtn.addEventListener('click', () => {
            createPlaylistModal.classList.add('active');
        });
        
        confirmCreatePlaylistBtn.addEventListener('click', () => {
            const playlistName = document.getElementById('playlistName').value.trim();
            const playlistDescription = document.getElementById('playlistDescription').value.trim();
            
            if (!playlistName) {
                showNotification('Будь ласка, введіть назву плейлиста', true);
                return;
            }
            
            // Перевіряємо, чи це редагування існуючого плейлиста
            const playlistId = document.getElementById('confirmCreatePlaylistBtn').dataset.playlistId;
            
            if (playlistId) {
                // Редагування існуючого плейлиста
                const playlist = playlists.find(p => p.id === parseInt(playlistId));
                if (playlist) {
                    playlist.name = playlistName;
                    playlist.description = playlistDescription;
                    savePlaylists();
                    updatePlaylistsDisplay();
                    showNotification('Плейлист оновлено');
                }
            } else {
                // Створення нового плейлиста
                const newPlaylist = {
                    id: Date.now(),
                    name: playlistName,
                    description: playlistDescription,
                    songs: [],
                    color: getRandomPastelColor(),
                    created: Date.now()
                };
                
                playlists.push(newPlaylist);
                savePlaylists();
                updatePlaylistsDisplay();
                showNotification('Плейлист створено');
            }
            
            // Закриваємо модальне вікно та скидаємо форму
            createPlaylistModal.classList.remove('active');
            document.getElementById('playlistName').value = '';
            document.getElementById('playlistDescription').value = '';
            document.querySelector('#createPlaylistModal .modal-title').textContent = 'Створити плейлист';
            document.getElementById('confirmCreatePlaylistBtn').textContent = 'Створити плейлист';
            delete document.getElementById('confirmCreatePlaylistBtn').dataset.playlistId;
        });
        
        // Створення нового плейлиста з модального вікна збереження
        createNewPlaylistFromSaveBtn.addEventListener('click', () => {
            saveToPlaylistModal.classList.remove('active');
            createPlaylistModal.classList.add('active');
        });
    }
    
    // Обробка входу
    function handleLogin() {
        const secretCode = secretCodeInput.value.trim();
        
        if (!secretCode) {
            showNotification('Будь ласка, введіть секретний код', true);
            return;
        }
        
        // Перевірка секретного коду
        if (secretCodes[secretCode]) {
            // Код вірний, налаштовуємо користувача
            const userData = secretCodes[secretCode];
            currentUser = {
                nickname: userData.nickname,
                avatar: userData.avatar,
                secretCode: secretCode,
                role: userData.role,
                color: userData.color
            };
            isLoggedIn = true;
            
            // Зберігаємо користувача
            localStorage.setItem('harmony_user', JSON.stringify(currentUser));
            
            // Оновлюємо інтерфейс
            updateUserDisplay();
            
            // Додаємо поточного користувача до списку учасників
            addCurrentUserToMembers();
            
            // Показуємо додаток
            showApp();
            
            // Оновлюємо інтерфейс
            updateQueueDisplay();
            updateMembersDisplay();
            updatePlaylistsDisplay();
            updateAvatarOptions();
            setupFAQ();
            setupTabs();
            
            showNotification(`Вітаємо, ${currentUser.nickname}!`);
            
            // Очищаємо поле введення
            secretCodeInput.value = '';
        } else {
            // Невірний код
            showNotification('Невірний секретний код', true);
            // Трясемо поле введення
            secretCodeInput.style.animation = 'shake 0.5s';
            setTimeout(() => {
                secretCodeInput.style.animation = '';
            }, 500);
        }
    }
    
    // Обробка вибору файлу
    function handleFileSelect(file) {
        const fileName = file.name.replace(/\.[^/.]+$/, ""); // Видаляємо розширення
        document.getElementById('songTitleInput').value = fileName;
        
        // Перевіряємо розмір файлу (обмеження до 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showNotification('Файл занадто великий (максимум 10MB)', true);
            return;
        }
        
        showNotification(`Файл "${file.name}" вибрано`);
        
        // Оновлюємо інтерфейс
        fileUploadArea.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <p>Файл вибрано: ${file.name}</p>
            <p class="file-formats">Розмір: ${(file.size / (1024 * 1024)).toFixed(2)} MB</p>
        `;
    }
    
    // Обробка завантаження файлу
    function handleFileUpload() {
        const file = audioFileInput.files[0];
        const songTitle = document.getElementById('songTitleInput').value.trim();
        const songArtist = document.getElementById('songArtistInput').value.trim();
        
        if (!file) {
            showNotification('Будь ласка, виберіть аудіофайл', true);
            return;
        }
        
        // Створюємо FileReader для читання файлу
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const base64Data = e.target.result;
            
            // Отримуємо тривалість аудіо
            const audio = new Audio();
            audio.src = base64Data;
            
            audio.addEventListener('loadedmetadata', () => {
                const duration = audio.duration;
                const durationFormatted = formatTime(duration);
                
                // Створюємо об'єкт пісні
                const newSong = {
                    id: Date.now(),
                    title: songTitle || file.name.replace(/\.[^/.]+$/, ""),
                    artist: songArtist || 'Невідомий виконавець',
                    duration: durationFormatted,
                    url: base64Data,
                    data: base64Data, // Зберігаємо base64 для відновлення
                    demo: false,
                    color: getRandomPastelColor()
                };
                
                // Додаємо пісню до черги
                queue.push(newSong);
                
                // Зберігаємо чергу
                saveQueue();
                
                // Оновлюємо інтерфейс
                updateQueueDisplay();
                
                // Якщо це перша пісня, завантажуємо її
                if (queue.length === 1) {
                    loadSong(0, false);
                }
                
                // Закриваємо модальне вікно та скидаємо форму
                uploadModal.classList.remove('active');
                audioFileInput.value = '';
                document.getElementById('songTitleInput').value = '';
                document.getElementById('songArtistInput').value = '';
                
                // Відновлюємо початковий вигляд області завантаження
                fileUploadArea.innerHTML = `
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Перетягніть аудіофайл сюди або натисніть для вибору</p>
                    <p class="file-formats">Підтримувані формати: MP3, WAV, OGG, M4A, FLAC</p>
                    <input type="file" id="audioFileInput" accept="audio/*" style="display: none;">
                `;
                
                showNotification('Пісню додано до черги');
            });
            
            audio.addEventListener('error', () => {
                showNotification('Не вдалося завантажити аудіофайл', true);
            });
        };
        
        reader.onerror = function() {
            showNotification('Помилка читання файлу', true);
        };
        
        // Читаємо файл як Data URL (base64)
        reader.readAsDataURL(file);
    }
    
    // Генерація випадкового пастельного кольору
    function getRandomPastelColor() {
        const pastelColors = [
            '#ffcfe1', '#ffb6d0', '#ffa8d9', '#ff9ac8', 
            '#ff8cb7', '#ff7ea6', '#ff7095', '#ff6284',
            '#ffd9e6', '#ffe6f0', '#fff0f7'
        ];
        return pastelColors[Math.floor(Math.random() * pastelColors.length)];
    }
    
    // Показати модальне вікно збереження до плейлиста
    function showSaveToPlaylistModal() {
        if (!songToSaveToPlaylist) return;
        
        playlistsSelect.innerHTML = '';
        
        if (playlists.length === 0) {
            const emptyElement = document.createElement('div');
            emptyElement.className = 'playlists-select-item';
            emptyElement.style.justifyContent = 'center';
            emptyElement.style.padding = '30px 15px';
            emptyElement.innerHTML = `
                <div style="text-align: center; color: var(--text-light);">
                    <i class="fas fa-music" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                    <p>У вас ще немає плейлистів</p>
                </div>
            `;
            playlistsSelect.appendChild(emptyElement);
        } else {
            playlists.forEach(playlist => {
                const playlistElement = document.createElement('div');
                playlistElement.className = 'playlists-select-item';
                playlistElement.dataset.playlistId = playlist.id;
                
                // Перевіряємо, чи вже є ця пісня в плейлисті
                const alreadyInPlaylist = playlist.songs && playlist.songs.includes(songToSaveToPlaylist.id);
                
                if (alreadyInPlaylist) {
                    playlistElement.classList.add('selected');
                }
                
                playlistElement.innerHTML = `
                    <div class="playlists-select-cover">
                        <i class="fas fa-music"></i>
                    </div>
                    <div class="playlists-select-info">
                        <div class="playlists-select-title">${playlist.name}</div>
                        <div class="playlists-select-count">${playlist.songs ? playlist.songs.length : 0} пісень</div>
                    </div>
                `;
                
                playlistElement.addEventListener('click', () => {
                    if (alreadyInPlaylist) {
                        // Видаляємо пісню з плейлиста
                        removeSongFromPlaylist(playlist.id, songToSaveToPlaylist.id);
                        saveToPlaylistModal.classList.remove('active');
                        showNotification('Пісню видалено з плейлиста');
                    } else {
                        // Додаємо пісню до плейлиста
                        if (!playlist.songs) playlist.songs = [];
                        playlist.songs.push(songToSaveToPlaylist.id);
                        savePlaylists();
                        saveToPlaylistModal.classList.remove('active');
                        showNotification('Пісню додано до плейлиста');
                        
                        // Оновлюємо відображення плейлиста, якщо він відкритий
                        if (currentPlaylistId === playlist.id) {
                            showPlaylistSongs(playlist.id);
                        }
                    }
                    songToSaveToPlaylist = null;
                });
                
                playlistsSelect.appendChild(playlistElement);
            });
        }
        
        saveToPlaylistModal.classList.add('active');
    }
    
    // PWA: Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('ServiceWorker registration successful');
            }).catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
        });
    }
    
    // Запуск ініціалізації
    init();
    
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    .pulse { animation: pulse 2s infinite; }
`;

document.head.appendChild(style);


