// liveLog.js
let liveLogContainer = null;
let timerElement = null;
let progressIndicator = null;

function createLiveLog() {
    if (!liveLogContainer) {
        // Create main container
        liveLogContainer = document.createElement('div');
        liveLogContainer.id = 'live-log-container';
        
        // Apply color-themed styles
        Object.assign(liveLogContainer.style, {
            position: 'fixed',
            top: '5px',
            left: '5px',
            width: '170px',
            height: '170px',
            backgroundColor: '#1e1f3b',
            color: 'white',
            borderRadius: '50%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Arial, sans-serif',
            boxShadow: '0 4px 20px rgba(62, 0, 255, 0.4)',
            zIndex: '10000',
            border: '3px solid #3e00ff',
            textAlign: 'center',
            padding: '15px',
            boxSizing: 'border-box'
        });

        // Create progress track background
        const trackBg = document.createElement('div');
        trackBg.style.position = 'absolute';
        trackBg.style.width = '170px';
        trackBg.style.height = '170px';
        trackBg.style.borderRadius = '50%';
        trackBg.style.border = '4px solid rgba(255, 255, 255, 0.15)';
        liveLogContainer.appendChild(trackBg);

        // Create progress indicator (initially hidden)
        progressIndicator = document.createElement('div');
        progressIndicator.id = 'progress-indicator';
        progressIndicator.style.position = 'absolute';
        progressIndicator.style.width = '170px';
        progressIndicator.style.height = '170px';
        progressIndicator.style.borderRadius = '50%';
        progressIndicator.style.clipPath = 'polygon(50% 50%, 50% 0%, 50% 0%)'; // Start at top center
        progressIndicator.style.backgroundColor = 'rgba(127, 0, 255, 0.8)'; // Changed to purple with 80% opacity
        progressIndicator.style.transition = 'clip-path 1s linear';
        liveLogContainer.appendChild(progressIndicator);

        // Create timer text
        timerElement = document.createElement('div');
        timerElement.id = 'live-log-timer';
        timerElement.style.fontSize = '36px';
        timerElement.style.fontWeight = 'bold';
        timerElement.style.color = 'white';
        timerElement.style.zIndex = '2';
        timerElement.style.textShadow = '0 0 8px rgba(127, 0, 255, 0.8)';
        timerElement.style.marginBottom = '8px';
        liveLogContainer.appendChild(timerElement);

        // Create status text
        const statusElement = document.createElement('div');
        statusElement.id = 'live-log-status';
        statusElement.style.fontSize = '14px';
        statusElement.style.color = 'rgba(255, 255, 255, 0.8)';
        statusElement.style.marginTop = '8px';
        statusElement.style.zIndex = '2';
        statusElement.style.maxWidth = '150px';
        statusElement.style.textShadow = '0 0 4px rgba(127, 0, 255, 0.5)';
        liveLogContainer.appendChild(statusElement);

        document.body.appendChild(liveLogContainer);
    }
}

function updateLiveLog(status, waitTime = 2) {
    if (!liveLogContainer) createLiveLog();
    
    const statusElement = document.querySelector('#live-log-status');
    statusElement.textContent = status;

    if (waitTime > 0) {
        let remaining = waitTime;
        timerElement.textContent = remaining;
        
        // Reset progress indicator
        progressIndicator.style.clipPath = 'polygon(50% 50%, 50% 0%, 50% 0%)';
        
        const timerInterval = setInterval(() => {
            remaining--;
            timerElement.textContent = remaining;
            
            // Calculate progress (0-1)
            const progress = 1 - (remaining / waitTime);
            
            // Calculate points for the clip-path polygon
            const angle = progress * 2 * Math.PI;
            const x = 50 + 50 * Math.sin(angle);
            const y = 50 - 50 * Math.cos(angle);
            
            // Update clip path to reveal more of the circle
            progressIndicator.style.clipPath = `polygon(50% 50%, 50% 0%, ${x}% ${y}%)`;
            
            if (remaining <= 0) {
                clearInterval(timerInterval);
                // Completion animation (already purple)
                progressIndicator.style.backgroundColor = '#7f00ff';
                setTimeout(() => {
                    timerElement.textContent = '✓';
                  
                        setTimeout(() => {
                            const liveLog = document.getElementById('live-log-container');
                            if (liveLog) {
                                liveLog.style.display = 'none';
                            }
                        }, 3000);
               
                }, 500);
            }
        }, 1000);
    } else {
        timerElement.textContent = '';
    }
}
