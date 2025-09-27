// Car Data - Load from localStorage or use default
let carsData = [];

// Load cars data from localStorage (managed by admin dashboard)
function loadCarsData() {
    const useLocalFallback = () => {
        carsData = [];
    };

    // Try Firebase first if available
    try {
        if (window.exoticFirebase && window.exoticFirebase.db) {
            window.exoticFirebase.db.ref('cars').on('value', snap => {
                const remote = snap.val();
                if (Array.isArray(remote)) {
                    carsData = remote;
                    renderCars();
                    maybeOpenCarFromUrl();
                    loadAvailableCars();
                } else {
                    carsData = [];
                    renderCars();
                    loadAvailableCars();
                }
            }, () => {
                useLocalFallback();
                renderCars();
                loadAvailableCars();
            });
            return;
        }
    } catch(e) {
        console.warn('Firebase unavailable; using local data', e);
    }
    // Fallback to local
    useLocalFallback();
    loadAvailableCars();
}

// Global Variables
let currentFilter = 'all';
let currentSort = 'name';
let favoriteCars = JSON.parse(localStorage.getItem('favoriteCars')) || [];
let heroVideoPlayer = null;

// Comparison Tool Variables
let comparisonCars = [];
let availableCarsForComparison = [];

// DOM Elements
const carsGrid = document.getElementById('carsGrid');
const carSearch = document.getElementById('carSearch');
const filterButtons = document.querySelectorAll('.filter-btn');
const sortSelect = document.getElementById('sortSelect');
const carModal = document.getElementById('carModal');
const modalBody = document.getElementById('modalBody');
const contactForm = document.getElementById('contactForm');
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
// Advanced filter elements
const yearMinInput = document.getElementById('yearMin');
const yearMaxInput = document.getElementById('yearMax');
const hpMinInput = document.getElementById('hpMin');
const hasVideoInput = document.getElementById('hasVideo');
const onlyFavoritesInput = document.getElementById('onlyFavorites');
// Comparison tool elements
const comparisonSearch = document.getElementById('comparisonSearch');
const availableCars = document.getElementById('availableCars');
const comparisonResults = document.getElementById('comparisonResults');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadCarsData(); // Load cars data first
    setupEventListeners();
    renderCars();
    maybeOpenCarFromUrl();
    setupScrollAnimations();
    setupNavbar();
    setupContactForm();
    setupVideoPlayer();
    setupMobileVideoPermission();
    setupComparisonTool();
    setupQuoteForm();
    setupTestDriveForm();
}

// Video.js Setup
function setupVideoPlayer() {
    // Wait for Plyr to be available
    if (typeof Plyr === 'undefined') {
        setTimeout(setupVideoPlayer, 100);
        return;
    }
    
    const videoElement = document.getElementById('hero-video');
    if (!videoElement) return;
    
    console.log('Setting up Plyr video player');
    
    // Initialize Plyr player with mobile autoplay support
    heroVideoPlayer = new Plyr(videoElement, {
        controls: false,
        autoplay: true,
        muted: true,
        loop: { active: true },
        playsinline: true,
        preload: 'auto',
        ratio: '16:9',
        quality: {
            default: 720,
            options: [1080, 720, 480, 360]
        },
        settings: [],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        volume: 0,
        clickToPlay: false,
        hideControls: true,
        resetOnEnd: false,
        disableContextMenu: true,
        keyboard: { focused: false, global: false },
        tooltips: { controls: false, seek: false },
        captions: { active: false, language: 'auto', update: false },
        fullscreen: { enabled: false, fallback: false, iosNative: false },
        storage: { enabled: false },
        listeners: {
            ready: () => {
                console.log('Plyr player ready');
                // Try to play immediately on mobile
                if (isMobileDevice()) {
                    attemptMobileAutoplay();
                }
            },
            loadstart: () => {
                console.log('Video loading started');
            },
            canplay: () => {
                console.log('Video can start playing');
            },
            loadeddata: () => {
                console.log('Video loaded successfully');
            },
            error: (e) => {
                console.log('Plyr error:', e);
                showVideoErrorFallback();
            },
            play: () => {
                console.log('Video started playing');
                // Hide play button when video starts
                const playButton = document.querySelector('.video-play-button');
                if (playButton) {
                    playButton.style.display = 'none';
                }
            },
            pause: () => {
                console.log('Video paused');
            }
        }
    });
    
    // Apply custom styling
    const plyrContainer = document.querySelector('.plyr');
    if (plyrContainer) {
        plyrContainer.style.position = 'absolute';
        plyrContainer.style.top = '0';
        plyrContainer.style.left = '0';
        plyrContainer.style.width = '100%';
        plyrContainer.style.height = '100%';
        plyrContainer.style.objectFit = 'cover';
        plyrContainer.style.opacity = '0.35';
    }
}

function attemptMobileAutoplay() {
    if (!heroVideoPlayer) return;
    
    console.log('Attempting mobile autoplay');
    
    // Try multiple strategies for mobile autoplay
    const tryPlay = () => {
        heroVideoPlayer.play().then(() => {
            console.log('Mobile autoplay successful');
        }).catch(e => {
            console.log('Mobile autoplay failed:', e);
            // Show play button as fallback
            showVideoPlayButton();
        });
    };
    
    // Try immediately
    tryPlay();
    
    // Try after a short delay
    setTimeout(tryPlay, 500);
    
    // Try on first user interaction
    const tryOnInteraction = () => {
        tryPlay();
        document.removeEventListener('touchstart', tryOnInteraction);
        document.removeEventListener('click', tryOnInteraction);
    };
    
    document.addEventListener('touchstart', tryOnInteraction, { once: true });
    document.addEventListener('click', tryOnInteraction, { once: true });
}

