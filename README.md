# EV Charging Calculator

A simple web app to calculate when to start charging your EV so it reaches your target charge level by a specific time.

**Live:** https://ev-charging-calculator-zeta.vercel.app

## What it does

Enter your charging parameters and the app tells you exactly when to plug in:

- **Voltage & current** — from your Tesla app (e.g. 228V / 20A)
- **Battery size** — kWh capacity of your pack
- **Current & target charge** — where you are and where you want to be
- **Charged by** — the time you need the car ready
- **Charging efficiency** — accounts for real-world losses (default 88%)

The calculator handles overnight charging automatically — if the target time has already passed today, it schedules for tomorrow.

Inputs are saved to `localStorage` so your settings persist between visits.

## Development

```bash
npm install
npm run build    # compile TypeScript
npm run watch    # watch mode
npm run serve    # local dev server
```

Built with TypeScript, no dependencies. Deployed on Vercel.
