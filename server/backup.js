/* A copy of the leaderboard database, safe while the server runs (VACUUM INTO). Keeps the last 14 copies.
   Run daily, e.g. from cron:  15 4 * * *  cd /opt/sonaroids && /usr/bin/node --no-warnings server/backup.js
   Settings (environment): DB (the database), BACKUP_DIR (default: a "backup" folder next to the database). */
'use strict';
const fs=require('node:fs'), path=require('node:path'), {DatabaseSync}=require('node:sqlite');
const DB=process.env.DB||'/var/lib/sonaroids/sonaroids.db', DIR=process.env.BACKUP_DIR||path.join(path.dirname(DB),'backup');
fs.mkdirSync(DIR,{recursive:true});
const name=path.join(DIR,'sonaroids-'+new Date().toISOString().slice(0,10)+'.db'); try{ fs.unlinkSync(name); }catch(e){}
const db=new DatabaseSync(DB); db.exec(`VACUUM INTO '${name.replace(/'/g,"''")}'`); db.close();
const old=fs.readdirSync(DIR).filter(f=>/^sonaroids-\d{4}-\d\d-\d\d\.db$/.test(f)).sort().slice(0,-14); old.forEach(f=>fs.unlinkSync(path.join(DIR,f)));
console.log('backup:',name,(fs.statSync(name).size/1024).toFixed(0)+' KB','| removed',old.length);
