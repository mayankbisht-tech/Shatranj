import Peer from "simple-peer";

export class WebRTCManager {
  private localStream: MediaStream | null = null;
  private peers: Map<string, Peer.Instance> = new Map();

  constructor(private socket: any) {}

  async initializeMedia(video: boolean = true, audio: boolean = true) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video,
        audio,
      });
      return this.localStream;
    } catch (err) {
      console.error("Error accessing media devices.", err);
      throw err;
    }
  }

  getLocalStream() {
    return this.localStream;
  }

  createPeer(peerId: string, initiator: boolean) {
    if (!this.localStream) {
      throw new Error("Local media stream not initialized.");
    }

    const peer = new Peer({
      initiator,
      trickle: false,
      stream: this.localStream,
    });

    peer.on("stream", (remoteStream: MediaStream) => {
      console.log("Received remote stream from peer:", peerId);

      document.dispatchEvent(
        new CustomEvent("webrtc-remote-stream", {
          detail: { peerId, remoteStream },
        })
      );
    });

    peer.on("error", (err: any) => {
      console.error("Peer error:", err);
    });

    this.peers.set(peerId, peer);
    return peer;
  }
  handleIncomingSignal(fromId: string, signal: any) {
    let peer = this.peers.get(fromId);

    if (!peer) {
      console.warn("Peer not found for signal, creating one...");
      peer = this.createPeer(fromId, false);
    }

    peer.signal(signal);
  }

  toggleVideo() {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;
    return videoTrack.enabled;
  }

  toggleAudio() {
    if (!this.localStream) return;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    return audioTrack.enabled;
  }

  async switchToAudioOnly() {
    if (!this.localStream) return;

    const videoTracks = this.localStream.getVideoTracks();

    videoTracks.forEach((track: MediaStreamTrack) => {
      track.stop();
      this.localStream?.removeTrack(track);
    });

    for (const peer of this.peers.values()) {
      const oldVideoTrack = videoTracks[0];
      if (oldVideoTrack) {
        peer.replaceTrack(oldVideoTrack, null as any, this.localStream);
      }
    }
  }

  closePeer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.destroy();
      this.peers.delete(peerId);
    }
  }

  closeAll() {
    this.peers.forEach((peer: Peer.Instance) => peer.destroy());
    this.peers.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      this.localStream = null;
    }
  }
}

export const webRTCManager = new WebRTCManager(null);
