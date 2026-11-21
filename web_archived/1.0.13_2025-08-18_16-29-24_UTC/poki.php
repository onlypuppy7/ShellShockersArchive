	
<!DOCTYPE html>
<html lang="en" xml:lang="en" xmlns="http://www.w3.org/1999/xhtml">
	<head>
		<script>
    var dynamicContentRoot = 'shellshock.io';
    var dynamicContentPrefix = 'https://shellshock.io/'; 
</script>

<script>

let HouseAds;
var shellLogo = 'img/logo.svg';

async function getAds() {
  const response = await fetch(dynamicContentPrefix + 'data/housePromo.json?' + Date.now());
  HouseAds = await response.json();
  if (HouseAds.shellLogo !== undefined && HouseAds.shellLogo.length > 0) {
		const useLogo = HouseAds.shellLogo.filter(logo => logo.active);
		if (useLogo.length > 0) {
			shellLogo = dynamicContentPrefix + 'data/img/art/' + useLogo[0].id + useLogo[0].imageExt;
		}
	}
}

getAds();

class Loader {

	constructor () {
		this.logo = '';
		this.blueWizSrcAlt = '';
	}

	static show () {
		let container = document.createElement('div');
		container.id = 'progress-container';
		container.style = `
			position: fixed;
			top: 0;
			left: 0;
			height: 100vh;
			width: 100vw;
			z-index: 2000;
			background-image: var(--ss-lightoverlay);
		`;

		const progressWrapper = document.createElement('div');
		progressWrapper.id = 'progress-wrapper';
		progressWrapper.className = 'load_screen align-items-center';
		progressWrapper.style = `
			position: absolute;
			left: 50%;
			top: -6em;
			transform: translateX(-50%);
			background-image: none;
		`;

		const blueWizLogo = document.createElement('img');

		if (this.blueWizSrcAlt) {
			blueWizLogo.src = this.blueWizSrcAlt;
		} else {
			blueWizLogo.src = 'img/blueWizard_logo.webp';
		}

		blueWizLogo.style=`
			width: 16em;
			display: block;
			margin: 5em auto 0;
			z-index: 2000;
			position: absolute;
			left: 50%;
			bottom: 8em;
			transform: translateX(-50%);
		`;

		this.logo = document.createElement('img');
		this.logo.src = shellLogo;
		this.logo.style = 'height: 16em';
		this.logo.id = 'logo-svg';
		// container.appendChild(logo);

		const progressOuter = document.createElement('div');
		progressOuter.id = 'progress-outer';
		progressOuter.style = `
			position: relative;
			background: #643219;
			border-radius: 2em;
			height: 3.3em;
			width: 24em;
			margin-top: 2em;
		`;


		let progress = document.createElement('div');
		progress.style = `
			margin-top: 1em;
			width: 23em;
			height: 2.2em;
			background: white;
			padding: 0.5em;
			border-radius: 2em;
			margin: .3em .5em 0;
		`;
		container.appendChild(progress);

		let progressBar = document.createElement('span');
		progressBar.id = 'progressBar';
		progressBar.style = `
			display: block;
			width: 20%;
			height: 100%;
			background: orange;
			border-radius: 2em;
			margin-left: 80%;
			margin: 0 .3em .5em 0;
			opacity: 0;
			transition: margin-left linear 500ms;
			transition-timing-function: ease-in-out;
		`;

		const progressBarOutside = document.createElement('div');


		progress.appendChild(progressBar);
		progressWrapper.appendChild(this.logo);
		progressOuter.appendChild(progress);
		progressWrapper.appendChild(progressOuter);
		
		container.appendChild(progressWrapper);
		container.appendChild(blueWizLogo);

		// Minor for the progress bar intial load
		setTimeout(() => progressBar.style.opacity = 1, 600);


		Loader.barInterval = setInterval(() => {
			if (Loader.progressBar.style.marginLeft == '0%') {
				Loader.progressBar.style.marginLeft = '80%';
			}
			else {
				Loader.progressBar.style.marginLeft = '0%';
			}
		}, 500);

		Loader.progressBar = progressBar;
		Loader.container = container;

		let app = document.body;
		app.appendChild(container);
	}

	static hide () {
		Loader.container.style = "opacity : 0; transition: opacity 1s;";
		setTimeout(() => { Loader.container.remove(); }, 1000);
	}

	static addTask () {
		let id = Loader.loaded.length;
		//console.log('Loading tasks: ', ++Loader.actualTasks);
		Loader.loaded.push(0);
		return id;
	}

	static finish (id) {
		clearInterval(Loader.barInterval);

		if (Loader.progressBar) {
			Loader.progressBar.style.marginLeft = '0%';
			Loader.progressBar.style.transition = '';

			Loader.loaded[id] = 1;
			Loader.updateBar();
		}
	}

	static progress (id, value, total) {
		clearInterval(Loader.barInterval);

		if (Loader.progressBar) {
			Loader.progressBar.style.marginLeft = '0%';
			Loader.progressBar.style.transition = '';

			Loader.loaded[id] = value / total;

			Loader.updateBar();
		}

		return id;
	}

	static updateBar () {
		let loadedTotal = 0;

		for (let l of Loader.loaded) {
			loadedTotal += l;
		}
		let percent = loadedTotal / Loader.tasks * 95 + 5;
		// no more than 100%
		if (percent > 100) {
			percent = 100;
		}

		Loader.progressBar.style.width = percent + '%';
	}

	static loadJS (path, callback) {
		let p = path;

		(function (p, cb) {
			let xhr = new XMLHttpRequest();
  			xhr.open('GET', p, true);

			let id = Loader.addTask();

			xhr.onprogress = event => {
				if (Loader.progressBar) {
					id = Loader.progress(id, event.loaded, event.total);
				}
			};
  
			xhr.onload = () => {
				if (xhr.status != 200) {
	  				console.log(`Error ${xhr.status}: ${xhr.statusText}`);
				}
				else {
					if (!cb) {
						Loader.finish(id);
						let script = document.createElement('script');
						script.innerHTML = xhr.response;
						document.body.appendChild(script);
						return;
					}

					import('./js/wasm_loader.js?6').then(({ init, process, verify, validate, get_yaw_pitch, reset_yaw_pitch, set_mouse_params, poll_gamepad }) => {
						window.verify = verify;
						window.validate = validate;
						window.get_yaw_pitch = get_yaw_pitch;
						window.reset_yaw_pitch = reset_yaw_pitch;
						window.set_mouse_params = set_mouse_params;
						window.poll_gamepad = poll_gamepad;

						let encoder = new TextEncoder('utf-8');
						let decoder = new TextDecoder('utf-8');
						let data = encoder.encode(xhr.response);
						init().then(() => {
							process(data);
							cb();
						});
					});
				}
			};

			xhr.send();
		})(path, callback);
	}
}

Loader.actualTasks = 0;
Loader.tasks = 17;
Loader.loaded = [];

window.Loader = Loader;

function openFirebaseDb () {
	return new Promise((resolve, reject) => {
		let req = window.indexedDB.open('firebaseLocalStorageDb');
		req.onsuccess = () => {
			let db = req.result;
			let transaction = db.transaction(['firebaseLocalStorage'], 'readwrite');
			let store = transaction.objectStore('firebaseLocalStorage');
			resolve({ db, store });
		}
		req.onerror = err => reject(err);
		req.onupgradeneeded = () => {
			let db = req.result;
			let store = db.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
			resolve({ db, store });
		}
	});
}

var redirectIframe

function postStorageAndRedirect (iframe, storage, firebaseDb) {
	iframe.contentWindow.postMessage({ storage, firebaseDb }, '*');
	window.location = 'https://shellshock.io' + window.location.search + window.location.hash;
}

// Loader.blueWizSrcAlt = 'img/blueWizard_logo_borg.webp';
Loader.show();

</script><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="facebook-domain-verification" content="6lfua33vx0abiv1asnt9p13aac29xy" /><!-- title, seo meta and favicons -->

<title>Shell Shockers 🍳 Also at deathegg.life </title>
<meta name="Description" content="Blocked? Try deathegg.life | The OFFICIAL home of Shell Shockers, the world’s best egg-based shooter! It’s like your favorite FPS battlefield game… with eggs.">
<meta name="Keywords" content="Games, Free games, online, multiplayer, io games, shell shockers, web game, shooter, fps, bullets, egg game, egg shooter, unblocked games">
<meta name="author" content="Blue Wizard Digital">

<meta name="theme-color" content="#0B93BD" />
<meta name="background-color" content="#0B93BD" />

<link rel="icon" href="favicon.ico" type="image/x-icon">
<link rel="apple-touch-icon" href="favicon192.png" sizes="192x192" />
<link rel="icon" href="favicon256.png" sizes="512x512" />

<meta property="og:url" content="https://www.shellshock.io" />
<meta property="og:type" content="website" />
<meta property="og:image:width" content="1000" />
<meta property="og:image:height" content="500" />
<meta property="og:image" content="https://www.shellshock.io/img/previewImage_shellShockers.webp" />
<meta name="image" property="og:image" content="https://www.shellshock.io/img/previewImage_shellShockers.webp" />
<meta property="og:title" content="Shell Shockers | by Blue Wizard Digital" />
<meta property="og:description" content="Blocked? Try deathegg.life | The OFFICIAL home of Shell Shockers, the world’s best egg-based shooter! It’s like your favorite FPS battlefield game… with eggs." />

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@bluewizardgames">
<meta name="twitter:creator" content="@bluewizardgames">
<meta name="twitter:title" content="Shell Shockers | by Blue Wizard Digital">
<meta name="twitter:description" content="Blocked? Try deathegg.life | The OFFICIAL home of Shell Shockers, the world’s best egg-based shooter! It’s like your favorite FPS battlefield game… with eggs.">
<meta name="twitter:image" content="https://www.shellshock.io/img/previewImage_shellShockers.webp">

<script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        "name": "Shell Shockers",
        "description": "Shell Shockers is a browser-based first-person shooter game
        where players control armed eggs in multiplayer battles.
        ",
        "url": "https://shellshock.io/",
        "image": "https://shellshock.io/img/logo.svg",
        "applicationCategory": "Game",
        "applicationSubCategory": "FirstPersonShooter",
        "operatingSystem": "ChromeOS, Windows, MACOS, Linux",
        "genre": "Action, Shooter",
        "publisher": {
            "@type": "Organization",
            "name": "Blue Wizard Digital",
            "url": "https://bluewizard.com/"
        }
    }
</script><!-- Styles & Fonts -->
<link href="https://fonts.googleapis.com/css?family=Sigmar+One|Nunito:100,200,600,700,900" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.14.0/css/all.min.css" crossorigin="anonymous">
<link rel="stylesheet" href="styles/style.min.css?1754668485"><script>
function storageFactory(getStorage) {

	const inMemoryStorage = {};

	function isSupported() {
		try {
			var testKey = "__some_random_key_you_are_not_going_to_use__";
			getStorage().setItem(testKey, testKey);
			getStorage().removeItem(testKey);
			return true;
		} catch (e) {
			return false;
		}
	}

	function clear() {
		if (isSupported()) {
			getStorage().clear();
		} else {
			inMemoryStorage = {};
		}
	}

	function getItem(name) {
		if (isSupported()) {
			return getStorage().getItem(name);
		}

		if (inMemoryStorage.hasOwnProperty(name)) {
			return inMemoryStorage[name];
		}

		return null;
	}

	function key(index) {
		if (isSupported()) {
			return getStorage().key(index);
		} else {
			return Object.keys(inMemoryStorage)[index] || null;
		}
	}

	function removeItem(name) {
		if (isSupported()) {
			getStorage().removeItem(name);
		} else {
			delete inMemoryStorage[name];
		}
	}

	function setItem(name, value) {
		if (isSupported()) {
			getStorage().setItem(name, value);
		} else {
			inMemoryStorage[name] = String(value);
		}
	}

	function length() {
		if (isSupported()) {
			return getStorage().length;
		} else {
			return Object.keys(inMemoryStorage).length;
		}
	}

	return {
		getItem: getItem,
		setItem: setItem,
		removeItem: removeItem,
		clear: clear,
		key: key,

		get length() {
			return length();
		}

	};
	}

	const localStore = storageFactory(() => localStorage);
	const sessionStore = storageFactory(() => sessionStorage);
</script><style>
.eggIcon {
	display: inline-block;
	color: #444444;
	width: .8em;
	height: .8em;
	fill: currentColor;
}
</style>
						

<style>
.eggIconLocked {
	display: inline-block;
	color: #444444;
	width: .8em;
	height: .8em;
	fill: currentColor;
}
</style>
							
<svg style="position: absolute; width: 0; height: 0; overflow: hidden" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
	<defs>
		<symbol id="icon-egg-locked" viewBox="0 0 14.59 18.12">
<g>
	<path class="st0" d="M7.3,5.4c-0.6,0-1.1,0.5-1.1,1.1v1.3h2.2V6.5C8.4,5.9,7.9,5.4,7.3,5.4z"/>
	<path class="st0" d="M7.5,0.1c-4,0-7.4,6.7-7.4,10.7S3.4,18,7.3,18c3.9,0,7.2-3.2,7.2-7.2S11.5,0.1,7.5,0.1z M11.3,12.5
		c0,0.9-0.7,1.6-1.6,1.6H4.8c-0.9,0-1.6-0.7-1.6-1.6V7.8h1.5V6.5C4.8,5.1,5.9,4,7.3,4c1.4,0,2.5,1.1,2.5,2.5v1.3h1.5V12.5z"/>
</g>
		</symbol>
	</defs>
</svg><!-- ParsedURL -->
<script>
    var parsedUrl = (function parseUrl () {
        var url = {};
        var loc = window.location;
        url.root = loc.origin + loc.pathname;
        var query = loc.search.substring(1).split('&');
        url.query = {};
        for (let i = 0; i < query.length; i++)  {
            var arr = query[i].split('=');
            if (arr[0]) {
                if (arr[1] === undefined) {
                    arr[1] = true;
                } else if (!isNaN(arr[1])) {
                    arr[1] = parseFloat(arr[1]);
                }
                url.query[arr[0]] = arr[1];
            }
        }
        url.hash = loc.hash.substring(1);

        var host = loc.host.split('.');

        url.dom = host[0];
        url.top = host[1];

        if (url.hash.length == 0) url.hash = undefined;
        return url;
    })();
</script>
<!-- third party globals -->
<script>

	var pokiActive = false,
		crazyGamesActive = false,
		thirdPartyAdblocker = false,
		testCrazy = false;

	let crazyGamesHouseAdCheck = null;

		// we need a getter and setter for the vue instance
		const getCrazyGamesActive = {
			_value: '',
			set value(newValue) {
				this._value = newValue;
				crazyGamesActive = newValue;
				triggerCheck(newValue);
			},
			get value() {
				return this._value;
			}
		};

		function triggerCheck(value) {
			if (crazyGamesHouseAdCheck) {
				crazyGamesHouseAdCheck.isCrazyGames = value;
			}
		}

	class CrazyGames {
		constructor() {
			this.initialized = false;
			this.crazysdk = null;
			this.thirdPartyAdblocker = false;
		}

		async init() {
			if (!window.CrazyGames || !window.CrazyGames.SDK) {
				console.log("CrazyGames SDK not available");
				return;
			}

			try {
				await window.CrazyGames.SDK.init();
				this.crazysdk = window.CrazyGames.SDK;
				this.thirdPartyAdblocker = await this.crazysdk.ad.hasAdblock();
				this.initialized = true;
				crazyGamesActive = true;
				getCrazyGamesActive.value = true;
				console.log("CrazyGames SDK initialized successfully.");
			} catch (error) {
				console.error("Failed to initialize CrazyGames SDK:", error);
			}
		}
		async performAction(action, ...args) {
        if (!this.initialized) {
            return;
        }

        try {
            const result = action.call(this, ...args);
            if (result instanceof Promise) {
                await result;
            }
        } catch (error) {
            console.error("Error performing action:", error);
        }
    }

		inviteLink(invite) {
			if (!this.initialized) {
				return;
			}

			return this.crazysdk.game.inviteLink(invite);

		}

		async requestBanner(banner) {
			try {
				await this.performAction(() => this.crazysdk.banner.requestBanner(banner));
			} catch (error) {
				console.error("Error requesting banner:", error);
			}
    	}

		async requestResponsiveBanner(banner) {
			try {
				await this.performAction(() => this.crazysdk.banner.requestResponsiveBanner(banner));
			} catch (error) {
				console.error("Error requesting responsive banner:", error);
			}
		}

		clearAllBanners() {
			this.performAction(() => this.crazysdk.banner.clearAllBanners());
		}

		showInviteButton(invite) {
			this.performAction(() => this.crazysdk.game.showInviteButton(invite));
		}

		hideInviteButton() {
			this.performAction(() => this.crazysdk.game.hideInviteButton());
		}

		requestAd(type, callbacks) {
			this.performAction(() => this.crazysdk.ad.requestAd(type, callbacks));
		}

		gameplayStop() {
			this.performAction(() => this.crazysdk.game.gameplayStop());
		}

		gameplayStart() {
			this.performAction(() => this.crazysdk.game.gameplayStart());
		}

		adBlocker() {
			return this.initialized ? this.thirdPartyAdblocker : undefined;
		}
	}

    // Third party globals
	function initializeCrazyGamesSDK() {
		if (!window.crazySdk) {
			window.crazySdk = new CrazyGames();
			window.crazySdk.init();
		} else {
			console.log("CrazyGames SDK is already initialized.");
		}
	}

	window.addEventListener('load', initializeCrazyGamesSDK);

</script>
<!-- European Union detection -->
<script>isFromEU = 1 ? true : false</script>
<!-- GTM -->
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-79NWRZXYCB"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-79NWRZXYCB', gtmOptions);
</script>

<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-K5MSJHJ');</script>
<!-- End Google Tag Manager -->
<script src="//game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>
<script>
    PokiSDK.init()
        .then(
            () => {
                pokiActive = true;
                console.log('Poki initialized');
            }
        ).catch(
            () => {
                pokiActive = true;
                console.log('Poki init failed');
                thirdPartyAdblocker = true;
        }
    );
</script>

<!-- Firebase -->
<script src="https://www.gstatic.com/firebasejs/9.17.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.17.2/firebase-auth-compat.js"></script>

<script src="https://www.gstatic.com/firebasejs/ui/6.0.2/firebase-ui-auth.js"></script>
<link type="text/css" rel="stylesheet" href="https://www.gstatic.com/firebasejs/ui/6.0.2/firebase-ui-auth.css" />
<!-- Facebook -->
<!-- Facebook Pixel Code -->
<script>
	!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
	n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
	n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
	t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
	document,'script','https://connect.facebook.net/en_US/fbevents.js');
	fbq('init', '771186996377132');
	fbq('track', 'PageView');
</script>
<noscript>
	<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=771186996377132&ev=PageView&noscript=1"/>
</noscript>
<!-- DO NOT MODIFY -->
<!-- End Facebook Pixel Code -->
<!-- progressive web app -->
<!-- <button id="addToHomescreen" style="z-index:333;display: none; position:absolute; top:0px; right: 75%; cursor:pointer;" class="ss_button btn_yolk bevel_yolk">Add to your desktop!</button> -->

<script>
    let pwaBlockAds = false;

	// if ('serviceWorker' in navigator) {
    //             console.log("Will the service worker register?");
    //             navigator.serviceWorker.register('service-worker.js')
    //             .then(function(reg){
    //                     console.log("Yes, it did.");
    //             }).catch(function(err) {
    //                     console.log("No it didn't. This happened:", err)
    //             });
    // }

    if (window.matchMedia('(display-mode: standalone)').matches) { 
        pwaBlockAds = 'utm_source' in parsedUrl.query && parsedUrl.query.utm_source === 'homescreen';
	ga('send', 'event', 'pwa', 'desktop opened');
    }  
</script>	
<!-- Music audio tag -->
<audio id="theAudio" preload="metadata"></audio><!-- VueJS -->
<script src="./js/vue/vue.min.2.6.10.js"></script><!-- tools and varibles -->
<script src="https://cdn.jsdelivr.net/npm/fuse.js@6.6.2"></script>
<script>
	localStore.removeItem('brbTime');

	String.prototype.format = String.prototype.f = function() {
    var s = this,
        i = arguments.length;

    while (i--) {
        s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
    }
    return s;
};

// HTMLCanvasElement.prototype.getContext = function(origFn) {
// 	return function(type, attribs) {
// 	  attribs = attribs || {};
// 	  attribs.preserveDrawingBuffer = true;
// 	  return origFn.call(this, type, attribs);
// 	};
//   }(HTMLCanvasElement.prototype.getContext);

function getKeyByValue (obj, value) {
	// if (!obj && !value) {
	// 	return;
	// }
	for (var prop in obj) {
		if (obj.hasOwnProperty(prop)) {
			if (obj[prop] === value) {
				return prop;
			}
		}
	}
}

