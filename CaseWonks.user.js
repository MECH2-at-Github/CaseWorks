// ==UserScript==
// @name         CaseWonks
// @namespace    http://tampermonkey.net/
// @version      0.0.06
// @description  Make CaseWorks less miserable to use.
// @author       Worker McWorkerface
// @match        https://*.caseworkscloud.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=caseworkscloud.com
// @grant        none
// ==/UserScript==

console.time('CaseWonks load time')
const iFramed = window.location !== window.parent.location; if (iFramed || (window.location.href.slice(-4) === ".txt") ) { return };
const mainBody = window.parent.document.body, thisPageName = window.location.pathname.split("/")?.reverse()[0].replaceAll("%20", ""), editionLocation = document.querySelector('#zz7_TopNavigationMenu .menu-item-text')?.textContent?.toLowerCase().replace(/\W/g, '') ?? "fsestlouis",
      ribbon = document.getElementById('RibbonContainer')
const page = new Map([
    ['Home.aspx', { alias: 'Home', primaryTableLoc: 'div.ms-webpart-zone.ms-fullWidth:has(#divAPNMain)' }],
    ['CaseFile.aspx', { alias: 'CaseFile', primaryTableLoc: '#DPC table table.ms-listviewtable', secondaryTableLoc: '#scriptWPQ7' }],
    ['DocumentDiscovery.aspx', { alias: 'DocDisc', primaryTableLoc: 'table[summary="Document Processing Center"]', }],
    ['AllItems.aspx', { alias: 'AllItems', primaryTableLoc: 'td#scriptWPQ1 > table[summary="Document Processing Center"]', singleTable: 1, }],
    ['AllDPCDocuments.aspx', { alias: 'AllDpcDocs', primaryTableLoc: 'td#scriptWPQ1 > table[summary="Document Processing Center"]', singleTable: 1, }],
    ['WorkingDocuments.aspx', { alias: 'WorkingDocs', primaryTableLoc: 'td#scriptWPQ1 > table[summary="Document Processing Center"]', singleTable: 1, }],
    ['eSignDocuments.aspx', { alias: 'eSign', primaryTableLoc: 'td#scriptWPQ2 > table[summary="Document Processing Center"]', singleTable: 1, }],
    ['PendingStatus.aspx', { alias: 'Pending', primaryTableLoc: 'td#scriptWPQ2 > table[summary="Document Processing Center"]', singleTable: 1, }],
    ['DocBox.aspx', { alias: 'DocBox', primaryTableLoc: 'td#scriptWPQ2 > table[summary="Document Processing Center"]', singleTable: 1, }],
    ['PersonalViews.aspx', { alias: 'Subs', primaryTableLoc: 'div#WebPartWPQ1', singleTable: 1 }],
    ['Subscriptions.aspx', { alias: 'Subs', primaryTableLoc: 'div#WebPartWPQ1', singleTable: 1 }],
    ['Scan.aspx', { alias: 'DocProps' }],
    // ['', { alias: '', }],
]).get(thisPageName) ?? { alias: 'general' };
const tableLocQuery = (loc) => mainBody.querySelector(page[loc])
mainBody.classList.add(page.alias, 'CaseWonks')
const modifiedTables = [];
const titleSwaps = [ // escapes need double slash //
    ["Notification - Merge For Mailing \\(Delete after Mailing or Printing\\)", "Merge for Mail (Delete)"],
    ["Notification - ", ""],
    ["^FSE[0-9]{1,3}[A-Z]? ", ""],
    ["^EA[0-9]{1,3}[A-Z]? ", ""],
    ["^DHS[0-9]{1,6}[A-Z]? ", ""],
    ["^SLF[0-9]{1,3} ", ""],
    ["^D[0-9]{3} ", ""],
    ["(Minnesota )?Child Care Assistance( Program)?( \\(CCAP\\))?", "CCAP"],
    ["Basic Sliding Fee( \\(BSF\\))?", "BSF"],
    ["Redetermination Form", "Redetermination"],
    ["Combined Application Form \\(CAF\\)", "Combined Application"],
    ["Other Residence", "Residence"],
    ["Minnesota Family Investment Program \\(MFIP\\)", "MFIP"],
    ["MFIP\\/DWP Employment Services Child Care Request", "ES to CCAP 7054"],
    ["Authorization for Release of Information About Residence and Shelter Expenses", "RoI Auth: Residence\/Shelter Expenses"],
    ["Drivers License \\(DL\\) - State ID", "State ID"],
    ["Miscellaneous Correspondence \\(MC\\)", "Misc\. Correspondence"],
    ["Cooperation with Child Support Enforcement", "CS Good Cause"],
    ["Referral to Support and Collections", "CS Referral"],
    ["Signed Personal Statement about Assets for MFIP,DWP,GA,MSA, and GRH Programs", "Assets Statement"],
    ["Electronic Funds Transfer", "EFT"],
    ["Authorization for Release of Employment Information", "RoI Auth: Employment"],
    ["SLC CCAP Education Plan 9\\.24", "CCAP Education Plan"],
    [`Portal400 General Proof of Residency "Utility Bills, Rent, Lease Agreement, Eviction Notice, Home-Owner's Insurance, etc."`, "Portal doc: Residency"],
    // ["", ""],
    // ["", ""],
    ["\\([A-Z]+\\)$", ""],
];
const taxonomySwaps = new Map([
    ["1.1", "1.1: Identity"],
    ["1.32", "1.32: Fraud"],
    ["1.4", "1.4: IM App"],
    ["1.5", "1.5: Income"],
    ["1.6", "1.6: Assets"],
    ["1.7", "1.7: Residency"],
    ["1.8", "1.8: IM Comm"],
    ["1.81", "1.81: CS"],
    ["5.3", "5.3: CCAP App"],
    ["5.4", "5.4: CCAP Activity"],
    // ["", ""],
    // ["", ""],
]);
const theadSwaps = new Map([
    ["Title", "Document Type"],
    ["Reviewed", "Rev"],
    ["First Name", "First"],
    ["Last Name", "Last"],
    ["Short Note/Next Step", "Short Note"],
    ["Pend Date", "Pend"],
    ["Pending Status", "Status"],
    ["Name", "Link"],
    ["Date Received", "Received"],
    ["Created By", "Creator"],
    ["Confirmation Number", "Confirmation"],
    ["Integrated Case", "IntCase#"],
    // ["", ""],
    // ["", ""],
    // ["", ""],
])

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
function tbodLoadedEles() {
    let tbodArray = page.singleTable ? [ tableLocQuery('primaryTableLoc').querySelector('tbody') ]
    : page.alias === "DocDisc" ? Array.from(document.querySelector('#MSOZoneCell_WebPartWPQ4').parentElement.querySelectorAll('table  table tbody tbody'))
    : Array.from(tableLocQuery('primaryTableLoc')?.querySelectorAll('tbody[id^=tbod]'))?.filter(ele => ele.getAttribute('isloaded') === "true")
    return tbodArray;
};
function tbodLoadedElesSecondary() {
	if (!'secondaryTableLoc' in page) { return };
	let secondaryTablesArea = tableLocQuery('secondaryTableLoc')
    return Array.from(secondaryTablesArea?.querySelectorAll('tbody[id^=tbod]'))?.filter(ele => ele.getAttribute('isloaded') === "true");
};