function setupNativeVideo() {
    // Setup native HTML5 video for mobile
    const videoElement = document.getElementById('hero-video');
    if (!videoElement) return;
    
    // Remove Video.js classes and attributes
    videoElement.className = 'hero-video';
    videoElement.removeAttribute('data-setup');
    
    // Set native video attributes
    videoElement.muted = true;
    videoElement.loop = true;
    videoElement.playsInline = true;
    videoElement.setAttribute('webkit-playsinline', 'true');
    videoElement.setAttribute('playsinline', 'true');
    videoElement.preload = 'auto';
    
    // Add event listeners
    videoElement.addEventListener('loadstart', () => {
        console.log('Native video loading started');
    });
    
    videoElement.addEventListener('canplay', () => {
        console.log('Native video can start playing');
    });
    
    videoElement.addEventListener('loadeddata', () => {
        console.log('Native video loaded successfully');
    });
    
    videoElement.addEventListener('error', (e) => {
        console.log('Native video error:', e);
        console.log('Native video error details:', {
            error: e,
            networkState: videoElement.networkState,
            readyState: videoElement.readyState,
            src: videoElement.src,
            currentSrc: videoElement.currentSrc
        });
        showVideoErrorFallback();
    });
    
    // Apply styling
    videoElement.style.position = 'absolute';
    videoElement.style.top = '0';
    videoElement.style.left = '0';
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    videoElement.style.objectFit = 'cover';
    videoElement.style.opacity = '0.35';
}

// Mobile Video Permission Functions
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           (window.innerWidth <= 768 && 'ontouchstart' in window);
}

function setupMobileVideoPermission() {
    if (isMobileDevice()) {
        // Check if permission was already granted
        const videoPermission = localStorage.getItem('videoPermission');
        if (!videoPermission) {
            showVideoPermissionModal();
        } else if (videoPermission === 'granted') {
            // Permission was granted, try autoplay with Plyr
            enableVideoAutoplay();
        } else {
            // Permission was denied, show play button
            showVideoPlayButton();
        }
    } else {
        // Desktop - enable video autoplay directly
        enableVideoAutoplay();
    }
}

