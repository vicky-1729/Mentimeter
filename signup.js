// Check if already logged in
if (localStorage.getItem('auth_token')) {
    window.location.href = 'dashboard.html';
}

// Signup handler
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    if (password.length < 8) {
        alert('Password must be at least 8 characters');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
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
        } else if (response.status === 409) {
            alert('Email already in use');
        } else {
            alert('Failed to create account');
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('Error during signup');
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
