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
    try {
      logger.info('Downloading B-roll images using English keywords...');
      const images = [];
      
      for (let i = 0; i < Math.min(englishKeyPoints.length, 5); i++) {
        const searchTerm = englishKeyPoints[i];
        const response = await axios.get('https://api.pexels.com/v1/search', {
          headers: {
            Authorization: process.env.PEXELS_API_KEY
          },
          params: {
            query: searchTerm,
            per_page: 5,
            orientation: 'portrait'
          }
        });

        if (response.data.photos.length > 0) {
          const photo = response.data.photos[Math.floor(Math.random() * response.data.photos.length)];
          const imageResponse = await axios.get(photo.src.medium, {
            responseType: 'stream'
          });

          const imagePath = path.join(outputDir, `broll_${i}.jpg`);
          const writer = fs.createWriteStream(imagePath);
          imageResponse.data.pipe(writer);
          
          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });

          images.push(imagePath);
          logger.info(`Downloaded image ${i + 1}: ${photo.src.medium}`);
        }
      }

      return images;
    } catch (error) {
      logger.error('Error downloading B-roll images:', error);
      logger.warn('⚠️ Pexels API call failed. This is likely due to an invalid or missing PEXELS_API_KEY in your GitHub Secrets. Using placeholder images instead.');
      // Return placeholder images if download fails
      return this.createPlaceholderImages(englishKeyPoints.length, outputDir);
    }
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

  async createVideo(content, images, outputPath) {
    try {
      logger.info('Creating silent video with FFmpeg...');
      
      const { script } = content;
      const videoLength = 35; // 35 seconds target
      const imageDuration = videoLength / images.length;
      
      // Create input file list for FFmpeg
      const concatListPath = path.join(this.outputDir, 'input_list.txt');
      const concatList = images.map(img => `file '${img}'\nduration ${imageDuration}`).join('\n');
      fs.writeFileSync(concatListPath, concatList);

      return new Promise((resolve, reject) => {
        ffmpeg()
          .input(concatListPath)
          .inputFormat('concat')
          .inputOptions(['-safe 0'])
          .outputOptions([
            '-c:v libx264',
            '-vf scale=1080:1920,setsar=1:1',
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
      
      // Create a simple thumbnail with text
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#FF6B35"/>
          <rect x="50" y="600" width="980" height="800" fill="rgba(0,0,0,0.7)" rx="20"/>
          <text x="540" y="1000" font-family="Arial, sans-serif" font-size="80" fill="white" text-anchor="middle" dominant-baseline="middle" font-weight="bold">
            ${title}
          </text>
          <text x="540" y="1400" font-family="Arial, sans-serif" font-size="40" fill="#FFD700" text-anchor="middle">
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
      const duration = 35; // 35 seconds
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
      
      // Create video
      const videoPath = path.join(this.outputDir, 'output.mp4');
      await this.createVideo(content, images, videoPath);
      
      // Generate thumbnail
      const thumbnailPath = path.join(this.outputDir, 'thumbnail.jpg');
      await this.generateThumbnail(content, thumbnailPath);
      
      // Generate SRT subtitles
      const srtPath = path.join(this.outputDir, 'subtitles.srt');
      await this.generateSRT(content, srtPath);
      
      // Upload to YouTube
      const uploadResult = await this.uploadToYouTube(videoPath, thumbnailPath, content);
      
      logger.info('YouTube Short generated and uploaded successfully!');
      logger.info(`Video URL: ${uploadResult.videoUrl}`);
      logger.info(`Short URL: ${uploadResult.shortUrl}`);
      
      return {
        success: true,
        videoId: uploadResult.videoId,
        videoUrl: uploadResult.videoUrl,
        shortUrl: uploadResult.shortUrl,
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
