async function requestJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options,
  });
  const data = await response.json();
  if (!response.ok && data?.error == null) {
    throw new Error(`HTTP ${response.status}`);
  }
  return data;
}

export async function calculate(payload) {
  return requestJSON("/calculate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function convert(payload) {
  return requestJSON("/convert", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function storeMemory(payload) {
  return requestJSON("/memory/store", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function recallMemory() {
  return requestJSON("/memory/recall", {
    method: "GET",
  });
}

export async function addMemory(payload) {
  return requestJSON("/memory/add", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resetCalculator() {
  return requestJSON("/reset", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