function objToStr (obj) {
	var str = JSON.stringify(obj, null, 4).replace(/\\|"/g, '');
	//str = str.replace(/\\|"/g, '');
	return str;
}

function detectChromebook() {
	return /\bCrOS\b/.test(navigator.userAgent);
}

function removeChildNodes (name) {
	var myNode = document.getElementById(name);
	while (myNode.firstChild) {
	    myNode.removeChild(myNode.firstChild);
	}
}

function logCallStack() {
	var stack = new Error().stack;
	console.log(stack);
}

function getRequest (url, callback) {
	if (url.startsWith('./')) url = url.slice(2);
	url = dynamicContentPrefix + url;

	var req = new XMLHttpRequest();
	if (!req) {
		return false;
	}

	if (typeof callback != 'function') callback = function () {};
	
	req.onreadystatechange = function(){
		if(req.readyState == 4) {
			return req.status === 200 ? 
				callback(null, req.responseText) : callback(req.status, null);
		}
	}
	req.open("GET", url, true);
	req.send(null);
	return req;
}

function hasValue (a) {
	return (a !== undefined && a !== null && a !== 0);
}

Array.prototype.shallowClone = function() {
	return this.slice(0);
}

function deepClone (o) {
	return JSON.parse(JSON.stringify(o));
}

function isString (value) {
	return typeof value === 'string' || value instanceof String;
}

const capitalize = (s) => {
	if (typeof s !== 'string') return ''
	return s.charAt(0).toUpperCase() + s.slice(1)
};

function isHttps() {
	//return true // TODOJOSH
    return (document.location.protocol == 'https:');
}

function elOverlap(el1, el2) {
	const domRect1 = el1.getBoundingClientRect();
	const domRect2 = el2.getBoundingClientRect();
  
	return !(
	  domRect1.top > domRect2.bottom ||
	  domRect1.right < domRect2.left ||
	  domRect1.bottom < domRect2.top ||
	  domRect1.left > domRect2.right
	);
  }

  function loadJS(FILE_URL, async = true, callback, errorCallback) {
	let scriptEle = document.createElement("script");
  
	scriptEle.setAttribute("src", FILE_URL);
	scriptEle.setAttribute("type", "text/javascript");
	scriptEle.setAttribute("async", async);
  
	document.body.appendChild(scriptEle);
  
	// success event 
	scriptEle.addEventListener("load", () => {
		if (callback) callback();
	  console.log("File loaded")
	});
	 // error event
	scriptEle.addEventListener("error", (ev) => {
		if (errorCallback) errorCallback();
	  console.log("Error on loading file", ev);
	});
  }

  function debounce(fn, wait){
	let timer;
	return function(...args){
		if(timer) {
			clearTimeout(timer); // clear any pre-existing timer
		}
		const context = this; // get the current context
		timer = setTimeout(()=>{
			fn.apply(context, args); // call the function if time expires
		}, wait);
   }
}


function formatLargeNumbers(num) {
	if (num >= 1_000_000_000) {
	  return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
	} else if (num >= 1_000_000) {
	  return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
	} else if (num >= 1_000) {
	  return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
	} else {
	  return num.toString();
	}
  }	
function getStoredNumber (name, def) {
	var num = localStore.getItem(name);
	if (!num) {
		return def;
	}
	return Number(num);
}

function getStoredBool (name, def) {
	var str = localStore.getItem(name);
	if (!str) {
		return def;
	}
	return str == 'true' ? true : false;
}

function getStoredString (name, def) {
	var str = localStore.getItem(name);
	if (!str) {
		return def;
	}
	return str;
}

function getStoredObject (name, def) {
	var str = localStore.getItem(name);
	if (!str) {
		return def;
	}
	return JSON.parse(str);
}

function getSetIncrementStoredNum(name, set) {
	const val = localStore.getItem(name);
	if (val) {
		localStore.setItem(name, Number(val) + set);
	} else {
		localStore.setItem(name, set);
	}
	return Number(localStore.getItem(name));
}
	var shellColors = [
	'#ffffff',
	'#c4e3e8',
	'#e2bc8b',
	'#d48e52',
	'#cb6d4b',
	'#8d3213',
	'#5e260f',

	'#e70a0a',
	'#aa24ce',
	//'#f17ff9', // Old Pink
	'#E0219A', // Barbie Pink
	'#FFD700',
	'#33a4ea',
	'#3e7753',
	'#59db27',
	//'#99953a'
];

var freeColors = shellColors.slice(0, 7);
var paidColors = shellColors.slice(7, shellColors.length);

	const RESPAWNADUNIT = 'shellshockers_respawn_banner-sh';
	const RESPAWN2ADUNIT = 'shellshockers_respawn_banner_2-sh';
	const RESPAWN3ADUNIT = 'shellshockers_respawn_banner_3-sh';
	const  AIPSUBID = 'shellshock.io';

	var Slot = {
		Primary: 0,
		Secondary: 1
	};

	var EGGCOLOR = {
		white: 0,
		skyblue: 1,
		beige: 2,
		tan: 3,
		brown: 4,
		caramel: 5,
		chocolate: 6,
		red: 7,
		purple: 8,
		violet: 9,
		yellow: 10,
		babyblue: 11,
		darkgreen: 12,
		green: 13	
	}

	// Type matches contents of the item_type table (could be generated from a db query but ... meh)
	var ItemType = {
		Hat: 1,
		Stamp: 2,
		Primary: 3,
		Secondary: 4,
		Grenade: 6,
		Melee: 7
	}

	var CharClass = {
		Soldier: 0,
		Scrambler: 1,
		Ranger: 2,
		Eggsploder: 3,
		Whipper: 4,
		Crackshot: 5,
		TriHard: 6
	};

	const PurchaseType = {
		vip: 0,
		purchase: 1
	};

	const DmgType = [
		{ name: 'Eggk47' },
		{ name: 'Scrambler' },
		{ name: 'FreeRanger' },
		{ name: 'Cluck9mm' },
		{ name: 'Rpegg' },
		{ name: 'Whipper' },
		{ name: 'Crackshot' },
		{ name: 'TriHard' },
		{ name: 'Grenade' },
		{ name: 'Melee' },
		{ name: 'Fall' }
	];

	const SOCIALMEDIA = [
		'fa-facebook-square',
		'fa-instagram-square',
		'fa-tiktok',
		'fa-discord',
		'fa-youtube',
		'fa-twitter-square',
		'fa-twitch'
	];

	const ItemIcons = {
		Hat: '#ico-hat',
		Stamp: '#ico-stamp',
		Primary: '#ico-primary',
		Secondary: '#ico-secondary',
		Grenade: '#ico-grenade',
		Melee: '#ico-melee'
	};

	const PhotoBoothCMD = {
		size: 0,
		pose: 1,
		map: 2,
		color: 0,
		itemHide: 4,
		open: 5,
		close: 6,
		reset: 7,
		screenGrab: 8,
	};

	const ChallengePeriod = {
		0: {type: 'daily', period: 86400},
		1: {type: 'weekly', period: 604800},
		2: {type: 'monthly', period: 2592000},
	};

const ChallengeType = {
	0: 'kills',
	1: 'damage',
	2: 'deaths',
	3: 'movement',
	4: 'collect',
	5: 'timed',
	6: 'kotc',
	7: 'cts',
	8: 'ffa',
	9: 'items',
	10: 'eggsEarned',
	11: 'shop',
};

const ChallengeSubType = {
	0: 'killStreak',
	1: 'weaponType',
	2: 'damage',
	3: 'distance',
	4: 'jump',
	5: 'map',
	6: 'timePlayed',
	7: 'timeAlive',
	8: 'condition',
	9: 'color',
	10: 'kills',
	11: 'shot',
	12: 'hp',
	13: 'scoped',
	14: 'scope',
	15: 'death',
	16: 'oneShot',
	17: 'reload',
	18: 'collect',
	20: 'capturing',
	21: 'capture',
	22: 'contest',
	23: 'win',
};

const ChallengeConditions = {
	0: 'killstreak',
	1: 'weaponType',
	2: 'damage',
	3: 'distance',
	4: 'jump',
	5: 'map',
	6: 'timesPlayed',
	7: 'timeAlive',
	8: 'condition',
	9: 'color',
	10: 'kills',
	11: 'shot',
	12: 'hp',
	13: 'scoped',
	14: 'scope',
	15: 'oneShot',
	16: 'ammo',
	17: 'grenade',
	18: 'victim',
};

const ShellStreak = {
	HardBoiled: 1,
	EggBreaker: 2,
	Restock: 4,
	OverHeal: 8,
	DoubleEggs: 16,
	MiniEgg: 32
};

			/* Ranges
		Hat			1000 - 1999
		Stamp		2000 - 2999
		Secondary	3000 - 3099
		Soldier		3100 - 3399
		Range		3400 - 3599
		Scrambler	3600 - 3799
		Eggsploder	3800 - 3999
		Whipper		4000 - 4199
		Crackshot	4200 - 4499
		TriHard		4500 - < 16000
		Grenade		16000 - 16383
		*/

</script><!-- shellshockers js -->
<script>
	function ssJSComplete () {
		window.onloadingcomplete();
	}

	let loaderInterval = setInterval(() => {
		if (window.Loader) {
			clearInterval(loaderInterval);
			Loader.loadJS('js/screenShot.js?1692215954');
			Loader.loadJS('js/shellshock.js?1754668535', ssJSComplete);
		}
	}, 100);
</script>
	
	</head>

	<body>
		<!-- google tag manager noscript -->
		<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-K5MSJHJ"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->		<!-- Ads -->
		<div id="gameAdContainer" class="hideme">
</div>

<div id="shellshockers_titlescreen"></div>
<div id="shellshockers_chicken_nugget_banner"></div>
<div id="shellshockers_respawn_banner-sh"></div>
<div id="shellshockers_respawn_banner_2-sh"></div>
<div id="shellshockers_respawn_banner_3-sh"></div>
<div id="shellshockers_respawn_banner"></div>
<div id="shellshockers_respawn_banner-new"></div>
<div id="ShellShockers_LoadingScreen_HouseAds"></div>
<div id="shellshock-io_728x90_HP"></div>

<div id="videoAdContainer">
    <div id="preroll"></div>
</div>

<!-- <div class="video_ad_wrapper">
    <video id="asc_video_ad" class="video-js vjs-default-skin" controls preload="auto" width="640" height="360" muted="true" style="display: none;">
        <source src="video/tiny.mp4" type="video/mp4" />
    </video>
</div> -->
		<div id="ss_background"></div>

		<!-- Instantiate the Vue instance -->
		<div id="app" :class="[currentLanguageCode, appClassObj, appClassScreen, isPhotoBooth]"> <!-- vue instance div: all vue-controlled elements MUST be inside this tag -->
    <!-- <asc-video-player id="mainVideoPlayer" ref="mainVideoPlayer" adTagUrl="adTagUrl"></asc-video-player> -->
    <div class="firebaseID">firebase ID: {{ firebaseId }}, maskedEmail: {{ maskedEmail }} isAnonymous: {{ isAnonymous }}, isEmailVerified: {{ isEmailVerified }}</div>
    <!-- Canvas -->
    <div ref="gameCanvas" class="canvas-wrapper gameCanvas">
    </div>
    <!-- Overlays -->
    <light-overlay id="lightOverlay" ref="lightOverlay"></light-overlay>
    <dark-overlay ref="darkOverlay"></dark-overlay>
    <spinner-overlay id="spinnerOverlay" ref="spinnerOverlay" :loc="loc" :hide-ads="hideAds" :ad-unit="displayAd.adUnit.spinner" :account-date="accountCreated"></spinner-overlay>
    <div ref="abTestContainer" class="ab-test-inventory-flow hideme popup_window popup_sm roundme_md centered">
        <img ref="abTestArrow" class="ab-test-arrow lazy-load" :data-src="ui.lazyImages.kotcArrow" alt="">
        <p v-html="abTestText"></p>
    </div>

    <!-- GDPR -->
    <gdpr id="gdpr" ref="gdpr" :loc="loc"></gdpr>
    <div ref="headerAdContainer"></div>
    <account-panel v-show="ui.showHomeEquipUi" id="account_panel" ref="accountPanelHome" :loc="loc" :selected-language-code="currentLanguageCode" :eggs="eggs" :languages="languages" :current-lang-options="locLanguage" :show-corner-buttons="ui.showCornerButtons" :is-private-game="extern.isPrivateGame" :show-bottom="true" :photo-url="photoUrl" :is-anonymous="isAnonymous" :is-of-age="isOfAge" :show-targeted-ads="showTargetedAds" :current-screen="showScreen" :screens="screens" :is-egg-store-sale="isEggStoreSaleItem" :is-subscriber="isSubscriber" @sign-in-clicked="onSignInClicked" @sign-out-clicked="onSignOutClicked" :is-twitch="twitchLinked" :play-clicked="playClicked"></account-panel>
    <div id="main-content" class="main-content display-grid height-100vh">
        <photo-booth-ui id="photoBooth" ref="photoBooth" v-show="!ui.showHomeEquipUi" :loc="loc" :player-name="playerName" :item-type-change="ui.photoBooth.type" @bg-change-color="onPhotoboothBgColorChange" @bg-change-image="onPhotoBoothBgImageChange" @hide-ui="onPhotoBoothHideUi"></photo-booth-ui>
        <aside ref="mainAside" v-show="showScreen !== screens.photoBooth" class="main-aside">
            <main-sidebar ref="mainMenu" v-show="ui.showHomeEquipUi" :loc="loc" :firebase-id="firebaseId" :player-name="playerName" :menu-items="ui.mainMenu" :current-screen="showScreen" :screens="screens" :mode="equipMode" :current-mode="currentEquipMode" :is-game-paused="game.isPaused" :in-game="game.on" :play-clicked="playClicked" :picked-game-type="currentGameType" @previous-screen="setPreviousScreen"></main-sidebar>
            <house-ad v-show="showScreen !== screens.game && ui.showHomeEquipUi" :loc="loc" :upgrade-name="upgradeName" :is-upgraded="isUpgraded" :is-subscriber="isSubscriber" :has-mobile-reward="hasMobileReward" :crazy-games-active="ui.crazyGames" :is-poki="isPoki" :chw-count="chw.winnerCounter" :chw-ready="showAdBlockerVideoAd" :chw-limit-reached="chw.limitReached" :ad="ui.houseAds.small" :in-game="game.on" :play-clicked="playClicked" @chw-video-request="showNuggyPopup"></house-ad>
            <div id="chw-home">
                <chw ref="chwHomeScreen" :loc="loc" :chw="chw" :firebase-id="firebaseId" :current-screen="showScreen" :screens="screens" :ui="ui" :play-clicked="playClicked"></chw>
            </div>
            <!-- .chw-timer -->
        </aside>
        <!-- .chw-home-timer -->
        <main id="mainScreens">
            <div id="paper_doll_container" class="paper-doll-click-container centered z-index-1" v-show="showScreen === screens.home || showScreen === screens.equip">
                <!-- <img :src="factionLogo" class="box_absolute faction-logo faction-egg-doll-logo" v-show="faction.playerFaction !== null" @click="showFactionActivatedPopup"> -->
            </div>
            <home-screen id="home_screen" ref="homeScreen" v-show="(showScreen === screens.home || showScreen === screens.profile)"></home-screen>
            <equip-screen id="equip_screen" class="height-100vh" ref="equipScreen" v-show="showEquipScreens" @photo-booth-type-id="photoBoothTypeChange"></equip-screen>
            <game-screen id="game_screen" ref="gameScreen" v-show="(showScreen === screens.game)" :kname="killName" :kdname="killedName" @show-welcome-bundle-popup="onWelcomeBundlePopupShow"></game-screen>
        </main>
    </div>
    <div id="gameDescription" v-show="(showScreen === screens.home)">
        <section class="social-icons ss_marginright">
            <social-panel ref="socialIconPanel" id="social_panel" :loc="loc" :is-poki="isPoki" :use-social="ui.socialMedia.footer" :social-media="ui.socialMedia.selected"></social-panel>
        </section>
        <section class="game-info">
            <h1 class="text-center">{{ loc.home_desc_about }}</h1>
            <p class="text-center">{{ loc.home_desc_pick }}
                <svg class="eggIcon">
                    <use xlink:href="#icon-egg"></use>
                </svg>
                {{ loc.home_desc_loadout }}
                <svg class="eggIcon">
                    <use xlink:href="#icon-egg"></use>
                </svg>
                {{ loc.home_desc_madeof }}
            </p>
            <section class="text-center">
                <p>{{ loc.home_blocked_start }} deathegg.life {{ loc.home_blocked_end }}</p>
            </section>
            <div class="display-grid grid-column-2-eq gap-1 ">
                <section>
                    <p>{{ loc.home_desc_p1 }}</p>
                    <p>
                        <img v-lazyload :data-src="ui.lazyImages.homeEgg1" class="lazy-load" style="width: 350px; float: left; margin-right: 1em; shape-outside: polygon(0% 0%, 100% 0%, 100% 41%, 84% 48%, 80% 63%, 59% 74%, 46% 100%, 0% 99%);">{{ loc.home_desc_p2 }}
                    </p>
                </section>
                <section>
                    <p>
                        <img v-lazyload :data-src="ui.lazyImages.homeEgg2" class="lazy-load" style="float: right; margin-left: 1em; margin-top: 1em; shape-outside: polygon(1% 0%, 100% 1%, 100% 99%, 50% 100%, 28% 86%, 16% 68%, 14% 51%, 0 35%);">
                        {{ loc.home_desc_p3 }} <br /><br />
                        {{ loc.home_desc_p4 }}
                    </p>
                </section>
            </div>
            <section>
                <header>
                    <h2 class="text-center">{{ loc.home_game_mode_title }}</h2>
                </header>
                <ul class="display-grid grid-column-2-eq gap-1 ">
                    <li v-html="loc.home_game_mode_content_li_1"></li>
                    <li v-html="loc.home_game_mode_content_li_2"></li>
                    <li v-html="loc.home_game_mode_content_li_3"></li>
                    <li v-html="loc.home_game_mode_content_li_4"></li>
                </ul>
            </section>

            <h2 class="text-center">{{ loc.home_desc_controls }}</h2>
            <p class="text-center">{{ loc.home_desc_standard }}</p>

            <ul class="display-grid grid-column-2-eq" style="min-width: 25em;max-width: 35em;margin:0 auto">
                <li> {{ loc.home_desc_control1 }}</li>
                <li> {{ loc.home_desc_control2 }}</li>
                <li> {{ loc.home_desc_control3 }}</li>
                <li> {{ loc.home_desc_control4 }}</li>
                <li> {{ loc.home_desc_control5 }}</li>
                <li> {{ loc.home_desc_control6 }}</li>
                <li> {{ loc.home_desc_control7 }}</li>
                <li> {{ loc.home_desc_control8 }}</li>
                <li> {{ loc.home_desc_control9 }} </li>
            </ul>

            <p class="text-center">
                <button class="ss_button btn_lg btn_blue bevel_blue" @click="openUnblocked">{{ loc.home_unblocked_text }}</button>
            </p>
            <p v-html="footerLinksFormat"></p>

            <p align="center"><button class="ss_button btn_yolk bevel_yolk" @click="vueApp.scrollToTop()">{{ loc.home_backtotop }}</button></p>
        </section>

    </div>
    <!-- #gameDescription -->

    <!-- Popup: Settings -->
    <large-popup id="settingsPopup" ref="settingsPopup" @popup-closed="onSharedPopupClosed" @popup-opened="onSettingsPopupOpened" @popup-x="onSettingsX">
        <template slot="content">
            <settings id="settings" ref="settings" :loc="loc" :settings-ui="settingsUi" :languages="languages" :current-language-code="currentLanguageCode" :show-privacy-options="showPrivacyOptions" @privacy-options-opened="onPrivacyOptionsOpened" :is-from-eu="showPrivacyOptions" :controller-id="controllerId" :controller-type="controllerType" :lang-option="locLanguage" :is-vip="(isSubscriber || contentCreator)" :region-list="regionList" :current-region-id="currentRegionId"></settings>
        </template>
    </large-popup>

    <!-- Popup: Private Game Options -->
    <game-options-popup ref="gameOptionsPopup" id="gameOptionsPopup" :loc="loc" :game-options-popup="gameOptionsPopup"></game-options-popup>

    <!-- Popup: Privacy Options -->
    <small-popup id="privacyPopup" ref="privacyPopup" hide-cancel="true" @popup-closed="onSharedPopupClosed">
        <template slot="header">{{ loc.p_settings_privacy }}</template>
        <template slot="content">
            <label class="ss_checkbox label"> {{ loc.p_settings_of_age }}
                <input id="ofAgeCheck" type="checkbox" v-model="isOfAge" @change="ofAgeChanged($event)">
                <span class="checkmark"></span>
            </label>

            <label class="ss_checkbox label"> {{ loc.p_settings_target_ads }}
                <input id="targetedAdsCheck" type="checkbox" v-model="showTargetedAds" @change="targetedAdsChanged($event)">
                <span class="checkmark"></span>
            </label>
            <!--
            <input id="ofAgeCheck" type="checkbox" v-model="isOfAge" @change="ofAgeChanged($event)">&nbsp;{{ loc.p_settings_of_age }}<br>
            <input id="targetedAdsCheck" type="checkbox" v-model="showTargetedAds" @change="targetedAdsChanged($event)">&nbsp;<span id="targetedAdsText">{{ loc.p_settings_target_ads }}</span>
            -->
        </template>
        <template slot="confirm">{{ loc.ok }}</template>
    </small-popup>

    <!-- Popup: Help & Feedback -->
    <large-popup id="helpPopup" ref="helpPopup" stop-key-capture="true" @popup-closed="onSharedPopupClosed">
        <template slot="content">
            <help id="help" ref="help" :loc="loc" :account-type="accountStatus" :feedback-type="feedbackType" :open-with-type="feedbackSelected" @resetFeedbackType="resetFeedbackType"></help>
        </template>
    </large-popup>

    <!-- Popup: VIP Help & Feedback -->
    <large-popup id="vipPopup" ref="vipPopup" stop-key-capture="true" @popup-closed="onVipHelpClosed">
        <template slot="content">
            <vip-help id="vip-help" ref="vip-help" :loc="loc" :is-vip="isSubscriber"></help>
        </template>
    </large-popup>

    <!-- Popup: Egg Store -->
    <large-popup id="eggStorePopup" ref="eggStorePopup" stop-key-capture="true" @popup-closed="onSharedPopupClosed" :overlay-close="false">
        <template slot="content">
            <subscription-store id="eggStore" ref="eggStore" :loc="loc" :products="eggStoreItems" :sale-event="isSale"></subscription-store>
        </template>
    </large-popup>

    <!-- <img v-if="blackFridayBanner" class="black-friday-banner" style="display: none" src="img/black-friday-banner.jpg" alt="Black Friday Sale"/> -->

    <!-- Popup: VIP store -->
    <large-popup id="subStorePopup" ref="subStorePopup" stop-key-capture="true" @popup-closed="onSharedPopupClosed" :overlay-close="true">
        <template slot="content">
            <subscription-store id="shell-subscriptions" ref="shell-subscriptions" :loc="loc" :subs="subStoreItems"></subscription-store>
        </template>
    </large-popup>

    <!-- Popup: VIP ended -->
    <small-popup id="vipEnded" ref="vipEnded" stop-key-capture="true" @popup-confirm="showSubStorePopup" @popup-closed="onSharedPopupClosed" :overlay-close="true" class="vip">
        <template slot="content">
            <figure>
                <img v-lazyload :data-src="ui.lazyImages.vipEmblem" class="lazy-load" alt="Shell Shockers VIP">
            </figure>
            <div class="vip-ended-popup">
                <p v-html="subEndedMsg"></p>
            </div>
        </template>
        <template slot="confirm">{{ loc.account_vip_expire_3 }}</template>
        <template slot="cancel">{{ loc.account_vip_expired_2 }}</template>
    </small-popup>

    <!-- Popup: Egg Store single -->
    <large-popup id="popupEggStoreSingle" ref="popupEggStoreSingle" stop-key-capture="true" @popup-closed="onSharedPopupClosed" :overlay-close="false" class="popup-store-single">
        <template slot="content">
            <egg-store-item v-for="item in premiumShopItems" :key="item.sku" :item="item" :loc="loc" :account-set="accountSettled" v-if="eggStorePopupSku && item.sku === eggStorePopupSku"></egg-store-item>
        </template>
    </large-popup>

    <!-- Popup: Unsupported Platform -->
    <large-popup id="unsupportedPlatformPopup" ref="unsupportedPlatformPopup" hide-close="true">
        <template slot="content">
            <h2>{{ loc['unsupported_platform'] }}</h2>
            <div>{{ loc[unsupportedPlatformPopup.contentLocKey] }}</div>
        </template>
    </large-popup>

    <!-- Popup: Missing Features -->
    <large-popup id="missingFeaturesPopup" ref="missingFeaturesPopup" hide-close="true">
        <template slot="content">
            <h2>{{ loc['oh_no'] }}</h2>
            <span>{{ loc['missing_features'] }}</span>
            <ul>
                <li v-for="f in missingFeatures" v-html="f"></li>
            </ul>
            <span>{{ loc['missing_help'] }}</span>
        </template>
    </large-popup>

    <!-- Popup: No Anon -->
    <small-popup id="noAnonPopup" ref="noAnonPopup" @popup-confirm="onNoAnonPopupConfirm" @popup-closed="onSharedPopupClosed">
        <template slot="header">{{ loc.no_anon_title }}</template>
        <template slot="content">
            <div>{{ loc.no_anon_msg1 }}</div>
            <div>{{ loc.no_anon_msg2 }}</div>
        </template>
        <template slot="cancel">{{ loc.cancel }}</template>
        <template slot="confirm">{{ loc.no_anon_signup }}</template>
    </small-popup>

    <!-- Popup: Give Stuff -->
    <give-stuff-popup ref="giveStuffPopup" id="giveStuffPopup" :loc="loc" :give-stuff-popup="giveStuffPopup" :imgs="ui.lazyImages"></give-stuff-popup>

    <!-- Popup: Open URL -->
    <small-popup id="openUrlPopup" ref="openUrlPopup" @popup-confirm="onOpenUrlPopupConfirm" @popup-closed="onSharedPopupClosed">
        <template slot="header">{{ loc[openUrlPopup.titleLocKey] }}</template>
        <template slot="content">
            <!-- content not loc'd (yet) -->
            {{ openUrlPopup.content }}
        </template>
        <template slot="cancel">{{ loc[openUrlPopup.cancelLocKey] }}</template>
        <template slot="confirm">{{ loc[openUrlPopup.confirmLocKey] }}</template>
    </small-popup>

    <!-- Popup: Changelog -->
    <large-popup id="changelogPopup" ref="changelogPopup" @popup-closed="onSharedPopupClosed">
        <template slot="content">
            <h1 id="popup_title nospace" class="roundme_sm">
                {{ loc.changelog_title }}
            </h1>

            <div class="changelog_content roundme_lg">
                <section v-for="(log, idx) in changelog.current">
                    <h3>{{ log.version }} - <i><time>{{ log.date }}</time></i></h3>
                    <ul>
                        <li v-for="data in log.content" v-html="data"></li>
                    </ul>
                    <hr class="blue">
                </section>
            </div>

            <div id="btn_horizontal">
                <button v-if="changelog.showHistoryBtn" @click="showHistoryChangelogPopup" class="ss_button btn_green bevel_green">{{ loc.more }}</button>
                <button @click="hideChangelogPopup" class="ss_button btn_red bevel_red">{{ loc.close }}</button>
            </div>
        </template>
    </large-popup>

    <!-- Popup: Golden Chicken -->
    <large-popup id="goldChickenPopup" ref="goldChickenPopup" :overlay-close="false">
        <template slot="content">
            <gold-chicken-popup id="gold_chicken" ref="gold_chicken" :loc="loc" @close-chw-popup="hideChickenPopup" @open-chw-game="goldChickenPopupOpenChw"></gold-chicken-popup>
        </template>
    </large-popup>

    <!-- Popup: Chicken Nugget -->
    <large-popup id="chicknWinner" ref="chicknWinner" :hide-close="!chwMiniGameComplete" :overlay-close="chwMiniGameComplete" @popup-closed="onChwPopupClosed">
        <template slot="content">
            <chicken-nugget-popup id="chickenNugget" ref="chickenNugget" :key="chw.nuggetReset" :loc="loc" :firebase-id="firebaseId" :reward="chw.reward" :ad-unit="displayAd.adUnit.nugget" :chw="chw" @chw-start-reward="chwDoIncentivized" @chw-mini-game-complete="chwMiniGameCompleted"></chicken-nugget-popup>
            <display-ad id="shellshockers_chicken_nugget_banner_ad" ref="nuggetDisplayAd" class="pauseFiller center_h" :ignore-size="true" :ad-unit="displayAd.adUnit.nugget" ad-size="728x90"></display-ad>
        </template>
    </large-popup>

    <!-- Popup: Generic Message -->
    <small-popup id="genericPopup" ref="genericPopup" :popup-model="genericMessagePopup" :hide-cancel="true" @popup-closed="onSharedPopupClosed" @popup-confirm="onGenericPopupConfirm">
        <template slot="header">{{ loc[genericMessagePopup.titleLocKey] }}</template>
        <template slot="content">{{ loc[genericMessagePopup.contentLocKey] }}</template>
        <template slot="confirm">{{ loc[genericMessagePopup.confirmLocKey] }}</template>
    </small-popup>

    <!-- Popup: Anon warning message -->
    <small-popup v-if="isAnonymous" id="anonWarningPopup" ref="anonWarningPopup" :hide-close="true" :overlay-close="false" @popup-cancel="anonWarningPopupCancel" @popup-confirm="anonWarningPopupConfrim">
        <template slot="header"><img src="img/svg/ico_goldenEgg.svg" class="egg_icon" />{{ loc.account_anon_warn_popup_title }}! <img src="img/svg/ico_goldenEgg.svg" class="egg_icon" /></template>
        <template slot="content">
            <p v-html="anonPopupContent"></p>
        </template>
        <template slot="cancel">{{ loc.pwa_no_thanks }}</template>
        <template slot="confirm">{{ loc.sign_in }}</template>
    </small-popup>

    <!-- Popup: Need More eggs popup -->
    <small-popup id="needMoreEggsPopup" ref="needMoreEggsPopup" @popup-confirm="showEggStorePopup">
        <template slot="header">{{ loc.p_buy_isf_title }}!</template>
        <template slot="content">
            <p>{{ loc.p_buy_isf_content }}.</p>
        </template>
        <template slot="cancel">{{ loc.p_buy_item_cancel }}</template>
        <template slot="confirm">{{ loc.account_title_eggshop }}</template>
    </small-popup>

    <!-- Popup: Firebase Sign In -->
    <large-popup id="firebaseSignInPopup" ref="firebaseSignInPopup" :overlay-close="false" @popup-closed="hideFirebaseSignInMsgChat">
        <template slot="content">
            <h1 class="nospace">{{ loc.sign_in }}</h1>
            <div id="firebaseui-auth-container"></div>
            <p ref="signinMsgChat" id="signin-msg-chat" class="text-center text_blue4" style="display: none;">{{ loc.signin_msg_chat }}</p>
            <div id="btn_horizontal" class="f_center">
                <button @click="onSignInCancelClicked()" class="ss_button btn_red bevel_red btn_sm">{{ loc.cancel }}</button>
            </div>
        </template>
    </large-popup>

    <small-popup ref="adBlockerPopup" id="adBlockerPopup" :overlay-close="false" hide-confirm="true" hide-cancel="true" hide-close="true">
        <template slot="header">
            We've detected ad blocker!
        </template>
        <template slot="content">
            <p>To <i>avoid</i> this message please turn <i>off</i> ad blocker.</p>
            <h4>Please wait</h4>
            <h3>{{adBlockerCountDown}}</h3>
        </template>
    </small-popup>

    <!-- Popup: PWA -->
    <small-popup id="pwaPopup" class="pwa-popup" ref="pwaPopup" hide-confirm="true" @popup-closed="onSharedPopupClosed">
        <!-- <template slot="header">{{ loc.p_settings_privacy }}</template> -->
        <template slot="content">
            <p>{{loc.pwa_desc_one}}</p>
            <p>{{loc.pwa_desc_two}}</p>
            <button @click="pwaBtnClick" class="ss_button btn_big btn_green bevel_green btn_height_auto btn-pwa-download">
                <div class="pwa-btn-img-box roundme_lg bg-darkgreen">
                    <img src="favicon192.png" alt="Egg yolk">
                    <i class="fas fa-share" aria-hidden="true"></i>
                </div>
                {{loc.pwa_btn_line_one}}<br />{{loc.pwa_btn_line_two}}
            </button>
        </template>
        <template slot="cancel">{{loc.pwa_no_thanks}}</template>
    </small-popup>

    <large-popup id="adBlockerVideo" ref="adBlockerVideo" @popup-closed="onSharedPopupClosed" :overlay-close="false" hide-confirm="true" hide-cancel="true" hide-close="true">
        <template slot="content">
            <p class="text-center">{{ loc.ad_blocker_big_popup_title }}<br /> <span v-html="loc.ad_blocker_big_popup_desc"></span></p>
            <img v-lazyload :data-src="ui.lazyImages.adBlockPopup" class="lazy-load" alt="Please remove ad blockers" />
            <!-- <house-ad id="house-ad-video-replacement" ref="house-ad-video-replacement" :data="bannerHouseAd" :isshowing="showAdBlockerVideoAd"></house-ad> -->
        </template>
    </large-popup>

    <!-- <large-popup ref="kotcInstrucPopup" id="kotcInstrucPopup" :overlay-close="true" hide-confirm="true" hide-cancel="true">
        <template slot="content">
            <img class="kotc-wordmark" src="img/kotc/kotc-wordmark.svg" alt="">
            <div class="kotc-how-to-play-wrapper box_absolute">
                <h2 class="kotc-how-to-play-title text-center"><span class="roundme_md">{{ loc.home_kotc_popup_how_to }}</span><br />{{ loc.home_play }}!</h2>
                <img src="img/kotc/kotc-arrow.svg" aria-hidden="true">
            </div>
            <div class="display-grid grid-column-2-eq grid-gap-space-lg fullwidth ss_margintop_xxxxl">
                <div class="img-container roundme_lg fullwidth step-one">
                    <div class="fullwidth">
                        <p class="text-center"><span class="sr-only">Step </span>1</p>
                        <h6 class="text-center">{{loc.home_kotc_popup_step_one}}</h6>
                    </div>
                </div>
                <div class="img-container roundme_md fullwidth step-two">
                    <div class="fullwidth">
                        <p class="text-center"><span class="sr-only">Step </span>2</p>
                        <h6 class="text-center">{{loc.home_kotc_popup_step_two}}</h6>
                    </div>
                </div>
            </div>
            <div class="display-grid grid-column-2-eq grid-gap-space-lg roundme_md fullwidth ss_margintop_lg kotc-play-now step-three-wrapper">
                <div class="fullwidth box_relative step-three">
                    <img class="kotc-logo box_absolute" src="img/kotc/kotc-rooster.svg" alt="The King of the Coop Rooster">

                    <div>
                        <p class="text-center"><span class="sr-only">Step </span>3</p>
                        <h6 class="text-center" v-html="loc.home_kotc_popup_step_three"></h6>
                    </div>
                </div>
                <div class="fullwidth f_col f_space_between">
                    <div class="display-grid grid-column-5-eq kotc-crowns">
                    <img aria-hidden="true" src="img/kotc/kotc-crown.svg" alt="Crowns">
                    <img aria-hidden="true" src="img/kotc/kotc-crown.svg" alt="Crowns">
                    <img aria-hidden="true" src="img/kotc/kotc-crown.svg" alt="Crowns">
                    <img aria-hidden="true" src="img/kotc/kotc-crown.svg" alt="Crowns">
                    <img aria-hidden="true" src="img/kotc/kotc-crown.svg" alt="Crowns">
                    </div>
                    <button class="ss_button btn_big btn_green bevel_green fullwidth" @click="onClickPlayKotcNow"><i class="fa fa-play fa-sm"></i> {{ loc.home_play }}</button>
                </div>
            </div>
        </template>   
    </large-popup> -->

    <large-popup ref="notificationPopup" id="notificationPopup" @popup-closed="onSharedPopupClosed" :overlay-close="false" :hide-close="true">
        <template slot="header">Notifications</template>
        <template slot="content">
            <notification-content ref="notifiContent" :notification="ui.notification" :loc="loc" :bonus="ui.bonus.showing" @open-bundle="onOpenBundle" @close-popup="onCloseNotification"></notification-content>
        </template>
    </large-popup>

    <!-- Popup: Banned -->
    <large-popup id="bannedPopup" ref="bannedPopup" hide-close="true">
        <template slot="content">
            <h1>{{ loc['banned_title'] }}</h1>
            <p>{{ loc['banned_msg'] }}</p>
            <p>{{ loc['banned_expire'] }} {{ bannedPopup.expire }}</p>
        </template>
    </large-popup>
    <!--
    <small-popup id="openUrlPopup" ref="openUrlPopup" @popup-confirm="onOpenUrlPopupConfirm" @popup-closed="onSharedPopupClosed">
        <template slot="header">{{ loc[openUrlPopup.titleLocKey] }}</template>
        <template slot="content">
            {{ openUrlPopup.content }}
        </template>
        <template slot="cancel">{{ loc[openUrlPopup.cancelLocKey] }}</template>
        <template slot="confirm">{{ loc[openUrlPopup.confirmLocKey] }}</template>
    </small-popup>
-->



    <small-popup id="deleteAccountApprovalPopup" ref="deleteAccountApprovalPopup" @popup-confirm="onAccountDelectionConfirmed">
        <!-- <template slot="header">{{ loc.p_settings_privacy }}</template> -->
        <template slot="content">
            <h1 v-html="loc.feedback_account_deletion_title"></h1>
            <p class="text-center">
                <i class="fas fa-exclamation-triangle fa-2x text_red"></i>
            </p>
            <p v-html="loc.feedback_account_deletion_desc_1"></p>
            <p v-html="loc.feedback_account_deletion_desc_2"></p>
        </template>
        <template slot="cancel">{{loc.cancel}}</template>
        <template slot="confirm">{{loc.feedback_account_delection_confirm}}</template>
    </small-popup>

    <!-- Popup: Leave Game Confirm -->
    <small-popup id="leaveGameConfirmPopup" ref="leaveGameConfirmPopup" :overlay-close="false" :hide-close="true" @popup-confirm="onLeaveGameConfirm" @popup-cancel="onLeaveGameCancel" @popup-opened="sharedIngamePopupOpened" @popup-closed="sharedIngamePopupClosed">
        <template slot="header">{{ loc.leave_game_title }}</template>
        <template slot="content">
            <p>{{ loc.leave_game_text }}</p>
        </template>
        <template slot="cancel">{{ loc.no }}</template>
        <template slot="confirm">{{ loc.yes }}</template>
    </small-popup>

    <small-popup id="fbTransferAccountSignin" ref="fbTransferAccountSignin" :hide-confirm="true" :overlay-close="false" @popup-cancel="onLeaveGameCancel" @popup-opened="sharedIngamePopupOpened" @popup-closed="sharedIngamePopupClosed">
        <!-- <template slot="header">{{ loc.leave_game_title }}</template> -->
        <template slot="content">
            <p>{{ loc.signin_fb_msg}}</p>
        </template>
        <template slot="cancel">{{ loc.close }}</template>
        <!-- <template slot="confirm">{{ loc.yes }}</template> -->
    </small-popup>

    <!-- Popup: Tutorial -->
    <small-popup id="tutorialPopup" ref="tutorialPopup" :hide-confirm="true" :hide-cancel="true" @popup-closed="onTutorialClosed">
        <template slot="header">{{ loc.tutorial_title }}</template>
        <template slot="content">
            <div class="box_relative display-grid grid-template tutorial-labels">
                <span v-for="(item, idx) in ui.tutorialPopup.keys" :key="idx" v-html="loc[item.locKey]" class="box_absolute" :class="item.cls"></span>
                <img src="img/tutorial/ss_tutorial_Keyboard.webp" class="tutorial-keyboard" alt="Tutorial keyboard image">
                <img src="img/tutorial/ss_tutorial_Mouse.webp" class="tutorial-mouse" alt="Tutorial mouse image">
            </div>
            <div class="tutorial-content display-grid align-items-center center_h">
                <div>
                    <img src="img/tutorial/ss_tutorial_EggTarget.webp" class="tutorial-egg" alt="Tutorial egg image">
                </div>
                <ul class="tutorial-list list-no-style">
                    <li class="text-left">{{ loc.tutorial_point_1 }}</li>
                    <li class="text-left">{{ loc.tutorial_point_2 }}</li>
                    <li class="text-left">{{ loc.tutorial_point_3 }}</li>
                </ul>
            </div>
        </template>
    </small-popup>

    <!-- Popup: xsollaPopup -->
    <small-popup id="xsollaPopup" ref="xsollaPopup" @popup-confirm="xsollaPopupConfrim" @popup-cancel="xsollaPopupCancel">
        <template slot="header">Warning!</template>
        <template slot="content">
            <div>Welcome to our exciting world of egg recipe experiments! Please note that while we're eager to explore the endless possibilities, we cannot guarantee the outcome of all purchases. So, let's embark on this culinary adventure together, but be prepared for the occasional crack in the shell. Happy cooking!</div>
        </template>
        <template slot="cancel">{{ loc.cancel }}</template>
        <template slot="confirm">Continue</template>
    </small-popup>

    <small-popup id="loginPopupWarning" ref="loginPopupWarning" @popup-confirm="onLeaveGameConfirmedSignIn">
        <template slot="header">{{ loc.sign_in_and_leave_game }}</template>
        <template slot="content">
            <div>
                <p class="text-left">{{ loc.sign_in_and_leave_game_1 }}</p>
                <ul class="text-left">
                    <li>
                        {{ loc.sign_in_and_leave_game_2 }}
                    </li>
                    <li>
                        {{ loc.sign_in_and_leave_game_3 }}
                    </li>
                    <li>
                        {{ loc.sign_in_and_leave_game_4 }}
                    </li>
                </ul>
            </div>
        </template>
        <template slot="cancel">{{ loc.no }}</template>
        <template slot="confirm">{{ loc.yes }}</template>
    </small-popup>

    <small-popup id="logOutPopupWarning" ref="logOutPopupWarning" @popup-confirm="onLeaveGameConfirmedSignOut">
        <template slot="header">{{ loc.sign_out_and_leave_game }}</template>
        <template slot="cancel">{{ loc.no }}</template>
        <template slot="confirm">{{ loc.yes }}</template>
    </small-popup>

    <!-- <div id="kotc-play-kotc" class="kotc-play-kotc display-grid">
		<img class="kotc-play-kotc-watermark" src="img/kotc/kotc-crown-indicator.svg" alt="">
		<img class="kotc-play-kotc-arrow" src="img/kotc/kotc-arrow.svg" aria-hidden="true">
	</div> -->
    <!-- #kotc-play-kotc -->

    <!-- Popup: chromeIsABuggerPopup -->
    <large-popup id="chromeIsABuggerPopup" ref="chromeIsABuggerPopup" :overlay-close="false">
        <template slot="content">
            <h1 class="nospace">{{ loc.chrome_is_a_bugger_popup_title }}</h1>
            <p class="ss_marginbottom_xl" v-html="loc.chrome_is_a_bugger_popup_desc"></p>
            <div class="display-grid grid-column-2-eq">
                <img src="img/chromeIsABuggerPopup-guide-1.webp" alt="chrome guide 1 how to give shell mouse control">
                <img src="img/chromeIsABuggerPopup-guide-2.webp" alt="chrome guide 2 how to give shell mouse control">
            </div>
        </template>
    </large-popup>

    <large-popup id="welcomeBundlePopup" ref="welcomeBundlePopup" :overlay-close="false" @popup-closed="onWelcomeBundlePopupClosed">
        <template slot="content">
            <img v-lazyload :data-src="ui.lazyImages.welcomePackPopup" class="lazy-load" @click="onWelcomeBundlePopupConfirm" alt="">
        </template>
    </large-popup>

    <!-- <large-popup ref="factionPopup" id="factionPopup" @popup-closed="onFactionPopupClosed" :class="factionsPopupStyle">
		<template slot="header">Factions Popup</template>
		<template slot="content">
			<factions-popup :loc="loc" @close-popup="onFactionPopupClosed" @play-now-clicked="factionsPlayNowClicked" @factions-equip-item="factionsEquipItem" :factions="faction.factions" :player-faction="faction.playerFaction" :cooldown-timer="faction.switchTimer" :eggs="eggs" :firebase-id="firebaseId"></notification-content>
		</template>
	</large-popup> -->

</div> <!-- End of vue instance div -->



<script>
    var vueApp;
    var vueData = {
    ready: false,
    accountSettled: false,
    missingFeatures: [],
	showChangelogHistoryBtn: true,
	itemSearchVal: '',
	changelog: {
		version: '',
		current: [],
		history: [],
		showHistoryBtn: true
	},
	signInAttempts: 0,
	chatInitiatesLogin: false,
	onClickSignIn: false,
	checkProducts: 0,

    firebaseId: null,
    photoUrl: null,
    maskedEmail: null,
    isEmailVerified: false,
    isAnonymous: true,
    showPrivacyOptions: isFromEU,
    isOfAge: false,
    showTargetedAds: false,
    delayTheCracking: false,
    displayAdFunction: Function,
    titleScreenDisplayAd: Function,
    displayAdObject: false,
    hideAds: false,

	feedbackSelected: null,

    isPoki: false,
    isPokiGameLoad: false,
    pokiRewardReady: false,
    isPokiNewRewardTimer: false,
    videoRewardTimers: {
        initial: 300000,
        primary: 420000
    },

    pokiRewNum: 1,

	eggOrg: {
		active: false,
		leaderboard: {
			0: 0,
			1: 0
		},
	},

	faction: {
		showPopup: false,
		factions: {
			0: 'Masters',
			1: 'Assasins'
		},
		items: {
			0: 1584,
			1: 1585,
		},
		playerFaction: null,
		switchTimer : null,
	},

	tipComp: {
		loading: {
			ref: 'LoadingMsgs',
			time: null,
		},
		tips : {
			ref: 'tipMsg',
			refAlt: 'tipMsgAlt',
			time: 10000,
		}
	},


    displayAd: {
        adUnit: {
            home: 'shellshockers_titlescreen',
            nugget: 'shellshockers_chicken_nugget_banner',
            house: 'ShellShockers_LoadingScreen_HouseAds',
			spinner: 'shellshockers_respawn_banner',
			respawn: RESPAWNADUNIT,
			respawnTwo: RESPAWN2ADUNIT,
			respawnThree: RESPAWN3ADUNIT,
			header: 'shellshock-io_728x90_HP',
        },
		header: 0
    },

    cGrespawnBannerTimeout: null,
    cGrespawnBannerErrors: 0,

    classIdx: 0,
    playerName: '',
    eggs: 0,
    kills: 0,
    deaths: 0,
    kdr: 0,
    streak: 0,
	accountCreated: null,
	kdrLifetime: 0,
	statsCurrent: {},
	statsLifetime: {},
	challengesClaimedUnique: 0,
	challengesClaimed : {
		total: 0,
		unique: 0
	},
	eggsSpent: 0,
	eggsSpentMonthly: 0,
	eggsEarnedBalance: 0,
    isUpgraded: false,
    upgradeName: '',
    isSubscriber: false,
	regionList: [], // Populated by Matchmaker API
    currentRegionId: null,
	currentRegionLocKey: '',
    currentGameType: 0,
    volume: 0,
   	getMusicVolume: 0.5,
	selectedWeaponDisabled: false,

    currentLanguageCode: 'en',

	feedbackType: {
		comment: {id: 0, locKey: 'fb_type_commquest'},
		request: {id: 1, locKey: 'fb_type_request'},
		bug: {id: 2, locKey: 'fb_type_bug'},
		purchase: {id: 3, locKey: 'fb_type_purchase'},
		account: {id: 4, locKey: 'fb_type_account'},
		abuse: {id: 5, locKey: 'fb_type_abuse'},
		other: {id: 6, locKey: 'fb_type_other'},
		delete: {id: 7, locKey: 'fb_type_delete'}
	},

	icon: {
		inventory : 'ico-nav-equipment',
		shop: 'ico-nav-shop',
		invite: 'fas fa-user-friends',
		home: 'ico-nav-home',
		user: 'ico-nav-profile',
		settings: 'fas fa-cog',
		fullscreen: 'fas fa-expand-alt',
		egg: 'fas fa-egg',
		dollar: 'fas fa-dollar-sign'
	},

	showScreen: 0,
	previousScreen: 0,
	screens: {
		home: 0,
		equip: 1,
		game: 2,
		profile: 3,
		photoBooth: 4,
	},

	currentEquipMode: null,

	equipMode: {
		inventory: 0,
		gear: 1,
		featured: 2,
		skins: 3,
		shop: 4,
	},

    ui: {
		noob: {
		},
        overlayType: {
            none: 0,
            dark: 1,
            light: 2,
        },
        overlayClass: {
            inGame: 'overlay_game'
        },
        team: {
            blue: 1,
            red: 2
        },
        houseAds: {
            small: null,
            big: null,
			homeScreen: []
        },
        showCornerButtons: true,
		hideUi: false,
		showHomeEquipUi: true,

		events: {
			twitch: false,
		},
		crazyGames: false,

		photoBooth: {
			type: 1,
			vignette: false,
		},
		homeToGameProgressBar: {
			progressValue: 0,
			totalAssets: 4, // Adjust this based on the actual number of assets
			loadedAssets: 0,
			nonAccountTotal: 8,
			accountTotal: 4
		},

		tutorialPopup: {
			show: false,
			keys: [
				{ locKey: 'keybindings_grenade', cls: 'tutorial-grenade' },
				{ locKey: 'keybindings_melee', cls: 'tutorial-melee' },
				{ locKey: 'keybindings_reload', cls: 'tutorial-reload' },
				{ locKey: 'keybindings_fire', cls: 'tutorial-shoot' },
				{ locKey: 'keybindings_aim', cls: 'tutorial-aim' },
				{ locKey: 'keybindings_jump', cls: 'tutorial-jump' },
				{ locKey: 'keybindings_swapweapon', cls: 'tutorial-swap-weapons' },
				{ locKey: 'tutorial_move_up', cls: 'tutorial-move-up' },
				{ locKey: 'tutorial_move_down', cls: 'tutorial-move-down' },
				{ locKey: 'tutorial_move_left', cls: 'tutorial-move-left' },
				{ locKey: 'tutorial_move_right', cls: 'tutorial-move-right' },
				{ locKey: 'tutorial_q', cls: 'tutorial-q tutorial-special-keys tutorial-key-top text-uppercase text_blue5' },
				{ locKey: 'tutorial_w', cls: 'tutorial-w tutorial-special-keys tutorial-key-top text-uppercase text_blue5' },
				{ locKey: 'tutorial_e', cls: 'tutorial-e tutorial-special-keys tutorial-key-top text-uppercase text_blue5' },
				{ locKey: 'tutorial_r', cls: 'tutorial-r tutorial-special-keys tutorial-key-top text-uppercase text_blue5' },
				{ locKey: 'tutorial_a', cls: 'tutorial-a tutorial-special-keys tutorial-key-bottom text-uppercase text_blue5' },
				{ locKey: 'tutorial_s', cls: 'tutorial-s tutorial-special-keys tutorial-key-bottom text-uppercase text_blue5' },
				{ locKey: 'tutorial_d', cls: 'tutorial-d tutorial-special-keys tutorial-key-bottom text-uppercase text_blue5' },
				{ locKey: 'tutorial_f', cls: 'tutorial-f tutorial-special-keys tutorial-key-bottom text-uppercase text_blue5' },
				{ locKey: 'tutorial_spacebar', cls: 'tutorial-spacebar tutorial-special-keys text-uppercase text_blue5'},
				{ locKey: 'tutorial_move_shift', cls: 'tutorial-shift tutorial-special-keys text-uppercase text_blue5' },
			],
			imgKeys: '',
			imgMouse: '',
		},

		lazyImages: {
			homeEgg1: 'img/eggPose05.webp',
			homeEgg2: 'img/eggPose01.webp',
			vipEmblem: 'img/vip-club/vip-club-popup-emblem.webp',
			vipPayment: 'img/store/UI_paymentOptions.webp',
			vipPopupBg: 'img/vip-club/vip-club-popup-background.webp',
			chwPopup: 'img/chicken-nugget/ssAd_chicknWinner800x600-min.webp',
			rickRoll: 'img/rickroll.gif',
			adBlockPopup: 'img/shellshockers-unite-lg.webp',
			vipImportant: 'img/vip-club/very-important-poultry.webp',
			eggPackSm: 'img/egg_pack_small.webp',
			goldenEgg: 'img/svg/ico_goldenEgg.svg',
			eggOrgGiveStuff: 'img/egg-org/eggOrg_timeTravel_splash800x600-min.webp',
			welcomePack: 'img/eggstra-value-pack.webp',
			welcomePackPopup: 'img/welcome-pass-popup.webp',
			kotcArrow: '/img/kotc/kotc-arrow.svg',
			chwChest: '/chicken-nugget/chw-loot-btn.webp'
		},

		notification: null,
		bonus: {
			showing: false,
			amount: 1000
		},

		mainMenu: [
			{
				locKey: 'account_title_home',
				icon: 'ico-nav-home',
				screen: 0,
				mode: [],
				hideOn: [2],
			},
			{
				locKey: 'account_title_profile',
				icon: 'ico-nav-profile',
				screen: 3,
				mode: [],
				hideOn: [],
			},
			{
				locKey: 'p_pause_equipment',
				icon: 'ico-nav-equipment',
				screen: 1,
				mode: [0],
				hideOn: [],
			},
			{
				locKey: 'eq_shop',
				icon: 'ico-nav-shop',
				screen: 1,
				mode: [3, 4, 2],
				hideOn: [],
			},
			// {
			// 	locKey: 'screen_photo_booth_menu',
			// 	icon: 'ico-nav-shop',
			// 	screen: 4,
			// 	mode: [],
			// 	hideOn: [],
			// },
		],
		profile: {
			statTab: 0,
			statTabClicked: false
		},
		playerListOverflow: false,
		typeSelectors: [
			{
				img: ItemIcons.Primary,
				type: ItemType.Primary
			},
			{
				img: ItemIcons.Secondary,
				type: ItemType.Secondary
			},
			{
				img: ItemIcons.Stamp,
				type: ItemType.Stamp
			},
			{
				img: ItemIcons.Hat,
				type: ItemType.Hat
			},
			{
				img: ItemIcons.Grenade,
				type: ItemType.Grenade
			},
			{
				img: ItemIcons.Melee,
				type: ItemType.Melee
			}
		],

		socialMedia: {
			footer: [
				{name: 'Facebook', reward: 'Facebook', url: 'https://www.facebook.com/bluewizarddigital', imgPath: 'footer-social-media-bubble-facebook.webp', icon: 'fa-facebook', id: 1227, owned: false},
				{name: 'Twitter', reward: 'Twitter', url: 'https://twitter.com/bluewizardgames', imgPath: 'footer-social-media-bubble-twitter.webp', icon: 'fa-twitter', id: 1234, owned: false},
				{name: 'Instagram', reward: 'Instagram', url: 'https://www.instagram.com/bluewizardgames/', imgPath: 'footer-social-media-bubble-instagram.webp', icon: 'fa-instagram', id: 1219, owned: false},
				{name: 'TikTok', reward: 'tiktok', url: 'https://www.tiktok.com/@bluewizarddigital', imgPath: 'footer-social-media-bubble-tiktok.webp', icon: 'fa-tiktok', id: 1208, owned: false},
				{name: 'Discord', reward: 'discord', url: 'https://discord.gg/bluewizard', imgPath: 'footer-social-media-bubble-discord.webp', icon: 'fa-discord', id: 1200, owned: false},
				{name: 'Steam', reward: 'Steam', url: 'https://store.steampowered.com/publisher/bluewizard', imgPath: 'footer-social-media-bubble-steam.webp', icon: 'fa-steam-symbol', id: 1223, owned: false},
				{name: 'Twitch', reward: 'Twitch', url: 'https://www.twitch.tv/bluewizarddigital', imgPath: 'footer-social-media-bubble-twitch.webp', icon: 'fa-twitch', id: 1268, owned: false},
				{name: 'newYolker', reward: '', url: 'https://bluewizard.com/subscribe-to-the-new-yolker', imgPath: '', icon: 'fa-envelope-open-text', id: null, owned: null},
			],
			selected: ''
		},
		isEvent: {
			active: false,
			houseAdImg: '',
			homeBtnImg: '',
			popupImg: '',
			popupBtnLoc: '',

		},
		premiumFeaturedTag: '',
		game : {
			stats: {
				loading: false
			},
			spectate: false,
			spectatingPlayerName: null
		}
    },

	twitchLinked: 0,
	twitchName: '',
    languages: [
            { name: 'English', code: 'en' },
            { name: 'French', code: 'fr' },
            { name: 'German', code: 'de' },
            { name: 'Russian', code: 'ru' },
            { name: 'Spanish', code: 'es' },
            { name: 'Portuguese', code: 'pt' },
            { name: 'Korean', code: 'ko' },
            { name: 'Chinese', code: 'zh' },
            { name: 'Dutch', code: 'nl' }
        ],

	locLanguage: {},
    playTypes: {
        joinPublic: 0,
        createPrivate: 1,
        joinPrivate: 2
    },

    gameTypes: [
		{ locKey: 'gametype_ffa', value: 0, order: 2 },
        { locKey: 'gametype_teams', value: 1, order: 1 },
        { locKey: 'gametype_ctf', value: 2, order: 0 },
        { locKey: 'gametype_king', value: 3, order: 3 },
    ],
    // This makes me mad, but until Vue is put in the clojure with GameType,
    // where it should have been to begin with, HERE IT IS >:(
	gameTypeKeys: [
        'FFA',
        'Teams',
        'Spatula',
        'King'
    ],

	reportReasons: [
		{ locKey: 'report_reason_cheating', value: 1 },
		{ locKey: 'report_reason_harassment', value: 2 },
		{ locKey: 'report_reason_offensive', value: 4 },
		{ locKey: 'report_reason_other', value: 8 }
	],

	banDurations: [
		{ label: '5 Minutes', value: 0 },
		{ label: '15 Minutes', value: 1 },
		{ label: '1 hour', value: 2 }
	],

    twitchStreams: [],
    youtubeStreams: [],
    newsfeedItems: [],
	maps: [],
    settingsUi: {
		settings: [],
        adjusters: {
            misc: [
                { id: 'volume', locKey: 'p_settings_mastervol', min: 0, max: 1, step: 0.01, value: 1, multiplier: 100 }
            ],
            mouse: [
                { id: 'mouseSpeed', locKey: 'p_settings_mousespeed', min: 1, max: 100, step: 1, value: 30 }
            ],
            gamepad: [
                { id: 'sensitivity', locKey: 'p_settings_sensitivity', min: 1, max: 100, step: 1, value: 30 },
                { id: 'deadzone', locKey: 'p_settings_deadzone', min: 0, max: 1, step: 0.01, value: 0.3, precision: 2 }
            ],
            // music: [
            //     { id: 'musicVolume', locKey: 'p_settings_music_volume', min: 0, max: 1, step: 0.01, value: 0.5,  multiplier: 100 }
            // ],
        },
        togglers: {
            misc: [
                { id: 'holdToAim', locKey: 'p_settings_holdtoaim', value: true },
                { id: 'enableChat', locKey: 'p_settings_enablechat', value: true },
                { id: 'safeNames', locKey: 'p_settings_safenames', value: false },
                { id: 'autoDetail', locKey: 'p_settings_autodetail', value: true },
                { id: 'shadowsEnabled', locKey: 'p_settings_shadows', value: true },
                { id: 'highRes', locKey: 'p_settings_highres', value: false },
                // { id: 'musicStatus', locKey: 'p_settings_music', value: true }
            ],
			misc2: [
                { id: 'hideBadge', locKey: 'p_settings_badge_hide', value: false },
                { id: 'closeWindowAlert', locKey: 'p_settings_close_alert', value: false },
				{ id: 'shakeEnabled', locKey: 'p_settings_shake', value: true },
				{ id: 'centerDot', locKey: 'p_settings_center_dot', value: true },
				{ id: 'hitMarkers', locKey: 'p_settings_hit_markers', value: true },
			],
            mouse: [
                { id: 'mouseInvert', locKey: 'p_settings_invertmouse', value: false },
				{ id: 'fastPollMouse', locKey: 'p_settings_fastpollmouse', value: false },
            ],
            gamepad: [
                { id: 'controllerInvert', locKey: 'p_settings_invertcontroller', value: false },
            ]
        },
        controls: {
            keyboard: {
                // The ids map to the field names in settings.controls[category]
                game: [
                    { id: 'up', side: 'left', locKey: 'keybindings_forward', value: 'W' },
                    { id: 'down', side: 'left', locKey: 'keybindings_backward', value: 'S' },
                    { id: 'left', side: 'left', locKey: 'keybindings_left', value: 'A' },
                    { id: 'right', side: 'left', locKey: 'keybindings_right', value: 'D' },
                    { id: 'jump', side: 'left', locKey: 'keybindings_jump', value: 'SPACE' },
					{ id: 'melee', side: 'left', locKey: 'keybindings_melee', value: 'F' },
					{ id: 'inspect', side: 'left', locKey: 'keybindings_inspect', value: 'G' },
					{ id: 'despawn', side: 'left', locKey: 'keybindings_despawn', value: 'P' },
                    { id: 'fire', side: 'right', locKey: 'keybindings_fire', value: 'MOUSE 0' },
                    { id: 'scope', side: 'right', locKey: 'keybindings_aim', value: 'SHIFT' },
                    { id: 'reload', side: 'right', locKey: 'keybindings_reload', value: 'R' },
                    { id: 'swap_weapon', side: 'right', locKey: 'keybindings_swapweapon', value: 'E' },
                    { id: 'grenade', side: 'right', locKey: 'keybindings_grenade', value: 'Q' },
                ],
                spectate: [
					{ id: 'ascend', locKey: 'keybindings_spectate_ascend', value: 'SPACE' },
					{ id: 'descend', locKey: 'keybindings_spectate_descend', value: 'SHIFT' },
					{ id: 'toggle_freecam', locKey: 'keybindings_spectate_freecam', value: 'V' },
                    { id: 'slow', locKey: 'keybindings_spectate_slow', value: 'MOUSE 0'},
                ]
            },
            gamepad: {
                // The ids map to the field names in settings.gamepad[category]
                game: [
                    { id: 'jump', locKey: 'keybindings_jump', value: '0' },
                    { id: 'fire', locKey: 'keybindings_fire', value: '1' },
                    { id: 'scope', locKey: 'keybindings_aim', value: '2' },
                    { id: 'reload', locKey: 'keybindings_reload', value: '3' },
                    { id: 'swap_weapon', locKey: 'keybindings_swapweapon', value: '4' },
                    { id: 'grenade', locKey: 'keybindings_grenade', value: '5' },
					{ id: 'melee', locKey: 'keybindings_melee', value: '6' },
					{ id: 'inspect', locKey: 'keybindings_inspect', value: '7' }
                ],
                spectate: [
                    { id: 'ascend', locKey: 'keybindings_spectate_ascend', value: '1' },
                    { id: 'descend', locKey: 'keybindings_spectate_descend', value: '2' }
                ]
            }
        }
    },

    songChanged: false,

    music: {
        isMusic: false,
        musicJson: 'data/sponsors.json',
        musicSrc: '',
        theAudio: '',
        playing: false,
        sponsors: {},
        sponsor: '',
        currIndex: 0,
        currentTime: 0,
        duration: 0,
        timer: null,
        progress: 0,
        volume: 10,
        hideClass: 'music-widget--fade-out',
        serverTracks: {
            id: '',
            title: '',
            artist: '',
            album: '',
            albumArt: '',
            url: '',
            trackUrltest: 'https://shellshock.io',
            sponsor: '',
            sponsorUrl: '',
        }
    },

    home: {        
        joinPrivateGamePopup: {
            code: '',
            showInvalidCodeMsg: false,
            validate: function () {
                if (this.code.length == 0) {
                    console.log('failed validation');
                    this.showInvalidCodeMsg =true;
                    BAWK.play('ui_reset');
                    return false;
                }
                console.log('passed validation');
                return true;
            },
            reset: function () {
                this.code = '';
                this.showInvalidCodeMsg = false;
            }
        },
		gaugeData: {
			default: {
				min: 164,
				max: 196,
				default: 180,
			},
			min: 185,
			max: 195,
			loadvalue: 190,
			setValue: 180,
			active: false,
		},
		vipEndedType: 0,
		welcomeBundleInfoRequested: false,
    },

	hvsm: {
		hero: {
			name: 'Heroes',
			items: [],
			img: 'img/gauge-bar/shell_E&E_good_popup.webp',
		},
		monster: {
			name: 'Monsters',
			items: [],
			img: 'img/gauge-bar/shell_E&E_evil_popup.webp',
		},
	},

    equip: {
        get showingItems () {
            return this._showingItems;
        },
        set showingItems (items) {
            this._showingItems = items;
			for (let i = 0; i < this.lazyRenderTimeouts.length; ++i) {
				clearTimeout(this.lazyRenderTimeouts[i]);
			}
        },
        lazyRenderTimeouts: [],
        equippedPrimary: null,
        equippedSecondary: null,
        equippedHat: null,
        equippedStamp: null,
        equippedGrenade: null,
        posingHat: null,
        posingStamp: null,
        posingWeapon: null,
        posingGrenade: null,
        posingMelee: null,
        posingStampPositionX: 0,
        posingStampPositionY: 0,
        showingWeaponType: ItemType.Primary,
        selectedItemType: ItemType.Primary,
		itemSearchTerm:  '',
		itemSearchNone: false,
		itemSearchVal: '',
        selectedItem: null,
        _showingItems: [],
        buyingItem: null,
        colorIdx: 0,
        extraColorsLocked: true,
        categoryLocKey: null,
        showSpecialItems: false,
        specialItemsTag: null,
		showUnVaultedItems: [],
		bundlePopupItems: [],
		chwRewardBuyItem: false,
		displayAdHeaderRefresh: true,
		bundle: {
			owned: false,
			items: [],
		},

        redeemCodePopup: {
            code: '',
            showInvalidCodeMsg: false,
            validate: function () {
                if (this.code.length == 0) {
                    console.log('failed validation');
                    this.showInvalidCodeMsg = true;
                    BAWK.play('ui_reset');
                    return false;
                }
                console.log('passed validation');
                return true;
            },
            reset: function () {
                this.code = '';
                this.showInvalidCodeMsg = false;
            }
        },

        physicalUnlockPopup: {
            item: null
        }
    },

    game: {
		eggOrg: {
			stats: {
				0: 0,
				1: 0
			}
		},
		on: false,
		isPaused: true,
        shareLinkPopup: {
            url: '',
            code: ''
        },
        gameType: 0,
        team: 1,
        respawnTime: 0,
        tipIdx: 0,
        isGameOwner: false,
		openPopupId: '',
        pauseScreen: {
            id: 'pausePopup',
            adContainerId: 'pauseAdPlacement',
            classChanged: false,
            wasGameInventoryOpen: false,
			mainContainer: '',
			canvas: '',
			showMenu: true,
        },
		disableRespawn: false,
		mapName: '',
		serverName: '',
		killDeathMsg: {
			showing: false,
			msgs: [],
			msg: '',
			style: '',
			timer: null,
		},
		challengeMsg: {
			showing: false,
			msgs: [],
			icon: '',
			title: '',
			timer: null,
		},
		ctsMsg: {
			showing: false,
			teams: ['', 'blue', 'red'],
			team: 0,
			msg: '',
			timer: null,
		},
		streakMsg: {
			showing: false,
			msg: '',
			count: 0,
			timer: null,
		},
		bestStreak: {
			count: 0,
			timer: null,
		},
		ingameNotification: {
			item: {type: 0, msg: '', streak : 0, style: ''},
			showing: false,
			timer: null,
			multiTimer: null,
		},
		inGameNotification: {
			type: 0,
			timer: null,
		},
		shellStreakTimers: [
			{
				msg: 'ks_double_eggs',
				msgId: 'double-eggs',
			},
			{
				msg: 'ks_miniegg',
				msgId: 'shrink',
			},
			{
				msg: 'ks_dmg',
				msgId: 'egg-breaker',
			},
			{
				msg: 'ks_restock',
				msgId: 'restock',
			}
		],
		showWelcomeBundleCta: false,
    },

    isEvent: false,
    doubleEggWeekendSoon: false,
    doubleEggWeekend: false,
    announcementMessage: null,

    playerActionsPopup: {
        playerId: 0,
        uniqueId: 0,
        isGameOwner: false,
        playerName: '',
        muted: false,
        muteFunc: null,
        bootFunc: null,
		reportFunc: null,
        social: false,
        vipMember: false
    },

	banPlayerPopup: {
		reason: ''
	},

	reportPlayerPopup: {
		checked: [false, false, false, false]
	},

    giveStuffPopup: {
        titleLoc: '',
        eggs: 0,
        items: [],
        type: ''
    },

    openUrlPopup: {
        url: '',
        titleLocKey: '',
        contentLocKey: '',
        confirmLocKey: 'ok',
        cancelLocKey: 'no_thanks'
    },

	bannedPopup: {
		expire: ''
	},

    genericMessagePopup: {
        titleLocKey: 'keybindings_right',
        contentLocKey: 'p_popup_chicken_nuggetbutton',
        confirmLocKey: 'ok'
    },

    unsupportedPlatformPopup: {
        titleLocKey: 'unsupported_platform',
        contentLocKey: ''
    },

    windowDimensions: {
        width: 0,
        height: 0,
    },

	bannerAds: {
        bannerElId: '',
    },

    googleAnalytics: {
        isUser: null,
        cat: {
            purchases: 'Purchases',
            purchaseComplete: 'Purchase Complete',
            itemShop: 'Item Shop',
            inventory: 'Inventory',
            playerStats: 'player stats',
            play: 'play game',
            redeem: 'Redeem'
        },
        action : {
            eggShackClick: 'Egg Shack Click',
            eggShackProductClick: 'Egg Shack Product Click',
            purchaseComplete: 'Purchase Complete',
            goldenChickenProductClick: 'Golden Chicken Product Click',
            goldenChickenNuggetClick: 'Golden Chicken Nugget Click',
            shopClick: 'Shop Opened ',
            shopItemClick: 'Shop Item Selected',
            shopItemPopupClick: 'Shop Item Popup Click',
            shopItemPopupBuy: 'Item purchased',
            shopItemNeedMoreEggsPopup: 'Need More Eggs Popup',
            inventorySelected: 'Inventory Item ',
            eggCount: 'Egg Count',
            inventoryTabClick: 'Inventory Opened',
            playGameClick: 'Play Game Click',
            redeemed: 'Redeemed',
            redeemClick: 'Redeem open',
            languageSwitch: 'Language setting change',
            langBeforeUpdate: 'Language before auto detect',
            privateGame: 'Private Game',
            shareGamePopup: 'Share game Popup',
            shareGameCopy: 'Shared game code',
            createGame: 'Created game',
            joinGame: 'Joined game',
            playerLimit: 'Player limit',
            timesPlayed: 'Times played',
            anonymousPopupOpenAuto: 'Anon warning auto opened',
            anonymousPopupOpen: 'Anon warning opened',
            anonymousPopupSignupClick: 'Anon warning Sign in clicked',
            anonymousPopupAgreeClick: 'Anon warning Understood clicked',
            denyAnonUserPopup: 'Deny anon user popup',
            denyAnonUserPopupSignin: 'sign in click',
            faqPopupClick: 'FAQ popup open',
            switchTeams: 'Switched Teams',
            error: 'error',
            signIn: 'Sign in'
        },
        label : {
            signInClick: 'sign in click',
            understood: 'Understood click',
            getMoreEggs: 'Get More Eggs Click',
            waitForGameReadyTimeout: 'waitForGameReady timeout',
            signInAuthFailed: 'authorization failed',
            signInTiming: 'Sign in delay',
            signInCompleted: 'Completed',
            signInOut: 'Signed out',
            signInFailed: '',
            homeToGameLoading: 'Home to game loading',
            loading: 'Loading'
        }
    },

    urlParams: null,
    urlParamSet: null,
    adTagUrl: 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21743024831/ShellShock_Video&description_url=__page-url__&env=vp&impl=s&correlator=&tfcd=0&npa=0&gdfp_req=1&output=vast&sz=640x480&unviewed_position_start=1',

    eggStoreItems: [],
    subStoreItems: [],
    premiumShopItems: [],

    eggStoreReferral:  '',
    eggStoreHasSale:  false,
    eggStorePopupSku:  'egg_pack_small',

    showNugget:  true,
    // isMiniGameComplete:  false,
	miniEggGameAmount:  0,
    showGoldenChicken:  false,
    nugStart:  null,
    nugCounter:  null,
    isBuyNugget:  false,
    adBlockerCountDown:  10,
    controllerType:  'generic',
    controllerId:  '',
    controllerButtonIcons: {
        xbox: [
            'A',
            'B',
            'X',
            'Y',
            'LB',
            'RB',
            'LT',
            'RT',
            'Select',
            'Start',
            '<img class="ss_buttonbind_icon" src="img/controller/button_stickleft.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_stickright.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_dpadup.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_dpaddown.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_dpadleft.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_dpadright.svg">'
        ],
        ps: [
            '<img class="ss_buttonbind_icon" src="img/controller/button_cross.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_circle.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_square.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_triangle.svg">',
            'LB',
            'RB',
            'LT',
            'RT',
            'Select',
            'Start',
            '<img class="ss_buttonbind_icon" src="img/controller/button_stickleft.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_stickright.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_dpadup.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_dpaddown.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_dpadleft.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_dpadright.svg">'
        ],
        switchpro: [
            'B',
            'A',
            'Y',
            'X',
            'LB',
            'RB',
            'LT',
            'RT',
            '-',
            '+',
            '<img class="ss_buttonbind_icon" src="img/controller/button_stickleft.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_stickright.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_dpadup.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_dpaddown.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_dpadleft.svg">',
            '<img class="ss_buttonbind_icon" src="img/controller/button_dpadright.svg">'
        ],
        generic: [
            '0',
            '1',
            '2',
            '3',
            '4',
            '5',
            '6',
            '7',
            '8',
            '9',
            '10',
            '11',
            '12',
            '13',
            '14',
            '15'
        ]
    },
    pwaDeferEvent: '',
    blackFridayBanner: false,
	isSale: false,
   	smallHouseAd: {},
    bannerHouseAd: false,
    showAdBlockerVideoAd: false,
    hasMobileReward: false,

    killName: null,
    killedName: null,
    killedByMessage: null,
    killedMessage: null,

	chw: {
		reward: {
			eggs: null,
			itemIds: [],
			ownedItems: null,
		},
		winnerCounter: 0,
		resets: 0,
		winnerDailyLimitReached: false,
		isError: false,
		miniGameComplete: true,
		hasPlayClicked: false,
		onClick: false,
		activeTimer: 6000,
		homeTimer: null,
		homeEl: null,
		signInClicked: false,
		adBlockDetect: false,
		nuggetReset: 0,

		hours: 0,
		minutes: 0,
		seconds: 0,
		progress: 0,
		limitReached: false,
		ready: false,

		imgs: {
			// loot: 'img/chicken-nugget/chickLoop_sleep.svg',
			// speak: 'img/chicken-nugget/chickLoop_speak.svg',
			// limit: 'img/chicken-nugget/chickLoop_daily_limit.svg',
			// sleep: 'img/chicken-nugget/chickLoop_sleep.svg',
			// idle: 'img/chicken-nugget/chickLoop_idle.svg',

			idle: 'img/chicken-nugget/alt/cyborg/chickLoop_idle.svg',
			speak: 'img/chicken-nugget/alt/cyborg/chickLoop_speak.svg',
			limit: 'img/chicken-nugget/alt/cyborg/chickLoop_sleep.svg',
			sleep: 'img/chicken-nugget/alt/cyborg/chickLoop_sleep.svg',
			loot: 'img/chicken-nugget/alt/cyborg/chickLoop_sleep.svg',
		}
	},

	isChicknWinnerError: false,
	chwMiniGameComplete: true,
	hasChwPlayClicked: false,
	chwActiveTimer: 6000,
	chwHomeTimer: null,
	chwHomeEl: null,
	chwSignInClicked: false,

	chwRewardIds: [],

	contentCreator: false,
	playClicked: false,

	store: {
		premiumItemId: null,
		itemIdsToHide: [],
	},

	dev: {
		store: {
			sku: null,
			sub: false,
		}
	},

	player: {
		challenges: [],
		challengeDailyData: 0,
		challengeTimer: {
			played: 0,
			alive: 0,
		}
	},

	gameOptionsPopup: {
		resetClicked: false,
		usingDefaults: true,
		changesMade: false,
		options: {},
        togglers: [
			{ id: 'locked', name: 'Locked', locKey: 'game_locked', value: 0 },
			{ id: 'noTeamChange', name: 'Disable Manual Team Change', locKey: 'game_options_manual', value: 0 },
			{ id: 'noTeamShuffle', name: 'Disable Automatic Team Change', locKey: 'game_options_auto', value: 0 }
		],
		adjusters: [
			{ id: 'gravity', locKey: 'game_options_gravity', min: 0.25, max: 1, step: 0.25, value: 1, precision: 2 },
			{ id: 'damage', locKey: 'game_options_damage', min: 0, max: 2, step: 0.25, value: 1, precision: 2 },
			{ id: 'healthRegen', locKey: 'game_options_healthRegen', min: 0, max: 4, step: 0.25, value: 1, precision: 2 }
		]
	},
	
	abTestInventory: {
		closed: false,
		started: false,
		enabled: false,
		reward: {
			item: null,
			eggs: 0,
		},
		clickables: [
			{id: 'shop-menu-item', locKey: 'ab_test_shop', scroll: false, setting: false},
			{id: 'equip-tab-skins', locKey: 'ab_test_skins', scroll: false, setting: false},
			{id: 'type-selector-grenade', locKey: 'ab_test_grenades', scroll: false, setting: false},
			{id: 'item-tag-wero', locKey: 'ab_test_wero', scroll: true, setting: false},
			{id: 'btn_buy_item', locKey: 'ab_test_buy', scroll: false, setting: false},
			{id: '', locKey: '', scroll: false, setting: false},
			// {id: 'screens-menu-btn-return', locKey: 'ab_test_back_to_game', scroll: false, setting: 'grenade'},
		],
		currentIdx: 0,
	},
}    // var vueData = new VueData();
</script>

<!-- Shared tags must come before the screen tags -->
<script id="display-ad-template" type="text/x-template">
    <div>
        <div v-show="isAdShowing" :id="id" class="display-ad-container" :class="theClass"></div>
        <house-ad :data="houseAdData" :isshowing="isAdShowing && houseAdData && adBlocker"></house-ad>
    </div>
</script>

<script>
	
// Register popup components globally
Vue.component('display-ad', createDisplayAdComponent('#display-ad-template'));

function createDisplayAdComponent(templateId) {
	return { 
		template: templateId,
        props: ['id', 'adUnit', 'isHidden', 'poki', 'adSize', 'override', 'houseAd', 'ignoreSize', 'noRefresh', 'checkProducts', 'width', 'height'],
		data: function () {
			return {
                isAdShowing: false,
				refreshAllowed: true,
                hideAds: false,
                theAd: '',
                houseAdData: '',
                adBlocker: false,
				finishedSetup: false
				// timerPeriod: 30000,
				// timerId: null,
				// observer: null,
				// isAdVisible: false,

			}
		},
        mounted() {
            this.$nextTick(() => {
                this.getTheAd();
            });
            // this.override = this.override || false;
        },
		methods: {
            getTheAd() {
				if (extern.adsLoaded) {
					return;
				}
                this.theAd = document.getElementById(this.adUnit);

				if (this.finishedSetup) {
					console.log('display ad stop trying to append');
					return;
				}

                const wrap = document.getElementById(this.id);
                wrap.appendChild(this.theAd);

                if (this.houseAd && !crazyGamesActive && !pokiActive) {
                    googletag.cmd.push(function() { googletag.display('ShellShockers_LoadingScreen_HouseAds') });
                }


				this.finishedSetup = true;
				// this.setUpObserver();
            },

			setUpObserver() {
				this.observer = new IntersectionObserver(this.onElObserved, { root: null, threshold: 0.1});
				this.observer.observe(this.theAd);
			},

			onElObserved(ad) {
				this.isAdVisible = Math.floor(ad[0].intersectionRatio * 100) > 10 ? true : false;
			},

			setVisible(visible) {

				if (!visible) {
					this.isAdShowing = false;
				}

				// don't trigger ads if not paused or vip
				if ((visible && !extern.gamePaused && extern.inGame) || extern.productBlockAds) {
					return;
				}

                this.isAdShowing = visible;

				// if (!this.isAdShowing) {
                //    if (!crazyGamesActive) window.removeEventListener('resize', this.hideAdBasedOnscreenSize);
				// } else {
                //     this.triggerAd();
				// 	if (!crazyGamesActive) {
				// 		setTimeout(() => this.hideAdBasedOnscreenSize(), 500);
				// 		window.addEventListener('resize', this.hideAdBasedOnscreenSize);
				// 	}
                // }

				if (this.isAdShowing) {
					this.triggerAd();
				}

            },
			show() {
                if (extern.productBlockAds) return;
                console.log(`display ad container ${this.id} showing`);
                this.setVisible(true);
            },
			hide() {
				console.log(`display ad container ${this.id} hiding`);
                this.setVisible(false);
            },
            crazyGamesAd(id) {
				crazySdk.requestBanner({
                    id: id,
					width: this.width,
					height: this.height,
				});

            },
            triggerAd() {
                this.adBlocker = extern.adBlocker;

                if (this.adBlocker) {
                    this.adblockerSetup();
                    return;
                }

                if (!crazyGamesActive && !testCrazy) {

                    if (this.houseAd) {
                        gtagInHouseLoadingBanner();
                        return;
                    }

					if (this.noRefresh) {
						return;
					}
					
					if (hasValue(this.timerId)) {
						clearTimeout(this.timerId);
						this.timerId = null;
					}

					// Ensure aiptag has a value before setting subid and pushing a command
					if (typeof aiptag === 'undefined' || aiptag === null) {
						return;	
					}

					aiptag.subid = AIPSUBID;

					aiptag.cmd.display.push(() => {
						aipDisplayTag.display(this.adUnit);
						console.log('display ad requested', this.adUnit);
						// this.refreshAllowed = false;
						// this.timerId = window.setTimeout(() => this.refreshAllow(), this.timerPeriod);
					});

                }
            },
			destroyAd() {
				// this.setVisible(false);
				this.setVisible(false);
				if (extern.productBlockAds) {
					return;
				} else {
					if (!crazyGamesActive) {
						console.log('display ad destroy', this.adUnit);
						aiptag.cmd.display.push(() => {
							aipDisplayTag.destroySlot(this.adUnit);
						});
					}
				}
			},
            toggleAd(val) {
				console.log('display ad toggle visibility', this.adUnit, 'is showing ', val);
                if (extern.productBlockAds) {
                    this.isAdShowing = false;
                } else {
					this.$nextTick(() => {
						this.isAdShowing = val;
						// if (this.refreshAllowed && val) {
						// 	console.log('display ad toggle triggers refresh', this.adUnit);
						// 	this.triggerAd();
						// }
					});
				}

            },
            adblockerSetup() {
				if (pokiActive) return;

                switch(this.id) {
                    case 'div-gpt-ad-shellshockers-loading-houseads-wrap':
                    case 'shellshockers_respawn_banner_ad':
					case 'shellshockers_respawn_banner-new_ad':
                        this.houseAdData = extern.getHouseAd('bigBanner');
                        break;
                    case 'shellshockers_respawn_banner_2_ad':
                    case 'shellshockers_titlescreen_wrap':
                        this.houseAdData = extern.getHouseAd('small');
                    break;
                    default:
                        console.log('House ads say, huh?');
                }

            },
            hideAdBasedOnscreenSize() {
                let adWidth = this.$el.offsetWidth;
                let intViewportWidth = window.innerWidth;

                if (vueApp.displayAdObject && vueApp.displayAdObject > 1 ) {
                    if (vueApp.displayAdObject < 970) {
                        return;
                    }

                    if (vueApp.displayAdObject > intViewportWidth ) {
                        this.hide();
                    }
                } else {
                    if (adWidth < 970) {
                        return;
                    }

                    if (adWidth > intViewportWidth ) {
                        this.hide();
                    }
                }
            },
            adVisibility() {
                if (this.ignoreSize) return;
                googletag.pubads().addEventListener('slotVisibilityChanged', e => {
                        if (e.inViewPercentage < 51) {
                            this.hide();
                        } else {
                            this.show();
                        }
                    }
                );
            },
			refreshAllow() {
				this.refreshAllowed = true;
				if (this.isAdShowing && this.isAdVisible) {
					console.log('display ad auto refresh', this.adUnit);
					this.triggerAd();
				} else {
					console.log('display ad auto refresh cancelled', this.adUnit);
				}
			}
        },

        computed: {
            theClass() {
                return this.adUnit.toLowerCase().replace(/_/g, "-");
            }
        },
        
        watch: {
            isHidden(value) {
                if (!value) {
                    this.hide();
                }
            },
			checkProducts(val) {
				if (val && extern.productBlockAds) {
					this.hide();
				}
			},
			// isAdVisible(val) {
			// 	console.log('display ad visible', this.adUnit, val);
			// 	if (val && this.isAdShowing && this.refreshAllowed) {
			// 		this.triggerAd();
			// 	}
			// }
        }
	}
}
</script>
<script id="events-template" type="text/x-template">
    <div v-if="showEvent" id="event-notifications">
        <div class="double-eggs f_row align-items-center">
            <img :src="doubleEggEventUrl" />

        </div>
    </div>
</script>
<script>
    const comp_events = {
        template: '#events-template',
        props: ['show', 'currentScreen', 'screens'],
        mounted() {
            this.day = this.now.getUTCDay();
			this.hours = this.now.getUTCHours();
        },
        data() {
            return {
                now: new Date(),
				day: 0,
				hours: 0,
				doubleEggSoonImgSrc: 'img/events/2XEggWeekend_cominSoon.webp',
				doubleEggLiveImgSrc: 'img/events/2XEggWeekend_onNow.webp',
            };
        },
        methods: {
            isEventDate(days) {
                return days.includes(this.day);
            },
        },
		computed: {
			doubleEggWeekendSoon() {
				return this.isEventDate([4]) || this.isEventDate([5]) && this.hours < 20;
			},
			doubleEggWeekend() {
				return this.day >= 5 && this.hours >= 20 || this.isEventDate([6,0]);
			},
			doubleEggEventUrl() {
				if (this.doubleEggWeekendSoon && !this.doubleEggWeekend) {
					return this.doubleEggSoonImgSrc;
				} else if (!this.doubleEggWeekendSoon && this.doubleEggWeekend) {
					return this.doubleEggLiveImgSrc;
				}
			},
			showEvent() {
				return (this.doubleEggWeekendSoon || this.doubleEggWeekend) && this.currentScreen == this.screens.game;
			},
		}
    };
</script><script>
var comp_light_overlay = {
	template: `<transition name="fade">
	<div id="lightOverlay" v-show="show" :class="overlayClass" class="overlay overlay_light"></div>
</transition>`,
	data: function () {
		return {
			show: false,
			overlayClass: '',
		};
	},
};
</script><script>
const comp_dark_overlay = {
  template: `
    <transition name="fade">
      <div v-show="show" :class="overlayClass" :style="overlayStyle"></div>
    </transition>`,
  data() {
    return {
      show: false,
      overlayClass: ''
    };
  },
  computed: {
    overlayStyle() {
      return {
        zIndex: 6, // No need to use quotes for camelCased properties
        backgroundImage: 'none',
        backgroundColor: 'var(--ss-darkoverlay)',
        width: '100%',
        height: '100%',
        position: 'absolute',
        opacity: 1,
        top: 0, // Numerical values don't require quotes
        left: 0
      };
    }
  }
};
</script><script id="spinner-overlay-template" type="text/x-template">
	<transition name="fadeout">
		<div v-show="isShowing" class="load_screen align-items-center">
			<h3 class="load_message">{{ header }}</h3>
			<wobbly-egg></wobbly-egg>
			<p class="load_message">{{ footer }}</p>
			<div v-show="tip && isShowTips" class="spinner-tips display-grid">
				<img v-lazyload :data-src="eggGuyImg" alt="Loading screen egg shouting">
				<p class="load_message tips" v-html="loc[tip]"></p>
			</div>
			<display-ad id="shellshockers_respawn_banner_spinner" ref="loadingScreenDisplayAd" class="pauseFiller" :ignoreSize="false" :adUnit="adUnit" adSize="728x90" width="728" height="90"></display-ad>
		</div>
	</transition>
</script>

<script id="wobble-egg-template" type="text/x-template">
    <div id="wobbly-egg">
        <svg viewBox="0 0 240 240" :class="[loadEggcontainer, {noanimate: noAnimate}]" width="240" height="240" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient r="0.5" cy="0.4" cx="0.4" id="load_yolkgradient" spreadMethod="pad">
                    <stop stop-color="#fed" offset="0.3"/>
                    <stop stop-color="#fb0" offset="0.32"/>
                    <stop stop-color="#fa0" offset="1"/>
                </radialGradient>
            
                <filter id="load_eggshadow" :class="{noanimate: noAnimate}" x="-30%" y="-30%" width="160%" height="160%" >
                    <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#124" flood-opacity="0.3" />
                </filter>
            </defs>
            <g>
                <path filter="url(#load_eggshadow)" :class="[loadEggwhite, {noanimate: noAnimate}]" stroke="#000" id="svg_eggwhite" d="m190.13055,40.86621c30.25552,23.71378 -12.26575,57.24017 0,81.77167c12.26575,24.5315 4.9063,80.13624 -33.52639,82.58939c-38.43269,2.45315 -55.60474,-26.16693 -94.03742,-17.98977c-38.43269,8.17717 -11.44803,-30.25552 -17.98977,-44.97442c-6.54173,-14.7189 -24.5315,-46.60985 -4.9063,-71.14135c9.8126,-12.26575 22.07835,-14.92333 34.95739,-15.02554c12.87904,-0.10221 19.01191,-15.63883 31.27766,-17.68312c12.26575,-2.04429 21.46506,17.58091 33.83303,11.2436c12.36797,-6.3373 35.26403,-20.64735 50.39179,-8.79045z" stroke-width="0" fill="#fff" />
            </g>
            <g>
                <ellipse :class="[loadEggyolk, {noanimate: noAnimate}]" ry="38" rx="38" id="svg_eggyolk" cy="120" cx="120" stroke-width="0" fill="url(#load_yolkgradient)"/>
            </g>
        </svg>
    </div>
</script>
<script>
    var comp_wobbly_egg = {
        template: '#wobble-egg-template',
        props: ['noAnimate'],
        
        data: function () {
            return {
                loadEggyolk: 'load_eggyolk',
                loadEggwhite: 'load_eggwhite',
                loadEggcontainer: 'load_eggcontainer'
            }
        }
    };
</script>
<script>
var comp_spinner_overlay = {
	template: '#spinner-overlay-template',
	components: {
		'wobbly-egg': comp_wobbly_egg
	},
	props: ['loc', 'adblockerbanner', 'hideAds', 'adUnit', 'accountDate'],
	
	data: function () {
		return {
			isShowing: false,
			header: '',
			footer: '',
			adIsShowing: false,
			isShowTips: false,
			tipKey: null,
			tips: [],
			tip: '',
			eggGuyImg: 'img/shellShockers_loadingTipEgg.webp',
			goodBrowser: true,
			browserTipShown: false,
		}
	},

	mounted() {
		this.isNotChrome().then(result => {
			if (result) {
				this.goodBrowser = false;
			}
		});
	},

	methods: {
		show: function (headerLocKey, footerLocKey, showTips) {
			this.header = this.loc[headerLocKey];
			this.footer = this.loc[footerLocKey];
			this.isShowing = true;
			this.isShowTips = showTips;
		},

		showSpinnerLoadProgress: function (percent) {
			var msg = this.loc['ui_game_loading'];
			this.header = this.loc['building_map'];
			this.footer = '{0}... {1}%'.format(msg, percent);
			this.isShowTips = true;
			this.isShowing = true;
		},

		hide: function () {
			this.isShowing = false;
			this.isShowTips = this.isShowing;
			this.$emit('close-display-ad');
		},

		hideDisplayAd() {
			this.adIsShowing = false;
			console.log('do it');
		},
		showDisplayAd() {
			this.adIsShowing = true;
		},
		toggleDisplayAd() {
			return this.adIsShowing = this.adIsShowing ? false : true;
		},
		getTipKey() {
			if (!this.accountDate) {
				this.tipKey = 'tipNew_';
			} else {
				if (!this.accountDays) {
					this.accountDays = Math.ceil((new Date().getTime() - new Date(this.accountDate).getTime()) / (1000 * 3600 * 24));
				}
				if (this.accountDays <= 14) {
					this.tipKey = 'tipNew_';
				} else {
					this.tipKey = 'tip_';
				}
			}
		},
		randomTip() {
			if (!this.goodBrowser && !this.browserTipShown) {
				this.tip = 'tip_ofthe_day_107';
				this.browserTipShown = true;
				return;
			}

			if (this.tipKey === null) {
				this.getTipKey();
			}

			if (this.tips.length === 0) {
				Object.keys(this.loc).forEach(key => {
					if (key.startsWith(this.tipKey)) {
						this.tips.push(key);
					}
				});
			}
			this.tip = this.tips[Math.floor(Math.random() * this.tips.length)];
		},

		async isNotChrome() {
			if (navigator.userAgentData) {
				const brands = navigator.userAgentData.brands || [];
				const isChrome = brands.some(brand => brand.brand === 'Google Chrome');
				return !isChrome;
			} else {
				// Fallback to userAgent for older browsers
				return this.isNotChromeFallback();
			}
		},
		isNotChromeFallback() {
			const ua = navigator.userAgent;
			return !(ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR'));
		}
	},
	watch: {
		isShowing(val, old) {
			if (val && !old) {
				this.randomTip();
			}
		}
	}
};
</script><script id="small-popup-template" type="text/x-template">
	<transition name="fade">
		<div v-show="isShowing" class="popup_window popup_sm roundme_md centered">
			<div>
				<button v-show="!hideClose" @click="onXClick" class="roundme_sm popup_close clickme"><i class="fas fa-times text_white fa-2x"></i></button>
				<h3 id="popup_title" v-show="!hideHeader" class="roundme_sm shadow_blue4 nospace text_white">
					<slot name="header"></slot>
				</h3>
			</div>
			<div v-show="!hideContent" class="popup_sm_content"><slot name="content"></slot></div>
			<div id="btn_horizontal" class="f_center">
				<button class="ss_button btn_red bevel_red width_sm" v-show="!hideCancel" @click="cancelClick"><slot name="cancel"></slot></button>
				<button class="ss_button btn_green bevel_green width_sm" v-show="!hideConfirm" @click="confirmClick"><slot name="confirm"></slot></button>
			</div>
			<slot name="footer"></slot>
		</div>
	</transition>
</script>

<script id="large-popup-template" type="text/x-template">
	<transition name="fade">
		<div id="popupPause" v-show="isShowing" class="popup_window popup_lg centered roundme_md" :class="setOverlayCls">
			<button @click="onXClick" v-show="!hideClose" class="popup_close clickme roundme_sm"><i class="fas fa-times text_white fa-2x"></i></button>
			<slot name="content"></slot>
		</div>
	</transition>
</script>

<script>
// Register popup components globally
Vue.component('small-popup', createPopupComponent('#small-popup-template'));
Vue.component('large-popup', createPopupComponent('#large-popup-template'));

function createPopupComponent(templateId) {
	return { 
		template: templateId,
		props: ['hideHeader', 'hideContent', 'hideClose', 'hideCancel', 'hideConfirm', 'overlayType', 'overlayClass', 'popupModel', 'uiModel', 'stopKeyCapture', 'overlayClose'],
		data: function () {
			return {
				isShowing: false,
				overlays: vueData.ui.overlayType,
				popupId: '',
				removeOverlayClick: ''
			}
		},

		created() {
			this.popupId = this.$attrs && this.$attrs.id;
		},

		destroyed: function() {
			document.removeEventListener('keyup', this.escapeKeyClose);
		},

		methods: {
			setVisible: function (visible) {

				this.isShowing = visible;

				if (extern.inGame) {
					if (this.isShowing) {
						extern.releaseKeys();	
					} else {
						extern.captureKeys();
					 }
				}

				if (this.isShowing && this.popupModel && this.popupModel.reset) {
					this.popupModel.reset();
				}

				if (!this.isShowing || this.overlayType === this.overlays.none || this.popupId === 'pausePopup') {
					vueApp.setDarkOverlay(false);
					vueApp.setLightOverlay(false);
				} else {
					vueApp.setDarkOverlay(true);
				}

				if (!this.isShowing) {
					console.log('Closed: ' + this.popupId);
					this.$emit('popup-closed', this.popupId);
					vueApp.$refs.equipScreen.onPopupClosed();
					vueApp.gameUiRemoveClassForNoScroll();
					this.cancelEventOverLayClickEscapeClose();
				} else {
					console.log('Opened: ' + this.popupId);
					this.$emit('popup-opened', this.popupId);
					vueApp.$refs.equipScreen.onPopupOpened();
					vueApp.scrollToTop();
					vueApp.gameUiAddClassForNoScroll();
					this.addEventListeners();
				}
				if (vueApp.showScreen !== vueApp.screens.game) {
					vueApp.toggleTitleScreenAd(this.isShowing ? false : true);
				} else {
					vueApp.toggleRespawnDisplayAd(this.isShowing ? false : true);
				}

			},

			toggle: function () {
				this.isShowing = !this.isShowing;

				this.setVisible(this.isShowing);
			},
			
			show: function () {
				this.setVisible(true);
			},

			hide: function () {
				this.setVisible(false);
			},

			close: function () {
				this.setVisible(false);
				console.log('Closing');
			},

			onCloseClick: function () {
				this.close();
				BAWK.play('ui_popupclose');
			},

			onXClick: function () {
				this.$emit('popup-x');
				this.close();
				BAWK.play('ui_popupclose');
			},

			cancelClick: function () {
				this.close();
				this.$emit('popup-cancel');
				BAWK.play('ui_popupclose');
			},

			confirmClick: function () {
				if (this.popupModel && this.popupModel.validate && !this.popupModel.validate()) {
					return;
				}
				this.close();
				this.$emit('popup-confirm');
				BAWK.play('ui_playconfirm');
			},

			addEventListeners: function() {
				document.addEventListener('click', this.handleOutsideClick);
				document.addEventListener('keyup', this.escapeKeyClose);
			},

			escapeKeyClose: function(e) {
				if (hasValue(this.overlayClose)) {
					return;
				}
				if ((this.overlayClose === undefined || hasValue(this.overlayClose)) && e.keyCode === 27) {
					e.stopPropagation();
					this.onCloseClick();

				}
			},

			handleOutsideClick: function(e) {
				if (this.overlayClose === undefined || this.overlayClose !== false) {
					const clickedElement = e.target;

					// Introduce a small delay (e.g., 10ms) to ensure styles are correctly read... VUE
					setTimeout(() => {

						// Desired styles for comparison
						const desiredStyles = {
							zIndex: '6',
							backgroundImage: 'none',
							backgroundColor: 'var(--ss-darkoverlay)',
							width: '100%',
							height: '100%',
							position: 'absolute',
							opacity: '1',
							top: '0px',
							left: '0px'
						};

						// Function to check if styles match
						const stylesMatch = Object.entries(desiredStyles).every(([key, value]) => {
							const actualValue = clickedElement.style[key];
							const matches = actualValue === value;
							return matches;
						});

						// Proceed only if styles match
						if (stylesMatch) {
							e.stopPropagation();
							this.$emit('popup-x');
							this.onCloseClick();
						}
					}, 10);
				}
			},

			cancelEventOverLayClickEscapeClose: function() {
				document.removeEventListener('click', this.handleOutsideClick);
				document.removeEventListener('keyup', this.escapeKeyClose);
			}
		},
		computed: {
			setOverlayCls() {
				if (extern.inGame) {
					return 'overlay_game';
				}
			}
		}
	}
}
</script>
<script>
    const SvgIcon = {
		template:
			`<svg :class="cls">
				<use :xlink:href="svgName"></use>
			</svg>`,
		props: ['name', 'cls'],
		// data() {
		// 	return {
		// 	};
		// },
		// methods: {
		// },
		computed: {
			svgName() {
				return `#${this.name}`;
			}
		},
	};
    // Register component globally
    Vue.component('icon', SvgIcon);
</script><template id="comp-ss-button" type="text/x-template">
	<button :id="btnId" :class="cls" class="ss_button"><i v-if="iconLeft" class="iconLeft"></i> {{ locTxt }} <i v-if="iconRight" class="iconRight"></i></button>
</template>

<template id="comp-ss-button-dropdown-template" type="text/x-template">
	<button ref="ssDropDown" :id="btnId" @click="onDropdownClick" class="is-for-play ss_button btn_dropdown btn_big common-box-shadow btn_game_mode bg_blue6 text-left box_relative ss-dropdown-select" :class="clsBtn">
		<h3 class="ss-dropdown-select text_blue3" :class="btnId">{{ locTxt.title }}</h3>
		<p class="game-mode-type ss-dropdown-select text_blue5" :class="btnId">{{ locTxt.subTitle }}</p>
		<span class="open-close centered_y ss-dropdown-select" :class="btnId">
			<i class="fas ss-dropdown-select" :class="[caretDirection, btnId, cartOnOpen]"></i>
		</span>
		<div :class="menuPosClass" class="option-box box_absolute roundme_sm common-box-shadow bg_blue6" v-show="isPromptOpen">
			<ul ref="optionBoxList" class="list-no-style nospace ss-dropdown-select f_col">
				<li v-if="listItems" ref="items" v-for="(g, idx) in dropdownList" :class="{ 'selected' : selectedItem === g.value || selectedItem === idx || selectedItem === g.id }" class="display-grid gap-sm align-items-center text_blue5 font-nunito" @click="onListItemClick(g, idx)"><div class="f_row align-items-center"><icon v-show="selectedItem === g.value" class="option-box-checkmark" name="ico-checkmark"></icon></div> {{ listItemTxt(g) }}</li>
				<slot name="dropdown"></slot>
			</ul>
		</div>
	</button>
</template>

<script>
	const createSsBtn = (tempId) => {
		return {
			template: tempId,
			props: ['loc', 'cls', 'locTxt', 'iconRight', 'iconLeft', 'listItems', 'selectedItem', 'menuDown', 'menuPos', 'sort', 'locList'],
			data: function() {
				return {
					isPromptOpen: false,
					btnId: 'btn-' + (Math.random() + 1).toString(36).substring(7),
					onClickVal: null,
					caret: {
						up: 'fa-caret-up',
						down: 'fa-caret-down',
						right: 'fa-caret-right',
						rotate: 'fa-rotate-180'
					}
				}
			},		
			methods: {
				onListItemClick(val, idx) {
					if (val.value !== undefined) {
						this.onClickVal = val.value;
					} else if (val.subdom !== undefined) { 
						this.onClickVal = val.id;
					} else {
						this.onClickVal = idx;
					}
					this.$emit('onListItemClick', this.onClickVal);
				},
				onDropdownClick(e) {
					if (!this.isPromptOpen) {
						this.isPromptOpen = true;
						this.$emit('dropdownOpen');
						document.addEventListener('click', this.onOutsideClick);
					} else {
						this.isPromptOpen = false;
						this.$emit('dropdownClosed');
						document.removeEventListener('click', this.onOutsideClick);
					}
				},
				onOutsideClick(e) {
					if (this.isPromptOpen) {			
						if (e.target.classList.contains(this.btnId) === false) {
							this.isPromptOpen = false;
							this.$emit('dropdownClosed');
							document.removeEventListener('click', this.onOutsideClick);
						}
					}
				},
				listItemTxt(val) {
					if (val.name !== undefined) {
						if (this.locList !== undefined) {
							return this.loc[val.name];
						}
						return val.name;
					} else {
						return this.loc[val.locKey];
					}
				}
			},
			computed: {
				menuPosClass() {
					if (this.menuPos === 'bottom') {
						return 'pos-bottom';
					} else if (this.menuPos === 'right') {
						return 'pos-right';
					}
				},
				caretDirection() {
					if (this.menuPos === 'bottom') {
						return this.caret.down;
					} else if (this.menuPos === 'right') {
						return this.caret.right;
					} else {
						return this.caret.up;
					}
				},
				cartOnOpen() {
					if (this.isPromptOpen) {
						return this.caret.rotate;
					} 
				},
				clsBtn() {
					return `${this.cls} ${this.btnId}`;
				},
				dropdownList() {
					if (this.sort) {
						return this.listItems.sort((a, b) => {
							return a.order - b.order;
						});
					} else {
						return this.listItems;
					}
				}
			},
			watch: {
				isPromptOpen(val) {
					BAWK.play('ui_toggletab');

				}
			}
		};
	}
	Vue.component('ss-button', createSsBtn('#comp-ss-button'));
	Vue.component('ss-button-dropdown', createSsBtn('#comp-ss-button-dropdown-template'));
</script><template id="house-display-ad">
    <transition name="fade">
        <figure v-if="isshowing && data" class="house-wrap">
            <img :src="src" :alt="title" @click="adClicked" />
        </figure>
    </transition>
</template>

<script>
    function createHouseAd() {
        return {
            template: '#house-display-ad',
            props: ['isshowing', 'data'],
            data() {
                return {
                    count: 0
                }
            },
            methods: {
                adClicked() {
                    if ('link' in this.data) {
                        this.data.link = this.data.link + '/?utm_source=shell_shockers&utm_medium=referral&utm_campaign=house-ads';
                    }
                    extern.clickedHouseLink(this.data);
                }
            },
            computed: {
                src() {
                    return dynamicContentPrefix + `data/img/art/${this.data.id}${this.data.imageExt}`;
                },
                alt() {
                    return `${this.data.label} banner image!`;
                },
                link() {
                    return `${this.data.link}/?utm_source=shell_shockers&utm_medium=referral&utm_campaign=house-ads`;
                },
                title() {
                    return `Play ${this.data.label} now!`;
                }

            }
        }
    }

    Vue.component('house-ad', createHouseAd());

</script><script id="language-selector-template" type="text/x-template">
    <select id="pickLanguage" v-model="languageCode" @change="onChangeLanguage" class="ss_select ss_marginright_sm">
        <option v-for="(language, code) in langOptions" v-bind:value="code">
            {{ language }}
        </option>
    </select>

</script>

<script>
var comp_language_selector = {
    template: '#language-selector-template',
    props: ['languages', 'selectedLanguageCode', 'loc', 'langOptions'],

    data: function () {
        return {
            languageCode: this.selectedLanguageCode,
        }
    },

    methods: {
        playSound (sound) {
			BAWK.play(sound);
        },

		onChangeLanguage: function () {
            vueApp.changeLanguage(this.languageCode);
            // Update localStore for selected language.
            localStore.setItem('languageSelected', this.languageCode);
            BAWK.play('ui_onchange');
            ga('send', 'event', {
                eventCategory: vueData.googleAnalytics.cat.playerStats,
                eventAction: vueApp.googleAnalytics.action.languageSwitch,
                eventLabel: this.languageCode,
            });
		}
    },

    watch: {
        selectedLanguageCode: function (code) {
            this.languageCode = code;
        }
    }
};
</script><script id="gdpr-template" type="text/x-template">
    <transition name="fade">
    <div v-show="isShowing">
        <div id="consent" v-show="showingNotification" class="gdpr_banner f_row">
            <div>{{ loc.gdpr_notification }} <a href="http://www.bluewizard.com/privacypolicy" target="_window">{{ loc.gdpr_link }}</a>
            </div>
            <div class="f_row">
                <button @click="onDisagreeClicked()" class="ss_button btn_red bevel_red ss_marginright ss_marginleft">{{ loc.gdpr_disagree }}</button>
                <button @click="onAgreeClicked()" class="ss_button btn_green bevel_green">{{ loc.gdpr_agree }}</button>
            </div>
        </div>

        <div id="doConsent" v-show="showingConsent" class="gdpr_banner f_row">
            <div>{{ loc.gdpr_consent }}</div>
            <div>
                <button @click="close()" class="ss_button btn_green bevel_green btn_md">{{ loc.ok }}</button>
            </div>
        </div>

        <div id="noConsent"v-show="showingNoConsent" class="gdpr_banner f_row">
            <div>{{ loc.gdpr_noConsent }}</div>
            <div>
                <button @click="close()" class="ss_button btn_green bevel_green btn_md">{{ loc.ok }}</button>
            </div>
        </div>
    </div>
    </transition>
</script>

<script>
var comp_gdpr = {
	template: '#gdpr-template',
	props: ['loc'],

    data: function () {
        return {
            isShowing: false,
            showingNotification: false,
            showingConsent: false,
            showingNoConsent: false
        }
    },

	methods: {
        show: function () {
            this.isShowing = true;
            this.showingNotification = true;
            this.showingConsent = false;
            this.showingNoConsent = false;
        },

        close: function () {
            this.isShowing = false;
            BAWK.play('ui_playconfirm');
        },

        onAgreeClicked: function () {
            this.showingConsent = true;
            this.showingNotification = false;
            extern.doConsent();
            BAWK.play('ui_onchange');
        },

        onDisagreeClicked: function () {
            this.showingNoConsent = true;
            this.showingNotification = false;
            extern.doNotConsent();
            BAWK.play('ui_onchange');
        }
    }
};
</script>
<script id="settings-template" type="text/x-template">
  <div>
  	<h1 class="roundme_sm text-center">{{ loc.p_settings_title }}</h1>

	<div class="display-grid grid-column-3-eq gap-sm">
        <button id="keyboard_button" @click="selectTab" class="ss_bigtab bevel_blue roundme_md font-sigmar f_row align-items-center justify-content-center gap-sm" :class="(showKeyboardTab ? 'selected' : '')"><img v-lazyload :data-src="icons.keyboard" class="lazy-load ss_bigtab_icon" /> <img v-lazyload :data-src="icons.mouse" class="lazy-load ss_bigtab_icon" /></button>
        <button id="controller_button" @click="selectTab" class="ss_bigtab bevel_blue roundme_md font-sigmar f_row align-items-center justify-content-center gap-sm" :class="(showControllerTab ? 'selected' : '')"><img v-lazyload :data-src="icons.gamePad" class="lazy-load ss_bigtab_icon" /></button>
        <button id="misc_button" @click="selectTab" class="ss_bigtab bevel_blue ss_bigtab bevel_blue roundme_md font-sigmar f_row align-items-center justify-content-center gap-sm" :class="(showMiscTab ? 'selected' : '')"><img v-lazyload :data-src="icons.monitor" class="lazy-load ss_bigtab_icon" /> <img v-lazyload :data-src="icons.speaker" class="lazy-load ss_bigtab_icon" /> </button>
    </div>

    <div id="popupInnards" class="roundme_sm fullwidth f_col ss_margintop_sm ss_marginbottom_xl">
		<div id="settings_keyboard" v-show="showKeyboardTab" class="settings-section">
			<h3 class="margin-bottom-none h-short">{{ loc.p_settings_keybindings }}</h3>
			
			<div class="f_row ss_margintop">
				<div class="f_col">
					<div v-for="c in settingsUi.controls.keyboard.game" v-if="c.side == 'left'" v-show="showForCrazyGame(c.locKey)"class="nowrap">
						<settings-control-binder :loc="loc" :control-id="c.id" :control-value="c.value" @control-captured="onGameControlCaptured"></settings-control-binder>
						<div class="label">{{ loc[c.locKey] }}</div>
					</div>

					<div class="ss_margintop_xl">
						<div v-for="c in settingsUi.controls.keyboard.spectate" class="nowrap">
							<settings-control-binder :loc="loc" :control-id="c.id" :control-value="c.value" @control-captured="onSpectateControlCaptured"></settings-control-binder>
							<div class="label">{{ loc[c.locKey] }}</div>
						</div>
					</div>
				</div>

				<div class="f_col ss_marginleft_xl">
					<div v-for="c in settingsUi.controls.keyboard.game" v-if="c.side == 'right'" class="nowrap">
						<settings-control-binder :loc="loc" :control-id="c.id" :control-value="c.value" @control-captured="onGameControlCaptured"></settings-control-binder>
						<div class="label">{{ loc[c.locKey] }}</div>
					</div>

					<div class="ss_margintop">
						<div v-for="t in settingsUi.adjusters.mouse" class="nowrap">
							<settings-adjuster :loc="loc" :loc-key="t.locKey" :control-id="t.id" :control-value="t.value" :min="t.min" :max="t.max" :step="t.step" :multiplier="t.multiplier" @setting-adjusted="onSettingAdjusted"></settings-adjuster>
						</div>

						<div v-for="t in settingsUi.togglers.mouse" class="nowrap">
							<settings-toggler v-if="(t.id === 'shadowsEnabled' || t.id === 'highRes') ? showDetailSettings : true" :loc="loc" :loc-key="t.locKey" :control-id="t.id" :control-value="t.value" @setting-toggled="onSettingToggled"></settings-toggler>
						</div>
					</div>

				</div>
			</div>
		</div>
		
		<div id="settings_controller" v-show="showControllerTab" class="settings-section">
			<h3 class="margin-bottom-none h-short">{{ loc.p_settings_gamepadbindings }}</h3>
			
			<div class="f_row ss_margintop">
				<div class="f_col">
					<div v-for="c in settingsUi.controls.gamepad.game" class="nowrap">
						<settings-gamepad-binder :loc="loc" :control-id="c.id" :control-value="c.value" @control-captured="onGamepadGameControlCaptured" :controller-type="controllerType"></settings-gamepad-binder>
						<div class="label">{{ loc[c.locKey] }}</div>
					</div>
				</div>

				<div class="f_col ss_marginleft_xl">
					<div class="ss_marginbottom_xl">
						<div v-for="c in settingsUi.controls.gamepad.spectate" class="nowrap">
							<settings-gamepad-binder :loc="loc" :control-id="c.id" :control-value="c.value" @control-captured="onGamepadSpectateControlCaptured" :controller-type="controllerType"></settings-gamepad-binder>
							<div class="label">{{ loc[c.locKey] }}</div>
						</div>
					</div>

					<div v-for="t in settingsUi.adjusters.gamepad" class="nowrap">
						<settings-adjuster :loc="loc" :loc-key="t.locKey" :control-id="t.id" :control-value="t.value" :min="t.min" :max="t.max" :step="t.step" :multiplier="t.multiplier" :precision="t.precision" @setting-adjusted="onSettingAdjusted"></settings-adjuster>
					</div>

					<div v-for="t in settingsUi.togglers.gamepad" class="nowrap">
						<settings-toggler v-if="(t.id === 'shadowsEnabled' || t.id === 'highRes') ? showDetailSettings : true" :loc="loc" :loc-key="t.locKey" :control-id="t.id" :control-value="t.value" @setting-toggled="onSettingToggled"></settings-toggler>
					</div>
				</div>
			</div>

			<p class="text_blue5 nospace">{{ getControllerId }}</p>
			<p class="text_blue8 nospace">{{ loc.p_settings_controllerhelp }} <a target="_blank" class="text_blue5" href="https://hardwaretester.com/gamepad">hardwaretester.com</a></p>
		</div>

		<div id="settings_misc" v-show="showMiscTab" class="settings-section">
			<div class="display-grid grid-column-2-eq">
				<div class="f_col">
					<div v-for="t in settingsUi.adjusters.misc" class="nowrap">
						<settings-adjuster :loc="loc" :loc-key="t.locKey" :control-id="t.id" :control-value="t.value" :min="t.min" :max="t.max" :step="t.step" :multiplier="t.multiplier" @setting-adjusted="onSettingAdjusted"></settings-adjuster>
					</div>
					<div v-for="t in settingsUi.adjusters.music" class="nowrap">
						<settings-adjuster :loc="loc" :loc-key="t.locKey" :control-id="t.id" :control-value="t.value" :min="t.min" :max="t.max" :step="t.step" :multiplier="t.multiplier" @setting-adjusted="onSettingAdjusted"></settings-adjuster>
					</div>
				</div>

				<div class="f_col">
					<h3 class="margin-bottom-none h-short">{{loc.p_servers_title}}</h3>
					<select id="regionSelect" v-model="currentRegion" @change="onChangeRegion" class="ss_select ss_marginright_sm ss_select">
						<option v-for="(region, id) in regionList" v-bind:value="region.id">{{ loc[region.locKey] }} {{ region.ping }}ms</option>
					</select>
				</div>

				<div class="f_col">
					<h3 class="margin-bottom-none h-short">{{ loc.p_settings_language }}</h3>
					<language-selector :languages="languages" :loc="loc" :selectedLanguageCode="currentLanguageCode" class="ss_select" :langOptions="langOption"></language-selector>
				</div>
			</div>
			<h3 class="margin-bottom-none h-short">More options</h3>
			<div class="display-grid grid-column-2-eq">
				<div class="f_col">
					<div v-for="t in settingsUi.togglers.misc">
						<settings-toggler v-if="(t.id === 'shadowsEnabled' || t.id === 'highRes') ? showDetailSettings : true" v-show="hideSetting(t.id)" :loc="loc" :loc-key="t.locKey" :control-id="t.id" :control-value="t.value" @setting-toggled="onSettingToggled"></settings-toggler>
					</div>
					<button v-if="showPrivacyOptions" @click="onPrivacyOptionsClicked" class="ss_button btn_blue bevel_blue btn_md ss_margintop_xl">{{ loc.p_settings_privacy }}</button>
				</div>
				<div class="f_col">
					<div v-for="t in settingsUi.togglers.misc2">
						<settings-toggler v-if="hideSetting(t.id)" :loc="loc" :loc-key="t.locKey" :control-id="t.id" :control-value="t.value" @setting-toggled="onSettingToggled"></settings-toggler>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="display-grid grid-align-items-center justify-items-strech grid-column-3-eq grid-gap-1 fullwidth gap-sm">
		<button @click="onCloseClick" class="ss_button btn_red bevel_red btn_md no_margin_bottom">{{ loc.cancel }}</button>
		<button @click="onResetClick" class="ss_button btn_yolk bevel_yolk btn_md no_margin_bottom">{{ loc.p_settings_reset }}</button>
		<button @click="onSaveClick" class="ss_button btn_green bevel_green btn_md no_margin_bottom">{{ loc.confirm }}</button>
	</div>

  </div>
</script>

<script id="settings-control-binder-template" type="text/x-template">
	<input ref="controlInput" @change="BAWK.play('ui_onchange')" type="text" v-model="currentValue" :placeholder="loc.press_key" class="ss_keybind clickme text_blue8" :class="(currentValue === 'undefined' ? 'ss_keybind_undefined' : '')"
		v-on:mousedown="onMouseDown($event)"
		v-on:keydown="onKeyDown($event)" 
		v-on:keyup="onKeyUp($event)" 
		v-on:wheel="onWheel($event)"
		v-on:focusout="onFocusOut($event)">
</script>

<script>
var comp_settings_control_binder = {
	template: '#settings-control-binder-template',
	props: ['loc', 'controlId', 'controlValue'],
	
	data: function () {
		return {
			currentValue: this.controlValue,
			isCapturing: false
		}
	},

	methods: {
		playSound (sound) {
			BAWK.play(sound);
		},
		
		reset: function () {
			this.currentValue = (this.controlValue === null) ? 'undefined' : this.controlValue;
			this.isCapturing = false;
			this.$refs.controlInput.blur();
		},

		capture: function (value) {
			this.isCapturing = false;
			this.$refs.controlInput.blur();
			this.$emit('control-captured', this.controlId, value);
		},

		onMouseDown: function (event) {
			if (!this.isCapturing) {
				this.currentValue = '';
				this.isCapturing = true;
			} else {
				BAWK.play('ui_onchange')
				this.capture('MOUSE ' + event.button);
			}
		},

		onKeyDown: function (event) {
			this.currentValue = '';
			event.stopPropagation();
		},

		onKeyUp: function (event) {
			event.stopPropagation();
			var key = event.key;

			if (key == 'Escape' || key == 'Tab' || key == 'Enter') {
				return;
			}

			if (key == ' ') {
				key = 'space';
				event.preventDefault();
			}
			
			this.capture(key);
		},

		onWheel: function (event) {
			if (this.isCapturing) {
				BAWK.play('ui_onchange')
				if (event.deltaY > 0) {
					this.capture('WHEEL DOWN');
				} else if (event.deltaY < 0) {
					this.capture('WHEEL UP');
				}
			}
		},

		onFocusOut: function (event) {
			this.reset();
		}
	},

	watch: {
		// The value prop gets updated by the parent control; watch for changes and update the backing field of the textbox
		controlValue: function (newValue) {
			this.currentValue = (newValue === null) ? 'undefined' : newValue;
		}
	}
};
</script><script id="settings-gamepad-binder-template" type="text/x-template">
	<button ref="gamepadInput" class="ss_keybind clickme" :class="(currentValue === 'undefined' ? 'ss_keybind_undefined' : '')"
		v-on:mousedown="onMouseDown($event)"
		v-on:keydown="onKeyDown($event)" 
		v-on:keyup="onKeyUp($event)" 
		v-on:focusout="onFocusOut($event)"
		:key="controllerType">
		<span v-html="currentValue"></span></button>
</script>

<script>
var comp_settings_gamepad_binder = {
	template: '#settings-gamepad-binder-template',
	props: ['loc', 'controlId', 'controlValue', 'controllerType'],
	
	data: function () {
		return {
			currentValue: (this.controlValue === null) ? 'undefined' : vueData.controllerButtonIcons[this.controllerType][this.controlValue],
			isCapturing: false
		}
	},

	beforeUpdate: function () {
		if (!this.isCapturing) {
			this.setIcon(this.controlValue);
		}
	},

	methods: {
		playSound (sound) {
			BAWK.play(sound);
		},
		
		reset: function () {
			this.setIcon(this.controlValue);
			this.isCapturing = false;

			removeEventListener('gamepadbuttondown', this.onButtonDown);
			removeEventListener('gamepadbuttonup', this.onButtonUp);
		},

		capture: function (value) {
			this.isCapturing = false;
			this.$refs.gamepadInput.blur();
			this.$emit('control-captured', this.controlId, value);
			this.reset();
		},

		onMouseDown: function (event) {
			if (!this.isCapturing) {
				this.currentValue = this.loc.press_button;
				this.isCapturing = true;

				addEventListener('gamepadbuttondown', this.onButtonDown);
				addEventListener('gamepadbuttonup', this.onButtonUp);
			}
		},

		onKeyDown: function (event) {
			event.stopPropagation();
		},

		onKeyUp: function (event) {
			event.stopPropagation();
		},

		onButtonDown: function (event) {
			if (event.detail == 8 || event.detail == 9) return;
			BAWK.play('ui_onchange')
			this.capture(event.detail);
		},

		onFocusOut: function (event) {
			this.reset();
		},

		setIcon: function (value) {
			this.currentValue = (value === null) ? 'undefined' : vueData.controllerButtonIcons[this.controllerType][value];
		}
	},

	watch: {
		// The value prop gets updated by the parent control; watch for changes and update the backing field of the textbox
		controlValue: function (newValue) {
			this.setIcon(newValue);
		}
	}
};
</script><script id="settings-adjuster-template" type="text/x-template">
	<div>
		<h3 v-if="!smallHeader" class="margin-bottom-none h-short" v-html="loc[locKey]"></h3>
		<label v-if="smallHeader" class="label" v-html="loc[locKey]"></label>

		<div class="f_row">
			<input class="ss_slider" :disabled="disabled" type="range" :min="min" :max="max" :step="step" v-model="currentValue" @change="onChange">
			<label class="ss_slider label text_blue4">{{ getCurrentValue() }}{{ labelSuffix }}</label>
		</div>
	</div>
</script>

<script>
var comp_settings_adjuster = {
	template: '#settings-adjuster-template',
	props: ['loc', 'smallHeader', 'locKey',
		'controlId', 'controlValue', 'disabled',
		'min', 'max', 'step', 'multiplier',
		'precision', 'labelSuffix'
	],

	data: function () {
		return {
			currentValue: this.controlValue
		}
	},

	methods: {
		onChange: function (event) {
			this.$emit('setting-adjusted', this.controlId, this.currentValue);
			BAWK.play('ui_onchange');
		},

		getCurrentValue: function () {
			if (this.precision) {
				return Number.parseFloat(this.currentValue).toFixed(this.precision);
			}
			else {
				return Math.floor(this.currentValue * (this.multiplier || 1));
			}
		}
	},

	watch: {
		// controlValue prop could change when player X's out or clicks Cancel
		controlValue: function (newValue) {
			if (this.currentValue !== newValue) {
				this.currentValue = newValue;
			}
		}
	}
};
</script><script id="settings-toggler-template" type="text/x-template">
	<label v-if="!hide" class="ss_checkbox label"> {{ loc[locKey] }}
		<input type="checkbox" v-model="currentValue" @change="onChange($event)">
		<span class="checkmark"></span>
	</label>
</script>

<script>
var comp_settings_toggler = {
	template: '#settings-toggler-template',
	props: ['loc', 'locKey', 'controlId', 'controlValue', 'hide'],

	data: function () {
		return {
			currentValue: this.controlValue
		}
	},

	methods: {
		onChange: function (event) {
			this.$emit('setting-toggled', this.controlId, this.currentValue);
			BAWK.play('ui_onchange');
		}
	},

	watch: {
		// controlValue prop could change when player X's out or clicks Cancel
		controlValue: function (newValue) {
			if (this.currentValue !== newValue) {
				this.currentValue = newValue;
			}
		}
	}
};
</script>
<script>
var comp_settings = {
	template: '#settings-template',
	components: {
		'settings-control-binder': comp_settings_control_binder,
		'settings-gamepad-binder': comp_settings_gamepad_binder,
		'language-selector': comp_language_selector,
		'settings-adjuster': comp_settings_adjuster,
		'settings-toggler': comp_settings_toggler
	},
	props: ['loc', 'settingsUi', 'languages', 'currentLanguageCode', 'showPrivacyOptions', 'controllerId', 'isFromEU', 'controllerType', 'langOption', 'isVip', 'regionList', 'currentRegionId'],

	data: function () {
		return {
			showKeyboardTab: true,
			showControllerTab: false,
			showMiscTab: false,

			originalSettings: {},
			showDetailSettings: false,
			originalLanguage: '',
			originalMusicVolume: '',
			musicStatChg: '',
			currentRegion: '',
			icons: {
				keyboard: 'img/ico_keyboard.svg',
				mouse: 'img/ico_mouse.svg',
				gamePad: 'img/ico_gamepad.svg',
				monitor: 'img/ico_monitor.svg',
				speaker: 'img/ico_speaker.svg'
			}
		}
	},
	
	methods: {
		onChangeRegion() {
			if (vueData.currentRegionId !== this.currentRegion) {
				extern.selectRegion(this.currentRegion);
				BAWK.play('ui_onchange');
			}
		},

		selectTab: function (e) {
			return this.switchTab(e.target.id)
		},
		
		switchTab(tab) {

			this.showKeyboardTab = false;
			this.showControllerTab = false;
			this.showMiscTab = false;

			switch (tab) {
				case 'keyboard_button':
					this.showKeyboardTab = true;
					break;

				case 'controller_button':
					this.showControllerTab = true;
					break;

				case 'misc_button':
					this.showMiscTab = true;
					break;
			}

			BAWK.play('ui_toggletab');
		},

		captureOriginalSettings: function () {
			this.originalSettings = deepClone(vueData.settingsUi);
			this.originalLanguage = this.currentLanguageCode;
			// this.originalMusicVolume = this.originalSettings.adjusters.music[0].value;
		},

		applyOriginalSettings: function () {
			vueData.settingsUi = this.originalSettings;
			this.showDetailSettings = !vueData.settingsUi.togglers.misc.find( a => { return a.id === 'autoDetail'; }).value;

			console.log('applying original settings: ' + JSON.stringify(vueData.settingsUi));
		},

		onGameControlCaptured: function (id, value) {
			this.onControlCaptured(this.settingsUi.controls.keyboard.game, id, value)
		},

		onSpectateControlCaptured: function (id, value) {
			this.onControlCaptured(this.settingsUi.controls.keyboard.spectate, id, value)
		},

		onGamepadGameControlCaptured: function (id, value) {
			this.onControlCaptured(this.settingsUi.controls.gamepad.game, id, value)
		},

		onGamepadSpectateControlCaptured: function (id, value) {
			this.onControlCaptured(this.settingsUi.controls.gamepad.spectate, id, value)
		},

		onControlCaptured: function (controls, id, value) {
			value = value.toLocaleUpperCase();

			controls
				.forEach( (c) => {
					if (c.id === id) {
						c.value = value;
					} else {
						if (c.value === value) {
							c.value = null;
						}
					}
			});
		},

		onSettingToggled: function (id, value) {
			console.log('value: ' + value);

			Object.values(this.settingsUi.togglers).forEach(v => {
				var toggler = v.find(t => { return t.id === id; });
				if (toggler) toggler.value = value;
			})

			if (id === 'autoDetail') {
				this.showDetailSettings = !value;
			}

			if (id === 'safeNames') {
				extern.setSafeNames(value);
			}

			// if (id === 'musicStatus') {
			// 	extern.setMusicStatus(value);
			// 	this.musicStatChg = true;

			// 	if (extern.inGame) {
			// 		vueApp.toggleMusic();
			// 	}
			// }
		},

		onSettingAdjusted: function (id, value) {
			Object.values(this.settingsUi.adjusters).forEach(v => {
				var adjuster = v.find( (a) => { return a.id === id; });
				if (adjuster) adjuster.value = value;
			})

			if (id === 'volume') {
				extern.setVolume(value);
			}

			if (id === 'mouseSpeed') {
				extern.setMouseSpeed(value);
			}

			if (id === 'sensitivity') {
				extern.setControllerSpeed(value);
			}

			if (id === 'deadzone') {
				extern.setDeadzone(value);
			}

			if (id === 'musicVolume') {
				extern.setMusicVolume(value);
			}

		},

		onVolumeChange: function () {
			extern.setVolume(this.settingsUi.volume);
		},

		onPrivacyOptionsClicked: function () {
			this.$emit('privacy-options-opened');
			BAWK.play('ui_popupopen');
		},
		
		onCancelClick: function () {
			this.applyOriginalSettings();
			//extern.setMusicVolume(this.originalMusicVolume);
			this.cancelLanguageSelect();
			if (this.musicStatChg) {
				if (extern.inGame) { 
					vueApp.toggleMusic();
				}
			};
			this.$parent.close();
		},

		onCloseClick: function () {
			this.applyOriginalSettings();
			//extern.setMusicVolume(this.originalMusicVolume);
			this.cancelLanguageSelect();
			if (this.musicStatChg) {
				if (extern.inGame) {
					vueApp.toggleMusic();
				}
			};
			vueApp.sharedIngamePopupClosed();
			this.$parent.toggle();
			BAWK.play('ui_popupclose');
		},

		quickSave() {
			extern.applyUiSettings(this.settingsUi, this.originalSettings);
			this.resetOriginalLanguage();		
		},
		
		onSaveClick: function () {
			// if (vueApp.music.serverTracks.title) {
			// 	this.gaMusicVol();
			// }
			// this.gaMusicVol();

			extern.applyUiSettings(this.settingsUi, this.originalSettings);
			this.resetOriginalLanguage();
			vueApp.sharedIngamePopupClosed();
			this.$parent.toggle();
			BAWK.play('ui_playconfirm');
			this.sendChangesToGa(this.originalSettings, this.settingsUi);
		},

		sendChangesToGa(originalSettings, currentSettings) {
			const changes = [];

			function compareSettingsArray(type, category, originalArray, currentArray) {
				originalArray.forEach((originalItem, index) => {
					const currentItem = currentArray[index];

					// Check if value has changed
					if (originalItem.value !== currentItem.value) {
						changes.push({
							type,
							category,
							id: originalItem.id,
							originalValue: originalItem.value,
							newValue: currentItem.value
						});
					}
				});
			}

			function compareSettings(type, original, current) {
				Object.keys(current).forEach(category => {
					compareSettingsArray(type, category, original[category], current[category]);
				});
			}

			compareSettings('adjusters', originalSettings.adjusters, currentSettings.adjusters);
			compareSettings('togglers', originalSettings.togglers, currentSettings.togglers);
			
			Object.keys(currentSettings.controls).forEach(inputType => {
				compareSettings(`controls_${inputType}`, originalSettings.controls[inputType], currentSettings.controls[inputType]);
			});

			function hasDecimal(value) {
				return typeof value === 'number' && !Number.isInteger(value);
			}

			changes.forEach(el => {
				let val = el.newValue;

				if (el.type === 'adjusters') {
					let toNumber = Number(val);
					val = hasDecimal(toNumber) ? Math.round(toNumber * 100) : toNumber;
				}
				ga('send', 'event', 'game', 'settings', el.id, val);
			});
		},

		gaMusicVol() {
			let newVol = Number(this.settingsUi.adjusters.music[0].value);
			if (newVol === Number(this.originalMusicVolume)) return;
			if ((Math.round(newVol*100)) <= 1) {
				ga('send', 'event', 'music', 'mute', vueApp.music.serverTracks.title);
			}
		},
		onResetClick: function () {
			extern.resetSettings();
			BAWK.play('ui_reset');
		},
		cancelLanguageSelect: function() {
			this.originalLanguage === vueApp.$data.currentLanguageCode ?
				vueApp.changeLanguage(vueApp.$data.currentLanguageCode) : vueApp.changeLanguage(this.originalLanguage);
			// Revert localStore for language
			localStore.setItem('languageSelected', this.originalLanguage);
			this.resetOriginalLanguage();
		},
		resetOriginalLanguage: function() {
			this.originalLanguage = '';
		},
		setSettings: function (settings) {
			var getSettingById = (list, id) => {
				return list.filter( o => {
						return o.id == id;
				})[0];
			};

			// Keyboard

			getSettingById(this.settingsUi.controls.keyboard.game, 'up').value = settings.controls.keyboard.game.up;
			getSettingById(this.settingsUi.controls.keyboard.game, 'down').value = settings.controls.keyboard.game.down;
			getSettingById(this.settingsUi.controls.keyboard.game, 'left').value = settings.controls.keyboard.game.left;
			getSettingById(this.settingsUi.controls.keyboard.game, 'right').value = settings.controls.keyboard.game.right;
			getSettingById(this.settingsUi.controls.keyboard.game, 'jump').value = settings.controls.keyboard.game.jump;
			getSettingById(this.settingsUi.controls.keyboard.game, 'melee').value = settings.controls.keyboard.game.melee;
			getSettingById(this.settingsUi.controls.keyboard.game, 'inspect').value = settings.controls.keyboard.game.inspect;
			getSettingById(this.settingsUi.controls.keyboard.game, 'fire').value = settings.controls.keyboard.game.fire;
			getSettingById(this.settingsUi.controls.keyboard.game, 'scope').value = settings.controls.keyboard.game.scope;
			getSettingById(this.settingsUi.controls.keyboard.game, 'reload').value = settings.controls.keyboard.game.reload;
			getSettingById(this.settingsUi.controls.keyboard.game, 'swap_weapon').value = settings.controls.keyboard.game.swap_weapon;
			getSettingById(this.settingsUi.controls.keyboard.game, 'grenade').value = settings.controls.keyboard.game.grenade;
			getSettingById(this.settingsUi.controls.keyboard.spectate, 'ascend').value = settings.controls.keyboard.spectate.ascend;
			getSettingById(this.settingsUi.controls.keyboard.spectate, 'descend').value = settings.controls.keyboard.spectate.descend;
			getSettingById(this.settingsUi.controls.keyboard.spectate, 'toggle_freecam').value = settings.controls.keyboard.spectate.toggle_freecam;
			getSettingById(this.settingsUi.controls.keyboard.spectate, 'slow').value = settings.controls.keyboard.spectate.slow;

			// Gamepad

			getSettingById(this.settingsUi.controls.gamepad.game, 'jump').value = settings.controls.gamepad.game.jump;
			getSettingById(this.settingsUi.controls.gamepad.game, 'fire').value = settings.controls.gamepad.game.fire;
			getSettingById(this.settingsUi.controls.gamepad.game, 'scope').value = settings.controls.gamepad.game.scope;
			getSettingById(this.settingsUi.controls.gamepad.game, 'reload').value = settings.controls.gamepad.game.reload;
			getSettingById(this.settingsUi.controls.gamepad.game, 'swap_weapon').value = settings.controls.gamepad.game.swap_weapon;
			getSettingById(this.settingsUi.controls.gamepad.game, 'grenade').value = settings.controls.gamepad.game.grenade;
			getSettingById(this.settingsUi.controls.gamepad.game, 'melee').value = settings.controls.gamepad.game.melee;
			getSettingById(this.settingsUi.controls.gamepad.game, 'inspect').value = settings.controls.gamepad.game.inspect;
			getSettingById(this.settingsUi.controls.gamepad.spectate, 'ascend').value = settings.controls.gamepad.spectate.ascend;
			getSettingById(this.settingsUi.controls.gamepad.spectate, 'descend').value = settings.controls.gamepad.spectate.descend;

			// Misc

			getSettingById(this.settingsUi.adjusters.misc, 'volume').value = settings.volume;
			// getSettingById(this.settingsUi.adjusters.music, 'musicVolume').value = settings.musicVolume;
			getSettingById(this.settingsUi.adjusters.mouse, 'mouseSpeed').value = settings.mouseSpeed;
			getSettingById(this.settingsUi.adjusters.gamepad, 'sensitivity').value = settings.controllerSpeed;
			getSettingById(this.settingsUi.adjusters.gamepad, 'deadzone').value = settings.deadzone;

			getSettingById(this.settingsUi.togglers.mouse, 'mouseInvert').value = (settings.mouseInvert !== 1);
			getSettingById(this.settingsUi.togglers.mouse, 'fastPollMouse').value = settings.fastPollMouse;
			getSettingById(this.settingsUi.togglers.gamepad, 'controllerInvert').value = (settings.controllerInvert !== 1);

			getSettingById(this.settingsUi.togglers.misc, 'holdToAim').value = settings.holdToAim;
			getSettingById(this.settingsUi.togglers.misc, 'enableChat').value = settings.enableChat;
			getSettingById(this.settingsUi.togglers.misc, 'safeNames').value = settings.safeNames;
			getSettingById(this.settingsUi.togglers.misc, 'autoDetail').value = settings.autoDetail;
			getSettingById(this.settingsUi.togglers.misc, 'shadowsEnabled').value = settings.shadowsEnabled;
			getSettingById(this.settingsUi.togglers.misc, 'highRes').value = settings.highRes;
			getSettingById(this.settingsUi.togglers.misc2, 'hideBadge').value = settings.hideBadge;
			getSettingById(this.settingsUi.togglers.misc2, 'closeWindowAlert').value = settings.closeWindowAlert;
			getSettingById(this.settingsUi.togglers.misc2, 'shakeEnabled').value = settings.shakeEnabled;
			getSettingById(this.settingsUi.togglers.misc2, 'centerDot').value = settings.centerDot;
			getSettingById(this.settingsUi.togglers.misc2, 'hitMarkers').value = settings.hitMarkers;
			// getSettingById(this.settingsUi.togglers.misc, 'musicStatus').value = settings.musicStatus;

			console.log('auto detail: ' + settings.autoDetail);
			this.showDetailSettings = !settings.autoDetail;
		},

		hideSetting(id) {
			if (id === 'hideBadge') {
				return this.isVip;
			}
			return true;
		},

		onHelpClickDelete() {
			vueApp.hideSettingsPopup();
			vueApp.showHelpPopupFeedbackWithDelete();
			ga('send', 'event', vueApp.googleAnalytics.cat.playerStats, vueApp.googleAnalytics.action.faqPopupClick);
			BAWK.play('ui_popupopen');
		},

		showForCrazyGame(locRef) {
			return locRef !== 'keybindings_despawn' || crazyGamesActive;
		}
	},
	computed: {
		getControllerId() {
			if (this.controllerId == 'No controller detected') {
				return vueApp.loc['p_settings_nocontroller']
			} else {
				return this.controllerId
			}
		}
	},
	watch: {
		currentRegionId(val) {
			if (this.currentRegion !== val) {
				this.currentRegion = val;
			}
		}
	}
};
</script><script id="help-template" type="text/x-template">
    <div>
       <div class="f_row align-items-center  justify-content-center">
            <button id="faq_button" @click="toggleTabs" class="ss_bigtab bevel_blue ss_marginright roundme_md font-sigmar" :class="(showTab1 ? 'selected' : '')">{{ loc.faq }}</button>
            <button id="fb_button" @click="toggleTabs" class="ss_bigtab bevel_blue roundme_md font-sigmar" :class="(!showTab1 ? 'selected' : '')">{{ loc.feedback }}</button>
        </div>
        <div v-show="showTab1">
            
            <div id="feedback_panel">      

                <h1>{{ loc.faq_title }}</h1>

				<help-questions :content="localizeThis"></help-questions>

                <hr>
                <div id="btn_horizontal" class="f_center">
	            	<button @click="onBackClick" class="ss_button btn_md btn_red bevel_red ss_marginright">{{ loc.cancel }}</button>
                </div>
                
            </div>            
        </div>

        <div v-show="!showTab1">
	        
	        <div id="feedback_panel">
	            <h1 :class="{'text-center' : isAccountDeleteReq}">{{ feedbackTitle }}</h1>
	            
	            <p v-if="!isAccountDeleteReq">{{ loc.fb_feedback_intro }}</p>
				<h4 v-if="isNoAccountForDelete" class="text-center">{{loc.feedback_sign_in_msg}}</h4>

				<div id="btn_horizontal" class="f_center">
	                <select v-model="selectedType" class="ss_field ss_marginright" @click="BAWK.play('ui_click')" @change="BAWK.play('ui_onchange')">
	                    <option v-for="type in feedbackType" :value="type.id">{{ loc[type.locKey] }}</option>
	                </select>
	            
	                <input id="feedbackEmail" v-model="email" :placeholder="loc.fb_email_ph" class="ss_field" v-on:keyup="validateEmail">
				</div>
				
				<div>
	                <textarea v-if="!isAccountDeleteReq" id="feedbackText" class="ss_field" v-model="feedback" :placeholder="loc.fb_feedback_ph" v-on:keyup="validateMessage"></textarea>
				</div>
				
				<div class="f_center f_col">
					<span v-show="emailInvalid" class="ss_marginright error_text">{{ loc.fb_bad_email }}</span>
					<span v-show="messageInvalid" class="ss_marginright error_text">{{ loc.fb_no_comment }}</span>
				</div>
				
	            <div id="btn_horizontal" class="f_center">
	            	<button @click="onBackClick" class="ss_button btn_md btn_red bevel_red ss_marginright">{{ loc.cancel }}</button>
	                <button @click="onSendClick" class="ss_button btn_md btn_green bevel_green">{{ sendBtnText }}</button>
	            </div>
            </div>

        </div>
    </div>
</script>

<script id="help-question-template" type="text/x-template">
    <div>
		<div v-for="qa in content">
			<a :name="qa[0]"></a>
			<h3>{{ qa[1] }}</h3>
			<span v-html="qa[2]"></span>
		</div>
    </div>
</script>

<script>
var comp_help_question = {
    template: '#help-question-template',
    props: ['content'],
};
</script>
<script>
var comp_help = {
    template: '#help-template',
	components: {
        'help-questions': comp_help_question,
	},
	props: ['loc', 'accountType', 'feedbackType', 'openWithType'],
	mounted() {
		this.helpLocSetup();
	},
    data: function () {
        return {
            showTab1: true,
            selectedType: 0,
            email: '',
            feedback: '',
            doValidation: false,
            emailInvalid: false,
            messageInvalid: false,
			qaNum: [1,2,3,4,5,6,7,8,9,10,11],
			newLoc: [],
			localizeThis:  [],
			

        }
    },
    feedbackValidateTimeout: 0,
    methods: {
		playSound (sound) {
			BAWK.play(sound);
        },
        
        validateEmail: function () {
            if (!this.doValidation) {
                return;
            }
            // Insane e-mail-validating regex
            var re = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
            
            this.emailInvalid = (this.email === '' || !re.test(this.email));
            return !this.emailInvalid;
        },

        validateMessage: function () {
            if (!this.doValidation) {
                return;
            }
            this.messageInvalid = this.feedback === '';
            return !this.messageInvalid;
        },

        toggleTabs: function () {
            this.showTab1 = !this.showTab1;
			this.selectedType = 0;
			this.$emit('resetFeedbackType');
            BAWK.play('ui_toggletab');
			if ( !this.showTab1) {
				ga('send', 'event', 'feedback opened');
			}
        },
        
        onBackClick: function () {
            vueApp.$refs.helpPopup.toggle();
            BAWK.play('ui_popupclose');
        },

		sendFeedbackApi(selected) {
			if (!selected) {
				selected = this.selectedType;
			}

            extern.api_feedback(selected, this.email, this.feedback);

            setTimeout(() => {
                if (this.selectedType !== this.feedbackType.delete.id) {
					this.$parent.toggle();
				}
                this.selectedType = 0;
                this.feedback = null;
                this.email = null;
            }, 900);
		},
		
        onSendClick: function () {
			if (this.isNoAccountForDelete) {
				vueApp.hideHelpPopup();
				vueApp.showFirebaseSignIn();
				return;
			}
            this.doValidation = true;

			if (this.selectedType === this.feedbackType.delete.id) {
				this.comment = null;
				this.$parent.toggle();
				vueApp.showDeleteAccoutApprovalPopup();
				BAWK.play('ui_popupopen');
				return;
			} else {
				if (!this.validateEmail() || !this.validateMessage() ) {
					return;
				}
			}

			BAWK.play('ui_playconfirm');

            // Send that shit out
            this.sendFeedbackApi();
        },

		onAccountDelectionConfirmed() {
			this.sendFeedbackApi(this.feedbackType.delete.id);
		},

		helpLocSetup(locContent) {
			let content = this.loc;
			// if (locContent) {
			// 	content = locContent
			// }
			const locArray = Object.entries(content);
			this.newLoc = locArray.filter( (item, i) => {
				if (item[0].includes('faqItems_q')) {
					return item;
				}
			});

			const tranlateThat = [];

			for (let n = 0; n < this.qaNum.length; n++) {
				tranlateThat.push([]);
				for (let i = 0; i < this.newLoc.length; i++) {
					if (this.newLoc[i][0].includes('faqItems_q' + this.qaNum[n] + '_')) {
						tranlateThat[n].push(this.newLoc[i][1]);
					}
				}
			}
			// Cause once again... vue
			setTimeout(() => {this.localizeThis = tranlateThat}, 500);
		},
		openFeedbackTabWith(type) {
			this.showTab1 = false;
			if (type) {
				this.selectedType = type;
			}
		}
    },
	computed: {
		isAccountDeleteReq() {
			return this.selectedType === this.feedbackType.delete.id;
		},
		isNoAccountForDelete() {
			return this.isAccountDeleteReq && this.accountType == 'no-account';
		},
		sendBtnText() {
			if (this.isNoAccountForDelete) {
				return this.loc.sign_in;
			} else {
				return this.loc.fb_send;
			}
		},
		feedbackTitle() {
			if (!this.isAccountDeleteReq) {
				return this.loc.fb_feedback_title;
			} else {
				return this.loc.fb_delete_account;
			}
		}
	},
	watch: {
		loc(val) {
			this.helpLocSetup(val);
		},
	}
};
</script><script id="vip-help-template" type="text/x-template">
    <div>
        <div id="feedback_panel">      
            <h1>{{ loc.vipHelptitle }}</h1>
            <strong><small class="text_yellow"><i class="fas fa-exclamation-triangle"></i> {{loc.vipHelpDesc2}}</small></strong>
            <p>{{loc.vipHelpDesc}}</p>

			<div>
				<a :name="loc.vipFaqItems_q1_anchor"></a>
				<h3>{{ loc.vipFaqItems_q1_q }}</h3>
				<p>{{ loc.vipFaqItems_q1_a_1 }}</p>
				<ul>
					<li>{{ loc.vipFaqItems_q1_li_1 }}</li>
					<li>{{ loc.vipFaqItems_q1_li_2 }}</li>
					<li>{{ loc.vipFaqItems_q1_li_3 }}</li>
					<li>{{ loc.vipFaqItems_q1_li_4 }}</li>
					<li>{{ loc.vipFaqItems_q1_li_5 }}</li>
					<li>{{ loc.vipFaqItems_q1_li_6 }}</li>
				</ul>
			</div>

			<div>
				<a :name="loc.vipFaqItems_q2_anchor"></a>
				<h3>{{ loc.vipFaqItems_q2_q }}</h3>
				<p>{{ loc.vipFaqItems_q2_a_1 }}</p>
			</div>

			<div>
				<a :name="loc.vipFaqItems_q3_anchor"></a>
				<h3>{{ loc.vipFaqItems_q3_q }}</h3>
				<p>{{ loc.vipFaqItems_q3_a_1 }}</p>
			</div>

			<div>
				<a :name="loc.vipFaqItems_q4_anchor"></a>
				<h3>{{ loc.vipFaqItems_q4_q }}</h3>
				<p>{{ loc.vipFaqItems_q4_a_mobile_3 }}</p>
				<p>{{ loc.vipFaqItems_q4_a_1 }}</p>
				<p>{{ loc.vipFaqItems_q4_a_2 }}</p>
			</div>

			<div>
				<a :name="loc.vipFaqItems_q5_anchor"></a>
				<h3>{{ loc.vipFaqItems_q5_q }}</h3>
				<p>{{ loc.vipFaqItems_q5_a_1 }}</p>
				<p>{{ loc.vipFaqItems_q5_a_2 }}</p>
				<p>{{ loc.vipFaqItems_q5_a_3 }}</p>
			</div>

			<div>
				<a :name="loc.vipFaqItems_q6_anchor"></a>
				<h3>{{ loc.vipFaqItems_q6_q }}</h3>
				<p>{{ loc.vipFaqItems_q6_a_1 }}</p>
				<p>{{ loc.vipFaqItems_q6_a_2 }}</p>
				<p>{{ loc.vipFaqItems_q6_a_3 }}</p>
			</div>

			<div>
				<a :name="loc.vipFaqItems_q7_anchor"></a>
				<h3>{{ loc.vipFaqItems_q7_q }}</h3>
				<p>{{ loc.vipFaqItems_q7_a_1 }}</p>
			</div>

<!-- 
            <div v-for="qa in loc.vipFaqItems">
                <a :name="qa.anchor"></a>
                <h3>{{ qa.q }}</h3>
                <p v-for="p in qa.a">
                   {{p}}
                </p>
                <ul v-if="qa.li">
                    <li v-for="li in qa.li">{{li}}</li>
                </ul>
            </div> -->

            <hr>
            <div id="btn_horizontal" class="f_center">
                <button @click="openVipStore" class="ss_button btn_md btn_green bevel_green ss_marginright">{{ subButtonTxt }}</button>
                <button @click="onBackClick" class="ss_button btn_md btn_red bevel_red ss_marginright">{{ loc.cancel }}</button>
            </div>

        </div>
    </div>
</script>

<script>
var vip_help = {
    template: '#vip-help-template',
    props: ['loc', 'isVip'],
    data: function () {
        return {

        }
    },
    methods: {
        onBackClick() {
            BAWK.play('ui_popupclose');
            this.$parent.hide();
        },
        openVipStore() {
            this.$parent.hide();
            vueApp.showSubStorePopup();
        }
    },
    computed: {
        subButtonTxt() {
            return this.isVip ? this.loc.sManageBtn : this.loc.account_vip;
        }
    }
};
</script><script id="house-ad-big-template" type="text/x-template">
    <div v-show="(useAd !== null)">
        <button @click="onCloseClicked" class="popup_close splash_ad_close ad_close"><i class="fas fa-times text_white fa-2x"></i></button>
        <img :src="adImageUrl" @click="onClicked" class="splash_ad_image centered roundme_md">
    </div>
</script>

<script>
var comp_house_ad_big = {
    template: '#house-ad-big-template',
    data: function() {
        return {
            removeOverlayClick: '',
        }
    },
    
    props: ['useAd'],

    bigAdTimeout: null,

    methods: {
        onCloseClicked: function () {
            console.log('big ad closed');
            this.close();
        },

        onClicked: function () {
            this.close();
            BAWK.play('ui_click');
            extern.clickedHouseAdBig(this.useAd);
        },

        close: function () {
            if (this.useAd === null) {
				return;
			}
            BAWK.play('ui_popupclose');
            this.$emit('big-house-ad-closed');
        },

        outsideClickClose: function() {
            const showingId = document.getElementById('house-ad-big-template', true);
            this.removeOverlayClick = this.handleOutsideClick;
            document.addEventListener('click', this.removeOverlayClick);
        },
        
        handleOutsideClick: function(e) {
            // Stop bubbling
            e.stopPropagation();
            // If the target does NOT include the class splash_ad_image use the onCloseClicked method and remove the eventListener
            if ( ! e.target.id.includes('splash_ad_image') ) {
                this.onCloseClicked();
                document.removeEventListener('click', this.removeOverlayClick);
            }
        },
    },

    computed: {
        adImageUrl: function () {
            if (!hasValue(this.useAd)) {
                return;
            }

            return dynamicContentPrefix + 'data/img/art/{0}{1}'.format(this.useAd.id, this.useAd.imageExt);
        }
    },

    watch: {
        useAd: function (bigAd) {
            if (hasValue(bigAd)) {
				setTimeout(() => {
					vueApp.hideTitleScreenAd();
				}, 100);
                this.$options.bigAdTimeout = setTimeout(function () {
                    vueApp.ui.houseAds.big = null;
                }, 15000);
                // Close with outside click
                this.outsideClickClose();
            } else {
				vueApp.showTitleScreenAd();
			}
        }
    }
};
</script><script id="house-ad-small-template" type="text/x-template">
    <img v-show="(useAd !== null)" :src="adImageUrl" @click="onClicked" class="news_banner roundme_md">
</script>

<script>
var comp_house_ad_small = {
    template: '#house-ad-small-template',
    
    props: ['useAd'],

    methods: {
        onClicked: function () {
            BAWK.play('ui_click');
            extern.clickedHouseAdSmall(this.useAd);
        }
    },

    computed: {
        adImageUrl: function () {
            if (!hasValue(this.useAd)) {
                return;
            }
            ga('send', 'event', {
				eventCategory: 'House banner ad',
				eventAction: 'show',
				eventLabel: this.useAd.label
			});

            return dynamicContentPrefix + 'data/img/art/{0}{1}'.format(this.useAd.id, this.useAd.imageExt);
        }
    }
};
</script><script id="factions-popup-template" type="text/x-template">
  <div id="popupInnards" class="box_dark roundme_sm fullwidth f_col">
    <img :src="eggOrgLogo" class="centered_x factions-egg-org-logo">
    <h2 class="faction-popup-title text-center text_white nospace">
      <span>The<br /></span> Shadow War
    </h2>

    <p class="factions-desc-txt" v-html="loc.egg_org_popup_desc_1"></p>
    <p class="factions-desc-txt" v-html="paraDescTxt"></p>

    <div id="egg-org-meter-popup"></div>

    <div class="factions-types-wrap box_relative">
      <div class="f_row centered_x gap-1">

        <!-- Faction A (ID 1) -->
        <div id="faction-a" class="f_col box_relative justify-content-end">
          <img :src="getFactionImg(1)" class="faction-img bottom-0 right-0 faction-popup-faction-img" :class="getFactionActiveStyle(1)">
          <button
		  	v-if="firebaseId"
            :class="[getBtnStyle(1), 'box_absolute bottom-0']"
            @click="handleFactionClick(1)"
			v-html="getBtnText(1)"
          >
          </button>
        </div>

        <!-- Faction B (ID 0) -->
        <div id="faction-b" class="f_col box_relative justify-content-end">
          <img :src="getFactionImg(0)" class="faction-img bottom-0 left-0 faction-popup-faction-img" :class="getFactionActiveStyle(0)">
          <button
		  	v-if="firebaseId"
            :class="[getBtnStyle(0), 'box_absolute bottom-0']"
            @click="handleFactionClick(0)"
			v-html="getBtnText(0)"
          >
          </button>
        </div>
      </div>
    </div>
	<div class="centered_x factions-popup-no-account text-center" v-if="!firebaseId">
			<h3 class="factions-desc-txt text_white">{{ loc.factions_popup_noAccountText }}</h3>
			<button class="is-for-play ss_button btn_big btn_green bevel_green play-button box_relative" @click="handlePlayNowClick"><i class="fa fa-play fa-sm"></i> Play</button>
		</div>
  </div>
</script>

<script>
var FactionsPopup = {
  template: '#factions-popup-template',
  props: ['loc', 'factions', 'playerFaction', 'popupOpen', 'cooldownTimer', 'eggs', 'firebaseId'],

  data() {
    return {
      btnStyles: {
        join: 'ss_button ss_join_faction_button btn_yolk bevel_yolk btn_md margin-0 f_col align-items-center justify-items-center',
        equip: 'ss_button ss_equip_faction_button margin-0 btn_blue bevel_blue text_blue1',
		disabled: 'ss_button btn_yolk bevel_yolk btn_md margin-0 ss_join_faction_button btn_disabled',
      },
	  isOnCooldown: false,
	  cooldownCount: 60000,
	  costToSwitch: 10000,
    };
  },

  methods: {
	handleFactionClick(factionId) {
		if (!this.firebaseId) {
			return;
		}
		if (this.playerFaction === factionId) {
			BAWK.play('ui_click');
			this.$emit('factions-equip-item', factionId);
			return;
		}

		if (this.eggs < this.costToSwitch) return;

		BAWK.play('ui_click');

		// if (!this.isOnCooldown) {
		// 	extern.apiEggOrgSwitchFaction();
		// }

		this.startCooldown();
	},
	handlePlayNowClick() {
		this.$emit('play-now-clicked');
	},
	startCooldown() {
    	this.isOnCooldown = true;

		setTimeout(() => {
			this.isOnCooldown = false;
			this.cooldownCount = 60000;
		}, this.cooldownCount);
  	},
    getBtnText(factionId) {
		if (this.isOnCooldown && this.playerFaction !== factionId) {
			return this.loc.factions_popup_cooldown;
		}
      return this.playerFaction === factionId ? this.loc.factions_popup_equip: this.eggs < this.costToSwitch ? this.loc.factions_popup_moreEggs : this.loc.factions_popup_switch;
    },
    getBtnStyle(factionId) {
		if (this.isOnCooldown && this.playerFaction !== factionId) {
			return this.btnStyles.disabled;
		}
      return this.playerFaction === factionId ? this.btnStyles.equip : this.btnStyles.join;
    },
	getFactionActiveStyle(factionId) {
		if (this.firebaseId === null) {
			return '';
		}
		return this.playerFaction === factionId ? 'faction-active' : '';
	},
    getFactionImg(factionId) {
      const base = factionId === 1 ? 'eggsassins' : 'masters';
      const glam = this.playerFaction === factionId ? 'glamON' : 'glamOFF';
      return `img/gauge-bar/${base}_${glam}.png`;
    }
  },

  computed: {
    eggOrgLogo() {
      return this.playerFaction === 1
        ? 'img/gauge-bar/egg-org-red.png'
        : 'img/gauge-bar/egg-org-blue.png';
    },
	paraDescTxt() {
		if (!this.firebaseId) {
			return this.loc.egg_org_popup_desc_no_faction;
		}
		return this.playerFaction === 1
			? this.loc.egg_org_popup_desc_2
			: this.loc.egg_org_popup_desc_2_alt;
	}
  },

  watch: {
	popupOpen(val) {
		// Add open/close logic here if needed
	},
	cooldownTimer(val) {
		if (val && val > 0) {
			this.cooldownCount = val * 1000;
			this.startCooldown();
		}
	}
}
};
</script>
<script id="item-template" type="text/x-template">
	<div v-if="active" class="box_relative center_h" ref="itemObserver">
		<div :class="tooltip" ref="theTooltip">
			<span v-if="showTooltip" class="paddings_sm display-grid">
				<div>
					<h4 class="nospace text_yolk">{{ itemName }}</h4>
				</div>
				<!-- <p class="nospace text_blue5">{{ tooltipTxt.desc }}</p> -->
			</span>
			<div ref="eggItemInvetory" class="grid-item roundme_lg clickme common-box-shadow box_relative" :class="[itemClass, itemType, itemTagsString]" @click="onClick">
				<div v-show="!renderDone" class="centered"><i class="fas fa-egg fa-spin fa-2x"></i></div>
				<span v-if="isVipItem">
					<icon name="ico-vip" class="equip-vip-icon"></icon>
				</span>
				<div v-if="hasBanner && !notify" class="equip-item-banner shadow">
					<span class="visibility-hidden">{{bannerTxt}}</span>
				</div>
				<div v-if="hasBanner && !notify" class="equip-item-banner">
					{{bannerTxt}}
				</div>
				<div v-if="showPrice && renderDone" class="equip_smallprice display-grid box_absolute grid-column-auto-1 gap-sm">
					<div class="equip_cost box_absolute f_row align-items-center" :class="equipCostTagCls">
						<i v-if="isPremium && !isItemOwned" :class="priceIcon"></i><span v-if="!isPremium && !isItemOwned && !hidePrice" class="egg-price-egg">