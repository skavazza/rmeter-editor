// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{self, File};
use std::io::Write;
use walkdir::WalkDir;
use zip::ZipWriter;
use zip::write::FileOptions;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            create_directory,
            copy_file,
            save_file_content,
            create_rmskin
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn copy_file(source: String, destination: String) -> Result<(), String> {
    fs::copy(source, destination).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn save_file_content(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_rmskin(input_dir: String, output_file: String) -> Result<String, String> {
    let zip_path = format!("{}.zip", output_file);
    let rmskin_path = format!("{}.rmskin", output_file);

    // Step 1: Create .zip archive
    let zip_file = File::create(&zip_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(zip_file);
    let options = FileOptions::default();

    for entry in WalkDir::new(&input_dir) {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path == std::path::Path::new(&input_dir) {
            continue;
        }

        let relative_path = path.strip_prefix(&input_dir).map_err(|e| e.to_string())?;
        let relative_path_str = relative_path.to_str().ok_or("Invalid path")?;

        if path.is_file() {
            zip.start_file(relative_path_str, options).map_err(|e| e.to_string())?;
            let data = fs::read(&path).map_err(|e| e.to_string())?;
            zip.write_all(&data).map_err(|e| e.to_string())?;
        } else if path.is_dir() {
            zip.add_directory(relative_path_str, options).map_err(|e| e.to_string())?;
        }
    }
    zip.finish().map_err(|e| e.to_string())?;

    // Step 2: Add RMSKIN footer
    let zip_file_content = fs::read(&zip_path).map_err(|e| e.to_string())?;
    let mut rmskin_file = File::create(&rmskin_path).map_err(|e| e.to_string())?;
    
    // Write ZIP content
    rmskin_file.write_all(&zip_file_content).map_err(|e| e.to_string())?;

    // Write size of ZIP (8 bytes LE)
    let size = zip_file_content.len() as u64;
    rmskin_file.write_all(&size.to_le_bytes()).map_err(|e| e.to_string())?;
    
    // Write null byte
    rmskin_file.write_all(&[0]).map_err(|e| e.to_string())?;
    
    // Write identifier
    rmskin_file.write_all(b"RMSKIN\0").map_err(|e| e.to_string())?;

    // Clean up the .zip file
    fs::remove_file(&zip_path).map_err(|e| e.to_string())?;

    Ok(rmskin_path)
}
