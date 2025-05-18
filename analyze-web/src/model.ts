import * as ort from 'onnxruntime-web';

ort.env.wasm.wasmPaths = '/public/'; // Должно указывать на public/

let session: ort.InferenceSession | null = null;
let charToIdx: Record<string, number> = {};

/**
 * Загружает модель ONNX и словарь char_to_idx из public/assets.
 */
export async function loadModel() {
  if (session) return;
  // Абсолютный путь, если лежит в public/assets
  const modelUrl = '/assets/personal_lstm.onnx';
  session = await ort.InferenceSession.create(modelUrl);

  const charMapUrl = '/assets/char_to_idx.json';
  const res = await fetch(charMapUrl);
  charToIdx = await res.json();
}

/**
 * Кодирует пароль в формат входного тензора для модели.
 */
export function encodePassword(pwd: string, maxLen = 50): ort.Tensor {
  const pad = charToIdx["<PAD>"] ?? 0;
  const unk = charToIdx["<UNK>"] ?? 1;
  const input = new Array(maxLen).fill(pad);
  for (let i = 0; i < Math.min(pwd.length, maxLen); i++) {
    const c = pwd[i];
    input[i] = charToIdx[c] ?? unk;
  }
  return new ort.Tensor('int64', BigInt64Array.from(input.map(BigInt)), [1, maxLen]);
}

/**
 * Предсказывает силу пароля (чем меньше - тем хуже).
 */
export async function predictStrength(pwd: string): Promise<{avg: number; percent: number}> {
  if (!session) throw new Error('Model not loaded');
  const inputTensor = encodePassword(pwd);
  const feeds = { [session!.inputNames[0]]: inputTensor };
  const logits = (await session!.run(feeds))[session!.outputNames[0]].data as Float32Array;

  // soft-max per time-step (seqLen⋅vocab)
  const seq = 50, vocab = logits.length/50;
  let total = 0;
  for (let i=0;i<seq;i++){
    const step = logits.slice(i*vocab,(i+1)*vocab);
    const m = Math.max(...step);
    const exps = step.map(x=>Math.exp(x-m));
    const pSum = exps.reduce((a,b)=>a+b,0);
    const probs = exps.map(e=>e/pSum);
    const idx = charToIdx[pwd[i]??'<PAD>'] ?? charToIdx['<UNK>'];
    total += Math.log(probs[idx]??1e-6);
  }
  const avg = -total/seq;                     // lower → weaker
// model.ts  – после вычисления avg
  const MIN = 1.5;   // минимальный валидационный avg   (≈ слабый)
  const MAX = 2.5;   // максимальный валидационный avg   (≈ абсолютно случайный)

  const percent = Math.round(
    Math.min(Math.max((avg - MIN) / (MAX - MIN), 0), 1) * 100
  );
  return { avg, percent };

}

