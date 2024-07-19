var Service = {};
Service.origin = window.location.origin;
Service.getAllRooms = function () {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", Service.origin + "/chat");
        xhr.onload = function() {
            if (xhr.status == 200) {
                resolve(JSON.parse(xhr.response));
            } else {
                reject(new Error(xhr.response));
            }
        };		
        xhr.ontimeout = function() {
            reject(new Error(xhr.response));
        }
        xhr.onerror = function() {
            reject(new Error(xhr.response));
        };  
        xhr.onabort = function() {
            reject(new Error(xhr.response));
        };
        // All the handlers are setup, so send the message
        xhr.timeout = 5000;	 // Wait at most 5000 ms for a response
        xhr.send();
    });
};
Service.addRoom = function (data) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", Service.origin + "/chat");
        xhr.onload = function() {
            if (xhr.status == 200) {
                resolve(JSON.parse(xhr.response));
            } else {
                reject(new Error(xhr.response));
            }
        };		
        xhr.ontimeout = function() {
            reject(new Error(xhr.response));
        }
        xhr.onerror = function() {
            reject(new Error(xhr.response));
        };  
        xhr.onabort = function() {
            reject(new Error(xhr.response));
        };
        // All the handlers are setup, so send the message
        xhr.timeout = 5000;	 // Wait at most 5000 ms for a response
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(data));
    });
};
Service.getLastConversation = function (room_id, before) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", Service.origin + "/chat/" + room_id + "/messages?before=" + before);
        xhr.onload = function() {
            if (xhr.status == 200) {
                resolve(JSON.parse(xhr.response));
            } else {
                reject(new Error(xhr.response));
            }
        };
        xhr.ontimeout = function() {
            reject(new Error(xhr.response));
        }
        xhr.onerror = function() {
            reject(new Error(xhr.response));
        };  
        xhr.onabort = function() {
            reject(new Error(xhr.response));
        };
        // All the handlers are setup, so send the message
        xhr.timeout = 5000;	 // Wait at most 5000 ms for a response
        xhr.send();
    });
};
Service.getProfile = function () {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", Service.origin + "/profile");
        xhr.onload = function() {
            if (xhr.status == 200) {
                resolve(JSON.parse(xhr.response));
            } else {
                reject(new Error(xhr.response));
            }
        };
        xhr.ontimeout = function() {
            reject(new Error(xhr.response));
        }
        xhr.onerror = function() {
            reject(new Error(xhr.response));
        };  
        xhr.onabort = function() {
            reject(new Error(xhr.response));
        };
        // All the handlers are setup, so send the message
        xhr.timeout = 5000;	 // Wait at most 5000 ms for a response
        xhr.send();
    });
};

// Removes the contents of the given DOM element (equivalent to elem.innerHTML = '' but faster)
function emptyDOM (elem){
    while (elem.firstChild) elem.removeChild(elem.firstChild);
}

// Creates a DOM element from the given HTML string
function createDOM (htmlString){
    let template = document.createElement('template');
    template.innerHTML = htmlString.trim();
    return template.content.firstChild;
}

class LobbyView {
    constructor (lobby) {
        this.lobby = lobby;
        this.elem = createDOM(
            `<div class = "content">
                <ul class = "room-list">
                </ul>
                <div class = "page-control">
                    <input type = "text">
                    <button>Create Room</button>
                </div>
            </div>`
        );
        this.listElem = this.elem.querySelector("ul.room-list");
        this.inputElem = this.elem.querySelector("input");
        this.buttonElem = this.elem.querySelector("button");

        this.redrawList();

        var listElem = this.listElem;

        this.lobby.onNewRoom = function (room) {
            var roomElem = createDOM(
                `<li>
                    <a href = "#/chat/` + room.id + `">
                        <img src = "` + room.image + `">
                        ` + room.name + `
                    </a>
                <li>`
            );
            listElem.appendChild(roomElem);
        }

        this.buttonElem.addEventListener('click', event => {
            var text = this.inputElem.value;
            this.inputElem.value = "";
            var promObj = Service.addRoom({name: text, image: "assets/everyone-icon.png"});
            promObj.then( (value) => {
                this.lobby.addRoom(value._id, value.name, value.image);
            });
        });
    }

    redrawList () {
        emptyDOM(this.listElem);
        for (var [key, value] of Object.entries(this.lobby.rooms)) {
            var roomElem = createDOM(
                `<li>
                    <a href = "#/chat/` + value.id + `">
                        <img src = "` + value.image + `">
                        ` + value.name + `
                    </a>
                <li>`
            );
            this.listElem.appendChild(roomElem);
        }
    }
}

