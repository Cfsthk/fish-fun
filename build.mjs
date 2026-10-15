import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {ART_FILES} from './art.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=name=>readFile(path.join(root,name),'utf8');
const artwork={};for(const [key,file] of Object.entries(ART_FILES))artwork[key]='data:image/png;base64,'+(await readFile(path.join(root,file))).toString('base64');
const modules=['species.mjs','art.mjs','motion.mjs','engine.mjs','store.mjs','microphone.mjs','i18n.mjs','sprite-crops.mjs','scene.mjs','app.mjs'];
let code='';for(const name of modules){const source=(await read(name)).replace(/^import .*;\r?\n/gm,'').replace(/^export (?=(?:const|function|class)\b)/gm,'');code+='\n// '+name+'\n'+source+'\n';}
let html=await read('index.html');const icon='data:image/svg+xml;base64,'+(await readFile(path.join(root,'icon.svg'))).toString('base64'),css=await read('style.css');
html=html.replace('href="./icon.svg"',()=>`href="${icon}"`).replace('<link rel="manifest" href="./manifest.webmanifest">','').replace('<link rel="stylesheet" href="./style.css">',()=>`<style>\n${css}\n</style>`);
html=html.replace('<script type="module" src="./app.mjs"></script>',()=>`<script type="module">\nconst EMBEDDED_REEF_ART=${JSON.stringify(artwork)};\n${code.replace(/<\/script/gi,'<\\/script')}\n</script>`);
await writeFile(path.join(root,'Morning Reef.html'),html);console.log('Built Morning Reef.html ('+(Buffer.byteLength(html)/1024/1024).toFixed(1)+' MB).');
