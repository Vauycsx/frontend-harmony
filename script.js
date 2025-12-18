// Harmony Player - Main Script
// Backend URL - Updated to your Render backend
const BACKEND_URL = 'https://harmony-backend-4f00.onrender.com';

// Global State
let songs = [];
let playlists = [];
let currentTrackIndex = 0;
let isPlaying = false;
let currentPlaylistId = null;
let isLoggedIn = false;
let apiStatus = false;

// DOM Elements
let secretCodeInput, playBtn, apiStatusElement, loginSection, playerInterface;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎵 Harmony Player Initializing...');
    
    // Get DOM elements
    secretCodeInput = document.getElementById('secretCode');
    playBtn = document.getElementById('playBtn');
    apiStatusElement = document.getElementById('apiStatus');
    loginSection = document.getElementById('loginSection');
    playerInterface = document.getElementById('playerInterface');
    
    // Initialize
    init();
    
    // Start health check interval
    setInterval(checkHealth, 30000); // Check every 30 seconds
});

// Main initialization function
async function init() {
    console.log('🚀 Starting initialization...');
    
    try {
        // Check backend health
        apiStatus = await checkHealth();
        updateApiStatus(apiStatus);
        
        // Clear any demo data
        songs = [];
        playlists = [];
        
        // Update UI with empty state
        updateNowPlaying();
        updatePlaylistUI();
        updateSongsUI();
        
        // Check for saved login
        const savedCode = localStorage.getItem('harmony_access_code');
        if (savedCode && apiStatus) {
            secretCodeInput.value = savedCode;
            await attemptLogin(savedCode);
        }
        
        console.log('✅ Initialization complete');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showNotification('Initialization failed. Please refresh.', 'error');
    }
}

// Health check function
async function checkHealth() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${BACKEND_URL}/health`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            console.log('✅ Backend is healthy');
            return true;
        } else {
            console.warn(`⚠️ Backend responded with status: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.warn('⚠️ Backend health check failed:', error.message);
        return false;
    }
}

// Update API status display
function updateApiStatus(status) {
    if (!apiStatusElement) return;
    
    apiStatus = status;
    
    if (status) {
        apiStatusElement.textContent = 'API: Online';
        apiStatusElement.className = 'api-online';
    } else {
        apiStatusElement.textContent = 'API: Offline';
        apiStatusElement.className = 'api-offline';
    }
}

// Login handler
async function handleLogin(event) {
    if (event) event.preventDefault();
    
    const secretCode = secretCodeInput?.value.trim();
    
    if (!secretCode) {
        showNotification('Please enter an access code', 'error');
        return;
    }
    
    await attemptLogin(secretCode);
}

