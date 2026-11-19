export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  const contentType = res.headers.get("content-type") || "";
  const trimmed = rawText.trim();

  if (
    trimmed.startsWith("<") ||
    contentType.toLowerCase().includes("text/html")
  ) {
    throw new Error(
      `API endpoint (${url}) returned an HTML page instead of JSON (HTTP ${res.status}). Ensure the Express backend is running or reload the page.`
    );
  }

  let parsed: unknown = {};
  if (trimmed) {
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error(
        `Unexpected non-JSON response from ${url} (HTTP ${res.status}).`
      );
    }
  }

  if (!res.ok) {
    const errMsg =
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      typeof (parsed as { error?: unknown }).error === "string"
        ? (parsed as { error: string }).error
        : `Request failed with HTTP ${res.status}.`;
    throw new Error(errMsg);
  }

  return parsed as T;
}
