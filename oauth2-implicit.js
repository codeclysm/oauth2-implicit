;
var Oauth2 = (function () {
    function Oauth2(opts) {
        this.cbs = []; // It's an array of callbacks
        // Die if inside iframe
        if (window.self !== window.top) {
            return;
        }
        this.opts = this.defaults(opts);
        // Check cookie for authentication
        if (opts.cookieName && opts.cookieName !== '') {
            var value = this.getCookie(opts.cookieName);
            if (!value || value === 'false') {
                sessionStorage.removeItem('oauth_token');
            }
        }
        // Attempt to get the token from the url
        var token = this.getTokenFromHash(window.location, this.opts.params);
        if (token.token !== '') {
            this.putInSession(token);
            this.redirect();
            return;
        }
        // Save the current url in session (useful for redirecting back if there's an authentication)
        sessionStorage.setItem('oauth_redirect', window.location.href);
    }
    ;
    // Login initiates a redirect toward the authentication system
    Oauth2.prototype.login = function () {
        window.location.href = this.redirectURI();
    };
    Oauth2.prototype.logout = function () {
        sessionStorage.removeItem('oauth_token');
        window.location.href = this.logoutURI();
    };
    // redirectURI builds a redirect uri to get an implicit flow token
    Oauth2.prototype.redirectURI = function () {
        var redirectUri = encodeURIComponent(this.opts.redirectURI);
        var state = Math.random().toString(36).substr(2, 8);
        var scope = this.opts.scopes.join('%20');
        var uri = this.opts.authURI + '?client_id=' + this.opts.clientID + '&state=' + state + '&scope=' + scope + '&response_type=token&redirect_uri=' + redirectUri;
        return uri;
    };
    // logoutURI builds a redirect uri to logout
    Oauth2.prototype.logoutURI = function () {
        var redirectUri = encodeURIComponent(this.opts.redirectURI);
        var uri = this.opts.logoutURI + '?redirect_uri=' + redirectUri;
        return uri;
    };
    Oauth2.prototype.token = function () {
        var token;
        token = this.getFromSession();
        var now = new Date(Date.now() - 10 * 1000); // We consider stale token that expires in 10 seconds
        if (token && token.expires && token.expires > now) {
            return new Promise(function (resolve, reject) { return resolve(token); });
        }
        // If the token is expired refresh the promise
        if (token && token.expires && token.expires < now) {
            this._promise = null;
        }
        // if we're here it means that the token is stale or missing, we retrieve a new one
        if (!this._promise) {
            this.refresh();
        }
        return this._promise;
    };
    Oauth2.prototype.redirect = function () {
        var redirectFrom = sessionStorage.getItem('oauth_redirect');
        if (redirectFrom) {
            sessionStorage.removeItem('oauth_redirect');
            window.location.href = redirectFrom;
        }
    };
    Oauth2.prototype.refresh = function () {
        var _this = this;
        // Attempt to get the token from an iframe redirect
        this._promise = this.iframe(this.opts);
        // Refresh the token
        this._promise.then(function (token) {
            _this.putInSession(token);
            for (var i in _this.cbs) {
                _this.cbs[i](token, '');
            }
        }).catch(function (error) {
            for (var i in _this.cbs) {
                _this.cbs[i](null, error);
            }
        });
    };
    // subscribe adds your callback to the list of callbacks called whenever there's a change in authentication
    Oauth2.prototype.subscribe = function (cb) {
        this.cbs.push(cb);
        this.token().then(function (token) {
            cb(token, '');
        }).catch(function (error) {
            cb(null, error);
        });
    };
    Oauth2.prototype.defaults = function (opts) {
        if (!opts.params) {
            opts.params = {};
        }
        if (!opts.params.token) {
            opts.params.token = 'access_token';
        }
        if (!opts.params.expires) {
            opts.params.expires = 'expires_in';
        }
        if (!opts.params.type) {
            opts.params.type = 'token_type';
        }
        if (!opts.params.scope) {
            opts.params.scope = 'scope';
        }
        if (!opts.authURI) {
            console.error('Oauth2: the property authURI is missing');
        }
        if (!opts.authURI) {
            console.error('Oauth2: the property authURI is missing');
        }
        return opts;
    };
    // iframe creates an iframe and redirects the iframe content to the oauth2 endpoint
    Oauth2.prototype.iframe = function (opts) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var iframe = document.createElement('iframe');
            iframe.setAttribute('src', _this.redirectURI());
            iframe.setAttribute('height', '0');
            iframe.setAttribute('width', '0');
            var getTokenFromHash = _this.getTokenFromHash;
            iframe.onload = function () {
                var token = getTokenFromHash(this.contentWindow.location, opts.params);
                document.body.removeChild(iframe);
                if (token.token === '') {
                    reject('token not found');
                }
                else {
                    resolve(token);
                }
            };
            iframe.onerror = function (error) {
                reject(error);
            };
            document.body.appendChild(iframe);
        });
    };
    // getTokenFromHash searches for the given param inside the location hash
    // the location hash is usually in the form #access_token=XYXYXY&expire=blabla
    Oauth2.prototype.getTokenFromHash = function (location, params) {
        // getvalue extract a value from an array of "key=value" strings
        function getValue(vars, param) {
            for (var i = 0; i < vars.length; i++) {
                var _a = vars[i].split('='), name_1 = _a[0], value = _a[1];
                if (name_1 === param) {
                    return value;
                }
            }
            return '';
        }
        var token = {
            token: '',
            scope: '',
            expires: new Date(0),
            type: ''
        };
        var hash;
        try {
            hash = location.hash.substring(1);
        }
        catch (e) {
            console.error('Oauth2: Get the hash from the location: ', e);
            return token;
        }
        var vars = hash.split('&');
        token.token = getValue(vars, params.token);
        var expires_in = parseInt(getValue(vars, params.expires));
        token.expires = new Date(Date.now() + expires_in * 1000);
        token.scope = getValue(vars, params.scope);
        token.type = getValue(vars, params.type);
        return token;
    };
    // getErrorFromQuery searches for an error param inside the location query
    Oauth2.prototype.getErrorFromQuery = function (location) {
        // getvalue extract a value from an array of "key=value" strings
        function getValue(vars, param) {
            for (var i = 0; i < vars.length; i++) {
                var _a = vars[i].split('='), name_2 = _a[0], value = _a[1];
                if (name_2 === param) {
                    return value;
                }
            }
            return '';
        }
        var hash;
        try {
            hash = location.search.substring(1);
        }
        catch (e) {
            console.error('Oauth2: Get the query from the location: ', e);
            return '';
        }
        var vars = hash.split('&');
        return getValue(vars, 'error');
    };
    Oauth2.prototype.putInSession = function (token) {
        if (typeof token === 'object') {
            var value = JSON.stringify(token);
            sessionStorage.setItem('oauth_token', value);
        }
    };
    Oauth2.prototype.getFromSession = function () {
        var value = sessionStorage.getItem('oauth_token');
        try {
            var token = JSON.parse(value);
            token.expires = new Date(token.expires);
            return token;
        }
        catch (e) {
            return null;
        }
    };
    // getCookie return the value of a cookie
    Oauth2.prototype.getCookie = function (name) {
        var value = ' ' + document.cookie;
        var start = value.indexOf(' ' + name + '=');
        if (start === -1) {
            value = null;
        }
        else {
            start = value.indexOf('=', start) + 1;
            var end = value.indexOf(';', start);
            if (end === -1) {
                end = value.length;
            }
            value = decodeURI(value.substring(start, end));
        }
        return value;
    };
    return Oauth2;
}());
//# sourceMappingURL=oauth2-implicit.js.map