var Oauth2 = (function () {
    function Oauth2(opts) {
        var _this = this;
        opts = defaults(opts);
        var token = getTokenFromHash(window.location, opts.paramName);
        if (token !== '') {
            this.cachedToken = token;
            this.token = new Promise(function (resolve, reject) { return resolve(_this.cachedToken); });
            return;
        }
        this.token = new Promise(function (resolve, reject) { return reject('token not found'); });
    }
    ;
    return Oauth2;
}());
function defaults(opts) {
    if (!opts.paramName) {
        opts.paramName = 'access_token';
    }
    return opts;
}
// getTokenFromHash searches for the given param inside the location hash
// the location hash is usually in the form #access_token=XYXYXY&expire=blabla
function getTokenFromHash(location, param) {
    var hash = location.hash.substring(1);
    var vars = hash.split('&');
    for (var i = 0; i < vars.length; i++) {
        var _a = vars[i].split('='), name_1 = _a[0], value = _a[1];
        if (name_1 === param) {
            return value;
        }
    }
    return '';
}
//# sourceMappingURL=oauth2-implicit.js.map