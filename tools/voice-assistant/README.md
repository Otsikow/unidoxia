# UniDoxia Voice Assistant

A local voice/browser automation module for UniDoxia. It is designed to become the first business profile in a broader personal voice assistant.

## Current scope

The module currently provides:

- an approved-command registry for UniDoxia
- protected route mapping for admin/staff pages
- Playwright browser execution
- three risk levels: green, amber, red
- mandatory confirmation for red/destructive commands
- blocking for unknown commands
- safety tests

The microphone and Jev intent layer are the next step. Until that layer is added, commands can be exercised as typed input.

## Install

```bash
cd tools/voice-assistant
npm install
npx playwright install chromium
```

## Run a safe command

```bash
npm start -- "show applications"
```

Other examples:

```bash
npm start -- "open unidoxia"
npm start -- "show students"
npm start -- "show notifications"
```

By default the assistant uses `https://unidoxia.com`. For local or staging use:

```bash
UNIDOXIA_BASE_URL=http://localhost:5173 npm start -- "show students"
```

## Safety model

- Green: navigate/read/search. May execute automatically.
- Amber: typing or preparing content. Allowed only in explicitly supported handlers.
- Red: send, submit, approve, reject, delete, pay, publish. Always requires explicit confirmation and a dedicated action handler.

Red actions are intentionally not implemented as generic clicks. Each one must be added explicitly so a voice misunderstanding cannot trigger an irreversible action.

## Architecture target

```text
Microphone
  -> speech transcript
  -> Jev intent selection from approved commands
  -> safety policy
  -> Playwright
  -> UniDoxia protected routes
```

Jev should choose only from the command registry. It should not invent arbitrary URLs, selectors, or destructive actions.

## Next implementation step

Add the microphone/Jev adapter based on the `jev-voice-browser` interaction pattern, keeping the existing command registry and safety policy as the execution boundary.
