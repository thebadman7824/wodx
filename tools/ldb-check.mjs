import { ClassicLevel } from 'classic-level';
import fs from 'fs'; import path from 'path';
const root = process.argv[2]; let bad = 0; const out = {};
for (const grp of ['data','packs']) for (const d of fs.readdirSync(path.join(root,grp))) {
  const db = new ClassicLevel(path.join(root,grp,d), {valueEncoding:'utf8'});
  let n=0, perr=0, types={};
  try { await db.open(); for await (const [k,v] of db.iterator()) { n++; try { JSON.parse(v); } catch { perr++; } const t=k.split('!')[1]; types[t]=(types[t]||0)+1; } }
  catch(e) { console.log('ERROR', grp, d, e.message); bad++; }
  await db.close(); out[`${grp}/${d}`] = {n, perr, types};
}
console.log(JSON.stringify(out,null,0)); console.log('bad', bad);
