interface Params {
  scope?: string;
  type?: string;
  expires?: string;
  token?: string;
};

interface Options {
  authURI: string;
  clientID: string;
  redirectURI: string;
  scopes: Array<string>;
  params?: Params;
}

interface Token {
  scope: string;
  type: string;
  expires: number;
  token: string;
}

class Oauth2 {
  private token: Promise<Token>;
  private opts: Options;

  constructor(opts: Options) {
    this.opts = this.defaults(opts);
    // Attempt to get the token from the url
    let token = this.getTokenFromHash(window.location, opts.params);
    if (token.token !== '') {
      this.token = new Promise((resolve, reject) => resolve(token));
      return;
    }

    this.refresh();
  };

  refresh() {
    // Attempt to get the token from an iframe redirect
    this.token = this.redirect(this.opts);

    // Refresh the token
    this.token.then(token => {
      window.setTimeout(this.refresh.bind(this), token.expires * 1000);
    });
  }

  private defaults(opts: Options): Options {
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
  private redirect(opts): Promise<Token> {
    return new Promise((resolve, reject) => {
      let iframe = document.createElement('iframe');
      iframe.setAttribute('src', this.getRedirect(opts));
      iframe.setAttribute('height', '0');
      iframe.setAttribute('width', '0');
      document.body.appendChild(iframe);
      let getTokenFromHash = this.getTokenFromHash;
      iframe.onload = function () {
        let token = getTokenFromHash(this.contentWindow.location, opts.params);
        document.body.removeChild(iframe);
        if (token.token === '') {
          reject('token not found');
        } else {
          resolve(token);
        }
      };
    });
  }

  // getRedirect builds a redirect uri to get an implicit flow token
  private getRedirect(opts: Options): string {
    let redirectUri = encodeURIComponent(opts.redirectURI);
    let state = Math.random().toString(36).substr(2, 8);
    let scope = opts.scopes.join(',');
    let uri = opts.authURI + '?client_id=' + opts.clientID + '&state=' + state + '&scope=' + scope + '&response_type=token&redirect_uri=' + redirectUri;
    return uri;
  }

  // getTokenFromHash searches for the given param inside the location hash
  // the location hash is usually in the form #access_token=XYXYXY&expire=blabla
  private getTokenFromHash(location: Location, params: Params): Token {
    // getvalue extract a value from an array of "key=value" strings
    function getValue(vars: Array<string>, param: string): string {
      for (let i = 0; i < vars.length; i++) {
        let [name, value] = vars[i].split('=');
        if (name === param) {
          return value;
        }
      }
      return '';
    }

    let token = {
      token: '',
      scope: '',
      expires: 0,
      type: ''
    };
    try {
      let hash = location.hash.substring(1);
    } catch (e) {
      console.error('Oauth2: Get the hash from the location: ', e);
      return token;
    }
    let hash = location.hash.substring(1);
    let vars = hash.split('&');

    token.token = getValue(vars, params.token);
    token.expires = parseInt(getValue(vars, params.expires));
    token.scope = getValue(vars, params.scope);
    token.type = getValue(vars, params.type);
    return token;
  }
}
