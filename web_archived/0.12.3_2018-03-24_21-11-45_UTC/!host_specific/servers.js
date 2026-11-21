var servers = [
    //{ name: 'home', address: '73.239.154.99:6262' },
    //{ name: 'US East 1', address: 'useast.shellshock.io:443' },
    { name: 'US East', address: 'useast.shellshock.io:443' },
    { name: 'US West', address: 'uswest.shellshock.io:443' },
    { name: 'US Central', address: 'uscentral.shellshock.io:443' },
    { name: 'Brazil', address: 'brazil.shellshock.io:443' },
    { name: 'Germany', address: 'germany.shellshock.io:443' },
    { name: 'Singapore', address: 'singapore.shellshock.io:443' },
    { name: 'Sydney', address: 'australia.shellshock.io:443' },
];

var debug = false;

if (location.hostname.startsWith('localhost')) {
	debug = true;
	servers.push({ name: 'local', address: '127.0.0.1:443' });
	servers.push({ name: 'Dev', address: 'germany.shellshock.io:80' });
}