function showVideoPermissionModal() {
    // Create permission modal
    const modal = document.createElement('div');
    modal.id = 'videoPermissionModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(10px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="
            background: var(--secondary-black);
            border: 2px solid var(--border-gray);
            border-radius: 15px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            animation: modalSlideIn 0.3s ease-out;
        ">
            <div style="
                width: 80px;
                height: 80px;
                background: linear-gradient(45deg, #ff6b6b, #ff8e53);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 30px;
            ">
                <i class="fas fa-video" style="font-size: 2rem; color: white;"></i>
            </div>
            
            <h2 style="
                font-family: var(--font-primary);
                font-size: 1.8rem;
                font-weight: 700;
                margin-bottom: 20px;
                color: var(--primary-white);
            ">Enable Video Experience</h2>
            
            <p style="
                color: var(--light-gray);
                line-height: 1.6;
                margin-bottom: 30px;
                font-size: 16px;
            ">
                To provide you with the best experience, we'd like to play videos automatically. 
                This will enhance your browsing experience with our car collection.
            </p>
            
            <div style="
                display: flex;
                gap: 15px;
                justify-content: center;
                flex-wrap: wrap;
            ">
                <button id="allowVideos" style="
                    padding: 15px 30px;
                    background: linear-gradient(45deg, #ff6b6b, #ff8e53);
                    border: none;
                    color: white;
                    font-family: var(--font-secondary);
                    font-size: 16px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    border-radius: 5px;
                    cursor: pointer;
                    transition: var(--transition);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                ">
                    <i class="fas fa-play"></i>
                    Allow Videos
                </button>
                
                <button id="skipVideos" style="
                    padding: 15px 30px;
                    background: transparent;
                    border: 2px solid var(--border-gray);
                    color: var(--light-gray);
                    font-family: var(--font-secondary);
                    font-size: 16px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    border-radius: 5px;
                    cursor: pointer;
                    transition: var(--transition);
                ">
                    Skip for Now
                </button>
            </div>
            
            <p style="
                color: var(--light-gray);
                font-size: 12px;
                margin-top: 20px;
                opacity: 0.7;
            ">
                You can change this setting anytime in your browser preferences
            </p>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add hover effects
    const allowBtn = modal.querySelector('#allowVideos');
    const skipBtn = modal.querySelector('#skipVideos');
    
    allowBtn.addEventListener('mouseenter', () => {
        allowBtn.style.transform = 'translateY(-2px)';
        allowBtn.style.boxShadow = '0 10px 20px rgba(255, 107, 107, 0.3)';
    });
    
    allowBtn.addEventListener('mouseleave', () => {
        allowBtn.style.transform = 'translateY(0)';
        allowBtn.style.boxShadow = 'none';
    });
    
    skipBtn.addEventListener('mouseenter', () => {
        skipBtn.style.borderColor = 'var(--primary-white)';
        skipBtn.style.color = 'var(--primary-white)';
    });
    
    skipBtn.addEventListener('mouseleave', () => {
        skipBtn.style.borderColor = 'var(--border-gray)';
        skipBtn.style.color = 'var(--light-gray)';
    });
    
    // Event listeners
    allowBtn.addEventListener('click', () => {
        localStorage.setItem('videoPermission', 'granted');
        
        // Enable video play on mobile (no autoplay)
        enableVideoPlayOnMobile();
        
        // Try to play video directly since we have user interaction
        if (heroVideoPlayer) {
            // Plyr player
            heroVideoPlayer.play().then(() => {
                console.log('Plyr video started playing after user interaction');
                // Hide any existing play button
                const playButton = document.querySelector('.video-play-button');
                if (playButton) {
                    playButton.style.display = 'none';
                }
            }).catch(e => {
                console.log('Plyr video play failed even with user interaction:', e);
                // If play fails, show play button
                showVideoPlayButton();
            });
        }
        
        closeVideoPermissionModal();
        showNotification('Video enabled! Click the play button to start.', 'success');
    });
    
    skipBtn.addEventListener('click', () => {
        localStorage.setItem('videoPermission', 'denied');
        enableVideoPlayOnMobile(); // Still show play button
        closeVideoPermissionModal();
        showNotification('You can play videos by clicking the play button.', 'info');
    });
}

function closeVideoPermissionModal() {
    const modal = document.getElementById('videoPermissionModal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease-in';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
}

function enableVideoAutoplay() {
    // Enable video autoplay for hero video using Plyr
    if (heroVideoPlayer) {
        // Plyr handles autoplay automatically, but we can try to play
        setTimeout(() => {
            heroVideoPlayer.play().then(() => {
                console.log('Plyr video autoplay successful');
                // Hide any existing play button
                const playButton = document.querySelector('.video-play-button');
                if (playButton) {
                    playButton.style.display = 'none';
                }
            }).catch(e => {
                console.log('Plyr video autoplay failed:', e);
                // If autoplay fails, show a play button
                showVideoPlayButton();
                // Also set up user interaction listener as fallback
                setupUserInteractionVideoPlay();
            });
        }, 500);
    }
    
    // Enable video autoplay for car videos (native HTML5)
    const carVideos = document.querySelectorAll('.car-video');
    carVideos.forEach(video => {
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('playsinline', 'true');
    });
}

function enableVideoPlayOnMobile() {
    // For mobile: only play video when user explicitly allows it using native HTML5
    const heroVideo = document.querySelector('.hero-video');
    if (heroVideo) {
        // Set video attributes but NO autoplay
        heroVideo.muted = true;
        heroVideo.loop = true;
        heroVideo.playsInline = true;
        heroVideo.setAttribute('webkit-playsinline', 'true');
        heroVideo.setAttribute('playsinline', 'true');
        
        // Don't set autoplay - only play when user clicks
        heroVideo.autoplay = false;
        
        // Check if video source is valid
        checkVideoSource(heroVideo);
    }
    
    // Enable video attributes for car videos (but no autoplay)
    const carVideos = document.querySelectorAll('.car-video');
    carVideos.forEach(video => {
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('playsinline', 'true');
    });
}

function checkVideoSourceVideoJS() {
    if (!heroVideoPlayer) return;
    
    // Check if video can load
    heroVideoPlayer.on('loadeddata', () => {
        console.log('Video.js loaded successfully');
        showVideoPlayButton();
    });
    
    heroVideoPlayer.on('error', (e) => {
        console.log('Video.js failed to load:', e);
        const error = heroVideoPlayer.error();
        if (error) {
            console.log('Video.js error details:', {
                code: error.code,
                message: error.message,
                type: error.type
            });
        }
        showVideoErrorFallback();
    });
    
    heroVideoPlayer.on('loadstart', () => {
        console.log('Video.js loading started');
    });
    
    heroVideoPlayer.on('canplay', () => {
        console.log('Video.js can start playing');
    });
    
    // Set a timeout to show play button even if video doesn't load
    setTimeout(() => {
        if (heroVideoPlayer.readyState() < 2) { // HAVE_CURRENT_DATA
            console.log('Video.js loading timeout, showing play button anyway');
            console.log('Video.js state at timeout:', {
                networkState: heroVideoPlayer.networkState(),
                readyState: heroVideoPlayer.readyState()
            });
            showVideoPlayButton();
        }
    }, 3000);
}

function checkVideoSource(video) {
    // Check if video can load
    video.addEventListener('loadeddata', () => {
        console.log('Video loaded successfully');
        showVideoPlayButton();
    });
    
    video.addEventListener('error', (e) => {
        console.log('Video failed to load:', e);
        console.log('Video error details:', {
            error: e,
            networkState: video.networkState,
            readyState: video.readyState,
            src: video.src,
            currentSrc: video.currentSrc
        });
        showVideoErrorFallback();
    });
    
    video.addEventListener('loadstart', () => {
        console.log('Video loading started');
    });
    
    video.addEventListener('canplay', () => {
        console.log('Video can start playing');
    });
    
    // Try to load the video
    video.load();
    
    // Set a timeout to show play button even if video doesn't load
    setTimeout(() => {
        if (video.readyState < 2) { // HAVE_CURRENT_DATA
            console.log('Video loading timeout, showing play button anyway');
            console.log('Video state at timeout:', {
                networkState: video.networkState,
                readyState: video.readyState,
                src: video.src,
                currentSrc: video.currentSrc
            });
            showVideoPlayButton();
        }
    }, 3000);
}

function showVideoErrorFallback() {
    const heroSection = document.querySelector('.hero');
    if (heroSection && !document.querySelector('.video-error-message')) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'video-error-message';
        errorMessage.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: var(--light-gray);
            z-index: 10;
            background: rgba(0, 0, 0, 0.7);
            padding: 20px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        `;
        errorMessage.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; color: #ff6b6b;"></i>
            <p>Video temporarily unavailable</p>
            <p style="font-size: 14px; margin-top: 5px;">Please try again later</p>
        `;
        heroSection.appendChild(errorMessage);
    }
}

function setupUserInteractionVideoPlay() {
    // Try to play video on any user interaction
    const tryPlayVideo = () => {
        if (heroVideoPlayer) {
            // Plyr player
            if (heroVideoPlayer.paused) {
                heroVideoPlayer.play().then(() => {
                    console.log('Plyr video started playing after user interaction');
                    // Hide play button
                    const playButton = document.querySelector('.video-play-button');
                    if (playButton) {
                        playButton.style.display = 'none';
                    }
                    // Remove event listeners since video is now playing
                    document.removeEventListener('touchstart', tryPlayVideo);
                    document.removeEventListener('click', tryPlayVideo);
                }).catch(e => {
                    console.log('Plyr video play failed on user interaction:', e);
                });
            }
        } else {
            // Fallback to native video
            const heroVideo = document.querySelector('.hero-video');
            if (heroVideo && heroVideo.paused) {
                heroVideo.play().then(() => {
                    console.log('Native video started playing after user interaction');
                    // Hide play button
                    const playButton = document.querySelector('.video-play-button');
                    if (playButton) {
                        playButton.style.display = 'none';
                    }
                    // Remove event listeners since video is now playing
                    document.removeEventListener('touchstart', tryPlayVideo);
                    document.removeEventListener('click', tryPlayVideo);
                }).catch(e => {
                    console.log('Native video play failed on user interaction:', e);
                });
            }
        }
    };
    
    // Add event listeners for user interaction
    document.addEventListener('touchstart', tryPlayVideo, { once: true });
    document.addEventListener('click', tryPlayVideo, { once: true });
}

function showVideoPlayButton() {
    const heroSection = document.querySelector('.hero');
    if (heroSection && !document.querySelector('.video-play-button')) {
        const playButton = document.createElement('button');
        playButton.className = 'video-play-button';
        playButton.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80px;
            height: 80px;
            background: rgba(255, 255, 255, 0.2);
            border: 3px solid white;
            border-radius: 50%;
            color: white;
            font-size: 2rem;
            cursor: pointer;
            z-index: 10;
            transition: var(--transition);
            backdrop-filter: blur(10px);
        `;
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        
        playButton.addEventListener('click', () => {
            if (heroVideoPlayer) {
                // Plyr player
                heroVideoPlayer.play().then(() => {
                    playButton.style.display = 'none';
                }).catch(e => {
                    console.log('Plyr video play failed:', e);
                });
            } else {
                // Fallback to native video
                const heroVideo = document.querySelector('.hero-video');
                if (heroVideo) {
                    heroVideo.play().then(() => {
                        playButton.style.display = 'none';
                    }).catch(e => {
                        console.log('Native video play failed:', e);
                    });
                }
            }
        });
        
        playButton.addEventListener('mouseenter', () => {
            playButton.style.transform = 'translate(-50%, -50%) scale(1.1)';
            playButton.style.background = 'rgba(255, 255, 255, 0.3)';
        });
        
        playButton.addEventListener('mouseleave', () => {
            playButton.style.transform = 'translate(-50%, -50%) scale(1)';
            playButton.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        
        heroSection.appendChild(playButton);
    }
}

// Event Listeners
function setupEventListeners() {
    // Search functionality
    carSearch.addEventListener('input', debounce(handleSearch, 300));
    
    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => handleFilter(btn.dataset.filter));
    });
    
    // Sort functionality
    sortSelect.addEventListener('change', (e) => handleSort(e.target.value));
    
    // Modal close
    window.addEventListener('click', (e) => {
        if (e.target === carModal) {
            closeCarModal();
        }
    });
    
    // Mobile menu
    hamburger.addEventListener('click', toggleMobileMenu);
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            scrollToSection(targetId);
        });
    });
    // Search and filters
    if (carSearch) carSearch.addEventListener('input', debounce(handleSearch, 250));
    if (sortSelect) sortSelect.addEventListener('change', (e) => handleSort(e.target.value));
    filterButtons.forEach(btn => btn.addEventListener('click', () => handleFilter(btn.dataset.filter)));

    // Advanced filters
    if (yearMinInput) yearMinInput.addEventListener('input', debounce(renderCars, 200));
    if (yearMaxInput) yearMaxInput.addEventListener('input', debounce(renderCars, 200));
    if (hpMinInput) hpMinInput.addEventListener('input', debounce(renderCars, 200));
    if (hasVideoInput) hasVideoInput.addEventListener('change', renderCars);
    if (onlyFavoritesInput) onlyFavoritesInput.addEventListener('change', renderCars);
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCarModal();
        }
    });
    
    // Comparison tool event listeners
    if (comparisonSearch) {
        comparisonSearch.addEventListener('input', debounce(handleComparisonSearch, 300));
    }
}

// Car Rendering Functions
function renderCars() {
    let filteredCars = filterCars(carsData);
    filteredCars = sortCars(filteredCars);
    
    carsGrid.innerHTML = '';
    
    if (filteredCars.length === 0) {
        carsGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search" style="font-size: 3rem; color: #666; margin-bottom: 20px;"></i>
                <h3>No cars found</h3>
                <p>Try adjusting your search or filter criteria</p>
            </div>
        `;
        return;
    }
    
    filteredCars.forEach(car => {
        const carCard = createCarCard(car);
        carsGrid.appendChild(carCard);
    });
    
    // Add fade-in animation
    setTimeout(() => {
        document.querySelectorAll('.car-card').forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('fade-in', 'visible');
            }, index * 100);
        });
    }, 100);
}

