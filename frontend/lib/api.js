const BASE = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/api` 
  : "http://localhost:5000/api";

function buildQuery(params) {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (entries.length === 0) return "";
  return `?${new URLSearchParams(entries).toString()}`;
}

async function rawFetch(method, path, { params, data, cache, next } = {}) {
  const url = `${BASE}${path}${buildQuery(params)}`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return fetch(url, {
    method,
    headers: { 
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}) 
    },
    body: data !== undefined ? JSON.stringify(data) : undefined,
    credentials: "include",
    ...(typeof window === "undefined" ? { cache: cache ?? "no-store", next } : {}),
  });
}

let refreshInFlight = null;

async function tryRefresh() {
  if (!refreshInFlight) {
    refreshInFlight = rawFetch("POST", "/auth/refresh")
      .then((res) => {
        if (!res.ok) return false;
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return await refreshInFlight;
}

async function request(method, path, config = {}) {
  let res = await rawFetch(method, path, config);

  if (res.status === 401 && path !== "/auth/refresh" && path !== "/auth/login" && path !== "/auth/me") {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawFetch(method, path, config);
    }
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(json.message || "Request failed");
    err.response = { data: json, status: res.status };
    throw err;
  }

  return { data: json };
}

const api = {
  get: (path, config) => request("GET", path, config),
  post: (path, data) => request("POST", path, { data }),
  put: (path, data) => request("PUT", path, { data }),
  delete: (path) => request("DELETE", path),
};

export default api;
