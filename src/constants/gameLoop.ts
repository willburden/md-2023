export default function gameLoop(callback: (delta: number) => void) {
  let previousTime = Date.now();
  const tick = () => {
    const now = Date.now();
    const delta = now - previousTime;
    callback(delta);
    previousTime = now;
    requestTick();
  };

  let requestId: number;
  const requestTick = () => {
    requestId = requestAnimationFrame(tick);
  };
  requestTick();
  return () => {
    cancelAnimationFrame(requestId);
  };
}