// Attempt login with code
async function attemptLogin(secretCode) {
    try {
        console.log('Attempting login...');
        
        // If API is offline, use offline mode
        if (!apiStatus) {
            console.warn('API is offline, using offline mode');
            completeLogin(secretCode, true);
            return;
        }
        
        // Try to authenticate with backend
        const response = await fetch(`${BACKEND_URL}/api/auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: secretCode })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Login successful:', data);
            completeLogin(secretCode, true);
            localStorage.setItem('harmony_access_code', secretCode);
            showNotification('Login successful!', 'success');
        } else {
            // For demo, accept any non-empty code
            if (secretCode.length > 0) {
                completeLogin(secretCode, false);
                showNotification('Logged in (offline mode)', 'warning');
            } else {
                document.getElementById('loginError').style.display = 'block';
                showNotification('Invalid access code', 'error');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        // Fallback to offline mode
        if (secretCode.length > 0) {
            completeLogin(secretCode, false);
            showNotification('Logged in (offline mode)', 'warning');
        }
    }
}

// Complete login process
function completeLogin(secretCode, online) {
    isLoggedIn = true;
    
    // Hide login, show player
    if (loginSection) loginSection.style.display = 'none';
    if (playerInterface) playerInterface.classList.remove('hidden');
    
    // Update status
    const statusText = online ? 'Online' : 'Offline';
    document.getElementById('appStatus').innerHTML = `App Status: <span style="color: ${online ? '#10b981' : '#f59e0b'}">${statusText}</span>`;
    
    // Load user data if online
    if (online && apiStatus) {
        loadUserData();
    }
}

// Load user data from backend
async function loadUserData() {
    if (!apiStatus) return;
    
    try {
        console.log('Loading user data...');
        
        // Load songs
        const songsResponse = await fetch(`${BACKEND_URL}/api/songs`);
        if (songsResponse.ok) {
            songs = await songsResponse.json();
            updateSongsUI();
        }
        
        // Load playlists
        const playlistsResponse = await fetch(`${BACKEND_URL}/api/playlists`);
        if (playlistsResponse.ok) {
            playlists = await playlistsResponse.json();
            updatePlaylistUI();
        }
        
        showNotification('Data loaded successfully', 'success');
    } catch (error) {
        console.error('Failed to load user data:', error);
        showNotification('Could not load data', 'error');
    }
}

// Update songs UI
function updateSongsUI() {
    const container = document.getElementById('songsContainer');
    if (!container) return;
    
    if (songs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No songs available. Add songs to start listening!</p>
                <button onclick="addSampleSong()" style="margin-top: 15px;">Add Sample Song</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    songs.forEach((song, index) => {
        const songElement = document.createElement('div');
        songElement.className = 'song-item';
        songElement.innerHTML = `
            <div>
                <strong>${song.title || 'Unknown Song'}</strong>
                <div style="font-size: 0.9em; opacity: 0.8;">${song.artist || 'Unknown Artist'} • ${song.duration || '3:45'}</div>
            </div>
            <button class="control-btn" style="width: 40px; height: 40px;" onclick="playSong(${index})">▶</button>
        `;
        container.appendChild(songElement);
    });
}

// Update playlist UI
function updatePlaylistUI() {
    const container = document.getElementById('playlistsContainer');
    if (!container) return;
    
    if (playlists.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No playlists yet. Create your first playlist!</p>
                <button onclick="createNewPlaylist()" style="margin-top: 15px;">Create Playlist</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    playlists.forEach(playlist => {
        const playlistElement = document.createElement('div');
        playlistElement.className = 'playlist-card';
        playlistElement.innerHTML = `
            <h3>${playlist.name || 'Unnamed Playlist'}</h3>
            <p>${playlist.songCount || 0} songs</p>
            <button onclick="playPlaylist('${playlist.id}')" style="margin-top: 10px; padding: 8px 16px; background: rgba(139, 92, 246, 0.2); border: none; border-radius: 6px; color: white; cursor: pointer;">
                Play
            </button>
        `;
        container.appendChild(playlistElement);
    });
}

// Update now playing display
function updateNowPlaying() {
    const titleElement = document.getElementById('currentSongTitle');
    const artistElement = document.getElementById('currentArtist');
    
    if (songs.length === 0 || currentTrackIndex >= songs.length) {
        if (titleElement) titleElement.textContent = 'No song selected';
        if (artistElement) artistElement.textContent = '–';
        return;
    }
    
    const currentSong = songs[currentTrackIndex];
    if (titleElement) titleElement.textContent = currentSong.title || 'Unknown Song';
    if (artistElement) artistElement.textContent = currentSong.artist || 'Unknown Artist';
}

// Player controls
function togglePlay() {
    if (songs.length === 0) {
        showNotification('No songs to play', 'warning');
        return;
    }
    
    isPlaying = !isPlaying;
    
    if (playBtn) {
        playBtn.textContent = isPlaying ? '⏸' : '▶';
    }
    
    if (isPlaying) {
        startPlayback();
        showNotification('Now playing', 'success');
    } else {
        pausePlayback();
        showNotification('Paused', 'info');
    }
}

function startPlayback() {
    // Simulate playback progress
    const progressBar = document.getElementById('progress');
    if (progressBar) {
        let width = 0;
        const interval = setInterval(() => {
            if (!isPlaying) {
                clearInterval(interval);
                return;
            }
            if (width >= 100) {
                clearInterval(interval);
                nextTrack();
                return;
            }
            width += 0.5;
            progressBar.style.width = width + '%';
        }, 300);
    }
}

function pausePlayback() {
    // Pause logic
}

function nextTrack() {
    if (songs.length === 0) return;
    
    currentTrackIndex = (currentTrackIndex + 1) % songs.length;
    updateNowPlaying();
    if (isPlaying) {
        startPlayback();
    }
}

function previousTrack() {
    if (songs.length === 0) return;
    
    currentTrackIndex = currentTrackIndex > 0 ? currentTrackIndex - 1 : songs.length - 1;
    updateNowPlaying();
    if (isPlaying) {
        startPlayback();
    }
}

function playSong(index) {
    if (index >= 0 && index < songs.length) {
        currentTrackIndex = index;
        isPlaying = true;
        updateNowPlaying();
        
        if (playBtn) {
            playBtn.textContent = '⏸';
        }
        
        startPlayback();
        showNotification('Playing song', 'success');
    }
}

// Playlist functions
function createNewPlaylist() {
    const name = prompt('Enter playlist name:');
    if (name && name.trim()) {
        const newPlaylist = {
            id: 'pl_' + Date.now(),
            name: name.trim(),
            songCount: 0,
            songs: []
        };
        
        playlists.push(newPlaylist);
        updatePlaylistUI();
        showNotification(`Playlist "${name}" created`, 'success');
    }
}

function playPlaylist(playlistId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist && playlist.songs && playlist.songs.length > 0) {
        // In a real app, you would load the playlist songs
        showNotification(`Playing playlist: ${playlist.name}`, 'success');
    } else {
        showNotification('Playlist is empty', 'warning');
    }
}

// Sample data functions (for testing)
function addSampleSong() {
    const sampleSongs = [
        { title: 'Sample Track 1', artist: 'Harmony Player', duration: '3:30' },
        { title: 'Chill Vibes', artist: 'Test Artist', duration: '4:15' },
        { title: 'Morning Coffee', artist: 'Lo-Fi Beats', duration: '2:45' }
    ];
    
    const randomSong = sampleSongs[Math.floor(Math.random() * sampleSongs.length)];
    songs.push(randomSong);
    updateSongsUI();
    showNotification('Sample song added', 'success');
}

// Utility functions
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        z-index: 1000;
        font-weight: 500;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    // Style based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    notification.style.background = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Error handling
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showNotification('An error occurred. Check console.', 'error');
});

console.log('🎵 Harmony Player script loaded');
