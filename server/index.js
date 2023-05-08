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

app.use(cors());

app.get("/", (req, res) => {
	res.send("Hello Signaller!!");
});

io.on('connection', (socket) => {
	console.log(`EVENT: A user connected`);

	socket.on('disconnect', () => {
		console.log(`EVENT: A user disconnected!!`)
	});
});

server.listen(PORT, () => {
	console.log(`server up on PORT: ${PORT}`)
});
