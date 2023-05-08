import './style.css'

const socket = io("http://localhost:4000");

socket.emit("ready", (res) => {
	console.log(res);
});

// console.log("script loaded!!")
