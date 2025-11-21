#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { google } = require('googleapis');
const sharp = require('sharp');
const winston = require('winston');
require('dotenv').config();

// --- Pre-written Content (Replaces OpenAI) ---
const preWrittenContent = [
    {
        title: "چگونه از ترک خوردن دیوار جلوگیری کنیم؟",
        script: "برای جلوگیری از ترک خوردن دیوار، از خشک شدن سریع گچ جلوگیری کنید. دیوار را مرطوب نگه دارید و از تغییرات دمایی شدید پرهیز کنید. استفاده از مش فایبرگلاس در لایه گچ نیز مقاومت آن را افزایش می‌دهد.",
        keyPoints: ["رطوبت", "دما", "مش فایبرگلاس", "گچ کاری"],
        englishKeyPoints: ["wall crack", "plastering", "fiberglass mesh", "construction site"]
    },
    {
        title: "نکته مهم در انتخاب چسب کاشی",
        script: "هنگام انتخاب چسب کاشی، به نوع کاشی و محل نصب آن توجه کنید. برای محیط‌های مرطوب مانند حمام، از چسب‌های ضدآب و مقاوم در برابر رطوبت استفاده کنید تا عمر کاشی‌کاری شما بیشتر شود.",
        keyPoints: ["چسب کاشی", "حمام", "رطوبت", "کاشی کاری"],
        englishKeyPoints: ["tile adhesive", "bathroom tiling", "waterproof", "construction work"]
    },
    {
        title: "عایق‌بندی صوتی دیوارها با روشی ساده",
        script: "برای بهبود عایق‌بندی صوتی، می‌توانید از پنل‌های آکوستیک یا دیوارپوش‌های ضخیم استفاده کنید. این روش‌ها به سادگی صداهای مزاحم را کاهش داده و آرامش بیشتری برای شما فراهم می‌کنند.",
        keyPoints: ["عایق صوتی", "پنل آکوستیک", "آرامش", "دیوار"],
        englishKeyPoints: ["sound insulation", "acoustic panel", "quiet room", "wall construction"]
    },
    {
        title: "چطور عمر مفید ابزارآلات را زیاد کنیم؟",
        script: "برای افزایش عمر ابزارهای خود، همیشه پس از استفاده آن‌ها را تمیز کنید. ابزارها را در جای خشک و خنک نگهداری کرده و به طور منظم آن‌ها را روغن‌کاری کنید تا از زنگ‌زدگی جلوگیری شود.",
        keyPoints: ["ابزارآلات", "نگهداری", "روغن کاری", "تمیز کردن"],
        englishKeyPoints: ["power tools", "tool maintenance", "oiling tools", "workshop"]
    }
];
// ------------------------------------------------

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'youtube-short-generator' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class YouTubeShortGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, 'output');
    this.ensureOutputDir();
    
    // Validate required environment variables
    this.validateEnvVars();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      logger.info('Created output directory');
    }
  }

  validateEnvVars() {
    const requiredVars = ['PEXELS_API_KEY', 'YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  async generateContent() {
    try {
      logger.info('Selecting pre-written content...');
      
      const content = preWrittenContent[Math.floor(Math.random() * preWrittenContent.length)];
      
      logger.info(`Selected title: ${content.title}`);
      
      return content;
    } catch (error) {
      logger.error('Error selecting content:', error);
      throw error;
    }
  }

  // TTS Functionality Removed to eliminate costs. Video will be silent.

  async downloadBrollImages(englishKeyPoints, outputDir) {
    logger.info('Using placeholder images.');
    return this.createPlaceholderImages(englishKeyPoints.length, outputDir);
  }

  createPlaceholderImages(count, outputDir) {
    const placeholderPath = path.join(__dirname, 'placeholder.jpg');
    const images = [];
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const imagePath = path.join(outputDir, `broll_${i}.jpg`);
      fs.copyFileSync(placeholderPath, imagePath);
      images.push(imagePath);
    }
    
    logger.warn('Using placeholder images due to download failure');
    return images;
  }

  async createVideo(content, images, outputPath, srtPath) {
    try {
      logger.info('Creating silent video with FFmpeg and burning subtitles...');
      
      const { script } = content;
      const videoLength = 25; // 25 seconds target
      const hookDuration = 4; // 4-second hook
      const remainingDuration = videoLength - hookDuration;
      const remainingImagesCount = images.length > 1 ? images.length - 1 : 1;
      const imageDuration = remainingDuration / remainingImagesCount;

      // Create input file list for FFmpeg
      const concatListPath = path.join(this.outputDir, 'input_list.txt');
      let concatList = `file '${images[0]}'\nduration ${hookDuration}\n`;
      if (images.length > 1) {
        concatList += images.slice(1).map(img => `file '${img}'\nduration ${imageDuration}`).join('\n');
      }
      fs.writeFileSync(concatListPath, concatList);

      // Subtitles styling for ffmpeg
      const fontPath = path.resolve(__dirname, 'font.ttf');
      const subtitleStyle = `FontName=Vazirmatn,FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BorderStyle=1,Outline=1,Shadow=0,MarginV=50`;
      const subtitlesFilter = `subtitles=${srtPath}:force_style='${subtitleStyle}'`;

      return new Promise((resolve, reject) => {
        ffmpeg()
          .input(concatListPath)
          .inputFormat('concat')
          .inputOptions(['-safe 0'])
          .outputOptions([
            '-c:v libx264',
            `-vf scale=1080:1920,setsar=1:1,${subtitlesFilter}`,
            '-r 30',
            '-b:v 5000k',
            '-pix_fmt yuv420p',
            '-t', videoLength.toString() // Set total duration
          ])
          .output(outputPath)
          .on('start', function(commandLine) {
            logger.info('🎬 Spawned FFmpeg with command: ' + commandLine);
          })
          .on('end', () => {
            logger.info('✅ Video created successfully');
            resolve();
          })
          .on('error', (err, stdout, stderr) => {
            logger.error('❌ FFmpeg error: ' + err.message);
            logger.error('FFmpeg stdout:\n' + stdout);
            logger.error('FFmpeg stderr:\n' + stderr);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Error creating video:', error);
      throw error;
    }
  }

  async generateThumbnail(content, outputPath) {
    try {
      logger.info('Generating thumbnail...');

      const { title } = content;
      const width = 1080;
      const height = 1920;
      
      // Helper function to wrap text based on character count
      const wrapText = (text, maxCharsPerLine) => {
        const words = text.split(' ');
        let line = '';
        const lines = [];
        for (const word of words) {
          if ((line + ' ' + word).length > maxCharsPerLine && line.length > 0) {
            lines.push(line.trim());
            line = word;
          } else {
            line += (line ? ' ' : '') + word;
          }
        }
        lines.push(line.trim());
        return lines;
      };

      const lines = wrapText(title, 20); // Approx 20 chars per line is good for this width
      const fontSize = 80;
      const lineHeight = 1.2 * fontSize;
      const totalTextHeight = (lines.length -1) * lineHeight;
      const startY = (height / 2) - (totalTextHeight / 2) - 150; // Adjusted for better vertical centering in the box

      const textElements = lines.map((line, index) =>
        `<tspan x="${width / 2}" dy="${index === 0 ? 0 : lineHeight}">${line}</tspan>`
      ).join('');

      // Embed font directly for sharp to render it correctly
      const fontBase64 = fs.readFileSync(path.resolve(__dirname, 'font.ttf')).toString('base64');

      // Create a simple thumbnail with text
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#FF8C00;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#FF0080;stop-opacity:1" />
            </linearGradient>
          </defs>
          <style>
            @font-face {
              font-family: 'Vazirmatn';
              src: url(data:font/ttf;base64,${fontBase64});
            }
          </style>
          <rect width="100%" height="100%" fill="url(#grad)"/>
          <rect x="50" y="600" width="980" height="800" fill="rgba(0,0,0,0.5)" rx="30" stroke="#FFD700" stroke-width="10"/>
          <text y="${startY}" font-family="Vazirmatn, Arial, sans-serif" font-size="${fontSize}" fill="white" text-anchor="middle" font-weight="bold">
            ${textElements}
          </text>
          <text x="540" y="1400" font-family="Vazirmatn, Arial, sans-serif" font-size="40" fill="#FFD700" text-anchor="middle">
            ترفندهای عمرانی
          </text>
        </svg>
      `;

      await sharp(Buffer.from(svg))
        .resize(width, height)
        .jpeg({ quality: 90 })
        .toFile(outputPath);

      logger.info('Thumbnail generated successfully');
    } catch (error) {
      logger.error('Error generating thumbnail:', error);
      throw error;
    }
  }

  async generateSRT(content, outputPath) {
    try {
      logger.info('Generating SRT subtitles...');
      
      const { script } = content;
      const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const duration = 25; // 25 seconds
      const timePerSentence = duration / sentences.length;
      
      let srtContent = '';
      
      for (let i = 0; i < sentences.length; i++) {
        const startTime = this.formatSRTTime(i * timePerSentence);
        const endTime = this.formatSRTTime((i + 1) * timePerSentence);
        
        srtContent += `${i + 1}\n`;
        srtContent += `${startTime} --> ${endTime}\n`;
        srtContent += `${sentences[i].trim()}\n\n`;
      }
      
      fs.writeFileSync(outputPath, srtContent);
      logger.info('SRT file generated successfully');
    } catch (error) {
      logger.error('Error generating SRT:', error);
      throw error;
    }
  }

  async generateDialogueFile(content, outputPath) {
    try {
      logger.info('Generating dialogue file...');

      const { script } = content;
      const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const duration = 25; // Must match video length
      const timePerSentence = duration / sentences.length;

      let dialogueContent = '';

      const formatSimpleTime = (timeInSeconds) => {
        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
        const seconds = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
      };

      for (let i = 0; i < sentences.length; i++) {
        const startTime = i * timePerSentence;
        const endTime = (i + 1) * timePerSentence;

        dialogueContent += `${formatSimpleTime(startTime)} - ${formatSimpleTime(endTime)}\n`;
        dialogueContent += `${sentences[i].trim()}\n\n`;
      }

      fs.writeFileSync(outputPath, dialogueContent.trim());
      logger.info('Dialogue file generated successfully');
    } catch (error) {
      logger.error('Error generating dialogue file:', error);
      throw error;
    }
  }

  async generateMetadataFile(content, outputPath) {
    try {
      logger.info('Generating metadata file...');

      const { title, script, keyPoints } = content;

      const textHook = `انتخاب اشتباه چسب کاشی می‌تواند به قیمت از دست دادن کل کاشی‌کاری تمام شود!`;
      const caption = `در این ویدیو، نکته کلیدی برای انتخاب چسب کاشی مناسب، به خصوص برای محیط‌های مرطوب مثل حمام را با شما به اشتراک می‌گذاریم. با این ترفند ساده، عمر کاشی‌کاری خود را تضمین کنید.`;
      const callToAction = `شما از چه چسبی برای کاشی‌کاری استفاده می‌کنید؟ در کامنت‌ها برای ما بنویسید و فراموش نکنید که برای ترفندهای عمرانی بیشتر، ما را دنبال کنید!`;
      const hashtags = `#چسب_کاشی #کاشی_کاری #ساختمان #نکات_ساختمانی #ترفندهای_عمرانی #حمام #${keyPoints.join(' #')}`;

      const metadataContent = `
**قلاب متنی (Text Hook):**
${textHook}

**کپشن (Caption):**
${caption}

**کال تو اکشن (Call to Action):**
${callToAction}

**هشتگ‌ها (Hashtags):**
${hashtags}
      `.trim();

      fs.writeFileSync(outputPath, metadataContent);
      logger.info('Metadata file generated successfully');
    } catch (error) {
      logger.error('Error generating metadata file:', error);
      throw error;
    }
  }

  formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  async uploadToYouTube(videoPath, thumbnailPath, content) {
    try {
      logger.info('Uploading to YouTube...');
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.YT_CLIENT_ID,
        process.env.YT_CLIENT_SECRET,
        'http://localhost:3000/callback'
      );
      
      oauth2Client.setCredentials({
        refresh_token: process.env.YT_REFRESH_TOKEN
      });

      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
      
      // Upload video
      const videoResponse = await youtube.videos.insert({
        part: 'snippet,status',
        requestBody: {
          snippet: {
            title: content.title,
            description: `${content.script}\n\n#ترفندهای_عمرانی #ساختمان #آموزش`,
            tags: ['ترفندهای عمرانی', 'ساختمان', 'آموزش', 'construction', 'tips'],
            categoryId: '28' // Science & Technology
          },
          status: {
            privacyStatus: 'public',
            madeForKids: false
          }
        },
        media: {
          body: fs.createReadStream(videoPath)
        }
      });

      const videoId = videoResponse.data.id;
      logger.info(`Video uploaded successfully. Video ID: ${videoId}`);

      // Upload thumbnail
      if (thumbnailPath) {
        await youtube.thumbnails.set({
          videoId: videoId,
          media: {
            body: fs.createReadStream(thumbnailPath)
          }
        });
        logger.info('Thumbnail uploaded successfully');
      }

      return {
        videoId: videoId,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        shortUrl: `https://www.youtube.com/shorts/${videoId}`
      };
    } catch (error) {
      logger.error('Error uploading to YouTube:', error);
      throw error;
    }
  }

  async generate() {
    try {
      logger.info('Starting YouTube Short generation...');
      
      // Generate content
      const content = await this.generateContent();
      
      // Download B-roll images
      const images = await this.downloadBrollImages(content.englishKeyPoints, this.outputDir);
      
      // Generate SRT subtitles
      const srtPath = path.join(this.outputDir, 'subtitles.srt');
      await this.generateSRT(content, srtPath);

      // Create video and burn subtitles
      const videoPath = path.join(this.outputDir, 'output.mp4');
      await this.createVideo(content, images, videoPath, srtPath);
      
      // Generate thumbnail
      const thumbnailPath = path.join(this.outputDir, 'thumbnail.jpg');
      await this.generateThumbnail(content, thumbnailPath);

      // Generate dialogue file
      const dialoguePath = path.join(this.outputDir, 'dialogue.txt');
      await this.generateDialogueFile(content, dialoguePath);

      // Generate metadata file
      const metadataPath = path.join(this.outputDir, 'video_metadata.txt');
      await this.generateMetadataFile(content, metadataPath);
      
      // Upload to YouTube
      // const uploadResult = await this.uploadToYouTube(videoPath, thumbnailPath, content);
      
      logger.info('YouTube Short generated successfully!');
      // logger.info(`Video URL: ${uploadResult.videoUrl}`);
      // logger.info(`Short URL: ${uploadResult.shortUrl}`);
      
      return {
        success: true,
        // videoId: uploadResult.videoId,
        // videoUrl: uploadResult.videoUrl,
        // shortUrl: uploadResult.shortUrl,
        title: content.title,
        outputFiles: {
          video: videoPath,
          thumbnail: thumbnailPath,
          subtitles: srtPath
        }
      };
    } catch (error) {
      logger.error('Error in video generation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Main execution
if (require.main === module) {
  const generator = new YouTubeShortGenerator();
  generator.generate()
    .then(result => {
      if (result.success) {
        console.log('\n✅ YouTube Short generated successfully!');
        console.log(`Title: ${result.title}`);
        console.log(`Video URL: ${result.videoUrl}`);
        console.log(`Short URL: ${result.shortUrl}`);
        process.exit(0);
      } else {
        console.error('\n❌ Error generating YouTube Short:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = YouTubeShortGenerator;
