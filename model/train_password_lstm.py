#!/usr/bin/env python
# train_password_lstm.py
# ================================================================
#  ▸  usage examples
#  ───────────────────────────────────────────────────────────────
#  1) обучить чистую модель на публичном дампе:
#     python train_password_lstm.py --data rockyou.txt --epochs 5 \
#            --save_ckpt base.pth --export_onnx base_lstm.onnx
#
#  2) дообучить под личные пароли (CSV последняя колонка):
#     python train_password_lstm.py --data merei.csv --col -1 --load_ckpt base.pth --save_ckpt personal.pth --export_onnx personal_lstm.onnx --patterns patterns.json
# ================================================================

import argparse, os, json, random, re, sys, pathlib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

# ------------- reproducibility ------------------------------------------------
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
torch.backends.cudnn.deterministic = True
torch.backends.cudnn.benchmark = False

def seed_worker(worker_id):
    worker_seed = SEED + worker_id
    np.random.seed(worker_seed)
    random.seed(worker_seed)

g = torch.Generator()
g.manual_seed(SEED)

# ------------- model hyper‑params --------------------------------------------
MAX_SEQ = 50
EMB_DIM  = 64
HID_DIM  = 128
BATCH    = 64

# ------------- char vocabulary ------------------------------------------------
BASE_CHARS = (
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "0123456789"
    "!@#$%^&*()-_=+[]{}|;:,.<>?/\\"
)
char_to_idx = {c: i + 1 for i, c in enumerate(BASE_CHARS)}
char_to_idx["<PAD>"] = 0
char_to_idx["<UNK>"] = len(char_to_idx)
idx_to_char = {i: c for c, i in char_to_idx.items()}

# ------------- model definition ----------------------------------------------
class PasswordLSTM(nn.Module):
    def __init__(self, vocab_size: int):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, EMB_DIM)
        self.lstm = nn.LSTM(EMB_DIM, HID_DIM, num_layers=2, batch_first=True)
        self.fc   = nn.Linear(HID_DIM, vocab_size)

    def forward(self, x):
        emb = self.embedding(x)
        out, _ = self.lstm(emb)
        return self.fc(out)

# ------------- helpers --------------------------------------------------------
def to_tensor(passwords):
    seqs = [
        [char_to_idx.get(c, char_to_idx["<UNK>"]) for c in p][:MAX_SEQ]
        for p in passwords
    ]
    seqs = [s + [0] * (MAX_SEQ - len(s)) for s in seqs]
    X = torch.tensor(seqs, dtype=torch.long)
    y = torch.tensor([s[1:] + [0] for s in seqs], dtype=torch.long)
    return TensorDataset(X, y)

def load_passwords(path: pathlib.Path, col: int):
    if path.suffix == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore").splitlines()
    if path.suffix == ".csv":
        df = pd.read_csv(path, header=0)
        return df.iloc[:, col].astype(str).tolist()
    if path.suffix == ".json":
        js = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(js, list):
            return [row.get("password", "") for row in js]
    raise ValueError("Неизвестный формат файла паролей")

def train(model, loader, epochs):
    model.train()
    opt = optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.CrossEntropyLoss()
    for epoch in range(epochs):
        tot = 0
        for X, y in loader:
            opt.zero_grad(set_to_none=True)
            out = model(X)
            loss = loss_fn(out.view(-1, out.size(-1)), y.view(-1))
            loss.backward()
            opt.step()
            tot += loss.item()
        print(f"Epoch {epoch+1}/{epochs}  loss={tot/len(loader):.4f}")

def analyze(passwords):
    masks, numbers, words, mut, zigzag = {}, {}, {}, {}, 0
    m_map = {"0": "o", "1": "i", "@": "a", "$": "s", "3": "e", "5": "s", "7": "t"}

    def mask(p):
        return "".join(
            "X" if c.isalpha() else "D" if c.isdigit() else "S" if re.match(r"[!@#$%^&*()\-_=+]", c) else "_" for c in p
        )

    for p in passwords:
        masks[mask(p)] = masks.get(mask(p), 0) + 1
        digs = set(filter(str.isdigit, p))
        for d in digs:
            numbers[d] = numbers.get(d, 0) + 1
        for L in range(3, 8):
            for i in range(len(p) - L + 1):
                words[p[i : i + L]] = words.get(p[i : i + L], 0) + 1
        if "".join(m_map.get(c, c) for c in p) != p:
            mut[p] = mut.get(p, 0) + 1
        if any(c.isupper() for c in p) and any(c.islower() for c in p):
            zigzag += 1
    return dict(masks=masks, numbers=numbers, words=words, zigzag=zigzag)

# ------------- CLI ------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", help="путь к файлу паролей (txt/csv/json)")
    ap.add_argument("--col", type=int, default=-1, help="столбец CSV с паролями (по умолч. последний)")
    ap.add_argument("--epochs", type=int, default=5)
    ap.add_argument("--load_ckpt", help="загрузить чекпоинт")
    ap.add_argument("--save_ckpt", help="сохранить чекпоинт после обучения")
    ap.add_argument("--export_onnx", help="экспортировать в ONNX")
    ap.add_argument("--patterns", help="файл, куда сохранить анализ паттернов")
    args = ap.parse_args()

    model = PasswordLSTM(len(char_to_idx))

    # загрузка базовых весов (если нужно)
    if args.load_ckpt and os.path.exists(args.load_ckpt):
        ckpt = torch.load(args.load_ckpt, map_location="cpu")
        model.load_state_dict(ckpt["model_state_dict"])
        print(f"✔ loaded checkpoint {args.load_ckpt}")

    # если указаны данные — дообучаем
    if args.data:
        passwords = load_passwords(pathlib.Path(args.data), args.col)
        ds = to_tensor(passwords)
        loader = DataLoader(ds, batch_size=BATCH, shuffle=True, worker_init_fn=seed_worker, generator=g)
        train(model, loader, args.epochs)

        # сохранить паттерны?
        if args.patterns:
            pat = analyze(passwords)
            json.dump(pat, open(args.patterns, "w"), indent=2, ensure_ascii=False)
            print(f"✔ patterns → {args.patterns}")

    # сохраняем чекпоинт?
    if args.save_ckpt:
        torch.save({"model_state_dict": model.state_dict()}, args.save_ckpt)
        print(f"✔ checkpoint → {args.save_ckpt}")

    # экспорт ONNX + char‑map?
    if args.export_onnx:
        dummy = torch.randint(1, len(char_to_idx), (1, MAX_SEQ))
        torch.onnx.export(
            model,
            dummy,
            args.export_onnx,
            input_names=["input"],
            output_names=["output"],
            dynamic_axes={"input": {1: "seq"}, "output": {1: "seq"}},
            opset_version=17,
        )
        with open(pathlib.Path(args.export_onnx).with_suffix(".json"), "w") as f:
            json.dump(char_to_idx, f)
        print(f"✔ ONNX → {args.export_onnx}")
        print(f"✔ char‑map → {pathlib.Path(args.export_onnx).with_suffix('.json')}")

if __name__ == "__main__":
    if len(sys.argv) == 1:
        print("Запусти с --help, чтобы увидеть опции.")
    else:
        main()
