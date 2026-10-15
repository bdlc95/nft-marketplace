/* global document, innerWidth */
// Verificação local; não integra o pacote de entrega.
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--mode', 'mock', '--host', '127.0.0.1'], { stdio: ['ignore', 'pipe', 'pipe'] })
try {
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(d.toString().includes('Local:'))resolve()});server.on('error',reject)})
 const browser = await chromium.launch({executablePath:'/tmp/kurio-browser/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-software-rasterizer','--use-gl=disabled','--no-zygote']})
 for (const width of [1440,390,768]) {
  const context=await browser.newContext({viewport:{width,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/login?redirect=/profile');await page.getByLabel('E-mail',{exact:true}).fill('bruno@example.test');await page.getByLabel('Senha',{exact:true}).fill('Kurio123!');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL(url=>url.pathname==='/profile');await page.getByRole('heading',{name:'Perfil do colecionador',exact:true}).waitFor();
  for (const route of ['/profile','/wallets','/favorites','/nfts/nft-01','/cart','/checkout']) {
   await page.goto('http://127.0.0.1:5173'+route);await page.waitForLoadState('networkidle');
   const size=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));console.log(width,route,page.url(),size,errors,await page.evaluate(()=> {const identity=JSON.parse(localStorage.getItem('kurio:identity')||'{}');const db=JSON.parse(localStorage.getItem('nft-challenge:account-db:v1')||'{}');return{uid:identity.userId,remaining:db.sessions?.[identity.token]?.expiresAt-Date.now()}}));
   if(width!==768)await page.screenshot({path:`../qa-final-${route.replaceAll('/','_')}-${width}.png`,fullPage:true});
   if(route==='/nfts/nft-01'){await page.getByRole('button',{name:'Adicionar ao carrinho'}).click();await page.getByRole('status').filter({hasText:'NFT adicionado ao carrinho.'}).waitFor();}
  }await context.close();
 }await browser.close()
}finally{server.kill()}
