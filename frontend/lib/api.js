const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function buildQuery(params) {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (entries.length === 0) return "";
  return `?${new URLSearchParams(entries).toString()}`;
}

async function rawFetch(method, path, { params, data, cache, next } = {}) {
  const url = `${BASE}${path}${buildQuery(params)}`;
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data !== undefined ? JSON.stringify(data) : undefined,
    // Session cookies (HttpOnly access/refresh tokens) travel with every request.
    credentials: "include",
    ...(typeof window === "undefined" ? { cache: cache ?? "no-store", next } : {}),
  });
}

let refreshInFlight = null;

// If an access token has expired mid-session, try exactly one silent refresh
// (using the HttpOnly refresh cookie) and retry the original request once.
// Concurrent 401s share a single in-flight refresh call instead of each
// firing their own.
async function tryRefresh() {
  if (!refreshInFlight) {
    refreshInFlight = rawFetch("POST", "/auth/refresh").finally(() => {
      refreshInFlight = null;
    });
  }
  const res = await refreshInFlight;
  return res.ok;
}

async function request(method, path, config = {}) {
  let res = await rawFetch(method, path, config);

  if (res.status === 401 && path !== "/auth/refresh" && path !== "/auth/login") {
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
