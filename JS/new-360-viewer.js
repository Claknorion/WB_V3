/**
 * New 360° Panorama Viewer - Completely Fixed Version
 * Robust WebGL-based panoramic viewer for equirectangular images
 */

class New360Viewer {
    constructor(container, imageSrc, options = {}) {
        this.container = container;
        this.imageSrc = imageSrc;
        this.options = {
            autoRotate: false,
            rotateSpeed: 0.5,
            sensitivity: 1,
            fov: 75,
            ...options
        };
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.sphere = null;
        this.texture = null;
        
        this.isMouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.lon = 0;
        this.lat = 0;
        this.phi = 0;
        this.theta = 0;
        this.autoRotateTimer = null;
        
        this.init();
    }
    
    init() {
        console.log('New360Viewer: Starting initialization...');
        
        // FIRST: Preserve container dimensions before ANY modifications
        const originalWidth = this.container.offsetWidth;
        const originalHeight = this.container.offsetHeight;
        
        console.log(`New360Viewer: Original container: ${originalWidth} x ${originalHeight}`);
        
        // Set explicit dimensions to prevent collapse
        if (originalWidth > 0 && originalHeight > 0) {
            this.container.style.width = originalWidth + 'px';
            this.container.style.height = originalHeight + 'px';
            this.container.style.minHeight = originalHeight + 'px';
            console.log(`New360Viewer: Set explicit dimensions: ${originalWidth} x ${originalHeight}`);
        } else {
            this.container.style.width = '800px';
            this.container.style.height = '500px';
            this.container.style.minHeight = '500px';
            console.log('New360Viewer: Set default dimensions: 800 x 500');
        }
        
        // Check for WebGL support
        if (!this.isWebGLAvailable()) {
            console.log('New360Viewer: WebGL not available, creating fallback');
            this.createFallbackViewer();
            return;
        }
        
        console.log('New360Viewer: WebGL available, setting up Three.js');
        this.setupViewer();
    }
    
    isWebGLAvailable() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                     (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }
    
    setupViewer() {
        // Clear container content but keep dimensions
        this.container.innerHTML = '';
        this.container.className = 'new-360-viewer';
        
        console.log(`New360Viewer: After clear - container: ${this.container.offsetWidth} x ${this.container.offsetHeight}`);
        
        if (!window.THREE) {
            console.error('New360Viewer: Three.js not available');
            this.createFallbackViewer();
            return;
        }
        
        try {
            console.log('New360Viewer: Creating Three.js scene');
            this.createThreeJSScene();
            this.addEventListeners();
            this.animate();
            
            if (this.options.autoRotate) {
                this.startAutoRotate();
            }
            
        } catch (error) {
            console.error('New360Viewer: Setup failed:', error);
            this.createFallbackViewer();
        }
    }
    
