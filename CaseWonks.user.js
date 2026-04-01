// ==UserScript==
// @name         CaseWonks
// @namespace    http://tampermonkey.net/
// @version      0.0.04
// @description  Make CaseWorks less miserable to use.
// @author       Worker McWorkerface
// @match        https://*.caseworkscloud.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=caseworkscloud.com
// @grant        none
// ==/UserScript==

const iFramed = window.location !== window.parent.location; if (iFramed || (window.location.href.slice(-4) === ".txt") ) { return };
const mainBody = window.parent.document.body, thisPageName = window.location.pathname.split("/").reverse()[0].replaceAll("%20", "") //thisPageName = window.location.pathname.replaceAll("%20", "")
const page = new Map([
    ['Home.aspx', { alias: 'Home', tableLoc: mainBody.querySelector('div.ms-webpart-zone.ms-fullWidth:has(#divAPNMain)') }],
    ['CaseFile.aspx', { alias: 'CaseFile', tableLoc: mainBody.querySelector('#DPC table table.ms-listviewtable') }],
    ['DocumentDiscovery.aspx', { alias: 'DocDisc', tableLoc: mainBody.querySelector('table[summary="Document Processing Center"]'), }],
    ['AllItems.aspx', { alias: 'AllItems', tableLoc: mainBody.querySelector('td#scriptWPQ1 > table[summary="Document Processing Center"]'), singleTable: 1, }],
    ['AllDPCDocuments.aspx', { alias: 'AllDpcDocs', tableLoc: mainBody.querySelector('td#scriptWPQ1 > table[summary="Document Processing Center"]'), singleTable: 1, }],
    ['WorkingDocuments.aspx', { alias: 'WorkingDocs', tableLoc: mainBody.querySelector('td#scriptWPQ1 > table[summary="Document Processing Center"]'), singleTable: 1, }],
    ['eSignDocuments.aspx', { alias: 'eSign', tableLoc: mainBody.querySelector('td#scriptWPQ2 > table[summary="Document Processing Center"]'), singleTable: 1, }],
    ['PendingStatus.aspx', { alias: 'Pending', tableLoc: mainBody.querySelector('td#scriptWPQ2 > table[summary="Document Processing Center"]'), singleTable: 1, }],
    ['DocBox.aspx', { alias: 'DocBox', tableLoc: mainBody.querySelector('td#scriptWPQ2 > table[summary="Document Processing Center"]'), singleTable: 1, }],
    ['PersonalViews.aspx', { alias: 'Subs' }],
    ['Subscriptions.aspx', { alias: 'Subs' }],
    ['Scan.aspx', { alias: 'DocProps' }],
]).get(thisPageName) ?? { alias: 'general' };
mainBody.classList.add(page.alias, 'CaseWonks')
const modifiedTables = [];
const titleSwaps = [ // escapes need double slash //
    ["Notification - ", ""],
    ["DHS3550 Minnesota Child Care Assistance Program Application", "CCAP Application"],
    ["(Minnesota )?Child Care Assistance( Program)?", "CCAP"],
    ["DHS5223 Combined Application Form \\(CAF\\)", "Combined Application"],
    // ["", ""],
    // ["", ""],
    // ["", ""],
];

