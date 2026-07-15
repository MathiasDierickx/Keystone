use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::UNIX_EPOCH;

use serde::Serialize;

/// A raw Markdown artifact on disk. All Markdown/front-matter parsing happens
/// on the frontend — Rust is a thin filesystem layer.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RawArtifact {
    /// Absolute path to the .md file.
    path: String,
    /// File name, e.g. "plan.md".
    filename: String,
    /// Full file contents.
    content: String,
    /// Last-modified time, epoch milliseconds.
    modified_ms: u64,
    /// Whether a sibling "<stem>.feedback.md" exists.
    has_feedback: bool,
    /// Absolute path of the worktree this artifact was found in (None if the
    /// watched folder is not inside a git repo).
    worktree: Option<String>,
    /// Branch checked out in that worktree, if any.
    branch: Option<String>,
    /// Whether this is the repo's main worktree (true when not in a repo).
    is_main: bool,
    /// Path relative to the worktree root (or watched folder when not in a
    /// repo) — stable identity of a doc across branches/worktrees.
    repo_rel_path: Option<String>,
}

/// A git worktree: a working directory attached to the repo.
#[derive(Debug, PartialEq)]
struct Worktree {
    path: PathBuf,
    branch: Option<String>,
    is_main: bool,
}

const FEEDBACK_SUFFIX: &str = ".feedback.md";

fn is_markdown(name: &str) -> bool {
    name.ends_with(".md") && !name.ends_with(FEEDBACK_SUFFIX)
}

/// Path of the feedback sibling for a given artifact path.
/// `/x/plan.md` -> `/x/plan.feedback.md`.
fn feedback_path_for(artifact_path: &str) -> PathBuf {
    let p = Path::new(artifact_path);
    let stem = p
        .file_name()
        .and_then(|n| n.to_str())
        .map(|n| n.strip_suffix(".md").unwrap_or(n))
        .unwrap_or("artifact");
    let dir = p.parent().unwrap_or_else(|| Path::new("."));
    dir.join(format!("{stem}{FEEDBACK_SUFFIX}"))
}

fn modified_ms(path: &Path) -> u64 {
    fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Run `git -C <dir> <args...>` and return trimmed stdout on success.
fn run_git(dir: &Path, args: &[&str]) -> Option<String> {
    let out = Command::new("git").arg("-C").arg(dir).args(args).output().ok()?;
    if !out.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

/// Toplevel of the git worktree that `folder` lives in, or None if not a repo.
fn repo_toplevel(folder: &Path) -> Option<PathBuf> {
    run_git(folder, &["rev-parse", "--show-toplevel"]).map(PathBuf::from)
}

/// Parse `git worktree list --porcelain` output. The first stanza is the main
/// worktree. A stanza with no `branch` line (detached HEAD / bare) yields None.
fn parse_worktrees(porcelain: &str) -> Vec<Worktree> {
    let mut out = Vec::new();
    let mut path: Option<PathBuf> = None;
    let mut branch: Option<String> = None;

    let flush = |out: &mut Vec<Worktree>, path: &mut Option<PathBuf>, branch: &mut Option<String>| {
        if let Some(p) = path.take() {
            out.push(Worktree {
                is_main: out.is_empty(),
                path: p,
                branch: branch.take(),
            });
        }
    };

    for line in porcelain.lines() {
        if let Some(p) = line.strip_prefix("worktree ") {
            flush(&mut out, &mut path, &mut branch);
            path = Some(PathBuf::from(p));
            branch = None;
        } else if let Some(b) = line.strip_prefix("branch ") {
            branch = Some(b.strip_prefix("refs/heads/").unwrap_or(b).to_string());
        }
    }
    flush(&mut out, &mut path, &mut branch);
    out
}

fn list_worktrees(repo: &Path) -> Vec<Worktree> {
    match run_git(repo, &["worktree", "list", "--porcelain"]) {
        Some(text) => parse_worktrees(&text),
        None => Vec::new(),
    }
}

/// Relative subpath of `folder` within its worktree `top`, canonicalizing both
/// so symlinks / non-normalized components don't defeat the prefix match.
/// Returns None when `folder` genuinely isn't under `top`, so callers can fall
/// back to a single-folder scan rather than silently scanning worktree roots.
fn relative_subpath(folder: &Path, top: &Path) -> Option<PathBuf> {
    let cf = fs::canonicalize(folder).unwrap_or_else(|_| folder.to_path_buf());
    let ct = fs::canonicalize(top).unwrap_or_else(|_| top.to_path_buf());
    cf.strip_prefix(&ct)
        .map(Path::to_path_buf)
        .ok()
        .or_else(|| folder.strip_prefix(top).map(Path::to_path_buf).ok())
}

/// Directories never worth scanning for review artifacts.
const IGNORE_DIRS: &[&str] = &[
    "node_modules",
    "target",
    "dist",
    "build",
    ".next",
    ".turbo",
    "vendor",
    "coverage",
];

fn is_ignored_dir(name: &str) -> bool {
    // Skip build/dependency dirs and all hidden dirs (incl. .git, .claude).
    name.starts_with('.') || IGNORE_DIRS.contains(&name)
}

/// Recursively scan a directory tree for reviewable Markdown artifacts, tagging
/// each with worktree context and its path relative to `base`. Skips build /
/// dependency / hidden directories so pointing at a repo doesn't flood the queue.
fn scan_tree(dir: &Path, base: &Path, wt: Option<&Worktree>, out: &mut Vec<RawArtifact>) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return, // a worktree may not have this subfolder — skip
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let file_type = match entry.file_type() {
            Ok(t) => t,
            Err(_) => continue,
        };
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n,
            None => continue,
        };

        if file_type.is_dir() {
            if !is_ignored_dir(name) {
                scan_tree(&path, base, wt, out);
            }
            continue;
        }
        if !file_type.is_file() || !is_markdown(name) {
            continue;
        }

        let content = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let has_feedback = feedback_path_for(&path.to_string_lossy()).exists();
        let repo_rel = path
            .strip_prefix(base)
            .ok()
            .map(|p| p.to_string_lossy().to_string());
        out.push(RawArtifact {
            path: path.to_string_lossy().to_string(),
            filename: name.to_string(),
            content,
            modified_ms: modified_ms(&path),
            has_feedback,
            worktree: wt.map(|w| w.path.to_string_lossy().to_string()),
            branch: wt.and_then(|w| w.branch.clone()),
            is_main: wt.map(|w| w.is_main).unwrap_or(true),
            repo_rel_path: repo_rel,
        });
    }
}

