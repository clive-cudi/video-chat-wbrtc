import './style.css'

const socket = io("localhost:4000");

socket.on('connection', (socket_event) => {
	console.log(socket_event.id);
});

// console.log("script loaded!!")
