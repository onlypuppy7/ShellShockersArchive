/* 
* Prebid Custom Configuration
* Author: Ascendeum
* Last updated: 31 Oct 2019
* Dev update: Nov 4 2019
*/
// 'use strict';

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
var PREBID_TIMEOUT = 1000;
var FAILSAFE_TIMEOUT = 2000;
if(deviceWidth <= 768) PREBID_TIMEOUT = 1500;
var dfpNetwork = 21743024831;
var displayAdLoadCount = 1;
var adsStart = new Date().getTime();
var url = new URL(window.location.href);
var debugVal = (url.searchParams.get("pbjs_debug")=='true') ? true : false;

/* DFP Config */
var googletag = googletag || {};
googletag.cmd = googletag.cmd || [];
googletag.cmd.push(function() { 
    googletag.pubads().disableInitialLoad();
});
var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];

/* A9 Init */  
apstag.init({
    pubID: 'f1e42d2d-cc72-4aa3-bafc-56a1ea7df08a',
    adServer: 'googletag'
});

/* A9 Vars */
var a9Slots = [];
var a9BidsBack = false;


//Floortest KeyVal Targetting
var floortest_no = true;
window.floortest_no = floortest_no;
function setFloorTestTargeting(adUnitSlot){
  var randomNum = Math.random();
  var adSlot = googletag.pubads();
  if(adUnitSlot){
    adSlot = adUnitSlot;
  }

  if (randomNum > 0.8){
    //Call on click
    var subRandomNum = Math.random();
    if (subRandomNum > .75){
        adSlot.setTargeting("floortest", "4");
    } else if(subRandomNum > .50){
        adSlot.setTargeting("floortest", "3");
    } else if(subRandomNum > .25){
        adSlot.setTargeting("floortest", "2");
    } else {
        adSlot.setTargeting("floortest", "1");
    }
    window.floortest_no = false;
  } else {
    adSlot.setTargeting("floortest", "false");
  }
}

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


// Start HB
function loadAscAdDisplay() {
    // Define adunits to DFP
    if(displayAdLoadCount > 1){
        refreshAd(); //refresh ad 

    } else {
        googletag.cmd.push(function() {
            var slots = [];
            //Prebid Ad Units
            if(adUnits){
                for (var i = 0, len = adUnits.length; i < len; i++) {
                    adUnits[i]['slot'] = googletag.defineSlot('/'+dfpNetwork+'/'+adUnits[i].adunit, adUnits[i].mediaTypes.banner.sizes, adUnits[i].code).addService(googletag.pubads());
                    googletag.display( adUnits[i].code );
                    slots.push(adUnits[i]['slot']);
                }
            }
    
            // get newly generated IDs - or you can store them in array above of course
            var slotCodes = slots
                .map( function( slot ) { return slot.getSlotElementId() || ''; } )
                .filter( function( id ) { return id; } );
    
    
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
                        pbjs.setTargetingForGPTAsync( slotCodes );
                        googletag.pubads().refresh( slots );
                    },
                    timeout: PREBID_TIMEOUT
                });
            });
            // pbjs.timeStart = adsStart; 

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


            // Define non prebid adunits to DFP
            googletag.cmd.push(function() {
                //Floortest targeting
                setFloorTestTargeting(false);

                // Init DFP
                googletag.pubads().enableSingleRequest();
                googletag.pubads().collapseEmptyDivs();
                googletag.enableServices();
            });
    
        });
    }

    displayAdLoadCount++;
}


