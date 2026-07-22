// ==UserScript==
// @name         CaseWonks
// @namespace    http://tampermonkey.net/
// @version      0.0.24
// @description  Make CaseWorks less miserable to use.
// @author       McCormickJ
// @match        https://*.caseworkscloud.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=caseworkscloud.com
// @grant        none
// ==/UserScript==

// table changes not working on https://fsestlouis.caseworkscloud.com/Document%20Processing%20Center/Forms/AllItems.aspx?RootFolder=/Document%20Processing%20Center/JonathanMcCormick#InplviewHash0061c5ff-a299-4225-b98b-9c54eab230d9=SortField%3DSysRecID-SortDir%3DAsc-
// waitFor... does not seem to be triggering.

console.time('CaseWonks load time')
const iFramed = window.location !== window.parent.location; if (iFramed || (window.location.href.slice(-4) === ".txt") ) { return };
const mainBody = window.parent.document.body, thisPageName = window.location.pathname.split("/")?.reverse()[0].replaceAll("%20", ""),
      ribbon = document.getElementById('RibbonContainer')

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
    timeStamp(time) { return String(time)?.trim().replace(/[^apm0-9:,\/ ]/gi, '') }, // [^] = not in list //
    date(inputDate, dateTypeNeeded = "date") {
        const isDateObject = inputDate instanceof Date
        inputDate = (/^\d{6,13}$/).test(inputDate) ? parseInt(inputDate, 10) : inputDate // ms date format //
        const inputTypeof = typeof inputDate
        switch (inputTypeof) {
            case "number": if (inputDate.length === 8) { inputDate = inputDate.replace(/(\d\d)(\d\d)(\d\d\d\d)/, "$1/$2/$3") }; break;
            case "string": inputDate = inputDate.replace(/-/g, "/"); break;
        };
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
        };
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
const doClick = (element) => { element = sanitize.query(element); element?.dispatchEvent(new MouseEvent('click', { bubbles: true })) };

const caseWonksDataSet = {
    data: { ...sanitize.json( localStorage.getItem('caseWonks.data') ) } ?? {}, // set by info found on pages //
    settings: { ...sanitize.json( localStorage.getItem('caseWonks.settings') ) } ?? {}, // set by user input //
    updateInfo(dataOrSettings, infoKey, infoValue) { // keyName, newValue or "delete"
        infoValue === "delete" ? delete this[dataOrSettings][infoKey] : this[dataOrSettings][infoKey] = infoValue
        localStorage.setItem( 'caseWonks.' + dataOrSettings, JSON.stringify(this[dataOrSettings]) )
    },
};

const page = new Map([
    ['AllItems.aspx', { alias: 'AllItems', primaryTableLoc: 'td#scriptWPQ1 > table[summary="Document Processing Center"]', singleTable: 1, }],
    ['AllDPCDocuments.aspx', { alias: 'AllDpcDocs', primaryTableLoc: 'td#scriptWPQ1 > table[summary="Document Processing Center"]', singleTable: 1, }],
    ['CaseFile.aspx', { alias: 'CaseFile', primaryTableLoc: '#DPC table table.ms-listviewtable', efcTableLoc: '#scriptWPQ7' }],
    ['DocBox.aspx', { alias: 'DocBox', primaryTableLoc: 'td#scriptWPQ2 > table[summary="Document Processing Center"]', singleTable: 1, }],
    ['DocumentDiscovery.aspx', { alias: 'DocDisc', primaryTableLoc: '.ms-webpart-zone.ms-fullWidth:has(table[summary])', }],
    ['eSignDocuments.aspx', { alias: 'eSign', primaryTableLoc: 'td#scriptWPQ2 > table[summary="Document Processing Center"]', singleTable: 1, }],
    ['Home.aspx', { alias: 'Home', primaryTableLoc: 'div.ms-webpart-zone.ms-fullWidth:has(#divAPNMain)' }],
    ['PendingStatus.aspx', { alias: 'Pending', primaryTableLoc: 'td#scriptWPQ2 > table[summary="Document Processing Center"]', singleTable: 1, }],
    ['PersonalViews.aspx', { alias: 'Subs', primaryTableLoc: 'div#WebPartWPQ1', singleTable: 1 }],
    ['DocumentDiscoveryDPC.aspx', { alias: 'DocDiscDPC', primaryTableLoc: 'table[summary="Document Processing Center"]', singleTable: 1 }],
    ['author.aspx', { alias: 'Author',primaryTableLoc: 'td#scriptWPQ2 > table[summary="Document Processing Center"]', }],
    ['ViewbyDocSet.aspx', { alias: 'ViewbyDocSet',primaryTableLoc: 'td#scriptWPQ2 > table[summary="Document Processing Center"]', }],
    ['Print2NCT.aspx', { alias: 'Print', }],
    ['Scan.aspx', { alias: 'Scan' }],
    ['Subscriptions.aspx', { alias: 'Subs', primaryTableLoc: 'div#WebPartWPQ1', singleTable: 1 }],
    ['WorkingDocuments.aspx', { alias: 'WorkingDocs', primaryTableLoc: 'td#scriptWPQ1 > table[summary="Document Processing Center"]', singleTable: 1, }],
    ['ViewByFinancialServicesEdition.aspx', { alias: 'FSE', subdomain: 'fse' }],
    ['ViewBySocialServicesEdition.aspx', { alias: 'SSE', subdomain: 'sse' }],
    ['ViewByChildSupportEdition.aspx', { alias: 'CSE', subdomain: 'cse' }],
    ['ViewByMNsureEdition.aspx', { alias: 'MSE', subdomain: 'mse' }],
    // ['', { alias: '', }],
    // ['', { alias: '', }],
    // ['', { alias: '', }],
]).get(thisPageName) ?? { alias: 'general' };
mainBody.classList.add(page.alias, 'CaseWonks')
const currPageEditionCode = window.location.host.split(".")[0]?.toLowerCase()
page.alias.includes('Home') && localStorage.setItem( 'editionLocation', currPageEditionCode )
const editionLocation = ( page.hasOwnProperty('subdomain') ? page.subdomain : [ "fse", "mse", "cse", "sse", ].includes(currPageEditionCode.slice(0, 3)) ? currPageEditionCode : localStorage.getItem('editionLocation') )
const editionCode = editionLocation.slice(0, 3), countyCode = editionLocation.slice(3);

const edition = new Map([
    ['fse', { SOR: "MAXIS", caseNumFormat: new RegExp("^\\d{1,8}$"), notFound: "PRIV", docDiscSearch: "MAXIS" }],
    ['mse', { SOR: "MNSure", caseNumFormat: new RegExp("^\\d{8}$"), notFound: "Not Found", docDiscSearch: "InCase" }],
    ['cse', { SOR: "PRISM", caseNumFormat: new RegExp("^\\d{10} ?\\d{2}$"), notFound: "PRIV", }],
    ['sse', { SOR: "SSIS", caseNumFormat: new RegExp("\\d+"), notFound: "PRIV", }]
]).get(editionCode)