!function addCustomNavElements() {
    if (!mainBody.querySelector('#RibbonContainer')) { return };
    let navContainer = mainBody.insertAdjacentElement( 'afterbegin', createNewEle('div', { id: "caseWonksNavBar", style: "line-height: 26px; display: flex; gap: 20px; align-items: center; position: fixed; left: 250px; top: 4px; z-index: 999;", }) )
    !function mainPageLink() {
        // let homePageLink = navContainer.appendChild( createNewEle('a', { textContent: "Home Page", classList: "ms-pivotControl-surfacedOpt-selected", style: "font-size: 14px;", onclick: ()=>{ window.open("https://fsestlouis.caseworkscloud.com/", "_self") } }) )
        let homePageLink = navContainer.appendChild( createNewEle('a', { textContent: "Home Page", classList: "ms-pivotControl-surfacedOpt-selected", style: "font-size: 14px;", }) )
        homePageLink.addEventListener('click', () => { window.open("https://" + editionLocation + ".caseworkscloud.com/", "_self") });
        homePageLink.addEventListener('contextmenu', contextmenuEvent => { contextmenuEvent.preventDefault(); window.open("https://" + editionLocation + ".caseworkscloud.com/", "_blank"); });
    }();
    !function addNewTabField() {
        let caseDocsNewTabField = createNewEle('input', { id: "newTabField", autocomplete:"off", classList: "form-control", placeholder: "Case #", pattern: "^\\d{1,10}$", style: "width: 15ch; line-height: inherit; padding: 0 5px", })
        let caseDocsNewTabButton = createNewEle('button', { textContent: "GO", style: "line-height: inherit; padding: 0 8px; margin-left: -10px; min-width: unset; font-size: 10px", })
        navContainer.append(caseDocsNewTabField, caseDocsNewTabButton)
        caseDocsNewTabField.addEventListener('keydown', keydownEvent => { keydownEvent.key === "Enter" && navToCaseDocs() });
        caseDocsNewTabButton.addEventListener('click', navToCaseDocs);
        function navToCaseDocs() {
            if (!caseDocsNewTabField.value || !(/^\d{1,10}/).test(caseDocsNewTabField.value.trim())) { return };
            openCaseFile(caseDocsNewTabField.value, "_blank")
            caseDocsNewTabField.value = ""
        };
    }();

// Case history in Nav Bar. (Just steal entire code from mec2functions.)

// Link to "All Docs" in Nav Bar? (would need to store the name from the Home Page)
// 	document.querySelector('span[title="My DocBox - Document Processing Center library"] a[title="All Documents - Document Processing Center"]').href.split('/').reverse()[0]

}();
!function fixPageHeader() {
    let caseIdNameNeighbor = mainBody.querySelector('#CaseFileHeaderStatus'), caseIdNameEle = caseIdNameNeighbor?.previousElementSibling; if (!caseIdNameEle) { return };
    let caseIdName = caseIdNameEle.textContent.match(/(?<caseNum>\d{8}) (?<caseName>[A-Z-,' ]+) \w?$/i).groups
    document.querySelector('title').textContent = caseIdName.caseName + " - " + parseInt(caseIdName.caseNum, 10)
}();
!async function AllItems() {
    if (page.alias !== "AllItems") { return };
    let docTableArea = mainBody.querySelector('#scriptWPQ1'), allDocsLink = docTableArea.querySelector('.ms-csrlistview-controldiv > span > a[aria-label="All Documents, View, Selected"]'),
        docTable = await waitForEleWithAncestor('table[summary="Document Processing Center"] > tbody', docTableArea)
    allDocsLink.textContent = allDocsLink.textContent + " (" + docTable.querySelectorAll('tr').length + ")"
}();
!function CaseFile() {
    if (page.alias !== "CaseFile") { return };
    document.querySelector('li[aria-controls="DPC"]').click()
}();
!function DocDisc() {
    if (page.alias !== "DocDisc") { return };
    document.querySelector('#MSOZoneCell_WebPartWPQ4').style.display = "inline-table"
}();

// Scan, Subscription:
// 	Next to DocBox dropdown: Add a button with user's name which onclick changes dropdown to username?

!async function Subs() { // need to add an event for table head click to refresh stuff //
    if (page.alias !== "Subs") { return };
    let caseListTable = await waitForTableCells(document.querySelector('#scriptWPQ1'))
    const [uniques, duplicates] = (function() {
        const uniqueCount = new Set(), caseList = Array.from(caseListTable.querySelectorAll('tbody tr'), tr => { let trChildren = tr?.children; return [trChildren[4]?.textContent, trChildren[5]?.textContent] })
        const duplicateList = caseList.filter(item => {
            if (!item[0]) { return false };
            if (uniqueCount.has(item)) { return item[0] };
            uniqueCount.add(item[0]);
            return false;
        });
        return [uniqueCount, duplicateList]
    })();
    if (duplicates.length === 0) { duplicates.push("None found") }
    let dupeCases = createNewEle('div', { textContent: "Duplicate Cases: " + duplicates.join(', ') }), uniqueCases = createNewEle('div', { textContent: "Unique case count: " + uniques.size })
    document.getElementById('caseWonksNavBar').append( dupeCases, uniqueCases )
}();
// Merge for Mail:
// 	#ribbon > mergeForMailing.click() => observe for window (form[action="/_layouts/15/NCT.Document.Merge/MergeDoumentsPreview.aspx?IsDlg=1"])
// 		Add buttons with stock text to be entered in textarea#InstructionstoClient, such as:
// 			The Referral to Support and Collections form is required to be completed for CCAP eligibility.
// 			The Client Statement of Good Cause form is only required if you wish to make a good cause claim for not cooperating with child support for reasons listed on the form.

// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓
// ///////////////////////////////////////////////////////////////////////////// FUNCTION_LIBRARY SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

const copySymbol = () => createNewEle('span', { textContent: ' ❐', style: 'padding-left: 2px; cursor: pointer;', onclick: function(clickEvent) { clickEvent.preventDefault(); copy(clickEvent.target.previousElementSibling?.textContent); clickEvent.target.style.filter = 'invert(1)'; }, })
let lastCaseNum = ""
async function modifyDocumentTables(tableBody) {
    let sortedByCaseNum = tableBody?.closest('table')?.querySelector('.ms-headerSortTitleLink:has(+span:not([style="display: none;"]))')?.textContent === "MAXIS" ?? false
    tableBody = await waitForTableCells(tableBody)
    if ( modifiedTables.includes(tableBody) ) { return };
    let title, name, uselessMenu, firstName, lastName, shortNote, caseLink, docBox, createdDate, createdBy, receivedDate, taxonomy, modifiedDate, modifiedBy, reviewed
    const tableBodyTrs = Array.from(tableBody.querySelectorAll('tr'), tr => {
        if (tr.querySelector('th')) { return };
        if (["Home", "CaseFile"].includes(page.alias)) { [,,, title, name, uselessMenu, firstName, lastName, shortNote, caseLink, taxonomy, createdDate, receivedDate, createdBy ] = tr.children };
        if (["eSign"].includes(page.alias)) { [,,, title, name, uselessMenu, firstName, lastName,, shortNote, caseLink ] = tr.children };
        if (["AllItems", "Pending", "WorkingDocs", "DocBox"].includes(page.alias)) { [,,, reviewed, title, name, uselessMenu, firstName, lastName, shortNote, caseLink, taxonomy, createdDate, createdBy ] = tr.children };
        if (["AllDpcDocs"].includes(page.alias)) { [,,,, title, name, uselessMenu, firstName, lastName,, shortNote, caseLink ] = tr.children };
        if (["DocDisc"].includes(page.alias)) { [,, title, name,, firstName, lastName, docBox, shortNote, caseLink,,,, taxonomy ] = tr.children };
        if (["Subs"].includes(page.alias)) { [,,,,,, createdDate, modifiedDate, modifiedBy ] = tr.children };

        if (["DocDisc"].includes(page.alias)) {
            removeNotifRow(name, tr)
        };
        if (sortedByCaseNum) { lastCaseNum = groupByCaseNumIfSorted(tableBody, lastCaseNum, caseLink, tr) };
        doModifications(name, createdDate, modifiedDate, taxonomy, createdBy, modifiedBy, shortNote, title, reviewed, caseLink, sortedByCaseNum, receivedDate)
    });
    modifyTableHeaders(tableBody)
    modifiedTables.push(tableBody)
};
async function modifyDocumentTablesSecondary(tableBody) {
    verbose(tableBody)
    tableBody = await waitForTableCells(tableBody)
    if ( modifiedTables.includes(tableBody) ) { return };
    let title, name, uselessMenu, firstName, lastName, shortNote, caseLink, docBox, createdDate, createdBy, receivedDate, taxonomy, modifiedDate, modifiedBy
    const tableBodyTrs = Array.from(tableBody.querySelectorAll('tr'), tr => {
        [,, title, name, uselessMenu, firstName, lastName, shortNote,, createdDate, receivedDate, modifiedDate ] = tr.children
        doModifications(name, createdDate, modifiedDate, shortNote, title)
    });
    modifyTableHeaders(tableBody)
    modifiedTables.push(tableBody)
};
function doModifications(name, createdDate, modifiedDate, taxonomy, createdBy, modifiedBy, shortNote, title, reviewed, caseLink, sortedByCaseNum, receivedDate) {
    modifyReviewed(reviewed)
    modifyBadTitle(title, shortNote)
    modifyTitles(title)
    modifyName(name)
    modifyShortNote(shortNote)
    modifyCaseLink(caseLink, sortedByCaseNum)
    modifyTaxonomy(taxonomy)
    modifyDate(createdDate)
    modifyDate(modifiedDate)
    modifyDate(receivedDate)
    modifyCreatedModifiedBy(createdBy)
    modifyCreatedModifiedBy(modifiedBy)
};
function modifyTableHeaders(tableBody) {
    Array.from(tableBody.closest('table').querySelectorAll('th > div > a'), aEle => { aEle.textContent = theadSwaps.get(aEle.textContent) ?? aEle.textContent });
};
function modifyCreatedModifiedBy(createdModifiedBy) {
    if (!createdModifiedBy) { return };
    let [createdIcon, createdName] = createdModifiedBy.querySelector('span')?.children
    if (!createdName?.textContent) { return };
    createdIcon?.remove()
    createdName.title = createdName.textContent
    createdName.querySelector('a').textContent = createdName.querySelector('a').textContent.split(/[@ ]/)[0]
};
function modifyReviewed(reviewed) {
    if (!reviewed) { return };
    reviewed.textContent = reviewed.textContent === "Yes" ? "☑" : "☒"
};
function modifyTitles(title) {
    if (!title) { return };
    titleSwaps.forEach( ([regX, swap]) => { title.textContent = title.textContent.replace(new RegExp(regX, "i"), swap) });
};
function removeNotifRow(name, tr) {
    if (name.textContent.indexOf("Notif") !== 0) { return };
    tr.remove();
};
function modifyCaseLink(caseLink) {
    if ( !caseLink || ["CaseFile"].includes(page.alias) || !(/^\d{1,10}$/).test(caseLink.textContent.trim()) ) { return };
    let caseNum = caseLink.textContent.trim().split(/^0/).reverse()[0]
    let newLinkTd = createNewEle('td', { role: "gridcell", classList: "ms-cellstyle ms-vb2 ms-noWrap" }), newLinkA = createNewEle('a', { textContent: caseNum, style: "cursor: pointer;" })
    caseLink.replaceWith(newLinkTd)
    newLinkTd.append(newLinkA, copySymbol())
    newLinkA?.addEventListener('click', () => {
        openCaseFile(newLinkA.textContent, "_self") });
    newLinkA?.addEventListener('contextmenu', contextmenuEvent => {
        contextmenuEvent.preventDefault(); contextmenuEvent.stopPropagation(); contextmenuEvent.stopImmediatePropagation();
        openCaseFile(newLinkA.textContent, "_blank")
    });
};
function groupByCaseNumIfSorted(tableBody, lastCaseNum, caseLink, tr) {
    if (!caseLink) { return lastCaseNum };
    switch(lastCaseNum) {
        case "": { lastCaseNum = caseLink?.textContent; break; }
        case caseLink?.textContent: { break; }
        default: { tr.classList.add('tdBorderTop'); lastCaseNum = caseLink?.textContent; break; }
    };
    return lastCaseNum
};
function modifyDate(originalDate) {
    if (!originalDate) { return };
    let dateSpan = originalDate.querySelector('span')
    dateSpan.textContent = originalDate.textContent.split(' ')[0].replace(/\d{2}(\d{2})$/, '$1')
};
function modifyTaxonomy(taxonomy) {
    if (!taxonomy) { return };
    let newTaxonomy = taxonomy.textContent.replace(/^([0-9.]+) ([A-Z]{2,4}) - /g, '$1: $2 ')
    newTaxonomy = getTaxSwap(newTaxonomy.split(':')[0]) ?? newTaxonomy
    taxonomy.textContent = newTaxonomy
};
function getTaxSwap(taxonomyNumber) { return taxonomySwaps.get(taxonomyNumber) ?? undefined };
function modifyName(name) {
    if (!name) { return };
    let nameA = name.querySelector('a')
    let nameNewText = (/^[A-Z]{1,3}[0-9]{3,4}/).test(nameA.textContent) ? nameA.textContent.match(/^[A-Z]{1,3}[0-9]{3,4}[A-Z]? [A-Za-z0-9- ]+__(?<filenum>[0-9]{5,6})_[0-9-]+/)?.groups?.filenum : "item"
    // let nameNewText = (/^[A-Z]{1,3}[0-9]{3,4}/).test(nameA.textContent) ? nameA.textContent.replace(/^(?:[A-Z]{1,3}[0-9]{3,4}[A-Z]? [A-Za-z0-9- ]+__)(<filenum>[0-9]{5,6})(?:_[0-9-]+.[A-Za-z]{3,4})/, '$1') : "item"
    // name.querySelector('a').textContent = "(view_item)"
    nameA.textContent = "(view_" + nameNewText + ")"
};
function modifyShortNote(shortNote) {
    if (!shortNote) { return };
        shortNote.textContent = shortNote.textContent.replace(/\d{10}_[A-Z0-9\_]+/i, '').trim()
        shortNote.textContent = shortNote.textContent.replace(/Item ID:\d+ not found\./, '').trim()
        shortNote.textContent = shortNote.textContent.replace(/Document uploaded via Public Portal on \d{1,2}\/\d{1,2}\/\d{1,4} \d{1,2}:\d{1,2}:\d{1,2} [AP]M(?:\sby [A-Za-z0-9\.\+\-]+\@[A-Za-z]+\.[A-Za-z]{2,4})?\sand retrieved by Portal Integration on (\d{1,2}\/\d{1,2}\/\d{1,4}) \d{1,2}:\d{1,2}:\d{1,2} [AP]M\./, 'Received via Portal on $1.').trim()
    // First sentence: Probably because PDF was sent to EFC before client completed it? //
    // "Item ID:60448 not found.Document uploaded via Public Portal on 4/15/2026 2:38:28 PM and retrieved by Portal Integration on 4/15/2026 2:46:23 PM."
};
function modifyBadTitle(title, shortNote) {
    if (!title) { return };
    if (title.textContent.includes('BULK SCAN')) {
        title.textContent = shortNote.textContent
        shortNote.textContent = ''
    } else if (title.textContent.includes('MNB001 Application')) {
        title.textContent = shortNote.textContent.includes("CCAP") ? "CCAP Application (MNB)" : "Combined Application (MNB)"
        shortNote.textContent = ''
    };
};
function visualIndicatorIfPdfSelected() {
    let selectedLength = document.querySelectorAll('tr.s4-itm-selected:has(td.ms-vb-icon > img[alt="pdf File"])').length
    switch(selectedLength) {
        case 0: ribbon.classList.remove('pdfSelected'); break;
        default: ribbon.classList.add('pdfSelected'); break;
    };
};
function copy(text) { if (typeof text !== 'string') { return }; navigator.clipboard.writeText(text) };
function openCaseFile(openCaseFileNum, target) {
    openCaseFileNum = openCaseFileNum.trim()
    if (!openCaseFileNum || !(/^\d{1,10}$/).test(openCaseFileNum)) { return };
    copy(openCaseFileNum)
    window.open("/CWRF/Case%20File.aspx?SystemRecordID=" + openCaseFileNum + "&SOR=MAXIS", target)
};
!function modifyTablesAsLoaded() {
    if (!'primaryTableLoc' in page || !tableLocQuery('primaryTableLoc')) { return };
    tableLocQuery('primaryTableLoc').addEventListener('mouseleave', () => { visualIndicatorIfPdfSelected() });
    tbodLoadedEles()?.forEach(tbod => { modifyDocumentTables(tbod) });
    const observer = new MutationObserver(mutations => { tbodLoadedEles()?.forEach(tbod => { modifyDocumentTables(tbod) }) });
    observer.observe(tableLocQuery('primaryTableLoc'), { childList: true, subtree: true });
}();
!function modifyTablesAsLoadedSecondary() {
    if ('secondaryTableLoc' in page) {
        return
        verbose(tbodLoadedElesSecondary())
        tbodLoadedElesSecondary()?.forEach(tbod => { modifyDocumentTablesSecondary(tbod) });
        const observer = new MutationObserver(mutations => { tbodLoadedElesSecondary()?.forEach(tbod => { modifyDocumentTablesSecondary(tbod) }) });
        observer.observe(tableLocQuery('secondaryTableLoc'), { childList: true, subtree: true });
    };
}();
function createNewEle(nodeName, attribObj={}, dataObj={}) {
    let newEle = Object.assign(document.createElement(nodeName), attribObj);
    Object.entries(dataObj)?.forEach(([dataName, dataValue] = []) => { newEle.dataset[dataName] = dataValue });
    return newEle;
};
// function verbose() { console.info( ...arguments, ( (new Error).stack.split('\n') ) ) }; // Edge version //
function verbose() { console.info( ...arguments, "  (Verbose line: " + (Number((new Error).stack.split('\n')[2].split(':').toReversed()[1])-1) + ")" ) }; // Edge version //

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

function waitForEleWithAncestor(awaitedEleStr, anchorEle=document.body) {
    if (!anchorEle) { return };
    awaitedEleStr ??= 'tbody[id^=tbod]'
    const awaitedEleLocate = () => anchorEle.querySelector(awaitedEleStr)
    return new Promise((resolve, reject) => {
        let awaitedEle = awaitedEleLocate()
        if ( awaitedEle) {
            resolve( awaitedEle ) }
        else {
            const observer = new MutationObserver(mutations => {
                awaitedEle = awaitedEleLocate()
                if (awaitedEle) { observer.disconnect(); resolve( awaitedEle ); }
            });
            observer.observe(anchorEle, { childList: true, subtree: true, });
        };
    });
};
// function waitForTable(awaitedTableIn) {
//     let defaultStr = 'tbody[id^=tbod]'
//     const awaitedEleLocate = () => (typeof awaitedTableIn === "string") ? document.querySelector(awaitedTableIn) : awaitedTableIn instanceof HTMLElement ? awaitedTableIn : document.querySelector(defaultStr)
//     return new Promise((resolve, reject) => {
//         let awaitedTable = awaitedEleLocate()
//         if ( awaitedTable) {
//             resolve( awaitedTable ) }
//         else {
//             const observer = new MutationObserver(mutations => { if (awaitedTable) {
//                 observer.disconnect(); resolve( awaitedTable ); } });
//             observer.observe(mainBody.querySelector('#contentBox'), { childList: true, subtree: true, });
//         };
//     });
// };

// Subscriptions page, changing names to Last, First: Problematic, as there doesn't seem to be a way to do it programatically. Seems to require a mouse click, but mouseclick loads the 'edit only this entry' page. That page could be changed programatically, but would be slow.
// There's a hidden input element, #jsgrid_editboxspgridcontainer_WPQ1, that might need an event. But the page probably won't change the target of that input without a user click.

console.timeEnd('CaseWonks load time')