function createCarCard(car) {
    const card = document.createElement('div');
    card.className = `car-card fade-in ${car.video ? 'reel-card' : ''}`;
    const specs = car.specs || {};
    card.innerHTML = `
        <div class="car-image ${car.video ? 'reel-image' : ''}">
            ${car.video ? `
                <div class="reel-container" onmouseenter="playVideo(this)" onmouseleave="pauseVideo(this)">
                    <video 
                        src="${car.video}" 
                        poster="${car.image}"
                        muted
                        loop
                        preload="metadata"
                        playsinline
                        webkit-playsinline
                        class="car-video">
                        Your browser does not support the video tag.
                    </video>
                    <div class="reel-overlay">
                        <i class="fas fa-play"></i>
                        <span>Hover to play</span>
                    </div>
                </div>
            ` : `
                <img src="${car.image}" alt="${car.name}" loading="lazy">
            `}
            <div class="car-badge">${(car.category || '').toString().toUpperCase()}</div>
        </div>
        <div class="car-info">
            <h3 class="car-name">${car.name}</h3>
            <p class="car-year">${car.year}</p>
            <div class="car-specs">
                <span><i class="fas fa-tachometer-alt"></i> ${specs.horsepower || ''}</span>
                <span><i class="fas fa-bolt"></i> ${specs.acceleration || ''}</span>
                <span><i class="fas fa-gauge-high"></i> ${specs.topSpeed || ''}</span>
            </div>
            
            <div class="car-actions">
                <button class="btn-view" onclick="openCarModal('${car.id}')">
                    <i class="fas fa-eye"></i> View Details
                </button>
                <button class="btn-favorite ${favoriteCars.map(String).includes(String(car.id)) ? 'active' : ''}" 
                        onclick="toggleFavorite('${car.id}')">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Filter and Search Functions
function filterCars(cars) {
    let filtered = cars;
    
    // Category filter
    if (currentFilter !== 'all') {
        const cf = currentFilter.toLowerCase();
        filtered = filtered.filter(car => (car.category || '').toLowerCase() === cf);
    }
    
    // Search filter
    const searchTerm = (carSearch?.value || '').toLowerCase().trim();
    if (searchTerm) {
        filtered = filtered.filter(car => {
            const specs = car.specs || {};
            const haystack = [
                car.name,
                car.category,
                specs.engine,
                specs.horsepower,
                specs.acceleration,
                specs.topSpeed,
                String(car.year)
            ].map(v => (v || '').toString().toLowerCase());
            return haystack.some(field => field.includes(searchTerm));
        });
    }
    
    // Advanced filters
    const yearMin = parseInt(yearMinInput?.value || '0', 10) || null;
    const yearMax = parseInt(yearMaxInput?.value || '0', 10) || null;
    const hpMin = parseInt(hpMinInput?.value || '0', 10) || null;
    const onlyWithVideo = !!(hasVideoInput && hasVideoInput.checked);
    const onlyFavs = !!(onlyFavoritesInput && onlyFavoritesInput.checked);

    if (yearMin) filtered = filtered.filter(car => (car.year || 0) >= yearMin);
    if (yearMax) filtered = filtered.filter(car => (car.year || 0) <= yearMax);
    if (hpMin) filtered = filtered.filter(car => {
        const hp = (car.specs && car.specs.horsepower) ? parseInt((car.specs.horsepower + '').replace(/[^0-9]/g, ''), 10) : 0;
        return hp >= hpMin;
    });
    if (onlyWithVideo) filtered = filtered.filter(car => !!car.video);
    if (onlyFavs) filtered = filtered.filter(car => favoriteCars.map(String).includes(String(car.id)));

    return filtered;
}

// Deep-link handling: open car modal if carId exists in URL
function maybeOpenCarFromUrl() {
    try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('carId');
        if (!id) return;
        if (!carsData || carsData.length === 0) {
            setTimeout(maybeOpenCarFromUrl, 300);
            return;
        }
        const section = document.getElementById('showroom');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
        openCarModal(id);
    } catch (e) {}
}

function sortCars(cars) {
    return cars.sort((a, b) => {
        switch (currentSort) {
            case 'name':
                return a.name.localeCompare(b.name);
            // price-based sorting removed
            case 'year':
                return b.year - a.year;
            default:
                return 0;
        }
    });
}

// parsePrice removed

function handleFilter(filter) {
    currentFilter = filter;
    
    // Update active button
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    renderCars();
}

function handleSearch() {
    renderCars();
}

function handleSort(sort) {
    currentSort = sort;
    renderCars();
}

// Modal Functions
function openCarModal(carId) {
    const car = carsData.find(c => String(c.id) === String(carId));
    if (!car) return;
    const specs = car.specs || {};
    const features = Array.isArray(car.features) ? car.features : [];
    
    modalBody.innerHTML = `
        <div class="modal-car-details">
            <div class="modal-car-image">
                ${car.video ? `
                    <video 
                        src="${car.video}" 
                        poster="${car.image}"
                        controls
                        preload="metadata"
                        playsinline
                        webkit-playsinline
                        class="modal-video">
                        Your browser does not support the video tag.
                    </video>
                ` : `
                    <img src="${car.image}" alt="${car.name}">
                `}
            </div>
            <div class="modal-car-info">
                <h2 class="modal-car-name">${car.name}</h2>
                <p class="modal-car-year">${car.year}</p>
                <p class="modal-car-description">${car.description || ''}</p>
                
                <div class="modal-specs">
                    <h3>Specifications</h3>
                    <div class="specs-grid">
                        <div class="spec-item">
                            <span class="spec-label">Engine:</span>
                            <span class="spec-value">${specs.engine || ''}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Horsepower:</span>
                            <span class="spec-value">${specs.horsepower || ''}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">0-60 mph:</span>
                            <span class="spec-value">${specs.acceleration || ''}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Top Speed:</span>
                            <span class="spec-value">${specs.topSpeed || ''}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Battery Capacity:</span>
                            <span class="spec-value">${specs.batteryCapacity || ''}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Mileage:</span>
                            <span class="spec-value">${specs.mileage || ''}</span>
                        </div>
                    </div>
                </div>
                
                <div class="modal-features">
                    <h3>Key Features</h3>
                    <ul class="features-list">
                        ${features.map(feature => `<li><i class="fas fa-check"></i>   ${feature}</li>`).join(' ')}
                    </ul>
                </div>
                
                <div class="modal-actions">
                    <button class="btn-primary" onclick="scheduleTestDrive('${car.id}')">
                        <i class="fas fa-calendar"></i> Schedule Test Drive
                    </button>
                    <button class="btn-secondary" onclick="requestQuote('${car.id}')">
                        <i class="fas fa-calculator"></i> Get Quote
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Lock background scroll while preserving position
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    document.body.dataset.scrollY = String(scrollY);
    document.body.classList.add('modal-open');
    document.body.style.top = `-${scrollY}px`;
    carModal.style.display = 'block';
}

