(() => {
  globalThis.CiltroCall = class {
    constructor({root, send, inRoom}) {
      this.$ = id => root.getElementById(id);
      this.send = send; this.inRoom = inRoom;
      this.stream = new MediaStream(); this.remoteStream = new MediaStream();
      this.active = false; this.busy = false; this.generation = 0; this.queue = Promise.resolve();
      this.$('local-video').srcObject = this.stream;
      this.$('remote-video').srcObject = this.remoteStream;
      this.$('join-voice').onclick = () => void this.start(false);
      this.$('join-video').onclick = () => void this.start(true);
      this.$('toggle-microphone').onclick = () => void this.toggle('audio');
      this.$('toggle-camera').onclick = () => void this.toggle('video');
      this.$('end-call').onclick = () => this.stop('Call ended. Camera and microphone are off.', true);
      this.$('enable-sound').onclick = () => void this.playRemote();
      this.note('Join voice or video when you’re ready.');
      this.render();
    }
    track(kind) { return this.stream.getTracks().find(track => track.kind === kind && track.readyState === 'live'); }
    note(text) { this.$('call-status').textContent = text; }
    render() {
      const microphone = !!this.track('audio'), camera = !!this.track('video');
      this.$('call-start').hidden = this.active || this.busy;
      this.$('call-controls').hidden = !this.active && !this.busy;
      this.$('join-voice').disabled = !this.inRoom(); this.$('join-video').disabled = !this.inRoom();
      for (const id of ['toggle-microphone', 'toggle-camera']) this.$(id).disabled = this.busy || !this.active;
      this.$('toggle-microphone').setAttribute('aria-pressed', String(microphone));
      this.$('toggle-camera').setAttribute('aria-pressed', String(camera));
      this.$('microphone-label').textContent = microphone ? 'Mute mic' : 'Unmute mic';
      this.$('camera-label').textContent = camera ? 'Camera off' : 'Camera on';
      this.$('local-placeholder').hidden = camera;
      this.$('local-media-status').textContent = microphone ? 'Mic on' : 'Mic off';
      const connected = this.pc?.connectionState === 'connected';
      this.$('remote-placeholder').hidden = !!(connected && this.partner?.camera && this.remoteStream.getVideoTracks().some(t => t.readyState === 'live'));
      this.$('remote-placeholder-label').textContent = this.partner?.camera && !connected ? 'Connecting…' : 'Partner’s camera off';
      this.$('remote-media-status').textContent = !this.partner?.joined ? 'Not in call' : this.partner.microphone ? 'Mic on' : 'Mic off';
    }
    async capture(constraints, generation) {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera and microphone require a secure page and a supported browser.');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (generation !== this.generation || !this.inRoom()) { stream.getTracks().forEach(track => track.stop()); return false; }
      for (const track of stream.getTracks()) {
        this.stream.addTrack(track);
        track.onended = () => {
          if (!this.active) return;
          this.stream.removeTrack(track);
          void this.senders?.[track.kind]?.replaceTrack(null);
          this.publish(); this.render(); this.note(`${track.kind === 'video' ? 'Camera' : 'Microphone'} stopped. Use its control to try again.`);
        };
      }
      void this.$('local-video').play().catch(() => {});
      return true;
    }
    mediaError(error) {
      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return 'Access blocked. Allow camera/microphone for Netflix in Chrome site settings, then try again. A page policy may also block capture.';
      if (error.name === 'NotFoundError') return 'No camera or microphone found. Connect a device and try again.';
      if (error.name === 'NotReadableError') return 'Your camera or microphone is busy. Close other apps using it and try again.';
      return error.message || 'Could not start the call. Try again.';
    }
    async start(camera) {
      if (!this.inRoom() || this.active || this.busy) return;
      this.busy = true; this.lastError = null; const generation = ++this.generation;
      this.note('Allow device access in Chrome to join the call.'); this.render();
      try {
        if (!await this.capture({audio: {echoCancellation: true, noiseSuppression: true}, video: camera ? {width: {ideal: 640}, height: {ideal: 360}, frameRate: {ideal: 24, max: 30}} : false}, generation)) return;
        this.active = true;
        this.send({type: 'call-join', microphone: !!this.track('audio'), camera: !!this.track('video')});
        this.note('Waiting for your partner to join the call.');
      } catch (error) { if (generation === this.generation) this.stop(this.mediaError(error)); }
      finally { if (generation === this.generation) { this.busy = false; this.render(); } }
    }
    publish() {
      if (this.active && this.inRoom()) this.send({type: 'call-state', microphone: !!this.track('audio'), camera: !!this.track('video')});
    }
    async toggle(kind) {
      if (!this.active || this.busy) return;
      const generation = this.generation;
      this.busy = true; this.render();
      try {
        const track = this.track(kind);
        if (track) {
          // Release the physical device, including on camera-off and microphone mute.
          track.stop(); this.stream.removeTrack(track);
          await this.senders?.[kind]?.replaceTrack(null);
        } else {
          const constraints = kind === 'audio' ? {audio: {echoCancellation: true, noiseSuppression: true}} : {video: {width: {ideal: 640}, height: {ideal: 360}, frameRate: {ideal: 24, max: 30}}};
          if (!await this.capture(constraints, generation)) return;
          await this.senders?.[kind]?.replaceTrack(this.track(kind));
        }
        if (generation === this.generation) this.publish();
      } catch (error) { if (generation === this.generation) this.note(this.mediaError(error)); }
      finally { if (generation === this.generation) { this.busy = false; this.render(); } }
    }
    presence(partner) { this.partner = partner?.media; this.render(); }
    async playRemote() {
      try { await this.$('remote-video').play(); this.$('enable-sound').hidden = true; }
      catch { this.$('enable-sound').hidden = false; this.note('Chrome blocked call audio. Click Enable sound.'); }
    }
    resetPeer() {
      clearTimeout(this.connectionTimer);
      if (this.pc) { this.pc.onconnectionstatechange = null; this.pc.onicecandidate = null; this.pc.ontrack = null; this.pc.close(); }
      this.pc = null; this.callId = null; this.senders = null; this.candidates = [];
      this.remoteStream.getTracks().forEach(track => track.stop()); this.remoteStream = new MediaStream();
      this.$('remote-video').srcObject = this.remoteStream;
      this.$('enable-sound').hidden = true;
    }
    stop(message = 'Camera and microphone are off.', notify = false) {
      const wasActive = this.active;
      ++this.generation; this.active = false; this.busy = false;
      this.resetPeer();
      this.stream.getTracks().forEach(track => { track.stop(); this.stream.removeTrack(track); });
      if (notify && wasActive && this.inRoom()) this.send({type: 'call-leave'});
      this.note(message); this.render();
    }
    fail(message) { this.lastError = message; this.stop(message, true); }
    handle(m) {
      const generation = this.generation;
      this.queue = this.queue.then(() => {
        if (generation === this.generation) return this.receive(m);
      }).catch(() => {
        if (generation === this.generation) this.fail('Call connection failed. Try joining again; this network may need a TURN relay.');
      });
      return this.queue;
    }
    async receive(m) {
      if (m.type === 'call-ended') { this.stop(this.lastError || m.reason); return; }
      if (!this.active) return;
      if (m.type === 'call-start') {
        this.resetPeer(); this.callId = m.callId;
        const pc = this.pc = new RTCPeerConnection({iceServers: m.iceServers});
        this.candidates = []; this.senders = {};
        if (m.offerer) {
          for (const kind of ['audio', 'video']) {
            this.senders[kind] = pc.addTransceiver(kind, {direction: 'sendrecv', streams: [this.stream]}).sender;
            await this.senders[kind].replaceTrack(this.track(kind) || null);
            if (this.pc !== pc) return;
          }
        }
        pc.onicecandidate = event => { if (event.candidate && this.pc === pc) this.send({type: 'signal', callId: m.callId, signal: {candidate: event.candidate.toJSON()}}); };
        pc.ontrack = event => {
          this.remoteStream.addTrack(event.track);
          event.track.onunmute = () => { void this.playRemote(); this.render(); };
          void this.playRemote(); this.render();
        };
        pc.onconnectionstatechange = () => {
          if (this.pc !== pc) return;
          if (pc.connectionState === 'connected') { clearTimeout(this.connectionTimer); this.note('Call connected.'); }
          if (pc.connectionState === 'disconnected') {
            this.note('Call connection interrupted. Reconnecting…');
            clearTimeout(this.connectionTimer);
            this.connectionTimer = setTimeout(() => { if (this.pc === pc && pc.connectionState !== 'connected') this.fail('Call disconnected. Join again to retry.'); }, 12000);
          }
          if (pc.connectionState === 'failed') this.fail('Could not connect the call. This network may need a TURN relay.');
          this.render();
        };
        this.note('Connecting your call…');
        this.connectionTimer = setTimeout(() => {
          if (this.pc === pc && pc.connectionState !== 'connected') this.fail('Could not connect the call. Check the server and relay configuration, then join again.');
        }, 25000);
        // A single server-selected offerer avoids simultaneous-offer collisions.
        if (m.offerer) {
          await pc.setLocalDescription(await pc.createOffer());
          if (this.pc === pc) this.send({type: 'signal', callId: m.callId, signal: {description: {type: pc.localDescription.type, sdp: pc.localDescription.sdp}}});
        }
      } else if (m.type === 'signal' && this.pc && m.callId === this.callId) {
        const pc = this.pc;
        if (m.signal.description) {
          await pc.setRemoteDescription(m.signal.description);
          if (this.pc !== pc) return;
          for (const candidate of this.candidates.splice(0)) await pc.addIceCandidate(candidate);
          if (m.signal.description.type === 'offer') {
            // Reuse the offered media sections rather than pre-creating extra transceivers.
            for (const transceiver of pc.getTransceivers()) {
              const kind = transceiver.receiver.track.kind;
              transceiver.direction = 'sendrecv';
              transceiver.sender.setStreams(this.stream);
              this.senders[kind] = transceiver.sender;
              await transceiver.sender.replaceTrack(this.track(kind) || null);
              if (this.pc !== pc) return;
            }
            await pc.setLocalDescription(await pc.createAnswer());
            if (this.pc === pc) this.send({type: 'signal', callId: m.callId, signal: {description: {type: pc.localDescription.type, sdp: pc.localDescription.sdp}}});
          }
        } else if (m.signal.candidate) {
          if (pc.remoteDescription) await pc.addIceCandidate(m.signal.candidate);
          else this.candidates.push(m.signal.candidate);
        }
      }
    }
  };
})();
