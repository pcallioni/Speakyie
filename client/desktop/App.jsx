import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

export default function App() {
  const localVideo = useRef();
  const remoteVideo = useRef();
  const [peer, setPeer] = useState(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      localVideo.current.srcObject = stream;
      socket.emit("join-room", "room1");

      socket.on("user-connected", userId => {
        const pc = new RTCPeerConnection();
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = e => {
          if (e.candidate) {
            socket.emit("signal", { to: userId, signal: { candidate: e.candidate } });
          }
        };

        pc.ontrack = e => (remoteVideo.current.srcObject = e.streams[0]);

        pc.createOffer().then(offer => {
          pc.setLocalDescription(offer);
          socket.emit("signal", { to: userId, signal: { offer } });
        });

        setPeer(pc);
      });

      socket.on("signal", async ({ from, signal }) => {
        if (signal.offer) {
          const pc = new RTCPeerConnection();
          stream.getTracks().forEach(track => pc.addTrack(track, stream));

          pc.onicecandidate = e => {
            if (e.candidate) {
              socket.emit("signal", { to: from, signal: { candidate: e.candidate } });
            }
          };

          pc.ontrack = e => (remoteVideo.current.srcObject = e.streams[0]);

          await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("signal", { to: from, signal: { answer } });
          setPeer(pc);
        } else if (signal.answer) {
          peer.setRemoteDescription(new RTCSessionDescription(signal.answer));
        } else if (signal.candidate) {
          peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      });
    });
  }, []);

  return (
    <div>
      <h1>Speakyie Prototype</h1>
      <video ref={localVideo} autoPlay muted width={300} />
      <video ref={remoteVideo} autoPlay width={300} />
    </div>
  );
}