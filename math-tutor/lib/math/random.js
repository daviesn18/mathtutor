export const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

export const randNonZero = (a, b) => {
  let v;
  do v = randInt(a, b);
  while (v === 0);
  return v;
};

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const sample = (arr, k) => shuffle(arr).slice(0, k);

export const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const uid = () => Math.random().toString(36).slice(2, 10);
