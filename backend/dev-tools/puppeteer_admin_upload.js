import puppeteer from 'puppeteer';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.collection('users');
  const admin = await users.findOne({ role: 'admin' });
  
  // If no admin, find student and fake it
  let token;
  if (admin) {
     token = jwt.sign({ userId: admin._id.toString(), role: 'admin' }, process.env.JWT_SECRET || 'default_jwt_secret', { expiresIn: '1d' });
  } else {
     const students = mongoose.connection.collection('students');
     const student = await students.findOne({});
     token = jwt.sign({ userId: student._id.toString(), role: 'admin' }, process.env.JWT_SECRET || 'default_jwt_secret', { expiresIn: '1d' });
  }

  const browser = await puppeteer.launch({ 
    args: ['--no-sandbox', '--disable-setuid-sandbox'], 
    headless: "new"
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.setCookie({ name: 'admin_token', value: token, domain: 'localhost', path: '/' });
  await page.setCookie({ name: 'token', value: token, domain: 'localhost', path: '/' });

  console.log("Navigating to admin course page...");
  await page.goto('http://localhost:3000/admin/courses/6a993a2447b54817ae7f96ad', { waitUntil: 'networkidle0' });
  
  // Wait for Add New Video button
  await page.waitForSelector('button.bg-\\[\\#c71e22\\]');
  
  // Click Add New Video
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const addBtn = buttons.find(b => b.textContent.includes('Add New Video'));
    if (addBtn) addBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  console.log("Uploading file...");
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile('test_video.mp4');
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Click Upload button in modal
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const uploadBtn = buttons.find(b => b.textContent === 'Upload Video');
    if (uploadBtn) uploadBtn.click();
  });
  
  console.log("Waiting for upload to complete...");
  
  // Wait until modal disappears or success message appears
  await page.waitForFunction(() => {
     return !document.body.innerHTML.includes('Upload Video') || document.body.innerHTML.includes('Video uploaded successfully');
  }, { timeout: 60000 }).catch(e => console.log("Timeout waiting for upload finish."));
  
  console.log("Upload script finished.");
  await browser.close();
  process.exit(0);
}
run();