//Ad for loading screen
function displayLoadingScreenAd(){
    console.log('Load loading screen ad');

    //Loading AdUnits
    var loadingAdUnits = [{
        adunit: "ShellShock_LoadingScreen",
        code: "div-gpt-ad-ShellShock_LoadingScreen",
        mediaTypes: {
            banner: { sizes: [[970, 250], [970, 90], [728, 90], [300, 250], [300, 100]] }
        },
        bids: [{
            bidder: "appnexus",
            params: { placementId: 17514968 }
        },{
            bidder: "sovrn",
            params: { tagid: "655160" }
        },{
            bidder: "sovrn",
            params: { tagid: "655161" }
        },{
            bidder: "sovrn",
            params: { tagid: "655162" }
        },{
            bidder: "sovrn",
            params: { tagid: "655163" }
        }, {
            bidder: "openx",
            params: { 
                unit: "540893697",
                delDomain: "shellshock-d.openx.net"
            }
        }]
    }];

    googletag.cmd.push(function() {
        var loadingAdSlots = [];
        //Prebid Ad Units
        if(loadingAdUnits){
            for (var i = 0, len = loadingAdUnits.length; i < len; i++) {
                loadingAdUnits[i]['slot'] = googletag.defineSlot('/'+dfpNetwork+'/'+loadingAdUnits[i].adunit, loadingAdUnits[i].mediaTypes.banner.sizes, loadingAdUnits[i].code).addService(googletag.pubads());
                googletag.display( loadingAdUnits[i].code );
                loadingAdSlots.push(loadingAdUnits[i]['slot']);
            }
        }

        // get newly generated IDs - or you can store them in array above of course
        var loadingSlotCodes = loadingAdSlots
            .map( function( slot ) { return slot.getSlotElementId() || ''; } )
            .filter( function( id ) { return id; } );


        pbjs.que.push(function() { 
            pbjs.setConfig({
                debug: debugVal,
                cache: { url: false },
                priceGranularity: "high",
                bidderSequence: "random"
            });
            pbjs.addAdUnits(loadingAdUnits);
            pbjs.requestBids({
                adUnitCodes: loadingSlotCodes,
                bidsBackHandler: function(bidResponses) {
                    pbjs.setTargetingForGPTAsync( loadingSlotCodes );
                    googletag.pubads().refresh( loadingAdSlots );
                },
                timeout: PREBID_TIMEOUT
            });
        });

        /* A9 Slots */
        if(loadingAdUnits){
            if(apstag){
                for (var i = 0, len = loadingAdUnits.length; i < len; i++) {
                    a9Slots.push({
                        slotID: loadingAdUnits[i].code, 
                        slotName: dfpNetwork+'/'+loadingAdUnits[i].adunit, 
                        sizes: loadingAdUnits[i].mediaTypes.banner.sizes
                    });
                }
            }
        }

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


        // Define non prebid adunits to DFP
        googletag.cmd.push(function() {
            //Floortest targeting
            setFloorTestTargeting(false);

            // Init DFP
            googletag.pubads().enableSingleRequest();
            googletag.pubads().collapseEmptyDivs();
            googletag.enableServices();
        });
    });
}



/* Refresh Ad */
function refreshAdBid(refreshAdUnitCodes, allAdUnits) {
    pbjs.que.push(function() {
        /* A9 Request Bids */
        var callA9Slots = [];
        var a9SlotLen = a9Slots.length - 1;
        var allAdUnitsLen = allAdUnits.length - 1;
        var refreshSlots = [];

        for (var j = 0; j <= allAdUnitsLen; j++) {
            for (var i = a9SlotLen; i >= 0; i--) {
                if(a9Slots[i].slotID == allAdUnits[j]['code']) callA9Slots.push(a9Slots[i]);
            }
        }

        if(callA9Slots && (callA9Slots.length > 0)){
            apstag.fetchBids({
                slots: callA9Slots,
                timeout: PREBID_TIMEOUT
            }, function(bids) {
                /* A9 Set Bids */
                apstag.setDisplayBids();
                if(debugVal) console.log('BDS back, refresh', bids);
            }); 
        }
        
        pbjs.requestBids({
            timeout: PREBID_TIMEOUT,
            adUnitCodes: refreshAdUnitCodes,
            bidsBackHandler: function() {
                if(apstag) apstag.setDisplayBids();
                pbjs.setTargetingForGPTAsync(refreshAdUnitCodes);

                for (var j = 0; j <= allAdUnitsLen; j++) {
                    allAdUnits[j]['refreshcount'] = allAdUnits[j]['refreshcount']+1;
                    allAdUnits[j]['slot'].setTargeting('refreshIteration', (allAdUnits[j]['refreshcount']).toString() ); //Set Slot Tartgeting
                    refreshSlots.push(allAdUnits[j]['slot']);
                }
                setFloorTestTargeting(allAdUnits[j]['slot']); //floor_test targeting

                if(debugVal) { console.log('Refreshing Ad Unit Codes - '+JSON.stringify(refreshAdUnitCodes)); }
                googletag.pubads().refresh(refreshSlots);
            }
        });
    });
}


//Refresh Ad
function refreshAd(){
    console.log('refresh ad now.' + displayAdLoadCount);
    var refreshAdunitsCodes = [];
    var refreshAdunits = [];
    var len = adUnits.length;
    for (var i = 0; i < len; i++) {
        if(elementInViewport(adUnits[i]['code'])){
            refreshAdunitsCodes.push(adUnits[i]['code']);
            refreshAdunits.push(adUnits[i]);
        }
    }
    if(refreshAdunitsCodes.length > 0){
        refreshAdBid(refreshAdunitsCodes, refreshAdunits);
    }
}

// //Check Element Visibility
function elementInViewport(elId) {
    if(debugVal) { console.log('check if element in view: '+elId) }
    var el = document.getElementById(elId);
    if(el){
        var top = el.offsetTop;
        var left = el.offsetLeft;
        var width = el.offsetWidth;
        var height = el.offsetHeight;
    
        while(el.offsetParent) {
        el = el.offsetParent;
        top += el.offsetTop;
        left += el.offsetLeft;
        }
    
        return (
        top < (window.pageYOffset + window.innerHeight) &&
        left < (window.pageXOffset + window.innerWidth) &&
        (top + height) > window.pageYOffset &&
        (left + width) > window.pageXOffset
        );
    }
}