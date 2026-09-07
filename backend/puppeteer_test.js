import puppeteer from 'puppeteer';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const admins = mongoose.connection.collection('admins');
  const admin = await admins.findOne({});
  const token = jwt.sign({ userId: admin._id, role: 'admin' }, process.env.JWT_SECRET || 'default_jwt_secret', { expiresIn: '1d' });

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: "new" });
  const page = await browser.newPage();
  
  // Intercept network requests and console
  const networkLogs = [];
  const consoleLogs = [];

  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE ERROR] ${err.message}`));
  page.on('requestfailed', request => {
      networkLogs.push(`[FAILED] ${request.url()} - ${request.failure()?.errorText}`);
  });
  page.on('response', response => {
      const url = response.url();
      if (url.includes('.m3u8') || url.includes('.ts') || url.includes('.m4s') || url.includes('.mp4')) {
          networkLogs.push(`[RESPONSE] ${url} | Status: ${response.status()} | Type: ${response.headers()['content-type']}`);
      }
  });

  // Set auth cookie
  await page.setCookie({
      name: 'admin_token',
      value: token,
      domain: 'localhost',
      path: '/'
  });
  await page.setCookie({
      name: 'token',
      value: token,
      domain: 'localhost',
      path: '/'
  });

  console.log("Navigating to admin course page...");
  // Let's use the exact course ID 6a993a2447b54817ae7f96ad from the user's prompt!
  await page.goto('http://localhost:3000/admin/courses/6a993a2447b54817ae7f96ad', { waitUntil: 'networkidle0' });

  console.log("Looking for any video to click...");
  const clicked = await page.evaluate(() => {
     // Admin page uses 'div' with border/padding for video cards, often with a play icon or text.
     // Let's just find the first SVG or button that says 'Play' or has a click handler, OR just click the first video card.
     // Let's look for "web-bb" specifically, or any h3.
     const h3s = Array.from(document.querySelectorAll('h3'));
     if (h3s.length > 0) {
         const btn = h3s[0].closest('div').querySelector('button');
         if (btn) { btn.click(); return true; }
         // if no button, maybe the div itself is clickable?
         const parentDiv = h3s[0].parentElement;
         if (parentDiv) { parentDiv.click(); return true; }
     }
     return false;
  });

  console.log(`Video clicked: ${clicked}`);
  if (clicked) {
      await new Promise(r => setTimeout(r, 5000)); // wait for video.js to initialize
      
      const videoStatus = await page.evaluate(() => {
          const video = document.querySelector('video');
          const videojsContainer = document.querySelector('.video-js');
          const controlBar = document.querySelector('.vjs-control-bar');
          const bigPlay = document.querySelector('.vjs-big-play-button');
          return {
             hasVideoElement: !!video,
             hasVideoJsContainer: !!videojsContainer,
             hasControlBar: !!controlBar,
             hasBigPlay: !!bigPlay
          };
      });
      console.log("=== DOM STATUS ===");
      console.log(videoStatus);
  }

  console.log("=== CONSOLE LOGS ===");
  console.log(consoleLogs.join('\n'));

  console.log("=== NETWORK LOGS ===");
  console.log(networkLogs.join('\n'));

  await browser.close();
  process.exit(0);
}
run();
