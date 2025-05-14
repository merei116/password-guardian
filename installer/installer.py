import os, sys, shutil, subprocess, tempfile, json, tkinter as tk
from tkinter import filedialog, messagebox
from pathlib import Path

APPNAME = "Password Guardian"

def choose_csv():
    tk.Tk().withdraw()
    path = filedialog.askopenfilename(
        title="Выберите экспорт паролей (CSV или JSON)",
        filetypes=[("CSV/JSON", "*.csv *.json")]
    )
    return Path(path) if path else None

def run(cmd, cwd=None):
    print(">", *cmd)
    p = subprocess.run(cmd, cwd=cwd, shell=True)
    if p.returncode:
        messagebox.showerror(APPNAME, f"Команда {' '.join(cmd)} завершилась с ошибкой")
        sys.exit(1)

def main():
    messagebox.showinfo(APPNAME, "Сейчас вы выберете файл экспорта своих паролей.")
    csv = choose_csv()
    if not csv:
        sys.exit(0)

    work = Path(tempfile.mkdtemp())
    src  = Path(sys._MEIPASS) / "extension-src"   # ← PyInstaller кладёт сюда
    shutil.copytree(src, work / "ext", dirs_exist_ok=True)

    # 1. fine‑tune
    model_dir = work / "model"
    shutil.copytree(Path(sys._MEIPASS) / "model", model_dir, dirs_exist_ok=True)

    run(["python", "train_password_lstm.py",
         "--data", str(csv),
         "--col", "-1",
         "--epochs", "6",
         "--load_ckpt", "base.pth",
         "--export_onnx", "personal_lstm.onnx"],
        cwd=model_dir)

    # 2. copy ONNX + char‑map
    assets = work / "ext" / "src" / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    shutil.copy(model_dir / "personal_lstm.onnx", assets / "base_lstm.onnx")
    shutil.copy(model_dir / "personal_lstm.json", assets / "char_to_idx.json")

    # 3. npm install + build
    run(["npm", "install"], cwd=work / "ext")
    run(["npm", "run", "build"], cwd=work / "ext")

    dist = work / "ext"
    messagebox.showinfo(APPNAME,
        "Модель обучена! Сейчас расширение будет загружено в Chrome.")

    # 4. launch Chrome with the extension
    chrome = Path(os.environ.get("ProgramFiles", "")) / "Google/Chrome/Application/chrome.exe"
    if not chrome.exists():
        messagebox.showerror(APPNAME, "Chrome не найден. Установите Chrome и повторите.")
        sys.exit(1)

    run([str(chrome),
          f"--load-extension={dist}",
          str((dist / 'public/index.html').resolve())])

if __name__ == "__main__":
    main()
