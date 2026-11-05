# UniDoxia Voice Assistant

A local voice/browser automation module for UniDoxia. It is the first business profile for a broader reusable voice assistant.

## What is implemented

- Chrome/Edge microphone capture through the Web Speech API
- typed-command fallback
- Jev/TypeSafe closed-set intent selection
- approved UniDoxia command registry
- verified protected route mapping
- persistent Playwright browser profile so login can be reused locally
- green/amber/red risk levels
- mandatory confirmation gate for red/destructive commands
- blocking for unknown or low-confidence commands
- safety tests

## Install

```bash
cd tools/voice-assistant
npm install
npx playwright install chromium
cp .env.example .env
```

Put your server-side Jev key in `.env`:

```env
TYPESAFE_API_KEY=your_key_here
```

Do not put the key into the browser page or UniDoxia frontend.

## Start

```bash
npm start
```

Then open:

```text
http://localhost:8787
```

Use Chrome or Edge, click **Start microphone**, allow microphone access, and say commands such as:

```text
Open UniDoxia
Show students
Show applications
Show notifications
```

You can type the same commands if speech recognition is unavailable.

## Login persistence

Playwright uses `tools/voice-assistant/.profile` as a persistent local browser profile. Log into UniDoxia in the controlled browser once and the local profile can reuse that authenticated session. Do not commit `.profile` or copy it to another machine.

## Configuration

```env
UNIDOXIA_BASE_URL=https://unidoxia.com
VOICE_ASSISTANT_PORT=8787
JEV_MIN_CONFIDENCE=0.55
JEV_MODEL=jev-1.13.0
```

For staging or local development change `UNIDOXIA_BASE_URL` instead of pointing tests at production.

## Safety model

- Green: navigation/read-only actions may execute automatically.
- Amber: typing or preparing content needs an explicit dedicated handler.
- Red: send, submit, approve, reject, delete, pay, or publish requires explicit confirmation and a dedicated executor.

Generic destructive clicks are intentionally blocked. Confirmation alone does not grant Jev arbitrary browser control.

## Architecture

```text
Microphone or typed command
  -> local server
  -> Jev selects from approved command keys only
  -> confidence + safety policy
  -> Playwright persistent browser
  -> UniDoxia protected routes
```

## Tests

```bash
npm test
```

The tests cover approved matching, unknown-command blocking, destructive confirmation, verified UniDoxia routes, and the closed Jev command set.

## Important production rule

Test against local/staging UniDoxia before enabling the assistant against production data. Red actions must be added individually with their own selectors, preconditions, confirmation language, and tests.