function closeCarModal() {
    carModal.style.display = 'none';
    // Restore background scroll position
    const y = parseInt(document.body.dataset.scrollY || '0', 10);
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, y);
}

// Favorite Functions
function toggleFavorite(carId) {
    const idStr = String(carId);
    const currentIds = favoriteCars.map(String);
    const index = currentIds.indexOf(idStr);
    if (index > -1) {
        favoriteCars.splice(index, 1);
    } else {
        favoriteCars.push(idStr);
    }
    
    localStorage.setItem('favoriteCars', JSON.stringify(favoriteCars));
    renderCars();
    
    // Show notification
    const isFav = favoriteCars.map(String).includes(String(carId));
    showNotification(isFav ? 'Added to favorites' : 'Removed from favorites', isFav ? 'success' : 'info');
}


// Contact Form Functions
function setupContactForm() {
    contactForm.addEventListener('submit', handleContactSubmit);
}

function handleContactSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(contactForm);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        interest: formData.get('interest'),
        message: formData.get('message')
    };
    
    // Create lead object
    const lead = {
        id: generateLeadId(),
        name: data.name,
        email: data.email,
        phone: '', // Phone not captured in contact form
        interest: data.interest || 'general',
        source: 'contact-form',
        status: 'new',
        message: data.message,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Save lead to Firebase or localStorage
    saveLead(lead);
    
    // Simulate form submission
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = '<span class="loading"></span> Sending...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
        showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
        contactForm.reset();
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }, 2000);
}

