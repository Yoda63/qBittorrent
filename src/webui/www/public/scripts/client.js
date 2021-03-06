/*
 * MIT License
 * Copyright (c) 2008 Ishan Arora <ishan@qbittorrent.org>,
 * Christophe Dumez <chris@qbittorrent.org>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

myTable = new dynamicTable();

var updatePropertiesPanel = function(){};

var stateToImg = function (state) {
    if (state == "pausedUP" || state == "pausedDL") {
        state = "paused";
    } else {
        if (state == "queuedUP" || state == "queuedDL") {
            state = "queued";
        } else {
            if (state == "checkingUP" || state == "checkingDL") {
                state = "checking";
            }
        }
    }
    return 'images/skin/' + state + '.png';
};

filter = getLocalStorageItem('selected_filter', 'all');

var loadTorrentsInfoTimer;
var loadTorrentsInfo = function () {
    var queueing_enabled = false;
    var url = new URI('json/torrents');
    url.setData('filter', filter);
    url.setData('sort', myTable.table.sortedColumn);
    url.setData('reverse', myTable.table.reverseSort);
    var request = new Request.JSON({
        url : url,
        noCache : true,
        method : 'get',
        onFailure : function () {
            $('error_div').set('html', '_(qBittorrent client is not reachable)');
            clearTimeout(loadTorrentsInfoTimer);
            loadTorrentsInfoTimer = loadTorrentsInfo.delay(2000);
        },
        onSuccess : function (events) {
            $('error_div').set('html', '');
            if (events) {
                // Add new torrents or update them
                torrent_hashes = myTable.getRowIds();
                events_hashes = new Array();
                pos = 0;
                events.each(function (event) {
                    events_hashes[events_hashes.length] = event.hash;
                    var row = new Array();
                    var data = new Array();
                    row.length = 10;
                    row[0] = stateToImg(event.state);
                    row[1] = event.name;
                    row[2] = event.priority > -1 ? event.priority : null;
                    data[2] = event.priority;
                    row[3] = friendlyUnit(event.size, false);
                    data[3] = event.size;
                    row[4] = (event.progress * 100).round(1);
                    if (row[4] == 100.0 && event.progress != 1.0)
                        row[4] = 99.9;
                    data[4] = event.progress;
                    row[5] = event.num_seeds;
                    if (event.num_complete != -1)
                        row[5] += " (" + event.num_complete + ")";
                    data[5] = event.num_seeds;
                    row[6] = event.num_leechs;
                    if (event.num_incomplete != -1)
                        row[6] += " (" + event.num_incomplete + ")";
                    data[6] = event.num_leechs;
                    row[7] = friendlyUnit(event.dlspeed, true);
                    data[7] = event.dlspeed;
                    row[8] = friendlyUnit(event.upspeed, true);
                    data[8] = event.upspeed;
                    row[9] = friendlyDuration(event.eta);
                    data[9] = event.eta;
                    if (event.ratio == -1)
                        row[10] = "∞";
                    else
                        row[10] = (Math.floor(100 * event.ratio) / 100).toFixed(2); //Don't round up
                    data[10] = event.ratio;
                    if (row[2] != null)
                        queueing_enabled = true;

                    attrs = {};
                    attrs['downloaded'] = (event.progress == 1.0);
                    attrs['state'] = event.state;
                    attrs['seq_dl'] = (event.seq_dl == true);
                    attrs['f_l_piece_prio'] = (event.f_l_piece_prio == true);

                    if (!torrent_hashes.contains(event.hash)) {
                        // New unfinished torrent
                        torrent_hashes[torrent_hashes.length] = event.hash;
                        //alert("Inserting row");
                        myTable.insertRow(event.hash, row, data, attrs, pos);
                    } else {
                        // Update torrent data
                        myTable.updateRow(event.hash, row, data, attrs, pos);
                    }

                    pos++;
                });
                // Remove deleted torrents
                torrent_hashes.each(function (hash) {
                    if (!events_hashes.contains(hash)) {
                        myTable.removeRow(hash);
                    }
                });
                if (queueing_enabled) {
                    $('queueingButtons').removeClass('invisible');
                    $('queueingMenuItems').removeClass('invisible');
                    myTable.showPriority();
                } else {
                    $('queueingButtons').addClass('invisible');
                    $('queueingMenuItems').addClass('invisible');
                    myTable.hidePriority();
                }

                myTable.altRow();
            }
            clearTimeout(loadTorrentsInfoTimer);
            loadTorrentsInfoTimer = loadTorrentsInfo.delay(1500);
        }
    }).send();
};

var updateTransferList = function() {
    clearTimeout(loadTorrentsInfoTimer);
    loadTorrentsInfo();
}

window.addEvent('load', function () {

    var saveColumnSizes = function () {
        var filters_width = $('Filters').getSize().x;
        var properties_height = $('propertiesPanel').getSize().y;
        localStorage.setItem('filters_width', filters_width);
        localStorage.setItem('properties_height', properties_height);
    }

    /*MochaUI.Desktop = new MochaUI.Desktop();
    MochaUI.Desktop.desktop.setStyles({
        'background': '#fff',
        'visibility': 'visible'
    });*/
    MochaUI.Desktop.initialize();

    var filt_w = localStorage.getItem('filters_width');
    if ($defined(filt_w))
        filt_w = filt_w.toInt();
    else
        filt_w = 120;
    new MochaUI.Column({
        id : 'filtersColumn',
        placement : 'left',
        onResize : saveColumnSizes,
        width : filt_w,
        resizeLimit : [100, 300]
    });
    new MochaUI.Column({
        id : 'mainColumn',
        placement : 'main',
        width : null,
        resizeLimit : [100, 300]
    });
    MochaUI.Desktop.setDesktopSize();

    setFilter = function (f) {
        // Visually Select the right filter
        $("all_filter").removeClass("selectedFilter");
        $("downloading_filter").removeClass("selectedFilter");
        $("completed_filter").removeClass("selectedFilter");
        $("paused_filter").removeClass("selectedFilter");
        $("active_filter").removeClass("selectedFilter");
        $("inactive_filter").removeClass("selectedFilter");
        $(f + "_filter").addClass("selectedFilter");
        filter = f;
        localStorage.setItem('selected_filter', f);
        // Reload torrents
        if (typeof myTable.table != 'undefined')
            updateTransferList();
    }

    new MochaUI.Panel({
        id : 'Filters',
        title : 'Panel',
        header : false,
        padding : {
            top : 0,
            right : 0,
            bottom : 0,
            left : 0
        },
        loadMethod : 'xhr',
        contentURL : 'filters.html',
        onContentLoaded : function () {
            setFilter(filter);
        },
        column : 'filtersColumn',
        height : 300
    });
    initializeWindows();

    var speedInTitle = localStorage.getItem('speed_in_browser_title_bar') == "true";
    if (!speedInTitle)
        $('speedInBrowserTitleBarLink').firstChild.style.opacity = '0';

    var loadTransferInfoTimer;
    var loadTransferInfo = function () {
        var url = 'json/transferInfo';
        var request = new Request.JSON({
            url : url,
            noCache : true,
            method : 'get',
            onFailure : function () {
                $('error_div').set('html', '_(qBittorrent client is not reachable)');
                clearTimeout(loadTransferInfoTimer);
                loadTransferInfoTimer = loadTransferInfo.delay(4000);
            },
            onSuccess : function (info) {
                if (info) {
                    $("DlInfos").set('html', "_(D: %1 - T: %2)"
                        .replace("%1", friendlyUnit(info.dl_info_speed, true))
                        .replace("%2", friendlyUnit(info.dl_info_data, false)));
                    $("UpInfos").set('html', "_(U: %1 - T: %2)"
                        .replace("%1", friendlyUnit(info.up_info_speed, true))
                        .replace("%2", friendlyUnit(info.up_info_data, false)));
                    if (speedInTitle)
                        document.title = "_(D:%1 U:%2)".replace("%1", friendlyUnit(info.dl_info_speed, true)).replace("%2", friendlyUnit(info.up_info_speed, true));
                    else
                        document.title = "_(qBittorrent web User Interface)";
                    clearTimeout(loadTransferInfoTimer);
                    loadTransferInfoTimer = loadTransferInfo.delay(3000);
                }
            }
        }).send();
    };

    var updateTransferInfo = function() {
        clearTimeout(loadTransferInfoTimer);
        loadTransferInfo();
    }

    // Start fetching data now
    loadTransferInfo();

    $('DlInfos').addEvent('click', globalDownloadLimitFN);
    $('UpInfos').addEvent('click', globalUploadLimitFN);

    setSortedColumn = function (column) {
        myTable.setSortedColumn(column);
        updateTransferList();
    };

    $('speedInBrowserTitleBarLink').addEvent('click', function(e) {
        speedInTitle = !speedInTitle;
        localStorage.setItem('speed_in_browser_title_bar', speedInTitle.toString());
        if (speedInTitle)
            $('speedInBrowserTitleBarLink').firstChild.style.opacity = '1';
        else
            $('speedInBrowserTitleBarLink').firstChild.style.opacity = '0';
        updateTransferInfo();
    });

    new MochaUI.Panel({
        id : 'transferList',
        title : 'Panel',
        header : false,
        padding : {
            top : 0,
            right : 0,
            bottom : 0,
            left : 0
        },
        loadMethod : 'xhr',
        contentURL : 'transferlist.html',
        onContentLoaded : function () {
            updateTransferList();
        },
        column : 'mainColumn',
        onResize : saveColumnSizes,
        height : null
    });
    var prop_h = localStorage.getItem('properties_height');
    if ($defined(prop_h))
        prop_h = prop_h.toInt();
    else
        prop_h = Window.getSize().y / 2.;
    new MochaUI.Panel({
        id : 'propertiesPanel',
        title : 'Panel',
        header : true,
        padding : {
            top : 0,
            right : 0,
            bottom : 0,
            left : 0
        },
        contentURL : 'properties_content.html',
        require : {
            css : ['css/Tabs.css'],
            js : ['scripts/prop-general.js', 'scripts/prop-trackers.js', 'scripts/prop-files.js'],
        },
        tabsURL : 'properties.html',
        tabsOnload : function() {
            MochaUI.initializeTabs('propertiesTabs');

            updatePropertiesPanel = function() {
                if (!$('prop_general').hasClass('invisible'))
                    updateTorrentData();
                else if (!$('prop_trackers').hasClass('invisible'))
                    updateTrackersData();
                else if (!$('prop_files').hasClass('invisible'))
                    updateTorrentFilesData();
            }

            $('PropGeneralLink').addEvent('click', function(e){
                $('prop_general').removeClass("invisible");
                $('prop_trackers').addClass("invisible");
                $('prop_files').addClass("invisible");
                updatePropertiesPanel();
            });

            $('PropTrackersLink').addEvent('click', function(e){
                $('prop_trackers').removeClass("invisible");
                $('prop_general').addClass("invisible");
                $('prop_files').addClass("invisible");
                updatePropertiesPanel();
            });

            $('PropFilesLink').addEvent('click', function(e){
                $('prop_files').removeClass("invisible");
                $('prop_general').addClass("invisible");
                $('prop_trackers').addClass("invisible");
                updatePropertiesPanel();
            });
        },
        column : 'mainColumn',
        height : prop_h
    });
});

function closeWindows() {
    MochaUI.closeAll();
}

window.addEvent('keydown', function (event) {
    if (event.key == 'a' && event.control) {
        event.stop();
        myTable.selectAll();
    }
});
