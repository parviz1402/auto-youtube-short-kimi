# 🎬 Auto YouTube Short - ترفندهای عمرانی

یک سیستم خودکار برای تولید و آپلود روزانه ویدیوهای کوتاه YouTube Shorts با موضوع "ترفندهای عمرانی".

## 🚀 ویژگی‌ها

- ✅ تولید خودکار محتوا با هوش مصنوعی (OpenAI GPT-4)
- 🔊 تولید صدای گوینده با TTS (ElevenLabs یا OpenAI)
- 🖼️ دانلود تصاویر B-roll از Pexels
- 🎬 ویرایش ویدیو با FFmpeg
- 📺 آپلود خودکار به YouTube
- 📅 اجرای برنامه‌ریزی شده با GitHub Actions
- 🎯 تمرکز بر نکات ایمنی و آموزشی (بدون دستورالعمل‌های خطرناک)

## 📁 ساختار پروژه

```
auto-youtube-short-kimi/
├── .github/workflows/
│   └── auto-create-short.yml    # GitHub Actions workflow
├── generate-video.js            # اسکریپت اصلی تولید ویدیو
├── youtube_get_refresh_token.js # اسکریپت دریافت توکن OAuth
├── package.json                 # وابستگی‌ها و اسکریپت‌ها
├── README.md                    # مستندات
├── .env.example                 # نمونه فایل محیطی
└── placeholder.jpg              # تصویر جایگزین
```

## 🛠️ نصب و راه‌اندازی

### 1. کلون کردن مخزن

```bash
git clone https://github.com/YOUR_USERNAME/auto-youtube-short-kimi.git
cd auto-youtube-short-kimi
```

### 2. نصب وابستگی‌ها

```bash
npm install
```

### 3. نصب FFmpeg (برای توسعه محلی)

**در Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**در macOS:**
```bash
brew install ffmpeg
```

**در Windows:**
از https://ffmpeg.org/download.html دانلود و نصب کنید.

### 4. تنظیم متغیرهای محیطی

کپی فایل نمونه و ویرایش مقادیر:

```bash
cp .env.example .env
```

و مقادیر API key ها را وارد کنید.

## 🔑 دریافت API Keys

### 1. OpenAI API Key
- به https://platform.openai.com/api-keys بروید
- کلید API جدید بسازید
- در ENVIRONMENT VARIABLE قرار دهید: `OPENAI_API_KEY`

### 2. Pexels API Key
- به https://www.pexels.com/api/ بروید
- ثبت‌نام و کلید API دریافت کنید
- در ENVIRONMENT VARIABLE قرار دهید: `PEXELS_API_KEY`

### 3. ElevenLabs API Key (اختیاری)
- به https://elevenlabs.io/ بروید
- حساب کاربری بسازید و کلید API دریافت کنید
- در ENVIRONMENT VARIABLE قرار دهید: `ELEVENLABS_API_KEY`
- Voice ID مورد نظر را در `DEFAULT_VOICE_ID` قرار دهید

### 4. YouTube Data API Setup

1. به [Google Cloud Console](https://console.cloud.google.com/) بروید
2. پروژه جدید بسازید یا پروژه موجود را انتخاب کنید
3. YouTube Data API v3 را فعال کنید
4. به APIs & Services > Credentials بروید
5. "Create Credentials" > "OAuth client ID" را انتخاب کنید
6. "Web application" را انتخاب کنید
7. Redirect URI اضافه کنید: `http://localhost:3000/callback`
8. Client ID و Client Secret را کپی کنید

برای دریافت Refresh Token:

```bash
# Client ID و Client Secret را در .env قرار دهید
npm run get-token
```

دستورالعمل‌ها را دنبال کنید تا Refresh Token را دریافت کنید.

## 🚀 استفاده

### اجرای محلی

```bash
# تولید یک ویدیو
npm run generate

# یا مستقیماً
node generate-video.js
```

### اجرای خودکار با GitHub Actions

پس از تنظیم GitHub Secrets، ویدیوها به‌صورت خودکار هر روز ساعت 9:00 UTC (12:30 به وقت ایران) تولید و آپلود می‌شوند.

برای اجرای دستی:
1. به تب Actions در مخزن GitHub بروید
2. workflow "Auto Create YouTube Short" را انتخاب کنید
3. "Run workflow" را کلیک کنید

## 📋 GitHub Secrets

در مخزن GitHub خود، به Settings > Secrets and variables > Actions بروید و این مقادیر را اضافه کنید:

| Secret | توضیح |
|--------|-------|
| `OPENAI_API_KEY` | کلید API OpenAI |
| `PEXELS_API_KEY` | کلید API Pexels |
| `ELEVENLABS_API_KEY` | کلید API ElevenLabs (اختیاری) |
| `DEFAULT_VOICE_ID` | ID صدای ElevenLabs (اختیاری) |
| `YT_CLIENT_ID` | YouTube OAuth Client ID |
| `YT_CLIENT_SECRET` | YouTube OAuth Client Secret |
| `YT_REFRESH_TOKEN` | YouTube OAuth Refresh Token |

## 🔧 پیکربندی

### تغییر زمان‌بندی

در فایل `.github/workflows/auto-create-short.yml`، خط cron را ویرایش کنید:

```yaml
schedule:
  # هر روز ساعت 15:00 UTC
  - cron: '0 15 * * *'
```

### تغییر موضوع ویدیوها

در `generate-video.js`، پرامپت‌های OpenAI را ویرایش کنید تا موضوع مورد نظر خود را تغییر دهید.

## 📊 لاگ‌ها و مانیتورینگ

- لاگ‌ها در فایل‌های `combined.log` و `error.log` ذخیره می‌شوند
- در GitHub Actions، لاگ‌ها به‌صورت آرتفکت ذخیره می‌شوند
- برای دیباگ، workflow را با پارامتر debug=true اجرا کنید

## 🛡️ ایمنی و محدودیت‌ها

- فقط نکات ایمنی و آموزشی تولید می‌شود (بدون دستورالعمل‌های ساختاری خطرناک)
- محتوا توسط AI تولید می‌شود و باید بررسی شود
- محدودیت‌های API را در نظر بگیرید:
  - OpenAI: محدودیت درخواست‌ها
  - YouTube: محدودیت آپلود روزانه
  - Pexels: محدودیت دانلود تصاویر

## 🐛 عیب‌یابی

### خطای "No refresh token received"
برنامه را در گوگل revoke کرده و دوباره تلاش کنید:
1. به https://myaccount.google.com/permissions بروید
2. دسترسی برنامه را لغو کنید
3. دوباره `npm run get-token` را اجرا کنید

### خطای آپلود YouTube
- بررسی کنید که API فعال باشد
- محدودیت‌های آپلود YouTube را بررسی کنید
- توکن OAuth را دوباره دریافت کنید

### خطای FFmpeg
- نسخه FFmpeg را بررسی کنید: `ffmpeg -version`
- فایل‌های ورودی را بررسی کنید

## 🤝 مشارکت

مشارکت‌ها خوش‌آمد هستند! لطفاً:
1. Fork کنید
2. Branch جدید بسازید
3. تغییرات را انجام دهید
4. Pull Request ارسال کنید

## 📄 مجوز

این پروژه تحت مجوز MIT منتشر شده است.

## 🆘 پشتیبانی

اگر مشکلی دارید:
1. لاگ‌ها را بررسی کنید
2. مستندات را بخوانید
3. Issue جدید ایجاد کنید

---

**⚠️ هشدار**: این ابزار برای تولید محتوای آموزشی ساخته شده است. مسئولیت محتوای تولید شده بر عهده کاربر است.