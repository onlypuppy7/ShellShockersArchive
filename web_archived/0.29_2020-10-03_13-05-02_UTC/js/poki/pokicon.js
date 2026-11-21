var hasPoki = true;
let isPokiInit = true;
var blockingAds = true;
const getPoksgetParentUrl = () => {
    var isInIframe = (parent !== window),
        parentUrl = null;
    if (isInIframe) {
        parentUrl = document.referrer;
    }
    return parentUrl;
};
const startPokiInit = (debug) => {
    PokiSDK.init().then(() => hasPoki = true).catch(() => {
		console.log('Poki init failed');
		isPokiInit = false;
		blockingAds = true;
	});
    PokiSDK.setDebug(debug);
    blockingAds = false;
};
const initializePoki = () => {
    const isPokiIframe = getPoksgetParentUrl(),
          hostName = window.location.hostname,
          pokiQA = 'https://qa.po.ki/',
          pokiCom = 'poki.com',
          pokiGdn = 'poki-gdn.com',
          pokiPoki = 'poki.compoki.com',
          isDebug = hostName.includes('localshelldev') || hostName.includes('staging.shellshock');

    if (isPokiIframe !== null) {
        if (isPokiIframe.includes(pokiQA) || 
            isPokiIframe.includes(pokiCom ) || 
            isPokiIframe.includes(pokiGdn) || 
            isPokiIframe.includes(pokiPoki)) {
            startPokiInit(isDebug);
            return;
        }
		blockingAds = true;
    } else {

        if (hostName.includes('localshelldev') || hostName.includes('staging.shellshock')) {
            startPokiInit(isDebug);
            return;
        } else {
            console.log('Sorry no poki');
            // Just incase shit goes squirrelly.
            hasPoki = false;
            isPokiInit = false;
            window.location.href = "https://shellshock.io";
        }

    }
};

initializePoki();


