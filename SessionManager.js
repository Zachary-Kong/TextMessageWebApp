const crypto = require('crypto');
const e = require('express');

class SessionError extends Error {};

function SessionManager (){
	// default session length - you might want to
	// set this to something small during development
	const CookieMaxAgeMs = 600000;

	// keeping the session data inside a closure to keep them protected
	const sessions = {};

	// might be worth thinking about why we create these functions
	// as anonymous functions (per each instance) and not as prototype methods
	this.createSession = (response, username, maxAge = CookieMaxAgeMs) => {
		/* To be implemented */
        var token = crypto.randomBytes(256).toString('hex');
		session = {
            username: username,
            timeCreated: Date.now()
        };
        sessions[token] = session;
        response.cookie("cpen322-session", token, { maxAge: maxAge });
		setTimeout (function() {
			delete sessions[token];
		}, maxAge);
	};

	this.deleteSession = (request) => {
		/* To be implemented */
		var cookie = request.session;
		delete sessions[cookie];
		delete request.username;
		delete request.session;
	};

	this.middleware = (request, response, next) => {
		/* To be implemented */
		var cookie = request.headers.cookie;
		var found = false;
		if (cookie) {
			var cookies = cookie.split('=').join('; ').split('; ');
			cookies.forEach(function (item, index) {
				if (sessions[item]) {
					found = true;
					request.session = item;
					request.username = sessions[item].username;
					next();
				}
			});
		}
		if (!found) {
			next(new SessionError());
		}
	};

	// this function is used by the test script.
	// you can use it if you want.
	this.getUsername = (token) => ((token in sessions) ? sessions[token].username : null);
};

// SessionError class is available to other modules as "SessionManager.Error"
SessionManager.Error = SessionError;

module.exports = SessionManager;