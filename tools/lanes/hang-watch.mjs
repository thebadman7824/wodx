/**
 * B7201: the hang watch. While a gate runs, run-gate asks every few seconds whether the lane still answers: the
 * Foundry server's status page, and the signed-in page itself (a one-line evaluate). When `misses` probes in a row
 * fail, the lane has hung: the watch rejects, run-gate ends the run as a lane fault (exit 5) and the PC runner kills
 * the lane's Foundry, resets the lane and runs the gates that were left on a fresh one. Before this a hung Foundry
 * held a lane for the gate's whole limit (15 minutes) and then for every gate after it.
 *
 *   const w = watchHang({probe: async () => true|false, everyMs: 30000, misses: 4});
 *   await Promise.race([work, w.hung]);  ...  w.stop();
 * probe resolves true when the lane answered; a throw or false is a miss. One answer resets the count.
 */
export function watchHang({probe, everyMs = 30000, misses = 4, timer = setTimeout, clear = clearTimeout}) {
  let stopped = false, t = null, missed = 0, fail;
  const hung = new Promise((_, no) => { fail = no; });
  hung.catch(() => {}); // a watch nobody races against must not end the process
  const tick = async () => {
    if ( stopped ) return;
    let ok = false;
    try { ok = (await probe()) === true; } catch { ok = false; }
    if ( stopped ) return;
    missed = ok ? 0 : missed + 1;
    if ( missed >= misses ) { stopped = true; fail(Object.assign(new Error(`the lane stopped answering (${misses} checks in a row, ${Math.round(misses * everyMs / 1000)} s)`), {hang: true})); return; }
    t = timer(tick, everyMs);
  };
  t = timer(tick, everyMs);
  return {hung, stop: () => { stopped = true; if ( t ) clear(t); }, get missed() { return missed; }};
}
