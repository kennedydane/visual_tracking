document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const canvas = document.getElementById('tracking-canvas');
    const ctx = canvas.getContext('2d');
    
    // UI Elements
    const patternSelect = document.getElementById('pattern-select');
    const speedSlider = document.getElementById('speed-slider');
    const sizeSlider = document.getElementById('size-slider');
    const themeSelect = document.getElementById('theme-select');
    const countSlider = document.getElementById('count-slider');
    const trailSlider = document.getElementById('trail-slider');
    const startBtn = document.getElementById('start-btn');
    const togglePanelBtn = document.getElementById('toggle-panel-btn');
    const controlsPanel = document.querySelector('.controls-panel');
    const fullscreenBtn = document.getElementById('toggle-fullscreen');
    
    // Value Displays
    const speedVal = document.getElementById('speed-val');
    const sizeVal = document.getElementById('size-val');
    const countVal = document.getElementById('count-val');
    const trailVal = document.getElementById('trail-val');

    // --- State ---
    let isRunning = false;
    let width, height;
    let animationId = null;
    let startTime = 0;
    
    // Settings configuration
    const config = {
        pattern: 'horizontal',
        speed: 1, // multiplier
        size: 30, // radius
        count: 1, // number of balls
        trail: 0, // opacity for trailing, 0 means full clear
        color: '#00ff88' // Default theme accent
    };

    // --- Path Helpers ---
    const getWaypoint = (pts, t, speedScaling = 0.5) => {
        const numSegments = pts.length - 1;
        // Scale time so it's a bit slower since we have long segments
        const cycleT = (t * speedScaling) % numSegments;
        const idx = Math.floor(cycleT);
        
        // Easing interpolation for smooth corners (Sine ease-in-out)
        const frac = cycleT - idx;
        const smoothFrac = 0.5 - Math.cos(frac * Math.PI) / 2;

        const p1 = pts[idx];
        const p2 = pts[idx + 1];
        return {
            x: p1.x + (p2.x - p1.x) * smoothFrac,
            y: p1.y + (p2.y - p1.y) * smoothFrac
        };
    };

    // --- Patterns Dictionary ---
    // Each pattern returns normalized coordinates [-1, 1] relative to center based on time (t)
    const patterns = {
        horizontal: (t) => {
            const cycle = (t % 2); // 0 to 2
            let x = cycle < 1 ? -1 + (cycle * 2) : 1 - ((cycle - 1) * 2); // Ping-pong -1 to 1
            // Smooth out edges with sine
            x = Math.sin(t * Math.PI - Math.PI/2);
            return { x: x * 0.8, y: 0 };
        },
        vertical: (t) => {
            const y = Math.sin(t * Math.PI - Math.PI/2);
            return { x: 0, y: y * 0.8 };
        },
        diagonal: (t) => {
            // As exactly requested: TL -> BL -> BR -> TR -> TL
            const pts = [
                {x: -0.8, y: -0.8}, // Top-Left
                {x: -0.8, y:  0.8}, // Bottom-Left 
                {x:  0.8, y:  0.8}, // Bottom-Right
                {x:  0.8, y: -0.8}, // Top-Right
                {x: -0.8, y: -0.8}  // Top-Left
            ];
            return getWaypoint(pts, t, 0.75); 
        },
        hourglass: (t) => {
            // Hourglass shape captures both diagonal crossings smoothly
            const pts = [
                {x: -0.8, y: -0.8}, // Top-Left
                {x:  0.8, y:  0.8}, // Bottom-Right (Diagonal)
                {x:  0.8, y: -0.8}, // Top-Right (Up)
                {x: -0.8, y:  0.8}, // Bottom-Left (Diagonal)
                {x: -0.8, y: -0.8}  // Top-Left (Up)
            ];
            return getWaypoint(pts, t, 0.75); 
        },
        fullcross: (t) => {
            // Double-crosses the screen, traveling edges in between exactly as requested
            const pts = [
                {x: -0.8, y: -0.8}, // TL
                {x:  0.8, y:  0.8}, // BR
                {x: -0.8, y: -0.8}, // TL
                {x: -0.8, y:  0.8}, // BL
                {x:  0.8, y: -0.8}, // TR
                {x: -0.8, y:  0.8}, // BL
                {x:  0.8, y:  0.8}, // BR
                {x: -0.8, y: -0.8}, // TL
                {x:  0.8, y:  0.8}, // BR
                {x:  0.8, y: -0.8}, // TR
                {x: -0.8, y:  0.8}, // BL
                {x:  0.8, y: -0.8}, // TR
                {x: -0.8, y: -0.8}  // TL
            ];
            return getWaypoint(pts, t, 0.75); 
        },
        circle: (t) => {
            return {
                x: Math.cos(t * Math.PI) * 0.7,
                y: Math.sin(t * Math.PI) * 0.7
            };
        },
        figure8: (t) => {
            // Lemniscate of Bernoulli or simplest Lissajous figure
            const k = t * Math.PI;
            return {
                x: Math.sin(k) * 0.8,
                y: Math.sin(k * 2) * 0.4 // twice frequency for vertical
            };
        },
        square: (t) => {
            // Map t onto the 4 sides of a square
            const perimeter = 4;
            const pos = t % perimeter; // 0 to 4
            let x, y;
            if (pos < 1) { // Top edge
                x = -1 + (pos * 2); y = -1;
            } else if (pos < 2) { // Right edge
                x = 1; y = -1 + ((pos - 1) * 2);
            } else if (pos < 3) { // Bottom edge
                x = 1 - ((pos - 2) * 2); y = 1;
            } else { // Left edge
                x = -1; y = 1 - ((pos - 3) * 2);
            }
            return { x: x * 0.7, y: y * 0.7 };
        },
        random: (() => {
            // Keep state for smooth random pursuit
            let tx = 0, ty = Math.PI * 100;
            return (t) => {
                // Pseudo random smooth movement using multiple sines
                const x = Math.sin(t * 0.8) * 0.5 + Math.sin(t * 1.5) * 0.4 + Math.sin(t * 0.5) * 0.1;
                const y = Math.cos(t * 0.7) * 0.5 + Math.sin(t * 1.3) * 0.4 + Math.cos(t * 1.1) * 0.1;
                return { x: x * 0.8, y: y * 0.8 };
            };
        })()
    };

    // --- Initialization & Resizing ---
    const resize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        // Fix for high DPI displays
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        // Don't fully clear if paused, but force a redraw
        if (!isRunning) draw(0); 
    };

    window.addEventListener('resize', resize);
    
    // --- Update Methods ---
    const updateTheme = () => {
        const theme = themeSelect.value;
        document.body.setAttribute('data-theme', theme);
        // Extract dynamically updated ball color from computed styles
        setTimeout(() => {
            const styles = getComputedStyle(document.body);
            config.color = styles.getPropertyValue('--ball-color').trim();
            if (!isRunning) draw(0);
        }, 50); // Small delay to let CSS apply
    };

    const updateControls = () => {
        config.pattern = patternSelect.value;
        
        config.speed = parseFloat(speedSlider.value);
        speedVal.textContent = config.speed.toFixed(1) + 'x';
        
        config.size = parseFloat(sizeSlider.value);
        sizeVal.textContent = config.size + 'px';
        
        config.count = parseInt(countSlider.value);
        countVal.textContent = config.count;
        
        config.trail = parseFloat(trailSlider.value);
        trailVal.textContent = Math.round(config.trail * 100) + '%';
        
        if (!isRunning) draw(0);
    };

    // Bind events
    patternSelect.addEventListener('change', updateControls);
    speedSlider.addEventListener('input', updateControls);
    sizeSlider.addEventListener('input', updateControls);
    countSlider.addEventListener('input', updateControls);
    trailSlider.addEventListener('input', updateControls);
    themeSelect.addEventListener('change', updateTheme);

    togglePanelBtn.addEventListener('click', () => {
        controlsPanel.classList.toggle('hidden');
        togglePanelBtn.classList.toggle('active');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            controlsPanel.classList.toggle('hidden');
            togglePanelBtn.classList.toggle('active');
        } else if (e.code === 'Space' && e.target.tagName !== 'BUTTON') {
            // Space to toggle pause/play (but not if focused on a button already)
            e.preventDefault();
            startBtn.click();
        }
    });

    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    startBtn.addEventListener('click', () => {
        isRunning = !isRunning;
        if (isRunning) {
            startBtn.textContent = 'Pause Exercise';
            startBtn.style.backgroundColor = 'var(--text-color)';
            startTime = performance.now() - (window.lastTick || 0);
            controlsPanel.classList.add('hidden'); // auto hide panel 
            togglePanelBtn.classList.remove('active');
            loop(performance.now());
        } else {
            startBtn.textContent = 'Start Exercise';
            startBtn.style.backgroundColor = 'var(--accent-color)';
            cancelAnimationFrame(animationId);
        }
    });

    // --- Render Loop ---
    const draw = (elapsedTime) => {
        // Base time unit (speed multiplier applies)
        const t = (elapsedTime / 1000) * config.speed; 
        
        // Handle Clear vs Trail
        if (config.trail === 0) {
            ctx.clearRect(0, 0, width, height);
        } else {
            // Get background color from CSS
            const styles = getComputedStyle(document.body);
            let bgColor = styles.getPropertyValue('--canvas-bg').trim();
            // Fallback parsing (very simple) if it's hex, convert to rgba
            if (bgColor.startsWith('#')) bgColor = hexToRgba(bgColor, 1 - config.trail);
            else bgColor = `rgba(0,0,0, ${1 - config.trail})`; // fallback black
            
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, width, height);
        }

        const patternFunc = patterns[config.pattern];
        
        // Draw multiple balls if configured
        for (let i = 0; i < config.count; i++) {
            // Offset time for each subsequent ball to create following effect
            // The spacing depends on speed and path, 0.2s is a good default lag
            const timeOffset = i * 0.2 * config.speed; 
            const ballT = Math.max(0, t - timeOffset);
            
            const pos = patternFunc(ballT);
            
            // Map normalized [-1, 1] coords to screen, leaving margin for ball radius
            const minDim = Math.min(width, height) / 2 - config.size;
            
            const screenX = (width / 2) + pos.x * (width / 2 - config.size);
            const screenY = (height / 2) + pos.y * (height / 2 - config.size);

            // Calculate scaled radius
            let r = config.size;
            // Optionally scale down trailing balls
            if (config.count > 1) {
                // decrease size for trailing balls slightly
                r = Math.max(config.size * (1 - (i * 0.1)), 5);
            }

            // Draw shadow/glow
            ctx.shadowBlur = 15;
            ctx.shadowColor = config.color;
            
            // Draw Ball
            ctx.beginPath();
            ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
            ctx.fillStyle = config.color;
            ctx.fill();
            ctx.closePath();
            
            // Reset shadow
            ctx.shadowBlur = 0;
        }
    };

    const loop = (timestamp) => {
        if (!isRunning) return;
        
        const elapsedTime = timestamp - startTime;
        window.lastTick = elapsedTime; // save state for pausing
        
        draw(elapsedTime);
        animationId = requestAnimationFrame(loop);
    };

    // Helper
    function hexToRgba(hex, alpha) {
        let r = parseInt(hex.slice(1, 3), 16),
            g = parseInt(hex.slice(3, 5), 16),
            b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Initialize
    resize();
    updateTheme();
    updateControls();
    
    // Draw initial state
    draw(0);
});