    createThreeJSScene() {
        // Get final container dimensions
        const width = this.container.offsetWidth;
        const height = this.container.offsetHeight;
        
        console.log(`New360Viewer: Creating scene with dimensions: ${width} x ${height}`);
        
        if (width === 0 || height === 0) {
            throw new Error(`Invalid container dimensions: ${width} x ${height}`);
        }
        
        // Create scene
        this.scene = new THREE.Scene();
        console.log('New360Viewer: Scene created');
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(this.options.fov, width / height, 0.1, 1000);
        console.log('New360Viewer: Camera created');
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        
        // Ensure canvas has proper styling
        const canvas = this.renderer.domElement;
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        this.container.appendChild(canvas);
        console.log(`New360Viewer: Renderer created and canvas added`);
        console.log(`New360Viewer: Canvas size: ${canvas.width} x ${canvas.height}`);
        console.log(`New360Viewer: Canvas style: ${canvas.style.cssText}`);
        
        // Create sphere geometry (inverted for inside viewing)
        const geometry = new THREE.SphereGeometry(500, 60, 40);
        geometry.scale(-1, 1, 1); // Invert sphere to view from inside
        console.log('New360Viewer: Sphere geometry created');
        
        // Load texture
        const loader = new THREE.TextureLoader();
        loader.crossOrigin = 'anonymous';
        
        console.log('New360Viewer: Loading texture:', this.imageSrc);
        
        loader.load(
            this.imageSrc,
            (texture) => {
                console.log('New360Viewer: Texture loaded successfully');
                this.texture = texture;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                
                // Create material
                const material = new THREE.MeshBasicMaterial({ map: texture });
                
                // Create sphere mesh
                this.sphere = new THREE.Mesh(geometry, material);
                this.scene.add(this.sphere);
                
                console.log('New360Viewer: Sphere mesh created and added to scene');
                
                // Position camera at center
                this.camera.position.set(0, 0, 0);
                
            },
            (progress) => {
                const percent = (progress.loaded / progress.total * 100).toFixed(1);
                console.log(`New360Viewer: Loading progress: ${percent}%`);
            },
            (error) => {
                console.error('New360Viewer: Texture loading failed:', error);
                this.createFallbackViewer();
            }
        );
        
        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    createFallbackViewer() {
        console.log('New360Viewer: Creating fallback viewer');
        this.container.innerHTML = `
            <div class="fallback-360-viewer">
                <img src="${this.imageSrc}" alt="360° Panoramic Image" class="fallback-image">
                <div class="fallback-message">360° viewer not available - showing image</div>
            </div>
        `;
        this.addCSS();
    }
    
    addEventListeners() {
        const canvas = this.renderer?.domElement;
        if (!canvas) return;
        
        console.log('New360Viewer: Adding event listeners');
        
        // Mouse events
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('mouseup', () => this.onMouseUp());
        canvas.addEventListener('mouseleave', () => this.onMouseUp());
        canvas.addEventListener('wheel', (e) => this.onMouseWheel(e));
        
        // Touch events
        canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        canvas.addEventListener('touchend', () => this.onTouchEnd());
        
        // Prevent context menu
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    onMouseDown(event) {
        event.preventDefault();
        this.isMouseDown = true;
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
        this.hasMovedMouse = false; // Track if mouse has moved
        this.stopAutoRotate();
        
        // Mark parent container as potentially dragging
        const parentSlider = this.container.closest('.picture-slider-container');
        if (parentSlider && parentSlider._pictureSlider) {
            parentSlider._pictureSlider.isDragging = false; // Reset initially
        }
    }
    
    onMouseMove(event) {
        if (!this.isMouseDown) return;
        
        const deltaX = event.clientX - this.mouseX;
        const deltaY = event.clientY - this.mouseY;
        
        // Mark that we've moved the mouse
        if (!this.hasMovedMouse && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
            this.hasMovedMouse = true;
            
            // Tell parent slider we're dragging
            const parentSlider = this.container.closest('.picture-slider-container');
            if (parentSlider && parentSlider._pictureSlider) {
                parentSlider._pictureSlider.isDragging = true;
            }
        }
        
        // Increased sensitivity for more responsive movement
        this.lon -= deltaX * this.options.sensitivity * 0.8;
        this.lat += deltaY * this.options.sensitivity * 0.8;
        
        this.lat = Math.max(-85, Math.min(85, this.lat));
        
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
    }
    
    onMouseUp() {
        this.isMouseDown = false;
        
        // Keep drag state for a moment to prevent click
        if (this.hasMovedMouse) {
            const parentSlider = this.container.closest('.picture-slider-container');
            if (parentSlider && parentSlider._pictureSlider) {
                // Keep drag state briefly to prevent modal opening
                setTimeout(() => {
                    if (parentSlider._pictureSlider) {
                        parentSlider._pictureSlider.isDragging = false;
                    }
                }, 200);
            }
        }
    }
    
    onMouseWheel(event) {
        event.preventDefault();
        const fov = this.camera.fov + event.deltaY * 0.05;
        this.camera.fov = Math.max(10, Math.min(75, fov));
        this.camera.updateProjectionMatrix();
    }
    
    onTouchStart(event) {
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.mouseX = touch.clientX;
            this.mouseY = touch.clientY;
            this.isMouseDown = true;
            this.stopAutoRotate();
        }
    }
    
    onTouchMove(event) {
        if (event.touches.length === 1 && this.isMouseDown) {
            event.preventDefault();
            const touch = event.touches[0];
            const deltaX = touch.clientX - this.mouseX;
            const deltaY = touch.clientY - this.mouseY;
            
            // Increased sensitivity for more responsive touch movement
            this.lon -= deltaX * this.options.sensitivity * 0.8;
            this.lat += deltaY * this.options.sensitivity * 0.8;
            
            this.lat = Math.max(-85, Math.min(85, this.lat));
            
            this.mouseX = touch.clientX;
            this.mouseY = touch.clientY;
        }
    }
    
    onTouchEnd() {
        this.isMouseDown = false;
    }
    
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        const width = this.container.offsetWidth;
        const height = this.container.offsetHeight;
        
        console.log(`New360Viewer: Resizing to ${width} x ${height}`);
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    animate() {
        if (!this.renderer || !this.scene || !this.camera) return;
        
        requestAnimationFrame(() => this.animate());
        
        // Update camera position based on mouse/touch input
        this.phi = THREE.MathUtils.degToRad(90 - this.lat);
        this.theta = THREE.MathUtils.degToRad(this.lon);
        
        this.camera.position.x = 100 * Math.sin(this.phi) * Math.cos(this.theta);
        this.camera.position.y = 100 * Math.cos(this.phi);
        this.camera.position.z = 100 * Math.sin(this.phi) * Math.sin(this.theta);
        
        this.camera.lookAt(0, 0, 0);
        
        // Auto-rotate
        if (this.autoRotateTimer && !this.isMouseDown) {
            this.lon += this.options.rotateSpeed;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    startAutoRotate() {
        this.autoRotateTimer = true;
        console.log('New360Viewer: Auto-rotate started');
    }
    
    stopAutoRotate() {
        this.autoRotateTimer = false;
        console.log('New360Viewer: Auto-rotate stopped');
    }
    
    resetView() {
        this.lon = 0;
        this.lat = 0;
        if (this.camera) {
            this.camera.fov = this.options.fov;
            this.camera.updateProjectionMatrix();
        }
        console.log('New360Viewer: View reset');
    }
    
    destroy() {
        console.log('New360Viewer: Destroying...');
        
        this.stopAutoRotate();
        
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
        
        if (this.texture) {
            this.texture.dispose();
        }
        
        this.container.innerHTML = '';
        console.log('New360Viewer: Destroyed');
    }
    
    addCSS() {
        const styleId = 'new-360-viewer-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .new-360-viewer {
                position: relative;
                width: 100%;
                height: 100%;
                overflow: hidden;
                background: #000;
                cursor: grab;
                user-select: none;
            }
            
            .new-360-viewer:active {
                cursor: grabbing;
            }
            
            .new-360-viewer canvas {
                display: block !important;
                width: 100% !important;
                height: 100% !important;
            }
            
            .fallback-360-viewer {
                position: relative;
                width: 100%;
                height: 100%;
                overflow: hidden;
                background: #000;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
            }
            
            .fallback-image {
                max-width: 100%;
                max-height: 80%;
                object-fit: contain;
            }
            
            .fallback-message {
                color: white;
                padding: 10px;
                text-align: center;
                font-size: 14px;
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Global function to create new 360° viewer
window.createNew360Viewer = function(container, imageSrc, options = {}) {
    return new New360Viewer(container, imageSrc, options);
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = New360Viewer;
}
