(function () {
  async function request(path, options) {
    const baseUrl = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || "";
    const url = `${baseUrl}${path}`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options && options.headers ? options.headers : {})
      },
      ...options
    });

    const data = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  window.AuthService = {
    signup: function (payload) {
      return request("/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    login: function (payload) {
      return request("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
  };
})();
