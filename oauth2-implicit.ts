interface InitOptions {
  authURI: string;
  clientID: string;
  redirectURI: string;
  scopes: Array<string>;
  paramName?: string;
}

interface Token {
  scope: string;
  type: string;
  expires: number;
  token: string;
}

class Oauth2 {
  private token: Promise<string>;
  constructor(opts: InitOptions) {
    opts = defaults(opts);
    // Attempt to get the token from the url
    let token = getTokenFromHash(window.location, opts.paramName);
    if (token !== '') {
      this.token = new Promise((resolve, reject) => resolve(token));
      return;
    }

    // Attempt to get the token from an iframe redirect
    this.token = new Promise((resolve, reject) => {
      let iframe = document.createElement('iframe');
      iframe.setAttribute('src', getRedirect(opts));
      document.body.appendChild(iframe);
      iframe.onload = function () {
        let token = getTokenFromHash(this.contentWindow.location, opts.paramName);
        document.body.removeChild(iframe);
        if (token === '') {
          reject('token not found');
        } else {
          resolve(token);
        }
      };
    });
  };
}

function defaults(opts: InitOptions): InitOptions {
  if (!opts.paramName) {
    opts.paramName = 'access_token';
  }
  if (!opts.authURI) {
    console.error('Oauth2: the property authURI is missing');
  }
  if (!opts.authURI) {
    console.error('Oauth2: the property authURI is missing');
  }
  return opts;
}

// getRedirect builds a redirect uri to get an implicit flow token
function getRedirect(opts: InitOptions): string {
  let redirectUri = encodeURIComponent(opts.redirectURI);
  let state = Math.random().toString(36).substr(2, 8);
  let scope = opts.scopes.join(',');
  let uri = opts.authURI + '?client_id=' + opts.clientID + '&state=' + state + '&scope=' + scope +  '&response_type=token&redirect_uri=' + redirectUri;
  return uri;
}

// getTokenFromHash searches for the given param inside the location hash
// the location hash is usually in the form #access_token=XYXYXY&expire=blabla
function getTokenFromHash(location: Location, param: string): string {
  try {
    let hash = location.hash.substring(1);
  } catch (e) {
    console.error('Oauth2: Get the hash from the location: ', e);
    return '';
  }
  let hash = location.hash.substring(1);
  let vars = hash.split('&');

  for (let i = 0; i < vars.length; i++) {
    let [name, value] = vars[i].split('=');
    if (name === param) {
      return value;
    }
  }

  return '';
}