class ChatView {
    constructor (socket) {
        this.elem = createDOM(
            `<div class = "content">
                <h4 class = "room-name">Everyone in CPEN400A</h4>
                <div class = "message-list">
                </div>
                <div class = "page-control">
                    <textarea></textarea>
                    <button>Send</button>
                </div>
            </div>`
        );
        this.titleElem = this.elem.querySelector("h4.room-name");
        this.chatElem = this.elem.querySelector("div.message-list");
        this.inputElem = this.elem.querySelector("textarea");
        this.buttonElem = this.elem.querySelector("button");

        this.room = null;

        var self = this;
        this.buttonElem.addEventListener('click', event => {
            self.sendMessage();
        });
        this.inputElem.addEventListener('keyup', function (e) {
            if (e.keyCode === 13 && !e.shiftKey) {
                self.sendMessage();
            }
        });

        this.socket = socket;
        
        this.chatElem.addEventListener('wheel', function (e) {
            if (self.room.canLoadConversation && self.chatElem.scrollTop == 0 && e.deltaY < 0) {
                var promObj = self.room.getLastConversation.next().value;
                promObj.then( (value) => {
                    self.room.onFetchConversation(value);
                });
            }
        });
    }

    sendMessage () {
        var text = this.inputElem.value;
        this.room.addMessage(profile.username, text);
        this.inputElem.value = "";
        this.socket.send(JSON.stringify({roomId: this.room.id, text: text}));
    }

    setRoom (room) {
        this.room = room;
        this.titleElem.innerText = room.name;
        emptyDOM(this.chatElem);
        for (var message of this.room.messages) {
            if (message.text.search(/<[^>]*>/g) != -1) {
                message.text = "";
            }

            if (message.username === profile.username) {
                var messageElem = createDOM(
                    `<div class = "message my-message">
                        <span class = "message-user">` + message.username + `</span>
                        <span class = "message-text">` + message.text + `</span>
                    </div>`
                );
                this.chatElem.appendChild(messageElem)
            } else {
                var messageElem = createDOM(
                    `<div class = "message">
                        <span class = "message-user">` + message.username + `</span>
                        <span class = "message-text">` + message.text + `</span>
                    </div>`
                );
                this.chatElem.appendChild(messageElem)
            }
        }
        
        var self = this;
        this.room.onNewMessage = function (message) {
            if (message.text.search(/<[^>]*>/g) != -1) {
                message.text = "";
            }

            if (message.username === profile.username) {
                var messageElem = createDOM(
                    `<div class = "message my-message">
                        <span class = "message-user">` + message.username + `</span>
                        <span class = "message-text">` + message.text + `</span>
                    </div>`
                );
                self.chatElem.appendChild(messageElem);
            } else {
                var messageElem = createDOM(
                    `<div class = "message">
                        <span class = "message-user">` + message.username + `</span>
                        <span class = "message-text">` + message.text + `</span>
                    </div>`
                );
                self.chatElem.appendChild(messageElem);
            }
        }

        this.room.onFetchConversation = function (conversation) {
            var scrollHeight = self.chatElem.scrollHeight;

            for (var i = conversation.messages.length - 1; i >= 0; i--) {
                var message = conversation.messages[i];
                if (message.text.search(/<[^>]*>/g) != -1) {
                    message.text = "";
                }

                if (message.username === profile.username) {
                    var messageElem = createDOM(
                        `<div class = "message my-message">
                            <span class = "message-user">` + message.username + `</span>
                            <span class = "message-text">` + message.text + `</span>
                        </div>`
                    );
                    self.chatElem.insertBefore(messageElem, self.chatElem.childNodes[0]);
                } else {
                    var messageElem = createDOM(
                        `<div class = "message">
                            <span class = "message-user">` + message.username + `</span>
                            <span class = "message-text">` + message.text + `</span>
                        </div>`
                    );
                    self.chatElem.insertBefore(messageElem, self.chatElem.childNodes[0]);
                }
            }

            self.chatElem.scrollTop = self.chatElem.scrollHeight - scrollHeight;
        }

        var promObj = self.room.getLastConversation.next().value;
        promObj.then( (value) => {
            self.room.onFetchConversation(value);
        });
    }
}

class ProfileView {
    constructor () {
        this.elem = createDOM(
            `<div class = "content">
                <div class = "profile-form">
                    <div class = "form-field">
                        <label>Username</label>
                        <input type = "text">
                    </div>
                    <div class = "form-field">
                        <label>Password</label>
                        <input type = "password">
                    </div>
                    <div class = "form-field">
                        <label>Avatar Image</label>
                        <input type = "file">
                    </div>
                </div>
                <div class = "page-control">
                    <button>Save</button>
                </div>
            </div>`
        );
    }
}

