import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Phone } from 'lucide-react';
import { Button } from '../ui/button';

interface AudioCallModalProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isIncomingCall: boolean;
  callerInfo: { userId: string; userName: string } | null;
  onAnswer: () => void;
  onReject: () => void;
  onEnd: () => void;
}

export const AudioCallModal: React.FC<AudioCallModalProps> = ({
  localStream,
  remoteStream,
  isIncomingCall,
  callerInfo,
  onAnswer,
  onReject,
  onEnd,
}) => {
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0); // Duration in seconds
  const callStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (localAudioRef.current && localStream) {
      localAudioRef.current.srcObject = localStream;
      // Mute local audio to prevent echo
      localAudioRef.current.volume = 0;
    }
    return () => {
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = null;
      }
    };
  }, [localStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.volume = 1;
    }
    return () => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
    };
  }, [remoteStream]);

  const handleToggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Timer for call duration - only start when remote stream is available (call is answered)
  useEffect(() => {
    // Start timer only when call is active AND remote stream is available (bên kia đã bắt máy)
    if (!isIncomingCall && remoteStream) {
      if (callStartTimeRef.current === null) {
        callStartTimeRef.current = Date.now();
        console.log('⏱️ Call timer started - remote stream connected (audio)');
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
        console.log('⏱️ Call timer stopped (audio)');
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

  // Incoming call screen
  if (isIncomingCall) {
    return (
      <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-md w-full mx-4">
          <div className="mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto flex items-center justify-center mb-4">
              <Phone className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Incoming Call</h2>
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
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 z-[9999] flex items-center justify-center">
      {/* Hidden audio elements */}
      <audio ref={localAudioRef} autoPlay playsInline muted />
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Call UI */}
      <div className="text-center">
        {/* Avatar/Icon */}
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto flex items-center justify-center mb-6 shadow-2xl ring-4 ring-white/20">
          <Phone className="w-16 h-16 text-white" />
        </div>

        {/* Caller Name */}
        <h2 className="text-3xl font-bold text-white mb-2">
          {callerInfo?.userName || (remoteStream ? 'Connected' : 'Call in progress')}
        </h2>
        {remoteStream ? (
          <>
            <p className="text-blue-200 text-lg mb-2">
              {isMuted ? 'Muted' : 'Connected'}
            </p>
            <p className="text-blue-300 text-xl font-mono font-semibold mb-8">
              {formatDuration(callDuration)}
            </p>
          </>
        ) : (
          <p className="text-blue-200 text-lg mb-8">
            {isMuted ? 'Muted' : 'Calling...'}
          </p>
        )}

        {/* Controls */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={handleToggleMute}
            size="lg"
            variant="secondary"
            className="rounded-full w-16 h-16 p-0 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30"
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </Button>
          <Button
            onClick={onEnd}
            size="lg"
            variant="destructive"
            className="rounded-full w-16 h-16 p-0"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

