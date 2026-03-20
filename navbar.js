
  const signButton = document.querySelector(".sign");
  const loginButton = document.querySelector("#log");
  const ctaSignButton = document.querySelector("#sign");
  const authToken = localStorage.getItem("authToken");
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  if (authToken) {
    loginButton.textContent = "Log out";
    signButton.textContent = currentUser?.name || "Dashboard";
    syncUserData();
  }

  async function syncUserData() {
    if (!window.DataService) {
      return;
    }

    try {
      const existing = await window.DataService.getMyData();
      await window.DataService.saveMyData({
        ...(existing.data || {}),
        lastVisitAt: new Date().toISOString()
      });
    } catch {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
    }
  }

  signButton.addEventListener("click", signCall);
  function signCall(event) {
    event.preventDefault();
    if (authToken) {
      window.location.href = "navbar.html";
      return;
    }
    window.location.href = "signup.html";
  }

  loginButton.addEventListener("click", logCall);
  function logCall(event) {
    event.preventDefault();
    if (authToken) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      window.location.href = "login.html";
      return;
    }
    window.location.href = "login.html";
  }

  ctaSignButton.addEventListener("click", ctaSignCall);
  function ctaSignCall(event) {
    event.preventDefault();
    if (authToken) {
      window.location.href = "navbar.html";
      return;
    }
    window.location.href = "signup.html";
  }

  document.querySelector("#explore").addEventListener("click", explore);
  function explore(event) {
    event.preventDefault();
    window.location.href = "explorefeatures.html";

  }


  document.querySelector("#enterprise").addEventListener("click", enterprise);
  function enterprise(event) {
    event.preventDefault();
    window.location.href = "enterprise.html";
  }

document.querySelector("#Me").addEventListener("click", me);
function me(event) {
    event.preventDefault();
    window.location.href = "navbar.html";
}