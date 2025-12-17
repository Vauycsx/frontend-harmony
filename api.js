// Harmony API Service - 2025
class HarmonyAPIService {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('harmony_token');
    }
    
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('harmony_token', token);
        } else {
            localStorage.removeItem('harmony_token');
        }
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }
    
    // Користувачі
    async login(secretCode) {
        return this.request('/api/login', {
            method: 'POST',
            body: JSON.stringify({ secretCode })
        });
    }
    
    async getProfile() {
        return this.request('/api/profile');
    }
    
    async updateProfile(data) {
        return this.request('/api/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    // Пісні
    async uploadSong(songData) {
        return this.request('/api/songs', {
            method: 'POST',
            body: JSON.stringify(songData)
        });
    }
    
    async getSongs() {
        return this.request('/api/songs');
    }
    
    async deleteSong(id) {
        return this.request(`/api/songs/${id}`, {
            method: 'DELETE'
        });
    }
    
    // Плейлисти
    async createPlaylist(data) {
        return this.request('/api/playlists', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async getPlaylists() {
        return this.request('/api/playlists');
    }
    
    async updatePlaylist(id, data) {
        return this.request(`/api/playlists/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async deletePlaylist(id) {
        return this.request(`/api/playlists/${id}`, {
            method: 'DELETE'
        });
    }
    
    // Кімнати
    async createRoom(data) {
        return this.request('/api/rooms', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async joinRoom(data) {
        return this.request('/api/rooms/join', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    // Демо дані
    async getDemoSongs() {
        return this.request('/api/demo-songs');
    }
    
    // Health check
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return response.ok;
        } catch {
            return false;
        }
    }
}

// Створюємо глобальний екземпляр
window.harmonyAPI = new HarmonyAPIService('');