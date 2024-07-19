const { MongoClient, ObjectID } = require('mongodb');	// require the mongodb driver

/**
 * Uses mongodb v3.6+ - [API Documentation](http://mongodb.github.io/node-mongodb-native/3.6/api/)
 * Database wraps a mongoDB connection to provide a higher-level abstraction layer
 * for manipulating the objects in our cpen322 app.
 */
function Database(mongoUrl, dbName){
	if (!(this instanceof Database)) return new Database(mongoUrl, dbName);
	this.connected = new Promise((resolve, reject) => {
		MongoClient.connect(
			mongoUrl,
			{
				useNewUrlParser: true
			},
			(err, client) => {
				if (err) reject(err);
				else {
					console.log('[MongoClient] Connected to ' + mongoUrl + '/' + dbName);
					resolve(client.db(dbName));
				}
			}
		)
	});
	this.status = () => this.connected.then(
		db => ({ error: null, url: mongoUrl, db: dbName }),
		err => ({ error: err })
	);
}

Database.prototype.getRooms = function(){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			/* TODO: read the chatrooms from `db`
			 * and resolve an array of chatrooms */
            db.collection("chatrooms").find({}).toArray(function(err, result) {
				if (err) {
					reject(err);
				};
				resolve(result);
			});
		})
	)
}

Database.prototype.getRoom = function(room_id){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			/* TODO: read the chatroom from `db`
			 * and resolve the result */
			try {
				db.collection("chatrooms").find({_id: new ObjectID(room_id)}).toArray(function(err, result) {
					if (err) {
						reject(err);
					};
					if (result.length > 0) {
						resolve(result[0]);
					}
				});
			} catch (e) { }
            db.collection("chatrooms").find({_id: room_id}).toArray(function(err, result) {
				if (err) {
					reject(err);
				};
				resolve(result[0]);
			});
		})
	)
}

Database.prototype.addRoom = function(room){
	return this.connected.then(db => 
		new Promise((resolve, reject) => {
			/* TODO: insert a room in the "chatrooms" collection in `db`
			 * and resolve the newly added room */
			if (typeof room.name === 'undefined' || room.name === null) {
				reject("Bad Request");
			}
			db.collection("chatrooms").insertOne(room, function(err, result) {
				if (err) {
					reject(err);
				};
				db.collection("chatrooms").find({_id: result.insertedId}).toArray(function(err, result) {
					if (err) {
						reject(err);
					};
					resolve(result[0]);
				});
			});
		})
	)
}

Database.prototype.getLastConversation = function(room_id, before){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			/* TODO: read a conversation from `db` based on the given arguments
			 * and resolve if found */
			if (!before) {
				before = Date.now();
			}
			try {
				db.collection("conversations").find({room_id: new ObjectID(room_id)}).toArray(function(err, result) {
					if (err) {
						reject(err);
					};
					if (result.length > 0) {
						var latest = undefined;
						result.forEach(function each(conversation) {
							if (conversation.timestamp < before) {
								if (!latest || latest.timestamp < conversation.timestamp) {
									latest = conversation;
								}
							}
						});
						resolve(latest);
					}
				});
			} catch (e) { }
            db.collection("conversations").find({room_id: room_id}).toArray(function(err, result) {
				if (err) {
					reject(err);
				};
				var latest = undefined;
				result.forEach(function each(conversation) {
					if (conversation.timestamp < before) {
						if (!latest || latest.timestamp < conversation.timestamp) {
							latest = conversation;
						}
					}
				});
				resolve(latest);
			});
		})
	)
}

Database.prototype.addConversation = function(conversation){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			if (typeof conversation.room_id === 'undefined' || conversation.room_id === null ||
				typeof conversation.timestamp === 'undefined' || conversation.timestamp === null ||
				typeof conversation.messages === 'undefined' || conversation.messages === null) {
				reject("Bad Request");
			}
			db.collection("conversations").insertOne(conversation, function(err, result) {
				if (err) {
					reject(err);
				};
				db.collection("conversations").find({_id: result.insertedId}).toArray(function(err, result) {
					if (err) {
						reject(err);
					};
					resolve(result[0]);
				});
			});
		})
	)
}

Database.prototype.getUser = function(username){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			db.collection("users").find({username: username}).toArray(function(err, result) {
				if (err) {
					reject(err);
				};
				if (result.length > 0) {
					resolve(result[0]);
				} else {
					resolve(null);
				}
			});
		})
	)
}

module.exports = Database;