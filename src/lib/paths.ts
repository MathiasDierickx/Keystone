/** Path helpers for resolving internal document links. */

export function isExternalHref(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(href) || href.startsWith("mailto:");
}

/**
 * Resolve a relative link `rel` (e.g. `../specs/x.md`) against the absolute file
 * path `baseFile`, normalizing `.`/`..`. Any `#hash`/`?query` is stripped.
 * Returns an absolute path using the same separator as `baseFile`.
 */
export function resolvePath(baseFile: string, rel: string): string {
  const clean = rel.split("#")[0].split("?")[0];
  const sep = baseFile.includes("\\") && !baseFile.includes("/") ? "\\" : "/";
  const dir = baseFile.slice(0, baseFile.lastIndexOf(sep));
  const combined = clean.startsWith(sep) ? clean : `${dir}${sep}${clean}`;

  const out: string[] = [];
  for (const part of combined.split(sep)) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return sep + out.join(sep);
}
