/* 
* Prebid Custom Configuration
* Author: Ascendeum
* Last updated: 09 Sep 2019
*/
'use strict';

// Detect Window Width
var detectWidth = function() {
    return window.screen.width || window.innerWidth || window.document.documentElement.clientWidth || Math.min(window.innerWidth, window.document.documentElement.clientWidth) || window.innerWidth || window.document.documentElement.clientWidth || window.document.getElementsByTagName('body')[0].clientWidth;
}
// Detect Device Category
var detectDevice = function() {
    var width = detectWidth();
    if(width >= 992) return 'Desktop';
    else if(width >= 768) return 'Tablet';
    else return 'Mobile';
}

var deviceWidth = detectWidth();
var deviceName = detectDevice();
var PREBID_TIMEOUT = 2000;
var FAILSAFE_TIMEOUT = 3000;
if(deviceWidth <= 768) PREBID_TIMEOUT = 2500;
var dfpNetwork = 21743024831;

/* DFP Config */
var googletag = googletag || {};
googletag.cmd = googletag.cmd || [];
googletag.cmd.push(function() { 
    googletag.pubads().disableInitialLoad();
});
var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];

const isGoogleTagReady = () => {
    if(window.googletag && googletag.pubadsReady) {
        googletag.pubads().addEventListener('slotRenderEnded', function(event) {
            if (event.slot.getSlotElementId() == "div-gpt-ad-ShellShock_Respawn_Banner") {
                var containsAd = !event.isEmpty;   
                console.log('event ', event);  
                console.log(containsAd);
            }
        });
    }
};

/* A9 Init */  
apstag.init({
    pubID: 'f1e42d2d-cc72-4aa3-bafc-56a1ea7df08a',
    adServer: 'googletag'
});

// Start HB
function loadAscAdDisplay() {
    console.log('loadAscAdDisplay triggered');
    var adsStart = new Date().getTime();
    var url = new URL(window.location.href);
    var debugVal = (url.searchParams.get("pbjs_debug")=='true') ? true : false;

    /* A9 Vars */
    var a9Slots = [];
    var a9BidsBack = false;

    //All Prebid AdUnits
    var adUnits = [{
        adunit: "Respawn_Banner",
        code: "div-gpt-ad-ShellShock_Respawn_Banner",
        mediaTypes: {
            banner: { sizes: [[970, 250], [970, 90], [728, 90], [300, 250], [300, 100]] }
        },
        bids: [{
            bidder: "appnexus",
            params: { placementId: 16466913 }
        },{
            bidder: "appnexus",
            params: { placementId: 16466914 }
        },{
            bidder: "sovrn",
            params: { tagid: "620451" }
        },{
            bidder: "sovrn",
            params: { tagid: "620452" }
        },{
            bidder: "sovrn",
            params: { tagid: "620453" }
        },{
            bidder: "sovrn",
            params: { tagid: "620454" }
        }, {
            bidder: "openx",
            params: { 
              unit: "540846146",
              delDomain: "shellshock-d.openx.net"
            }
        }]
    }];


    // Define adunits to DFP
    googletag.cmd.push(function() {
        var slots = [];
        //Prebid Ad Units

        if(adUnits){
            for (var i = 0, len = adUnits.length; i < len; i++) {
                // console.log('dfpNetwork', dfpNetwork);
                // console.log('adUnits', adUnits);
                // console.log('adUnits[i].adunit', adUnits[i].adunit);
                // console.log('adUnits[i].mediaTypes.banner.sizes', adUnits[i].mediaTypes.banner.sizes);
                // console.log('adUnits[i].code', adUnits[i].code);
                // console.log(i);
                var new_slot_id = googletag.defineSlot('/'+dfpNetwork+'/'+adUnits[i].adunit, adUnits[i].mediaTypes.banner.sizes, adUnits[i].code).addService(googletag.pubads());
                googletag.display( adUnits[i].code );
                slots.push(new_slot_id);
            }
        }


        if(debugVal) console.log(slots);

        // get newly generated IDs - or you can store them in array above of course
        var slotCodes = slots
            .map( function( slot ) { return slot.getSlotElementId() || ''; } )
            .filter( function( id ) { return id; } );

        if(debugVal) console.log(slotCodes);

        pbjs.que.push(function() { 
            pbjs.setConfig({
                debug: debugVal,
                cache: { url: false },
                priceGranularity: "high",
                bidderSequence: "random"
            });
            pbjs.addAdUnits(adUnits);
            pbjs.requestBids({
                adUnitCodes: slotCodes,
                bidsBackHandler: function(bidResponses) {
                    // sendAdserverRequest1();
                    pbjs.setTargetingForGPTAsync( slotCodes );
                    googletag.pubads().refresh( slots );
                },
                timeout: PREBID_TIMEOUT
            });
        });
        // pbjs.timeStart = adsStart;
    });

    /* A9 Slots */
    if(adUnits){
        if(apstag){
            for (var i = 0, len = adUnits.length; i < len; i++) {
                a9Slots.push({
                    slotID: adUnits[i].code, 
                    slotName: dfpNetwork+'/'+adUnits[i].adunit, 
                    sizes: adUnits[i].mediaTypes.banner.sizes
                });
            }
        }
    }

    if(debugVal) console.log(a9Slots);

    /* A9 Request Bids */
    apstag.fetchBids({
        slots: a9Slots,
        timeout: PREBID_TIMEOUT
    }, function(bids) {
        /* A9 Set Bids */
        apstag.setDisplayBids();
        if(debugVal) console.log('BDS back',(new Date()).getTime()-adsStart,bids);
        a9BidsBack = true;
    });

    if(debugVal) console.log('a9BidsBack ', a9BidsBack);
   

    // Define non prebid adunits to DFP
    googletag.cmd.push(function() {
        // Init DFP
        googletag.pubads().enableSingleRequest();
        // googletag.pubads().disableInitialLoad();
        // googletag.pubads().collapseEmptyDivs();
        googletag.enableServices();
    });

    // if(debugVal) isGoogleTagReady();
}