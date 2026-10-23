(() => {
  // Service adapters own page recognition and player access. Room code stays service-independent.
  const netflix = {
    id: 'netflix',
    identify() {
      const match = location.hostname === 'www.netflix.com' && location.pathname.match(/^\/watch\/(\d+)/);
      return match ? `netflix:${match[1]}` : null;
    },
    player() { return document.querySelector('video'); },
    read(player) { return {position: player.currentTime, playing: !player.paused}; },
    async apply(player, state) {
      if (Math.abs(player.currentTime - state.position) > 0.75) player.currentTime = state.position;
      if (state.playing) await player.play(); else player.pause();
    }
  };
  globalThis.ciltroServices = [netflix];
})();
