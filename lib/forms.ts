/**
 * Thin readers over FormData.
 *
 * Every action used to repeat `String(formData.get("x") ?? "")` a dozen times;
 * these keep the shape of a submission obvious at the call site and make the
 * multi-select fields (which arrive as repeated keys) impossible to read wrong.
 */

export function text(fd: FormData, name: string): string {
  return String(fd.get(name) ?? "").trim();
}

/** Repeated form keys — checkbox groups and multi-selects. */
export function list(fd: FormData, name: string): string[] {
  return fd
    .getAll(name)
    .map((v) => String(v).trim())
    .filter(Boolean);
}

export function checkbox(fd: FormData, name: string): boolean {
  return fd.get(name) === "on";
}

/**
 * Reads a JSON-encoded field (the repeatable role rows and capacity rows are
 * submitted this way by their client components). Returns `fallback` rather
 * than throwing, so malformed input becomes a validation error downstream
 * instead of a 500.
 */
export function json<T>(fd: FormData, name: string, fallback: T): T {
  const raw = fd.get(name);
  if (typeof raw !== "string" || raw.trim() === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
