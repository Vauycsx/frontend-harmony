class HarmonyAPI {
    constructor(baseURL) {
        this.baseURL = baseURL || window.API_URL;
        this.user = null;
        this.token = null;
    }

    // Авторизація
    async login(secretCode) {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ secretCode })
            });

            if (!response.ok) {
                throw new Error('Помилка авторизації');
            }

            const data = await response.json();
            this.user = data.user;
            localStorage.setItem('harmony_user', JSON.stringify(data.user));
            return data;
        } catch (error) {
            throw error;
        }
    }

    // Оновлення профілю
    async updateProfile(userId, data) {
        try {
            const response = await fetch(`${this.baseURL}/api/user/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Помилка оновлення профілю');
            }

            const result = await response.json();
            this.user = result.user;
            localStorage.setItem('harmony_user', JSON.stringify(result.user));
            return result;
        } catch (error) {
            throw error;
        }
    }

    // Завантаження пісні
    async uploadSong(userId, file, metadata = {}) {
        try {
            const formData = new FormData();
            formData.append('audio', file);
            formData.append('userId', userId);
            formData.append('title', metadata.title || '');
            formData.append('artist', metadata.artist || '');

            const response = await fetch(`${this.baseURL}/api/songs/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Помилка завантаження пісні');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    // Отримання пісень користувача
    async getUserSongs(userId) {
        try {
            const response = await fetch(`${this.baseURL}/api/songs/user/${userId}`);
            if (!response.ok) {
                throw new Error('Помилка отримання пісень');
            }
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    // Створення плейлиста
    async createPlaylist(userId, name, description = '') {
        try {
            const response = await fetch(`${this.baseURL}/api/playlists`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId, name, description })
            });

            if (!response.ok) {
                throw new Error('Помилка створення плейлиста');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    // Отримання плейлистів користувача
    async getUserPlaylists(userId) {
        try {
            const response = await fetch(`${this.baseURL}/api/playlists/user/${userId}`);
            if (!response.ok) {
                throw new Error('Помилка отримання плейлистів');
            }
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    // Додавання пісні до плейлиста
    async addSongToPlaylist(playlistId, songId) {
        try {
            const response = await fetch(`${this.baseURL}/api/playlists/${playlistId}/songs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ songId })
            });

            if (!response.ok) {
                throw new Error('Помилка додавання пісні до плейлиста');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    // Створення кімнати
    async createRoom(hostId, name, password = '') {
        try {
            const response = await fetch(`${this.baseURL}/api/rooms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ hostId, name, password })
            });

            if (!response.ok) {
                throw new Error('Помилка створення кімнати');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    // Приєднання до кімнати
    async joinRoom(code, password = '', userId) {
        try {
            const response = await fetch(`${this.baseURL}/api/rooms/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code, password, userId })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Помилка приєднання до кімнати');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    // Перевірка статусу API
    async checkAPIStatus() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

// Експорт для використання в інших файлах
window.HarmonyAPI = HarmonyAPI;
