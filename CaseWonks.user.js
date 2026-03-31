// ==UserScript==
// @name         CaseWonks
// @namespace    http://tampermonkey.net/
// @version      0.0.03
// @description  Make CaseWorks less miserable to use.
// @author       Worker McWorkerface
// @match        https://*.caseworkscloud.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=caseworkscloud.com
// @grant        none
// ==/UserScript==

const iFramed = window.location !== window.parent.location; if (iFramed || (window.location.href.slice(-4) === ".txt") ) { return };
const mainBody = window.parent.document.body, thisPageName = window.location.pathname.replaceAll("%20", "")
const page = new Map([
    ['/CWRF/Home.aspx', { alias: 'Home', tableLoc: mainBody.querySelector('div.ms-webpart-zone.ms-fullWidth:has(#divAPNMain)') }],
    ['/CWRF/CaseFile.aspx', { alias: 'CaseFile', tableLoc: mainBody.querySelector('#DPC table table.ms-listviewtable') }],
    ['/CWRF/DocumentDiscovery.aspx', { alias: 'DocDisc', tableLoc: mainBody.querySelector('table[summary="Document Processing Center"]') }],
    ['/CWRF/WorkingDocuments.aspx', { alias: 'WorkDocs' }],
    ['/_layouts/15/NCT.Scan/Scan.aspx', { alias: 'DocProps' }]
]).get(thisPageName) ?? {}
mainBody.classList.add(page.alias)
const modifiedTables = [];
const titleSwaps = [
    ["Notification - ", ""],
    ["(Minnesota )?Child Care Assistance( Program)?", "CCAP"],
    // [],
    // [],
    // [],
    // [],
];

let tbodLoadedEles = () => ["DocDisc"].includes(page.alias) ? [ page.tableLoc.querySelector('tbody') ] : Array.from(page.tableLoc?.querySelectorAll('tbody[id^=tbod]')).filter(ele => ele.getAttribute('isloaded') === "true")
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
    !function mainPageLink() { navContainer.appendChild( createNewEle('a', { textContent: "Home Page", classList: "ms-pivotControl-surfacedOpt-selected", style: "font-size: 14px;", onclick: ()=>{ window.open("https://fsestlouis.caseworkscloud.com/", "_self") } }) ) }();
    !function addNewTabField() {
        let caseDocsNewTabField = createNewEle('input', { id: "newTabField", autocomplete:"off", classList: "form-control", placeholder: "Case #", pattern: "^\\d{1,10}$", style: "width: 15ch; line-height: inherit; padding: 0 5px", })
        let caseDocsNewTabButton = createNewEle('button', { textContent: "GO", style: "line-height: inherit; padding: 0 8px; margin-left: -10px; min-width: unset; font-size: 10px", })
        navContainer.append(caseDocsNewTabField, caseDocsNewTabButton)
        caseDocsNewTabField.addEventListener('keydown', keydownEvent => { keydownEvent.key === "Enter" && navToCaseDocs() });
        caseDocsNewTabButton.addEventListener('click', navToCaseDocs);
        function navToCaseDocs() {
            if (!caseDocsNewTabField.value || !(/^\d{1,10}/).test(caseDocsNewTabField.value)) { return };
            window.open("/CWRF/Case%20File.aspx?SystemRecordID=" + caseDocsNewTabField.value + "&SOR=MAXIS", "_blank")
            caseDocsNewTabField.value = ""
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
async function removeNotificationFromNames(tableEle) {
    if ( modifiedTables.includes(tableEle) ) { return };
    tableEle = await waitForTableCells(tableEle)
    let title, name, uselessMenu, firstName, lastName, shortNote, caseLink, caseWorker
    Array.from(tableEle.querySelectorAll('tr'), (tr) => {
        if (["Home", "CaseFile"].includes(page.alias)) { [,,, title, name, uselessMenu, firstName, lastName, shortNote, caseLink ] = tr.children };
        if (["DocDisc"].includes(page.alias)) { [,, title, name, firstName, lastName, caseWorker, shortNote, caseLink ] = tr.children };

        if (["DocDisc"].includes(page.alias)) {
            if (name.textContent.indexOf("Notif") === 0) { tr.remove(); return; }
        };
        if (caseLink?.children?.length) {
            let newLink = createNewEle('a', { textContent: caseLink.textContent, href: "#" })
            caseLink.replaceChildren(newLink)
            newLink.addEventListener('click', () => openCaseInNewTab(newLink.textContent, "_self"));
            newLink.addEventListener('contextmenu', contextmenuEvent => {
                if (contextmenuEvent.target !== newLink) { return };
                contextmenuEvent.preventDefault(); contextmenuEvent.stopPropagation(); contextmenuEvent.stopImmediatePropagation();
                openCaseInNewTab(newLink.textContent, "_blank")
            });
        };
        name.querySelector('a').textContent = "(view_item)"
        titleSwaps.forEach( ([regX, swap]) => { title.textContent = title.textContent.replace(new RegExp(regX, "i"), swap) })
        modifiedTables.push(tableEle)
    });
};
function openCaseInNewTab(caseNumNewTab, target) {
    navigator.clipboard.writeText(caseNumNewTab)
    window.open("/CWRF/Case%20File.aspx?SystemRecordID=" + caseNumNewTab + "&SOR=MAXIS#DPC", target)
};
!function removeNotificationsAsLoaded() {
    if (!'tableLoc' in page || !page.tableLoc) { return };
    tbodLoadedEles()?.forEach(tbod => { removeNotificationFromNames(tbod) })
    const observer = new TrackedMutationObserver(mutations => { tbodLoadedEles()?.forEach(tbod => { removeNotificationFromNames(tbod) }) });
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
//             observer.observe(mainBody.querySelector('#contentBox'), { childList: true, subtree: true, });
//         };
//     });
// };

// https://fsestlouis.caseworkscloud.com/_layouts/15/NCT.Scan/Scan.aspx
// document.querySelector('td.titleCell[internalname="P"]').textContent = "Priority flag"
// document.querySelectorAll('table[id^=onetidDoclibViewTbl] > tbody[id^=tbod]')

// document.querySelector('#scriptWPQ1 table:has(thead) > tbody') // table on subscriptions page - get count.

// Subscriptions page, changing names to Last, First: Problematic, as there doesn't seem to be a way to do it programatically. Seems to require a mouse click, but mouseclick loads the 'edit only this entry' page. That page could be changed programatically, but would be slow.
// There's a hidden input element, #jsgrid_editboxspgridcontainer_WPQ1, that might need an event. But the page probably won't change the target of that input without a user click.

