import { DT } from '../core/constants.js';

/** Fixed 60 Hz update, with rendering once per display frame. */
export function startLoop(update, render) {
  const stepMs = DT * 1000;
  let last = performance.now();
  let acc = 0;

  function frame(now) {
    let delta = now - last;
    last = now;
    if (delta > 250) delta = 250;
    acc += delta;
    let steps = 0;
    while (acc >= stepMs && steps < 5) {
      update();
      acc -= stepMs;
      steps += 1;
    }
    render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
