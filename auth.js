// Global auth0 instance
let auth0Client = null;

// Global user settings
window.userSettings = {
    emailNotifications: true,
    timerAlerts: true
};

const fetchAuthConfig = () => {
    return {
        domain: "dev-p6gwlkrt2p6bu5m0.us.auth0.com",
        clientId: "de5IT4fjw4OebBrhkKA7Dp0D6vO2L2Bd",
        audience: "https://mostudy.org/api"
    };
};

const configureClient = async () => {
    const config = fetchAuthConfig();
    auth0Client = await auth0.createAuth0Client({
        domain: config.domain,
        clientId: config.clientId,
        cacheLocation: 'localstorage',
        authorizationParams: {
            audience: config.audience,
            redirect_uri: window.location.origin + "/account"
        }
    });
};

let settingsListenersBound = false;

const getSettingsElements = () => {
    return {
        emailToggle: document.getElementById('notif-toggle'),
        timerToggle: document.getElementById('timer-sounds-toggle'),
        saveBtn: document.getElementById('save-settings-btn')
    };
};

const setSettingsEnabled = (enabled) => {
    const { emailToggle, timerToggle, saveBtn } = getSettingsElements();
    if (emailToggle) emailToggle.disabled = !enabled;
    if (timerToggle) timerToggle.disabled = !enabled;
    if (saveBtn) saveBtn.disabled = !enabled;
};

const apiRequest = async (path, options = {}) => {
    const token = await auth0Client.getTokenSilently();
    const headers = {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
    };

    if (options.body) {
        headers['Content-Type'] = 'application/json';
    }

    return fetch(path, {
        ...options,
        headers
    });
};

const showStatus = (message, isError = false) => {
    const statusEl = document.getElementById('settings-status');
    if (!statusEl) return;
    
    statusEl.textContent = message;
    statusEl.className = `text-sm font-medium transition-opacity duration-300 ${isError ? 'text-red-500' : 'text-emerald-500'}`;
    statusEl.style.opacity = '1';
    
    setTimeout(() => {
        statusEl.style.opacity = '0';
    }, 3000);
};

const loadSettings = async () => {
    try {
        const response = await apiRequest('/api/user-settings');
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.warn('Failed to load settings:', errData.message || 'Server error');
            return;
        }

        const data = await response.json();
        window.userSettings = {
            emailNotifications: data.emailNotifications ?? true,
            timerAlerts: data.timerAlerts ?? true
        };

        const { emailToggle, timerToggle } = getSettingsElements();
        if (emailToggle) emailToggle.checked = Boolean(window.userSettings.emailNotifications);
        if (timerToggle) timerToggle.checked = Boolean(window.userSettings.timerAlerts);
    } catch (error) {
        console.error('Settings load error:', error);
        showStatus('Error loading settings', true);
    }
};

const saveSettings = async () => {
    const { emailToggle, timerToggle, saveBtn } = getSettingsElements();
    if (!emailToggle || !timerToggle) return;

    window.userSettings = {
        emailNotifications: emailToggle.checked,
        timerAlerts: timerToggle.checked
    };

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
    }

    showStatus('Saving...');
    try {
        const response = await apiRequest('/api/user-settings', {
            method: 'POST',
            body: JSON.stringify(window.userSettings)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || 'Failed to save settings');
        }
        showStatus('Settings saved');
    } catch (error) {
        console.error('Settings save error:', error);
        showStatus('Error saving settings', true);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    }
};

const bindSettingsListeners = () => {
    if (settingsListenersBound) return;

    const { saveBtn } = getSettingsElements();
    if (!saveBtn) return;

    saveBtn.addEventListener('click', saveSettings);
    settingsListenersBound = true;
};

const updateUI = async () => {
    const isAuthenticated = await auth0Client.isAuthenticated();
    const btn = document.getElementById("google-signin-btn");
    
    if (!btn) return;

    // Clone button to remove old event listeners
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    if (isAuthenticated) {
        const user = await auth0Client.getUser();
        newBtn.innerHTML = `<span>Sign Out (${user.name || user.email})</span>`;
        newBtn.onclick = logout;
        setSettingsEnabled(true);
        await loadSettings();
        bindSettingsListeners();
    } else {
        newBtn.innerHTML = `
        <svg class="h-6 w-6" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span>Sign in with Google</span>`;
        newBtn.onclick = login;
        setSettingsEnabled(false);
        
        // Check if configuration is missing
        if (fetchAuthConfig().clientId === "YOUR_AUTH0_CLIENT_ID") {
            newBtn.innerHTML = "<span>Config Error: Generic Client ID</span>";
            newBtn.onclick = () => alert("Please update auth.js with your Auth0 Client ID");
        }
    }
};

const login = async () => {
    try {
        await auth0Client.loginWithRedirect({
            authorizationParams: {
                connection: 'google-oauth2'
            }
        });
    } catch(e) {
        console.error("Login Error:", e);
        alert("Login failed. See console for details.");
    }
};

const logout = () => {
    auth0Client.logout({
        logoutParams: {
            returnTo: window.location.origin + "/account"
        }
    });
};

// Initialize
window.addEventListener('load', async () => {
    await configureClient();
    
    // Check for callback
    const query = window.location.search;
    if (query.includes("code=") && query.includes("state=")) {
        try {
            await auth0Client.handleRedirectCallback();
            window.history.replaceState({}, document.title, "/account");
        } catch (e) {
            console.error("Callback Error:", e);
        }
    }
    
    await updateUI();
});
