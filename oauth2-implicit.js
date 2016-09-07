;
var Oauth2 = (function () {
    function Oauth2(opts) {
        this.opts = defaults(opts);
        // Attempt to get the token from the url
        var token = getTokenFromHash(window.location, opts.params);
        if (token.token !== '') {
            this.token = new Promise(function (resolve, reject) { return resolve(token); });
            return;
        }
        this.refresh();
    }
    ;
    Oauth2.prototype.refresh = function () {
        var _this = this;
        // Attempt to get the token from an iframe redirect
        this.token = redirect(this.opts);
        // Refresh the token
        this.token.then(function (token) {
            window.setTimeout(_this.refresh.bind(_this), token.expires * 1000);
        });
    };
    return Oauth2;
}());
function defaults(opts) {
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
}
// redirect creates an iframe and redirects the iframe content to the oauth2 endpoint 
function redirect(opts) {
    return new Promise(function (resolve, reject) {
        var iframe = document.createElement('iframe');
        iframe.setAttribute('src', getRedirect(opts));
        iframe.setAttribute('height', '0');
        iframe.setAttribute('width', '0');
        document.body.appendChild(iframe);
        iframe.onload = function () {
            var token = getTokenFromHash(this.contentWindow.location, opts.paramName);
            document.body.removeChild(iframe);
            if (token.token === '') {
                reject('token not found');
            }
            else {
                resolve(token);
            }
        };
    });
}
// getRedirect builds a redirect uri to get an implicit flow token
function getRedirect(opts) {
    var redirectUri = encodeURIComponent(opts.redirectURI);
    var state = Math.random().toString(36).substr(2, 8);
    var scope = opts.scopes.join(',');
    var uri = opts.authURI + '?client_id=' + opts.clientID + '&state=' + state + '&scope=' + scope + '&response_type=token&redirect_uri=' + redirectUri;
    return uri;
}
// getTokenFromHash searches for the given param inside the location hash
// the location hash is usually in the form #access_token=XYXYXY&expire=blabla
function getTokenFromHash(location, params) {
    var token = {
        token: '',
        scope: '',
        expires: 0,
        type: ''
    };
    try {
        var hash_1 = location.hash.substring(1);
    }
    catch (e) {
        console.error('Oauth2: Get the hash from the location: ', e);
        return token;
    }
    var hash = location.hash.substring(1);
    var vars = hash.split('&');
    token.token = getValue(vars, params.token);
    token.expires = parseInt(getValue(vars, params.expires));
    token.scope = getValue(vars, params.scope);
    token.type = getValue(vars, params.type);
    return token;
}
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
//# sourceMappingURL=oauth2-implicit.js.map