const docTypeSwaps = {
    notification: ["Notification - ", ""],
    parenShortcuts: ["\\([A-Za-z]+\\)$", ""],

    // Form numbers //
    fseForm: ["FSE[0-9]{1,3}[A-Z]? ", ""],
    eaForm: ["EA[0-9]{1,3}[A-Z]? ", ""],
    dhsForm: ["(?: - )?DHH?S ?[0-9]{1,6}[A-Za-z]? ?", ""],
    slfForm: ["SLF[P]?[0-9]{1,3} ", ""],
    dForm: ["D[0-9]{3} ", ""],

    // Incoming portal docs, client initiated //
    portal100: [`Portal100 General Identity "Birth Certificates, DL, Passport, Social Security Card, Immigration, Guardianship, Marriage Certification, etc\\."`, "Portal doc: ID, BC, etc."],
    portal200: [`Portal200 General Income \\"Paystubs, W2’s, Tax Returns, Employer Statements, Self- Employment, SSI, etc\\.\\"`, "Portal doc: Income"],
    portal300: [`Portal300 General Assets "Vehicle Title, Bank Statements, Life Insurance Policy, 401k Account, etc\\."`, "Portal doc: General Assets"],
    portal400: [`Portal400 General Proof of Residency "Utility Bills, Rent, Lease Agreement, Eviction Notice, Home-Owner's Insurance, etc\\."`, "Portal doc: Residency"],
    portal500: [`Portal500 General Medical "Medical Bills, Pregnancy Verification, Medical Insurance Card, Medical Opinion, Drug Test, etc\\."`, "Portal doc: Medical"],

    // Releases //
    roiEmployment: ["Authorization for Release of Employment Information", "RoI Auth: Employment"],
    roiShelter: ["Authorization for Release of Information About Residence and Shelter Expenses", "RoI Auth: Residence\/Shelter Expenses"],
    roiShare: ["Authorization to Share Information", "Auth to Share Info"],
    roiGeneral: ["General Consent\\/Authorization for Release of Information", "RoI Auth: General"],
    roiGeneral2: ["General Authorization for Release of Information", "RoI Auth: General"],

    // General //
    pictureId: ["Drivers License \\(DL\\) - State ID", "State ID"],
    eft: ["Electronic Funds Transfer", "EFT"],
    mergeMail: ["Merge For Mailing \\(Delete after Mailing or Printing\\)", "Merge for Mail - Delete"],
    miscCorr: ["Miscellaneous Correspondence \\(MC\\)", "Misc\. Correspondence"],
    privacyPrac: ["Notice of Priv Practices and Notice of Rights and Resp", "Notices: Privacy, Rights, Resp."],
    residenceOther: ["Other Residence", "Residence"],
    residence: ["Shelter\\/Residence Verification", "Residence"],
    socialSecurity: ["Social Security", "SS"],
    vetsAdmin: ["- Veterans Admin", ""],
    schoolAttend: ["Request for Verification of School Attendance/Progress", "Req for Verif of School Attendance"],

    //// FSE ////
    // CCAP //
    ccapAcrynym: ["(?:Minnesota )?Child Care Assistance( Program)?(?: \\(CCAP\\))?", "CCAP"],
    ccapBsfAcrynym: ["Basic Sliding Fee( \\(BSF\\))?", "BSF"],
    ccapRedet: ["Redetermination Form", "Redetermination"],
    ccap7054: ["MFIP\\/DWP Employment Services Child Care Request", "ES to CCAP 7054"],
    ccapEduPlan: ["SLC CCAP Education Plan 9\\.24", "CCAP Education Plan"],
    ccapMedForm: ["CCAP Medical Condition Documentation Form", "CCAP Medical Condition Doc Form"],
    ccapLnlAck: ["Parent Acknowledgement When Choosing a Legal Nonlicensed Provider", "LNL Acknowledgement"],

    // CS //
    csGc: ["Cooperation with Child Support Enforcement", "CS Good Cause"],
    csReferral: ["Referral to Support and Collections", "CS Referral"],
    csEndGc: ["Request to End Child Support Good Cause", "Request to End CS Good Cause"],

    // Fraud //
    fraudRef: ["Fraud Prevention Investigation Referral", "FPI Referral"],
    fraudFound: ["SUMMARY OF INVESTIGATIVE FINDINGS", "Summary of Investigative Findings"],

    // HC //
    hcMHCP: ["(?:MHCP \\()?Minnesota Health Care Programs(?:\\))?", "MHCP"],
    hcApp: ["HC Application for Certain Populations", "HC App for Certain Pops"],
    hcRenew: ["Combined Annual Renewal For Certain Populations", "Combined Renewal for Certain Pops"],
    hcCEHI: ["Determination of Cost Effectiveness", "Determination of CEHI"],
    hcFCA: ["Families with Children and Adults", "FCA"],
    hcLiquidAssets: ["Liquid Assets\\(Bank, Credit Union, Stocks, Bonds, etc\\)", "Liquid Assets (Bank, stocks, etc.)"],
    hcMaFCA: ["Medical Assistance for Families with Children and Adults \\(MA-FCA\\)", "MA-FCA"],
    hcNewMember: ["New Household Member or Applicant Request Form", "HC: New HH Member/Applicant Request"],
    hcFinInfoAuth: ["Obtain Financial Information from the Asset Verification Service", "Auth to Obtain Financial Info from AVS"],
    hcLtcRenew: ["Renewal for People Receiving Long-Term Care Services", "Renewal for People Receiving LTC"],

    // FNW //
    fnwSudTreatVerif: ["General Assistance Verifying Participation in Substance Use Disorder Treatment", "GA Verifying Partic. in SUD Treatment"],
    fnwNonSSI: ["Interim Assistance Authorization \\(non-SSI\\)", "Non-SSI Interim Assist. Auth"],
    fnwSSI: ["SSI Interim Assistance Authorization", "SSI Interim Assist. Auth"],

    // LTC //
    ltcCommForm: ["Lead Agency Assessor/Case Manager/Worker LTC Communication Form", "LTC Communication Form"],

    // SNAP/Cash //
    fsCaf: ["Combined Application Form \\(CAF\\)", "Combined Application"],
    fsCafAddendum: ["Combined Application - Addendum \\(Cash and Supplemental Nutrition Assistance Program\\)", "CAF Addendum - SNAP/Cash"],
    fsSnapAcrynym: ["(?:the )Supplemental Nutrition Assistance Program(?: \\(SNAP\\))?", "SNAP"],
    fsMfipAcrynym: ["Minnesota Family Investment Program \\(MFIP\\)", "MFIP"],
    fsLateRenew: ["Notice of Late or Incomplete Household Report Form Health Care Renewal Form or Combined Six-Month Report", "Notice of late HRF, HCR, CSMR"],
    fsAssets: ["Signed Personal Statement about Assets for MFIP,DWP,GA,MSA, and GRH Programs", "Assets Statement form"],
    fsEsReferral: ["Employment Services$", "ES Referral"],
    fsSchoolVer: ["School Attendance Verification", "School Attend Ver."],

    // MSE //
    mseAddNewborn: ["RG3F012 IM MNS R3 3907C Add a Newborn", "Add a Newborn"],
    mseAddMember: ["RG3F011 IM MNS R3 3907B Add a New Household Member", "Add a New HH Member"],
    mseCertainPopElig: ["Request for Information to Determine Eligibility for Certain Populations", "Req for Info to Determine Elig for Certain Pops"],
    mseAuthRep: ["Giving Permission for Someone to Act on My Behalf", "Auth Rep (HC)"],
    mseMhcpIfo: ["MHCP Information Needed for Reported Changes", "MHCP Info Needed"],
    // groupName: ["", ""],
};
const docTypeRegExp = new RegExp( Object.entries(docTypeSwaps).map(([group, [regExPattern,]=[]] = []) => "(?<"+group+">"+regExPattern+")").join("|"), "g" )

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
    ["Confirmation Number", "Conf#"],
    ["Integrated Case", "Int#"],
    // ["", ""],
    // ["", ""],
    // ["", ""],
]);
const patterns = {
    byEmailSpace: '(?:by [A-Za-z0-9_.+-]+\\@[A-Za-z]+\\.[A-Za-z]{2,4}[\\s\\\xA0])?',
    emailSpace: '[A-Za-z0-9_.+-]+\\@[A-Za-z]+\\.[A-Za-z]{2,4}[\\s\\\xA0]',
    date: '[0-9]{1,2}\\/[0-9]{1,2}\\/[0-9]{1,4}',
    time: '[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2} [AP]M',
    phone: '1?[0-9]{10}',
    faxAgain: '(?: \\+?1?[0-9]{3}-?[0-9]{3}-?[0-9]{4})?',
};
const shortNoteSwaps = { // Assume the space after an email address is not a whitespace character and use [\s\\xA0] instead. //
    mnbConf: ["[0-9]{10}_[A-Z0-9_]+_", ""],
    itemId: ["Item ID\\:[0-9]+ not found\\.", ""],
    inclDHS: [" incl DHS ?[0-9]{4}\\w?$", ""],
    oldDHSform: [" - DHS ?[0-9]{4}\\w?$", ""],
    movedCopied: ["(Moved|Copied) from ([A-Z]{3})(?: [A-Za-z. ]+) " + patterns.byEmailSpace + "on (" + patterns.date + ") " + patterns.time, "$1: $2, $3"],
    // movedCopied: ["(Moved|Copied) from ([A-Z]{3})(?: [A-Za-z. ]+) " + patterns.byEmailSpace + "on (" + patterns.date + ") " + patterns.time, "$1 from $2 on $3"],
    sentPubPort: ["Document uploaded via Public Portal on " + patterns.date + " " + patterns.time + " " + patterns.byEmailSpace + "and retrieved by Portal Integration on (" + patterns.date + ") " + patterns.time, (fullStr, dateMatch) => "Rec'd: Portal " + dateFuncs.formatDate(dateMatch, "mdyy") ],
    checkedIn: ["Document was checked-in by System at (" + patterns.date + ") " + patterns.time + "\\.", (fullStr, dateMatch) => "Checked-in " + dateFuncs.formatDate(dateMatch, "mdyy") + "."],
    recdPubPort: ["Public Portal - " + patterns.emailSpace + "was sent this on (" + patterns.date + ") " + patterns.time, (fullStr, dateMatch) => "Sent: Portal " + dateFuncs.formatDate(dateMatch, "mdyy") ],
    sysAcctRecd: ["A[0-9]{9,10}_([A-Z]+)[0-9_]+(?:[A-Za-z]+_)?(?:doc\\dof\\d)?\\.(\\w{3,4}) by System Account on (" + patterns.date + ") " + patterns.time, "$1 $2 rec'd: $3"],
    doc_of_: ["[0-9]{9,10}_doc\\dof\\d__", ""],
    recdVia: ["\\.Received via", ". Rec'd: "],
    sentVia: ["\\.Sent via", ". Sent: "],
    // faxTo: ["\\*TO:[\\s\\\xA0]*\\+?" + patterns.phone + " ", ""],
    faxToFrom: ["\\*TO:[\\s\\\xA0]*\\+?" + patterns.phone + " FROM:[\\s\\\xA0]*(" + patterns.phone + ")" + patterns.faxAgain + "(?: eFax)?", "Fax: $1."],
    // faxFrom: ["FROM:[\\s\\\xA0]*(" + patterns.phone + ")" + patterns.faxAgain, "Fax: $1."],
    webDoc: ["^Web$", "(Website import)"],
    autoCopy: ["Auto-Copy from ([A-Z]{3}): (?:SSN|MAXIS) match", "Auto-copy ($1)"],
    // groupName: ["", ""],
};

