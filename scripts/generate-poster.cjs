// Export a matching photo invitation from the shared configuration.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const config = fs.readFileSync(path.join(root, 'src/config/wedding.ts'), 'utf8');
const escape = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
const value = key => config.match(new RegExp(`${key}: '([^']*)'`))[1];
const label = key => escape(value(key));
const names = config.match(/couple: \['([^']*)', '([^']*)'\]/).slice(1).map(escape);
async function main() {
 const source = value('heroImage');
 if (!source.startsWith('/assets/')) throw new Error('海报生成脚本需要 src/assets 中的本地封面图，远程图片请先下载为本地文件。');
 const assetRoot = path.join(root, 'src/assets');
 const sourcePath = path.resolve(root, 'src', source.slice(1));
 if (!sourcePath.startsWith(assetRoot + path.sep)) throw new Error('封面路径必须在 src/assets 内');
 const photo = await sharp(sourcePath).resize(1000, 1510, {fit:'cover'}).jpeg({quality:90}).toBuffer();
 const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1510"><defs><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#152014" stop-opacity=".25"/><stop offset=".45" stop-opacity="0"/><stop offset="1" stop-color="#11170e" stop-opacity=".9"/></linearGradient></defs><rect width="1000" height="1510" fill="url(#shade)"/><g fill="#fff9e9" text-anchor="middle" font-family="Songti SC, STSong, serif"><text x="500" y="89" font-family="Georgia" font-size="22" letter-spacing="7">THE WEDDING</text><text x="500" y="170" font-size="25" letter-spacing="7">诚挚邀请 · 见证幸福</text><text x="500" y="300" font-size="111" letter-spacing="12">${names[0]} &amp; ${names[1]}</text><text x="500" y="365" font-family="Georgia" font-size="23" letter-spacing="6">${label('englishNames')}</text><text x="500" y="448" font-family="Georgia" font-size="61" font-style="italic" fill="#eddfc5">Together, forever.</text><text x="500" y="1270" font-family="Georgia" font-size="83" letter-spacing="7">${label('date').slice(0,10).replaceAll('-','.')}</text><path d="M90 1320 H910" stroke="#bba57d"/><text x="500" y="1380" font-size="32">${label('venue')}</text><text x="500" y="1440" font-size="27" fill="#dfd3bb">${label('timeLabel')}</text></g></svg>`;
 await sharp(photo).composite([{input:Buffer.from(svg)}]).jpeg({quality:92,mozjpeg:true}).toFile(path.join(root,'src/assets/poster-v2.jpg'));
}
main().catch(error=>{console.error(error);process.exitCode=1});
