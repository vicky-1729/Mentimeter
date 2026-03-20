
const form = document.querySelector("form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const signUpLink = document.querySelector("#sp");
const statusText = document.querySelector("#status");

function setStatus(message, isError) {
    statusText.textContent = message;
    statusText.style.color = isError ? "#b00020" : "#1b5e20";
}

if (signUpLink) {
    signUpLink.addEventListener("click", function () {
        window.location.href = "signup.html";
    });
}

form.addEventListener("submit", async function loginCall(event) {
    event.preventDefault();
    setStatus("", false);

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        setStatus("Please enter email and password.", true);
        return;
    }

    try {
        const response = await AuthService.login({ email, password });
        localStorage.setItem("authToken", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
        setStatus("Login successful. Redirecting...", false);
        setTimeout(function () {
            window.location.href = "navbar.html";
        }, 500);
    } catch (error) {
        setStatus(error.message || "Login failed.", true);
    }
});