!function addCustomTableRules() {
    return;
    const tableRules = {
        uselessMenu: ''
    };
    const customTableRules = new Map([
        ["CaseFile", 'table[summary="Document Processing Center"] {} table[summary="FSE Electronic File Cabinet"] {}']
    ]).get(page.alias);
    if (!customTableRules) { return };
    document.head.append(createNewEle( 'style', { type: 'text/css', textContent: customTableRules } ))
}();
let tbodLoadedEles = () => page.singleTable ? [ page.tableLoc.querySelector('tbody') ]
: page.alias === "DocDisc" ? Array.from(document.querySelector('#MSOZoneCell_WebPartWPQ4').parentElement.querySelectorAll('table  table tbody tbody'))
: Array.from(page.tableLoc?.querySelectorAll('tbody[id^=tbod]')).filter(ele => ele.getAttribute('isloaded') === "true")

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
            openCaseFile(caseDocsNewTabField.value, "_blank")
            caseDocsNewTabField.value = ""
        };
    }();
    // !function buttonsToForceNotif() {
    //     let forceButton = navContainer.appendChild( createNewEle('button', { textContent: "Force Cleanup", style: "line-height: inherit; padding: 0 5px;", }) );
    //     forceButton.addEventListener('click', () => { tbodLoadedEles().forEach(tbod => { removeNotificationFromNames(tbod) }) })
    // }();
}();
!function fixPageHeader() {
    let caseIdNameNeighbor = mainBody.querySelector('#CaseFileHeaderStatus'), caseIdNameEle = caseIdNameNeighbor?.previousElementSibling; if (!caseIdNameEle) { return };
    let caseIdName = caseIdNameEle.textContent.match(/(?<caseNum>\d{8}) (?<caseName>[A-Z-,' ]+) \w?$/i).groups
    document.querySelector('title').textContent = caseIdName.caseName + " - " + parseInt(caseIdName.caseNum, 10)
}();
!function CaseFile() {
    if (page.alias !== "CaseFile") { return };
    document.querySelector('li[aria-controls="DPC"]').click()
}();
!function DocDisc() {
    if (page.alias !== "DocDisc") { return };
    document.querySelector('#MSOZoneCell_WebPartWPQ4').style.display = "inline-table"
}();
!async function Subs() {
    if (page.alias !== "Subs") { return };
    let caseListTable = await waitForTableCells(document.querySelector('#scriptWPQ1'))
    let caseList = Array.from(caseListTable.querySelectorAll('tbody tr td:nth-child(5)'), td => td?.textContent)
    const uniques = new Set();
    const duplicates = caseList.filter(item => {
        if (uniques.has(item)) { return item };
        uniques.add(item);
        return false;
    });
    document.getElementById('caseWonksNavBar').append( createNewEle('div', { textContent: "Duplicates: " + duplicates.join(', ') }), createNewEle('div', { textContent: "Unique case count: " + uniques.size }) )
}();

// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓
// ///////////////////////////////////////////////////////////////////////////// FUNCTION_LIBRARY SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

// if (pageAlias === "Home") { change JS link to html link }
async function removeNotificationFromNames(tableEle) {
    if ( modifiedTables.includes(tableEle) ) { return };
    tableEle = await waitForTableCells(tableEle)
    let title, name, uselessMenu, firstName, lastName, shortNote, caseLink, docBox
    let sortedByCaseNum = tableEle.closest('table')?.querySelector('.ms-headerSortTitleLink:has(+span:not([style="display: none;"]))')?.textContent === "MAXIS"
    const tableEleTrs = Array.from(tableEle.querySelectorAll('tr'))
    let lastCaseNum = ""
    tableEleTrs.forEach(tr => {
        if (["Home", "CaseFile"].includes(page.alias)) { [,,, title, name, uselessMenu, firstName, lastName, shortNote, caseLink ] = tr.children };
        if (["eSign"].includes(page.alias)) { [,,, title, name, uselessMenu, firstName, lastName,, shortNote, caseLink ] = tr.children };
        if (["AllItems", "Pending", "WorkingDocs", "DocBox"].includes(page.alias)) { [,,,, title, name, uselessMenu, firstName, lastName, shortNote, caseLink ] = tr.children };
        if (["AllDpcDocs"].includes(page.alias)) { [,,,, title, name, uselessMenu, firstName, lastName,, shortNote, caseLink ] = tr.children };
        if (["DocDisc"].includes(page.alias)) { [,, title, name,, firstName, lastName, docBox, shortNote, caseLink ] = tr.children };

        !function groupByCaseNumberIfSorted() {
            if (!sortedByCaseNum) { return };
            switch(lastCaseNum) {
                case "": { lastCaseNum = caseLink?.textContent; break; }
                case caseLink?.textContent: { break; }
                default: { tr.classList.add('tdBorderTop'); lastCaseNum = caseLink?.textContent; break; }
            };
        }();

        if (["DocDisc"].includes(page.alias)) {
            if (name.textContent.indexOf("Notif") === 0) { tr.remove(); return; }
        };
        if (!["CaseFile"].includes(page.alias) && (/^\d{1,10}$/).test(caseLink.textContent.trim()) ) {
            let newLink = createNewEle('a', { textContent: caseLink.textContent, href: "#" })
            caseLink.replaceChildren(newLink)
            newLink.addEventListener('click', () => openCaseFile(newLink.textContent, "_self"));
            newLink.addEventListener('contextmenu', contextmenuEvent => {
                if (contextmenuEvent.target !== newLink) { return };
                contextmenuEvent.preventDefault(); contextmenuEvent.stopPropagation(); contextmenuEvent.stopImmediatePropagation();
                openCaseFile(newLink.textContent, "_blank")
            });
        };
        name.querySelector('a').textContent = "(view_item)"
        titleSwaps.forEach( ([regX, swap]) => { title.textContent = title.textContent.replace(new RegExp(regX, "i"), swap) });
        modifiedTables.push(tableEle)
    });
};
function openCaseFile(caseNumOpenFile, target) {
    caseNumOpenFile = caseNumOpenFile.trim()
    if (!caseNumOpenFile || !(/^\d{1,10}$/).test(caseNumOpenFile)) { return };
    navigator.clipboard.writeText(caseNumOpenFile)
    window.open("/CWRF/Case%20File.aspx?SystemRecordID=" + caseNumOpenFile + "&SOR=MAXIS", target)
};
!function removeNotificationsAsLoaded() {
    if (!'tableLoc' in page || !page.tableLoc) { return };
    tbodLoadedEles()?.forEach(tbod => { removeNotificationFromNames(tbod) })
    const observer = new MutationObserver(mutations => { tbodLoadedEles()?.forEach(tbod => { removeNotificationFromNames(tbod) }) });
    observer.observe(page.tableLoc, { childList: true, subtree: true })
}();
function createNewEle(nodeName, attribObj={}, dataObj={}) {
    let newEle = Object.assign(document.createElement(nodeName), attribObj);
    Object.entries(dataObj)?.forEach(([dataName, dataValue] = []) => { newEle.dataset[dataName] = dataValue });
    return newEle;
};
function verbose() { console.info( ...arguments, "  (Verbose line: " + (Number((new Error).stack.split('\n').toReversed()[0].split(':').toReversed()[1])-1) + ")" ) }; // Edge version //

async function waitForTableCells(awaitedTable) {
    return new Promise((resolve, reject) => {
        if ( awaitedTable?.querySelector('tr > td:nth-child(2)') ) { resolve( awaitedTable ) }
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

// class TrackedMutationObserver extends MutationObserver { // https://stackoverflow.com/questions/63488834/how-to-get-all-active-mutation-observers-on-page //
//     static instances = []
//     constructor(...args) { super(...args); };
//     observe(...args) {
//         super.observe(...args);
//         this.constructor.instances.push(this)
//     };
//     disconnect() {
//         super.disconnect();
//         this.constructor.instances = this.constructor.instances.filter(instance => instance !== this);
//     };
//     static getActive() { return this.instances };
// };
// https://fsestlouis.caseworkscloud.com/_layouts/15/NCT.Scan/Scan.aspx
// document.querySelector('td.titleCell[internalname="P"]').textContent = "Priority flag"
// document.querySelectorAll('table[id^=onetidDoclibViewTbl] > tbody[id^=tbod]')

// document.querySelector('#scriptWPQ1 table:has(thead) > tbody') // table on subscriptions page - get count.

// Subscriptions page, changing names to Last, First: Problematic, as there doesn't seem to be a way to do it programatically. Seems to require a mouse click, but mouseclick loads the 'edit only this entry' page. That page could be changed programatically, but would be slow.
// There's a hidden input element, #jsgrid_editboxspgridcontainer_WPQ1, that might need an event. But the page probably won't change the target of that input without a user click.

