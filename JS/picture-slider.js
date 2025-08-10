/**
 * Reusable Picture Slider Component
 * Handles images, videos, YouTube videos, and 360° panoramas
 * Supports modal full-screen view with navigation
 * Integrates with Media database table
 */

class PictureSlider {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.currentSlide = 0;
        this.slides = [];
        this.options = {
            height: '400px',
            clickToModal: true,
            showCounter: true,
            showNavigation: true,
            autoLoadMedia: true,
            ...options
        };
        
        // Modal instance
        this.modal = null;
        this.new360Viewer = null;
        this.modalNew360Viewer = null;
        
        // Drag detection for preventing modal on drag
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragThreshold = 10; // pixels
        
        this.init();
    }
    
    init() {
        if (!this.container) {
            console.error(`Picture slider container not found: ${this.containerId}`);
            return;
        }
        
        // Set container height
        this.container.style.height = this.options.height;
        
        // Add CSS classes
        this.container.classList.add('picture-slider-container');
        
        // Add reference to this slider for 360° viewer communication
        this.container._pictureSlider = this;
        
        // Initialize modal
        this.initModal();
        
        // Show loading state initially
        this.showLoading();
    }
    
    /**
     * Load media from database by code
     * @param {string} code - The code to match in Media table
     * @param {string} additionalCode - Optional additional code for room-specific images
     */
    async loadMedia(code, additionalCode = null) {
        if (!code) {
            this.showNoImages();
            return;
        }
        
        this.showLoading();
        
        try {
            const url = new URL('../PHP/get_media.php', window.location.href);
            url.searchParams.set('code', code);
            if (additionalCode) {
                url.searchParams.set('additional_code', additionalCode);
            }
            
            console.log('Picture slider loading media from URL:', url.toString());
            console.log('Picture slider codes - Main:', code, 'Additional:', additionalCode);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Picture slider received data:', data);
            
            if (data.success && data.media && data.media.length > 0) {
                console.log('Picture slider setting media:', data.media);
                this.setMedia(data.media);
            } else {
                console.log('Picture slider: No media found or error:', data);
                this.showNoImages();
            }
        } catch (error) {
            console.error('Picture slider error loading media:', error);
            this.showNoImages();
        }
    }
    
    /**
     * Set media data directly
     * @param {Array} mediaArray - Array of media objects
     */
    setMedia(mediaArray) {
        this.slides = mediaArray;
        this.currentSlide = 0;
        this.render();
    }
    
    render() {
        if (!this.slides || this.slides.length === 0) {
            this.showNoImages();
            return;
        }
        
        // Clear loading state
        this.container.classList.remove('loading', 'no-images');
        
        // Add single-image class if only one image
        if (this.slides.length === 1) {
            this.container.classList.add('single-image');
        } else {
            this.container.classList.remove('single-image');
        }
        
        // Create slider HTML
        const sliderHTML = `
            <div class="slides-wrapper">
                <div class="slides-container" style="transform: translateX(-${this.currentSlide * 100}%)">
                    ${this.slides.map((slide, index) => this.createSlideHTML(slide, index)).join('')}
                </div>
                ${this.slides.length > 1 && this.options.showNavigation ? `
                    <button class="slide-nav prev" onclick="pictureSliders['${this.containerId}'].prevSlide()">‹</button>
                    <button class="slide-nav next" onclick="pictureSliders['${this.containerId}'].nextSlide()">›</button>
                ` : ''}
                ${this.slides.length > 1 && this.options.showCounter ? `
                    <div class="slide-counter">${this.currentSlide + 1} / ${this.slides.length}</div>
                ` : ''}
            </div>
        `;
        
        this.container.innerHTML = sliderHTML;
        
        // Add click event for modal with drag detection
        if (this.options.clickToModal) {
            // Track mouse down for drag detection
            this.container.addEventListener('mousedown', (e) => {
                this.isDragging = false;
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
            });
            
            // Track mouse move for drag detection
            this.container.addEventListener('mousemove', (e) => {
                if (this.dragStartX !== 0 || this.dragStartY !== 0) {
                    const deltaX = Math.abs(e.clientX - this.dragStartX);
                    const deltaY = Math.abs(e.clientY - this.dragStartY);
                    if (deltaX > this.dragThreshold || deltaY > this.dragThreshold) {
                        this.isDragging = true;
                    }
                }
            });
            
            // Handle click - only open modal if not dragged
            this.container.addEventListener('click', (e) => {
                // Don't open modal if clicking navigation buttons or if dragging
                if (!e.target.classList.contains('slide-nav') && !this.isDragging) {
                    this.openModal();
                }
                // Reset drag detection after a small delay to ensure click is processed
                setTimeout(() => {
                    this.isDragging = false;
                    this.dragStartX = 0;
                    this.dragStartY = 0;
                }, 10);
            });
            
            // Reset drag detection on mouse up (but keep the drag state for click event)
            this.container.addEventListener('mouseup', () => {
                // Don't reset immediately - let the click event use the drag state
                setTimeout(() => {
                    if (!this.isDragging) return; // Already reset by click
                    this.isDragging = false;
                    this.dragStartX = 0;
                    this.dragStartY = 0;
                }, 50);
            });
        }
        
        // Initialize 360° viewer if current slide is 360
        setTimeout(() => {
            this.init360Viewer();
        }, 100);
    }
    
    createSlideHTML(slide, index) {
        const mediaType = slide.Mediatype || 'image';
        const src = slide.Location || slide.src;
        const noteShort = slide.Note_short || '';
        const noteLong = slide.Note_long || '';
        
        console.log(`Creating slide ${index}:`, { 
            mediaType, 
            src, 
            noteShort,
            isSlide360: mediaType === '360'
        });
        
        let mediaHTML = '';
        let mediaIndicator = '';
        
        switch (mediaType) {
            case 'image':
                mediaHTML = `<img src="${src}" alt="${noteShort}" loading="lazy" onerror="console.error('Image failed to load:', '${src}')">`;
                break;
                
            case 'video':
                mediaHTML = `<video src="${src}" controls preload="metadata">Your browser does not support video.</video>`;
                mediaIndicator = '<div class="media-type-indicator type-video">Video</div>';
                break;
                
            case 'youtube':
                // Convert YouTube URL to embed format
                const embedSrc = this.convertYouTubeToEmbed(src);
                mediaHTML = `<iframe src="${embedSrc}" allowfullscreen></iframe>`;
                mediaIndicator = '<div class="media-type-indicator type-youtube">YouTube</div>';
                break;
                
            case '360':
                mediaHTML = `<div class="panorama-container simple-360-container" data-panorama-src="${src}"></div>`;
                mediaIndicator = '<div class="media-type-indicator type-360">360°</div>';
                break;
                
            default:
                mediaHTML = `<img src="${src}" alt="${noteShort}" loading="lazy">`;
        }
        
        const textOverlay = (noteShort || noteLong) ? `
            <div class="slide-text-overlay">
                ${noteShort ? `<h3>${noteShort}</h3>` : ''}
                ${noteLong ? `<p>${noteLong}</p>` : ''}
            </div>
        ` : '';
        
        return `
            <div class="slide" data-type="${mediaType}" data-src="${src}">
                ${mediaHTML}
                ${mediaIndicator}
                ${textOverlay}
            </div>
        `;
    }
    
    convertYouTubeToEmbed(url) {
        // Handle various YouTube URL formats
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        
        if (match && match[2].length === 11) {
            return `https://www.youtube.com/embed/${match[2]}`;
        }
        
        return url; // Return original if not a recognized YouTube URL
    }
    
    nextSlide() {
        if (this.currentSlide < this.slides.length - 1) {
            this.currentSlide++;
        } else {
            this.currentSlide = 0; // Loop to first
        }
        this.updateSlidePosition();
    }
    
    prevSlide() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
        } else {
            this.currentSlide = this.slides.length - 1; // Loop to last
        }
        this.updateSlidePosition();
    }
    
    goToSlide(index) {
        if (index >= 0 && index < this.slides.length) {
            this.currentSlide = index;
            this.updateSlidePosition();
        }
    }
    
    updateSlidePosition() {
        const slidesContainer = this.container.querySelector('.slides-container');
        if (slidesContainer) {
            slidesContainer.style.transform = `translateX(-${this.currentSlide * 100}%)`;
        }
        
        // Update counter
        const counter = this.container.querySelector('.slide-counter');
        if (counter) {
            counter.textContent = `${this.currentSlide + 1} / ${this.slides.length}`;
        }
        
        // Reinitialize 360° viewer if needed
        setTimeout(() => {
            this.init360Viewer();
        }, 100);
    }
    
    init360Viewer() {
        console.log('init360Viewer called');
        if (!this.slides[this.currentSlide]) {
            console.log('No current slide available');
            return;
        }
        
        const currentSlide = this.slides[this.currentSlide];
        console.log('Current slide data:', currentSlide);
        console.log('Current slide mediatype:', currentSlide.Mediatype);
        console.log('Is 360 slide?', currentSlide.Mediatype === '360');
        
        if (currentSlide.Mediatype === '360') {
            console.log('Processing 360° slide...');
            const panoramaContainer = this.container.querySelector('.simple-360-container');
            console.log('360° container found:', !!panoramaContainer);
            
            if (panoramaContainer) {
                const src = currentSlide.Location || currentSlide.src;
                console.log('360° image source:', src);
                
                // Clean up existing viewer
                if (this.new360Viewer) {
                    console.log('Cleaning up existing 360° viewer');
                    this.new360Viewer.destroy();
                    this.new360Viewer = null;
                }
                
                // Create new 360° viewer
                if (window.createNew360Viewer) {
                    console.log('Creating NEW 360° viewer in slider for:', src);
                    try {
                        this.new360Viewer = window.createNew360Viewer(panoramaContainer, src, {
                            autoRotate: false,
                            sensitivity: 1
                        });
                        console.log('NEW 360° viewer created successfully in slider');
                    } catch (error) {
                        console.error('NEW 360° viewer creation failed:', error);
                        panoramaContainer.innerHTML = `<img src="${src}" alt="360° Image" style="width: 100%; height: 100%; object-fit: cover;">`;
                    }
                } else {
                    console.warn('New360Viewer not loaded, falling back to regular image');
                    panoramaContainer.innerHTML = `<img src="${src}" alt="360° Image" style="width: 100%; height: 100%; object-fit: cover;">`;
                }
            } else {
                console.warn('360° container not found in DOM');
            }
        } else {
            console.log('Current slide is not 360°, skipping viewer initialization');
        }
    }
    
    // Modal functionality
    initModal() {
        // Create modal if it doesn't exist
        if (!document.getElementById('picture-modal')) {
            const modalHTML = `
                <div id="picture-modal" class="picture-modal">
                    <div class="picture-modal-content">
                        <!-- Content will be dynamically inserted -->
                    </div>
                    <button class="modal-close"></button>
                    <button class="modal-nav prev">‹</button>
                    <button class="modal-nav next">›</button>
                    <div class="modal-counter"></div>
                    <div class="modal-media-indicator"></div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Add event listeners
            this.addModalEventListeners();
        }
        
        this.modal = document.getElementById('picture-modal');
    }
    
    addModalEventListeners() {
        const modal = document.getElementById('picture-modal');
        
        // Close modal events
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
        
        modal.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
        
        // Navigation events
        modal.querySelector('.modal-nav.prev').addEventListener('click', () => this.modalPrevSlide());
        modal.querySelector('.modal-nav.next').addEventListener('click', () => this.modalNextSlide());
        
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (modal.classList.contains('active')) {
                switch (e.key) {
                    case 'Escape':
                        this.closeModal();
                        break;
                    case 'ArrowLeft':
                        this.modalPrevSlide();
                        break;
                    case 'ArrowRight':
                        this.modalNextSlide();
                        break;
                }
            }
        });
    }
    
    openModal() {
        if (!this.modal || !this.slides || this.slides.length === 0) return;
        
        // Set this slider as the active modal slider
        window.activeModalSlider = this;
        
        this.modal.classList.add('active');
        
        // Single image class
        if (this.slides.length === 1) {
            this.modal.classList.add('single-image');
        } else {
            this.modal.classList.remove('single-image');
        }
        
        this.renderModalSlide();
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }
    
    closeModal() {
        if (!this.modal) return;
        
        this.modal.classList.remove('active', 'single-image');
        
        // Clean up 360° viewer
        if (this.modalNew360Viewer) {
            this.modalNew360Viewer.destroy();
            this.modalNew360Viewer = null;
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
    
    modalNextSlide() {
        // Use the active modal slider instead of this
        const activeSlider = window.activeModalSlider || this;
        if (activeSlider.currentSlide < activeSlider.slides.length - 1) {
            activeSlider.currentSlide++;
        } else {
            activeSlider.currentSlide = 0;
        }
        activeSlider.renderModalSlide();
        activeSlider.updateSlidePosition(); // Update main slider too
    }
    
    modalPrevSlide() {
        // Use the active modal slider instead of this
        const activeSlider = window.activeModalSlider || this;
        if (activeSlider.currentSlide > 0) {
            activeSlider.currentSlide--;
        } else {
            activeSlider.currentSlide = activeSlider.slides.length - 1;
        }
        activeSlider.renderModalSlide();
        activeSlider.updateSlidePosition(); // Update main slider too
    }
    
    renderModalSlide() {
        // Use the active modal slider
        const activeSlider = window.activeModalSlider || this;
        if (!activeSlider.modal || !activeSlider.slides[activeSlider.currentSlide]) return;
        
        const slide = activeSlider.slides[activeSlider.currentSlide];
        const modalContent = activeSlider.modal.querySelector('.picture-modal-content');
        const mediaType = slide.Mediatype || 'image';
        const src = slide.Location || slide.src;
        
        // Clear previous content
        modalContent.innerHTML = '';
        
        // Clean up 360° viewer
        if (activeSlider.modalNew360Viewer) {
            console.log('Modal: Cleaning up existing 360° viewer');
            activeSlider.modalNew360Viewer.destroy();
            activeSlider.modalNew360Viewer = null;
        }
        
        let mediaHTML = '';
        
        console.log('Modal: Rendering slide with mediaType:', mediaType, 'src:', src);
        
        switch (mediaType) {
            case 'image':
                mediaHTML = `<img src="${src}" alt="${slide.Note_short || ''}" />`;
                break;
                
            case 'video':
                mediaHTML = `<video src="${src}" controls autoplay>Your browser does not support video.</video>`;
                break;
                
            case 'youtube':
                const embedSrc = activeSlider.convertYouTubeToEmbed(src);
                mediaHTML = `<iframe src="${embedSrc}" allowfullscreen></iframe>`;
                break;
                
            case '360':
                console.log('Modal: Creating 360° container HTML');
                mediaHTML = `<div class="panorama-container simple-360-modal-container" style="width: 100%; height: 100%;"></div>`;
                break;
        }
        
        modalContent.innerHTML = mediaHTML;
        console.log('Modal: Content set, mediaType is:', mediaType);
        
        // Initialize 360° viewer for modal
        if (mediaType === '360') {
            console.log('Modal: Starting 360° initialization...');
            
            // Try the new 360° viewer first
            const viewerFunction = window.createNew360Viewer || window.createPanorama360Viewer || window.createSimple360Viewer;
            
            if (viewerFunction) {
                console.log('Modal: 360° viewer function available');
                setTimeout(() => {
                    const panoramaContainer = modalContent.querySelector('.simple-360-modal-container');
                    console.log('Modal: Looking for 360° container...', !!panoramaContainer);
                    
                    if (panoramaContainer) {
                        console.log('Modal: 360° container found, creating viewer...');
                        
                        // Ensure container has proper full-screen dimensions
                        panoramaContainer.style.width = '100vw';
                        panoramaContainer.style.height = '90vh';
                        panoramaContainer.style.minHeight = '600px';
                        panoramaContainer.style.maxWidth = '100%';
                        panoramaContainer.style.maxHeight = '100%';
                        
                        try {
                            // Clean up any existing modal viewer
                            if (activeSlider.modalNew360Viewer) {
                                console.log('Modal: Cleaning up existing viewer');
                                activeSlider.modalNew360Viewer.destroy();
                            }
                            
                            console.log('Modal: Creating 360° viewer with source:', src);
                            activeSlider.modalNew360Viewer = viewerFunction(panoramaContainer, src, {
                                autoRotate: false,
                                sensitivity: 0.6,  // Reduced sensitivity for modal
                                rotateSpeed: 0.3,
                                fov: 75
                            });
                            console.log('Modal: 360° viewer created successfully!');
                            
                        } catch (error) {
                            console.error('Modal: 360° viewer initialization failed:', error);
                            modalContent.innerHTML = `
                                <div style="padding: 20px; text-align: center; color: white;">
                                    <p>360° view failed to load: ${error.message}</p>
                                    <p>Showing fallback image:</p>
                                    <img src="${src}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                                </div>
                            `;
                        }
                    } else {
                        console.error('Modal: 360° container not found in DOM');
                        console.log('Modal: Available containers:', modalContent.innerHTML);
                    }
                }, 500);
            } else {
                console.error('Modal: No 360° viewer function available');
                modalContent.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: white;">
                        <p>360° viewer not available. Showing image:</p>
                        <img src="${src}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                    </div>
                `;
            }
        } else {
            console.log('Modal: Not a 360° slide, skipping viewer initialization');
        }
        
        // Update modal counter and indicator
        const counter = activeSlider.modal.querySelector('.modal-counter');
        const indicator = activeSlider.modal.querySelector('.modal-media-indicator');
        
        if (counter) {
            counter.textContent = `${activeSlider.currentSlide + 1} / ${activeSlider.slides.length}`;
        }
        
        if (indicator) {
            const typeMap = {
                'image': 'Image',
                'video': 'Video',
                'youtube': 'YouTube',
                '360': '360° View'
            };
            indicator.textContent = typeMap[mediaType] || 'Media';
        }
    }
    
    showLoading() {
        this.container.classList.add('loading');
        this.container.classList.remove('no-images');
        this.container.innerHTML = '';
    }
    
    showNoImages() {
        this.container.classList.add('no-images');
        this.container.classList.remove('loading');
        this.container.innerHTML = '';
    }
    
    // Public method to update media (for room changes, etc.)
    updateMedia(code, additionalCode = null) {
        this.loadMedia(code, additionalCode);
    }
    
    // Cleanup method
    destroy() {
        if (this.new360Viewer) {
            this.new360Viewer.destroy();
        }
        if (this.modalNew360Viewer) {
            this.modalNew360Viewer.destroy();
        }
        
        // Remove from global registry
        if (window.pictureSliders && window.pictureSliders[this.containerId]) {
            delete window.pictureSliders[this.containerId];
        }
    }
}

// Make PictureSlider globally available
window.PictureSlider = PictureSlider;

// Global registry for picture sliders
window.pictureSliders = window.pictureSliders || {};

// Helper function to create picture slider
function createPictureSlider(containerId, options = {}) {
    const slider = new PictureSlider(containerId, options);
    window.pictureSliders[containerId] = slider;
    return slider;
}

// Helper function to load media for existing slider
function loadSliderMedia(containerId, code, additionalCode = null) {
    if (window.pictureSliders[containerId]) {
        window.pictureSliders[containerId].loadMedia(code, additionalCode);
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PictureSlider, createPictureSlider, loadSliderMedia };
}
