/**
 * B6955: put a tool in WoDX Storyteller's hand once the hand is there. Chronicle starts before Storyteller, and on a
 * slow start (a fresh world, a busy machine) the hand can come well after a single retry, so this keeps trying every
 * `every` ms, up to `tries` times (the timer never keeps a Node test process alive). Returns a promise of true once added, false if the hand never came.
 */
export function addHandTool(tool, {every = 2000, tries = 150, hand = () => globalThis.game?.wodx?.storyteller?.hand, wait = ms => new Promise(r => { const t = setTimeout(r, ms); t?.unref?.(); })} = {}) {
  const once = () => {
    const h = hand();
    if ( !h?.addTool ) return false;
    h.addTool(tool);
    return true;
  };
  if ( once() ) return Promise.resolve(true);
  return (async () => {
    for ( let k = 0; k < tries; k++ ) {
      await wait(every);
      if ( once() ) return true;
    }
    return false;
  })();
}
