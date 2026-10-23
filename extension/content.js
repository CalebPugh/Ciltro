(() => {
  if (globalThis.__ciltro) return;
  globalThis.__ciltro = true;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;right:12px;top:12px;bottom:12px;width:min(340px, calc(100vw - 24px));z-index:2147483647;display:none;color-scheme:dark';
  document.documentElement.append(host);
  const root = host.attachShadow({mode: 'closed'});
  root.innerHTML = globalThis.ciltroPanel;
  const $ = id => root.getElementById(id);
  let ws, code, ready = false, suppressUntil = 0, video, contentId, lastSequence = 0, members = [];
  let connecting = false;
  const status = text => { $('status').textContent = text; };
  function render() {
    const inRoom = !!code;
    $('setup').hidden = inRoom; $('room').hidden = !inRoom;
    $('chat-area').hidden = !inRoom; $('leave').hidden = !inRoom;
    $('create').disabled = !contentId || !video || inRoom || connecting;
    $('join').disabled = !contentId || !video || inRoom || connecting;
    $('create-label').textContent = connecting ? 'Connecting…' : 'Create a room';
    $('endpoint').disabled = inRoom || connecting;
    if ($('invite-code').value !== (code || '')) $('invite-code').value = code || '';
    $('member-count').textContent = `${members.length || 1} of 2 here`;
    $('you-status').textContent = ready ? 'Joined playback' : 'Not following playback yet';
    const partner = members.length > 1;
    $('partner-status').textContent = !partner ? 'Waiting to join' : members.some(p => p.video !== contentId) ? 'Different video open' : members.every(p => p.ready) ? 'Joined playback' : 'In the room';
    $('partner-avatar').classList.toggle('waiting', !partner);
    $('partner-avatar').textContent = partner ? 'P' : '?';
    $('ready').disabled = ready || !video;
    $('ready-label').textContent = ready ? 'Playback joined' : 'Join playback';
    $('resync').disabled = !eligible();
    $('video-detail').textContent = contentId && video ? `Video ${contentId.split(':')[1]}` : 'Open a movie or episode';
  }
  const log = (text, kind = 'message') => {
    const line = document.createElement('div'); line.className = kind; line.textContent = text;
    const conversation = $('conversation');
    const nearBottom = conversation.scrollHeight - conversation.scrollTop - conversation.clientHeight < 60;
    $('empty-chat').hidden = true; $('log').append(line);
    while ($('log').children.length > 40) $('log').firstChild.remove();
    if (nearBottom) conversation.scrollTop = conversation.scrollHeight;
  };
  const service = globalThis.ciltroServices.find(adapter => adapter.id === 'netflix');
  const identify = () => service.identify();
  const send = data => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); else status('Disconnected — watching independently.'); };
  const eligible = () => ready && members.length === 2 && members.every(p => p.ready && p.video === contentId);
  async function apply(state) {
    if (!state || !video || !ready || !eligible() || state.sequence < lastSequence) return;
    lastSequence = state.sequence; suppressUntil = Date.now() + 1000;
    try {
      // Resync uses the accepted position. Clock-offset and latency correction are pending.
      await service.apply(video, state);
      status(state.playing ? 'Shared play requested — verify both players.' : 'Paused together.');
    } catch { ready = false; send({type: 'ready', ready: false, video: contentId}); status('Playback blocked. Use Netflix’s play button, then Join playback.'); render(); }
  }
  function connect(type) {
    if (!contentId || !video) return status('Open a Netflix video before connecting.');
    if (code || ws?.readyState === WebSocket.CONNECTING) return;
    let url; try { url = new URL($('endpoint').value); if (!['ws:', 'wss:'].includes(url.protocol) || (url.protocol === 'ws:' && !['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error(); } catch { return status('Use wss:// for a hosted server, or ws://localhost:8787 locally.'); }
    connecting = true; render(); status('Connecting to your room…');
    let closeMessage = null;
    try { ws = new WebSocket(url); } catch { connecting = false; render(); return status('Could not open the connection. Check Connection settings.'); }
    const socket = ws;
    ws.onopen = () => { if (ws === socket) send({type, code: $('code').value.trim(), video: contentId}); };
    ws.onmessage = event => {
      if (ws !== socket) return;
      let m; try { m = JSON.parse(event.data); } catch { return; }
      if (m.type === 'joined') { connecting = false; code = m.code; $('code').value = code; lastSequence = 0; $('log').replaceChildren(); $('empty-chat').hidden = false; $('settings').hidden = true; $('settings-toggle').setAttribute('aria-expanded', 'false'); status('Room joined. Both people must select Join playback.'); }
      if (m.type === 'presence') { members = m.members; status(members.length < 2 ? 'Waiting for partner.' : members.some(p => p.video !== contentId) ? 'Open the same Netflix video.' : eligible() ? 'Both ready for shared controls.' : 'Waiting for both people to join playback.'); }
      if (m.type === 'playback') { if (m.state) void apply(m.state); else status('No shared playback position yet. Both join playback, then use Netflix’s controls.'); }
      if (m.type === 'error') { connecting = false; status(m.message); if (!code) { closeMessage = m.message; ws.close(); } }
      if (m.type === 'chat') log(m.text);
      render();
    };
    ws.onclose = () => { if (ws !== socket) return; connecting = false; ready = false; code = null; members = []; status(closeMessage || 'Disconnected — watching independently. Rejoin using the code.'); render(); };
    ws.onerror = () => { if (ws !== socket) return; closeMessage = 'Could not reach the server. Check Connection settings.'; connecting = false; status(closeMessage); render(); };
  }
  const act = action => { if (eligible() && Date.now() > suppressUntil && !video.seeking) send({type: 'action', action, position: video.currentTime, playing: !video.paused}); };
  function detect() {
    const next = identify(), player = service.player();
    if (next !== contentId || player !== video) {
      if (ready) { ready = false; send({type: 'ready', ready: false, video: next}); }
      if (video) for (const name of ['play', 'pause', 'seeked']) video.removeEventListener(name, onControl);
      contentId = next; video = player;
      if (video) for (const name of ['play', 'pause', 'seeked']) video.addEventListener(name, onControl);
      status(next && player ? `Video detected (${next}). Create or join a room.` : 'Open a Netflix video.');
    }
    render();
  }
  function onControl(event) { act(event.type === 'seeked' ? 'seek' : event.type); }
  $('close').onclick = () => { host.style.display = 'none'; };
  $('create').onclick = () => connect('create');
  $('join-form').onsubmit = event => { event.preventDefault(); if (!$('code').value.trim()) { status('Paste a room code to join your partner.'); $('code').focus(); return; } connect('join'); };
  $('settings-toggle').onclick = () => { const open = $('settings').hidden; $('settings').hidden = !open; $('settings-toggle').setAttribute('aria-expanded', String(open)); if (open) $('endpoint').focus(); };
  // Keep typing and button shortcuts inside the panel from controlling Netflix.
  host.addEventListener('keydown', event => event.stopPropagation());
  host.addEventListener('keyup', event => event.stopPropagation());
  $('copy').onclick = async () => { try { await navigator.clipboard.writeText(code); $('copy-label').textContent = 'Copied'; setTimeout(() => { $('copy-label').textContent = 'Copy'; }, 2000); } catch { $('invite-code').focus(); $('invite-code').select(); status('Select and copy the code manually.'); } };
  $('ready').onclick = () => { if (!code || !video) return status('Join a room first.'); ready = true; send({type: 'ready', ready: true, video: contentId}); render(); };
  $('resync').onclick = () => send({type: 'resync'});
  $('leave').onclick = () => { ready = false; send({type: 'leave'}); ws?.close(); ws = null; code = null; members = []; lastSequence = 0; status('You left the room. Your Netflix playback is unchanged.'); render(); };
  $('chat').onsubmit = event => { event.preventDefault(); if (!code) return status('Join a room first.'); send({type: 'chat', text: $('message').value}); $('message').value = ''; };
  chrome.runtime.onMessage.addListener(m => { if (m.type === 'ciltro:toggle') { host.style.display = host.style.display === 'none' ? 'block' : 'none'; detect(); } });
  setInterval(detect, 1500); detect();
})();
