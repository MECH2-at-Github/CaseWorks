// ==UserScript==
// @name         CaseWonks
// @namespace    http://tampermonkey.net/
// @version      0.0.13
// @description  Make CaseWorks less miserable to use.
// @author       Worker McWorkerface
// @match        https://*.caseworkscloud.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=caseworkscloud.com
// @grant        none
// ==/UserScript==

// table changes not working on https://fsestlouis.caseworkscloud.com/Document%20Processing%20Center/Forms/AllItems.aspx?RootFolder=/Document%20Processing%20Center/JonathanMcCormick#InplviewHash0061c5ff-a299-4225-b98b-9c54eab230d9=SortField%3DSysRecID-SortDir%3DAsc-
// waitFor... does not seem to be triggering.

console.time('CaseWonks load time')
const iFramed = window.location !== window.parent.location; if (iFramed || (window.location.href.slice(-4) === ".txt") ) { return };
const mainBody = window.parent.document.body, thisPageName = window.location.pathname.split("/")?.reverse()[0].replaceAll("%20", ""), editionLocation = document.querySelector('#zz7_TopNavigationMenu .menu-item-text')?.textContent?.toLowerCase().replace(/\W/g, '') ?? "fsestlouis",
      ribbon = document.getElementById('RibbonContainer')

