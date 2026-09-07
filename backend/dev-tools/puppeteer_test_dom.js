import puppeteer from 'puppeteer';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const students = mongoose.connection.collection('students');
  const student = await students.findOne({});
  const token = jwt.sign({ userId: student._id.toString(), role: 'student', studentId: student.studentId }, process.env.JWT_SECRET || 'default_jwt_secret', { expiresIn: '1d' });

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: "new" });
  const page = await browser.newPage();
  
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE ERROR] ${err.message}`));

  await page.setCookie({ name: 'student_token', value: token, domain: 'localhost', path: '/' });
  await page.setCookie({ name: 'token', value: token, domain: 'localhost', path: '/' });

  console.log("Navigating to student course page: 6a993a2447b54817ae7f96ad");
  await page.goto('http://localhost:3000/student/courses/6a993a2447b54817ae7f96ad', { waitUntil: 'domcontentloaded' });
  
  await new Promise(r => setTimeout(r, 5000));
  
  // Click on "web-bb" instead of the default "web" video (since "web-bb" is order 2)
  await page.evaluate(() => {
     const h3s = Array.from(document.querySelectorAll('h3'));
     const webBb = h3s.find(h => h.textContent.includes('web-bb'));
     if (webBb) {
         const parent = webBb.closest('div');
         if (parent) parent.click();
     }
  });

  await new Promise(r => setTimeout(r, 5000)); // wait for video.js to initialize

  const videoStatus = await page.evaluate(() => {
      const video = document.querySelector('video');
      const videojsContainer = document.querySelector('.video-js');
      const controlBar = document.querySelector('.vjs-control-bar');
      const bigPlay = document.querySelector('.vjs-big-play-button');
      
      const reactErrorText = document.body.innerText.includes("Source not supported") || document.body.innerText.includes("Playback Error");
      
      return {
         hasVideoElement: !!video,
         hasVideoJsContainer: !!videojsContainer,
         hasControlBar: !!controlBar,
         hasBigPlay: !!bigPlay,
         reactErrorText
      };
  });
  
  console.log("=== DOM STATUS ===");
  console.log(videoStatus);
  console.log("=== CONSOLE LOGS ===");
  console.log(consoleLogs.join('\n'));

  await browser.close();
  process.exit(0);
}
run();
