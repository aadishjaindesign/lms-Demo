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

  const browser = await puppeteer.launch({ 
    args: ['--no-sandbox', '--disable-setuid-sandbox'], 
    headless: "new"
  });
  
  const page = await browser.newPage();
  await page.setCookie({ name: 'student_token', value: token, domain: 'localhost', path: '/' });
  await page.setCookie({ name: 'token', value: token, domain: 'localhost', path: '/' });

  await page.goto('http://localhost:3000/student/courses/6a993a2447b54817ae7f96ad', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  
  const clicked = await page.evaluate(() => {
     const items = Array.from(document.querySelectorAll('h3'));
     const webBb = items.find(h => h.textContent.includes('web-bb'));
     if (webBb) {
         // click the closest button or the parent div
         const btn = webBb.closest('button') || webBb.closest('div');
         if (btn) {
             btn.click();
             return true;
         }
     }
     return false;
  });
  console.log("Clicked web-bb:", clicked);
  
  await new Promise(r => setTimeout(r, 2000));
  
  const currentVideo = await page.evaluate(() => {
     return document.querySelector('h1')?.textContent; // Assuming h1 is the title of the playing video
  });
  console.log("Currently selected video:", currentVideo);

  await browser.close();
  process.exit(0);
}
run();
