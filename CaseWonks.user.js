// ==UserScript==
// @name         CaseWonks
// @namespace    http://tampermonkey.net/
// @version      0.0.02
// @description  Make CaseWorks less miserable to use.
// @author       Worker McWorkerface
// @match        https://*.caseworkscloud.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=caseworkscloud.com
// @grant        none
// ==/UserScript==

const iFramed = window.location !== window.parent.location; if (iFramed || (window.location.href.slice(-4) === ".txt") ) { return };
const mainBody = window.parent.document.body, thisPageName = window.location.pathname.replaceAll("%20", ""), contentBox = mainBody.querySelector('#contentBox')
const page = new Map([
    ['/CWRF/Home.aspx', { alias: 'Home', tableLoc: document.querySelector('div.ms-webpart-zone.ms-fullWidth:has(#divAPNMain)') }],
    ['/CWRF/CaseFile.aspx', { alias: 'CaseFile', tableLoc: document.querySelector('#DPC table table.ms-listviewtable') }],
    ['/CWRF/DocumentDiscovery.aspx', { alias: 'DocDisc' }],
    ['/CWRF/WorkingDocuments.aspx', { alias: 'WorkDocs' }],
    ['/_layouts/15/NCT.Scan/Scan.aspx', { alias: 'DocProps' }]
]).get(thisPageName) ?? {}

let tbodLoadedEles = () => Array.from(page.tableLoc?.querySelectorAll('tbody[id^=tbod]')).filter(ele => ele.getAttribute('isloaded') === "true");
class TrackedMutationObserver extends MutationObserver { // https://stackoverflow.com/questions/63488834/how-to-get-all-active-mutation-observers-on-page //
    static instances = []
    constructor(...args) { super(...args); };
    observe(...args) {
        super.observe(...args);
        this.constructor.instances.push(this)
    };
    disconnect() {
        super.disconnect();
        this.constructor.instances = this.constructor.instances.filter(instance => instance !== this);
    };
    static getActive() { return this.instances };
};

