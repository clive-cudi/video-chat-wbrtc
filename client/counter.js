import './style.css'

const userID = `user_${Math.floor(Math.random() * 100)}`;
const socket = io("http://localhost:4000");

const iceServers = {
	iceServers: [
	  {
		urls: ["stun:stun.l.google.com:19302"]
	  }
	],
	iceCandidatePoolSize: 10
};

let pc = new RTCPeerConnection(iceServers);
let localStream = null;
let remoteStream = null;

// html elements
const webcamBtn = document.getElementById("webcam-btn");
const peerIDInput = document.getElementById("peer-id");
const callBtn = document.getElementById("call-btn");
const answerBtn = document.getElementById("answer-btn");
const callerIDInput = document.getElementById("caller-id");
const peerID_display = document.getElementById("peer-id-display");
const localVideo = document.getElementById("local-video-stream");
const remoteVideo = document.getElementById("remote-video-stream");

peerID_display.textContent = `Peer ID: ${userID}`;

async function startWebcam() {
	// logic for media stream
	localStream = await navigator.mediaDevices.getUserMedia({
		video: true,
		audio: true
	});
	remoteStream = new MediaStream();

	// push local tracks to peer connection
	localStream.getTracks().forEach((track) => {
		pc.addTrack(track, localStream);
	});

	// add remote tracks to local
	pc.ontrack = (e) => {
		e.streams[0].getTracks().forEach((track) => {
			remoteStream.addTrack(track);
		})
	}

	// append to DOM
	localVideo.srcObject = localStream;
	remoteVideo.srcObject = remoteStream;


	peerIDInput.removeAttribute("disabled"); 

	return;
}

webcamBtn.onclick = (e) => {
	startWebcam();
}

let peerID = "";

peerIDInput.onchange = (e) => {
	peerID = e.target.value;
}

async function createOffer() {
	const offerDescription = await pc.createOffer();

	// set the local description
	await pc.setLocalDescription(offerDescription);

	return offerDescription;
}

async function createAnswer(offer) {
	const session_description = new RTCSessionDescription(offer);
	await pc.setRemoteDescription(session_description);

	// create an answer
	const answer = await pc.createAnswer();

	await pc.setLocalDescription(answer);

	return answer;
}

callBtn.onclick = async () => {
	console.log(peerID);
	const offer = await createOffer();

	// send the offer to target peer
	socket.emit("message", {type: "offer", content: offer, from: userID}, peerID);

	// start signalling potential ICE candidates
	pc.onicecandidate = (e) => {
		socket.emit("message", {type: "ice", content: e.candidate, from: userID}, peerID);
	}
}


socket.emit("ready", userID, (res) => {
	console.log(res);
});

// console.log("script loaded!!");

socket.on("message", async (message) => {
	console.log(message);
	switch (message?.type) {
		case "offer":
			const answer = await createAnswer(message.content);

			socket.emit("message", {type: "answer", content: answer, from: userID}, message?.from);

			pc.onicecandidate = (e) => {
				socket.emit("message", {type: "ice", content: e.candidate, from: userID}, message?.from);
			}
			return;
		case "answer":
			const receivedAnswer = message?.content ?? null;

			if (receivedAnswer) {
				const remote_session_description = new RTCSessionDescription(receivedAnswer);

				pc.setRemoteDescription(remote_session_description);
			}
			return;
		case "ice":
			const ice_candidate = message?.content ?? null;

			if (ice_candidate) {
				pc.addIceCandidate(new RTCIceCandidate(ice_candidate));
			}
		default:
			return;
	}
});

let sample_message = {
	type: "offer" | "answer",
	content: "",
	from: "",
	to: ""
}


function sendMessage(id, msg) {
	socket.emit("message", msg, id);
}
