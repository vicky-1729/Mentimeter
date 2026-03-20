const form = document.querySelector("form");
const nameInput = document.querySelector("#name");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const loginLink = document.querySelector("#spa");
const statusText = document.querySelector("#status");

function setStatus(message, isError) {
  statusText.textContent = message;
  statusText.style.color = isError ? "#b00020" : "#1b5e20";
}

if (loginLink) {
  loginLink.addEventListener("click", function () {
    window.location.href = "login.html";
  });
}

form.addEventListener("submit", async function signupCall(event) {
  event.preventDefault();
  setStatus("", false);

  const payload = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim().toLowerCase(),
    password: passwordInput.value.trim()
  };

  if (!payload.name || !payload.email || !payload.password) {
    setStatus("All fields are required.", true);
    return;
  }

  if (payload.password.length < 6) {
    setStatus("Password must be at least 6 characters.", true);
    return;
  }

  try {
    await AuthService.signup(payload);
    setStatus("Account created. Redirecting to login...", false);
    setTimeout(function () {
      window.location.href = "login.html";
    }, 700);
  } catch (error) {
    setStatus(error.message || "Sign up failed.", true);
  }
});
