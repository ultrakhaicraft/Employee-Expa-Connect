// WebRTC Configuration for video/audio calls
// Optimized for faster connection establishment and reduced latency
// Using primary STUN servers for faster discovery

export const rtcConfiguration: RTCConfiguration = {
  iceServers: [
    // Google STUN servers (primary - fastest and most reliable)
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302'
      ]
    },
    // Fallback STUN server for redundancy
    {
      urls: 'stun:stun.stunprotocol.org:3478'
    },
    // TURN server can be added here if needed for complex NAT/firewall
    // Note: TURN servers require credentials and may have costs
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'your-username',
    //   credential: 'your-password'
    // }
  ],
  // Reduced pool size for faster initial ICE candidate gathering
  // Smaller pool = faster initial connection, still sufficient for most cases
  iceCandidatePoolSize: 10,
  // Enable RTCP muxing for better performance
  rtcpMuxPolicy: 'require',
  // Bundle policy for faster negotiation
  bundlePolicy: 'max-bundle',
  // Use all transport types (host, srflx, relay) for best connectivity
  iceTransportPolicy: 'all'
};

