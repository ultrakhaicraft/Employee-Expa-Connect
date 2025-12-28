import { useState, useRef, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { rtcConfiguration } from '../../utils/webrtcConfig';
import { conversationSignalRService } from '../../services/conversationSignalRService';
import { toast } from 'sonner';

interface UseVideoCallOptions {
  conversationId: string;
  otherUserId: string;
  otherUserName?: string;
}

export const useVideoCall = ({ conversationId, otherUserId, otherUserName }: UseVideoCallOptions) => {
  const [isCalling, setIsCalling] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [callerInfo, setCallerInfo] = useState<{ userId: string; userName: string } | null>(null);
  const [remoteStreamState, setRemoteStreamState] = useState<MediaStream | null>(null); // Force re-render when stream changes
  const pendingOfferRef = useRef<{ offer: RTCSessionDescriptionInit; fromUserId: string } | null>(null); // Store offer if it arrives before peer connection is ready
  const pendingIceCandidatesRef = useRef<Array<{ candidate: RTCIceCandidateInit; fromUserId: string }>>([]); // Store ICE candidates if they arrive before peer connection is ready
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const isCallerRef = useRef(false);
  const hasEndedRef = useRef(false); // Flag to prevent multiple end calls
  const isInCallRef = useRef(false); // Track call state with ref to avoid stale closures
  const isCallingRef = useRef(false);
  const isIncomingCallRef = useRef(false);
  const lastEndCallTimeRef = useRef<number>(0); // Track last end call time for debouncing
  const disconnectedTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timeout for disconnected state
  const isProcessingAnswerRef = useRef(false); // Flag to track if we're processing an answer
  
  const currentUserId = useSelector((state: any) => 
    state.auth?.decodedToken?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
  );

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear disconnected timeout
    if (disconnectedTimeoutRef.current) {
      clearTimeout(disconnectedTimeoutRef.current);
      disconnectedTimeoutRef.current = null;
    }
    
    // Stop local stream
    localStreamRef.current?.getTracks().forEach(track => {
      track.stop();
    });
    localStreamRef.current = null;

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    remoteStreamRef.current = null;
    setRemoteStreamState(null); // Clear state
    isCallerRef.current = false;
    isInCallRef.current = false;
    isCallingRef.current = false;
    isIncomingCallRef.current = false;
  }, []);

  // Reset ended flag when starting new call
  const resetEndedFlag = useCallback(() => {
    hasEndedRef.current = false;
  }, []);

  // End call
  const endCall = useCallback(async (skipNotification = false) => {
    // Prevent multiple end calls
    if (hasEndedRef.current) {
      console.log('⚠️ End call already in progress, skipping');
      return;
    }
    hasEndedRef.current = true;

    console.log('📴 Ending call, skipNotification:', skipNotification);
    
    // Update refs and state immediately for instant UI update
    isInCallRef.current = false;
    isCallingRef.current = false;
    isIncomingCallRef.current = false;
    setIsCalling(false);
    setIsIncomingCall(false);
    setIsInCall(false);
    setCallerInfo(null);

    try {
      // Send notification and cleanup in parallel for faster response
      const promises: Promise<any>[] = [];
      
      if (!skipNotification) {
        const targetUserId = otherUserId || callerInfo?.userId;
        if (targetUserId && conversationId) {
          console.log('📴 Sending end call notification to:', targetUserId);
          // Fire and forget - don't block on notification
          promises.push(
            conversationSignalRService.endVideoCall(conversationId, targetUserId)
              .catch(error => console.error('❌ Error sending end call notification:', error))
          );
        } else {
          console.log('⚠️ Cannot send end call notification - missing targetUserId or conversationId');
        }
      } else {
        console.log('📴 Skipping notification - received end event from other user');
      }
      
      // Cleanup immediately, don't wait for notification
      cleanup();
      
      // Don't wait for notification - fire and forget for instant response
      // Notification will be sent in background
      Promise.allSettled(promises).catch(() => {
        // Silently handle any errors
      });
    } catch (error) {
      console.error('❌ Error ending call:', error);
      cleanup(); // Ensure cleanup happens even on error
    } finally {
      // Reduced timeout for faster flag reset
      setTimeout(() => {
        hasEndedRef.current = false;
        console.log('✅ End call flag reset');
      }, 100); // Reduced from 500ms to 100ms for faster response
    }
  }, [conversationId, otherUserId, callerInfo, cleanup]);

  // Start call
  const startCall = useCallback(async () => {
    if (!conversationId || !otherUserId) {
      toast.error('Cannot start call: missing conversation or user information');
      return;
    }

    // Reset ended flag for new call
    resetEndedFlag();

    // Set callerInfo with other user's information when starting call
    setCallerInfo({ 
      userId: otherUserId, 
      userName: otherUserName || 'Unknown' 
    });

    try {
      setIsCalling(true);
      isCallingRef.current = true;
      
      // Parallelize: request media and ensure SignalR connection simultaneously
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        }),
        conversationSignalRService.ensureConnection().catch(error => {
          console.warn('⚠️ SignalR connection check failed, continuing anyway:', error);
        })
      ]);
      localStreamRef.current = stream;

      // Create peer connection
      const pc = new RTCPeerConnection(rtcConfiguration);
      peerConnectionRef.current = pc;
      isCallerRef.current = true;

      // Note: Don't process pending ICE candidates here - remote description (answer) hasn't been set yet
      // Pending ICE candidates will be processed after answer is received and remote description is set

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('📹 Received remote stream (startCall):', event);
        console.log('📹 Event streams:', event.streams);
        console.log('📹 Event track:', event.track);
        if (event.streams && event.streams.length > 0) {
          const stream = event.streams[0];
          console.log('📹 Stream ID:', stream.id);
          console.log('📹 Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
          remoteStreamRef.current = stream;
          setRemoteStreamState(stream); // Force component re-render
          console.log('✅ Remote stream set and state updated (startCall)');
        } else if (event.track) {
          // Sometimes track comes without stream, create a new stream
          console.log('📹 Track received without stream, creating new stream');
          const stream = new MediaStream([event.track]);
          remoteStreamRef.current = stream;
          setRemoteStreamState(stream);
          console.log('✅ Remote stream created from track (startCall)');
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate:', event.candidate);
          conversationSignalRService.sendIceCandidate(conversationId, otherUserId, event.candidate.toJSON());
        } else {
          console.log('🧊 ICE gathering complete');
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', pc.connectionState);
        console.log('🔗 ICE connection state:', pc.iceConnectionState);
        console.log('🔗 ICE gathering state:', pc.iceGatheringState);
        console.log('🔗 Signaling state:', pc.signalingState);
        
        // Clear any existing disconnected timeout
        if (disconnectedTimeoutRef.current) {
          clearTimeout(disconnectedTimeoutRef.current);
          disconnectedTimeoutRef.current = null;
        }
        
        // Immediately end call if connection failed or closed
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          console.log('🔗 Connection failed/closed, ending call');
          toast.error('Call connection lost');
          endCall(); // Will notify other user
          return;
        }
        
        // For 'disconnected' state, wait a bit before ending (might be temporary)
        // Only end if disconnected persists for more than 5 seconds
        if (pc.connectionState === 'disconnected') {
          console.log('🔗 Connection disconnected, waiting to see if it recovers...');
          disconnectedTimeoutRef.current = setTimeout(() => {
            // Check if still disconnected after timeout
            if (pc.connectionState === 'disconnected' && peerConnectionRef.current === pc) {
              console.log('🔗 Connection still disconnected after timeout, ending call');
              toast.error('Call connection lost');
              endCall(); // Will notify other user
            }
          }, 5000); // Wait 5 seconds
        }
        
        if (pc.connectionState === 'connected') {
          console.log('✅ WebRTC connection established!');
          // Ensure UI state is updated when connection is established
          setIsInCall(true);
          setIsCalling(false);
        }
      };

      // Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          console.log('✅ ICE connection established!');
          // Clear disconnected timeout if ICE is connected
          if (disconnectedTimeoutRef.current) {
            clearTimeout(disconnectedTimeoutRef.current);
            disconnectedTimeoutRef.current = null;
          }
        }
        if (pc.iceConnectionState === 'failed') {
          console.error('❌ ICE connection failed');
          // Clear disconnected timeout
          if (disconnectedTimeoutRef.current) {
            clearTimeout(disconnectedTimeoutRef.current);
            disconnectedTimeoutRef.current = null;
          }
          toast.error('Connection failed. Please check your network.');
          // Only end call if ICE failed and connection is also failed
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            setTimeout(() => {
              if (pc.iceConnectionState === 'failed' && peerConnectionRef.current === pc) {
                console.log('🔗 ICE failed and connection still bad, ending call');
                endCall();
              }
            }, 2000); // Wait 2 seconds to see if it recovers
          }
        }
      };

      // Create offer with optimized options for faster connection
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        // Ice restart for faster reconnection if needed
        iceRestart: false
      });
      await pc.setLocalDescription(offer);

      // Parallelize: notify other user and send offer simultaneously
      await Promise.all([
        conversationSignalRService.startVideoCall(conversationId, otherUserId),
        conversationSignalRService.sendVideoCallOffer(conversationId, otherUserId, offer)
      ]);

      setIsInCall(true);
      isInCallRef.current = true;
      setIsCalling(false);
      isCallingRef.current = false;
      toast.success('Call started');
    } catch (error: any) {
      console.error('Error starting call:', error);
      toast.error(error.message || 'Failed to start call. Please check your camera and microphone permissions.');
      cleanup();
      setIsCalling(false);
      isCallingRef.current = false;
    }
  }, [conversationId, otherUserId, endCall, cleanup]);

  // Answer call
  const answerCall = useCallback(async () => {
    if (!callerInfo || !conversationId) return;

    // Reset ended flag for new call
    resetEndedFlag();

    try {
      setIsIncomingCall(false);
      isIncomingCallRef.current = false;
      setIsInCall(true);
      isInCallRef.current = true;

      // Parallelize: request media and ensure SignalR connection simultaneously
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        }),
        conversationSignalRService.ensureConnection().catch(error => {
          console.warn('⚠️ SignalR connection check failed, continuing anyway:', error);
        })
      ]);
      localStreamRef.current = stream;

      // Create peer connection FIRST
      const pc = new RTCPeerConnection(rtcConfiguration);
      peerConnectionRef.current = pc;
      isCallerRef.current = false;
      
      console.log('✅ Peer connection created in answerCall');

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('📹 Received remote stream (answerCall):', event);
        console.log('📹 Event streams:', event.streams);
        console.log('📹 Event track:', event.track);
        if (event.streams && event.streams.length > 0) {
          const stream = event.streams[0];
          console.log('📹 Stream ID:', stream.id);
          console.log('📹 Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
          remoteStreamRef.current = stream;
          setRemoteStreamState(stream); // Force component re-render
          console.log('✅ Remote stream set and state updated (answerCall)');
        } else if (event.track) {
          // Sometimes track comes without stream, create a new stream
          console.log('📹 Track received without stream, creating new stream');
          const stream = new MediaStream([event.track]);
          remoteStreamRef.current = stream;
          setRemoteStreamState(stream);
          console.log('✅ Remote stream created from track (answerCall)');
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate (answer):', event.candidate);
          conversationSignalRService.sendIceCandidate(conversationId, callerInfo.userId, event.candidate.toJSON());
        } else {
          console.log('🧊 ICE gathering complete (answer)');
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state (answer):', pc.connectionState);
        console.log('🔗 ICE connection state (answer):', pc.iceConnectionState);
        console.log('🔗 ICE gathering state (answer):', pc.iceGatheringState);
        console.log('🔗 Signaling state (answer):', pc.signalingState);
        
        // Clear any existing disconnected timeout
        if (disconnectedTimeoutRef.current) {
          clearTimeout(disconnectedTimeoutRef.current);
          disconnectedTimeoutRef.current = null;
        }
        
        // Immediately end call if connection failed or closed
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          console.log('🔗 Connection failed/closed (answer), ending call');
          toast.error('Call connection lost');
          endCall(); // Will notify other user
          return;
        }
        
        // For 'disconnected' state, wait a bit before ending (might be temporary)
        // Only end if disconnected persists for more than 5 seconds
        if (pc.connectionState === 'disconnected') {
          console.log('🔗 Connection disconnected (answer), waiting to see if it recovers...');
          disconnectedTimeoutRef.current = setTimeout(() => {
            // Check if still disconnected after timeout
            if (pc.connectionState === 'disconnected' && peerConnectionRef.current === pc) {
              console.log('🔗 Connection still disconnected after timeout (answer), ending call');
              toast.error('Call connection lost');
              endCall(); // Will notify other user
            }
          }, 5000); // Wait 5 seconds
        }
        
        if (pc.connectionState === 'connected') {
          console.log('✅ WebRTC connection established (answer)!');
          // Ensure UI state is updated when connection is established
          setIsInCall(true);
          setIsCalling(false);
        }
      };

      // Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state (answer):', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          console.log('✅ ICE connection established (answer)!');
          // Clear disconnected timeout if ICE is connected
          if (disconnectedTimeoutRef.current) {
            clearTimeout(disconnectedTimeoutRef.current);
            disconnectedTimeoutRef.current = null;
          }
        }
        if (pc.iceConnectionState === 'failed') {
          console.error('❌ ICE connection failed (answer)');
          // Clear disconnected timeout
          if (disconnectedTimeoutRef.current) {
            clearTimeout(disconnectedTimeoutRef.current);
            disconnectedTimeoutRef.current = null;
          }
          toast.error('Connection failed. Please check your network.');
          // Only end call if ICE failed and connection is also failed
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            setTimeout(() => {
              if (pc.iceConnectionState === 'failed' && peerConnectionRef.current === pc) {
                console.log('🔗 ICE failed and connection still bad (answer), ending call');
                endCall();
              }
            }, 2000); // Wait 2 seconds to see if it recovers
          }
        }
      };

      // Check if there's a pending offer to process
      if (pendingOfferRef.current) {
        console.log('📞 Processing pending offer that arrived before peer connection was ready');
        const { offer, fromUserId } = pendingOfferRef.current;
        try {
          console.log('📞 Signaling state before processing pending offer:', pc.signalingState);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          console.log('✅ Remote description set from pending offer');
          console.log('📞 Signaling state after setRemoteDescription:', pc.signalingState);
          
          const answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
            voiceActivityDetection: true
          });
          console.log('✅ Answer created from pending offer');
          
          await pc.setLocalDescription(answer);
          console.log('✅ Local description set from pending offer');
          console.log('📞 Signaling state after setLocalDescription:', pc.signalingState);
          
          if (fromUserId) {
            // Send answer without blocking - fire and forget for faster response
            conversationSignalRService.sendVideoCallAnswer(conversationId, fromUserId, answer)
              .catch(error => console.error('❌ Error sending answer:', error));
            console.log('✅ Pending offer processed and answer sent');
          }
          pendingOfferRef.current = null; // Clear pending offer
        } catch (error) {
          console.error('❌ Error processing pending offer:', error);
          console.error('❌ Error details:', {
            name: (error as Error).name,
            message: (error as Error).message,
            signalingState: pc.signalingState,
            connectionState: pc.connectionState
          });
        }
      }

      // Process pending ICE candidates
      if (pendingIceCandidatesRef.current.length > 0) {
        console.log(`🧊 Processing ${pendingIceCandidatesRef.current.length} pending ICE candidates`);
        const candidates = [...pendingIceCandidatesRef.current];
        pendingIceCandidatesRef.current = []; // Clear pending candidates
        
        for (const { candidate } of candidates) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('✅ Pending ICE candidate added');
          } catch (error) {
            console.error('❌ Error adding pending ICE candidate:', error);
          }
        }
      }

      toast.success('Call answered');
    } catch (error: any) {
      console.error('Error answering call:', error);
      toast.error(error.message || 'Failed to answer call. Please check your camera and microphone permissions.');
      endCall();
    }
  }, [conversationId, callerInfo, endCall]);

  // Reject call
  const rejectCall = useCallback(async () => {
    if (callerInfo && conversationId) {
      try {
        await conversationSignalRService.endVideoCall(conversationId, callerInfo.userId);
      } catch (error) {
        console.error('Error rejecting call:', error);
      }
    }
    setIsIncomingCall(false);
    isIncomingCallRef.current = false;
    setCallerInfo(null);
  }, [conversationId, callerInfo]);

  // Set up SignalR listeners
  useEffect(() => {
    if (!conversationId || !currentUserId || !otherUserId) return;

    // Listen for incoming calls
    const unsubscribeIncoming = conversationSignalRService.onVideoCallIncoming((fromUserId, fromUserName) => {
      if (fromUserId !== currentUserId && fromUserId === otherUserId) {
        setCallerInfo({ userId: fromUserId, userName: fromUserName || otherUserName || 'Unknown' });
        setIsIncomingCall(true);
        isIncomingCallRef.current = true;
        // Play notification sound if needed
      }
    });

    // Listen for offer (when answering)
    const unsubscribeOffer = conversationSignalRService.onVideoCallOffer(async (offer, fromUserId) => {
      console.log('📞 Received VideoCallOffer from:', fromUserId);
      console.log('📞 Current peerConnection:', peerConnectionRef.current ? 'exists' : 'null');
      console.log('📞 isCallerRef:', isCallerRef.current);
      console.log('📞 callerInfo:', callerInfo);
      
      if (fromUserId === otherUserId || fromUserId === callerInfo?.userId) {
        // If peer connection is not ready yet, store the offer
        if (!peerConnectionRef.current) {
          console.log('⏳ Peer connection not ready, storing offer for later processing');
          pendingOfferRef.current = { offer, fromUserId };
          return;
        }
        
        // Wait a bit if peer connection is not ready yet (might be creating in answerCall)
        let retries = 0;
        while (!peerConnectionRef.current && retries < 10) {
          console.log('⏳ Waiting for peer connection to be created...', retries);
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }
        
        if (peerConnectionRef.current && !isCallerRef.current) {
          try {
            const pc = peerConnectionRef.current;
            console.log('✅ Processing offer with peer connection');
            console.log('📞 Current signaling state:', pc.signalingState);
            
            // Check if we're in the correct state (should be "stable" for receiver)
            if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
              console.warn(`⚠️ Unexpected signaling state: ${pc.signalingState}, expected 'stable'`);
              // If we're in a different state, we might need to reset or wait
              if (pc.signalingState === 'have-remote-offer') {
                console.log('⚠️ Already have remote offer, ignoring duplicate');
                return;
              }
            }
            
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            console.log('✅ Remote description set');
            console.log('📞 Signaling state after setRemoteDescription:', pc.signalingState);
            
            const answer = await pc.createAnswer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
              voiceActivityDetection: true
            });
            console.log('✅ Answer created');
            
            await pc.setLocalDescription(answer);
            console.log('✅ Local description set');
            console.log('📞 Signaling state after setLocalDescription:', pc.signalingState);
            
            const targetUserId = fromUserId === otherUserId ? otherUserId : callerInfo?.userId;
            if (targetUserId) {
              // Send answer without blocking - fire and forget for faster response
              conversationSignalRService.sendVideoCallAnswer(conversationId, targetUserId, answer)
                .catch(error => console.error('❌ Error sending answer:', error));
              console.log('✅ Answer sent to:', targetUserId);
            }
          } catch (error) {
            console.error('❌ Error handling offer:', error);
            console.error('❌ Error details:', {
              name: (error as Error).name,
              message: (error as Error).message,
              signalingState: peerConnectionRef.current?.signalingState,
              connectionState: peerConnectionRef.current?.connectionState
            });
            toast.error('Failed to process call offer');
            endCall();
          }
        } else {
          console.warn('⚠️ Cannot process offer: peerConnection not ready or is caller');
          // Store offer for later if peer connection is being created
          if (!isCallerRef.current) {
            console.log('💾 Storing offer to process later');
            pendingOfferRef.current = { offer, fromUserId };
          }
        }
      }
    });

    // Listen for answer (when calling)
    const unsubscribeAnswer = conversationSignalRService.onVideoCallAnswer(async (answer) => {
      console.log('✅ Received VideoCallAnswer');
      console.log('📞 Current peerConnection:', peerConnectionRef.current ? 'exists' : 'null');
      console.log('📞 isCallerRef:', isCallerRef.current);
      
      // Prevent processing if already processing or if call has ended
      if (isProcessingAnswerRef.current) {
        console.warn('⚠️ Already processing an answer, ignoring duplicate');
        return;
      }
      
      if (hasEndedRef.current) {
        console.warn('⚠️ Call has already ended, ignoring answer');
        return;
      }
      
      if (peerConnectionRef.current && isCallerRef.current) {
        isProcessingAnswerRef.current = true;
        try {
          const pc = peerConnectionRef.current;
          console.log('📞 Current signaling state:', pc.signalingState);
          console.log('📞 Current connection state:', pc.connectionState);
          console.log('📞 Current ICE connection state:', pc.iceConnectionState);
          
          // Check if we're in the correct state to set remote description
          // For caller: should be in "have-local-offer" state
          if (pc.signalingState !== 'have-local-offer') {
            console.warn(`⚠️ Wrong signaling state: ${pc.signalingState}, expected 'have-local-offer'`);
            
            // If we're in stable state, the offer might have been lost or connection reset
            // The answer we received is likely stale (for an old offer)
            if (pc.signalingState === 'stable') {
              console.log('🔄 Signaling state is stable - answer is likely stale, recreating offer...');
              console.log('⚠️ Ignoring stale answer and will wait for new answer to new offer');
              try {
                const newOffer = await pc.createOffer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: true,
                  iceRestart: false
                });
                await pc.setLocalDescription(newOffer);
                console.log('✅ Recreated offer and set local description');
                
                // Send the new offer to the other user
                const targetUserId = otherUserId || callerInfo?.userId;
                if (targetUserId && conversationId) {
                  await conversationSignalRService.sendVideoCallOffer(conversationId, targetUserId, newOffer);
                  console.log('✅ New offer sent, waiting for new answer');
                }
                
                // Don't try to set the stale answer - it doesn't match the new offer
                // We'll wait for a new answer to arrive
                return;
              } catch (recreateError) {
                console.error('❌ Error recreating offer:', recreateError);
                throw recreateError;
              }
            } else if (pc.signalingState === 'have-remote-offer') {
              // We already have a remote offer, this might be a duplicate answer
              console.warn('⚠️ Already have remote offer, might be duplicate answer. Ignoring.');
              return; // Don't end call, just ignore
            } else {
              // Wait a bit and retry if in transitioning state
              console.log('⏳ Waiting for signaling state to be ready...');
              let retries = 0;
              const initialState = pc.signalingState;
              while (pc.signalingState === initialState && retries < 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
              }
              
              // Try to set remote description if state changed to the correct one
              if (pc.signalingState === 'have-local-offer' as RTCSignalingState) {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(answer));
                  console.log('✅ Remote description set from answer (after wait)');
                } catch (error) {
                  throw new Error(`Cannot set remote answer: signaling state is ${pc.signalingState}, error: ${error}`);
                }
              } else {
                // If still in wrong state, check if connection is already established
                if (pc.connectionState === 'connected' || pc.iceConnectionState === 'connected') {
                  console.log('✅ Connection already established, ignoring answer processing');
                  return; // Don't end call if connection is already working
                }
                throw new Error(`Cannot set remote answer: signaling state is still ${pc.signalingState}`);
              }
            }
          } else {
            // Normal case: we're in the correct state
            console.log('✅ Processing answer with peer connection');
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('✅ Remote description set from answer');
            console.log('📞 Signaling state after setRemoteDescription:', pc.signalingState);
          }
          
          // Process any pending ICE candidates now that remote description is set
          if (pendingIceCandidatesRef.current.length > 0) {
            console.log(`🧊 Processing ${pendingIceCandidatesRef.current.length} pending ICE candidates after answer`);
            const candidates = [...pendingIceCandidatesRef.current];
            pendingIceCandidatesRef.current = []; // Clear pending candidates
            
            for (const { candidate } of candidates) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('✅ Pending ICE candidate added after answer');
              } catch (error) {
                console.error('❌ Error adding pending ICE candidate after answer:', error);
                // Don't throw - continue processing other candidates
              }
            }
          }
          
          // Update UI state: caller has received answer, call is now active
          setIsInCall(true);
          setIsCalling(false);
          console.log('✅ Call state updated: answer received, call is active');
        } catch (error) {
          console.error('❌ Error handling answer:', error);
          console.error('❌ Error details:', {
            name: (error as Error).name,
            message: (error as Error).message,
            signalingState: peerConnectionRef.current?.signalingState,
            connectionState: peerConnectionRef.current?.connectionState,
            iceConnectionState: peerConnectionRef.current?.iceConnectionState
          });
          
          // Check if connection is already established - if so, don't end the call
          const pc = peerConnectionRef.current;
          if (pc && (pc.connectionState === 'connected' || pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed')) {
            console.log('✅ Connection already established despite error, not ending call');
            toast.warning('Answer processing had an issue, but connection is working');
            return; // Don't end call if connection is working
          }
          
          // Only end call if connection is not established and error is critical
          const errorMessage = (error as Error).message || '';
          if (errorMessage.includes('InvalidStateError') || errorMessage.includes('InvalidAccessError')) {
            console.error('❌ Critical error processing answer, ending call');
            toast.error('Failed to process call answer');
            endCall();
          } else {
            // For other errors, wait a bit to see if connection establishes
            console.log('⏳ Waiting to see if connection establishes despite error...');
            setTimeout(() => {
              if (peerConnectionRef.current && 
                  peerConnectionRef.current.connectionState !== 'connected' && 
                  peerConnectionRef.current.iceConnectionState !== 'connected' &&
                  peerConnectionRef.current.iceConnectionState !== 'completed') {
                console.error('❌ Connection did not establish after error, ending call');
                toast.error('Failed to establish call connection');
                endCall();
              } else {
                console.log('✅ Connection established despite initial error');
              }
            }, 3000); // Wait 3 seconds
          }
        } finally {
          isProcessingAnswerRef.current = false;
        }
      } else {
        console.warn('⚠️ Cannot process answer: peerConnection not ready or not caller');
        if (!peerConnectionRef.current) {
          console.warn('⚠️ Peer connection is null, storing answer for later processing');
          // Store answer for later if peer connection is being created
          // Note: This is a fallback, normally peer connection should exist when answer arrives
        }
      }
    });

    // Listen for ICE candidates
    const unsubscribeIce = conversationSignalRService.onIceCandidate(async (candidate, fromUserId) => {
      const targetUserId = otherUserId || callerInfo?.userId;
      console.log('🧊 Received ICE candidate from:', fromUserId, 'target:', targetUserId);
      
      if (fromUserId === targetUserId) {
        // If peer connection is not ready, store the candidate
        if (!peerConnectionRef.current) {
          console.log('⏳ Peer connection not ready, storing ICE candidate for later');
          pendingIceCandidatesRef.current.push({ candidate, fromUserId });
          return;
        }

        try {
          console.log('🧊 Adding ICE candidate to peer connection');
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('✅ ICE candidate added');
        } catch (error) {
          console.error('❌ Error adding ICE candidate:', error);
          // Store candidate for retry if it's a temporary error
          if (peerConnectionRef.current.signalingState !== 'closed') {
            console.log('💾 Storing ICE candidate for retry');
            pendingIceCandidatesRef.current.push({ candidate, fromUserId });
          }
        }
      } else {
        console.warn('⚠️ Cannot add ICE candidate - wrong user:', {
          fromUserId,
          targetUserId,
          hasPeerConnection: !!peerConnectionRef.current
        });
      }
    });

    // Listen for call ended - optimized for instant response
    const unsubscribeEnded = conversationSignalRService.onVideoCallEnded((userId) => {
      // Minimal debounce: only prevent duplicate events within 10ms
      const now = Date.now();
      if (now - lastEndCallTimeRef.current < 10) {
        return; // Ignore duplicate
      }
      lastEndCallTimeRef.current = now;
      
      // Quick check: is this from the other user?
      const isFromOtherUser = userId === otherUserId || userId === callerInfo?.userId;
      
      if (isFromOtherUser) {
        // End call immediately - call synchronously for fastest response
        toast.info('Call ended by other user');
        endCall(true); // Skip notification since other user already ended it
      }
    });

    return () => {
      unsubscribeIncoming();
      unsubscribeOffer();
      unsubscribeAnswer();
      unsubscribeIce();
      unsubscribeEnded();
    };
  }, [conversationId, otherUserId, currentUserId, callerInfo, endCall, resetEndedFlag]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isCalling,
    isIncomingCall,
    isInCall,
    callerInfo,
    localStream: localStreamRef.current,
    remoteStream: remoteStreamState || remoteStreamRef.current, // Use state for reactivity
    startCall,
    answerCall,
    rejectCall,
    endCall,
  };
};

