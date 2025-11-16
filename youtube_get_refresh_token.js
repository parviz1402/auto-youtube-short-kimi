#!/usr/bin/env node

const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');
require('dotenv').config();

// OAuth2 configuration
const CLIENT_ID = process.env.YT_CLIENT_ID;
const CLIENT_SECRET = process.env.YT_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Error: YT_CLIENT_ID and YT_CLIENT_SECRET must be set in environment variables');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Scopes needed for YouTube upload
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/userinfo.profile'
];

function getRefreshToken() {
  return new Promise((resolve, reject) => {
    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });

    console.log('🌐 Please visit this URL to authorize the application:');
    console.log(authUrl);
    console.log('\n📋 After authorization, you will be redirected to a localhost URL.');
    console.log('📋 Copy the entire redirect URL (including the code parameter) and paste it below.\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('🔗 Please paste the redirect URL here: ', async (url) => {
      try {
        // Extract code from URL
        const urlParams = new URL(url);
        const code = urlParams.searchParams.get('code');
        
        if (!code) {
          throw new Error('No authorization code found in URL');
        }

        console.log('\n⏳ Exchanging authorization code for tokens...');
        
        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        
        if (!tokens.refresh_token) {
          console.log('\n⚠️  Warning: No refresh token received!');
          console.log('This usually happens if the app was already authorized before.');
          console.log('Please revoke access and try again:');
          console.log('1. Go to https://myaccount.google.com/permissions');
          console.log('2. Find your app and revoke access');
          console.log('3. Run this script again');
          rl.close();
          return;
        }

        console.log('\n✅ Successfully obtained refresh token!');
        console.log('\n🔑 Your refresh token:');
        console.log('─'.repeat(50));
        console.log(tokens.refresh_token);
        console.log('─'.repeat(50));
        
        console.log('\n📋 Please add this refresh token to your GitHub Secrets as YT_REFRESH_TOKEN');
        console.log('📋 Also add these values to your .env file for local testing:\n');
        
        console.log('YT_REFRESH_TOKEN=' + tokens.refresh_token);
        
        // Test the token
        console.log('\n⏳ Testing the refresh token...');
        oauth2Client.setCredentials({ refresh_token: tokens.refresh_token });
        
        try {
          await oauth2Client.getAccessToken();
          console.log('✅ Token test successful!');
          resolve(tokens.refresh_token);
        } catch (error) {
          console.error('❌ Token test failed:', error.message);
          reject(error);
        }
        
      } catch (error) {
        console.error('❌ Error getting refresh token:', error.message);
        reject(error);
      } finally {
        rl.close();
      }
    });
  });
}

// Alternative method using device flow (for headless environments)
async function getRefreshTokenDeviceFlow() {
  try {
    console.log('🔄 Using device flow for headless authorization...\n');
    
    const oauth2 = google.oauth2({
      auth: new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI),
      version: 'v2'
    });

    // Get device code
    const deviceResponse = await oauth2.client.getDeviceCode({
      client_id: CLIENT_ID,
      scope: SCOPES
    });

    console.log('📱 Please visit:', deviceResponse.data.verification_url);
    console.log('🔑 Enter code:', deviceResponse.data.user_code);
    console.log(`⏳ You have ${deviceResponse.data.expires_in} seconds to complete authorization\n`);
    
    console.log('⏳ Waiting for authorization...');
    
    // Poll for token
    const tokenResponse = await oauth2.client.pollForToken({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      device_code: deviceResponse.data.device_code
    });

    if (tokenResponse.data.refresh_token) {
      console.log('\n✅ Successfully obtained refresh token!');
      console.log('\n🔑 Your refresh token:');
      console.log('─'.repeat(50));
      console.log(tokenResponse.data.refresh_token);
      console.log('─'.repeat(50));
      
      return tokenResponse.data.refresh_token;
    } else {
      throw new Error('No refresh token received');
    }
  } catch (error) {
    console.error('❌ Device flow error:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  console.log('🏗️  YouTube OAuth2 Refresh Token Generator\n');
  console.log('This script will help you obtain a refresh token for YouTube API access.\n');
  
  try {
    // Check if running in headless environment
    if (process.env.HEADLESS || !process.stdout.isTTY) {
      console.log('🤖 Headless environment detected, using device flow...');
      await getRefreshTokenDeviceFlow();
    } else {
      await getRefreshToken();
    }
    
    console.log('\n🎉 Setup complete! You can now use the YouTube upload functionality.');
    
  } catch (error) {
    console.error('\n💥 Error:', error.message);
    process.exit(1);
  }
}

// Instructions for manual setup
function showManualInstructions() {
  console.log('\n📖 Manual Setup Instructions:');
  console.log('─'.repeat(50));
  console.log('1. Create a Google Cloud Project:');
  console.log('   • Go to https://console.cloud.google.com/');
  console.log('   • Create a new project or select existing one');
  console.log('   • Enable YouTube Data API v3');
  console.log('');
  console.log('2. Create OAuth2 credentials:');
  console.log('   • Go to APIs & Services > Credentials');
  console.log('   • Click "Create Credentials" > "OAuth client ID"');
  console.log('   • Choose "Web application"');
  console.log('   • Add redirect URI: http://localhost:3000/callback');
  console.log('   • Copy Client ID and Client Secret');
  console.log('');
  console.log('3. Set environment variables:');
  console.log('   • YT_CLIENT_ID=your_client_id');
  console.log('   • YT_CLIENT_SECRET=your_client_secret');
  console.log('');
  console.log('4. Run this script to get refresh token');
  console.log('─'.repeat(50));
}

if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showManualInstructions();
  } else {
    main();
  }
}

module.exports = { getRefreshToken, getRefreshTokenDeviceFlow };