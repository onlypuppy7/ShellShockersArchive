var servers = [
    { name: 'US East', subdom: 'useast2.', locKey: 'server_useast', id: 'us-e1' },
    { name: 'US West', subdom: 'uswest2.', locKey: 'server_uswest', id: 'us-w1' },
    { name: 'US Central', subdom: 'uscentral2.', locKey: 'server_uscentral', id: 'us-c1' },
    { name: 'Brazil', subdom: 'brazil2.', locKey: 'server_brazil', id: 'br-1' },
    { name: 'Germany', subdom: 'frankfurt.', locKey: 'server_germany', id: 'de-1' },
    { name: 'Singapore', subdom: 'singapore2.', locKey: 'server_singapore', id: 'si-1' },
    { name: 'Sydney', subdom: 'sydney.', locKey: 'server_sydney', id: 'au-1' },
];

var debug = false;

var servicesServer = 'wss://' + window.location.hostname + '/services/';
const isLocalShellDev = location.hostname.startsWith('localshelldev'),
      isLocalHost = location.hostname.startsWith('localhost');

if (dynamicContentRoot) {
    servicesServer = 'wss://' + dynamicContentRoot + '/services/';
}
else if (isLocalHost || isLocalShellDev) {
    servicesServer = isLocalHost ? 'ws://localhost:4242' : 'ws://localshelldev.bluewizard.com:4242/';
    debug = true;
    if (isLocalShellDev)
        servers.push({ name: 'Local VM', subdom: 'localshelldev.', root: 'bluewizard.com', locKey: 'server_localshelldev', id: 'lucyskydiamonds' });
	servers.push({ name: 'local', subdom: '', locKey: '_server_local', id: 'local' });
    servers.push({ name: 'Dev (US West)', subdom: 'gamedev.', locKey: 'server_gamedev', id: 'gamedev' });
}
else if (location.hostname.startsWith('staging.shellshock.io')) {
    debug = true;
    servers = [{ name: 'Staging', subdom: 'staging.', locKey: 'server_staging', id: 'staging' }];
    var servicesServer = 'wss://staging.shellshock.io:8443/services/';
}

if (location.search.includes('portalTest')) {
    gameServerRoot = 'shellshock.io';
    dynamicContentRoot = 'dev.shellshock.io';
    dynamicContentPrefix = 'https://dev.shellshock.io/'; 
}

if (location.hostname.startsWith('dev.shellshock.io') || dynamicContentRoot == 'dev.shellshock.io') {
    servers = [{ name: 'Dev (US West)', subdom: 'gamedev.', locKey: 'server_dev', id: 'dev' }];
    servicesServer = 'wss://dev.shellshock.io/services/';
}

function getGameServerUrl (server) {
    // Dump the www from the hostname if it exists
    var hostname = window.location.hostname;
    var fields = hostname.split('.');

    if (fields.length > 2) {
        hostname = fields[1] + '.' + fields[2];
    }

    // If we're running on localhost, and the game server is
    // on a remote subdomain, default to shellshock.io domain
    var rootName = server.root || hostname;

    if (server.subdom && rootName == 'localhost') {
        rootName = 'shellshock.io';
    }

    var subdom = server.subdom || '';

    if (gameServerRoot) rootName = gameServerRoot;

    if (server.subdom == '' && rootName === 'localhost' || rootName === 'bluewizard.com') {
        return 'ws://' + subdom + rootName + ':4430';
    } else {
        return 'wss://' + subdom + rootName;
    }
}

function getServerIndex (server) {
    return servers.map(s => s.id).indexOf(server.id);
}