const taxonomySwaps = new Map([
    [ "1.1 IM - Enumeration-Identity", "1.1\xA0Identity" ],
    [ "1.2 IM - Confidential-Medical", "1.2\xA0Conf.\xA0Med." ],
    [ "1.21 IM - Substance Use Disorder", "1.21 Subs\xA0Use\xA0Dis" ],
    [ "1.3 IM - File Retention Data", "1.3\xA0File\xA0Retent." ],
    [ "1.31 IM - Misc. County Specific", "1.31\xA0Own\xA0Docs" ],
    [ "1.32 IM - Fraud", "1.32\xA0Fraud" ],
    [ "1.33 IM - Collections and Overpayments", "1.33 Overpayments" ],
    [ "1.4 IM - Application", "1.4\xA0IM\xA0Apps" ],
    [ "1.5 IM - Income", "1.5\xA0Income" ],
    [ "1.6 IM - Assets", "1.6\xA0Assets" ],
    [ "1.7 IM - Residency", "1.7\xA0Residency" ],
    [ "1.8 IM - Other Dept Comm", "1.8\xA0IM\xA0Comms" ],
    [ "1.81 IM - Child Support", "1.81\xA0CS" ],
    [ "1.82 IM - LTC-GRH", "1.82\xA0LTC-GRH" ],
    [ "1.83 IM - ES", "1.83\xA0Emp\xA0Svcs" ],
    [ "1.9 IM - Insurance-Correspondence", "1.9\xA0Ins-Corr" ],
    [ "1.91 IM - Misc-Bulk Scanning", "1.91\xA0Misc\xA0Bulk" ],
    [ "2.0 SA - Subsidized Adoption", "2.0 Sub\xA0Adoption" ],
    [ "2.1 SA - Citizenship-Identity", "2.1 Adoption\xA0Identity" ],
    [ "2.2 SA - Application", "2.2 Adoption\xA0Apps" ],
    [ "2.3 SA - Child Support", "2.3 Adoption\xA0CS" ],
    [ "2.4 SA - Miscellaneous", "2.4 Adoption\xA0Misc" ],
    [ "3.0 FC - Foster Care", "3.0 Foster\xA0Care" ],
    [ "3.1 FC - Citizenship-Identity", "3.1 Foster\xA0Identity" ],
    [ "3.2 FC - App-Income-Assets", "3.2 Foster\xA0App+" ],
    [ "3.3 FC - Court Orders", "3.3 Foster Court\xA0Orders" ],
    [ "3.4 FC - Placement Form", "3.4 Foster Placements" ],
    [ "3.5 FC - Child Support", "3.5 Foster\xA0CS" ],
    [ "3.6 FC - Placement Fee", "3.6 Foster Placement\xA0Fees" ],
    [ "3.7 FC - Miscellaneous", "3.7 Foster Misc" ],
    [ "4.0 CCAP - Provider Files", "4.0 CCAP Provider\xA0Files" ],
    [ "4.1 CCAP - Providers Reg", "4.1 CCAP Provider\xA0Reg" ],
    [ "4.2 CCAP - Credentials", "4.2 CCAP Provider\xA0Creds" ],
    [ "4.3 CCAP - Provider Rates", "4.3 CCAP Provider\xA0Rates" ],
    [ "5.0 CCAP - Child Care Assistance", "5.0\xA0CCAP" ],
    [ "5.1 CCAP - Enumeration-Identity", "5.1 CCAP\xA0Identity" ],
    [ "5.2 CCAP - File Retention", "5.2\xA0CCAP Own\xA0Docs" ],
    [ "5.3 CCAP - Application", "5.3\xA0CCAP\xA0Apps" ],
    [ "5.4 CCAP - Authorized Activity", "5.4\xA0CCAP\xA0Act." ],
    [ "5.5 CCAP - Child Support", "5.5 CCAP\xA0CS" ],
    [ "5.6 CCAP - Child Provider", "5.6 CCAP Child\xA0Provider" ],
    [ "6.0 KA - Kinship Assistance", "6.0 Kinship\xA0Assist." ],
    [ "6.1 KA - Citizenship-Identity", "6.0 Kinship\xA0Identity" ],
    [ "6.2 KA - Application", "6.2 Kinship\xA0Apps" ],
    [ "6.3 KA - Child Support", "6.3\xA0Kinship\xA0CS" ],
    [ "6.4 KA - Court Documents", "6.4 Kinship \xA0 Docs" ],
    [ "6.5 KA - Miscellaneous", "6.5 Kinship\xA0Misc" ],
]);

const shortNoteRegExp = new RegExp( Object.entries(shortNoteSwaps).map(([group, [regExPattern,]=[]] = []) => "(?<"+group+">"+regExPattern+")").join("|"), "g" )
const tableLocQuery = (loc) => mainBody.querySelector(page[loc]);
const modifiedTables = [];

const gbl = {
    eles: {
        navContainer: createNewEle('div', { id: "caseWonksNavBar", style: "line-height: 26px; display: flex; gap: 20px; align-items: center; position: fixed; left: 250px; top: 4px; z-index: 990;", }),
        homePageLink: createNewEle('a', { textContent: "Home Page", style: "font-size: 14px; color: light-dark(#106EBE, #82caff) !important; font-weight: 600; text-decoration: none; cursor: pointer;", }),
        newTabFieldDiv: createNewEle('div', { id: "newTabFieldDiv", style: "display: inline-block;" }),
        newTabField: createNewEle('input', { id: "newTabField", autocomplete:"off", classList: "form-control", placeholder: "Case #", pattern: "^[0-9]{1,12}$", style: "width: 13ch;" }),
        caseDocsNewTabButton: createNewEle('button', { textContent: "GO", style: "line-height: inherit; padding: 0 8px; margin-left: 10px; min-width: unset; font-size: 10px", }),
        caseHistory: createNewEle('datalist', { id: "caseHistory", style: "visibility: hidden;" }),
        caseWonksVersion: createNewEle('div', { id: "caseWonksVersion", textContent: GM_info.script.name + ' v' + GM_info.script.version }),
        clickedCount: createNewEle('span', { id: "clickedCount" })
    },
    refVars: {
        currentTbody: undefined, primaryTableLoc: undefined, efcTableLoc: undefined,
        highlight: { selectedClass: "" },
    },
};

