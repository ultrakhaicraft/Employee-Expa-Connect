import { useState, useRef, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { rtcConfiguration } from '../../utils/webrtcConfig';
import { conversationSignalRService } from '../../services/conversationSignalRService';
import { toast } from 'sonner';

interface UseAudioCallOptions {
  conversationId: string;
  otherUserId: string;
  otherUserName?: string;
}

export const useAudioCall = ({ conversationId, otherUserId, otherUserName }: UseAudioCallOptions) => {
  const [isCalling, setIsCalling] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [callerInfo, setCallerInfo] = useState<{ userId: string; userName: string } | null>(null);
  const [remoteStreamState, setRemoteStreamState] = useState<MediaStream | null>(null); // Force re-render when stream changes
  const pendingOfferRef = useRef<{ offer: RTCSessionDescriptionInit; fromUserId: string } | null>(null); // Store offer if it arrives before peer connection is ready
  const pendingIceCandidatesRef = useRef<Array<{ candidate: RTCIceCandidateInit; fromUserId: string }>>([]); // Store ICE candidates if they arrive before peer connection is ready
  const hasSetRemoteAnswerRef = useRef(false); // Track if we've already set remote answer to prevent duplicate processing
  const isProcessingAnswerRef = useRef(false); // Flag to prevent concurrent answer processing
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const isCallerRef = useRef(false);
  const hasEndedRef = useRef(false); // Flag to prevent multiple end calls
  
  const currentUserId = useSelector((state: any) => 
    state.auth?.decodedToken?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
  );

    // Cleanup function
  const cleanup = useCallback(() => {
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
    hasSetRemoteAnswerRef.current = false; // Reset answer flag
    isProcessingAnswerRef.current = false; // Reset processing flag
  }, []);

  // Reset ended flag when starting new call
  const resetEndedFlag = useCallback(() => {
    hasEndedRef.current = false;
  }, []);

  // End call
  const endCall = useCallback(async (skipNotification = false) => {
    // Prevent multiple end calls
    if (hasEndedRef.current) {
      console.log('⚠️ End call already in progress, skipping (audio)');
      return;
    }
    hasEndedRef.current = true;

    console.log('📴 Ending call, skipNotification:', skipNotification, '(audio)');

    // Update state immediately for instant UI update
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
          console.log('📴 Sending end call notification to:', targetUserId, '(audio)');
          // Fire and forget - don't block on notification
          promises.push(
            conversationSignalRService.endAudioCall(conversationId, targetUserId)
              .catch(error => console.error('❌ Error sending end call notification (audio):', error))
          );
        } else {
          console.log('⚠️ Cannot send end call notification - missing targetUserId or conversationId (audio)');
        }
      } else {
        console.log('📴 Skipping notification - received end event from other user (audio)');
      }
      
      // Cleanup immediately, don't wait for notification
      cleanup();
      
      // Don't wait for notification - fire and forget for instant response
      // Notification will be sent in background
      Promise.allSettled(promises).catch(() => {
        // Silently handle any errors
      });
    } catch (error) {
      console.error('❌ Error ending call (audio):', error);
      cleanup(); // Ensure cleanup happens even on error
    } finally {
      // Reduced timeout for faster flag reset
      setTimeout(() => {
        hasEndedRef.current = false;
        console.log('✅ End call flag reset (audio)');
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
      
      // Parallelize: request media and ensure SignalR connection simultaneously
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ 
          video: false,  // No video for audio call
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
      hasSetRemoteAnswerRef.current = false; // Reset answer flag for new call

      // Note: Don't process pending ICE candidates here - remote description (answer) hasn't been set yet
      // Pending ICE candidates will be processed after answer is received and remote description is set

      // Add local stream tracks (audio only)
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('🔊 Received remote audio stream (startCall):', event);
        console.log('🔊 Event streams:', event.streams);
        console.log('🔊 Event track:', event.track);
        if (event.streams && event.streams.length > 0) {
          const stream = event.streams[0];
          console.log('🔊 Stream ID:', stream.id);
          console.log('🔊 Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
          remoteStreamRef.current = stream;
          setRemoteStreamState(stream); // Force component re-render
          console.log('✅ Remote audio stream set and state updated (startCall)');
        } else if (event.track) {
          console.log('🔊 Track received without stream, creating new stream');
          const stream = new MediaStream([event.track]);
          remoteStreamRef.current = stream;
          setRemoteStreamState(stream);
          console.log('✅ Remote audio stream created from track (startCall)');
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate (audio):', event.candidate);
          conversationSignalRService.sendIceCandidate(conversationId, otherUserId, event.candidate.toJSON());
        } else {
          console.log('🧊 ICE gathering complete (audio)');
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state (audio):', pc.connectionState);
        console.log('🔗 ICE connection state (audio):', pc.iceConnectionState);
        console.log('🔗 ICE gathering state (audio):', pc.iceGatheringState);
        console.log('🔗 Signaling state (audio):', pc.signalingState);
        
        // Auto-end call if connection is lost
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
          console.log('🔗 Connection lost (audio), ending call');
          toast.error('Call connection lost');
          endCall(); // Will notify other user
        }
        if (pc.connectionState === 'connected') {
          console.log('✅ WebRTC connection established (audio)!');
          // Ensure UI state is updated when connection is established
          setIsInCall(true);
          setIsCalling(false);
        }
      };

      // Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state (audio):', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          console.log('✅ ICE connection established (audio)!');
        }
        if (pc.iceConnectionState === 'failed') {
          console.error('❌ ICE connection failed (audio)');
          toast.error('Connection failed. Please check your network.');
        }
      };

      // Create offer with optimized options for faster connection
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,  // No video
        // Ice restart for faster reconnection if needed
        iceRestart: false
      });
      await pc.setLocalDescription(offer);
      console.log('✅ Local description set in startCall (audio)');
      console.log('📞 Signaling state after setLocalDescription:', pc.signalingState);
      
      // Verify signaling state is correct
      if (pc.signalingState !== 'have-local-offer') {
        console.error(`❌ Unexpected signaling state after setLocalDescription: ${pc.signalingState}, expected 'have-local-offer'`);
        throw new Error(`Failed to set local description: signaling state is ${pc.signalingState}`);
      }

      // Parallelize: notify other user and send offer simultaneously
      await Promise.all([
        conversationSignalRService.startAudioCall(conversationId, otherUserId),
        conversationSignalRService.sendAudioCallOffer(conversationId, otherUserId, offer)
      ]);
      
      // Verify signaling state is still correct after sending offer
      console.log('📞 Signaling state after sending offer:', pc.signalingState);
      if (pc.signalingState !== 'have-local-offer') {
        console.warn(`⚠️ Signaling state changed after sending offer: ${pc.signalingState}, expected 'have-local-offer'`);
      }

      setIsInCall(true);
      setIsCalling(false);
      toast.success('Call started');
    } catch (error: any) {
      console.error('Error starting call:', error);
      toast.error(error.message || 'Failed to start call. Please check your microphone permissions.');
      cleanup();
      setIsCalling(false);
    }
  }, [conversationId, otherUserId, endCall, cleanup]);

  // Answer call
  const answerCall = useCallback(async () => {
    if (!callerInfo || !conversationId) return;

    // Reset ended flag for new call
    resetEndedFlag();

    try {
      setIsIncomingCall(false);
      setIsInCall(true);

      // Parallelize: request media and ensure SignalR connection simultaneously
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ 
          video: false,  // No video for audio call
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
      hasSetRemoteAnswerRef.current = false; // Reset answer flag for receiver
      
      console.log('✅ Peer connection created in answerCall (audio)');

      // Add local stream tracks (audio only)
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('🔊 Received remote audio stream (answerCall):', event);
        console.log('🔊 Event streams:', event.streams);
        console.log('🔊 Event track:', event.track);
        if (event.streams && event.streams.length > 0) {
          const stream = event.streams[0];
          console.log('🔊 Stream ID:', stream.id);
          console.log('🔊 Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
          remoteStreamRef.current = stream;
          setRemoteStreamState(stream); // Force component re-render
          console.log('✅ Remote audio stream set and state updated (answerCall)');
        } else if (event.track) {
          console.log('🔊 Track received without stream, creating new stream');
          const stream = new MediaStream([event.track]);
          remoteStreamRef.current = stream;
          setRemoteStreamState(stream);
          console.log('✅ Remote audio stream created from track (answerCall)');
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate (answer - audio):', event.candidate);
          conversationSignalRService.sendIceCandidate(conversationId, callerInfo.userId, event.candidate.toJSON());
        } else {
          console.log('🧊 ICE gathering complete (answer - audio)');
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state (answer - audio):', pc.connectionState);
        console.log('🔗 ICE connection state (answer - audio):', pc.iceConnectionState);
        console.log('🔗 ICE gathering state (answer - audio):', pc.iceGatheringState);
        console.log('🔗 Signaling state (answer - audio):', pc.signalingState);
        
        // Auto-end call if connection is lost
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
          console.log('🔗 Connection lost (answer - audio), ending call');
          toast.error('Call connection lost');
          endCall(); // Will notify other user
        }
        if (pc.connectionState === 'connected') {
          console.log('✅ WebRTC connection established (answer - audio)!');
          // Ensure UI state is updated when connection is established
          setIsInCall(true);
          setIsCalling(false);
        }
      };

      // Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state (answer - audio):', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          console.log('✅ ICE connection established (answer - audio)!');
        }
        if (pc.iceConnectionState === 'failed') {
          console.error('❌ ICE connection failed (answer - audio)');
          toast.error('Connection failed. Please check your network.');
        }
      };

      // Check if there's a pending offer to process
      if (pendingOfferRef.current) {
        console.log('📞 Processing pending offer that arrived before peer connection was ready (audio)');
        const { offer, fromUserId } = pendingOfferRef.current;
        // Clear pending offer immediately to prevent duplicate processing
        pendingOfferRef.current = null;
        
        try {
          console.log('📞 Signaling state before processing pending offer:', pc.signalingState);
          
          // Ensure we're in stable state before processing
          if (pc.signalingState !== 'stable') {
            console.warn(`⚠️ Unexpected signaling state for pending offer: ${pc.signalingState}, expected 'stable'`);
            // If already have remote offer, skip
            if (pc.signalingState === 'have-remote-offer') {
              console.log('⚠️ Already have remote offer, skipping pending offer (audio)');
              return;
            }
          }
          
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          console.log('✅ Remote description set from pending offer (audio)');
          console.log('📞 Signaling state after setRemoteDescription:', pc.signalingState);
          
          const answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false,
            voiceActivityDetection: true
          });
          console.log('✅ Answer created from pending offer (audio)');
          
          await pc.setLocalDescription(answer);
          console.log('✅ Local description set from pending offer (audio)');
          console.log('📞 Signaling state after setLocalDescription:', pc.signalingState);
          
          if (fromUserId) {
            // Send answer without blocking - fire and forget for faster response
            conversationSignalRService.sendAudioCallAnswer(conversationId, fromUserId, answer)
              .catch(error => console.error('❌ Error sending answer (audio):', error));
            console.log('✅ Pending offer processed and answer sent (audio)');
          }
        } catch (error) {
          console.error('❌ Error processing pending offer (audio):', error);
          console.error('❌ Error details:', {
            name: (error as Error).name,
            message: (error as Error).message,
            signalingState: pc.signalingState,
            connectionState: pc.connectionState
          });
          // Don't end call here - let user try again or handle error gracefully
          toast.error('Failed to process call offer. Please try again.');
        }
      }

      // Process pending ICE candidates
      if (pendingIceCandidatesRef.current.length > 0) {
        console.log(`🧊 Processing ${pendingIceCandidatesRef.current.length} pending ICE candidates (audio)`);
        const candidates = [...pendingIceCandidatesRef.current];
        pendingIceCandidatesRef.current = []; // Clear pending candidates
        
        for (const { candidate } of candidates) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('✅ Pending ICE candidate added (audio)');
          } catch (error) {
            console.error('❌ Error adding pending ICE candidate (audio):', error);
          }
        }
      }

      toast.success('Call answered');
    } catch (error: any) {
      console.error('Error answering call:', error);
      toast.error(error.message || 'Failed to answer call. Please check your microphone permissions.');
      endCall();
    }
  }, [conversationId, callerInfo, endCall]);

  // Reject call
  const rejectCall = useCallback(async () => {
    if (callerInfo && conversationId) {
      try {
        await conversationSignalRService.endAudioCall(conversationId, callerInfo.userId);
      } catch (error) {
        console.error('Error rejecting call:', error);
      }
    }
    setIsIncomingCall(false);
    setCallerInfo(null);
  }, [conversationId, callerInfo]);

  // Set up SignalR listeners
  useEffect(() => {
    if (!conversationId || !currentUserId || !otherUserId) return;

    // Listen for incoming calls
    const unsubscribeIncoming = conversationSignalRService.onAudioCallIncoming((fromUserId, fromUserName) => {
      if (fromUserId !== currentUserId && fromUserId === otherUserId) {
        setCallerInfo({ userId: fromUserId, userName: fromUserName || otherUserName || 'Unknown' });
        setIsIncomingCall(true);
      }
    });

    // Listen for offer (when answering)
    const unsubscribeOffer = conversationSignalRService.onAudioCallOffer(async (offer, fromUserId) => {
      console.log('📞 Received AudioCallOffer from:', fromUserId);
      console.log('📞 Current peerConnection:', peerConnectionRef.current ? 'exists' : 'null');
      console.log('📞 isCallerRef:', isCallerRef.current);
      console.log('📞 callerInfo:', callerInfo);
      
      if (fromUserId === otherUserId || fromUserId === callerInfo?.userId) {
        // If peer connection is not ready yet, store the offer
        if (!peerConnectionRef.current) {
          console.log('⏳ Peer connection not ready, storing offer for later processing (audio)');
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
            console.log('✅ Processing offer with peer connection (audio)');
            console.log('📞 Current signaling state:', pc.signalingState);
            
            // Check if we're in the correct state (should be "stable" for receiver)
            if (pc.signalingState !== 'stable') {
              // If we already have a remote offer, this is likely a duplicate
              if (pc.signalingState === 'have-remote-offer') {
                console.log('⚠️ Already have remote offer, ignoring duplicate (audio)');
                return;
              }
              // If we're in have-local-pranswer or have-remote-pranswer, connection is already established
              if (pc.signalingState === 'have-local-pranswer' || pc.signalingState === 'have-remote-pranswer') {
                console.log('⚠️ Connection already established, ignoring duplicate offer (audio)');
                return;
              }
              // If we're in have-local-offer, we're the caller, shouldn't process offer
              if (pc.signalingState === 'have-local-offer') {
                console.log('⚠️ We are the caller, ignoring offer (audio)');
                return;
              }
              console.warn(`⚠️ Unexpected signaling state: ${pc.signalingState}, expected 'stable'`);
            }
            
            // Check if this is the same offer we already processed (from pendingOfferRef)
            if (pendingOfferRef.current && 
                pendingOfferRef.current.fromUserId === fromUserId &&
                JSON.stringify(pendingOfferRef.current.offer) === JSON.stringify(offer)) {
              console.log('⚠️ This offer was already processed from pending, ignoring duplicate (audio)');
              return;
            }
            
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            console.log('✅ Remote description set (audio)');
            console.log('📞 Signaling state after setRemoteDescription:', pc.signalingState);
            
            const answer = await pc.createAnswer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: false,
              voiceActivityDetection: true
            });
            console.log('✅ Answer created (audio)');
            
            await pc.setLocalDescription(answer);
            console.log('✅ Local description set (audio)');
            console.log('📞 Signaling state after setLocalDescription:', pc.signalingState);
            
            // Clear pending offer since we've processed it
            pendingOfferRef.current = null;
            
            const targetUserId = fromUserId === otherUserId ? otherUserId : callerInfo?.userId;
            if (targetUserId) {
              // Send answer without blocking - fire and forget for faster response
              conversationSignalRService.sendAudioCallAnswer(conversationId, targetUserId, answer)
                .catch(error => console.error('❌ Error sending answer (audio):', error));
              console.log('✅ Answer sent to:', targetUserId, '(audio)');
            }
          } catch (error) {
            console.error('❌ Error handling offer (audio):', error);
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
          console.warn('⚠️ Cannot process offer: peerConnection not ready or is caller (audio)');
          // Store offer for later if peer connection is being created
          if (!isCallerRef.current) {
            console.log('💾 Storing offer to process later (audio)');
            pendingOfferRef.current = { offer, fromUserId };
          }
        }
      }
    });

    // Listen for answer (when calling)
    const unsubscribeAnswer = conversationSignalRService.onAudioCallAnswer(async (answer) => {
      console.log('✅ Received AudioCallAnswer');
      console.log('📞 Current peerConnection:', peerConnectionRef.current ? 'exists' : 'null');
      console.log('📞 isCallerRef:', isCallerRef.current);
      console.log('📞 hasSetRemoteAnswerRef:', hasSetRemoteAnswerRef.current);
      console.log('📞 isProcessingAnswerRef:', isProcessingAnswerRef.current);
      
      // Prevent concurrent processing
      if (isProcessingAnswerRef.current) {
        console.log('⚠️ Already processing an answer, ignoring duplicate (audio)');
        return;
      }
      
      if (!peerConnectionRef.current || !isCallerRef.current) {
        console.warn('⚠️ Cannot process answer: peerConnection not ready or not caller (audio)');
        return;
      }
      
      const pc = peerConnectionRef.current;
      console.log('📞 Current signaling state:', pc.signalingState);
      console.log('📞 Current connection state:', pc.connectionState);
      console.log('📞 remoteDescription:', pc.remoteDescription ? 'exists' : 'null');
      
      // CRITICAL: Check if answer was already processed BEFORE entering try block
      // This prevents race conditions where multiple answers arrive simultaneously
      if (hasSetRemoteAnswerRef.current) {
        console.log('⚠️ Remote answer already set (flag), ignoring duplicate answer (audio)');
        return;
      }
      
      // If signaling state is 'stable' and we have remote description, answer was already set
      if (pc.signalingState === 'stable' && pc.remoteDescription) {
        console.log('⚠️ Signaling state is stable and remote description exists, answer already processed (audio)');
        hasSetRemoteAnswerRef.current = true; // Mark as set to prevent future duplicates
        return;
      }
      
      // If signaling state is 'stable' but no remote description, something is wrong
      // Don't process - this might be a stale answer
      if (pc.signalingState === 'stable' && !pc.remoteDescription) {
        console.log('⚠️ Signaling state is stable but no remote description - might be stale answer, ignoring (audio)');
        return;
      }
      
      // Set processing flag IMMEDIATELY to prevent concurrent processing
      isProcessingAnswerRef.current = true;
      
      try {
        // Final check before setting remote description - must be in 'have-local-offer' state
        if (pc.signalingState !== 'have-local-offer') {
          console.warn(`⚠️ Wrong signaling state: ${pc.signalingState}, expected 'have-local-offer'`);
          
          // If we're in stable state, the offer might have been lost or connection reset
          // The answer we received is likely stale (for an old offer)
          if (pc.signalingState === 'stable') {
            console.log('🔄 Signaling state is stable - answer is likely stale, recreating offer (audio)...');
            console.log('⚠️ Ignoring stale answer and will wait for new answer to new offer');
            try {
              const newOffer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false,
                iceRestart: false
              });
              await pc.setLocalDescription(newOffer);
              console.log('✅ Recreated offer and set local description (audio)');
              
              // Send the new offer to the other user
              const targetUserId = otherUserId || callerInfo?.userId;
              if (targetUserId && conversationId) {
                await conversationSignalRService.sendAudioCallOffer(conversationId, targetUserId, newOffer);
                console.log('✅ New offer sent, waiting for new answer (audio)');
              }
              
              // Don't try to set the stale answer - it doesn't match the new offer
              // We'll wait for a new answer to arrive
              // Reset processing flag since we're returning early
              isProcessingAnswerRef.current = false;
              return;
            } catch (recreateError) {
              console.error('❌ Error recreating offer (audio):', recreateError);
              throw recreateError;
            }
          } else {
            // Wait a bit and retry if in transitioning state
            console.log('⏳ Waiting for signaling state to be ready (audio)...');
            let retries = 0;
            const initialState = pc.signalingState;
            while (pc.signalingState === initialState && retries < 10) {
              await new Promise(resolve => setTimeout(resolve, 100));
              retries++;
            }
            
            // Try to set remote description if state changed to the correct one
            if (pc.signalingState === 'have-local-offer' as RTCSignalingState) {
              // Check if already set to prevent duplicate
              if (hasSetRemoteAnswerRef.current) {
                console.log('⚠️ Remote answer already set, ignoring (audio)');
                isProcessingAnswerRef.current = false; // Reset flag before return
                return;
              }
              try {
                // Final check: if remote description already exists, don't set again
                if (pc.remoteDescription) {
                  console.log('⚠️ Remote description already exists (after wait), answer already processed (audio)');
                  hasSetRemoteAnswerRef.current = true;
                  isProcessingAnswerRef.current = false; // Reset flag before return
                  return;
                }
                
                // Set flag BEFORE setting remote description to prevent race condition
                hasSetRemoteAnswerRef.current = true;
                
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                console.log('✅ Remote description set from answer (after wait - audio)');
                console.log('📞 Signaling state after setRemoteDescription:', pc.signalingState);
                console.log('📞 Remote description exists:', !!pc.remoteDescription);
              } catch (error) {
                throw new Error(`Cannot set remote answer: signaling state is ${pc.signalingState}, error: ${error}`);
              }
            } else {
              throw new Error(`Cannot set remote answer: signaling state is ${pc.signalingState}, expected 'have-local-offer'`);
            }
          }
        } else {
          // Normal case: we're in the correct state
          // Double-check signaling state before setting remote description
          if (pc.signalingState !== 'have-local-offer') {
            console.warn(`⚠️ Unexpected signaling state in normal case: ${pc.signalingState}, expected 'have-local-offer'`);
            
            // If we're in stable state, recreate offer
            if (pc.signalingState === 'stable') {
              console.log('🔄 Signaling state is stable in normal case - recreating offer (audio)...');
              try {
                const newOffer = await pc.createOffer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: false,
                  iceRestart: false
                });
                await pc.setLocalDescription(newOffer);
                console.log('✅ Recreated offer and set local description (audio)');
                
                // Send the new offer to the other user
                const targetUserId = otherUserId || callerInfo?.userId;
                if (targetUserId && conversationId) {
                  await conversationSignalRService.sendAudioCallOffer(conversationId, targetUserId, newOffer);
                  console.log('✅ New offer sent, waiting for new answer (audio)');
                }
                
                // Don't try to set the stale answer
                isProcessingAnswerRef.current = false; // Reset flag before return
                return;
              } catch (recreateError) {
                console.error('❌ Error recreating offer in normal case (audio):', recreateError);
                throw recreateError;
              }
            } else {
              throw new Error(`Cannot set remote answer: signaling state is ${pc.signalingState}, expected 'have-local-offer'`);
            }
          }
          
          // Final verification before setting remote description
          // Double-check signaling state one more time to prevent race conditions
          if (pc.signalingState !== 'have-local-offer') {
            console.error(`❌ Signaling state changed before setting remote description: ${pc.signalingState}, expected 'have-local-offer'`);
            if (pc.signalingState === 'stable') {
              console.log('🔄 Signaling state is stable - recreating offer instead (audio)...');
              try {
                const newOffer = await pc.createOffer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: false,
                  iceRestart: false
                });
                await pc.setLocalDescription(newOffer);
                console.log('✅ Recreated offer and set local description (audio)');
                
                const targetUserId = otherUserId || callerInfo?.userId;
                if (targetUserId && conversationId) {
                  await conversationSignalRService.sendAudioCallOffer(conversationId, targetUserId, newOffer);
                  console.log('✅ New offer sent, waiting for new answer (audio)');
                }
                isProcessingAnswerRef.current = false; // Reset flag before return
                return;
              } catch (recreateError) {
                console.error('❌ Error recreating offer (audio):', recreateError);
                throw recreateError;
              }
            }
            throw new Error(`Cannot set remote answer: signaling state is ${pc.signalingState}, expected 'have-local-offer'`);
          }
          
          console.log('✅ Processing answer with peer connection (audio)');
          
          // Final check: if remote description already exists, don't set again
          if (pc.remoteDescription) {
            console.log('⚠️ Remote description already exists, answer already processed (audio)');
            hasSetRemoteAnswerRef.current = true;
            isProcessingAnswerRef.current = false; // Reset flag before return
            return;
          }
          
          // Set flag BEFORE setting remote description to prevent race condition
          // This ensures that if another answer arrives during setRemoteDescription,
          // it will be rejected
          hasSetRemoteAnswerRef.current = true;
          
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log('✅ Remote description set from answer (audio)');
          console.log('📞 Signaling state after setRemoteDescription:', pc.signalingState);
          console.log('📞 Remote description exists:', !!pc.remoteDescription);
        }
        
        // Process any pending ICE candidates now that remote description is set
        if (pendingIceCandidatesRef.current.length > 0) {
          console.log(`🧊 Processing ${pendingIceCandidatesRef.current.length} pending ICE candidates after answer (audio)`);
          const candidates = [...pendingIceCandidatesRef.current];
          pendingIceCandidatesRef.current = []; // Clear pending candidates
          
          for (const { candidate } of candidates) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
              console.log('✅ Pending ICE candidate added after answer (audio)');
            } catch (error) {
              console.error('❌ Error adding pending ICE candidate after answer (audio):', error);
              // Don't throw - continue processing other candidates
            }
          }
        }
        
        // Update UI state: caller has received answer, call is now active
        setIsInCall(true);
        setIsCalling(false);
        console.log('✅ Call state updated: answer received, call is active (audio)');
      } catch (error) {
        console.error('❌ Error handling answer (audio):', error);
        console.error('❌ Error details:', {
          name: (error as Error).name,
          message: (error as Error).message,
          signalingState: peerConnectionRef.current?.signalingState,
          connectionState: peerConnectionRef.current?.connectionState,
          hasRemoteDescription: !!peerConnectionRef.current?.remoteDescription
        });
        toast.error('Failed to process call answer');
        // Don't end call immediately - might be recoverable
        // Only end if it's a critical error
        if (error instanceof Error && error.name === 'InvalidStateError') {
          // This is the duplicate answer error - don't end call, just log
          console.log('⚠️ Duplicate answer error - call might still be active');
        } else {
          endCall();
        }
      } finally {
        // Always reset processing flag
        isProcessingAnswerRef.current = false;
      }
    });

    // Listen for ICE candidates
    const unsubscribeIce = conversationSignalRService.onIceCandidate(async (candidate, fromUserId) => {
      const targetUserId = otherUserId || callerInfo?.userId;
      console.log('🧊 Received ICE candidate from:', fromUserId, 'target:', targetUserId, '(audio)');
      
      if (fromUserId === targetUserId) {
        // If peer connection is not ready, store the candidate
        if (!peerConnectionRef.current) {
          console.log('⏳ Peer connection not ready, storing ICE candidate for later (audio)');
          pendingIceCandidatesRef.current.push({ candidate, fromUserId });
          return;
        }

        try {
          console.log('🧊 Adding ICE candidate to peer connection (audio)');
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('✅ ICE candidate added (audio)');
        } catch (error) {
          console.error('❌ Error adding ICE candidate (audio):', error);
          // Store candidate for retry if it's a temporary error
          if (peerConnectionRef.current.signalingState !== 'closed') {
            console.log('💾 Storing ICE candidate for retry (audio)');
            pendingIceCandidatesRef.current.push({ candidate, fromUserId });
          }
        }
      } else {
        console.warn('⚠️ Cannot add ICE candidate - wrong user (audio):', {
          fromUserId,
          targetUserId,
          hasPeerConnection: !!peerConnectionRef.current
        });
      }
    });

    // Listen for call ended - optimized for instant response
    const unsubscribeEnded = conversationSignalRService.onAudioCallEnded((userId) => {
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

