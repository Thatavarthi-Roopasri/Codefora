import { useCallback, useEffect, useRef, useState } from 'react';
import { socket } from '../lib/socket';

export function useWarVoice(roomId, enabled, team = '') {
  const [micOn, setMicOn] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState([]);
  const stream = useRef(null);
  const peers = useRef(new Map());
  const generation = useRef(0);
  const closePeer = useCallback(id => {
    const peer = peers.current.get(id);
    if (!peer) return;
    peer.pc.close();
    peer.audio.srcObject = null;
    peer.audio.remove();
    peers.current.delete(id);
  }, []);
  const stop = useCallback(() => {
    generation.current++;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    [...peers.current.keys()].forEach(closePeer);
    socket.emit('war:voice:leave');
    setMicOn(false);
    setPending(false);
    setMembers([]);
  }, [closePeer]);

  useEffect(() => {
    if (!roomId || !enabled) { stop(); return undefined; }
    function peerFor(id) {
      if (peers.current.has(id)) return peers.current.get(id);
      // Deployments can provide their own TURN credentials through this JSON setting.
      let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
      try { if (import.meta.env.VITE_WEBRTC_ICE_SERVERS) iceServers = JSON.parse(import.meta.env.VITE_WEBRTC_ICE_SERVERS); } catch { /* retain STUN fallback */ }
      const pc = new RTCPeerConnection({ iceServers });
      const audio = document.createElement('audio');
      audio.autoplay = true;
      document.body.appendChild(audio);
      const peer = { pc, audio, candidates: [] };
      peers.current.set(id, peer);
      stream.current?.getTracks().forEach(track => pc.addTrack(track, stream.current));
      pc.onicecandidate = event => { if (event.candidate) socket.emit('war:voice:signal', { target: id, signal: { candidate: event.candidate.toJSON() } }); };
      pc.ontrack = event => { audio.srcObject = event.streams[0]; audio.play().catch(() => setError('Browser blocked audio playback. Turn the mic off and on to retry.')); };
      pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') { closePeer(id); setError('Voice connection failed. Retry the mic; some networks require a TURN relay.'); } };
      return peer;
    }
    async function onPeers(payload) {
      if (!stream.current || payload.roomId !== roomId || (payload.team && payload.team !== team)) return;
      setMembers(payload.peers);
      const ids = new Set(payload.peers.map(peer => peer.id).filter(id => id !== socket.id));
      [...peers.current.keys()].filter(id => !ids.has(id)).forEach(closePeer);
      for (const id of ids) {
        if (peers.current.has(id)) continue;
        const { pc } = peerFor(id);
        if (socket.id < id) {
          try {
            await pc.setLocalDescription(await pc.createOffer());
            socket.emit('war:voice:signal', { target: id, signal: { description: pc.localDescription } });
          } catch { if (stream.current) setError('Could not connect team audio. Retry the mic.'); }
        }
      }
    }
    async function onSignal({ from, signal, team: signalTeam }) {
      if (!stream.current || (signalTeam && signalTeam !== team)) return;
      try {
        const peer = peerFor(from);
        if (signal.description) {
          await peer.pc.setRemoteDescription(signal.description);
          for (const candidate of peer.candidates.splice(0)) await peer.pc.addIceCandidate(candidate);
          if (signal.description.type === 'offer') {
            await peer.pc.setLocalDescription(await peer.pc.createAnswer());
            socket.emit('war:voice:signal', { target: from, signal: { description: peer.pc.localDescription } });
          }
        } else if (signal.candidate) {
          if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(signal.candidate);
          else peer.candidates.push(signal.candidate);
        }
      } catch { if (stream.current) setError('Could not connect team audio. Retry the mic.'); }
    }
    socket.on('war:voice:peers', onPeers);
    socket.on('war:voice:signal', onSignal);
    socket.on('disconnect', stop);
    return () => {
      socket.off('war:voice:peers', onPeers);
      socket.off('war:voice:signal', onSignal);
      socket.off('disconnect', stop);
      stop();
    };
  }, [roomId, enabled, team, closePeer, stop]);

  async function toggle() {
    if (micOn) { stop(); return; }
    if (!enabled || pending) return;
    const current = ++generation.current;
    setPending(true); setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone requires HTTPS or localhost.');
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (current !== generation.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      const reply = await socket.timeout(5000).emitWithAck('war:voice:join', { roomId });
      if (current !== generation.current) return;
      if (reply.error) throw new Error(reply.error);
      media.getTracks().forEach(track => { track.onended = stop; });
      setMicOn(true);
    } catch (failure) {
      if (current === generation.current) { stop(); setError(failure.name === 'NotAllowedError' ? 'Allow microphone access in your browser, then try again.' : failure.message || 'Could not start the microphone.'); }
    } finally { if (current === generation.current) setPending(false); }
  }
  return { micOn, pending, error, members, toggle };
}