/// List reviewable Markdown artifacts for a watched folder.
///
/// If the folder is inside a git repo, every worktree of that repo is scanned
/// at the same relative subpath, so artifacts an agent produced in an isolated
/// worktree are surfaced too — each tagged with its worktree + branch. If the
/// folder is not in a repo, only the folder itself is scanned (legacy behavior).
#[tauri::command]
fn list_artifacts(folder: String) -> Result<Vec<RawArtifact>, String> {
    let folder_path = Path::new(&folder);

    // Worktree mode: only when the folder is in a repo, git reports worktrees,
    // AND we can locate the folder's subpath within the repo. If any of those
    // fail we fall through to the legacy single-folder scan, so we never
    // silently widen scope to every worktree root or blank the queue.
    if let Some(top) = repo_toplevel(folder_path) {
        let worktrees = list_worktrees(&top);
        if let Some(rel) = relative_subpath(folder_path, &top) {
            if !worktrees.is_empty() {
                let mut out = Vec::new();
                for wt in &worktrees {
                    // repo_rel_path is relative to the worktree root, so the
                    // same doc on different branches shares an identity.
                    scan_tree(&wt.path.join(&rel), &wt.path, Some(wt), &mut out);
                }
                return Ok(out);
            }
        }
    }

    if !folder_path.is_dir() {
        return Err(format!("Not a folder: {folder}"));
    }
    let mut out = Vec::new();
    scan_tree(folder_path, folder_path, None, &mut out);
    Ok(out)
}

