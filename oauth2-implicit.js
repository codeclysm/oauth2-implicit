;
var Oauth2 = (function () {
    function Oauth2(opts) {
        this.opts = this.defaults(opts);
    }
    ;
    // redirectURI builds a redirect uri to get an implicit flow token
    Oauth2.prototype.redirectURI = function () {
        var redirectUri = encodeURIComponent(this.opts.redirectURI);
        var state = Math.random().toString(36).substr(2, 8);
        var scope = this.opts.scopes.join('%20');
        var uri = this.opts.authURI + '?client_id=' + this.opts.clientID + '&state=' + state + '&scope=' + scope + '&response_type=token&redirect_uri=' + redirectUri;
        return uri;
    };
    Oauth2.prototype.token = function () {
        var _this = this;
        if (this._token && this._token.token !== '') {
            return new Promise(function (resolve, reject) { return resolve(_this._token); });
        }
        // Attempt to get the token from the url
        var token = this.getTokenFromHash(window.location, this.opts.params);
        if (token.token !== '') {
            this._token = token;
            return this.token();
        }
        // Attempt to get an error from the url
        var error = this.getErrorFromQuery(window.location);
        if (error) {
            return new Promise(function (resolve, reject) { return reject(error); });
        }
        if (!this._promise) {
            this.refresh();
        }
        return this._promise;
    };
    Oauth2.prototype.refresh = function () {
        var _this = this;
        // Attempt to get the token from an iframe redirect
        this._promise = this.redirect(this.opts);
        // Refresh the token
        this._promise.then(function (token) {
            _this._token = token;
            window.setTimeout(_this.refresh.bind(_this), (token.expires - 5) * 1000);
        }).catch(function (error) { return console.debug(error); });
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
    // redirect creates an iframe and redirects the iframe content to the oauth2 endpoint
    Oauth2.prototype.redirect = function (opts) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var iframe = document.createElement('iframe');
            iframe.setAttribute('src', _this.redirectURI());
            iframe.setAttribute('height', '0');
            iframe.setAttribute('width', '0');
            document.body.appendChild(iframe);
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
            expires: 0,
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
        token.expires = parseInt(getValue(vars, params.expires));
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
    return Oauth2;
}());
//# sourceMappingURL=oauth2-implicit.js.map