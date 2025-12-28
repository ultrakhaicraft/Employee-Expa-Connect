import React, { useEffect, useRef, useState } from 'react';
import { Video, Mic, MicOff, VideoOff, PhoneOff, Phone } from 'lucide-react';
import { Button } from '../ui/button';

interface VideoCallModalProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isIncomingCall: boolean;
  callerInfo: { userId: string; userName: string } | null;
  onAnswer: () => void;
  onReject: () => void;
  onEnd: () => void;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  localStream,
  remoteStream,
  isIncomingCall,
  callerInfo,
  onAnswer,
  onReject,
  onEnd,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0); // Duration in seconds
  const callStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    return () => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    };
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      if (remoteStream) {
        console.log('🎥 Setting remote stream to video element:', remoteStream);
        console.log('🎥 Stream ID:', remoteStream.id);
        console.log('🎥 Stream tracks:', remoteStream.getTracks().map(t => ({ 
          kind: t.kind, 
          enabled: t.enabled, 
          readyState: t.readyState,
          label: t.label
        })));
        remoteVideoRef.current.srcObject = remoteStream;
        // Force play
        remoteVideoRef.current.play().catch(err => {
          console.error('❌ Error playing remote video:', err);
        });
      } else {
        console.log('🎥 No remote stream, clearing video element');
        remoteVideoRef.current.srcObject = null;
      }
    }
    return () => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };
  }, [remoteStream]);

  // Timer for call duration - only start when remote stream is available (call is answered)
  useEffect(() => {
    // Start timer only when call is active AND remote stream is available (bên kia đã bắt máy)
    if (!isIncomingCall && remoteStream) {
      if (callStartTimeRef.current === null) {
        callStartTimeRef.current = Date.now();
        console.log('⏱️ Call timer started - remote stream connected');
      }

      const interval = setInterval(() => {
        if (callStartTimeRef.current) {
          const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
          setCallDuration(elapsed);
        }
      }, 1000);

      return () => {
        clearInterval(interval);
      };
    } else {
      // Reset timer when incoming call, no remote stream, or call ends
      if (callStartTimeRef.current !== null) {
        console.log('⏱️ Call timer stopped');
      }
      callStartTimeRef.current = null;
      setCallDuration(0);
    }
  }, [isIncomingCall, remoteStream]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleToggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Incoming call screen
  if (isIncomingCall) {
    return (
      <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-md w-full mx-4">
          <div className="mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 mx-auto flex items-center justify-center mb-4">
              <Video className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Incoming Video Call</h2>
            <p className="text-lg text-gray-600">{callerInfo?.userName || 'Unknown'} is calling...</p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={onReject} 
              variant="destructive" 
              size="lg"
              className="rounded-full w-16 h-16 p-0"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
            <Button 
              onClick={onAnswer} 
              size="lg" 
              className="bg-green-600 hover:bg-green-700 rounded-full w-16 h-16 p-0"
            >
              <Phone className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Active call screen
  return (
    <div className="fixed inset-0 bg-black z-[9999]">
      {/* Remote video (full screen) */}
      {remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          onLoadedMetadata={() => {
            console.log('✅ Remote video metadata loaded');
            remoteVideoRef.current?.play().catch(err => {
              console.error('❌ Error auto-playing remote video:', err);
            });
          }}
          onLoadedData={() => {
            console.log('✅ Remote video data loaded');
          }}
          onCanPlay={() => {
            console.log('✅ Remote video can play');
          }}
          onError={(e) => {
            console.error('❌ Remote video error:', e);
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto flex items-center justify-center mb-4">
              <Video className="w-16 h-16 text-white" />
            </div>
            <p className="text-white text-lg">Waiting for video...</p>
            <p className="text-gray-400 text-sm mt-2">Connecting to {callerInfo?.userName || 'user'}...</p>
          </div>
        </div>
      )}

      {/* Local video (picture-in-picture) */}
      <div className="absolute top-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white shadow-2xl bg-black">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {isVideoOff && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <VideoOff className="w-8 h-8 text-white" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
        <Button
          onClick={handleToggleMute}
          size="lg"
          variant="secondary"
          className="rounded-full w-14 h-14 p-0 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30"
        >
          {isMuted ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </Button>
        <Button
          onClick={handleToggleVideo}
          size="lg"
          variant="secondary"
          className="rounded-full w-14 h-14 p-0 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30"
        >
          {isVideoOff ? (
            <VideoOff className="w-6 h-6 text-white" />
          ) : (
            <Video className="w-6 h-6 text-white" />
          )}
        </Button>
        <Button
          onClick={onEnd}
          size="lg"
          variant="destructive"
          className="rounded-full w-14 h-14 p-0"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>

      {/* Call info overlay */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
        <p className="text-white font-medium">{callerInfo?.userName || (remoteStream ? 'Connected' : 'Call in progress')}</p>
        {remoteStream ? (
          <p className="text-white/80 text-sm font-mono">{formatDuration(callDuration)}</p>
        ) : (
          <p className="text-white/60 text-xs">Connecting...</p>
        )}
      </div>
    </div>
  );
};

