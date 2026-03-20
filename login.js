
// Check if already logged in
if (localStorage.getItem('auth_token')) {
    window.location.href = 'dashboard.html';
}

// Login handler
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('user_email', email);
            window.location.href = 'dashboard.html';
        } else {
            alert('Invalid email or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Error during login');
    }
});

// Google OAuth
document.getElementById('google').addEventListener('click', () => {
    // Redirect to Google OAuth flow
    window.location.href = `${API_BASE_URL}/auth/google`;
});

// Outlook OAuth
document.getElementById('outlook').addEventListener('click', () => {
    // Redirect to Outlook OAuth flow
    window.location.href = `${API_BASE_URL}/auth/outlook`;
});

