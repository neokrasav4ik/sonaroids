/* Remove one player from the leaderboard: their games, getting-ready reports and name (v0.34).
   For a stray player whose key no device holds any more (e.g. an old home-screen icon), so the transfer code cannot join it.
   The player is picked by the start of their key — the "who" column of the queries in the cheat sheet (at least 6 characters).
   Without --yes it only shows what would go; with --yes it first copies the database next to the daily copies, then removes.
   Run on the server:
     cd /opt/sonaroids && sudo -u sonaroids DB=/var/lib/sonaroids/sonaroids.db node --no-warnings server/drop_player.js 3f9a1c
     cd /opt/sonaroids && sudo -u sonaroids DB=/var/lib/sonaroids/sonaroids.db node --no-warnings server/drop_player.js 3f9a1c --yes */
'use strict';
const fs=require('node:fs'), path=require('node:path');
let DatabaseSync; try{ ({DatabaseSync}=require('node:sqlite')); }catch(e){ console.error('Node 22.13 or newer is needed (node:sqlite).'); process.exit(1); }
const DB=process.env.DB||'/var/lib/sonaroids/sonaroids.db', args=process.argv.slice(2), yes=args.includes('--yes'), pre=(args.find(a=>a!=='--yes')||'').toLowerCase();
if(!/^[0-9a-f]{6,32}$/.test(pre)){ console.error('Give the start of the player key (6–32 characters 0-9 a-f), e.g.: node server/drop_player.js 3f9a1c'); process.exit(1); }
if(!fs.existsSync(DB)){ console.error('No database at '+DB); process.exit(1); }
const db=new DatabaseSync(DB), t=ms=>new Date(ms+4*3600000).toISOString().slice(0,16).replace('T',' ')+' (Samara)';
const found=db.prepare("SELECT player FROM players WHERE player LIKE ? UNION SELECT DISTINCT player FROM games WHERE player LIKE ?").all(pre+'%',pre+'%').map(r=>r.player);
if(!found.length){ console.error('No player whose key starts with '+pre); process.exit(1); }
if(found.length>1){ console.error('Several players start with '+pre+' — give more characters:\n  '+found.join('\n  ')); process.exit(1); }
const who=found[0], p=db.prepare('SELECT nick, created FROM players WHERE player=?').get(who);
const gs=db.prepare('SELECT count(*) AS n, max(score) AS best, min(created) AS first, max(created) AS last, group_concat(DISTINCT core) AS cores FROM games WHERE player=?').get(who);
const ss=db.prepare('SELECT count(*) AS n FROM setups WHERE player=?').get(who).n;
console.log(`player ${who}\n  name: ${p&&p.nick?p.nick:'(none)'}\n  games: ${gs.n}${gs.n?`, best ${gs.best}, rules ${gs.cores}, from ${t(gs.first)} to ${t(gs.last)}`:''}\n  getting-ready reports: ${ss}`);
if(!yes){ console.log('\nNothing changed. To remove this player, run the same command with --yes at the end.'); process.exit(0); }
const dir=path.join(path.dirname(DB),'backup'); fs.mkdirSync(dir,{recursive:true});
const copy=path.join(dir,'sonaroids-before-drop-'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)+'.db');
db.exec(`VACUUM INTO '${copy.replace(/'/g,"''")}'`); console.log('\ncopy of the database: '+copy);
db.exec('BEGIN'); try{
  const g=db.prepare('DELETE FROM games WHERE player=?').run(who).changes, s=db.prepare('DELETE FROM setups WHERE player=?').run(who).changes, pl=db.prepare('DELETE FROM players WHERE player=?').run(who).changes;
  db.exec('COMMIT'); console.log(`removed: ${g} games, ${s} reports, ${pl} player`); }
catch(e){ db.exec('ROLLBACK'); console.error('Nothing removed: '+e.message); process.exit(1); }
db.close();