!function addCustomNavElements() {
    if (!mainBody.querySelector('#RibbonContainer')) { return };
    let navContainer = mainBody.insertAdjacentElement( 'afterbegin', createNewEle('div', { id: "caseWonksNavBar", style: "line-height: 26px; display: flex; gap: 20px; align-items: center; position: fixed; left: 250px; top: 4px; z-index: 999;", }) )
    !function mainPageLink() { navContainer.appendChild( createNewEle('a', { textContent: "Main Page", classList: "ms-pivotControl-surfacedOpt-selected", style: "font-size: 14px;", onclick: ()=>{ window.open("https://fsestlouis.caseworkscloud.com/", "_self") } }) ) }();
    !function addNewTabField() {
        let caseDocsNewTabField = navContainer.appendChild( createNewEle('input', { id: "newTabField", autocomplete:"off", classList: "form-control", placeholder: "Case #", pattern: "^\\d{1,8}$", style: "width: 15ch; line-height: inherit; padding: 0 5px", }) );
        caseDocsNewTabField.addEventListener('keydown', keydownEvent => {
            if (keydownEvent.key !== "Enter") { return };
            navToCaseDocs(keydownEvent.target.value)
            keydownEvent.target.value = ""
        });
        function navToCaseDocs(caseNumber) {
            window.open("/CWRF/Case%20File.aspx?SystemRecordID=" + caseNumber + "&SOR=MAXIS", "_blank")
        };
    }();
    !function buttonsToForceNotif() {
        let forceButton = navContainer.appendChild( createNewEle('button', { textContent: "Force Cleanup", style: "line-height: inherit; padding: 0 5px;", }) );
        forceButton.addEventListener('click', () => { tbodLoadedEles().forEach(tbod => { removeNotificationFromNames(tbod) }) })
    }();
}();
!function fixPageHeader() {
    let caseIdNameNeighbor = mainBody.querySelector('#CaseFileHeaderStatus'), caseIdNameEle = caseIdNameNeighbor?.previousElementSibling; if (!caseIdNameEle) { return };
    let caseIdName = caseIdNameEle.textContent.match(/(?<caseNum>\d{8}) (?<caseName>[A-Z-,' ]+) \w?$/i).groups
    document.querySelector('title').textContent = caseIdName.caseName + " - " + parseInt(caseIdName.caseNum, 10)
}();
// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓
// ///////////////////////////////////////////////////////////////////////////// FUNCTION_LIBRARY SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

// if (pageAlias === "Home") { change JS link to html link }
const modifiedTables = []
async function removeNotificationFromNames(tableEle) {
    if ( modifiedTables.includes(tableEle) ) { return };
    tableEle = await waitForTableCells(tableEle)
    Array.from(tableEle.querySelectorAll('tr'), (tr) => {
        let [,,, title, name,,,,, link ] = tr.children
        if (title.textContent.indexOf("Notif") === 0) {
            let newText = title.textContent.slice(15)
            title.textContent = newText
            name.querySelector('a').textContent = "view_item"
            // name.querySelector('a').textContent = newText
            if (page.alias === "Home") {
                link.children[0].href = "/CWRF/Case%20File.aspx?SystemRecordID=" + link.children[0].textContent + "&SOR=MAXIS"
                link.children[0].target = "_blank"
            }
        };
        modifiedTables.push(tableEle)
    });
};
!function removeNotificationsAsLoaded() {
    if (!'tableLoc' in page || !page.tableLoc) { return };
    tbodLoadedEles()?.forEach(tbod => { removeNotificationFromNames(tbod) })
    const observer = new TrackedMutationObserver(mutations => {
        tbodLoadedEles().forEach(tbod => { removeNotificationFromNames(tbod) })
    });
    observer.observe(page.tableLoc, { childList: true, subtree: true })
}();
// removeNotificationsAsLoaded(false);
function createNewEle(nodeName, attribObj={}, dataObj={}) {
    let newEle = Object.assign(document.createElement(nodeName), attribObj);
    Object.entries(dataObj)?.forEach(([dataName, dataValue] = []) => { newEle.dataset[dataName] = dataValue })
    return newEle;
};
function verbose() { console.info( ...arguments, "  (Verbose line: " + (Number((new Error).stack.split('\n').toReversed()[0].split(':').toReversed()[1])-1) + ")" ) }; // Edge version //

async function waitForTableCells(awaitedTable) {
    return new Promise((resolve, reject) => {
        if ( awaitedTable?.querySelector('tr > td:nth-child(2)') ) {
            resolve( awaitedTable ) }
        else {
            const observer = new MutationObserver(() => {
                if (awaitedTable?.querySelector('tr > td:nth-child(2)')) {
                    observer.disconnect();
                    resolve( awaitedTable );
                };
            });
            observer.observe(awaitedTable, { childList: true, subtree: true, });
        };
    });
};
// function waitForTable(awaitedTableIn) {
//     let defaultStr = 'tbody[id^=tbod]'
//     const awaitedTableLocate = () => (typeof awaitedTableIn === "string") ? document.querySelector(awaitedTableIn) : awaitedTableIn instanceof HTMLElement ? awaitedTableIn : document.querySelector(defaultStr)
//     return new Promise((resolve, reject) => {
//         let awaitedTable = awaitedTableLocate()
//         if ( awaitedTable) {
//             resolve( awaitedTable ) }
//         else {
//             const observer = new MutationObserver(mutations => { if (awaitedTable) {
//                 observer.disconnect(); resolve( awaitedTable ); } });
//             observer.observe(contentBox, { childList: true, subtree: true, });
//         };
//     });
// };

// https://fsestlouis.caseworkscloud.com/_layouts/15/NCT.Scan/Scan.aspx
// document.querySelector('td.titleCell[internalname="P"]').textContent = "Priority flag"
// document.querySelectorAll('table[id^=onetidDoclibViewTbl] > tbody[id^=tbod]')

// document.querySelector('#scriptWPQ1 table:has(thead) > tbody') // table on subscriptions page - get count.

// Subscriptions page, changing names to Last, First: Problematic, as there doesn't seem to be a way to do it programatically. Seems to require a mouse click, but mouseclick loads the 'edit only this entry' page. That page could be changed programatically, but would be slow.
// There's a hidden input element, #jsgrid_editboxspgridcontainer_WPQ1, that might need an event. But the page probably won't change the target of that input without a user click.

