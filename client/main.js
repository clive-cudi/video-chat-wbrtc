import './style.css'
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAFHPUnPKZT6D9pFi4Ryf1mdpiTjsfnMPQ",
  authDomain: "video-chat-wbrtc.firebaseapp.com",
  projectId: "video-chat-wbrtc",
  storageBucket: "video-chat-wbrtc.appspot.com",
  messagingSenderId: "819418105045",
  appId: "1:819418105045:web:64e2724c563b3534b6ce5c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const store = getFirestore(app);

const iceServers = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302"]
    }
  ],
  iceCandidatePoolSize: 10
}

let pc = new RTCPeerConnection(iceServers);
let localStream = null;
let remoteStream = null;

// HTML elements
const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');

webcamButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
  remoteStream = new MediaStream();

  // push local track to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // pull tracks from remote stream to local receipient video
  pc.ontrack = e => {
    e.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  }

  // update video elements
  webcamVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;

  callButton.disabled = false;
  answerButton.disabled = false;
  webcamButton.disabled = true;
};


// create an offer
callButton.onclick = async () => {
  const callDoc = store.collection(`calls`).doc();

  const offerCandidates = callDoc.collection("offerCandidates");
  const answerCandidates = callDoc.collection("answerCandidates");

  callInput.value = callDoc.id;

  // candidates for caller
  pc.onicecandidate = e => {
    e.candidate && offerCandidates.add(e.candidate.toJSON());
  }
 
  // offer
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type
  }

  await callDoc.set({offer});

  // listen for remote answer
  callDoc.onSnapshot((snap) => {
    const data = snap.data();

    if (!pc.currentLocalDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());

        pc.addIceCandidate(candidate);
      }
    })
  })

  hangupButton.disabled = false;
};

answerButton.onclick = async () => {
  const callID = callInput.value;
  const callDoc = store.collection('calls').doc(callID);
  
  const answerCandidates = callDoc.collection('answerCandidates');

  pc.onicecandidate = e => {
    e.candidate && answerCandidates.add(e.candidate.toJSON());
  };

  const callData = (await callDoc.get()).data();

  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp
  }

  await callDoc.update({answer});

  offerCandidates.onSnapshot((_snapshot) => {
    _snapshot.docChanges().forEach((change) => {
      console.log(change);

      if (change.type === 'added') {
        let data = change.doc.data();

        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    })
  })
}