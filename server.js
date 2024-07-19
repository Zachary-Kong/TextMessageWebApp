const path = require('path');
const fs = require('fs');
const express = require('express');
const cpen322 = require('./cpen322-tester.js');
const Database = require('./Database.js');
const SessionManager = require('./SessionManager.js');
const ws = require('ws');
const url = require('url');
const crypto = require('crypto');

const messageBlockSize = 10;

function logRequest(req, res, next){
	console.log(`${new Date()}  ${req.ip} : ${req.method} ${req.path}`);
	next();
}

const host = 'localhost';
const port = 3000;
const clientApp = path.join(__dirname, 'client');

// express app
let app = express();

app.use(express.json()) 						// to parse application/json
app.use(express.urlencoded({ extended: true })) // to parse application/x-www-form-urlencoded
app.use(logRequest);							// logging for debug

app.use(function (req, res, next) {
	if (req.path === "/login" || req.path === "/login.html" || req.path === "/style.css") {
		return next();
	}
	sessionManager.middleware(req, res, next);
});

// serve static files (client-side)
app.use('/', express.static(clientApp, { extensions: ['html', 'js'] }));

var sessionManager = new SessionManager();

app.route('/chat').get(function (req, res, next) {
	var promObj = db.getRooms();
	promObj.then( (value) => {
		chatrooms = value;
		var roomList = [];
		chatrooms.forEach(function (item, index) {
			if (!(item._id in messages)) {
				messages[item._id] = [];
			}
			roomList[index] = JSON.parse(JSON.stringify(item));
			roomList[index].messages = messages[roomList[index]._id];
		});
		res.status(200);
		res.send(JSON.stringify(roomList));
	});
}).post(function (req, res, next) {
	var obj = {
		name: req.body.name,
		image: req.body.image
	};
	var promObj = db.addRoom(obj);
	promObj.then( (value) => {
		chatrooms.push(value);
		messages[value._id] = [];
		res.status(200);
		res.send(JSON.stringify(value));
	}).catch( (err) => {
		res.status(400);
		res.send("Bad Request");
	});
});

app.route('/chat/:room_id').get(function (req, res, next) {
	var promObj = db.getRoom(req.params.room_id);
	promObj.then( (value) => {
		if (value) {
			res.status(200);
			res.send(JSON.stringify(value));
		} else {
			res.status(404);
			res.send("Room X was not found");
		}
	});
});

app.route('/chat/:room_id/messages').get(function (req, res, next) {
	var promObj = db.getLastConversation(req.params.room_id, req.query.before);
	promObj.then( (value) => {
		if (value) {
			res.status(200);
			res.send(JSON.stringify(value));
		} else {
			res.status(404);
			res.send("Room " + req.params.room_id + " was not found");
		}
	});
});

app.route('/login').post(function (req, res, next) {
	var promObj = db.getUser(req.body.username);
	promObj.then( (value) => {
		if (value) {
			if (isCorrectPassword(req.body.password, value.password)) {
				sessionManager.createSession(res, req.body.username);
				res.redirect("/");
			} else {
				res.redirect("/login");
			}
		} else {
			res.redirect("/login");
		}
	});
});

app.route('/profile').get(function (req, res, next) {
	res.send({username: req.username});
});

app.route('/logout').get(function (req, res, next) {
	sessionManager.deleteSession(req);
	res.redirect("/login");
});

app.use(function (err, req, res, next) {
	if (err instanceof SessionManager.Error) {
		if (req.headers.accept === "application/json") {
			res.status(401).send();
			return next();
		} else {
			res.redirect("/login");
			return next();
		}
	} else {
		res.status(500).send();
		return next();
	}
});

function isCorrectPassword(password, saltedHash) {
	var saltedPassword = password.concat(saltedHash.substring(0,20));
	var hash = crypto.createHash('sha256').update(saltedPassword).digest('base64');
	if (hash === saltedHash.substring(20)) {
		return true;
	}
	return false;
}

var db = new Database("mongodb://localhost:27017", "cpen322-messenger");

var chatrooms = [];
var messages = {};

var promObj = db.getRooms();
promObj.then( (value) => {
	chatrooms = value;
	chatrooms.forEach(function each(room) {
		messages[room._id] = [];
	});
});

var idCounter = 0;
var broker = new ws.WebSocketServer({ port: 8000 });
broker.on('connection', function connection(socket, request) {
	var found = false;
	var cookie = request.headers.cookie;
	if (cookie) {
		var cookies = cookie.split('=').join('; ').split('; ');
		cookies.forEach(function (item, index) {
			var username = sessionManager.getUsername(item);
			if (username) {
				socket.username = username;
				found = true;
			}
		});
	}
	if (!found) {
		socket.close();
		return;
	}

	socket.id = idCounter;
	idCounter++;
	socket.on('message', function incoming(message) {
		var messageObj = JSON.parse(message);
		if (messageObj.text.search(/<[^>]*>/g) != -1) {
			messageObj.text = "";
		}
		messageObj.username = socket.username;
		messages[messageObj.roomId].push({username: messageObj.username, text: messageObj.text});
		broker.clients.forEach(function each(client) {
			if (socket.id !== client.id) {
				client.send(JSON.stringify(messageObj));
			}
		});
		if (messages[messageObj.roomId].length == messageBlockSize) {
			var conversation = {
				room_id: messageObj.roomId,
				timestamp: Date.now(),
				messages: messages[messageObj.roomId]
			};
			var promObj = db.addConversation(conversation);
			promObj.then( (value) => {
				messages[messageObj.roomId] = [];
			});
		}
	});
});

app.listen(port, () => {
	console.log(`${new Date()}  App Started. Listening on ${host}:${port}, serving ${clientApp}`);
});

cpen322.connect('http://99.79.42.146/cpen322/test-a5-server.js');
cpen322.export(__filename, {app, chatrooms, messages, broker, db, messageBlockSize, sessionManager, isCorrectPassword});