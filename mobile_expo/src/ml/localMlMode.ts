export type MlMode = "auto" | "local" | "server";

export function resolveMlMode(value?: string): MlMode {
  if (value === "local" || value === "server" || value === "auto") {
    return value;
  }

  return "auto";
}

export function shouldFallbackToServer(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return true;
  }

  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";

  if (code.includes("NO_HAND") || code.includes("INVALID_IMAGE")) {
    return false;
  }

  if (message.toLowerCase().includes("no hand")) {
    return false;
  }

  return true;
}