// Lead Management Functions
function generateLeadId() {
    return 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function saveLead(lead) {
    try {
        if (window.exoticFirebase && window.exoticFirebase.db) {
            // Save to Firebase
            window.exoticFirebase.db.ref('leads').once('value', snap => {
                const leads = snap.val() || [];
                leads.push(lead);
                window.exoticFirebase.db.ref('leads').set(leads);
            });
        } else {
            // Save to localStorage
            const existingLeads = JSON.parse(localStorage.getItem('exoticLeads') || '[]');
            existingLeads.push(lead);
            localStorage.setItem('exoticLeads', JSON.stringify(existingLeads));
        }
        console.log('Lead saved successfully:', lead);
    } catch (error) {
        console.error('Error saving lead:', error);
    }
}

// Utility Functions
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function toggleMobileMenu() {
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
}

function setupNavbar() {
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 120) {
            navbar.style.background = 'rgba(0, 0, 0, 0.6)';
            navbar.style.backdropFilter = 'blur(8px)';
        } else if (window.scrollY > 20) {
            navbar.style.background = 'rgba(0, 0, 0, 0.35)';
            navbar.style.backdropFilter = 'blur(6px)';
        } else {
            navbar.style.background = 'rgba(0, 0, 0, 0.15)';
            navbar.style.backdropFilter = 'blur(6px)';
        }
    });
}

function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add notification styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#000' : '#333'};
        color: #fff;
        padding: 15px 20px;
        border-radius: 5px;
        border: 1px solid #444;
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Additional Features
function scheduleTestDrive(carId) {
    const car = carsData.find(c => String(c.id) === String(carId));
    if (!car) return;
    
    // Set the car ID in the form
    document.getElementById('testDriveCarId').value = carId;
    
    // Show the test drive modal
    document.getElementById('testDriveModal').style.display = 'block';
    
    // Close the car modal
    closeCarModal();
}

function requestQuote(carId) {
    const car = carsData.find(c => String(c.id) === String(carId));
    if (!car) return;
    
    // Set the car ID in the form
    document.getElementById('quoteCarId').value = carId;
    
    // Show the quote modal
    document.getElementById('quoteModal').style.display = 'block';
    
    // Close the car modal
    closeCarModal();
}

// Modal Functions
function closeQuoteModal() {
    document.getElementById('quoteModal').style.display = 'none';
    document.getElementById('quoteForm').reset();
}

function closeTestDriveModal() {
    document.getElementById('testDriveModal').style.display = 'none';
    document.getElementById('testDriveForm').reset();
}

// Form Handlers
function setupQuoteForm() {
    const quoteForm = document.getElementById('quoteForm');
    if (quoteForm) {
        quoteForm.addEventListener('submit', handleQuoteSubmit);
    }
}

function setupTestDriveForm() {
    const testDriveForm = document.getElementById('testDriveForm');
    if (testDriveForm) {
        testDriveForm.addEventListener('submit', handleTestDriveSubmit);
    }
}

function handleQuoteSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        interest: formData.get('interest'),
        message: formData.get('message'),
        carId: formData.get('carId')
    };
    
    // Get car details
    const car = carsData.find(c => String(c.id) === String(data.carId));
    const carName = car ? car.name : 'Unknown Car';
    
    // Create lead object
    const lead = {
        id: generateLeadId(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        interest: data.interest,
        source: 'quote-request',
        status: 'new',
        message: `Quote Request for ${carName} (ID: ${data.carId}). ${data.message || ''}`,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Save lead
    saveLead(lead);
    
    // Show success message
    showNotification(`Quote request submitted for ${carName}. Our team will prepare a detailed proposal.`, 'success');
    
    // Close modal and reset form
    closeQuoteModal();
}

function handleTestDriveSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        preferredDate: formData.get('preferredDate'),
        preferredTime: formData.get('preferredTime'),
        message: formData.get('message'),
        carId: formData.get('carId')
    };
    
    // Get car details
    const car = carsData.find(c => String(c.id) === String(data.carId));
    const carName = car ? car.name : 'Unknown Car';
    
    // Create lead object
    const lead = {
        id: generateLeadId(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        interest: 'test-drive',
        source: 'test-drive',
        status: 'new',
        message: `Test Drive Request for ${carName} (ID: ${data.carId}). Preferred Date: ${data.preferredDate}, Time: ${data.preferredTime}. ${data.message || ''}`,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Save lead
    saveLead(lead);
    
    // Show success message
    showNotification(`Test drive scheduled for ${carName}. We'll contact you soon to confirm.`, 'success');
    
    // Close modal and reset form
    closeTestDriveModal();
}

// Video Functions
function openVideo(videoUrl) {
    window.open(videoUrl, '_blank');
}

// Video Functions
function playVideo(container) {
    const video = container.querySelector('video');
    const overlay = container.querySelector('.reel-overlay');
    
    if (video && overlay) {
        // Play the video
        video.play().catch(e => console.log('Video play failed:', e));
        
        // Hide overlay
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
    }
}

function pauseVideo(container) {
    const video = container.querySelector('video');
    const overlay = container.querySelector('.reel-overlay');
    
    if (video && overlay) {
        // Pause the video
        video.pause();
        
        // Show overlay
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'auto';
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .modal-car-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
    }
    
    .modal-car-image img,
    .modal-car-image video {
        width: 100%;
        height: 300px;
        object-fit: contain;
    }
    
    .modal-car-name {
        font-family: var(--font-primary);
        font-size: 2rem;
        margin-bottom: 10px;
    }
    
    
    .modal-specs, .modal-features {
        margin: 30px 0;
    }
    
    .modal-specs h3, .modal-features h3 {
        font-family: var(--font-primary);
        font-size: 1.5rem;
        margin-bottom: 20px;
        color: var(--primary-white);
    }
    
    .specs-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
    }
    
    .spec-item {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid var(--border-gray);
    }
    
    .spec-label {
        color: var(--light-gray);
    }
    
    .spec-value {
        color: var(--primary-white);
        font-weight: 600;
    }
    
    .features-list {
        list-style: none;
        padding: 0;
    }
    
    .features-list li {
        padding: 8px 0;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .features-list i {
        color: var(--primary-white);
    }
    
    .modal-actions {
        display: flex;
        gap: 20px;
        margin-top: 30px;
    }
    
    .modal-actions .btn-primary,
    .modal-actions .btn-secondary {
        flex: 1;
        padding: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
    }
    
    .video-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: var(--transition);
        cursor: pointer;
    }
    
    .car-image:hover .video-overlay {
        opacity: 1;
    }
    
    .video-overlay i {
        font-size: 3rem;
        color: var(--primary-white);
        margin-bottom: 10px;
    }
    
    .video-overlay span {
        color: var(--primary-white);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    
    .modal-video-section {
        margin-top: 30px;
        padding: 20px;
        background: var(--tertiary-black);
        border: 1px solid var(--border-gray);
    }
    
    .modal-video-section h3 {
        font-family: var(--font-primary);
        font-size: 1.2rem;
        margin-bottom: 15px;
        color: var(--primary-white);
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .modal-video-section h3 i {
        color: #E4405F;
    }
    
    .video-container {
        position: relative;
        width: 100%;
        height: 200px;
        background: var(--primary-black);
        border: 2px solid var(--border-gray);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: var(--transition);
    }
    
    .video-container:hover {
        border-color: var(--primary-white);
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
    }
    
    .video-placeholder {
        text-align: center;
        color: var(--light-gray);
    }
    
    .video-placeholder i {
        font-size: 4rem;
        color: var(--primary-white);
        margin-bottom: 15px;
        display: block;
    }
    
    .video-placeholder p {
        font-size: 16px;
        margin-bottom: 10px;
        color: var(--primary-white);
    }
    
    .video-source {
        font-size: 14px;
        color: #E4405F;
        font-weight: 600;
    }
    
    .car-video {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: var(--primary-black);
    }
    
    .modal-video {
        width: 100%;
        height: 400px;
        object-fit: contain;
        background: var(--primary-black);
        margin-bottom: 20px;
        border-radius: 12px;
        border: 1px solid var(--border-gray);
    }
    
    @media (max-width: 768px) {
        .modal-video {
            height: 260px;
        }
    }
    
    /* Reel Card Styles */
    .reel-card {
        max-width: 300px;
        margin: 0 auto;
    }
    
    .reel-image {
        height: 400px;
        position: relative;
        overflow: hidden;
    }
    
    .reel-container {
        width: 100%;
        height: 100%;
        position: relative;
        background: var(--primary-black);
        border: 2px solid var(--border-gray);
        transition: var(--transition);
    }
    
    .reel-container:hover {
        border-color: var(--primary-white);
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
    }
    
    .reel-container video {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: var(--primary-black);
    }
    
    .reel-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        opacity: 1;
        transition: var(--transition);
        pointer-events: auto;
        z-index: 2;
    }
    
    .reel-overlay i {
        font-size: 3rem;
        color: var(--primary-white);
        margin-bottom: 15px;
        animation: pulse 2s infinite;
    }
    
    .reel-overlay span {
        color: var(--primary-white);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-size: 14px;
    }
    
    @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
    }
    
    /* Responsive Reel Cards */
    @media (max-width: 768px) {
        .reel-card {
            max-width: 250px;
        }
        
        .reel-image {
            height: 350px;
        }
    }
    
    @media (max-width: 480px) {
        .reel-card {
            max-width: 200px;
        }
        
        .reel-image {
            height: 300px;
        }
    }
    
    .no-results {
        grid-column: 1 / -1;
        text-align: center;
        padding: 60px 20px;
        color: var(--light-gray);
    }
    
    .no-results h3 {
        font-family: var(--font-primary);
        font-size: 1.5rem;
        margin-bottom: 10px;
        color: var(--primary-white);
    }
    
    @media (max-width: 768px) {
        .modal-car-details {
            grid-template-columns: 1fr;
        }
        
        .specs-grid {
            grid-template-columns: 1fr;
        }
        
        .modal-actions {
            flex-direction: column;
        }
    }
`;
document.head.appendChild(style);

// ==================== COMPARISON TOOL FUNCTIONS ====================

// Setup comparison tool
function setupComparisonTool() {
    // Load available cars for comparison
    loadAvailableCars();
    
    // Setup car slot click handlers
    document.querySelectorAll('.car-slot').forEach(slot => {
        slot.addEventListener('click', (e) => {
            if (e.target.closest('.remove-car')) return;
            const slotIndex = parseInt(slot.dataset.slot);
            openCarSelectionModal(slotIndex);
        });
    });
}

// Load available cars for comparison
function loadAvailableCars() {
    availableCarsForComparison = [...carsData];
    renderAvailableCars();
}

// Render available cars in the search section
function renderAvailableCars() {
    if (!availableCars) return;
    
    availableCars.innerHTML = '';
    
    availableCarsForComparison.forEach(car => {
        const carItem = createAvailableCarItem(car);
        availableCars.appendChild(carItem);
    });
}

// Create available car item for selection
function createAvailableCarItem(car) {
    const item = document.createElement('div');
    item.className = 'available-car-item';
    item.dataset.carId = car.id;
    
    const specs = car.specs || {};
    const isInComparison = comparisonCars.some(compCar => String(compCar.id) === String(car.id));
    
    item.innerHTML = `
        <img src="${car.image}" alt="${car.name}" loading="lazy">
        <h5>${car.name}</h5>
        <p>${car.year}</p>
        <div class="car-specs">
            <span><i class="fas fa-tachometer-alt"></i> ${specs.horsepower || 'N/A'}</span>
            <span><i class="fas fa-bolt"></i> ${specs.acceleration || 'N/A'}</span>
        </div>
        <button class="add-to-comparison" onclick="addCarToComparison('${car.id}')" ${isInComparison ? 'disabled' : ''}>
            <i class="fas fa-${isInComparison ? 'check' : 'plus'}"></i>
        </button>
    `;
    
    if (isInComparison) {
        item.style.opacity = '0.5';
        item.style.cursor = 'not-allowed';
    }
    
    return item;
}

// Handle comparison search
function handleComparisonSearch() {
    const searchTerm = comparisonSearch.value.toLowerCase().trim();
    
    if (!searchTerm) {
        availableCarsForComparison = [...carsData];
    } else {
        availableCarsForComparison = carsData.filter(car => {
            const specs = car.specs || {};
            const searchFields = [
                car.name,
                car.category,
                specs.engine,
                specs.horsepower,
                specs.acceleration,
                specs.topSpeed,
                String(car.year)
            ].map(field => (field || '').toString().toLowerCase());
            
            return searchFields.some(field => field.includes(searchTerm));
        });
    }
    
    renderAvailableCars();
}

// Add car to comparison
function addCarToComparison(carId) {
    const car = carsData.find(c => String(c.id) === String(carId));
    if (!car) return;
    
    // Check if car is already in comparison
    if (comparisonCars.some(compCar => String(compCar.id) === String(carId))) {
        showNotification('Car is already in comparison', 'info');
        return;
    }
    
    // Check if we have space for more cars
    if (comparisonCars.length >= 3) {
        showNotification('Maximum 3 cars can be compared at once', 'info');
        return;
    }
    
    // Add car to comparison
    comparisonCars.push(car);
    
    // Find next available slot
    const nextSlot = comparisonCars.length - 1;
    updateCarSlot(nextSlot, car);
    
    // Update available cars list
    renderAvailableCars();
    
    // Show comparison results if we have at least 2 cars
    if (comparisonCars.length >= 2) {
        showComparisonResults();
    }
    
    showNotification(`${car.name} added to comparison`, 'success');
}

// Update car slot with selected car
function updateCarSlot(slotIndex, car) {
    const slot = document.querySelector(`[data-slot="${slotIndex}"]`);
    if (!slot) return;
    
    const placeholder = slot.querySelector('.slot-placeholder');
    const selectedCar = slot.querySelector('.selected-car');
    const thumbnail = selectedCar.querySelector('.car-thumbnail');
    const carName = selectedCar.querySelector('.car-name');
    const carYear = selectedCar.querySelector('.car-year');
    
    // Update car info
    thumbnail.src = car.image;
    thumbnail.alt = car.name;
    carName.textContent = car.name;
    carYear.textContent = car.year;
    
    // Show selected car, hide placeholder
    placeholder.style.display = 'none';
    selectedCar.style.display = 'block';
}

// Remove car from comparison
function removeCarFromComparison(slotIndex) {
    if (slotIndex >= comparisonCars.length) return;
    
    const removedCar = comparisonCars[slotIndex];
    comparisonCars.splice(slotIndex, 1);
    
    // Reset all slots
    resetAllSlots();
    
    // Update slots with remaining cars
    comparisonCars.forEach((car, index) => {
        updateCarSlot(index, car);
    });
    
    // Hide comparison results if less than 2 cars
    if (comparisonCars.length < 2) {
        hideComparisonResults();
    } else {
        showComparisonResults();
    }
    
    // Update available cars list
    renderAvailableCars();
    
    if (removedCar) {
        showNotification(`${removedCar.name} removed from comparison`, 'info');
    }
}

// Reset all car slots
function resetAllSlots() {
    document.querySelectorAll('.car-slot').forEach(slot => {
        const placeholder = slot.querySelector('.slot-placeholder');
        const selectedCar = slot.querySelector('.selected-car');
        
        placeholder.style.display = 'flex';
        selectedCar.style.display = 'none';
    });
}

// Clear all comparisons
function clearComparison() {
    comparisonCars = [];
    resetAllSlots();
    hideComparisonResults();
    renderAvailableCars();
    showNotification('Comparison cleared', 'info');
}

// Show comparison results
function showComparisonResults() {
    if (!comparisonResults) return;
    
    comparisonResults.style.display = 'block';
    updateComparisonTable();
}

// Hide comparison results
function hideComparisonResults() {
    if (!comparisonResults) return;
    
    comparisonResults.style.display = 'none';
}

// Update comparison table with selected cars
function updateComparisonTable() {
    // Update headers
    for (let i = 0; i < 3; i++) {
        const header = document.getElementById(`car${i + 1}Header`);
        if (header) {
            if (i < comparisonCars.length) {
                header.textContent = comparisonCars[i].name;
                header.style.display = 'block';
            } else {
                header.style.display = 'none';
            }
        }
    }
    
    // Update basic information
    updateComparisonRow('car1Name', 'car2Name', 'car3Name', 'name');
    updateComparisonRow('car1Year', 'car2Year', 'car3Year', 'year');
    updateComparisonRow('car1Category', 'car2Category', 'car3Category', 'category');
    
    // Update performance specs
    updateComparisonRow('car1Engine', 'car2Engine', 'car3Engine', 'specs.engine');
    updateComparisonRow('car1Horsepower', 'car2Horsepower', 'car3Horsepower', 'specs.horsepower');
    updateComparisonRow('car1Acceleration', 'car2Acceleration', 'car3Acceleration', 'specs.acceleration');
    updateComparisonRow('car1TopSpeed', 'car2TopSpeed', 'car3TopSpeed', 'specs.topSpeed');
    
    // Update additional specs
    updateComparisonRow('car1Battery', 'car2Battery', 'car3Battery', 'specs.batteryCapacity');
    updateComparisonRow('car1Mileage', 'car2Mileage', 'car3Mileage', 'specs.mileage');
    
    // Update features
    updateComparisonFeatures();
}

// Update comparison row with car data
function updateComparisonRow(car1Id, car2Id, car3Id, property) {
    const cars = [car1Id, car2Id, car3Id];
    
    cars.forEach((carId, index) => {
        const element = document.getElementById(carId);
        if (!element) return;
        
        if (index < comparisonCars.length) {
            const car = comparisonCars[index];
            let value = getNestedProperty(car, property);
            element.textContent = value || 'N/A';
            element.style.display = 'block';
        } else {
            element.style.display = 'none';
        }
    });
}

// Update comparison features
function updateComparisonFeatures() {
    const features = ['car1Features', 'car2Features', 'car3Features'];
    
    features.forEach((featureId, index) => {
        const element = document.getElementById(featureId);
        if (!element) return;
        
        if (index < comparisonCars.length) {
            const car = comparisonCars[index];
            const carFeatures = Array.isArray(car.features) ? car.features : [];
            
            if (carFeatures.length > 0) {
                element.innerHTML = `<ul class="features-list">${carFeatures.map(feature => `<li>${feature}</li>`).join('')}</ul>`;
            } else {
                element.textContent = 'N/A';
            }
            element.style.display = 'block';
        } else {
            element.style.display = 'none';
        }
    });
}

// Get nested property from object
function getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
}

// Open car selection modal (placeholder for future modal implementation)
function openCarSelectionModal(slotIndex) {
    // For now, just focus on the search input
    if (comparisonSearch) {
        comparisonSearch.focus();
        comparisonSearch.scrollIntoView({ behavior: 'smooth' });
    }
}
