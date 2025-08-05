// Application State Management
const AppState = {
    currentField: null,
    currentAudio: null,
    currentNode: null,
    audioNodes: {},
    audioContext: null,
    audioInfoTimeout: null,
    isTransitioning: false
};

// Configuration Constants
const AUDIO_TRACKS = {
    'track1': { 
        src: 'https://audio.jukehost.co.uk/r3LJ8y6ROF6PPaS7fMXjJAHQNY7fpGKJ', 
        title: 'Hyperlight', 
        fallbackFreq: 82.4, 
        fallbackType: 'triangle' 
    },
    'track2': { 
        src: 'https://audio.jukehost.co.uk/GCZhYb2txFEKn209xcJKJCzoUJ6FlJ25', 
        title: 'The Shape Of Something Passing', 
        fallbackFreq: 110, 
        fallbackType: 'sine' 
    },
    'track3': { 
        src: 'https://audio.jukehost.co.uk/scpica5HbDWqYPDHpzsxBri8TQC4U81O', 
        title: 'Glider', 
        fallbackFreq: 73.4, 
        fallbackType: 'sine' 
    },
    'track4': { 
        src: 'https://audio.jukehost.co.uk/civWzOqSB53rYzAjR7tFbLJlj7jW6XT8', 
        title: 'Empty The Moon', 
        fallbackFreq: 65.4, 
        fallbackType: 'sawtooth' 
    },
    'track5': { 
        src: 'https://audio.jukehost.co.uk/XGCVvw0QkclGmovZoFWt3MCOHcmyYAfO', 
        title: 'Near Delicious Future', 
        fallbackFreq: 98, 
        fallbackType: 'triangle' 
    },
    'track6': { 
        src: 'https://audio.jukehost.co.uk/G035I2chwDpOBYBtLR5yTxpCJUvQpQOB', 
        title: 'Motion', 
        fallbackFreq: 146.8, 
        fallbackType: 'sine' 
    }
};

// Navigation Functions
function openContentField(fieldName) {
    // Prevent multiple rapid clicks
    if (AppState.isTransitioning) return;
    if (AppState.currentField === fieldName) return;
    
    AppState.isTransitioning = true;
    
    if (AppState.currentField) {
        const currentFieldElement = document.getElementById(`${AppState.currentField}-field`);
        if (currentFieldElement) {
            currentFieldElement.style.opacity = '0';
            setTimeout(() => {
                currentFieldElement.classList.remove('active');
            }, 1000);
        }
    }
    
    const coreElement = document.getElementById('core');
    if (coreElement) {
        coreElement.style.opacity = '0.1';
        coreElement.style.transform = 'scale(0.8)';
    }
    
    // Preload next likely content
    const contentOrder = ['about', 'events', 'discography', 'repository', 'process', 'contact'];
    const currentIndex = contentOrder.indexOf(fieldName);
    const nextField = contentOrder[currentIndex + 1] || contentOrder[0];
    const nextFieldElement = document.getElementById(`${nextField}-field`);
    
    setTimeout(() => {
        const field = document.getElementById(`${fieldName}-field`);
        if (field) {
            field.classList.add('active');
            field.style.opacity = '0';
            setTimeout(() => {
                field.style.opacity = '1';
                // Release transition lock after animation completes
                setTimeout(() => {
                    AppState.isTransitioning = false;
                }, 500);
            }, 50);
            
            AppState.currentField = fieldName;
            
            const returnButton = document.getElementById('returnCore');
            if (returnButton) {
                returnButton.classList.add('visible');
            }
            
            // Staggered nav animation
            document.querySelectorAll('.nav-item').forEach((item, index) => {
                item.classList.remove('active');
                item.style.transition = `all 0.2s ease ${index * 0.05}s`;
            });
            
            if (event && event.target && event.target.classList) {
                event.target.classList.add('active');
            }
            
            activateAuraLayers();
            
            if (fieldName === 'process') {
                initializeTileProfile();
            }
        } else {
            // Release lock if field doesn't exist
            AppState.isTransitioning = false;
        }
    }, 200);
}

function returnToCore() {
    // Prevent multiple rapid clicks
    if (AppState.isTransitioning) return;
    if (!AppState.currentField) return;
    
    AppState.isTransitioning = true;
    
    const currentFieldElement = document.getElementById(`${AppState.currentField}-field`);
    if (currentFieldElement) {
        currentFieldElement.style.opacity = '0';
        setTimeout(() => {
            currentFieldElement.classList.remove('active');
        }, 1000);
    }
    
    const returnButton = document.getElementById('returnCore');
    if (returnButton) {
        returnButton.classList.remove('visible');
    }
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    setTimeout(() => {
        const coreElement = document.getElementById('core');
        if (coreElement) {
            coreElement.style.opacity = '1';
            coreElement.style.transform = 'scale(1)';
        }
        
        AppState.currentField = null;
        
        if (!AppState.currentAudio || AppState.currentAudio.paused) {
            deactivateAuraLayers();
        }
        
        // Release transition lock after animation completes
        setTimeout(() => {
            AppState.isTransitioning = false;
        }, 500);
    }, 1000);
}