const tableLocQuery = (loc) => mainBody.querySelector(page[loc]);
const sanitize = {
    evalText(text) { return String(text)?.replace(/\\/g,'').trim() },
    query(query, all = 0) {
        if (!query) { return undefined }
        if (query instanceof HTMLElement || query instanceof NodeList || query instanceof HTMLCollection ) { return query }
        if (typeof query !== "string") { console.log("sanitize.query: argument 1 invalid (" + query + ") - must be a valid query string, an HTMLElement or HTMLCollection, or a NodeList"); return undefined; }
        return getSanitizedQuery(query)
        function getSanitizedQuery(queryInput) {
            let queryFromTextInput = ( queryInput.indexOf(',') > -1 || all ) ? document.querySelectorAll( queryInput )
            : queryInput.indexOf('#') === 0 ? document.getElementById( queryInput.slice(1) )
            : document.querySelector( queryInput )
            return ( queryFromTextInput instanceof HTMLElement || queryFromTextInput instanceof NodeList ) ? queryFromTextInput : undefined
        };
    },
    string(stringText) { return String(stringText)?.replace(/[^a-z0-9áéíóúñü \.,'_-]/gim, '') },
    number(num) { return Number(String(num).replace(/[^0-9-.]/gi, '')) || 0 },
    html(htmlText) { return new DOMParser().parseFromString(htmlText, "text/html").documentElement.innerText },
    timeStamp(time) { return String(time)?.replace(/[^apm0-9:,\/ ]/gi, '') }, // [^] = not in list //
    date(inputDate, dateTypeNeeded = "date") {
        const isDateObject = inputDate instanceof Date
        inputDate = (/\d{13}/).test(inputDate) ? Number(inputDate) : inputDate
        const inputTypeof = typeof inputDate
        switch (dateTypeNeeded) {
            case "date":
                return isDateObject ? inputDate : new Date(inputDate)
                break
            case "number":
                if ( inputTypeof === "number" && (Math.log(inputDate) * Math.LOG10E + 1 | 0) === 13 ) { return inputDate }
                if ( inputTypeof === "string" ) { return Date.parse(inputDate) }
                if ( isDateObject ) { return inputDate.getTime() }
                break
            case "string":
                if ( inputTypeof === "number" && (Math.log(inputDate) * Math.LOG10E + 1 | 0) === 13 ) { return new Date(inputDate).toLocaleDateString() }
                if ( inputTypeof === "string" ) { return inputDate }
                if ( isDateObject ) { return inputDate.toLocaleDateString() }
                break
            default:
                return undefined;
        }
    },
    json(jsonObj) { try { if (!jsonObj || jsonObj.indexOf('{') < 0) { return undefined }; return JSON.parse(jsonObj) } catch (err) { console.log(err, jsonObj); return undefined } },
};
const dateFuncs = {
    formatDate(dateVal, dateFormat = "mmddyy") {
        dateVal = sanitize.date(dateVal, 'date')
        if ( [-86400000, -64800000 ].includes(dateVal) || Number.isNaN(dateVal) ) { return undefined }; // -64800000 === 12/31/1969, epoch date (-86400000 UTC epoch) //
        dateFormat = dateFormat.toLowerCase()
        switch (dateFormat) {
            case "inputelement": return dateVal.toLocaleDateString('en-CA');
            case "utc": return Date.UTC(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDay());
            case "mdyy": return dateVal.toLocaleDateString(undefined, { year: "2-digit", month: "numeric", day: "numeric" });
            case "mdyyyy": return dateVal.toLocaleDateString(undefined, { year: "numeric", month: "numeric", day: "numeric" });
            case "mmddyy": return dateVal.toLocaleDateString(undefined, { year: "2-digit", month: "2-digit", day: "2-digit" });
            case "mmddyyyy": return dateVal.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
            case "mmddhm": return dateVal.toLocaleDateString('en-US', { hour: "numeric", minute: "2-digit", month: "2-digit", day: "2-digit" });
            default: return dateVal.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
        }
    },
};
const page = new Map([
    ['Home.aspx', { alias: 'Home', primaryTableLoc: 'div.ms-webpart-zone.ms-fullWidth:has(#divAPNMain)' }],
    ['CaseFile.aspx', { alias: 'CaseFile', primaryTableLoc: '#DPC table table.ms-listviewtable', efcTableLoc: '#scriptWPQ7' }],
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
mainBody.classList.add(page.alias, 'CaseWonks')
const modifiedTables = [];
const titleSwaps = [ // escapes need double slash //
    ["Notification - ", ""],
    ["Merge For Mailing \\(Delete after Mailing or Printing\\)", "Merge for Mail - Delete"],
    ["^FSE[0-9]{1,3}[A-Z]? ", ""],
    ["^EA[0-9]{1,3}[A-Z]? ", ""],
    ["^DHS[0-9]{1,6}[A-Z]? ", ""],
    ["^SLF[0-9]{1,3} ", ""],
    ["^D[0-9]{3} ", ""],
    ["(Minnesota )?Child Care Assistance( Program)?( \\(CCAP\\))?", "CCAP"],
    ["Basic Sliding Fee( \\(BSF\\))?", "BSF"],
    ["Redetermination Form", "Redetermination"],
    ["Combined Application Form \\(CAF\\)", "Combined Application"],
    ["Shelter\\/Residence Verification", "Residence"],
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
    [`Portal400 General Proof of Residency "Utility Bills, Rent, Lease Agreement, Eviction Notice, Home-Owner's Insurance, etc\\."`, "Portal doc: Residency"],
    ["Notice of Late or Incomplete Household Report Form Health Care Renewal Form or Combined Six\\-Month Report", "Notice of late HRF, HCR, CSMR"],
    ["Social Security", "SS"],
    ["Renewal for People Receiving Long-Term Care Services", "Renewal for People Receiving LTC Services"],
    ["Request to End Child Support Good Cause", "Request to End CS Good Cause"],
    // ["", ""],
    // ["", ""],
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
    ["1.9", "1.9: IM Ins-Corr"],
    ["5.3", "5.3: CCAP App"],
    ["5.4", "5.4: CCAP Activity"],
    // ["", ""],
    // ["", ""],
    // ["", ""],
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
]);
const shortNoteSwaps = [
    ["\\d{10}\\_[A-Z0-9\\_]+", ""],
    ["Item ID\\:\\d+ not found\\.", ""],
    ["Document uploaded via Public Portal on \\d{1,2}\\/\\d{1,2}\\/\\d{1,4} \\d{1,2}:\\d{1,2}:\\d{1,2} [AP]M(?:\\sby [A-Za-z0-9\\.\\+\\-]+\\@[A-Za-z]+\\.[A-Za-z]{2,4})?\\sand retrieved by Portal Integration on (\\d{1,2}\/\\d{1,2}\\/\\d{1,4}) \\d{1,2}:\\d{1,2}:\\d{1,2} [AP]M\\.", "Received via Portal on $1."],
    ["\\*TO: \\+?\\d{10,11} FROM: (\\d{10,11}).*", "Fax from $1"],
    ["Auto-Copy from ([A-Z]{3})", "$1 auto-copy"],
    ["^Web$", ""],
    // ["", ""],
    // ["", ""],
];
const gbl = {
    eles: {
        navContainer: createNewEle('div', { id: "caseWonksNavBar", style: "line-height: 26px; display: flex; gap: 20px; align-items: center; position: fixed; left: 250px; top: 4px; z-index: 990;", }),
        homePageLink: createNewEle('a', { textContent: "Home Page", classList: "ms-pivotControl-surfacedOpt-selected", style: "font-size: 14px;", }),
        newTabFieldDiv: createNewEle('div', { id: "newTabFieldDiv", style: "display: inline-block;" }),
        newTabField: createNewEle('input', { id: "newTabField", autocomplete:"off", classList: "form-control", placeholder: "Case #", pattern: "^\\d{1,12}$", style: "width: 13ch;" }),
        caseDocsNewTabButton: createNewEle('button', { textContent: "GO", style: "line-height: inherit; padding: 0 8px; margin-left: 10px; min-width: unset; font-size: 10px", }),
        caseHistory: createNewEle('datalist', { id: "caseHistory", style: "visibility: hidden;" }),
    }
};
const caseData = (() => {
    let caseIdNameEle = mainBody.querySelector('#CaseFileHeaderStatus')?.previousElementSibling;
    if (!caseIdNameEle) { return { caseNum: undefined, caseName: undefined } };
    let splitCaseData = caseIdNameEle.textContent.match(/(?<title>[A-Z ]+:) (?<caseNum>[0-9 ]+) (?<caseName>[A-Z'\-, ]+)/i).groups
    if (!editionLocation.includes("cse")) { splitCaseData.caseNum = parseInt(splitCaseData.caseNum, 10) }
    let caseIdNameEleReplacement = createNewEle('h1', { style: 'display: flex; gap: 10px;' }), caseNumEle = createNewEle('div', { textContent: splitCaseData.caseNum })
    caseNumEle.addEventListener('click', clickEvent => snackBar(clickEvent.target.textContent) )
    caseIdNameEleReplacement.append( createNewEle('div', { textContent: splitCaseData.title }), caseNumEle, createNewEle('div', { textContent: splitCaseData.caseName }) )
    caseIdNameEle.replaceWith( caseIdNameEleReplacement )
    return { caseNum: splitCaseData.caseNum, caseName: splitCaseData.caseName };
})();
!function addCustomTableRules() {
    return;
    const tableRules = {
        uselessMenu: ''
    };
    const customTableRules = new Map([
        ["CaseFile", 'table[summary="Document Processing Center"] {} table[summary="FSE Electronic File Cabinet"] {}']
    ]).get(page.alias);
    if (!customTableRules) { return };
    document.head.append(createNewEle( 'style', { id: "caseWonksTableRules", textContent: customTableRules } ))
}();
!function addCustomNavBar() {
    if (!ribbon) { return };
    mainBody.insertAdjacentElement( 'afterbegin', gbl.eles.navContainer )
    !function mainPageLink() {
        gbl.eles.navContainer.appendChild( gbl.eles.homePageLink )
        gbl.eles.homePageLink.addEventListener('click', () => { window.open("https://" + editionLocation + ".caseworkscloud.com/", "_self") });
        gbl.eles.homePageLink.addEventListener('contextmenu', contextmenuEvent => { contextmenuEvent.preventDefault(); window.open("https://" + editionLocation + ".caseworkscloud.com/", "_blank"); });
    }();
    // Link to "All Docs" in Nav Bar? (would need to store the username from the Home Page)
    // 	document.querySelector('span[title="My DocBox - Document Processing Center library"] a[title="All Documents - Document Processing Center"]').href.split('/').reverse()[0]

//======================== Case_History | New_Tab_Case_Number_Field Section_Start ===================================//
    !function newTabFieldSetup() {
        gbl.eles.navContainer.appendChild(gbl.eles.newTabFieldDiv).append(gbl.eles.newTabField, gbl.eles.caseDocsNewTabButton, gbl.eles.caseHistory)

        function removeHistoryFocusClasses() { Array.from(gbl.eles.caseHistory?.querySelectorAll('.caseHistoryFocus, .caseHistoryFocusKB'), ele => { ele.classList.remove('caseHistoryFocus', 'caseHistoryFocusKB') }); };
        function hideCaseHistory() { toggleVisible(gbl.eles.caseHistory, false); removeHistoryFocusClasses() };
        function pageOpenNTF(event, pageNameNTF) {
            event.preventDefault();
            let enterFromKB = event.key === 'Enter' ? gbl.eles.caseHistory?.querySelector('.caseHistoryFocusKB') : undefined
            if (enterFromKB) {
                gbl.eles.newTabField.value = Number(enterFromKB.id.split('history')[1])
                gbl.eles.newTabField.select()
                hideCaseHistory()
                return;
            };
            if (!testCaseNum(gbl.eles.newTabField.value)) { return; }
            navToCaseFileNTF()
            gbl.eles.newTabField.value = ''
            hideCaseHistory()
            gbl.eles.newTabField.blur()
        };
        function caseHistoryChangeFocus(event) {
            let currentFocusedTarget = gbl.eles.caseHistory?.querySelector('.caseHistoryFocus') ?? undefined
            removeHistoryFocusClasses()
            let focusTarget = (() => {
                switch (event.key) {
                    case "ArrowDown": return !currentFocusedTarget ? gbl.eles.caseHistory?.children[0] : currentFocusedTarget === Array.from(gbl.eles.caseHistory?.children)?.at(-1) ? currentFocusedTarget : currentFocusedTarget.nextElementSibling;
                    case "ArrowUp": return !currentFocusedTarget ? Array.from(gbl.eles.caseHistory?.children)?.at(-1) : currentFocusedTarget === gbl.eles.caseHistory?.children[0] ? currentFocusedTarget : currentFocusedTarget.previousElementSibling;
                    default: return event.target.closest('div.caseHistoryEntry');
                };
            })();
            focusTarget?.classList.add(...(!!event.key ? ['caseHistoryFocus', 'caseHistoryFocusKB'] : ['caseHistoryFocus']))
        };
        !function caseHistoryDatalist() {
            if (iFramed || !(gbl.eles.newTabField instanceof HTMLElement)) { return };
            try {
                const caseHistory = sanitize.json(localStorage.getItem('MECH2.caseHistoryLS')) ?? []
                if (page.alias === "CaseFile") { addToCaseHistoryArray() }
                function addToCaseHistoryArray() {
                    const caseIdValTest = (entry) => entry.caseIdValNumber === caseData.caseNum, foundDuplicate = caseHistory.findIndex(caseIdValTest)
                    if (foundDuplicate > -1) { caseHistory.splice(foundDuplicate, 1) }
                    let timestamp = dateFuncs.formatDate(new Date(), "mmddhm"), newEntry = { caseIdValNumber: caseData.caseNum, caseName: caseData.caseName, time: timestamp };
                    while (caseHistory.length > 9) { caseHistory.pop() }
                    caseHistory.unshift(newEntry)
                    localStorage.setItem('MECH2.caseHistoryLS', JSON.stringify(caseHistory));
                };
                caseHistory.map(
                    ({ caseIdValNumber, time, caseName } = {}) => {
                        let historyEntry = createNewEle('div', { id: 'history' + sanitize.number(caseIdValNumber), classList: "caseHistoryEntry" })
                        historyEntry
                            .append(
                            createNewEle('span', { textContent: sanitize.timeStamp(time) }),
                            createNewEle('span', { textContent: sanitize.string(caseName) }),
                            createNewEle('span', { textContent: sanitize.number(caseIdValNumber) })
                        )
                        return historyEntry
                    }
                ).forEach(ele => gbl.eles.caseHistory.appendChild(ele));
                let historyList = [...gbl.eles.caseHistory?.children]
                !function addEventListenerSection() {
                    gbl.eles.newTabField.addEventListener('focus', focusEvent => {
                        filterHistory(focusEvent.target.value, undefined)
                        document.addEventListener('click', hideHistoryClick)
                    });
                    gbl.eles.newTabField.addEventListener('paste', pasteEvent => {
                        pasteEvent.preventDefault();
                        let pastedText = (pasteEvent.clipboardData || window.clipboardData).getData("text").trim()
                        if ( !testCaseNum(pastedText) ) { return };
                        gbl.eles.newTabField.value = pastedText
                        filterHistory(pastedText, undefined)
                    });
                    gbl.eles.newTabField.addEventListener('input', inputEvent => { filterHistory(inputEvent.target.value, inputEvent.inputType) });
                    gbl.eles.caseHistory.addEventListener('click', clickEvent => {
                        gbl.eles.newTabField.value = Number(clickEvent.target.closest('div.caseHistoryEntry').id.split('history')[1])
                        gbl.eles.newTabField.select()
                        hideCaseHistory()
                    });
                    gbl.eles.caseHistory?.addEventListener('mouseover', mouseoverEvent => {
                        if (mouseoverEvent.target.closest('div.caseHistoryEntry')?.classList?.contains('caseHistoryFocus')) { return };
                        caseHistoryChangeFocus(mouseoverEvent)
                    });
                    gbl.eles.newTabField.addEventListener('keydown', keydownEvent => {
                        keydownEvent.stopImmediatePropagation()
                        if (
                            ( /[0-9]/.test(keydownEvent.key) && /^\d{0,12}$/.test(keydownEvent.target.value) )
                            || ( keydownEvent.ctrlKey && ['v', 'a', 'x', 'c', 'z'].includes(keydownEvent.key) )
                            || [ 'ArrowLeft', 'ArrowRight', 'Backspace', 'Delete', 'Home', 'End', 'Tab' ].includes(keydownEvent.key)
                        ) { return };
                        switch (keydownEvent.key) {
                            case 'Enter': pageOpenNTF(keydownEvent); break;
                            case 'Escape': hideCaseHistory(); gbl.eles.newTabField.blur(); break;
                            case 'ArrowUp':
                            case 'ArrowDown': caseHistoryChangeFocus(keydownEvent); break;
                            default: break;
                        };
                        keydownEvent.preventDefault()
                    });
                    gbl.eles.caseDocsNewTabButton.addEventListener('click', navToCaseFileNTF);
                }();
                function filterHistory(inputValue, inputType) {
                    if (!inputValue) {
                        unhideElement(historyList, true)
                        if (inputType && inputType === 'deleteByCut') {
                            hideCaseHistory()
                            gbl.eles.newTabField.blur();
                            return;
                        };
                        toggleVisible(gbl.eles.caseHistory, true)
                        return;
                    };
                    let inputMatch = historyList.filter( ele => ele.id.includes(inputValue) )
                    if (inputMatch.length) {
                        toggleVisible(gbl.eles.caseHistory, true)
                        historyList.forEach(ele => inputMatch.includes(ele) ? unhideElement(ele, true) : unhideElement(ele, false) )
                    } else { hideCaseHistory() };
                };
                function hideHistoryClick(clickEvent) {
                    if ( clickEvent.target.closest('#newTabFieldDiv') ) { return };
                    hideHistoryRemoveEvent()
                };
                function hideHistoryRemoveEvent() {
                    hideCaseHistory()
                    document.removeEventListener('click', hideHistoryClick)
                };
            } catch (err) { console.trace(err) };
        }();
    }(); //======================== Case_History | New_Tab_Case_Number_Field Section_End ===================================//
}();

// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓
// //////////////////////////////////////////////////////////////////////////////// PAGE_SPECIFIC SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
!async function AllItems() {
    if (page.alias !== "AllItems") { return };
    let docTableArea = tableLocQuery('primaryTableLoc'), docTable = await waitForEleWithAncestor('table[summary="Document Processing Center"] > tbody', docTableArea),
        allDocsLink = docTableArea.parentElement.querySelector('.ms-csrlistview-controldiv > span > a[aria-label="All Documents, View, Selected"]')
    if (!allDocsLink) { return };
    allDocsLink.textContent = allDocsLink?.textContent + " (" + (docTable.querySelectorAll('tr').length ?? '') + ")"
    //slider to hide pending?
}();
!function CaseFile() {
    if (page.alias !== "CaseFile" || !caseData.caseNum) { return };
    !function fixPageHeader() {
        document.querySelector('title').textContent = caseData.caseName + " - " + caseData.caseNum
    }();
    setTimeout(() => { document.querySelector('li[aria-controls="DPC"][aria-selected="false"]')?.click() }, 300)
}();
!function DocDisc() {
    if (page.alias !== "DocDisc") { return };
    document.querySelector('#MSOZoneCell_WebPartWPQ4').style.display = "inline-table"
    const hideNotificationsSlider = createSlider({ textContent: "Toggle Notifications", title: "Show or Hide 'Notification' rows.", checked: "checked", id: "hideNotificationsSliderCheck" })
    const hideNotificationsStyle = createNewEle('style', { textContent: ".toggleHidden { display: none; }" })
    hideNotificationsSlider.addEventListener('click', clickEvent => {
        switch(clickEvent.target.checked) {
            case true: hideNotificationsStyle.textContent = ".toggleHidden { display: none; }"; break;
            case false: hideNotificationsStyle.textContent = ".toggleHidden { display: table-row; }"; break;
        };
    });
    mainBody.append(hideNotificationsStyle)
    gbl.eles.navContainer.append(hideNotificationsSlider)
}();
!async function Subs() {
    if (page.alias !== "Subs") { return };

    const dupeCases = createNewEle('div'), uniqueCases = createNewEle('div'), matchedCount = createNewEle('div')
    const compareOpenButton = createNewEle('button', { textContent: "Compare" }),
          compareResetButton = createNewEle('button', { textContent: "Reset", style: "display: none;" }),
          compareDialog = createNewEle('dialog'),
          compareTextarea = createNewEle('textarea', { style: "height: 20vh;", id: "compareTextarea" }),
          compareOkButton = createNewEle('button', { textContent: "OK" }),
          compareCancelButton = createNewEle('button', { textContent: "Cancel" }),
          compareUnmatched = createNewEle('div', { textContent: "Unmatched Case Numbers:", style: "display: none; position: fixed; right: 5vw; top: 15vh;" })
    gbl.eles.navContainer.append( ...arrangeElements([createNewEle('div', { style: "display: flex; gap: 5px;" }), [ compareOpenButton, compareResetButton ]]), dupeCases, uniqueCases, matchedCount )
    mainBody.append(
        ...arrangeElements(
            [compareDialog,
             [createNewEle('div', { textContent: "Paste list of cases, comma separated." }),
              compareTextarea,
              createNewEle('div', { style: "display: flex; gap: 10px; justify-content: center;" }),
              [compareOkButton,
               compareCancelButton]
             ],
             compareUnmatched,
             createNewEle('style', { textContent: "dialog[open] { display: flex; flex-direction: column; gap: 10px; width: 400px; } .compareMatch * { color: light-dark(#A94D15, #ffa700) !important; } .duplicateMatch * { color: #CC0000 !important; }" }),
            ])
    );

    let caseListTableAncestor = async () => await waitForTableCells(document.querySelector('#scriptWPQ1'))
    const rowMap = new Map()
    const editLinkLocator = () => document.querySelector('#Hero-WPQ1 .ms-heroCommandLink[title="Edit this list using Quick Edit mode."], #Hero-WPQ1 .ms-heroCommandLink[title="Stop editing and save changes."]')
    const editLink = editLinkLocator()
    editLink.addEventListener('click', async clickEvent => {
        if (!rowMap.size) { return };
        let existingAncestor = mainBody.querySelector('#scriptWPQ1')
        let existingTable = mainBody.querySelector('#scriptWPQ1 table[summary="Subscription"] > tbody')
        const observer = new MutationObserver(async () => { // wait for old table to be destroyed //
            if (existingTable.isConnected) { return };
            observer.disconnect();
            await caseListTableAncestor() // wait for new table //
            checkForDuplicates(true)
        });
        observer.observe(existingAncestor, { childList: true, subtree: true });
    });
    function setVarsBasedOnEditMode(editMode, tr) {
        switch(editMode) {
            case "edit": return tr?.children[4];
            case "Stop": return tr?.children[3];
        };
    };
    async function checkForDuplicates(followWithOkEvent) {
        const caseListTrs = await Array.from( (await caseListTableAncestor())?.querySelectorAll('tbody tr') )
        const editMode = editLinkLocator().textContent
        const [uniques, duplicates] = (function() {
            rowMap.clear()
            const uniqueSet = new Set()
            const caseList = caseListTrs.map(tr => {
                let caseIdTd = setVarsBasedOnEditMode(editMode, tr)
                let caseIdNum = caseIdTd?.textContent?.trim()
                if ( !(/^\d+$/).test(caseIdNum) ) { return [] };
                rowMap.set(caseIdNum, tr)
                return caseIdNum;
            }).filter(e => e.length);
            const duplicateList = caseList?.map(caseIdNum => {
                if (!caseIdNum) { return false };
                if ( uniqueSet?.has(caseIdNum) ) { return caseIdNum };
                uniqueSet?.add(caseIdNum);
                return false;
            }).filter(e => e);
            return [uniqueSet, duplicateList]
        })();
        if (duplicates.length === 0) { duplicates.push("None found") }
        else { duplicates.forEach(caseIdNum => { rowMap.get(caseIdNum).classList.add('duplicateMatch') }) };
        dupeCases.textContent = "Duplicate Cases: " + duplicates.join(', ')
        uniqueCases.textContent = "Unique Count: " + uniques.size
        if (followWithOkEvent) { okEvent() };
    };

    compareOpenButton.addEventListener('click', () => {
        compareDialog.showModal()
        checkForDuplicates()
    });
    compareResetButton.addEventListener('click', () => {
        Array.from( mainBody.querySelectorAll('.compareMatch'), ele => ele.classList.remove('compareMatch') );
        compareResetButton.style.display = "none"
        compareUnmatched.style.display = "none"
        dupeCases.textContent = ""
        uniqueCases.textContent = ""
        matchedCount.textContent = ""
    });
    function okEvent() {
        if (!compareTextarea?.value) { return };
        if ( (/[^0-9, ]/).test(compareTextarea.value) ) { alert("List contains invalid characters. Only numbers, commas, and spaces allowed."); return };
        let unmatchedNumbers = []
        let userCaseList = compareTextarea.value?.trim().split(/, ?/)?.filter(e => e)
        userCaseList.forEach(caseNum => {
            let matchedRow = rowMap.get(caseNum)
            if (!matchedRow) {
                unmatchedNumbers.push(caseNum)
                return;
            };
            matchedRow?.classList.add('compareMatch')
        });
        compareDialog.close()
        compareResetButton.style.display = "block"
        Array.from(compareUnmatched.querySelectorAll('div'), ele => ele.remove())
        compareUnmatched.append(...unmatchedNumbers.map(caseNum => createNewEle('div', { textContent: caseNum }) ))
        compareUnmatched.style.display = "block"
        matchedCount.textContent = "Match Count: " + (userCaseList.length - unmatchedNumbers.length) + '/' + userCaseList.length
    };
    compareTextarea.addEventListener('keydown', keydownEvent => { if (keydownEvent.key === "Enter") { keydownEvent.preventDefault(); okEvent(); } })
    compareOkButton.addEventListener('click', okEvent);
    compareCancelButton.addEventListener('click', () => { compareDialog.close(); });
}();
// Scan, Subscription:
// 	Next to DocBox dropdown: Add a button with user's name which onclick changes dropdown to username?

// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ PAGE_SPECIFIC SECTION END /////////////////////////////////////////////////////////////////////////////////////////////
// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓

// Merge for Mail:
// 	#ribbon > mergeForMailing.click() => observe for window (form[action="/_layouts/15/NCT.Document.Merge/MergeDoumentsPreview.aspx?IsDlg=1"])
// 		Add buttons with stock text to be entered in textarea#InstructionstoClient, such as:
// 			The Referral to Support and Collections form is required to be completed for CCAP eligibility.
// 			The Client Statement of Good Cause form is only required if you wish to make a good cause claim for not cooperating with child support for reasons listed on the form.


// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓
// ////////////////////////////////////////////////////////////////////////////// TABLE_FUNCTIONS SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

const copySymbol = () => createNewEle('span', { textContent: ' ❐', style: 'padding-left: 2px; cursor: pointer;', onclick: function(clickEvent) { clickEvent.preventDefault(); copy(clickEvent.target.previousElementSibling?.textContent); clickEvent.target.style.filter = 'invert(1)'; }, })
let lastCaseNum = ""
async function modifyDocumentTables(tableBody) {
    let sortedByCaseNum = tableBody?.closest('table')?.querySelector('.ms-headerSortTitleLink:has(+span:not([style="display: none;"]))')?.textContent === "MAXIS" ?? false
    tableBody = await waitForTableCells(tableBody)
    // verbose(tableBody)
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
            hideNotificationRows(name, tr)
        };
        if (sortedByCaseNum) { lastCaseNum = groupByCaseNumIfSorted(tableBody, lastCaseNum, caseLink, tr) };
        doModifications(name, createdDate, modifiedDate, taxonomy, createdBy, modifiedBy, shortNote, title, reviewed, caseLink, sortedByCaseNum, receivedDate)
    });
    modifyTableHeaders(tableBody)
    modifiedTables.push(tableBody)
    // verbose(tableBody)
};
async function modifyDocumentTablesEFC(tableBody) {
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
function modifyTableHeaders(tableBody) { Array.from(tableBody.closest('table').querySelectorAll('th > div > a'), aEle => { aEle.textContent = theadSwaps.get(aEle.textContent) ?? aEle.textContent }) };
function hideNotificationRows(name, tr) {
    if (name.textContent.indexOf("Notif") !== 0) { return };
    tr.classList.add('toggleHidden')
    // tr.remove();
    // todo: Change this to: tr.classList.add('toggleHidden'), add style for toggleHidden, add slider to toggle toggleHidden //
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

// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ TABLE_FUNCTIONS SECTION END /////////////////////////////////////////////////////////////////////////////////////////////
// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓



// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓
// //////////////////////////////////////////////////////////////////////////////////// MODIFICATIONS START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
function doModifications(name, createdDate, modifiedDate, taxonomy, createdBy, modifiedBy, shortNote, title, reviewed, caseLink, sortedByCaseNum, receivedDate) {
    modifyReviewed(reviewed)
    modifyTitles(title, shortNote)
    modifyBadTitle(title, shortNote)
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
function modifyReviewed(reviewed) {
    if (!reviewed) { return };
    reviewed.textContent = reviewed.textContent === "Yes" ? "☑" : "☒"
};
// function modifyTitles(title) { // crashes page //
//     if (!title) { return };
//     let titleOrigText = title.textContent
//     let titleRegExText = title.textContent
//     titleSwaps.forEach( ([regX, swap]) => { titleRegExText = titleRegExText.replace(new RegExp(regX, "i"), swap) });
//     title.textContent = ""
//     let titleSpan = createNewEle('span', { title: titleOrigText, textContent: titleRegExText })
//     title.appendChild( titleSpan )

//     !function modifyBadTitle(title, shortNote) {
//         if (title.textContent.includes('BULK SCAN') && shortNote.textContent.length) {
//             titleSpan.textContent = shortNote.textContent
//             shortNote.textContent = ''
//         } else if (title.textContent.includes('MNB001 Application')) {
//             titleSpan.textContent = shortNote.textContent.includes("CCAP") ? "CCAP Application (MNB)" : "Combined Application (MNB)"
//             shortNote.textContent = ''
//         };
//     }();
// };

function modifyTitles(title) {
    if (!title) { return };
    let titleOrigText = title.textContent
    let titleRegExText = title.textContent
    titleSwaps.forEach( ([regX, swap]) => { titleRegExText = titleRegExText.replace(new RegExp(regX, "i"), swap) });
    title.textContent = ""
    title.appendChild( createNewEle('span', { title: titleOrigText, textContent: titleRegExText }) )
};
function modifyBadTitle(title, shortNote) {
    if (!title) { return };
    let titleSpan = title.querySelector('span')
    if (!titleSpan) { return };
    if (title.textContent.includes('BULK SCAN') && shortNote.textContent.length) {
        titleSpan.textContent = shortNote.textContent
        shortNote.textContent = ''
    } else if (title.textContent.includes('MNB001 Application')) {
        titleSpan.textContent = shortNote.textContent.includes("CCAP") ? "CCAP Application (MNB)" : "Combined Application (MNB)"
        shortNote.textContent = ''
    };
};
function modifyName(name) {
    if (!name) { return };
    let nameA = name.querySelector('a')
    let nameNewText = nameA.textContent.match(/^[A-Z]{1,3}[0-9]{3,4}[A-Z]? [A-Za-z0-9- ]+__(?<filenum>[0-9]{5,6})_[0-9-]+/)?.groups?.filenum
    nameA.textContent = "(view_" + (nameNewText ?? "item") + ")"
};
function modifyShortNote(shortNote) {
    if (!shortNote || !shortNote.textContent) { return };
    let shortNoteOrigText = shortNote.textContent
    shortNoteSwaps.forEach( ([regX, swap]) => { shortNote.textContent = shortNote.textContent.replace(new RegExp(regX, "i"), swap) });
    if (shortNote.textContent) { shortNote.title = shortNoteOrigText }
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
function modifyTaxonomy(taxonomy) {
    if (!taxonomy) { return };
    let newTaxonomy = taxonomy.textContent.replace(/^([0-9.]+) ([A-Z]{2,4}) - /g, '$1: $2 ')
    newTaxonomy = getTaxSwap(newTaxonomy.split(':')[0]) ?? newTaxonomy
    taxonomy.textContent = newTaxonomy
};
function getTaxSwap(taxonomyNumber) { return taxonomySwaps.get(taxonomyNumber) ?? undefined };
function modifyDate(originalDate) {
    if (!originalDate) { return };
    let dateSpan = originalDate.querySelector('span')
    dateSpan.textContent = originalDate.textContent.split(' ')[0].replace(/\d{2}(\d{2})$/, '$1')
};
function modifyCreatedModifiedBy(createdModifiedBy) {
    if (!createdModifiedBy) { return };
    let [createdIcon, createdName] = createdModifiedBy.querySelector('span')?.children
    if (!createdName?.textContent) { return };
    createdIcon?.remove()
    createdName.title = createdName.textContent
    createdName.querySelector('a').textContent = createdName.querySelector('a').textContent.split(/[@ ]/)[0]
};
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ MODIFICATIONS END /////////////////////////////////////////////////////////////////////////////////////////////////
// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓


!function modifyTablesAsLoaded() {
    if (!'primaryTableLoc' in page) { return };
    let tableLoc = tableLocQuery('primaryTableLoc')
    if (!tableLoc) { return };
    // verbose(tableLoc)
    tableLoc.addEventListener('mouseleave', () => { visualIndicatorIfPdfSelected() });
    tbodLoadedEles(tableLoc)?.forEach(tbod => { modifyDocumentTables(tbod) });
    const observer = new MutationObserver(mutations => { tbodLoadedEles(tableLoc)?.forEach(tbod => { modifyDocumentTables(tbod) }) });
    observer.observe(tableLoc, { childList: true, subtree: true });
}();
!function modifyTablesAsLoadedEFC() {
    if (!'efcTableLoc' in page) { return };
    let tableLoc = tableLocQuery('efcTableLoc')
    return
    if (!tableLoc) { return };
    tbodLoadedElesEFC(tableLoc)?.forEach(tbod => { modifyDocumentTablesEFC(tbod) });
    const observer = new MutationObserver(mutations => { tbodLoadedElesEFC()?.forEach(tbod => { modifyDocumentTablesEFC(tbod) }) });
    observer.observe(tableLoc, { childList: true, subtree: true });
}();


// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓
// ///////////////////////////////////////////////////////////////////////////// FUNCTION_LIBRARY SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

function openCaseFile(openCaseFileNum, target) {
    openCaseFileNum = openCaseFileNum.trim()
    if (!openCaseFileNum || !(/^\d{1,10}$/).test(openCaseFileNum)) { return };
    copy(openCaseFileNum)
    window.open("/CWRF/Case%20File.aspx?SystemRecordID=" + openCaseFileNum + "&SOR=MAXIS", target)
};
function testCaseNum(caseNumber) { caseNumber = caseNumber.replace(/\s/g, ''); return (/^\d{1,8}$|^\d{12}$/).test(caseNumber) ? caseNumber : undefined }; // MAXIS/MEC2: 1-7 digits. METS: 8 digits. PRISM: 10 + 2 digits.
// function testCaseNum(caseNumber) { caseNumber = caseNumber.replace(/\s/g, ''); return (/(?:^\d{1,8}$|^\d{12}$)/).test(caseNumber) ? caseNumber : undefined }; // MAXIS/MEC2: 1-7 digits. METS: 8 digits. PRISM: 10 + 2 digits.
function navToCaseFileNTF() {
    let caseFileNumber = testCaseNum(gbl.eles.newTabField.value)
    if (!caseFileNumber) { return undefined };
    openCaseFile(caseFileNumber, "_blank")
    gbl.eles.newTabField.value = ""
    return caseFileNumber
};

function visualIndicatorIfPdfSelected() {
    let selectedLength = document.querySelectorAll('tr.s4-itm-selected:has(td.ms-vb-icon > img[alt="pdf File"])').length
    switch(selectedLength) {
        case 0: ribbon.classList.remove('pdfSelected'); break;
        default: ribbon.classList.add('pdfSelected'); break;
    };
};
function tbodLoadedEles(tableLoc) {
    let tbodArray = page.singleTable ? [ tableLoc.querySelector('tbody') ] // single table? first table body found in tableLoc, no #id //
    : page.alias === "DocDisc" ? Array.from(document.querySelector('#MSOZoneCell_WebPartWPQ4').parentElement.querySelectorAll('table  table tbody tbody')) // round-about locating on DocDisc //
    : Array.from(tableLoc?.querySelectorAll('tbody[id^=tbod]')) // multiple tables? all tbody elements with #id starting with tbod //
    ?.filter(ele => ele.getAttribute('isloaded') === "true")
    return tbodArray;
};
function tbodLoadedElesEFC(tableLoc) {
	// if (!'efcTableLoc' in page) { return };
	// let secondaryTablesArea = tableLocQuery('efcTableLoc')
    return Array.from(tableLoc?.querySelectorAll('tbody[id^=tbod]'))?.filter(ele => ele.getAttribute('isloaded') === "true");
};


function createNewEle(nodeName, attribObj={}, dataObj={}) {
    let newEle = Object.assign(document.createElement(nodeName), attribObj);
    Object.entries(dataObj)?.forEach(([dataName, dataValue] = []) => { newEle.dataset[dataName] = dataValue });
    return newEle;
};
function arrangeElements(elementArray) {
	const validArray = item => Array.isArray(item) && item.length > 1
	return elementArray.map((item, i, arr) => validArray(item) ? subLevels(item, arr[i-1]) : item ).filter(e=>e)
	function subLevels(eleArr, parent) {
		eleArr.forEach((item, i) => {
			let newParent = Array.isArray(item) ? parent.lastElementChild : parent
			validArray(item) ? subLevels(item, newParent) : newParent.appendChild(item)
		});
	};
};
function createSlider({ textContent, title, id, checked, fontSize, classes: extraClasses, styles: extraStyles } = {}) {
    let toggleSlider = createNewEle('div', { classList: ["toggle-slider", extraClasses].join(' '), style: extraStyles })
    toggleSlider.append(
        ...arrangeElements(
            [createNewEle('label', { title, textContent }),
             createNewEle('label', { classList: "switch", style: (fontSize && "font-size: " + fontSize + ";") }),
             [createNewEle('input', { type: "checkbox", id, checked }),
              createNewEle('span', { classList: "slider round" })
             ]
            ]
        )
    );
    return toggleSlider;
};
function verbose() { console.info( ...arguments, "  (Verbose line: " + (Number((new Error).stack.split('\n')[2].split(':').toReversed()[1])-1) + ")" ) }; // Edge version //
function copy(text) { if (typeof text !== 'string') { return }; navigator.clipboard.writeText(text) };
function snackBar(sbText, title="Copied!", doCopy=true) {
    document.getElementById('snackBarDiv')?.remove()
    let style = ""
    let snackBarDivs = {
        container: createNewEle('div', { id: "snackBarDiv" }),
        title: createNewEle('span', { textContent: title }),
        textarea: createNewEle('div'),
        style: createNewEle('style', { textContent: "@scope (#snackBarDiv) { :scope { opacity: 0; animation: show 2500ms 100ms cubic-bezier(0.38, 0.97, 0.56, 0.76) forwards; background-color: #333; color: #fff; font-size: x-large; text-align: center; border: solid 5px #fff; border-radius: 6px; position: fixed; z-index: 25; width: max-content; padding: 2rem 5rem; left: 50%; right: 50%; translate: -50% 0; bottom: 30px; pointer-events: none; } }" })
    };
    title !== "notitle" && snackBarDivs.container.appendChild( snackBarDivs.title )
    snackBarDivs.container.append( snackBarDivs.style, snackBarDivs.textarea )
    let sbTextSpans = sbText.split('\n').map( textLine => createNewEle('span', { textContent: textLine }) )
    snackBarDivs.textarea.append( ...sbTextSpans )
    mainBody.appendChild(snackBarDivs.container)
    doCopy && copy(snackBarDivs.textarea.textContent)
};
async function waitForTableCells(awaitedTable) {
    return new Promise((resolve, reject) => {
        if ( awaitedTable?.querySelector('tbody tr > td:nth-child(2)') ) { resolve( awaitedTable ) }
        else {
            const observer = new MutationObserver(() => {
                if (awaitedTable?.querySelector('tbody tr > td:nth-child(2)')) {
                    observer.disconnect();
                    resolve( awaitedTable );
                };
            });
            observer.observe(awaitedTable, { childList: true, subtree: true, });
        };
    });
};
async function waitForEleWithAncestor(awaitedEleStr, anchorEle=document.body) {
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
function toggleVisible(element, trueFalse) {
    element = Array.isArray(element) ? element : element instanceof NodeList ? [...element] : [element]
    element.forEach( ele => { ele = sanitize.query(ele); ele.style.visibility = trueFalse ? 'visible' : 'hidden' } );
};
function unhideElement(element, trueFalse) { // true to remove hidden, false to add hidden;
    element = Array.isArray(element) ? element : element instanceof NodeList ? [...element] : [element]
    element.forEach( ele => { ele = sanitize.query(ele); trueFalse ? ele.classList.remove('hidden') : ele.classList.add('hidden') } );
};
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ FUNCTION_LIBRARY SECTION END /////////////////////////////////////////////////////////////////////////////////////////////
// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓

console.timeEnd('CaseWonks load time')
