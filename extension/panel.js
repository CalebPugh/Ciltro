(() => {
  const icon = (name, size = 18) => {
    const paths = {
      close: '<path d="m6 6 12 12M6 18 18 6"/>',
      settings: '<path d="M4 7h16M4 17h16M8 4v6m8 4v6"/>',
      copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
      arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
      play: '<path d="m9 5 11 7-11 7Z"/>',
      resync: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1"/>',
      send: '<path d="m21 3-7 18-4-7-7-4 18-7ZM10 14l6-6"/>',
      leave: '<path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4m6-13 5 5-5 5m-7-5h12"/>',
      chat: '<path d="M20 11a8 8 0 0 1-8 8H4l1.5-4A8 8 0 1 1 20 11Z"/><path d="M8 10h8m-8 4h5"/>',
      people: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m2-15a3 3 0 0 1 0 6m2 9v-2a6 6 0 0 0-2-4"/>'
    };
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  };
  globalThis.ciltroPanel = `<style>
    :host { all: initial; color-scheme: dark; }
    *, *::before, *::after { box-sizing: border-box; }
    [hidden] { display: none !important; }
    .panel { --bg: #0b1424; --surface: #111d30; --line: #414b5b; --subtle: #29374a; --text: #f2f4f8; --muted: #a5b1c3; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: var(--bg); color: var(--text); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 16px 60px #0007; font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; letter-spacing: normal; text-align: left; }
    button, input { font: inherit; }
    button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 36px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 7px; background: transparent; color: var(--text); cursor: pointer; transition: background .15s, border-color .15s; }
    button:hover:not(:disabled) { background: #1e2c42; border-color: #7b8799; }
    button:disabled { opacity: .45; cursor: default; }
    button:focus-visible, input:focus-visible { outline: 2px solid #d8e2f2; outline-offset: 3px; }
    button.primary { background: #e3e9f2; color: #101b2d; border-color: #e3e9f2; font-weight: 600; }
    button.primary:hover:not(:disabled) { background: #fff; border-color: #fff; }
    button.icon { width: 32px; min-height: 32px; padding: 6px; border-color: transparent; }
    button svg { flex-shrink: 0; }
    input { min-width: 0; width: 100%; padding: 10px 11px; background: #0b1424; border: 1px solid var(--line); border-radius: 7px; color: var(--text); }
    input::placeholder { color: #8491a5; opacity: 1; }
    h1, h2, p { margin: 0; } h1 { font-size: 21px; letter-spacing: -.7px; font-weight: 650; } h2 { font-size: 17px; font-weight: 600; letter-spacing: -.3px; }
    .muted { color: var(--muted); } .small { font-size: 11px; } .eyebrow { color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
    .header { display: flex; align-items: center; gap: 10px; padding: 17px 18px; border-bottom: 1px solid var(--line); flex-shrink: 0; }
    .brand { width: 30px; height: 30px; border: 1px solid #7e8a9d; border-radius: 9px; display: grid; place-items: center; font-size: 19px; font-weight: 700; }
    .wordmark { flex: 1; } .wordmark p { font-size: 10px; color: var(--muted); letter-spacing: .3px; }
    .body { min-height: 0; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #465268 transparent; }
    .panel:has(#setup:not([hidden])) .body { flex: 1; }
    .settings { padding: 15px 18px; border-bottom: 1px solid var(--line); background: var(--surface); }
    label { display: block; font-size: 12px; margin-bottom: 7px; color: #d0d8e5; } .settings p { margin-top: 7px; }
    .video { display: flex; align-items: center; gap: 10px; padding: 15px 18px 11px; }
    .service { width: 30px; height: 34px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 6px; font-size: 19px; font-weight: 800; color: #e9edf5; background: #101a2b; }
    .video-text { min-width: 0; } .video-text strong { font-size: 12px; font-weight: 550; } #video-detail { overflow-wrap: anywhere; font-size: 11px; color: var(--muted); }
    .status { display: flex; gap: 9px; align-items: flex-start; padding: 0 18px 15px; color: #c5cfde; font-size: 12px; }
    .dot { width: 6px; height: 6px; border-radius: 100%; background: #b4c2d8; margin-top: 6px; flex-shrink: 0; } #status { overflow-wrap: anywhere; }
    .setup { padding: 10px 18px 22px; } .setup > p { margin-top: 5px; margin-bottom: 18px; font-size: 12px; color: var(--muted); }
    #create { width: 100%; } .or { display: flex; align-items: center; gap: 12px; margin: 18px 0; color: var(--muted); font-size: 11px; } .or::before, .or::after { content: ''; flex: 1; border-top: 1px solid var(--subtle); }
    .join-row { display: flex; gap: 7px; } .join-row input { flex: 1; } #join { min-width: 66px; } #code { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; }
    .room { padding: 0 18px 17px; } .room-top { display: flex; align-items: center; justify-content: space-between; margin: 4px 0 10px; }
    .room-top span:last-child { color: var(--muted); font-size: 11px; }
    .participant { display: flex; align-items: center; gap: 10px; padding: 10px 11px; border: 1px solid var(--line); background: #101b2c; border-radius: 8px; margin-bottom: 7px; }
    .avatar { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; border: 1px solid #69758a; font-size: 11px; background: #24334b; }
    .avatar.waiting { background: transparent; border-style: dashed; color: var(--muted); }
    .participant-text { flex: 1; } .participant strong { font-size: 12px; font-weight: 550; } .participant p { font-size: 10px; color: var(--muted); }
    .invite { margin: 14px 0; } .invite-row { display: flex; align-items: center; border: 1px solid var(--line); border-radius: 7px; padding: 2px 4px 2px 10px; margin-top: 7px; gap: 5px; }
    #invite-code { font: 11px ui-monospace, SFMono-Regular, monospace; border: 0; padding: 6px 0; background: transparent; text-overflow: ellipsis; }
    #copy { border: 0; min-height: 30px; font-size: 11px; padding: 5px 7px; flex-shrink: 0; }
    .actions { display: flex; gap: 7px; } #ready { flex: 1; font-size: 12px; } #resync { font-size: 12px; } #ready:disabled { opacity: .7; }
    .chat-area { display: flex; flex-direction: column; flex: 1; min-height: 170px; border-top: 1px solid var(--line); }
    .chat-heading { display: flex; align-items: center; gap: 7px; padding: 13px 18px 9px; color: #d0d8e5; font-size: 12px; }
    .conversation { flex: 1; overflow-y: auto; min-height: 60px; padding: 4px 18px 12px; scrollbar-width: thin; scrollbar-color: #465268 transparent; }
    .empty { min-height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--muted); padding: 16px 0; gap: 6px; }
    .empty svg { margin-bottom: 3px; opacity: .7; } .empty strong { color: #cbd4e3; font-weight: 500; font-size: 12px; } .empty p { font-size: 11px; max-width: 210px; }
    .message { padding: 9px 11px; background: #17253b; border: 1px solid var(--subtle); border-radius: 9px 9px 9px 2px; margin-bottom: 7px; overflow-wrap: anywhere; white-space: pre-wrap; font-size: 12px; }
    .notice { font-size: 10px; text-align: center; color: var(--muted); padding: 7px 0; overflow-wrap: anywhere; }
    #chat { display: flex; align-items: center; margin: 0 14px 12px; padding: 3px 4px 3px 0; border: 1px solid var(--line); border-radius: 9px; background: #101b2c; }
    #message { border: 0; background: transparent; padding: 9px 11px; font-size: 12px; } #send { flex-shrink: 0; min-height: 30px; width: 32px; padding: 6px; border: 0; background: #25344c; }
    .footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 18px; border-top: 1px solid var(--line); flex-shrink: 0; }
    .footer p { font-size: 10px; color: var(--muted); } #leave { padding: 5px 0; min-height: 26px; border: 0; font-size: 11px; color: #e1bfc4; }
    @media (prefers-reduced-motion: reduce) { button { transition: none; } }
  </style>
  <section class="panel" aria-label="Ciltro watch room">
    <header class="header"><div class="brand" aria-hidden="true">c</div><div class="wordmark"><h1>Ciltro</h1><p>A little closer.</p></div><button id="settings-toggle" class="icon" aria-label="Connection settings" aria-expanded="false" aria-controls="settings">${icon('settings')}</button><button id="close" class="icon" aria-label="Close Ciltro panel">${icon('close')}</button></header>
    <div class="body">
      <div id="settings" class="settings" hidden><label for="endpoint">Coordination server</label><input id="endpoint" value="ws://localhost:8787" spellcheck="false" aria-describedby="endpoint-help"><p id="endpoint-help" class="muted small">Local testing only. Separate networks need a hosted secure server.</p></div>
      <div class="video"><div class="service" aria-hidden="true">N</div><div class="video-text"><strong>Netflix</strong><p id="video-detail">Waiting for a video</p></div></div>
      <div class="status"><span class="dot" aria-hidden="true"></span><p id="status" role="status" aria-live="polite">Open a Netflix movie or episode.</p></div>
      <div id="setup" class="setup"><h2>Better together.</h2><p>Start a private room for you and your person.</p><button id="create" class="primary">${icon('people')}<span id="create-label">Create a room</span></button><div class="or">or join your partner</div><form id="join-form"><label for="code">Room code</label><div class="join-row"><input id="code" placeholder="Paste an invitation code" autocomplete="off" spellcheck="false"><button id="join" type="submit">Join ${icon('arrow', 15)}</button></div></form></div>
      <div id="room" class="room" hidden>
        <div class="room-top"><span class="eyebrow">Your room</span><span id="member-count">1 of 2 here</span></div>
        <div class="participant"><div class="avatar" aria-hidden="true">Y</div><div class="participant-text"><strong>You</strong><p id="you-status">Not following playback yet</p></div></div>
        <div class="participant"><div id="partner-avatar" class="avatar waiting" aria-hidden="true">?</div><div class="participant-text"><strong>Your partner</strong><p id="partner-status">Waiting to join</p></div></div>
        <div class="invite"><label for="invite-code" class="eyebrow">Invite your partner</label><div class="invite-row"><input id="invite-code" readonly aria-label="Your invitation code"><button id="copy" aria-label="Copy invitation code">${icon('copy', 14)}<span id="copy-label">Copy</span></button></div></div>
        <div class="actions"><button id="ready" class="primary">${icon('play', 15)}<span id="ready-label">Join playback</span></button><button id="resync" title="Follow the room’s accepted playback position">${icon('resync', 15)}Resync</button></div>
      </div>
    </div>
    <div id="chat-area" class="chat-area" hidden><div class="chat-heading">${icon('chat', 15)}<span>Conversation</span></div><div id="conversation" class="conversation"><div id="empty-chat" class="empty">${icon('chat', 25)}<strong>Make yourself at home.</strong><p>Send a message while you watch together.</p></div><div id="log" role="log" aria-label="Room messages" aria-live="polite" aria-relevant="additions"></div></div><form id="chat"><label for="message" hidden>Message your partner</label><input id="message" placeholder="Say something…" maxlength="1000" autocomplete="off"><button id="send" type="submit" aria-label="Send message">${icon('send', 17)}</button></form></div>
    <footer class="footer"><p>Preview · Voice & video coming later</p><button id="leave" hidden>${icon('leave', 14)}Leave room</button></footer>
  </section>`;
})();
