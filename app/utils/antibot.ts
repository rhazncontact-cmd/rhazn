export function generateHoneypot() {
  return Math.random().toString(36).substring(2, 10);
}

export function isHumanTime(startTime: number, minSeconds = 3) {
  const elapsed = (Date.now() - startTime) / 1000;
  return elapsed >= minSeconds;
}
