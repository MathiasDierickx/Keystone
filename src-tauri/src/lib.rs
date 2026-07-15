use std::fs;
use std::path::{Path, PathBuf};
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

/// List all reviewable Markdown artifacts in `folder` (non-recursive),
/// excluding feedback files.
#[tauri::command]
fn list_artifacts(folder: String) -> Result<Vec<RawArtifact>, String> {
    let dir = Path::new(&folder);
    if !dir.is_dir() {
        return Err(format!("Not a folder: {folder}"));
    }

    let mut out = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let filename = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) if is_markdown(n) => n.to_string(),
            _ => continue,
        };
        let content = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue, // skip unreadable / non-utf8 files
        };
        let has_feedback = feedback_path_for(&path.to_string_lossy()).exists();
        out.push(RawArtifact {
            path: path.to_string_lossy().to_string(),
            filename,
            content,
            modified_ms: modified_ms(&path),
            has_feedback,
        });
    }
    Ok(out)
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
            read_feedback,
            write_feedback
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
