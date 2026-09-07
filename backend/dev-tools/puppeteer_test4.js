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
  
  const networkLogs = [];

  page.on('response', async response => {
      const url = response.url();
      if (url.includes('/playback-url')) {
          const body = await response.text();
          networkLogs.push(`[PLAYBACK API] ${url} | Status: ${response.status()} | Body: ${body}`);
      }
  });

  await page.setCookie({ name: 'student_token', value: token, domain: 'localhost', path: '/' });
  await page.setCookie({ name: 'token', value: token, domain: 'localhost', path: '/' });

  await page.goto('http://localhost:3000/student/courses/6a993a2447b54817ae7f96ad', { waitUntil: 'networkidle0' });

  console.log(networkLogs.join('\n'));

  await browser.close();
  process.exit(0);
}
run();