// Audio Functions
function initAudio() {
    if (!AppState.audioContext) {
        AppState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playAudioNode(trackId, nodeElement) {
    initAudio();
    
    if (AppState.audioContext.state === 'suspended') {
        AppState.audioContext.resume();
    }

    if (AppState.currentAudio && !AppState.currentAudio.paused) {
        AppState.currentAudio.pause();
        AppState.currentAudio.currentTime = 0;
        if (AppState.currentNode) {
            AppState.currentNode.classList.remove('playing');
        }
    }

    if (AppState.currentNode === nodeElement && AppState.currentAudio) {
        AppState.currentNode = null;
        AppState.currentAudio = null;
        hideAudioInfo();
        deactivateAuraLayers();
        document.getElementById('ambientToggle').classList.remove('visible');
        return;
    }

    const track = AUDIO_TRACKS[trackId];
    if (!track) return;

    nodeElement.classList.add('loading');
    showAudioInfo(track.title, 'Loading...');

    if (!AppState.audioNodes[trackId]) {
        AppState.audioNodes[trackId] = new Audio();
        AppState.audioNodes[trackId].crossOrigin = "anonymous";
        AppState.audioNodes[trackId].preload = "auto";
        
        const handleAudioReady = () => {
            nodeElement.classList.remove('loading');
            playTrack(trackId, nodeElement);
        };
        
        AppState.audioNodes[trackId].addEventListener('loadeddata', handleAudioReady);
        AppState.audioNodes[trackId].addEventListener('canplaythrough', handleAudioReady);
        
        AppState.audioNodes[trackId].addEventListener('error', () => {
            nodeElement.classList.remove('loading');
            playFallbackTone(track, nodeElement);
        });
        
        AppState.audioNodes[trackId].addEventListener('ended', () => {
            nodeElement.classList.remove('playing');
            AppState.currentNode = null;
            AppState.currentAudio = null;
            hideAudioInfo();
            deactivateAuraLayers();
            document.getElementById('ambientToggle').classList.remove('visible');
        });

        AppState.audioNodes[trackId].src = track.src;
        AppState.audioNodes[trackId].load();
    } else {
        nodeElement.classList.remove('loading');
        playTrack(trackId, nodeElement);
    }
}

function playTrack(trackId, nodeElement) {
    const audio = AppState.audioNodes[trackId];
    const track = AUDIO_TRACKS[trackId];
    
    if (audio.readyState < 2) {
        setTimeout(() => playTrack(trackId, nodeElement), 100);
        return;
    }
    
    try {
        audio.currentTime = 0;
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                AppState.currentAudio = audio;
                AppState.currentNode = nodeElement;
                nodeElement.classList.add('playing');
                showAudioInfo(track.title, 'Now playing');
                activateAuraLayers();
                document.getElementById('ambientToggle').classList.add('visible');
                
                if (AppState.audioInfoTimeout) clearTimeout(AppState.audioInfoTimeout);
                AppState.audioInfoTimeout = setTimeout(() => {
                    if (AppState.currentAudio && !AppState.currentAudio.paused) {
                        hideAudioInfo();
                    }
                }, 5000);
            }).catch(error => {
                console.log('Audio play failed, trying fallback tone');
                playFallbackTone(track, nodeElement);
            });
        } else {
            AppState.currentAudio = audio;
            AppState.currentNode = nodeElement;
            nodeElement.classList.add('playing');
            showAudioInfo(track.title, 'Now playing');
            activateAuraLayers();
            document.getElementById('ambientToggle').classList.add('visible');
            
            if (AppState.audioInfoTimeout) clearTimeout(AppState.audioInfoTimeout);
            AppState.audioInfoTimeout = setTimeout(() => {
                if (AppState.currentAudio && !AppState.currentAudio.paused) {
                    hideAudioInfo();
                }
            }, 5000);
        }
    } catch (error) {
        console.log('Audio play error, using fallback tone');
        playFallbackTone(track, nodeElement);
    }
}

