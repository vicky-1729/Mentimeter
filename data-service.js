(function () {
  async function request(path, options) {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Not authenticated");
    }

    const baseUrl = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || "";
    const url = `${baseUrl}${path}`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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

  window.DataService = {
    getMyData: function () {
      return request("/data/me", { method: "GET" });
    },
    saveMyData: function (payload) {
      return request("/data/me", {
        method: "POST",
        body: JSON.stringify({ data: payload })
      });
    }
  };
})();
