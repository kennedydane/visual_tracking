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
    const customGroup = document.getElementById('custom-colors-group');
    const customBgColor = document.getElementById('custom-bg-color');
    const customBallColor = document.getElementById('custom-ball-color');
    const pathOpacitySlider = document.getElementById('path-opacity-slider');
    const pathOpacityVal = document.getElementById('path-opacity-val');
    const cycleSettingsGroup = document.getElementById('cycle-settings-group');
    const cycleDurationSlider = document.getElementById('cycle-duration-slider');
    const cycleDurationVal = document.getElementById('cycle-duration-val');
    const cycleCheckboxes = document.querySelectorAll('#cycle-checkboxes input[type="checkbox"]');
    const sessionTimerEl = document.getElementById('session-timer');
    const resetTimerBtn = document.getElementById('reset-timer-btn');
    const cycleControlsContainer = document.getElementById('cycle-controls-container');
    const cyclePrevBtn = document.getElementById('cycle-prev-btn');
    const cyclePauseBtn = document.getElementById('cycle-pause-btn');
    const cycleNextBtn = document.getElementById('cycle-next-btn');
    
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
    let totalExerciseTime = 0; // ms accumulated
    
    // Settings configuration
    const config = {
        pattern: 'horizontal',
        speed: 1, // multiplier
        size: 30, // radius
        count: 1, // number of balls
        trail: 0, // opacity for trailing, 0 means full clear
        pathOpacity: 0.25,
        cycleDuration: 30, // seconds
        cycleSelected: ['horizontal', 'vertical', 'reading', 'diagonal', 'hourglass', 'fullcross', 'circle', 'figure8', 'square'],
        color: '#00ff88' // Default theme accent
    };
    
    let patternSpeeds = {};
    let activePatternId = config.pattern;
    let cycleTimer = 0;
    let currentCycleIndex = 0;
    let isCyclePaused = false;
    
    const transition = {
        active: false,
        startTime: 0,
        duration: 800, // ms
        fromPattern: 'horizontal'
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
        reading: (t) => {
            // Sweep like reading a book.
            const pts = [
                {x: -0.8, y: -0.8}, // Line 1 L
                {x:  0.8, y: -0.8}, // Line 1 R
                {x: -0.8, y: -0.4}, // Line 2 L
                {x:  0.8, y: -0.4}, // Line 2 R
                {x: -0.8, y:  0.0}, // Line 3 L
                {x:  0.8, y:  0.0}, // Line 3 R
                {x: -0.8, y:  0.4}, // Line 4 L
                {x:  0.8, y:  0.4}, // Line 4 R
                {x: -0.8, y:  0.8}, // Line 5 L
                {x:  0.8, y:  0.8}, // Line 5 R
                {x: -0.8, y: -0.8}  // Sweeping return to start
            ];
            // 10 Segments
            return getWaypoint(pts, t, 0.75);
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
        localStorage.setItem('eye-tracking-theme', theme);
        
        if (theme === 'custom') {
            customGroup.style.display = 'flex';
            const bg = customBgColor.value;
            const ball = customBallColor.value;
            
            document.documentElement.style.setProperty('--custom-bg', bg);
            document.documentElement.style.setProperty('--custom-canvas', bg);
            document.documentElement.style.setProperty('--custom-panel-bg', hexToRgba(bg, 0.85));
            document.documentElement.style.setProperty('--custom-border', ball);
            document.documentElement.style.setProperty('--custom-text', ball);
            document.documentElement.style.setProperty('--custom-accent', ball);
            document.documentElement.style.setProperty('--custom-ball', ball);
            document.documentElement.style.setProperty('--custom-input-bg', hexToRgba(ball, 0.15));
            
            localStorage.setItem('eye-tracking-custom-bg', bg);
            localStorage.setItem('eye-tracking-custom-ball', ball);
        } else {
            customGroup.style.display = 'none';
        }
        
        // Extract dynamically updated ball color from computed styles
        setTimeout(() => {
            const styles = getComputedStyle(document.body);
            config.color = styles.getPropertyValue('--ball-color').trim();
            if (!isRunning) draw(0);
        }, 50); // Small delay to let CSS apply
    };

    const updateControls = () => {
        config.pattern = patternSelect.value;
        
        if (config.pattern === 'cycle') {
            cycleSettingsGroup.style.display = 'flex';
            cycleControlsContainer.style.display = 'flex';
        } else {
            cycleSettingsGroup.style.display = 'none';
            cycleControlsContainer.style.display = 'none';
        }
        
        config.speed = parseFloat(speedSlider.value);
        patternSpeeds[config.pattern] = config.speed;
        speedVal.textContent = config.speed.toFixed(1) + 'x';
        
        config.size = parseFloat(sizeSlider.value);
        sizeVal.textContent = config.size + 'px';
        
        config.count = parseInt(countSlider.value);
        countVal.textContent = config.count;
        
        config.trail = parseFloat(trailSlider.value);
        trailVal.textContent = Math.round(config.trail * 100) + '%';
        
        config.pathOpacity = parseFloat(pathOpacitySlider.value);
        pathOpacityVal.textContent = Math.round(config.pathOpacity * 100) + '%';
        
        config.cycleDuration = parseInt(cycleDurationSlider.value);
        cycleDurationVal.textContent = config.cycleDuration + 's';
        
        config.cycleSelected = Array.from(cycleCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        const settings = {
            pattern: config.pattern,
            patternSpeeds: patternSpeeds,
            speed: config.speed, // legacy fallback
            size: config.size,
            count: config.count,
            trail: config.trail,
            pathOpacity: config.pathOpacity,
            cycleDuration: config.cycleDuration,
            cycleSelected: config.cycleSelected
        };
        localStorage.setItem('eye-tracking-settings', JSON.stringify(settings));

        if (!isRunning) draw(0);
    };

    // Bind events
    patternSelect.addEventListener('change', () => {
        const newPat = patternSelect.value;
        if (patternSpeeds[newPat] !== undefined) {
            speedSlider.value = patternSpeeds[newPat];
        }
        updateControls();
    });
    speedSlider.addEventListener('input', updateControls);
    sizeSlider.addEventListener('input', updateControls);
    countSlider.addEventListener('input', updateControls);
    trailSlider.addEventListener('input', updateControls);
    pathOpacitySlider.addEventListener('input', updateControls);
    cycleDurationSlider.addEventListener('input', updateControls);
    cycleCheckboxes.forEach(cb => cb.addEventListener('change', updateControls));
    themeSelect.addEventListener('change', updateTheme);
    customBgColor.addEventListener('input', updateTheme);
    customBallColor.addEventListener('input', updateTheme);

    const triggerCycleJump = (step) => {
        if (config.cycleSelected.length === 0) return;
        currentCycleIndex = ((currentCycleIndex + step) % config.cycleSelected.length + config.cycleSelected.length) % config.cycleSelected.length;
        const newPat = config.cycleSelected[currentCycleIndex];
        
        if (newPat !== activePatternId) {
            transition.active = true;
            transition.startTime = window.lastTick || 0;
            transition.fromPattern = activePatternId;
            activePatternId = newPat;
            
            if (patternSpeeds[activePatternId] !== undefined && speedSlider.value != patternSpeeds[activePatternId]) {
                speedSlider.value = patternSpeeds[activePatternId];
                config.speed = parseFloat(speedSlider.value);
                speedVal.textContent = config.speed.toFixed(1) + 'x';
            }
        }
        cycleTimer = 0; // reset
    };
    
    cyclePrevBtn.addEventListener('click', () => triggerCycleJump(-1));
    cycleNextBtn.addEventListener('click', () => triggerCycleJump(1));
    cyclePauseBtn.addEventListener('click', () => {
        isCyclePaused = !isCyclePaused;
        cyclePauseBtn.textContent = isCyclePaused ? '▶️' : '⏸️';
        cyclePauseBtn.title = isCyclePaused ? 'Resume Cycle' : 'Pause Cycle';
    });

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
            localStorage.setItem('eye-tracking-timer', totalExerciseTime);
        }
    });

    // Helper to format/render timer
    const updateTimerDisplay = () => {
        const totalSeconds = Math.floor(totalExerciseTime / 1000);
        // Going over 59:59 drops back to 00:00 without tracking hours as requested
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const seconds = totalSeconds % 60;
        
        const mStr = minutes.toString().padStart(2, '0');
        const sStr = seconds.toString().padStart(2, '0');
        
        sessionTimerEl.textContent = `${mStr}:${sStr}`;
    };

    resetTimerBtn.addEventListener('click', () => {
        totalExerciseTime = 0;
        updateTimerDisplay();
        localStorage.setItem('eye-tracking-timer', 0);
    });

    // Save timer periodically while running
    setInterval(() => {
        if (isRunning) {
            localStorage.setItem('eye-tracking-timer', totalExerciseTime);
        }
    }, 5000);

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

        const patternFunc = patterns[activePatternId];
        
        // Draw path if requested (and not random or currently transitioning intensely)
        if (config.pathOpacity > 0 && activePatternId !== 'random' && !transition.active) {
            const periods = {
                horizontal: 2, vertical: 2, 
                reading: 10 / 0.75,
                diagonal: 4 / 0.75, hourglass: 4 / 0.75,
                fullcross: 12 / 0.75, circle: 2, figure8: 2, square: 4
            };
            const period = periods[activePatternId] || 2;
            const samples = Math.max(100, Math.floor(period * 25)); // adaptive sampling based on length
            
            ctx.beginPath();
            ctx.strokeStyle = hexToRgba(config.color, config.pathOpacity);
            ctx.lineWidth = 4;
            
            for (let i = 0; i <= samples; i++) {
                const sampleT = (i / samples) * period;
                const pos = patternFunc(sampleT);
                const screenX = (width / 2) + pos.x * (width / 2 - config.size);
                const screenY = (height / 2) + pos.y * (height / 2 - config.size);
                
                if (i === 0) {
                    ctx.moveTo(screenX, screenY);
                } else {
                    // Specific override: Do not draw the final sweep-return line for 'reading'
                    if (activePatternId === 'reading' && (sampleT * 0.75) > 9.0) {
                        ctx.moveTo(screenX, screenY); // lift pen
                    } else {
                        ctx.lineTo(screenX, screenY);
                    }
                }
            }
            
            // Close loops natively
            if (['circle', 'figure8', 'square', 'diagonal', 'hourglass', 'fullcross'].includes(activePatternId)) {
                ctx.closePath();
            }
            ctx.stroke();
        }
        
        // Draw multiple balls if configured
        for (let i = 0; i < config.count; i++) {
            // Offset time for each subsequent ball to create following effect
            // The spacing depends on speed and path, 0.2s is a good default lag
            const timeOffset = i * 0.2 * config.speed; 
            const ballT = Math.max(0, t - timeOffset);
            
            let pos = patternFunc(ballT);
            
            // Continuous Function Lerping for Smooth Transitions
            if (transition.active) {
                let progress = (elapsedTime - transition.startTime) / transition.duration;
                if (progress < 1.0) {
                    // Ease-in-out curve
                    const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                    
                    const fromFunc = patterns[transition.fromPattern] || patterns.horizontal;
                    const fromPos = fromFunc(ballT);
                    
                    pos = {
                        x: fromPos.x + (pos.x - fromPos.x) * ease,
                        y: fromPos.y + (pos.y - fromPos.y) * ease
                    };
                } else if (i === config.count - 1) {
                    transition.active = false; // End transition once final trailing ball completes
                }
            }
            
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
        const dt = elapsedTime - (window.lastTick || 0);
        window.lastTick = elapsedTime; // save state for pausing
        
        // Track visual timer duration natively synced against frames
        totalExerciseTime += dt;
        updateTimerDisplay();
        
        // Handle Auto-Cycling
        if (config.pattern === 'cycle' && config.cycleSelected.length > 0) {
            if (!isCyclePaused) {
                cycleTimer += dt;
                if (cycleTimer > config.cycleDuration * 1000) {
                    triggerCycleJump(1);
                }
            }
        } else {
            // Manual Mode: Catch UI dropdown changing config.pattern directly
            const reqPat = config.pattern === 'cycle' ? (config.cycleSelected[0] || 'horizontal') : config.pattern;
            if (activePatternId !== reqPat) {
                transition.active = true;
                transition.startTime = elapsedTime;
                transition.fromPattern = activePatternId;
                activePatternId = reqPat;
            }
            cycleTimer = 0; // maintain reset while manual
        }
        
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

    // Load Saved State
    const loadSettings = () => {
        const savedTheme = localStorage.getItem('eye-tracking-theme');
        if (savedTheme) {
            themeSelect.value = savedTheme;
        }

        const savedTimer = localStorage.getItem('eye-tracking-timer');
        if (savedTimer) {
            totalExerciseTime = parseFloat(savedTimer);
            updateTimerDisplay();
        }

        const savedBg = localStorage.getItem('eye-tracking-custom-bg');
        if (savedBg) customBgColor.value = savedBg;
        
        const savedBall = localStorage.getItem('eye-tracking-custom-ball');
        if (savedBall) customBallColor.value = savedBall;

        const savedJSON = localStorage.getItem('eye-tracking-settings');
        if (savedJSON) {
            try {
                const s = JSON.parse(savedJSON);
                if (s.patternSpeeds) {
                    patternSpeeds = s.patternSpeeds;
                }
                if (s.pattern) {
                    patternSelect.value = s.pattern;
                    if (patternSpeeds[s.pattern]) speedSlider.value = patternSpeeds[s.pattern];
                }
                if (s.speed && (!s.patternSpeeds || !s.patternSpeeds[s.pattern])) speedSlider.value = s.speed;
                if (s.size) sizeSlider.value = s.size;
                if (s.count) countSlider.value = s.count;
                if (s.trail !== undefined) trailSlider.value = s.trail;
                if (s.pathOpacity !== undefined) {
                    pathOpacitySlider.value = s.pathOpacity;
                } else if (s.showPath !== undefined) {
                    // Legacy boolean support
                    pathOpacitySlider.value = s.showPath ? 0.25 : 0;
                }
                if (s.cycleDuration !== undefined) cycleDurationSlider.value = s.cycleDuration;
                if (s.cycleSelected !== undefined && Array.isArray(s.cycleSelected)) {
                    cycleCheckboxes.forEach(cb => {
                        cb.checked = s.cycleSelected.includes(cb.value);
                    });
                }
            } catch (e) {
                console.error("Local storage parse error", e);
            }
        }
    };

    // Initialize
    loadSettings();
    resize();
    updateTheme();
    updateControls();
    updateTimerDisplay();
    
    // Draw initial state
    draw(0);
});
