// ================== DEBUGGING UTILITIES ==================
window.createDebugPanel = function() {
    let debugPanel = document.getElementById('linkedin-debug-panel');
    if (!debugPanel) {
        debugPanel = document.createElement('div');
        debugPanel.id = 'linkedin-debug-panel';
        Object.assign(debugPanel.style, {
            position: 'fixed',
            right: '100px',
            top: '75px',
            width: '400px',
            maxHeight: '80vh',
            backgroundColor: '#1a1a1a',
            color: '#fff',
            padding: '15px',
            borderRadius: '8px',
            zIndex: '10000',
            fontFamily: 'monospace',
            fontSize: '14px',
            overflowY: 'auto',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
            cursor: 'move' // Change cursor to indicate draggable
        });

        // Add header
        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            borderBottom: '1px solid #333',
            paddingBottom: '10px'
        });

        const title = document.createElement('div');
        title.textContent = 'LinkedIn Debug Panel';
        title.style.fontWeight = 'bold';

        const controls = document.createElement('div');
        
        // Clear button
        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear';
        Object.assign(clearBtn.style, {
            backgroundColor: '#333',
            color: '#fff',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '5px'
        });
        clearBtn.onclick = () => {
            const logContainer = document.getElementById('debug-log-container');
            if (logContainer) logContainer.innerHTML = '';
        };

        // Toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = 'Hide';
        Object.assign(toggleBtn.style, {
            backgroundColor: '#333',
            color: '#fff',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer'
        });

        let isVisible = true;
        toggleBtn.onclick = () => {
            const logContainer = document.getElementById('debug-log-container');
            if (logContainer) {
                isVisible = !isVisible;
                logContainer.style.display = isVisible ? 'block' : 'none';
                toggleBtn.textContent = isVisible ? 'Hide' : 'Show';
            }
        };

        controls.appendChild(clearBtn);
        controls.appendChild(toggleBtn);
        header.appendChild(title);
        header.appendChild(controls);
        debugPanel.appendChild(header);

        // Add log container
        const logContainer = document.createElement('div');
        logContainer.id = 'debug-log-container';
        Object.assign(logContainer.style, {
            maxHeight: 'calc(80vh - 50px)',
            overflowY: 'auto'
        });
        debugPanel.appendChild(logContainer);

        document.body.appendChild(debugPanel);

        // Add drag-and-drop functionality
        let isDragging = false;
        let offsetX, offsetY;

        debugPanel.addEventListener('mousedown', (e) => {
            if (e.target === debugPanel || e.target === header) {
                isDragging = true;
                offsetX = e.clientX - debugPanel.offsetLeft;
                offsetY = e.clientY - debugPanel.offsetTop;
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                debugPanel.style.left = `${e.clientX - offsetX}px`;
                debugPanel.style.top = `${e.clientY - offsetY}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }
    return debugPanel;
};

window.debugLog = function(staticText, dynamicText, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logContainer = document.getElementById('debug-log-container');
    
    if (!logContainer) {
        window.createDebugPanel();
        return window.debugLog(staticText, dynamicText, type);
    }

    // Create log entry
    const logEntry = document.createElement('div');
    Object.assign(logEntry.style, {
        borderLeft: '3px solid',
        padding: '8px',
        margin: '5px 0',
        backgroundColor: '#2a2a2a'
    });

    // Set colors and icons based on type
    const typeConfig = {
        info: { 
            color: '#3498db', // Border color
            staticColor: '#ffffff', // Static text color (white)
            dynamicColor: '#f1c40f', // Dynamic text color (yellow)
            icon: 'ℹ️', 
            consoleMethod: 'log' 
        },
        success: { 
            color: '#2ecc71', // Border color
            staticColor: '#ffffff', // Static text color (white)
            dynamicColor: '#00ff00', // Dynamic text color (bright green)
            icon: '✅', 
            consoleMethod: 'log' 
        },
        warning: { 
            color: '#f1c40f', // Border color
            staticColor: '#ffffff', // Static text color (white)
            dynamicColor: '#ffa500', // Dynamic text color (orange)
            icon: '⚠️', 
            consoleMethod: 'warn' 
        },
        error: { 
            color: '#e74c3c', // Border color
            staticColor: '#ffffff', // Static text color (white)
            dynamicColor: '#ff6666', // Dynamic text color (light red)
            icon: '❌', 
            consoleMethod: 'error' 
        },
        processing: { 
            color: '#9b59b6', // Border color
            staticColor: '#ffffff', // Static text color (white)
            dynamicColor: '#bb8fce', // Dynamic text color (light purple)
            icon: '⚙️', 
            consoleMethod: 'log' 
        }
    };

    const config = typeConfig[type] || typeConfig.info;
    logEntry.style.borderLeftColor = config.color;

    // Format the dynamic text if it's an object
    let formattedDynamicText = '';
    if (dynamicText !== undefined) {
        formattedDynamicText = typeof dynamicText === 'object' && dynamicText !== null
            ? JSON.stringify(dynamicText, null, 2) // Pretty-print the object
            : dynamicText;
    }

    // Combine static and dynamic text with separate colors
    const combinedMessage = dynamicText !== undefined
        ? `<span style="color: ${config.staticColor};">${staticText}</span> <span style="color: ${config.dynamicColor};">${formattedDynamicText}</span>`
        : `<span style="color: ${config.staticColor};">${staticText}</span>`;

    logEntry.innerHTML = `
        <div style="display: flex; align-items: start;">
            <span style="margin-right: 5px">${config.icon}</span>
            <div>
                <span style="color: ${config.color}; font-size: 0.8em">[${timestamp}]</span>
                <pre style="margin: 5px 0; white-space: pre-wrap;">${combinedMessage}</pre>
            </div>
        </div>
    `;

    // Add to panel
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;

    // Also log to console
    console[config.consoleMethod](`${config.icon} [${timestamp}] ${staticText}`, dynamicText);
};