import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',timeout:150000,use:{channel:'chromium',baseURL:'http://127.0.0.1:4173',launchOptions:{args:['--enable-unsafe-swiftshader']}},webServer:{command:'npm run preview -- --host 127.0.0.1',port:4173,reuseExistingServer:!process.env.CI}});