function playFallbackTone(track, nodeElement) {
    const oscillator = AppState.audioContext.createOscillator();
    const gainNode = AppState.audioContext.createGain();
    const filter = AppState.audioContext.createBiquadFilter();
    
    oscillator.frequency.setValueAtTime(track.fallbackFreq, AppState.audioContext.currentTime);
    oscillator.type = track.fallbackType;
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, AppState.audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0, AppState.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, AppState.audioContext.currentTime + 0.5);
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(AppState.audioContext.destination);
    
    oscillator.start();
    
    AppState.currentAudio = { 
        pause: () => oscillator.stop(),
        paused: false,
        currentTime: 0
    };
    AppState.currentNode = nodeElement;
    nodeElement.classList.add('playing');
    showAudioInfo(track.title, 'Synthesized preview');
    activateAuraLayers();
    document.getElementById('ambientToggle').classList.add('visible');
    
    if (AppState.audioInfoTimeout) clearTimeout(AppState.audioInfoTimeout);
    AppState.audioInfoTimeout = setTimeout(() => {
        if (AppState.currentAudio && !AppState.currentAudio.paused) {
            hideAudioInfo();
        }
    }, 5000);
    
    setTimeout(() => {
        try {
            oscillator.stop();
            if (AppState.currentNode === nodeElement) {
                nodeElement.classList.remove('playing');
                AppState.currentNode = null;
                AppState.currentAudio = null;
                hideAudioInfo();
                deactivateAuraLayers();
            }
        } catch (e) {}
    }, 30000);
}

function stopAllAudio() {
    if (AppState.currentAudio && !AppState.currentAudio.paused) {
        AppState.currentAudio.pause();
        AppState.currentAudio.currentTime = 0;
    }
    
    if (AppState.currentNode) {
        AppState.currentNode.classList.remove('playing');
        AppState.currentNode = null;
    }
    
    AppState.currentAudio = null;
    hideAudioInfo();
    deactivateAuraLayers();
    document.getElementById('ambientToggle').classList.remove('visible');
    
    if (AppState.audioInfoTimeout) {
        clearTimeout(AppState.audioInfoTimeout);
        AppState.audioInfoTimeout = null;
    }
}

// UI Helper Functions
function showAudioInfo(title, status) {
    if (AppState.audioInfoTimeout) {
        clearTimeout(AppState.audioInfoTimeout);
    }
    
    document.getElementById('trackTitle').textContent = title;
    document.getElementById('trackStatus').textContent = status;
    const audioInfo = document.getElementById('audioInfo');
    audioInfo.classList.remove('fade-out');
    audioInfo.classList.add('visible');
}

function hideAudioInfo() {
    const audioInfo = document.getElementById('audioInfo');
    audioInfo.classList.add('fade-out');
    audioInfo.classList.remove('visible');
    
    if (AppState.audioInfoTimeout) {
        clearTimeout(AppState.audioInfoTimeout);
        AppState.audioInfoTimeout = null;
    }
}

function activateAuraLayers() {
    document.querySelectorAll('.aura-layer').forEach(layer => {
        layer.classList.add('active');
    });
}

function deactivateAuraLayers() {
    document.querySelectorAll('.aura-layer').forEach(layer => {
        layer.classList.remove('active');
    });
}

function initializeTileProfile() {
    setTimeout(() => {
        const imageViewer = document.querySelector('#image-viewer');
        
        const images = document.querySelectorAll('.images img');
        images.forEach(image => {
            image.addEventListener('click', (e) => {    
                if (imageViewer) {
                    imageViewer.style.backgroundImage = `url('${e.target.src}')`;
                    imageViewer.style.display = 'flex';
                }
            });
        });

        if (imageViewer) {
            imageViewer.addEventListener('click', () => {
                const imageViewerInner = document.querySelector('#image-viewer article');
                if (imageViewerInner) {
                    imageViewerInner.innerHTML = '';
                }
                imageViewer.style.display = 'none';
            });
        }
    }, 100);
}

// Event Listeners
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'Escape':
            if (AppState.currentField) returnToCore();
            break;
        case ' ':
            stopAllAudio();
            e.preventDefault();
            break;
        case '1': case '2': case '3': case '4': case '5': case '6':
            const trackNum = e.key;
            const nodeElement = document.querySelector(`.point-${trackNum}`);
            if (nodeElement) {
                playAudioNode(`track${trackNum}`, nodeElement);
            }
            break;
    }
});

document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    
    document.querySelectorAll('.aura-layer').forEach((layer, index) => {
        const intensity = (index + 1) * 0.5;
        layer.style.transform = `translate(calc(-50% + ${x * intensity}px), calc(-50% + ${y * intensity}px))`;
    });
});

window.addEventListener('load', () => {
    setTimeout(() => {
        showAudioInfo('Will Karmis', 'Click energy points to play compositions');
        setTimeout(() => {
            hideAudioInfo();
        }, 3000);
    }, 1000);
});