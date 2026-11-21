var servers = [
    { name: 'US East', subdom: 'useast2.' },
    { name: 'US West', subdom: 'uswest2.' },
    { name: 'US Central', subdom: 'uscentral2.' },
    { name: 'Brazil', subdom: 'brazil2.' },
    { name: 'Germany', subdom: 'frankfurt2.' },
    { name: 'Singapore', subdom: 'singapore2.' },
    { name: 'Sydney', subdom: 'sydney.' },
];

var debug = false;

var servicesServer = 'wss://' + window.location.hostname + '/services/:443';

if (location.hostname.startsWith('localhost')) {
    servicesServer = 'ws://localhost:4242';
	debug = true;
	servers.push({ name: 'local', subdom: '' });
    servers.push({ name: 'Dev (US West)', subdom: 'gamedev.', root: 'shellshock.io' });
}

if (location.hostname.startsWith('staging.shellshock.io')) {
    debug = true;
    servers = [{ name: 'Staging', subdom: 'staging.', root: 'shellshock.io' }];
    servicesServer = 'ws://staging.shellshock.io:4242/';
}

if (location.hostname.startsWith('dev.shellshock.io')) {
    servers = [{ name: 'Dev (US West)', subdom: 'gamedev.' }];
    servicesServer = 'ws://dev.shellshock.io/services/:443';
}

if (location.hostname.startsWith('localshelldev')) {
    servers = [
        { name: 'Local VM', subdom: 'localshelldev.', root: 'bluewizard.com' },
    ];

    servicesServer = 'ws://localshelldev.bluewizard.com:4242/';
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
    return 'wss://' + subdom + rootName;
}