class Room {
    constructor (id, name, image="assets/everyone-icon.png", messages=[]) {
        this.id = id;
        this.name = name;
        this.image = image;
        this.messages = messages;
        this.dateCreated = Date.now();
        this.getLastConversation = makeConversationLoader(this);
        this.canLoadConversation = true;
    }

    addMessage (username, text) {
        if (!text || !text.trim()) {
            return;
        }
        var message = {
            username: username,
            text: text
        };

        if (message.text.search(/<[^>]*>/g) != -1) {
            message.text = "";
        }
        this.messages.push(message);

        if (typeof this.onNewMessage === "function") {
            this.onNewMessage(message);
        }
    }

    addConversation(conversation) {
        if (!conversation.messages) {
            return;
        }
        for (var i = conversation.messages.length - 1; i >= 0; i--) {
            this.messages.unshift(conversation.messages[i]);
        }
        this.onFetchConversation(conversation);
    }
}

function* makeConversationLoader(room) {
    var lastConversation;
    do {
        yield new Promise(function (resolve, reject) {
            room.canLoadConversation = false;
            if (lastConversation) {
                var promObj = Service.getLastConversation(room.id, lastConversation.timestamp);
            } else {
                var promObj = Service.getLastConversation(room.id, room.dateCreated);
            }
            promObj.then( (value) => {
                lastConversation = value;
                if (lastConversation) {
                    room.canLoadConversation = true;
                    room.addConversation(lastConversation);
                    resolve(lastConversation);
                }
                resolve(null);
            });
        });
    } while (room.canLoadConversation);
}

class Lobby {
    constructor () {
        this.rooms = [];
        // this.rooms["room-1"] = new Room("room-1", "Everyone in CPEN400A", "assets/everyone-icon.png");
        // this.rooms["room-2"] = new Room("room-2", "Foodies", "assets/bibimbap.jpg");
        // this.rooms["room-3"] = new Room("room-3", "Gamers Unite", "assets/minecraft.jpg");
        // this.rooms["room-4"] = new Room("room-4", "Canucks Fans", "assets/canucks.png");
    }

    getRoom (roomId) {
        return this.rooms[roomId];
    }

    addRoom (id, name, image, messages) {
        this.rooms[id] = new Room(id, name, image, messages);

        if (typeof this.onNewRoom === "function") {
            this.onNewRoom(this.rooms[id]);
        }
    }
}

var profile = undefined;

function main () {
    window.addEventListener('load', main);

    var lobby = new Lobby();
    var lobbyView = new LobbyView(lobby);
    
    var socket = new WebSocket("ws://localhost:8000");
    socket.addEventListener('message', function (event) {
        var room = lobby.getRoom(JSON.parse(event.data).roomId);
        if (room) {
            room.addMessage(JSON.parse(event.data).username, JSON.parse(event.data).text);
        }
    });
    var chatView = new ChatView(socket);

    var profileView = new ProfileView();

    function renderRoute () {
        var hash = window.location.hash;
        var pageView = document.getElementById("page-view")
        if (hash == "" || hash.split("/")[1] == "") {
            emptyDOM(pageView);
            pageView.appendChild(lobbyView.elem);
        } else if (hash.split("/")[1] == "chat") {
            emptyDOM(pageView);
            pageView.appendChild(chatView.elem);
            var chatID = hash.split("/")[2];
            var chat = lobby.getRoom(chatID);
            chatView.setRoom(chat);
        } else if (hash.split("/")[1] == "profile") {
            emptyDOM(pageView);
            pageView.appendChild(profileView.elem);
        }
    };

    renderRoute();
    window.addEventListener('popstate', renderRoute);

    function refreshLobby () {
        var promObj = Service.getAllRooms();
        promObj.then( (value) => {
            value.forEach(function (item, index) {
                var oldRoom = lobby.getRoom(item._id);
                if (oldRoom) {
                    oldRoom.name = item.name;
                    oldRoom.image = item.image;
                } else {
                    lobby.addRoom(item._id, item.name, item.image, item.messages);
                }
            });
        });
    }

    refreshLobby();
    var intervalId = setInterval(refreshLobby, 5000);

    var promObj = Service.getProfile();
    promObj.then( (value) => {
        profile = value;
    });

    cpen322.export(arguments.callee, {
        renderRoute: renderRoute,
        lobbyView: lobbyView,
        chatView: chatView,
        profileView: profileView,
        lobby: lobby,
        refreshLobby: refreshLobby,
        socket: socket
    });
}

window.addEventListener('load', main);