# Simple Calories

A simple calorie counter. Tell it about yourself once, get a daily target, then type or snap what you eat and watch the number count down.

## Running it

It's a static page plus one small server function, designed to be hosted on [Vercel](https://vercel.com).

1. In Vercel, choose **Add New → Project** and import this GitHub repository. The defaults are fine.
2. Under **Settings → Environment Variables**, add `ANTHROPIC_API_KEY` with your key from [console.anthropic.com](https://console.anthropic.com). Then redeploy.
3. Open the web address Vercel gives you on your phone. In Safari, tap **Share → Add to Home Screen**.

Without the API key, the app still works, but you have to type calories yourself (e.g. "porridge 350").

### Invite code (recommended)

To stop strangers using your API credit, add `CALORIES_INVITE_CODE` in Vercel (one code, or several separated by commas) and redeploy. The app asks for the code the first time you use an estimate.

## How it works

- `public/index.html` is the whole app. Your details and food log are saved on your phone (browser storage).
- `api/estimate.js` sends your description or photo to Claude, which returns a calorie estimate for each food.
- Daily target: Mifflin–St Jeor for resting calories, times your activity level, minus (or plus) your chosen pace. Never set below 1,200 (women) or 1,500 (men).
