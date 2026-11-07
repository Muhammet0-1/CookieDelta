'use strict';
const fs=require('node:fs');
fs.mkdirSync('dist',{recursive:true});
for(const file of ['index.html','core.js','app.js','style.css'])fs.copyFileSync(file,'dist/'+file);
console.log('Built four local assets in dist/. No dependency download or network.');
