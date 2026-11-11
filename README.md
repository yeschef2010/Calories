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

### iPhone steps (optional)

1. In the Vercel project, open the **Storage** tab and connect an **Upstash Redis** database (the free plan is fine; the Yes Chef one can be shared). Redeploy.
2. In the app: **Settings → Link iPhone steps** gives your sync address and the Shortcut steps.

Home-screen web apps keep their own storage, separate from Safari, so the Shortcut sends steps to `api/steps` and the app collects them when you open it.

### Weight and the weekly check-in

Log weight in the app (**+ Weight**) or add it to the Shortcut (instructions in the app). Once there are 3+ weigh-ins over 2+ weeks and food is logged on most days, a weekly check-in compares the real weight trend with logged intake and suggests a new target (never more than 200 kcal change at a time, never below 1,200/1,500). You choose whether to accept it.

**Settings → Exercise calories to count** (100 / 75 / 50%) scales calories earned from exercise and steps.

## How it works

- `public/index.html` is the whole app. Your details and food log are saved on your phone (browser storage).
- `api/estimate.js` sends your description or photo to Claude, which returns a calorie estimate for each food.
- `api/steps.js` passes today's step count from the iPhone Shortcut to the app, keyed by a random sync code.
- Daily target: Mifflin–St Jeor for resting calories, times your activity level, minus (or plus) your chosen pace. Never set below 1,200 (women) or 1,500 (men).