const caseData = (() => { // used for case history and fixing page title // fse, mse correct //
    if (page.alias !== "CaseFile") { return };
    let caseIdNameEle = document.querySelector('h1:not(#pageTitle)')
    let splitCaseData = (() => {
        if (!caseIdNameEle) { return { caseNum: undefined, caseName: undefined } };
        if ( caseIdNameEle.textContent.includes("Client Detail Not Found In Repository For Case ") ) { return { caseNum: caseIdNameEle.textContent.split("Client Detail Not Found In Repository For Case ")[1], caseName: edition.notFound } }
        switch(editionCode) {
            case "fse": return caseIdNameEle.textContent.match(/(?<title>[A-Z ]+:) (?<caseNum>[0-9 ]+) (?<caseName>[A-Z'\-, ]+)/i).groups;
            case "mse": return caseIdNameEle.textContent.match(/(?<title>[A-Z ]+:) (?<caseName>[A-Z'\-, ]+) \((?<caseNum>[0-9]{8})\)/i).groups;
            case "cse": return { caseNum: undefined, caseName: undefined };
            case "sse": return { caseNum: undefined, caseName: undefined };
            default: return { caseNum: undefined, caseName: undefined };
        };
    })();
    if (!splitCaseData.caseNum) { return { caseNum: undefined, caseName: undefined } };
    if (["fse", "mse", ].includes(editionCode)) {
        splitCaseData.caseNum = parseInt(splitCaseData.caseNum, 10)
        let caseIdNameEleReplacement = createNewEle('h1', { style: 'display: flex; gap: 10px;' }), caseNumEle = createNewEle('div', { textContent: splitCaseData.caseNum, title: "Left click to copy #. Right click to open on Doc Disc." })
        splitCaseData.caseName !== edition.notFound
            ? caseIdNameEleReplacement.append( createNewEle('div', { textContent: splitCaseData.title }), caseNumEle, createNewEle('div', { textContent: splitCaseData.caseName }) )
        : caseIdNameEleReplacement.append( createNewEle('div', { textContent: "Client Detail Not Found In Repository For Case " }), caseNumEle )
        caseIdNameEle.replaceWith( caseIdNameEleReplacement );

        caseNumEle.addEventListener('click', clickEvent => snackBar(clickEvent.target.textContent) );
        caseNumEle.addEventListener('contextmenu', () => { window.open("https://" + editionCode + countyCode + ".caseworkscloud.com/CWRF/Document%20Discovery.aspx?" + edition.docDiscSearch + "=" + splitCaseData.caseNum, "_blank") } );
    };
    return splitCaseData;
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
        gbl.eles.navContainer.append( gbl.eles.homePageLink )
        gbl.eles.homePageLink.addEventListener('click', () => { window.open("https://" + editionCode + countyCode + ".caseworkscloud.com/", "_self") });
        gbl.eles.homePageLink.addEventListener('contextmenu', contextmenuEvent => { contextmenuEvent.preventDefault(); window.open("https://" + editionCode + countyCode + ".caseworkscloud.com/", "_blank"); });
    }();
    !function addVersion() {
        mainBody.querySelector('#RibbonContainer-TabRowRight').append( gbl.eles.caseWonksVersion )
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
                    if (!caseData.caseNum) { return };
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
                        if ( (/(?:[0-9 ]|ArrowLeft|ArrowRight|Backspace|Delete|Home|End|Tab)/).test(keydownEvent.key) || ( keydownEvent.ctrlKey && ['v', 'a', 'x', 'c', 'z'].includes(keydownEvent.key) ) ) { return }; // valid keys, don't do anything //
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
!function pageSpecificChanges() {
try {
!function AllItems() {
    if (page.alias !== "AllItems") { return };
    countDocs()
    //slider to hide pending?
}();
!function CaseFile() {
    if (page.alias !== "CaseFile" || !caseData.caseNum) { return };
    !function fixPageTitle() {
        document.querySelector('title').textContent = caseData.caseName + " - " + caseData.caseNum
    }();
    Array.from(document.querySelectorAll('td:has(>a[href="javascript:"])'), td => {
        let tdTextChild = td.childNodes[1], tdTaxText = tdTextChild.textContent.replace(":", "").trim(), taxSwapMatch = taxonomySwaps.get(tdTaxText)
        if (!taxSwapMatch) { return };
        tdTextChild.textContent = " : " + taxSwapMatch + " "
    });
}();
!function DocBox() {
    if (page.alias !== "DocBox") { return };
    countDocs()
    //slider to hide pending?
}();
!function DocDisc() {
    if (page.alias !== "DocDisc") { return };
    mainBody.querySelector('.GoTd')?.removeAttribute('rowspan')
    document.head.append( createNewEle('style', { textContent: ".DDTable { & td:not(:has(input, a)) { text-align: right; } & td:has(select) { padding: 0 !important; } td.GoTd { position: unset; margin: 0; } } h2 { display: flex; gap: 40px; align-items: center; padding: 0 3px !important; & > a { border: none !important; } }" }) )

    const dpcH2 = document.querySelector('h2.ms-webpart-titleText:has(>a[href="/Document%20Processing%20Center"])')
    const fromCaseFile = document.referrer.includes("https://" + editionCode + countyCode + ".caseworkscloud.com/CWRF/Case%20File.aspx") ? "checked" : ""

    gbl.eles.hideNotificationsSlider = createSlider({ textContent: "Hide Notifications", title: "Show or Hide 'Notification' rows.", checked: fromCaseFile, id: "hideNotificationsSliderCheck" })
    gbl.eles.hideNotifications = fromCaseFile === "checked" ? createNewEle('style', { textContent: ".hideNotifications { display: none; }" }) : createNewEle('style', { textContent: "" })
    gbl.eles.hideNotificationsSlider.addEventListener('click', clickEvent => { toggleSliderVisibility(clickEvent.target.checked, "hideNotifications") });

    gbl.eles.hideDeletedSlider = createSlider({ textContent: "Hide Deleted", title: "Show or Hide 'DeletedDPC' rows.", checked: "checked", id: "hideDeletedSliderCheck" })
    gbl.eles.hideDeleted = createNewEle('style', { textContent: ".hideDeleted { display: none; }" })
    gbl.eles.hideDeletedSlider.addEventListener('click', clickEvent => { toggleSliderVisibility(clickEvent.target.checked, "hideDeleted") });

    mainBody.append(gbl.eles.hideNotifications, gbl.eles.hideDeleted)
    gbl.eles.navContainer?.append(gbl.eles.hideNotificationsSlider, gbl.eles.hideDeletedSlider)

    setTimeout(() => {
        !!window.location.search && document.querySelector('.dpcTableLoc')?.scrollIntoView({ inline: "start" })
        if (document.querySelectorAll('.hideNotifications').length) { selectNotifications() };
    }, 500);

    function selectNotifications() {
        gbl.eles.selectNotifications = createNewEle('button', { type: "button", textContent: "Select Notifications", style: "color: light-dark(#222, #efefef);" })
        dpcH2.append(gbl.eles.selectNotifications)
        gbl.eles.selectNotifications.addEventListener('click', () => {
            document.querySelector('.s4-itm-selected') && doClick(document.querySelector('.s4-itm-selected'))
            Array.from( document.querySelectorAll('.hideNotifications:not(.s4-itm-selected, .hideDeleted)'), tr => doClick(tr.children[0]) )
        });
    };

}();
!function eSign() {
    if (page.alias !== "eSign") { return };
    countDocs()
}();
!function HomePage() {
    if (page.alias !== "Home") { return };
    !function shrinkHomePageMessage() {
        const messageTr = mainBody.querySelector('.ms-rtestate-field > div')?.closest('tr')
        if (messageTr && (/^[\u200b\n]+$/).test(messageTr.innerText)) { messageTr.style.display = "none" } // ​ is copied from the page // unicode is \u200b // (/^​\n+​$/) //
        else {
            Array.from(mainBody.querySelectorAll('.ms-rtestate-field div'))?.filter(div => div.textContent.length < 5)?.forEach( emptyDiv => emptyDiv.remove() )
        };
    }();
    // !function shrinkHomePageMessage() { Array.from(mainBody.querySelectorAll('.ms-rtestate-field div'))?.filter(div => div.textContent.length < 5)?.forEach( emptyDiv => emptyDiv.remove() ) }();
    !function setUserName() {
        const userName = mainBody.querySelector('.ms-webpart-chrome:has(span[title="My DocBox - Document Processing Center library"]) table table tbody[groupstring]').getAttribute('groupstring').replaceAll('%3B%23', '')
        caseWonksDataSet.updateInfo("data", "userName", userName)
    }();
}();
!function Scan() {
//     if (page.alias !== "Scan") { return };
//     !function updateFieldsForCCAP() {
//         const scanEles = {
//             docType: { ele: document.getElementById("ctl00_PlaceHolderMain_DocType_ctl00_TextField"), value: "FSE774 CCAP-Wkr Income Calc" },
//             docBox: { ele: document.getElementById("ctl00_PlaceHolderMain_DocBox_DropDownChoice") },
//             fileToEFC: { ele: document.getElementById("ctl00_PlaceHolderMain_File_x0020_to_x0020_EFC_DropDownChoice"), value: "Yes" },
//             shortNote: { ele: document.getElementById("ctl00_PlaceHolderMain_Short_x0020_Note_x002F_Next_x0020_Step_ctl00_TextField") },
//         };
//         // triggerFnOnSelectChange(scanEles.docBox.ele, checkAndUpdateFields)
//         verbose(scanEles.docBox.ele.value)
//         scanEles.docBox.ele.addEventListener('change', checkAndUpdateFields)
//         function checkAndUpdateFields(changeEvent) {
//             verbose(changeEvent.isTrusted)
//             // if (changeEvent.isTrusted) { return };
//             if (scanEles.docType.ele.value === scanEles.docType.value) {
//                 if (caseWonksDataSet?.data.userName) { scanEles.docBox.ele.value = caseWonksDataSet.data.userName };
//                 scanEles.fileToEFC.ele.value = scanEles.fileToEFC.value
//                 scanEles.shortNote.ele.select()
//             };
//         };
//     }();
}();
!async function Subs() {
    if (page.alias !== "Subs") { return };
    const compareOpenButton = createNewEle('button', { type: "button", textContent: "Compare" }),
          compareResetButton = createNewEle('button', { type: "button", textContent: "Reset", style: "display: none;" }),
          hideButtonContainer = createNewEle('div', { style: "display: flex; gap: 5px;" }),
          hideMatchedButton = createNewEle('button', { textContent: "Hide Matched", id: "hideMatched" }, { hiding: "no" }),
          hideMatchedStyle = createNewEle('style', { textContent: "tr:is(.compareMatch, .newEntry) { display: none !important; } #hideMatched { color: red !important; } #hideWarning { display: block !important; }" }),
          hideUnmatchedButton = createNewEle('button', { type: "button", textContent: "Hide Unmatched", id: "hideUnmatched" }, { hiding: "no" }),
          hideUnmatchedStyle = createNewEle('style', { textContent: "tr:is(.unmatched, .duplicateMatch) { display: none !important; } #hideUnmatched { color: red !important; } #hideWarning { display: block !important; }" }),
          hideWarning = createNewEle('span', { textContent: "Don't drag-down while hiding rows.", id: "hideWarning", style: "display: none;" }),
          compareDialog = createNewEle('dialog', { id: "compareDialog" }),
          compareTextarea = createNewEle('textarea', { id: "compareTextarea" }),
          compareOkButton = createNewEle('button', { type: "button", textContent: "OK" }),
          compareCancelButton = createNewEle('button', { type: "button", textContent: "Cancel" }),
          compareContainer = createNewEle('div', { style: "max-width: 200px; display: none; position: fixed; right: 5vw; top: 15vh; flex-direction: column; gap: 10px;" }),
          dupeCaseContainer = createNewEle('div', { textContent: "Duplicate List:" }), dupeCaseList = createNewEle('div', { style: "margin-left: 5px;"}),
          colorCoding = createNewEle('div', { textContent: "Color legend:"}),
          uniqueCases = createNewEle('div'), matchedCount = createNewEle('div'),
          compareMissingContainer = createNewEle('div', { textContent: "Missing Case Numbers:" }),
          compareMissingList = createNewEle('div', { style: "margin-left: 5px;"})

    gbl.eles.navContainer.append( ...arrangeElements(
        [createNewEle('div', { style: "display: flex; gap: 5px;" }), [ compareOpenButton, compareResetButton ],
        ]) );
    hideButtonContainer.append( hideMatchedButton, hideUnmatchedButton );
    mainBody.append(
        ...arrangeElements(
            [createNewEle('style', { textContent: "@scope (#compareDialog) { :scope { dialog[open] { display: flex; flex-direction: column; gap: 10px; } textarea { width: 600px; height: 400px; } } } #scriptWPQ1 table tbody tr { font-weight: 550 !important; } .newEntry {&,& * { color: light-dark(#339f33, #76f776) !important; }} .compareMatch {&,& * { color: light-dark(#a36139, #ffa700) !important; }} .duplicateMatch {&,& * { color: light-dark(#ee0000, #ff2626) !important; }}" }),
             compareDialog,
             [createNewEle('div', { textContent: "Paste list of cases, comma separated." }),
              compareTextarea,
              createNewEle('div', { style: "display: flex; gap: 10px; justify-content: center; margin-top: 15px;" }),
              [compareOkButton,
               compareCancelButton
              ],
             ],
             compareContainer,
             [colorCoding,
              [createNewEle('div', { style: "margin-left: 5px; font-weight: 550;" }),
               [createNewEle('div', { classList: 'compareMatch', textContent: 'Case # Found' }),
                createNewEle('div', { classList: 'duplicateMatch', textContent: 'Duplicate Entry' }),
                createNewEle('div', { classList: 'newEntry', textContent: 'Newer Entry' }),
                createNewEle('div', { textContent: 'Not matched' })
               ],
              ],
              dupeCaseContainer,
              [dupeCaseList,
              ],
              uniqueCases,
              matchedCount,
              compareMissingContainer,
              [compareMissingList,
              ],
             ],
            ])
    );
    let today = Date.now()
    const tableAncestorLocator = async () => await waitForTableCells(mainBody.querySelector('#scriptWPQ1'))
    verbose(tableAncestorLocator)
    let tableAncestor = await tableAncestorLocator()
    verbose(tableAncestor)
    const tableLocator = async () => waitForTableCells(tableAncestor.querySelector('table[summary="Subscription"].ms-listviewtable > tbody'))
    let existingTable = await tableLocator()
    // const locateTable = async () => await waitForTableCells(tableAncestor.querySelector('table[summary="Subscription"].ms-listviewtable > tbody'))
    const rowMap = new Map()
    const editLinkText = () => tableAncestor.querySelector('#Hero-WPQ1 .ms-heroCommandLink[title="Edit this list using Quick Edit mode."], #Hero-WPQ1 .ms-heroCommandLink[title="Stop editing and save changes."]').textContent.toUpperCase()
    monitorForTableDestruction(existingTable)
    function monitorForTableDestruction(existingTable) {
        const waitForOldTableToBeDestroyed = new MutationObserver(async () => {
            if (existingTable.isConnected) { return };
            existingTable = await tableLocator()
            modifyDocumentTables(existingTable)
            if (!rowMap.size) { return };
            checkForDuplicateSubs(true)
        });
        waitForOldTableToBeDestroyed.observe(tableAncestor, { childList: true, subtree: true });
    };
    function setVarsBasedOnEditMode(editMode, tr) {
        switch(editMode) {
            case "EDIT": return { caseIdNum: tr?.children[4]?.textContent?.trim(), entryDate: tr?.children[6]?.textContent?.trim() };
            case "STOP": return { caseIdNum: tr?.children[3]?.textContent?.trim(), entryDate: tr?.children[5]?.textContent?.trim() };
        };
    };
    async function checkForDuplicateSubs(followWithOkEvent) {
        dupeCaseList.replaceChildren()
        const caseListTrs = Array.from( existingTable?.querySelectorAll('tr:not(.ms-viewheadertr)') )
        const editMode = editLinkText()
        rowMap.clear()
        caseListTrs.forEach(tr => {
            let caseIdNum = setVarsBasedOnEditMode(editMode, tr).caseIdNum
            if (!testCaseNum(caseIdNum)) { return };
            if (rowMap.has(caseIdNum)) {
                tr.classList.add('duplicateMatch')
                dupeCaseList.append( createNewEle('div', { textContent: caseIdNum }) )
                return;
            };
            rowMap.set(caseIdNum, tr)
        });

        uniqueCases.textContent = "Unique Count: " + rowMap.size
        compareContainer.style.display = "flex"
        if (followWithOkEvent) { okEvent() };
    };
    compareOpenButton.addEventListener('click', () => {
        compareDialog.showModal()
        checkForDuplicateSubs()
        compareResetButton.style.display = "block"
    });
    compareResetButton.addEventListener('click', () => {
        Array.from( existingTable.querySelectorAll('tr:is(.duplicateMatch, .compareMatch, .newEntry, .unmatched)'), ele => ele.classList.remove('duplicateMatch', 'compareMatch', 'newEntry', 'unmatched') );
        compareMissingList.replaceChildren()
        dupeCaseList.replaceChildren();
        compareResetButton.style.display = "none"
        compareContainer.style.display = "none"
        hideButtonContainer.remove()
        matchedCount.textContent = ""
        rowMap.clear()
    });
    hideButtonContainer.addEventListener('click', ({ target: clickedButton } = {}) => {
        switch(clickedButton) {
            case hideMatchedButton: {
                if (hideUnmatchedButton.dataset.hiding === "yes") { return };
                if (hideMatchedButton.dataset.hiding === "no") {
                    document.head.append(hideMatchedStyle); clickedButton.dataset.hiding = "yes"
                } else {
                    hideMatchedStyle.remove(); clickedButton.dataset.hiding = "no"
                };
                return;
            }
            case hideUnmatchedButton: {
                if (hideMatchedButton.dataset.hiding === "yes") { return };
                if (hideUnmatchedButton.dataset.hiding === "no") {
                    document.head.append(hideUnmatchedStyle);
                    clickedButton.dataset.hiding = "yes"
                } else {
                    hideUnmatchedStyle.remove(); clickedButton.dataset.hiding = "no"
                };
                return;
            }
            default: break;
        };
    });
    function okEvent() {
        if (!compareTextarea?.value) { compareDialog.close(); return };
        if ( (/[^0-9, ]/).test(compareTextarea.value) ) { alert("List contains invalid characters. Only numbers, commas, and spaces allowed."); return };
        let missingCasesFromPasted = []
        let pastedCaseList = compareTextarea.value?.trim().split(/, ?/)?.filter(e => e)
        pastedCaseList.forEach(caseNum => {
            let matchedRow = rowMap.get(caseNum)
            if (!matchedRow) {
                missingCasesFromPasted.push(caseNum)
                return;
            };
            matchedRow?.classList.add('compareMatch')
        });
        compareDialog.close()
        compareMissingList.replaceChildren()
        compareMissingList.append(...missingCasesFromPasted.map(caseNum => createNewEle('div', { textContent: caseNum }) ))
        matchedCount.textContent = "Match Count: " + (pastedCaseList.length - missingCasesFromPasted.length) + '/' + pastedCaseList.length
        const editMode = editLinkText()
        Array.from(existingTable.querySelectorAll('tr:not(.compareMatch, .duplicateMatch, .ms-viewheadertr)'), tr => {
            let entryDate = Date.parse(setVarsBasedOnEditMode(editMode, tr).entryDate)
            if ((today - entryDate) < 2592000000) { tr.classList.add('newEntry') } // less than 30 days
            else { tr.classList.add('unmatched') }
        });
        gbl.eles.navContainer.append(hideButtonContainer)

    };
    compareTextarea.addEventListener('keydown', keydownEvent => { if (keydownEvent.key === "Enter") { keydownEvent.preventDefault(); okEvent(); } })
    compareOkButton.addEventListener('click', okEvent);
    compareCancelButton.addEventListener('click', () => { compareDialog.close(); });
}();
// Scan, Subscription:
// 	Next to DocBox dropdown: Add a button with user's name which onclick changes dropdown to username?
} catch(err) { console.info(err) };
}();
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ PAGE_SPECIFIC SECTION END /////////////////////////////////////////////////////////////////////////////////////////////
// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓

// Merge for Mailing (adding to output):
// 	#ribbon > mergeForMailing.click() => observe for window (form[action="/_layouts/15/NCT.Document.Merge/MergeDoumentsPreview.aspx?IsDlg=1"])
// 		Add buttons with stock text to be entered in textarea#InstructionstoClient, such as:
// 			The Referral to Support and Collections form is required to be completed for CCAP eligibility.
// 			The Client Statement of Good Cause form is only required if you wish to make a good cause claim for not cooperating with child support for reasons listed on the form.

// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓
// ////////////////////////////////////////////////////////////////////////////// TABLE_FUNCTIONS SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
function foldableCodeStorageArea() {
// if (editionCode === "fse") {
// } else if (editionCode === "mse") {
// } else if (editionCode === "cse") {
// } else if (editionCode === "sse") {
// };
// editionCode === "fse" ? ''
// : editionCode === "mse" ? ''
// : editionCode === "cse" ? ''
// : editionCode === "sse" ? ''
// : ''
// let x = (() => {
//     switch(editionCode) {
//         case "fse": return;
//         case "mse": return;
//         case "cse": return;
//         case "sse": return;
//         default: return {};
//     }
// })();
};
const copySymbol = () => createNewEle('span', { textContent: ' ❐', style: 'padding-left: 2px; cursor: pointer;', onclick: function(clickEvent) { clickEvent.preventDefault(); snackBar(clickEvent.target.previousElementSibling?.textContent, "Copied", true); clickEvent.target.style.filter = 'invert(1)'; setTimeout(() => { clickEvent.target.style.filter = "unset"; }, 2000); }, })
let lastCaseNum = ""
async function mainTableVariables(tr) {
    let checkbox, title, name, uselessMenu, firstName, lastName, shortNote, docBoxCaseNum, docBox, createdDate, createdBy, receivedDate, taxonomy, modifiedDate, modifiedBy, birthDate, reviewed, intCase, mnsureId
    switch(editionCode) {
        case "fse":
            if (["Home"].includes(page.alias)) { [ checkbox,,, title, name, uselessMenu, firstName, lastName, shortNote, docBoxCaseNum, taxonomy, createdDate, receivedDate, createdBy ] = tr.children };
            if (["CaseFile"].includes(page.alias)) { [,,, title, name, uselessMenu, firstName, lastName, shortNote,, taxonomy, createdDate, receivedDate, createdBy ] = tr.children };
            if (["AllItems", "Pending", "WorkingDocs",].includes(page.alias)) { [ checkbox,,, reviewed, title, name, uselessMenu, firstName, lastName, shortNote, docBoxCaseNum, taxonomy, createdDate, createdBy ] = tr.children };
            if (["DocBox"].includes(page.alias)) { [ checkbox,,, reviewed, title, name, uselessMenu, firstName, lastName, shortNote, docBoxCaseNum, taxonomy, createdDate, receivedDate, createdBy ] = tr.children };
            if (["eSign"].includes(page.alias)) { [ checkbox,,, title, name, uselessMenu, firstName, lastName,, shortNote, docBoxCaseNum, taxonomy,,, modifiedDate, modifiedBy ] = tr.children };
            if (["AllDpcDocs"].includes(page.alias)) { [ checkbox,,,, title, name, uselessMenu, firstName, lastName,, shortNote, docBoxCaseNum ] = tr.children };
            if (["DocDisc"].includes(page.alias)) { [ checkbox,, title, name,, firstName, lastName, docBox, shortNote, docBoxCaseNum,,, birthDate, taxonomy, createdDate, receivedDate ] = tr.children };
            if (["Subs"].includes(page.alias)) {
                switch(mainBody.querySelector('#scriptWPQ1 #Hero-WPQ1 .ms-heroCommandLink[title="Edit this list using Quick Edit mode."], #Hero-WPQ1 .ms-heroCommandLink[title="Stop editing and save changes."]').textContent.toUpperCase()) {
                    case "EDIT": [,,,,,, createdDate, modifiedDate, modifiedBy ] = tr.children; break;
                    case "STOP": [,,,,, createdDate, modifiedDate, modifiedBy ] = tr.children; break;
                };
            };
            break;
        case "mse":
            if (["Home"].includes(page.alias)) { [ checkbox,,, title, name, uselessMenu, firstName, lastName, shortNote, intCase, mnsureId, docBoxCaseNum, taxonomy, createdDate, receivedDate, createdBy ] = tr.children };
            if (["CaseFile"].includes(page.alias)) { [,,, title, name, uselessMenu, firstName, lastName, shortNote,,,, taxonomy, createdDate, receivedDate, createdBy ] = tr.children };
            if (["DocBox", "Author", ].includes(page.alias)) { [ checkbox,,, reviewed, title, name, uselessMenu, firstName, lastName, shortNote, intCase, taxonomy, createdDate, receivedDate, createdBy ] = tr.children };
            if (["WorkingDocs",].includes(page.alias)) { [ checkbox,,, reviewed, title, name, uselessMenu, firstName, lastName, shortNote, intCase, taxonomy, createdDate, createdBy ] = tr.children };
            if (["AllItems", ].includes(page.alias)) { [ checkbox,,, reviewed, title, name, uselessMenu, firstName, lastName, shortNote, intCase, taxonomy, createdDate, createdBy, receivedDate ] = tr.children };
            if (["eSign"].includes(page.alias)) { [ checkbox,,, title, name, uselessMenu, firstName, lastName,, shortNote, intCase, taxonomy,,, modifiedDate, modifiedBy ] = tr.children };
            if (["DocDisc"].includes(page.alias)) { [ checkbox,, title, name,, firstName, lastName, docBox, shortNote, intCase, docBoxCaseNum,, taxonomy, createdDate, receivedDate ] = tr.children };
            if (["DocDiscDPC", ].includes(page.alias)) { [ checkbox,, title, name,, firstName, lastName, docBox, shortNote, intCase, docBoxCaseNum, taxonomy, createdDate ] = tr.children };
            if (["ViewbyDocSet", ].includes(page.alias)) { [ checkbox,,, title, name, uselessMenu, firstName, lastName, shortNote, intCase, taxonomy, createdDate, receivedDate, createdBy ] = tr.children };
            if (["PendingStatus", ].includes(page.alias)) { [ checkbox,,, title, name, uselessMenu, firstName, lastName, shortNote, intCase, taxonomy, createdDate, createdBy, receivedDate ] = tr.children };
            break;

        case "cse":
            break;
        case "sse":
            break;
    };
    return { checkbox, title, name, uselessMenu, firstName, lastName, shortNote, docBoxCaseNum, docBox, createdDate, createdBy, receivedDate, taxonomy, modifiedDate, modifiedBy, birthDate, reviewed, intCase, mnsureId };
};
async function efcTableVariables(tr) {
    let checkbox, title, name, uselessMenu, firstName, lastName, shortNote, docBoxCaseNum, docBox, createdDate, createdBy, receivedDate, taxonomy, modifiedDate, modifiedBy, reviewed, intCase, mnsureId
    switch(editionCode) {
        case "fse":
            [ ,, title, name, uselessMenu, firstName, lastName, shortNote,, createdDate, receivedDate, modifiedDate ] = tr.children
            break;
        case "mse":
            [ ,, title, name, uselessMenu, firstName, lastName, shortNote,,,, createdDate, receivedDate, modifiedDate ] = tr.children
            break;
        case "cse":
            break;
        case "sse":
            break;
    };
    return { checkbox, title, name, uselessMenu, firstName, lastName, shortNote, docBoxCaseNum, docBox, createdDate, createdBy, receivedDate, taxonomy, modifiedDate, modifiedBy, reviewed, intCase, mnsureId };
};
async function modifyDocumentTables(tableBody) {
    let sortedByCaseNum = tableBody?.closest('table')?.querySelector('.ms-headerSortTitleLink:has(+span:not([style="display: none;"]))')?.textContent === "MAXIS" ?? false
    gbl.refVars.currentTbody = await waitForTableCells(tableBody)
    if ( modifiedTables.includes(gbl.refVars.currentTbody) ) { return };
    const tableBodyTrs = Array.from(gbl.refVars.currentTbody.querySelectorAll('tr'), tr => {
        !async function fetchVarsThenDoModifications() {
            if (tr.querySelector('th')) { return };
            mainTableVariables(tr).then(({ checkbox, title, name, uselessMenu, firstName, lastName, shortNote, docBoxCaseNum, docBox, createdDate, createdBy, receivedDate, taxonomy, modifiedDate, modifiedBy, reviewed, birthDate, intCase, mnsureId } = {}) => {
                if (["DocDisc"].includes(page.alias)) { addClassToNotificationRows(name, tr); addClassToDeletedRows(docBox, tr) };
                if (sortedByCaseNum) { lastCaseNum = groupByCaseNumIfSorted(gbl.refVars.currentTbody, lastCaseNum, docBoxCaseNum, tr) };
                doModifications({ checkbox, title, name, firstName, lastName, shortNote, docBox, createdDate, createdBy, receivedDate, taxonomy, modifiedDate, modifiedBy, reviewed, birthDate, docBoxCaseNum, intCase, mnsureId })
            });
        }();
    });
    modifyTableHeaders(gbl.refVars.currentTbody)
    modifiedTables.push(gbl.refVars.currentTbody)
};
async function modifyDocumentTablesEFC(tableBody) {
    gbl.refVars.currentTbody = await waitForTableCells(tableBody)
    if ( modifiedTables.includes(gbl.refVars.currentTbody) ) { return };
    const tableBodyTrs = Array.from(gbl.refVars.currentTbody.querySelectorAll('tr'), tr => {
        !async function fetchVarsThenDoModifications() {
            if (tr.querySelector('th')) { return };
            efcTableVariables(tr).then(({ checkbox, title, name, uselessMenu, firstName, lastName, shortNote, docBoxCaseNum, docBox, createdDate, createdBy, receivedDate, taxonomy, modifiedDate, modifiedBy, reviewed, intCase, mnsureId } = {}) => {
                doModifications({ title, name, shortNote, createdDate, receivedDate, modifiedDate })
            });
        }();
    });
    modifyTableHeaders(gbl.refVars.currentTbody)
    modifiedTables.push(gbl.refVars.currentTbody)
};
function modifyTableHeaders(tableBody) { Array.from(tableBody.closest('table').querySelectorAll('th > div > a'), aEle => { aEle.textContent = theadSwaps.get(aEle.textContent) ?? aEle.textContent }) };
function addClassToNotificationRows(name, tr) {
    if (!name || name?.textContent?.indexOf("Notif") !== 0) { return };
    tr.classList.add('hideNotifications')
};
function addClassToDeletedRows(docBox, tr) {
    if (!docBox || docBox?.textContent?.indexOf("DeletedDPC") !== 0) { return };
    tr.classList.add('hideDeleted')
};
function groupByCaseNumIfSorted(tableBody, lastCaseNum, docBoxCaseNum, tr) {
    if (!docBoxCaseNum) { return lastCaseNum };
    switch(lastCaseNum) {
        case "": { lastCaseNum = docBoxCaseNum?.textContent; break; }
        case docBoxCaseNum?.textContent: { break; }
        default: { tr.classList.add('tdBorderTop'); lastCaseNum = docBoxCaseNum?.textContent; break; }
    };
    return lastCaseNum
};

// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ TABLE_FUNCTIONS SECTION END /////////////////////////////////////////////////////////////////////////////////////////////
// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓

// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓
// //////////////////////////////////////////////////////////////////////////////////// MODIFICATIONS START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
function doModifications({ checkbox, title, name, firstName, lastName, shortNote, docBox, createdDate, createdBy, receivedDate, taxonomy, modifiedDate, modifiedBy, reviewed, birthDate, docBoxCaseNum, intCase, mnsureId, }={}) {
    modifyReviewed(reviewed)
    modifyTitles(title, shortNote)
    modifyShortNote(shortNote)
    modifyName(name)
    switch(editionCode) {
        case "fse": modifyCaseNum(docBoxCaseNum, docBox, checkbox); break;
        case "mse": modifyCaseNum(intCase, docBox, checkbox); break;
    }
    modifyTaxonomy(taxonomy)
    let dateModifications = [createdDate, modifiedDate, receivedDate, birthDate].forEach(modifyDate);
    let nameModifications = [createdBy, modifiedBy].forEach(modifyCreatedModifiedBy)
};
function modifyReviewed(reviewed) {
    if (!reviewed || !reviewed?.textContent) { return };
    reviewed.textContent = reviewed.textContent === "Yes" ? "✓" : "" // ✓ ✕ ☐ ☒ ☑
};
function modifyTitles(title, shortNote) {
    if (!title || !title?.textContent) { return };
    let originalTdText = title.textContent
    let newTdText = title.textContent
    function modifyBadTitle() {
        if (!shortNote.textContent.length) { return 0 };
        if (title.textContent?.includes('BULK SCAN') && shortNote.textContent?.includes(' ')) {
            let bulkNoteTitle = shortNote.textContent.replace(/ (-|incl) DHH?S ?[0-9]{4}[A-Z]?/, "")
            replaceChildrenSpan(title, { title: originalTdText, textContent: bulkNoteTitle })
            replaceChildrenSpan(shortNote, { title: shortNote.textContent, textContent: "bulk" })
            return 1
        } else if (title.textContent?.includes('MNB001 Application')) {
            let { appType, remainingShortNote } = determineAppType(shortNote.textContent)
            replaceChildrenSpan(title, { title: originalTdText, textContent: appType })
            replaceChildrenSpan(shortNote, { title: shortNote.textContent, textContent: remainingShortNote })
            return 1
        };
    };
    if (modifyBadTitle()) { return };
    let matches = [...newTdText.matchAll(docTypeRegExp)].map(match => [ match[0], Object.entries(match.groups).filter(([key, val] = []) => val)?.[0]?.[0] ])
    matches.forEach(([ patternMatch, group ] = []) => {
        let [ regExPattern, regExReplacement ] = docTypeSwaps[group]
        let regEx = docTypeSwaps[group][2]; if (!regEx) { regEx = new RegExp(regExPattern); docTypeSwaps[group].push(regEx) };
        newTdText = newTdText.replace(regEx, regExReplacement)
    });
    replaceChildrenSpan(title, { title: originalTdText, textContent: newTdText })
    function determineAppType(shortNoteText) {
        if (shortNoteText.includes("CCAP")) { return { appType: "CCAP Application (MNB001)", remainingShortNote: shortNoteText.replace(/[A-Z0-9_]+_(?:CAF|CCAP)_?/, '') } }
        else if (shortNoteText.includes("CAF")) { return { appType: "Combined Application (MNB001)", remainingShortNote: shortNoteText.replace(/[A-Z0-9_]+_(?:CAF|CCAP)_?/, '') } }
        else { return { appType: "Unknown App Type (MNB001)", remainingShortNote: shortNoteText } };
    };
};
function modifyShortNote(shortNote) {
    if (!shortNote || !shortNote?.textContent || shortNote?.textContent === "bulk") { return };
    shortNote.classList.add('shortNote')
    let originalTdText = shortNote.textContent
    let newTdText = shortNote.textContent.replace(/\s{3,}/g, '  ') // replace 3+ spaces with 2 //
    let matches = [...newTdText.matchAll(shortNoteRegExp)].map(match => [ match[0], Object.entries(match.groups).filter(([key, val] = []) => val)?.[0]?.[0] ])
    matches.forEach(([ patternMatch, group ] = []) => {
        let [ regExPattern, regExReplacement ] = shortNoteSwaps[group]
        let regEx = shortNoteSwaps[group][2]; if (!regEx) { regEx = new RegExp(regExPattern); shortNoteSwaps[group].push(regEx) };
        newTdText = newTdText.replace(new RegExp(regExPattern), regExReplacement)
    });
    replaceChildrenSpan(shortNote, { title: originalTdText, textContent: newTdText })
};
function modifyName(name) {
    if (!name || !name?.textContent) { return };
    let nameA = name.querySelector('a')
    let nameNewText = nameA?.textContent?.match(/^[A-Z]{1,3}[0-9]{3,4}[A-Z]? [A-Za-z0-9- ]+__(?<filenum>[0-9]{5,})_[0-9-]+/)?.groups?.filenum
    nameA.textContent = "(view_" + (nameNewText ?? "item") + ")"
    if (nameA.href.slice(-3) === "txt") { nameA.target = "_blank" };
};
function modifyCaseNum(tdCaseNum, tdDocBox, tdCheckbox) {
    if (!tdCaseNum) { return };
    if (!tdCaseNum.textContent) { highlightRemove() };
    if ("DocDisc".includes(page.alias) && window.location.search.indexOf(edition.docDiscSearch) > -1) { // if on DocDisc doing a search by case # //
        highlightEvent({ highlightClassName: tdDocBox.textContent, tdTableRow: tdDocBox.closest('tr'), tdCheckbox })
        return;
    };
    if (!tdCaseNum.textContent) { return };
    let highlightClassName = tdCaseNum.textContent?.length > 8 ? tdCaseNum.textContent : tdCaseNum.textContent?.trim()?.split(/^0/)?.reverse()[0] || "" // if not CSE case number, trims leading 0s //
    let newLinkTd = createNewEle('td', { role: "gridcell", classList: "ms-cellstyle ms-vb2 ms-noWrap" }), newLinkA = createNewEle('a', { textContent: highlightClassName, style: "cursor: pointer;" })
    tdCaseNum.replaceWith(newLinkTd)
    highlightClassName && newLinkTd.append(newLinkA, copySymbol())
    newLinkA?.addEventListener('click', () => { openCaseFile(newLinkA.textContent, "_self") });
    newLinkA?.addEventListener('contextmenu', contextmenuEvent => {
        contextmenuEvent.preventDefault(); contextmenuEvent.stopPropagation(); contextmenuEvent.stopImmediatePropagation();
        openCaseFile(newLinkA.textContent, "_blank")
    });
    let tdTableRow = newLinkTd.closest('tr')
    highlightClassName && tdTableRow.classList.add(highlightClassName)
    highlightEvent({ highlightClassName, tdTableRow, tdCheckbox })
};
function modifyTaxonomy(taxonomy) {
    if (!taxonomy || !taxonomy.textContent) { return };
    replaceChildrenSpan(taxonomy, { title: taxonomy.textContent, textContent: taxonomySwaps.get(taxonomy.textContent) })
};
function modifyDate(originalDate) {
    if (!originalDate || !originalDate.textContent) { return };
    let dateSpan = originalDate.querySelector('span') || originalDate
    let formattedDate = dateFuncs.formatDate(originalDate.textContent.split(' ')[0].replace(/-/g, "/"), "mdyy")
    dateSpan.textContent = formattedDate ?? originalDate.textContent
};
function modifyCreatedModifiedBy(createdModifiedBy) {
    if (!createdModifiedBy || !createdModifiedBy?.textContent) { return };
    createdModifiedBy.title = createdModifiedBy.textContent
    createdModifiedBy.textContent = createdModifiedBy.textContent.split(/[@ ]/)[0]
};
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ MODIFICATIONS END /////////////////////////////////////////////////////////////////////////////////////////////////
// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓

!function modifyTablesAsLoaded() {
    if (!page.hasOwnProperty('primaryTableLoc')) { return };
    gbl.refVars.primaryTableLoc ??= tableLocQuery('primaryTableLoc')
    if (!gbl.refVars.primaryTableLoc) { return };
    gbl.refVars.primaryTableLoc.classList.add('dpcTableLoc')
    gbl.refVars.primaryTableLoc.addEventListener('mouseleave', () => { visualIndicatorIfPdfSelected() });
    tbodLoadedEles(gbl.refVars.primaryTableLoc)?.forEach(tbod => { modifyDocumentTables(tbod) });
    const observer = new MutationObserver(mutations => { tbodLoadedEles(gbl.refVars.primaryTableLoc)?.forEach(tbod => { modifyDocumentTables(tbod) }) });
    observer.observe(gbl.refVars.primaryTableLoc, { childList: true, subtree: true });
}();
!function modifyTablesAsLoadedEFC() {
    if (!page.hasOwnProperty('efcTableLoc')) { return };
    gbl.refVars.efcTableLoc ??= tableLocQuery('efcTableLoc')
    gbl.refVars.efcTableLoc.classList.add('efcTableLoc')
    if (!gbl.refVars.efcTableLoc) { return };
    tbodLoadedElesEFC(gbl.refVars.efcTableLoc)?.forEach(tbod => { modifyDocumentTablesEFC(tbod) });
    const observer = new MutationObserver(mutations => { tbodLoadedElesEFC()?.forEach(tbod => { modifyDocumentTablesEFC(tbod) }) });
    observer.observe(gbl.refVars.efcTableLoc, { childList: true, subtree: true });
}();

// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓
// ///////////////////////////////////////////////////////////////////////////// FUNCTION_LIBRARY SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
function openCaseFile(openCaseFileNum, target) {
    openCaseFileNum = openCaseFileNum.trim()
    if (!testCaseNum(openCaseFileNum)) { return };
    copy(openCaseFileNum)
    window.open("/CWRF/Case%20File.aspx?SystemRecordID=" + openCaseFileNum + "&SOR=" + edition.SOR, target)
};
function testCaseNum(caseNumber) { caseNumber = caseNumber?.replace(/\s/g, ''); return (edition.caseNumFormat)?.test(caseNumber) ? caseNumber : undefined }; // MAXIS/MEC2: 1-7 digits. METS: 8 digits. PRISM: 10 + 2 digits.
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
function tbodLoadedEles() {
    let tbodArray = page.singleTable
        ? [ gbl.refVars.primaryTableLoc.querySelector('tbody') ] // single table: first table body found in primaryTableLoc, no #id //
        : page.alias === "DocDisc" // DocDisc doesn't use 'isloaded' //
            ? Array.from(gbl.refVars.primaryTableLoc?.querySelectorAll('tbody:has(>tr.ms-itmhover)'))
            : Array.from(gbl.refVars.primaryTableLoc?.querySelectorAll('tbody[id^=tbod]'))?.filter(ele => ele.getAttribute('isloaded') === "true") // multiple tables: all tbody elements with #id that starts with tbod //
    return tbodArray;
};
function tbodLoadedElesEFC() {
    return Array.from(gbl.refVars.efcTableLoc?.querySelectorAll('tbody[id^=tbod]'))?.filter(ele => ele.getAttribute('isloaded') === "true");
};



function createNewEle(nodeName, attribObj={}, dataObj={}) {
    let newEle = Object.assign(document.createElement(nodeName), attribObj);
    Object.entries(dataObj)?.forEach(([dataName, dataValue] = []) => { newEle.dataset[dataName] = dataValue });
    return newEle;
};
function arrangeElements(elementArray) {
	const validArray = arrToCheck => Array.isArray(arrToCheck) && arrToCheck.length > 0
    if (!validArray(elementArray)) { return };
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
            [createNewEle('span', { textContent }),
             createNewEle('label', { title, for: id }),
             [createNewEle('label', { classList: "switch", style: (fontSize && "font-size: " + fontSize + ";") }),
              [createNewEle('input', { type: "checkbox", id, checked }),
               createNewEle('span', { classList: "slider round" })
              ]
             ]
            ]
        )
    );
    return toggleSlider;
};
function replaceChildrenSpan(td, spanProperties) {
    td.replaceChildren( createNewEle('span', spanProperties) )
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
    snackBarDivs.textarea.append( ...sbText.split('\n').map( textLine => createNewEle('span', { textContent: textLine }) ) )
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
function addStyling(ele, styleObj) {
    if (!ele) { return };
    Object.entries(styleObj).forEach(([property, value] = []) => { ele.style[property] = value });
};
async function countDocs() { // For those pages where no total doc count exists, adds the count to the link located directly above the table //
    let docTableArea = tableLocQuery('primaryTableLoc'), docTable = await waitForEleWithAncestor('table[summary="Document Processing Center"] > tbody', docTableArea),
        currentPageLink = mainBody.querySelector('a.ms-pivotControl-surfacedOpt-selected')
    if (!currentPageLink) { return };
    currentPageLink.textContent = currentPageLink?.textContent + " (" + (docTable.querySelectorAll('tr').length ?? '') + ")"
};
function highlightAdd(highlightClassName, currentTbody) {
    const trMatched = currentTbody?.getElementsByClassName(highlightClassName)
    Array.from(trMatched, tr => { tr.classList.add('selectedDocs')} );
    highlightClickCount(trMatched.length)
};
function highlightEvent({ highlightClassName, tdTableRow, tdCheckbox } = {}) {
    highlightClassName && tdTableRow.classList.add(highlightClassName)
    tdTableRow.addEventListener('click', highlightOnClickEvent);
    tdCheckbox?.addEventListener('click', highlightOnClickEvent);
    let currentTbody = gbl.refVars.currentTbody
    function highlightOnClickEvent(clickEvent) {
        if (highlightClassName === gbl.refVars.highlight.selectedClass && !tdTableRow.className?.includes('s4-itm-selected') && tdTableRow.className?.includes('selectedDocs')) { return }; // highlighted: yes && selected: no //
        gbl.refVars.highlight.selectedClass = highlightClassName // sets global variable //
        highlightRemove()
        if (tdTableRow.className?.includes('s4-itm-selected')) { return highlightClickCount(''); };
        highlightAdd(highlightClassName, currentTbody)
    };
};
function highlightRemove() { Array.from(mainBody.querySelectorAll('tr.selectedDocs'), tr => { tr.classList.remove('selectedDocs') }); };
async function highlightClickCount(rowCount) {
    if (document.getElementById('clickedCount')) { gbl.eles.clickedCount.textContent = rowCount; return; };
    const modalObserver = new MutationObserver(() => {
        if (ribbon.querySelector('#NCTCaseWorksGroup > .ms-cui-groupContainer > .ms-cui-groupTitle')) {
            if (!gbl.eles.clickedCount.isConnected) { attachClickedCount() };
            modalObserver.disconnect()
        };
        gbl.eles.clickedCount.textContent = rowCount
    });
    modalObserver.observe(ribbon, { childList: true, subtree: true });
    function attachClickedCount() {
        ribbon.querySelector('#NCTCaseWorksGroup > .ms-cui-groupContainer > .ms-cui-groupTitle')?.append(
            ...arrangeElements(
                [createNewEle('span', { id: "clickedCountCont", style: "position: absolute; right: 15%; bottom: 0; font-size: 10pt; color: light-dark(#222, #efefef) !important;" } ),
                 [createNewEle('span', { textContent: "Doc Count: " }),
                  gbl.eles.clickedCount
                 ],
                ]
            )
        );
    };
};
function toggleSliderVisibility(isChecked, styleName) {
    switch(isChecked) {
        case true: gbl.eles[styleName].textContent = "." + styleName + " { display: none; }"; break;
        case false: gbl.eles[styleName].textContent = "." + styleName + ""; break;
    };
};
function toggleVisible(element, trueFalse) {
    element = Array.isArray(element) ? element : element instanceof NodeList ? [...element] : [element]
    element.forEach( ele => { ele = sanitize.query(ele); ele.style.visibility = trueFalse ? 'visible' : 'hidden' } );
};
function unhideElement(element, trueFalse) { // true to remove hidden, false to add hidden;
    element = Array.isArray(element) ? element : element instanceof NodeList ? [...element] : [element]
    element.forEach( ele => { ele = sanitize.query(ele); trueFalse ? ele.classList.remove('hidden') : ele.classList.add('hidden') } );
};

function triggerFnOnInputChange(inputEle, triggerFn) {
    if (!inputEle) { return };
    const { get, set } = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(inputEle, 'value', {
        get() { return get.call(this) },
        set(newValue) {
            set.call(this, newValue); // Set the actual value using the native setter //
            triggerFn()
            // this.dispatchEvent(new Event('input', { bubbles: true }));
        },
    });
};
function triggerFnOnSelectChange(selectEle, triggerFn) {
    if (!selectEle) { return };
    const { get, set } = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    Object.defineProperty(selectEle, 'value', {
        get() { return get.call(this) },
        set(newValue) {
            console.log("this works")
            set.call(this, newValue); // Set the actual value using the native setter //
            triggerFn()
            // this.dispatchEvent(new Event('input', { bubbles: true }));
        },
    });
};
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ FUNCTION_LIBRARY SECTION END /////////////////////////////////////////////////////////////////////////////////////////////
// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓
console.timeEnd('CaseWonks load time')
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