/// Branch refs (local heads + `origin/*` remotes) that contain the document at
/// `repo_rel_path`, EXCLUDING branches already checked out in a worktree (those
/// are surfaced as on-disk artifacts). A local branch hides its remote twin.
/// Returns ref names usable with `git show` (e.g. "feature/x", "origin/main").
#[tauri::command]
fn doc_branch_versions(
    folder: String,
    repo_rel_path: String,
) -> Result<Vec<String>, String> {
    use std::collections::HashSet;

    let top = match repo_toplevel(Path::new(&folder)) {
        Some(t) => t,
        None => return Ok(Vec::new()),
    };
    let wt_branches: HashSet<String> = list_worktrees(&top)
        .into_iter()
        .filter_map(|w| w.branch)
        .collect();

    let exists_on = |ref_name: &str| {
        run_git(&top, &["cat-file", "-e", &format!("{ref_name}:{repo_rel_path}")])
            .is_some()
    };

    let mut out = Vec::new();
    let mut local_names: HashSet<String> = HashSet::new();

    let heads = run_git(&top, &["for-each-ref", "--format=%(refname:short)", "refs/heads"])
        .unwrap_or_default();
    for name in heads.lines().map(str::trim).filter(|n| !n.is_empty()) {
        local_names.insert(name.to_string());
        if wt_branches.contains(name) {
            continue;
        }
        if exists_on(name) {
            out.push(name.to_string());
        }
    }

    let remotes = run_git(&top, &["for-each-ref", "--format=%(refname:short)", "refs/remotes"])
        .unwrap_or_default();
    for full in remotes.lines().map(str::trim).filter(|n| !n.is_empty()) {
        if full.ends_with("/HEAD") {
            continue;
        }
        // Strip the remote name (e.g. "origin/") to get the branch short name.
        let short = full.splitn(2, '/').nth(1).unwrap_or(full);
        if short == "HEAD" || local_names.contains(short) || wt_branches.contains(short) {
            continue;
        }
        if exists_on(full) {
            out.push(full.to_string());
        }
    }

    Ok(out)
}

/// Read a document's content at a specific git ref (branch/tag/commit).
#[tauri::command]
fn read_doc_at_ref(
    folder: String,
    ref_name: String,
    repo_rel_path: String,
) -> Result<Option<String>, String> {
    let top = match repo_toplevel(Path::new(&folder)) {
        Some(t) => t,
        None => return Ok(None),
    };
    Ok(run_git(&top, &["show", &format!("{ref_name}:{repo_rel_path}")]))
}

/// Read the raw feedback Markdown for an artifact, if it exists.
#[tauri::command]
fn read_feedback(artifact_path: String) -> Result<Option<String>, String> {
    let fb = feedback_path_for(&artifact_path);
    if fb.exists() {
        fs::read_to_string(&fb).map(Some).map_err(|e| e.to_string())
    } else {
        Ok(None)
    }
}

/// Write (or overwrite) the feedback Markdown sibling for an artifact.
/// Returns the path written.
#[tauri::command]
fn write_feedback(artifact_path: String, content: String) -> Result<String, String> {
    let fb = feedback_path_for(&artifact_path);
    fs::write(&fb, content).map_err(|e| e.to_string())?;
    Ok(fb.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_artifacts,
            doc_branch_versions,
            read_doc_at_ref,
            read_feedback,
            write_feedback
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_main_and_linked_worktrees() {
        let porcelain = "\
worktree /repo/main
HEAD 1111111111111111111111111111111111111111
branch refs/heads/main

worktree /repo/../feature-x
HEAD 2222222222222222222222222222222222222222
branch refs/heads/feature/x
";
        let wts = parse_worktrees(porcelain);
        assert_eq!(wts.len(), 2);
        assert_eq!(wts[0].path, PathBuf::from("/repo/main"));
        assert_eq!(wts[0].branch.as_deref(), Some("main"));
        assert!(wts[0].is_main);
        assert_eq!(wts[1].branch.as_deref(), Some("feature/x"));
        assert!(!wts[1].is_main);
    }

    #[test]
    fn detached_worktree_has_no_branch() {
        let porcelain = "\
worktree /repo/main
HEAD 1111111111111111111111111111111111111111
branch refs/heads/main

worktree /repo/detached
HEAD 3333333333333333333333333333333333333333
detached
";
        let wts = parse_worktrees(porcelain);
        assert_eq!(wts.len(), 2);
        assert_eq!(wts[1].branch, None);
        assert!(!wts[1].is_main);
    }

    #[test]
    fn feedback_sibling_path() {
        assert_eq!(
            feedback_path_for("/x/plan.md"),
            PathBuf::from("/x/plan.feedback.md")
        );
    }

    #[test]
    fn relative_subpath_strips_and_rejects() {
        // Non-existent paths → canonicalize fails → raw strip_prefix is used.
        assert_eq!(
            relative_subpath(Path::new("/repo/reviews"), Path::new("/repo")),
            Some(PathBuf::from("reviews"))
        );
        assert_eq!(
            relative_subpath(Path::new("/repo"), Path::new("/repo")),
            Some(PathBuf::from(""))
        );
        // Folder not under the repo top → None, so the caller uses the legacy scan.
        assert_eq!(
            relative_subpath(Path::new("/elsewhere/x"), Path::new("/repo")),
            None
        );
    }
}
