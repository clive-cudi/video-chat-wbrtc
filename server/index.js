const express = require('express');
const app = express();
const cors = require('cors');
const PORT = 4000;
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"]
	}
});
const { v4: uuid } = require('uuid');

app.use(cors());

app.get("/", (req, res) => {
	res.send("Hello Signaller!!");
});

/**
 * @type {{socketID: string, peerID: string}[]}
 */
let peers = [
	// {
	// 	peerID: "",
	// 	socketID: ""
	// }
];

io.on('connection', (socket) => {
	console.log(`EVENT: A user connected`);
	console.log(socket.id);

	// allocate a new peer id
	// peer should call emit a ready event
	socket.on('ready', (callback) => {
		const peerID = uuid();
		const socketID = socket.id;

		if (peers.includes({peerID: peerID})) {
			// safety
			socket.disconnect(true);
		};



		// add it to the list of peers
		peers = [...peers, {peerID: peerID, socketID: socketID}]

		callback({
			peerID,
			socketID
		});
		console.log("after callback");
		console.log(peers);
	});

	socket.on('disconnect', () => {
		console.log(`EVENT: A user disconnected!! socketID: ${socket.id}`);

		// cleanup the peer list when a user disconnects
		peers = peers.filter((_p) => _p.socketID !== socket.id);
	});
});

server.listen(PORT, () => {
	console.log(`server up on PORT: ${PORT}`)
});
