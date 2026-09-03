// ==UserScript==
// @name         CaseWonks
// @namespace    http://tampermonkey.net/
// @version      0.0.35
// @description  Make CaseWorks less miserable to use.
// @author       McCormickJ
// @match        https://*.caseworkscloud.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=caseworkscloud.com
// @grant        none
// ==/UserScript==

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
const doClick = (element, options={bubbles:true}) => { element = sanitize.query(element); element?.dispatchEvent(new MouseEvent('click', options)) };
// const doClick = (element, bubbles=true) => { element = sanitize.query(element); element?.dispatchEvent(new MouseEvent('click', { bubbles })) };

const caseWonksDataSet = {
    data: { ...sanitize.json( localStorage.getItem('caseWonks.data') ) } ?? {}, // set by info found on pages //
    settings: { ...sanitize.json( localStorage.getItem('caseWonks.settings') ) } ?? {}, // set by user input //
    updateInfo(dataOrSettings, infoKey, infoValue) { // keyName, newValue or "delete"
        infoValue === "delete" ? delete this[dataOrSettings][infoKey] : this[dataOrSettings][infoKey] = infoValue
        localStorage.setItem( 'caseWonks.' + dataOrSettings, JSON.stringify(this[dataOrSettings]) )
    },
};

verbose(caseWonksDataSet.data)
verbose(caseWonksDataSet.settings)

const page = new Map([
    ['AllDocsEFC90days.aspx', { alias: 'AllEFCNinetyDays', primaryTableLoc: 'td#scriptWPQ2 > table.ms-listviewtable:is([summary="MNsure EFC"], [summary="FSE Electronic File Cabinet"])', singleTable: 1 }],
    ['AllItems.aspx', { alias: 'AllItems', primaryTableLoc: 'td#scriptWPQ1 > table[summary="Document Processing Center"].ms-listviewtable', singleTable: 1, }],
    ['Appeals.aspx', { alias: 'Appeals', primaryTableLoc: 'table.ms-webpartPage-root', singleTable: 1, }],
    ['AllDPCDocuments.aspx', { alias: 'AllDpcDocs', primaryTableLoc: 'td#scriptWPQ1 > table[summary="Document Processing Center"].ms-listviewtable', singleTable: 1, }],
    ['author.aspx', { alias: 'Author', primaryTableLoc: 'td#scriptWPQ2 > table[summary="Document Processing Center"]', }],
    ['CaseFile.aspx', { alias: 'CaseFile', primaryTableLoc: '#DPC table table.ms-listviewtable', secondaryTableLoc: '#scriptWPQ7 > table.ms-listviewtable, #scriptWPQ3 > table.ms-listviewtable' }],
    // ['CaseFile.aspx', { alias: 'CaseFile', primaryTableLoc: '#DPC table table.ms-listviewtable', secondaryTableLoc: '#scriptWPQ7 > table.ms-listviewtable' }],
    ['DocBox.aspx', { alias: 'DocBox', primaryTableLoc: 'td#scriptWPQ2 > table[summary="Document Processing Center"].ms-listviewtable', singleTable: 1, }],
    ['DocumentDiscovery.aspx', { alias: 'DocDisc', primaryTableLoc: '.ms-webpart-zone.ms-fullWidth:has(table[summary])', }],
    ['DocumentDiscoveryDPC.aspx', { alias: 'DocDiscDPC', primaryTableLoc: 'table[summary="Document Processing Center"].ms-listviewtable', singleTable: 1 }],
    ['FSEDocumentDiscoveryEFC.aspx', { alias: 'DocDiscDPC', primaryTableLoc: 'table[summary="Document Processing Center"].ms-listviewtable', singleTable: 1 }],
    // ['DocumentDiscoveryEFC.aspx', { alias: 'DocDiscDPC', primaryTableLoc: 'table[summary="Document Processing Center"].ms-listviewtable', singleTable: 1 }],
    ['eSignDocuments.aspx', { alias: 'eSign', primaryTableLoc: 'td#scriptWPQ2 > table[summary="Document Processing Center"]', singleTable: 1, }],
    ['Home.aspx', { alias: 'Home', primaryTableLoc: 'div.ms-webpart-zone.ms-fullWidth:has(#divAPNMain)' }],
    ['MyRecentEFCDocuments30days.aspx', { alias: 'RecentEFC', primaryTableLoc: 'td#scriptWPQ2 > table.ms-listviewtable:is([summary="MNsure EFC"], [summary="FSE Electronic File Cabinet"])', singleTable: 1 }],
    ['NCTRecycleBin.aspx', { alias: 'Trash', primaryTableLoc: 'table.ms-webpartPage-root #WebPartWPQ5 table.ms-listviewtable', singleTable: 1 }],
    // ['NCTRecycleBin.aspx', { alias: 'Trash', primaryTableLoc: 'table.ms-webpartPage-root #WebPartWPQ5 table.ms-listviewtable', secondaryTableLoc: 'table.ms-webpartPage-root #WebPartWPQ8 table.ms-listviewtable' }],
    ['PendingStatus.aspx', { alias: 'Pending', primaryTableLoc: 'td#scriptWPQ2 > table[summary="Document Processing Center"].ms-listviewtable', singleTable: 1, }],
    ['PersonalViews.aspx', { alias: 'Subs', primaryTableLoc: 'div#WebPartWPQ1', singleTable: 1 }],
    ['Print2NCT.aspx', { alias: 'Print', }],
    ['Scan.aspx', { alias: 'Scan' }],
    ['Subscriptions.aspx', { alias: 'Subs', primaryTableLoc: 'div#WebPartWPQ1', singleTable: 1 }],
    ['ViewbyDocSet.aspx', { alias: 'ViewbyDocSet', primaryTableLoc: 'td#scriptWPQ2 > table[summary="Document Processing Center"]', }],
    ['ViewByChildSupportEdition.aspx', { alias: 'CSE', subdomain: 'cse' }],
    ['ViewByFinancialServicesEdition.aspx', { alias: 'FSE', subdomain: 'fse' }],
    ['ViewByMNsureEdition.aspx', { alias: 'MSE', subdomain: 'mse' }],
    ['ViewBySocialServicesEdition.aspx', { alias: 'SSE', subdomain: 'sse' }],
    ['WorkingDocuments.aspx', { alias: 'WorkingDocs', primaryTableLoc: 'td#scriptWPQ1 > table[summary="Document Processing Center"].ms-listviewtable', singleTable: 1, }],
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
    ['fse', { SOR: "MAXIS", caseNumFormat: new RegExp("^\\d{1,8}$"), notFound: "Not Found/No Data", docDiscSearch: "MAXIS" }],
    ['mse', { SOR: "MNSure", caseNumFormat: new RegExp("^\\d{8}$"), notFound: "Not Found/No Data", docDiscSearch: "InCase" }],
    ['cse', { SOR: "PRISM", caseNumFormat: new RegExp("^\\d{10} ?\\d{2}$"), notFound: "Not Found/No Data", }],
    ['sse', { SOR: "SSIS", caseNumFormat: new RegExp("\\d+"), notFound: "Not Found/No Data", }]
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
    roiGeneral: ["General (?:Consent\\/)?Authorization for Release of Information", "RoI Auth: General"],
    roiShare: ["Authorization to Share Information", "Auth to Share Info"],
    roiShelter: ["Authorization for Release of Information About Residence and Shelter Expenses", "RoI Auth: Residence\/Shelter Expenses"],

    // General //
    appealsSummaryPacket : ["Appeals Summary and Supporting Docs Packet", "Packet: Appeals Summary, Supporting Docs"],
    bsIdentity: ["1\\.1 BULK SCAN - Enumeration-Identity", "General Identity (BS)"],
    brAuth: ["Authorization to Request Birth Records", "Auth to Request Birth Records"],
    eft: ["Electronic Funds Transfer", "EFT"],
    ftiConsent : ["Consent to Access Federal Tax Information", "Consent to Access Fed Tax Info"],
    mergeMail: ["Merge For Mailing \\(Delete after Mailing or Printing\\)", "Merge for Mail - Delete"],
    miscCorr: ["Miscellaneous Correspondence \\(MC\\)", "Misc\. Correspondence"],
    pictureId: ["Drivers License \\(DL\\) - State ID", "State ID"],
    privacyPrac: ["Notice of Priv Practices and Notice of Rights and Resp", "Notices: Privacy, Rights, Resp."],
    residenceOther: ["Other Residence", "Residence/Shelter"],
    residence: ["Shelter\\/Residence Verification", "Residence/Shelter"],
    schoolAttend: ["Request for Verification of School Attendance/Progress", "Req for Verif of School Attendance"],
    socialSecurity: ["Social Security", "SS"],
    vetsAdmin: ["- Veterans Admin", ""],

    //// FSE ////

    // CCAP //
    ccap7054: ["MFIP\\/DWP Employment Services Child Care Request", "ES to CCAP 7054"],
    ccapCafAddendum: ["- Child Care Addendum", "Addendum - CCAP"],
    ccapCRF : ["Child Care Assistance Program - Change Report Form", "Change Report - CCAP"],
    ccapEduPlan: ["SLC CCAP Education Plan 9\\.24", "CCAP Education Plan"],
    ccapLnlAck: ["Parent Acknowledgement When Choosing a Legal Nonlicensed Provider", "LNL Acknowledgement"],
    ccapMedForm: ["CCAP Medical Condition Documentation Form", "CCAP Medical Condition Doc Form"],
    ccapRedet: ["Redetermination Form", "Redetermination"],

    // CS //
    csEndGc: ["Request to End Child Support Good Cause", "Request to End CS Good Cause"],
    csGc: ["Cooperation with Child Support Enforcement", "CS Good Cause"],
    csReferral: ["Referral to Support and Collections", "CS Referral"],

    // FNW //
    fnwNonSSI: ["Interim Assistance Authorization \\(non-SSI\\)", "Non-SSI Interim Assist. Auth"],
    fnwSSI: ["SSI Interim Assistance Authorization", "SSI Interim Assist. Auth"],
    fnwSudTreatVerif: ["General Assistance Verifying Participation in Substance Use Disorder Treatment", "GA Verifying Partic. in SUD Treatment"],

    // Fraud //
    fraudFound: ["SUMMARY OF INVESTIGATIVE FINDINGS", "Summary of Investigative Findings"],
    fraudRef: ["Fraud Prevention Investigation Referral", "FPI Referral"],

    // LTC //
    ltcCommForm: ["Lead Agency Assessor/Case Manager/Worker LTC Communication Form", "LTC Communication Form"],

    // SNAP/Cash //
    fsAssets: ["Signed Personal Statement about Assets for MFIP,DWP,GA,MSA, and GRH Programs", "Assets Statement form"],
    fsCRF : ["Change Report Form for SNAP", "Change Report - SNAP"],
    fsLateRenew: ["Notice of Late or Incomplete Household Report Form Health Care Renewal Form or Combined Six-Month Report", "Notice of late HRF/HCR/CSMR"],
    fsSchoolVer: ["School Attendance Verification", "School Attend Ver."],
    mfipCRF : ["Change Report Form For Cash Programs", "Change Report - Cash"],
    mfipEsReferral: ["Employment Services$", "ES Referral"],
    mfipMedOpinion : ["Req for Medical Opinion- Family CASH", "Req for Medical Opinion - Cash"],
    mfipSanctionIntent : ["MFIP INTENT TO SANCTION", "MFIP Intent to Sanction"],
    paDenial: ["Notice of Denial for Public Assistance Applicants or Recipients", "PA Notice of Denial"],

    // FSE Acrynyms //
    bsfCcapAcrynym: ["Basic Sliding Fee( \\(BSF\\))?", "BSF"],
    cafAcrynym: ["Combined Application(?: Form)?(?: \\(CAF\\))?(?: -)?", "CAF"],
    ccapAcrynym: ["(?:Minnesota )?Child Care Assistance( Program)?(?: \\(CCAP\\))?", "CCAP"],
    gaFnwAcrynym: ["General Assistance", "GA"],
    mfipAcrynym: ["Minnesota Family Investment Program \\(MFIP\\)", "MFIP"],
    snapAcrynym: ["(?:the )?Supplemental Nutrition Assistance Program(?: \\(SNAP\\))?", "SNAP"],
    sudFnwAcrynym: ["Substance Use Disorder", "SUD"],


    //// MSE ////

    mseAddNewborn: ["RG3F012 IM MNS R3 3907C Add a Newborn", "Add a Newborn"],
    mseAddMember: ["RG3F011 IM MNS R3 3907B Add a New Household Member", "Add a New HH Member"],
    mseAuthRep: ["Giving Permission for Someone to Act on My Behalf", "Auth Rep (HC)"],
    mseCertainPopElig: ["Request for Information to Determine Eligibility for Certain Populations", "Req for Info to Determine Elig for Certain Pops"],
    mseMhcpIfo: ["MHCP Information Needed for Reported Changes", "MHCP Info Needed"],

    // HC //
    hcApp: ["HC Application for Certain Populations", "HC App for Certain Pops"],
    hcCEHI: ["Determination of Cost Effectiveness", "CEHI Determination"],
    hcFinInfoAuth: ["Obtain Financial Information from the Asset Verification Service", "Auth to Obtain Financial Info from AVS"],
    hcLiquidAssets: ["Liquid Assets\\(Bank, Credit Union, Stocks, Bonds, etc\\)", "Liquid Assets (Bank, stocks, etc.)"],
    hcLtcRenew: ["Renewal for People Receiving Long-Term Care Services", "Renewal for People Receiving LTC"],
    hcMcoMembAddr : ["MCO Member Address Change Report Form", "MCO Member Address Change"],
    hcNewMember: ["New Household Member or Applicant Request Form", "HC: New HH Member/Applicant Request"],
    hcRenewal: ["Combined Annual Renewal For Certain Populations", "Combined Renewal for Certain Pops"],
    hcReqPlan: ["Request for Group Health Plan Information", "Group Health Plan Info Req."],
    hcReqEmployeePlan: ["Request for Employees Group Health Plan Information", "Employee Group Health Plan Info Req."],

    // MSE Acrynyms //
    fcaAcrynym: ["Families with Children and Adults", "FCA"],
    maFcaAcrynym: ["Medical Assistance for Families with Children and Adults \\(MA-FCA\\)", "MA-FCA"],
    mhcpAcrynym: ["(?:MHCP \\()?Minnesota Health Care Programs(?:\\))?", "MHCP"],

    // groupName: ["", ""],
};
const docTypeRegExp = new RegExp( Object.entries(docTypeSwaps).map(([group, [regExPattern,]=[]] = []) => "(?<"+group+">"+regExPattern+")").join("|"), "g" )

const theadSwaps = new Map([
    ["Title", "DocType"],
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
    recdVia: ["\\.Received via", ". Rec'd: "],
    sentVia: ["\\.Sent via", ". Sent: "],
    mergedDeleted: ["This document was merged with another document and the user selected Delete Original Document\\.", "Doc merged; original deleted. "],
    movedCopied: ["(Moved|Copied) from ([A-Z]{3})(?: [A-Za-z. ]+) " + patterns.byEmailSpace + "on (" + patterns.date + ") " + patterns.time + "\\.", (match, movedCopied, source, date) => movedCopied + ": " + source + " " + dateFuncs.formatDate(date, "mdyy") + ". "],
    sentPubPort: ["Document uploaded via Public Portal on " + patterns.date + " " + patterns.time + " " + patterns.byEmailSpace + "and retrieved by Portal Integration on (?<date>" + patterns.date + ") " + patterns.time + "\\.", (fullStr, dateMatch) => "Portal in: " + dateFuncs.formatDate(dateMatch, "mdyy") + ". " ],
    checkedIn: ["Document was checked-in by System at (" + patterns.date + ") " + patterns.time + "\\.", (fullStr, dateMatch) => "Checked-in " + dateFuncs.formatDate(dateMatch, "mdyy") + ". "],
    recdPubPort: ["Public Portal - " + patterns.emailSpace + "was sent this on (" + patterns.date + ") " + patterns.time + "\\.", (fullStr, dateMatch) => "Portal out: " + dateFuncs.formatDate(dateMatch, "mdyy") + ". " ],
    sysAcctRecd: ["A[0-9]{9,10}_([A-Z]+)[0-9_]+(?:[A-Za-z]+_)?(?:doc\\dof\\d)?\\.(\\w{3,4}) by System Account on (" + patterns.date + ") " + patterns.time + "\\.", "$1 $2 rec'd: $3. "],
    doc_of_: ["[0-9]{9,10}_doc\\dof\\d__", ""],
    faxToFrom: ["\\*TO:[\\s\\\xA0]*\\+?" + patterns.phone + " FROM:[\\s\\\xA0]*(" + patterns.phone + ")" + patterns.faxAgain + "(?: eFax)?", "Fax: $1. "],
    webDoc: ["^Web(?:-[0-9]+)?$", "(Website import)"],
    autoCopy: ["Auto-Copy from ([A-Z]{3}): (?:SSN|MAXIS) match", "Auto-copy ($1). "],
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
    [ "5.6 CCAP - Child Provider", "5.6 CCAP\xA0Provider" ],
    [ "6.0 KA - Kinship Assistance", "6.0 Kinship\xA0Assist." ],
    [ "6.1 KA - Citizenship-Identity", "6.0 Kinship\xA0Identity" ],
    [ "6.2 KA - Application", "6.2 Kinship\xA0Apps" ],
    [ "6.3 KA - Child Support", "6.3\xA0Kinship\xA0CS" ],
    [ "6.4 KA - Court Documents", "6.4 Kinship \xA0 Docs" ],
    [ "6.5 KA - Miscellaneous", "6.5 Kinship\xA0Misc" ],
]);

const shortNoteRegExp = new RegExp( Object.entries(shortNoteSwaps).map(([group, [regExPattern,]=[]] = []) => "(?<"+group+">"+regExPattern+")").join("|"), "g" )
const modifiedTables = [];

const gbl = {
    eles: {
        navContainer: createNewEle('div', { id: "wonksNavContainer", classList: "wonks" }),
        homePageLink: createNewEle('a', { textContent: "Home Page", id: "homePageLink", }),
        newTabFieldDiv: createNewEle('div', { id: "newTabFieldDiv" }),
        newTabField: createNewEle('input', { id: "newTabField", autocomplete:"off", classList: "form-control", placeholder: "Case #", pattern: "^[0-9]{1,12}$", style: "width: 13ch;" }),
        wonksCFButton: createNewEle('button', { id: "wonksCFButton", textContent: "CF", classList: "wonks-button", title: "Opens CaseFile page for Case #" }),
        wonksDDButton: createNewEle('button', { id: "wonksDDButton", textContent: "DD", classList: "wonks-button", title: "Opens DocumentDiscovery page for Case #" }),
        caseHistory: createNewEle('datalist', { id: "caseHistory", style: "visibility: hidden;" }),
        caseWonksVersion: createNewEle('div', { id: "caseWonksVersion", textContent: GM_info.script.name + ' v' + GM_info.script.version, style: "cursor: pointer; margin: 1px;", classList: "wonks" }),
        clickedCount: createNewEle('span', { id: "clickedCount" }), clickedCountCont: createNewEle('span', { id: "clickedCountCont", classList: "wonks" } ), docCountText: createNewEle('span', { textContent: "Doc Count: " }),
        mySubsLink: createNewEle('li'),
    },
    sideNav: {
        menu: mainBody?.querySelector('#DeltaPlaceHolderLeftNavBar #zz10_RootAspMenu'),
        taxonomyList: "https://nctcentralstlouis.caseworkscloud.com/DocType/Forms/View%20By%20Financial%20Services%20Edition.aspx",
        subsLink: "/Lists/Subscription/Subscriptions.aspx",
        moveToBottom: {
            newCwLink: "https://nct1170.zendesk.com/hc/en-us/categories/38940899237268-New-in-CaseWorks",
            cwKnowBase: "https://nct1170.zendesk.com/hc/en-us",
            cwVideos: "https://nct1170.zendesk.com/hc/en-us/categories/38472620821268-Training-Videos",
        },
    },
    refVars: {
        currentTbody: undefined, primaryTableLoc: undefined, secondaryTableLoc: undefined,
        highlight: { selectedClass: "" },
        lastCaseNum: "",
        wonksSubAssistLS: sanitize.json(localStorage.getItem('CaseWonks.subAssist')),
    },
};
gbl.eles.clickedCountCont.append(gbl.eles.docCountText, gbl.eles.clickedCount);

!function addScriptSpecificCSSRules() {
    const wonksNavContainerCSSRules = Object.values({
        scope: "@scope (#wonksNavContainer) { :scope {",
        navContainer: "line-height: 26px; display: flex; gap: 20px; align-items: center; position: fixed; left: 250px; top: 4px; z-index: 990;",
        homePageLink: "#homePageLink { font-size: 14px; color: light-dark(#106EBE, #82caff) !important; font-weight: 600; text-decoration: none; cursor: pointer; }",
        newTabFieldDiv: "#newTabFieldDiv { display: inline-block }",
        divs: "div { margin-top: 1px; }",
        buttons: "button { height: 25px; padding: 0 10px; margin-left: 10px; min-width: unset; font-size: 10px; }",
        inputButtonBorder: "input, button { border: 1px solid light-dark(#222, #a1a1a1) }",
        closure: "} }",
    }).join(' ');
    const wonksNavContainerCSS = addCSSStyleSheet(wonksNavContainerCSSRules)
    const wonksScriptWideCSSRules = Object.values({
        darkReaderOverrides: ":root { --darkreader-background-add8e624: #add8e624; --darkreader-border-808080cc: #808080cc; --darkreader-border-ffffff: #ffffff; }",
        clickedCountCont: "#clickedCountCont { position: absolute; right: 15%; bottom: 1px; font-size: 10pt; color: light-dark(#222, #efefef) !important; }",
        selectedDocs: ":is(.selectedCaseNumDocs, .selectedDocs):not(.s4-itm-selected) { background-color: light-dark(#add8e63d, var(--darkreader-background-add8e624)) !important; }",
        tdBorderTop: ".tdBorderTop { & > td { border-top: 1px solid var(--darkreader-border-808080cc) !important; } }",
        pdfSelected: '.pdfSelected #Ribbon\\.Documents\\.NCT\\.Document\\.Delete-Large > span { position: relative; color: rgba(255, 0, 0); & span:has(img)::after { z-index: 5; content: ""; position: absolute; background-color: rgba(255, 0, 0, 0.35); pointer-events: none; width: 100%; height: 100%; } }',
        hidden: ".hidden { display: none !important; }",
        popupWindow: "div.ms-dlgContent, div.ms-dlgBorder { height: auto !important; }",
    }).join(' ');
    const wonksScriptWideCSS = addCSSStyleSheet(wonksScriptWideCSSRules);
    const snackBarCSSRules = Object.values({
        scope: "@scope (#snackBarDiv) { :scope {",
        main: "opacity: 0; background-color: #333; color: #fff; font-size: x-large; text-align: center; border: solid 5px #fff; border-radius: 6px; position: fixed; z-index: 25; width: max-content; padding: 2rem 5rem; left: 50%; right: 50%; translate: -50% 0; bottom: 30px; pointer-events: none;",
        spans: "span { position: relative; display: block; margin-bottom: 5px; text-align: left; } }",
        animation: "animation: show 2500ms 100ms cubic-bezier(0.38, 0.97, 0.56, 0.76) forwards;",
        keyframes: "@keyframes show { 0%, 100% { opacity: 0; transform: none; } 15%, 85% { opacity: 1; transform: none; } }",
        closure: "}",
    }).join(' ');
    const snackBarCSS = addCSSStyleSheet(snackBarCSSRules);
    const caseHistoryCSSRules = Object.values({
        scope: "@scope (#newTabFieldDiv) { :scope {",
        historyVars: "--focusHighlight: light-dark(rgba(27, 91, 142, .15), rgba(120, 190, 33, .3));",
        caseHistory: "#caseHistory { position: fixed; display: block; translate: -70%; z-index: 999; background-color: light-dark(#eee, #212121); border: 2px solid light-dark(#0075c5, #036cb4); padding: 0px; line-height: 26px; min-width: 26em; text-wrap: nowrap;",
        dropDownHistory: "& > div { display: grid; grid-template-columns: 12ch 7fr 8ch; overflow: hidden; gap: 3ch; cursor: pointer; padding: 5px 11px; border: none; box-shadow: none !important; outline: none !important;",
        historyHighlight: "&.caseHistoryFocus { background: linear-gradient(to bottom, transparent 0, var(--focusHighlight) 35% 65%, transparent 100%); }",
        closure: "} } } }",
    }).join(' ');
    const caseHistoryCSS = addCSSStyleSheet(caseHistoryCSSRules)
    const toggleSliderCSSRules = Object.values({
        scope: "@scope (.toggle-slider) { :scope {",
        toggleSlider: "display: flex; gap: 10px; align-items: center; & > label.switch { font-size: 12px; }",
        switch: ".switch { position: relative; display: inline-block; width: 3.5em; height: 1.55em; margin: 0 !important; }",
        switchInput: ".switch input { opacity: 0; width: 0; height: 0; }",
        slider: ".slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; }",
        sliderBefore: '.slider:before { position: absolute; content: ""; height: 1em; width: 1em; left: .35em; bottom: .3em; background-color: white; transition: .4s; }',
        sliderAlwaysColor: ".slider-always-color { gap: unset !important; .slider { background-color: light-dark(#0075c5, #036cb4) !important; } }",
        inputChecked: "input:checked + .slider { background-color: light-dark(#0075c5, #036cb4); }",
        inputFocus: "input:focus + .slider { box-shadow: 0 0 1px light-dark(#0075c5, #036cb4); } input:checked + .slider:before { translate: 1.8em; }",
        sliderRound: ".slider.round { border-radius: 1em; border: 1px solid #eeeeee90; }",
        sliderRoundBefore: ".slider.round:before { border-radius: 50%; }",
        closure: "} }"
    }).join(' ');
    const toggleSliderCSS = addCSSStyleSheet(toggleSliderCSSRules)
    const sideNavCSSRules = Object.values({
        scope: "@scope (#sideNavBox) { :scope {",
        sideNavOverride: ".ms-core-sideNavBox-removeLeftMargin { margin-left: 0 !important; & a { padding: 5px !important; } &",
        start: "details.sideNavExpando { cursor: pointer;",
        expandoLI: "&[open] li { border-left: 1px solid light-dark(#000000 ,var(--darkreader-border-ffffff)) !important; margin-left: 3px !important; }",
        expandoSummaryText: "& summary { padding: 5px; text-wrap-mode: nowrap; }",
        closure: "} } } }"
    }).join(' ');
    const sideNavCSS = addCSSStyleSheet(sideNavCSSRules)
    !function wonksHover() {
        const wonksHoverCSS = addCSSStyleSheet()
        gbl.eles.caseWonksVersion.addEventListener('mouseenter', () => { wonksHoverCSS.replaceSync('.wonks { outline: 1px solid red; }') });
        gbl.eles.caseWonksVersion.addEventListener('mouseleave', () => { wonksHoverCSS.replaceSync('') });
        gbl.eles.caseWonksVersion.addEventListener('click', () => { window.open("https://github.com/MECH2-at-Github/CaseWorks/", "_blank") });
    }();
    // !function pageSpecificTableCSS() {
    //     const pageSpecificTableCSSRules = new Map([ // format: ["Alias", [ ['table', 'rules'], ] ],
    //         ["CaseFile", [ ['table[summary="Document Processing Center"]', ''], ['table[summary="FSE Electronic File Cabinet"]', ''] ] ],
    //         // ["Alias", [ ['table', 'rules'], ] ],
    //     ]).get(page.alias)
    //     if (!pageSpecificTableCSSRules.length) { return };
    //     addCSSStyleSheet( pageSpecificTableCSSRules.map(([scope, rules]=[]) => "@scope (" + scope + ") { scope: {" + rules + "} }").join(' ') )
    // }();
}();

const caseFileCaseData = (() => { // used for case history and fixing page title // fse, mse correct //
    if (page.alias !== "CaseFile") { return };
    let caseIdNameEle = mainBody.querySelector('h1:not(#pageTitle)')
    let splitCaseData = { caseNum: undefined, caseName: undefined };
    function getCaseFileDataDetails() {
        if (!caseIdNameEle) { return };
        if ( caseIdNameEle.textContent.includes("Client Detail Not Found In Repository For Case ") ) { return { caseNum: caseIdNameEle.textContent.split("Client Detail Not Found In Repository For Case ")[1], caseName: "Not Found&sol;No Data" } }
        switch(editionCode) {
            case "fse": return caseIdNameEle.textContent.match(/(?<title>[A-Z ]+:) (?<caseNum>[0-9 ]+) (?<caseName>[A-Z'\-, ]+)/i).groups;
            case "mse": return caseIdNameEle.textContent.match(/(?<title>[A-Z ]+:) (?<caseName>[A-Z'\-, ]+) \((?<caseNum>[0-9]{8})\)/i).groups;
            case "cse": return;
            case "sse": return;
            default: return;
        };
    };
    Object.assign(splitCaseData, getCaseFileDataDetails())
    if (!splitCaseData.caseNum) { return splitCaseData };
    if (["fse", "mse", ].includes(editionCode)) {
        splitCaseData.caseNum = parseInt(splitCaseData.caseNum, 10)
        let caseIdNameEleReplacement = createNewEle('h1', { style: 'display: flex; gap: 10px;', title: "Left click: Copy Case Number.\nRight click: Open Document Discovery page." }),
            caseNumEle = createNewEle('div', { textContent: splitCaseData.caseNum }), caseNameEle = createNewEle('div', { textContent: splitCaseData.caseName })
        splitCaseData.caseName !== "Not Found&sol;No Data"
            ? caseIdNameEleReplacement.append( createNewEle('div', { textContent: splitCaseData.title }), caseNumEle, caseNameEle )
        : caseIdNameEleReplacement.append( createNewEle('div', { textContent: "Client Detail Not Found In Repository For Case " }), caseNumEle )
        caseIdNameEle.replaceWith( caseIdNameEleReplacement );

        caseIdNameEleReplacement.addEventListener('click', clickEvent => { snackBar(splitCaseData.caseNum, "Copied!", true) });
        caseIdNameEleReplacement.addEventListener('contextmenu', () => { window.open(openLinkFormatter("DocumentDiscovery", splitCaseData.caseNum), "_blank") } );
    };
    return splitCaseData;
})();
!function sideNavRearrange() {
    if (!gbl.sideNav.menu) { return };
    const locateByHref = (href, rootEle=document) => rootEle.querySelector('[href="' + href + '"]')
    const createExpando = ({ textContent, classList="", style="" }) => {
        let outerExpando = createNewEle('details', { classList })
        outerExpando.append( createNewEle('summary', { textContent }) )
        return outerExpando;
    };
    Array.from(gbl.sideNav.menu.querySelectorAll('li:not(:has(>a))'), ele => {
        let eleSpan = ele.querySelector('span')
        let expandoEle = createExpando({ textContent: eleSpan.querySelector('.menu-item-text').textContent, classList: "sideNavExpando wonks" })
        expandoEle.append(ele.querySelector('ul'))
        eleSpan.replaceWith(expandoEle)
    }); // "Join Leave Team DocBox", "Admin" //
    let subsLink = locateByHref(gbl.sideNav.subsLink, gbl.sideNav.menu)?.closest('li')
    if (subsLink) {
        let mySubsLink = createNewEle('li', { classList: "static wonks" });
        let mySubsHref = "/Lists/Subscription/Subscriptions.aspx#InplviewHasha58096de-cccd-44dd-9312-4b41ef7cdffc=FilterField1%3DDocBox-FilterValue1%3D" + caseWonksDataSet?.data?.userName
        mySubsLink.append( ...arrangeElements(
            [createNewEle('a', { href: mySubsHref, classList: "ms-core-listMenu-item", }),
             [createNewEle('span', { textContent: "Manage My Subs" })
             ],
            ]));
        locateByHref(gbl.sideNav.taxonomyList, gbl.sideNav.menu).closest('li')
            .insertAdjacentElement('afterend', subsLink )
            .insertAdjacentElement('afterend', mySubsLink )
    };
    !function moveCaseWorksLinksToExpando() {
        let caseWorksLinksExpando = createExpando({ textContent: "CaseWorks Links", classList: "sideNavExpando wonks" })
        gbl.sideNav.menu.append(...arrangeElements( [ createNewEle('li', { classList: 'static' }), [caseWorksLinksExpando] ]) )
        caseWorksLinksExpando.append( ...Array.from(gbl.sideNav.menu.querySelectorAll('[href^="https://nct1170.zendesk.com"]'), ele => ele.closest('li') ) );
    }();
    Array.from(gbl.sideNav.menu.querySelectorAll('a'), ele => { ele.target = "_blank" })
}();
!function addCustomNavBar() {
    if (!ribbon) { return };
    mainBody.insertAdjacentElement( 'afterbegin', gbl.eles.navContainer )
    !function mainPageLink() {
        gbl.eles.navContainer.append( gbl.eles.homePageLink )
        gbl.eles.homePageLink.addEventListener('click', () => { window.open(openLinkFormatter("Home"), "_self") });
        gbl.eles.homePageLink.addEventListener('contextmenu', contextmenuEvent => { contextmenuEvent.preventDefault(); window.open(openLinkFormatter("Home"), "_blank"); });
    }();
    !function addVersion() { mainBody.querySelector('#RibbonContainer-TabRowRight').append( gbl.eles.caseWonksVersion ) }();
    // Link to "All Docs" in Nav Bar? (would need to store the username from the Home Page)
    // "/Document%20Processing%20Center/Forms/AllItems.aspx?RootFolder=%2FDocument%20Processing%20Center%2F" + caseWonksDataSet.data.userName

//======================== Case_History | New_Tab_Case_Number_Field Section_Start ===================================//
    !function newTabFieldSetup() {
        gbl.eles.navContainer.appendChild(gbl.eles.newTabFieldDiv).append(gbl.eles.newTabField, gbl.eles.wonksCFButton, gbl.eles.wonksDDButton, gbl.eles.caseHistory)

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
            let validCaseNum = testCaseNumValidity(gbl.eles.newTabField.value)
            if (!validCaseNum) { return; }
            window.open(openLinkFormatter(pageNameNTF, validCaseNum), "_blank")
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
                    if (!caseFileCaseData.caseNum) { return };
                    const caseIdValTest = (entry) => entry.caseIdValNumber === caseFileCaseData.caseNum, foundDuplicate = caseHistory.findIndex(caseIdValTest)
                    if (foundDuplicate > -1) { caseHistory.splice(foundDuplicate, 1) }
                    let timestamp = dateFuncs.formatDate(new Date(), "mmddhm"), newHistoryEntry = { caseIdValNumber: caseFileCaseData.caseNum, caseName: caseFileCaseData.caseName, time: timestamp };
                    while (caseHistory.length > 9) { caseHistory.pop() }
                    caseHistory.unshift(newHistoryEntry)
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
                        if ( !testCaseNumValidity(pastedText) ) { return };
                        gbl.eles.newTabField.value = testCaseNumValidity(pastedText) ?? ""
                        filterHistory(gbl.eles.newTabField.value, undefined)
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
                            case 'Enter': pageOpenNTF(keydownEvent, "CaseFile"); break; // TODO: or settings.defaultPageOnEnter //
                            case 'Escape': hideCaseHistory(); gbl.eles.newTabField.blur(); break;
                            case 'ArrowUp':
                            case 'ArrowDown': caseHistoryChangeFocus(keydownEvent); break;
                            default: break;
                        };
                        keydownEvent.preventDefault()
                    });
                    gbl.eles.wonksCFButton.addEventListener('click', clickEvent => pageOpenNTF(clickEvent, "CaseFile"));
                    gbl.eles.wonksDDButton.addEventListener('click', clickEvent => pageOpenNTF(clickEvent, "DocumentDiscovery"));
                }();
                function filterHistory(inputValue, inputType) {
                    if (!inputValue) {
                        showElement(historyList, true)
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
                        historyList.forEach(ele => inputMatch.includes(ele) ? showElement(ele, true) : showElement(ele, false) )
                    } else { hideCaseHistory() };
                };
                function hideHistoryClick(clickEvent) {
                    if ( (gbl.eles.newTabFieldDiv).contains(clickEvent.target) ) { return };
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
const popupWindow = {
    popupEles: { popupTLO: undefined, popupIframe: undefined, popupIframeContainer: undefined, popupRootNode: undefined, titleSpanFirstWord: undefined, },
    // popupEles: { popupTLO: undefined, popupIframe: undefined, popupIframeContainer: undefined, popupTitleField: undefined, popupRootNode: undefined, editDropDown: undefined, popupDocBox: undefined, editFileToEFC: undefined, editReviewed: undefined, editP: undefined, titleSpanFirstWord: undefined, },
    watchForWindow() {
        verbose("watchForWindow: watching for new popup windows")
        let popupEles = this.popupEles
        popupEles.popupTLO = Array.from(mainBody.children).find(ele => ele.className.includes("ms-dlgContent"))
        const watchForPopupObserver = new MutationObserver(() => {
            popupEles.popupTLO ??= Array.from(mainBody.children).find(ele => ele.className.includes("ms-dlgContent"))
            if (!popupEles.popupTLO) { return };
            verbose("watchForWindow: popupTLO found")
            this.watchWindow()
            watchForPopupObserver.disconnect()
        });
        watchForPopupObserver.observe(mainBody, { childList: true, });
    },
    watchWindow() {
        let popupEles = this.popupEles
        const popupObserver = new MutationObserver(() => {
            verbose(1)
            popupEles.titleSpanFirstWord = popupEles.popupTLO.querySelector('div.ms-dlgTitle h1#dialogTitleSpan')?.textContent?.split(" ")[0]
            verbose(popupEles.titleSpanFirstWord)
            if (popupEles.titleSpanFirstWord === "Working") { return };
            popupEles.popupRootNode = popupEles.popupTLO.querySelector('.ms-dlgFrameContainer')?.querySelector('iframe')?.contentDocument // #document
            popupEles.popupTLO.focus()
            if (popupEles.popupRootNode) {
                popupEles.popupIframeHTML = popupEles.popupRootNode.documentElement // html level //
                popupEles.popupIframeContainer = popupEles.popupTLO.querySelector('.ms-dlgFrameContainer')
                popupEles.popupIframe = popupEles.popupIframeContainer.querySelector('iframe')
                popupEles.popupRootNode.querySelector('head').append( createNewEle('style', { textContent: "tr > div.wonks { height: 29px; line-height: 29px; } span.ms-metadata { display: none !important; } #s4-workspace { height: auto !important; }" }) );
                popupEles.popupIframeContainer.append(createNewEle('style', { textContent: "@scope { iframe { height: " + popupEles.popupIframeHTML.offsetHeight + "px !important; } }" }))
                popupEles.popupDocBox = popupEles.popupRootNode.querySelector('select[title="DocBox"]')
                popupEles.popupMaxis = popupEles.popupRootNode.querySelector('input[title="MAXIS"]')
                popupEles.popupTitleField = popupEles.popupRootNode.querySelector('input:is([title="Title Required Field"],[title="DocType Required Field"])')
            };
            popupObserver.disconnect()
            this.popupWindowCategory()
            this.watchForWindowRemoval()
        });
        popupObserver.observe(popupEles.popupTLO, { childList: true, subtree: true });
    },
    watchForWindowRemoval() {
        let popupEles = this.popupEles
        verbose("watchForWindowRemoval: watching for window removals")
        const removalObserver = new MutationObserver(() => { if ( this.doWindowRemovalCheck() ) { removalObserver.disconnect() }; });
        removalObserver.observe(mainBody, { childList: true, });
        removalObserver.observe(popupEles.popupIframeContainer, { childList: true, });
        if ( this.doWindowRemovalCheck() ) { removalObserver.disconnect(); return };
    },
    doWindowRemovalCheck() {
        if (mainBody.contains(this.popupEles.popupIframe)) { return 0 };
        if (!this.popupEles.popupTLO || !this.popupEles.popupTLO.isConnected) {
            verbose("watchForWindowRemoval: popupTLO removed");
            this.resetBaseValues(true)
            this.watchForWindow()
        } else {
            verbose("watchForWindowRemoval: popupRootNode removed. Returning to watchWindow");
            this.resetBaseValues()
            this.watchWindow()
        };
        return 1;
    },
    resetBaseValues(allValues) {
        let popupEles = this.popupEles
        if (allValues) { Object.keys(popupEles).forEach(key => { this.popupEles[key] = undefined }) }
        else { Object.keys(popupEles).forEach(key => { if (key === "popupTLO") { return }; this.popupEles[key] = undefined }) }
    },
    popupWindowCategory() {
        switch(this.popupEles.titleSpanFirstWord) {
            case "Connect": this.connectYourSMI(); break;
            case "Document": this.editProperties(); break;
            case "Subscription": this.subscriptionWindow(); break;
            case "Version": break;
            default: break;
        };
    },
    editProperties() {
        let popupEles = this.popupEles
        popupEles.editFileToEFC = popupEles.popupRootNode.querySelector('select[title="File to EFC"]')
        popupEles.editReviewed = popupEles.popupRootNode.querySelector('select[title="Reviewed"]')
        popupEles.editP = popupEles.popupRootNode.querySelector('input[title="P"]')
        popupEles.editDropDown = popupEles.popupRootNode.querySelector('#ui-id-2') // doc type drop down, only visible when changing doc type //
        !function changeInputsToRadios() {
            let pRow = popupEles.editP?.closest('tr')
            if (!pRow) { return };
            pRow.querySelector('nobr').textContent = "Priority"
            let radioConverts = [popupEles.editFileToEFC, popupEles.editReviewed, popupEles.editP].forEach(ele => { radioKilledTheOtherinputsStar(ele) });
        }();
        if (caseWonksDataSet.data.userName) {
            popupEles.popupDocBox.closest('tr').append( createNewEle('style', { textContent: "@scope { br { display: none; } select, button { display: inline-block; } }" }) )
            let epDocBoxButton = createNewEle('button', { type: "button", classList: "wonks wonks-button", textContent: "➔ " + caseWonksDataSet.data.userName, })
            popupEles.popupDocBox?.closest('td').append(epDocBoxButton)
            epDocBoxButton.addEventListener('click', () => { popupEles.popupDocBox.value = caseWonksDataSet.data.userName })
        };
        const popupDropDownObserver = new MutationObserver(() => { this.checkDocType() });
        popupDropDownObserver.observe(popupEles.editDropDown, { attributes: true, attributeFilter: ['style'] });
        this.checkDocType()
    },
    checkDocType() {
        let popupEles = this.popupEles
        if (!popupEles.popupTitleField) { return };
        if (["BULK", "MNB0"].includes( popupEles.popupTitleField.value.slice(0, 9).replace(/^\d\.\d\d? /, '').slice(0, 4) )) { popupEles.popupTitleField.setAttribute('style', "color: red !important;") }
        else { popupEles.popupTitleField.removeAttribute('style') };
        if (!popupEles.epAddSubButton?.isConnected && ["DHS3550"].includes(popupEles.popupTitleField.value.split(" ")[0])) { this.addSubButton(popupEles.popupRootNode) }
        else { popupEles.epAddSubButton?.remove() };
    },
    addSubButton() {
        let popupEles = this.popupEles
        let epEles = {
            epFirstName: popupEles.popupRootNode.querySelector('[title="First Name"]'),
            epLastName: popupEles.popupRootNode.querySelector('[title="Last Name"]'),
            epShortNote: popupEles.popupRootNode.querySelector('[title="Short Note/Next Step"]'),
        };
        popupEles.epAddSubButton = createNewEle('button', { type: "Button", textContent: "Sub Assist", id: "subButton", classList: "wonks" });
        !function appendAddSubButton() {
            let epDocSetTd = popupEles.popupRootNode.querySelector('[title="DocSet"]')?.closest('td');
            if (!epDocSetTd) { return };
            Object.assign(epDocSetTd, { style: "width: unset; display: flex; justify-content: space-between;" });
            epDocSetTd.append(popupEles.epAddSubButton)
            popupEles.epAddSubButton.addEventListener('click', () => {
                popupEles.editP.checked = true
                epEles.epShortNote.value = "sub'd"
                localStorage.setItem('CaseWonks.subAssist', JSON.stringify({ maxis: popupEles.popupMaxis.value, name: epEles.epFirstName.value + " " + epEles.epLastName.value, docBox: popupEles.popupDocBox.value }));
                let epSubParam = popupEles.popupDocBox.closest('tr').style.display === "none" ? "SortField%3DCreated-SortDir%3DDesc" : "FilterField1%3DDocBox-FilterValue1%3D" + popupEles.popupDocBox.value // can't use openLinkFormatter without adding another param to the function //
                window.open("/Lists/Subscription/Subscriptions.aspx#InplviewHasha58096de-cccd-44dd-9312-4b41ef7cdffc=" + epSubParam, "_blank")
            });
        }();
    },
    connectYourSMI() {
        // let popupEles = this.popupEles
        verbose("connectYourSMI: What about SMI? SMI's ME!")
        this.popupEles.popupRootNode.querySelector('#ctl00_PlaceHolderMain_txtSMIUsername').focus()
    },
    subscriptionWindow() {
        let popupEles = this.popupEles
        popupEles.popupTitleField = popupEles.popupRootNode.querySelector('[title="Title Required Field"]')
        if (gbl.refVars.wonksSubAssistLS && window.location.hash.includes("DocBox-FilterValue")) {
            let addSubContainer = createNewEle('td', { classList: "wonks" }), clearSubData = createNewEle('button', { type: "Button", textContent: "Clear Sub Data", id: "clearSubData", classList: "wonks-button" }),
                addSubEnterDataButton = createNewEle('button', { type: "Button", textContent: "Sub Assist", id: "subButton", classList: "wonks-button" });
            addSubContainer.append(addSubEnterDataButton)
            popupEles.popupRootNode.querySelector('.ms-toolbar input[id*=toolBarTbl_]').closest('td').insertAdjacentElement('beforebegin', clearSubData).insertAdjacentElement('beforebegin', addSubContainer)
            addSubEnterDataButton.addEventListener('click', () => {
                popupEles.popupMaxis.value = gbl.refVars.wonksSubAssistLS.maxis
                popupEles.popupDocBox.value = gbl.refVars.wonksSubAssistLS.docBox
                popupEles.popupTitleField.value = gbl.refVars.wonksSubAssistLS.name
                localStorage.removeItem('CaseWonks.subAssist')
            });
            clearSubData.addEventListener('click', () => { localStorage.removeItem('CaseWonks.subAssist') });
        } else { popupEles.popupTitleField.focus() };
    },
}; // mostly for edit properties and subscription //
popupWindow.watchForWindow();
// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓
// //////////////////////////////////////////////////////////////////////////////// PAGE_SPECIFIC SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
!function pageSpecificChanges() {
    try {
        switch(page.alias) {
            case "AllItems": { AllItems(); break; }
            case "CaseFile": { CaseFile(); break; }
            case "DocBox": { DocBox(); break; }
            case "DocDisc": { DocDisc(); break; }
            case "eSign": { eSign(); break; }
            case "Home": { HomePage(); break; }
            case "Scan": { Scan(); break; }
            case "Subs": { Subs(); break; }
            default: break;
        };
    } catch(err) { console.info(err) };
}();
function AllItems() {
    countDocs()
    //slider to hide pending?
};
function CaseFile() {
    if (!caseFileCaseData.caseNum) { return }; // also see caseFileCaseData for page changes relating to the title
    !function fixPageTitle() {
        document.querySelector('title').textContent = caseFileCaseData.caseName + " - " + caseFileCaseData.caseNum
    }();
    Array.from(document.querySelectorAll('td:has(>a[href="javascript:"])'), td => {
        let tdTextChild = td.childNodes[1], tdTaxText = tdTextChild.textContent.replace(":", "").trim(), taxSwapMatch = taxonomySwaps.get(tdTaxText)
        if (!taxSwapMatch) { return };
        tdTextChild.textContent = " : " + taxSwapMatch + " "
    });
};
function DocBox() {
    countDocs()
    //slider to hide pending?
};
function DocDisc() {
    mainBody.querySelector('.GoTd')?.removeAttribute('rowspan')
    addCSSStyleSheet(".DDTable { & td:not(:has(input, a)) { text-align: right; } & td:has(select) { padding: 0 !important; } td.GoTd { position: unset; margin: 0; } } h2 { display: flex; gap: 40px; align-items: center; padding: 0 3px !important; & > a { border: none !important; } }")

    const dpcH2 = document.querySelector('h2.ms-webpart-titleText:has(>a[href="/Document%20Processing%20Center"])')
    const fromCaseFile = document.referrer.includes("https://" + editionCode + countyCode + ".caseworkscloud.com/CWRF/Case%20File.aspx") ? "checked" : ""

    gbl.eles.hideNotificationsSlider = createSlider({ textContent: "Hide Notifications", title: "Show or Hide 'Notification' rows.", checked: fromCaseFile, id: "hideNotificationsSliderCheck" })
    gbl.eles.hideNotificationsStyle = addCSSStyleSheet(fromCaseFile === "checked" ? ".hideNotifications { display: none; }" : ".hideNotifications {}")
    gbl.eles.hideNotificationsSlider.checkbox?.addEventListener('click', clickEvent => { toggleSliderVisibility(clickEvent.target.checked, "hideNotifications", gbl.eles.hideNotificationsStyle) });

    gbl.eles.hideDeletedSlider = createSlider({ textContent: "Hide Deleted", title: "Show or Hide 'DeletedDPC' rows.", checked: "checked", id: "hideDeletedSliderCheck" })
    gbl.eles.hideDeletedStyle = addCSSStyleSheet(".hideDeleted { display: none; }")
    gbl.eles.hideDeletedSlider?.checkbox.addEventListener('click', clickEvent => { toggleSliderVisibility(clickEvent.target.checked, "hideDeleted", gbl.eles.hideDeletedStyle) });

    gbl.eles.navContainer?.append(gbl.eles.hideNotificationsSlider.container, gbl.eles.hideDeletedSlider.container)

    setTimeout(() => {
        !!window.location.search && mainBody.querySelector('#contentBox')?.scrollIntoView({ inline: "start" })
        if (document.querySelectorAll('.hideNotifications').length) { addSelectNotificationsButton() };
    }, 500);

    function addSelectNotificationsButton() {
        gbl.eles.selectNotifications = createNewEle('button', { type: "button", textContent: "Select Notifications", style: "color: light-dark(#222, #efefef); border-radius: 6px; padding: 5px 10px;", classList: "hideNotifications wonks" })
        dpcH2.append(gbl.eles.selectNotifications)
        gbl.eles.selectNotifications.addEventListener('click', () => {
            document.querySelector('.s4-itm-selected') && doClick(document.querySelector('.s4-itm-selected'))
            Array.from( document.querySelectorAll('tr.hideNotifications:not(.s4-itm-selected, .hideDeleted)'), tr => doClick(tr.children[0]) )
        });
    };
};
function eSign() {
    countDocs()
};
function HomePage() {
    !function shrinkHomePageMessage() {
        const messageTr = mainBody.querySelector('.ms-rtestate-field > div')?.closest('tr')
        if (messageTr && (/^[\u200b\n]+$/).test(messageTr.innerText)) { messageTr.style.display = "none" } // ​ is copied from the page // unicode is \u200b // (/^​\n+​$/) //
        else {
            Array.from(mainBody.querySelectorAll('.ms-rtestate-field div'))?.filter(div => div.textContent.length < 5)?.forEach( emptyDiv => emptyDiv.remove() )
        };
    }();
    !function setUserName() {
        const userName = mainBody.querySelector('.ms-webpart-chrome:has(span[title="My DocBox - Document Processing Center library"]) table table tbody[groupstring]').getAttribute('groupstring').replaceAll('%3B%23', '')
        caseWonksDataSet.updateInfo("data", "userName", userName)
    }();
};
function Scan() {
    const scanEles = {
        newEles: {
            docBoxSelfButton: createNewEle('button', { type: "button", classList: "wonks wonks-button", textContent: "➔ " + caseWonksDataSet.data.userName, }),
            docBoxSelfButtonStyle: createNewEle('style', { textContent: "@scope { br { display: none; } button { display: inline-block; margin-left: 5px; } }" }),
        },
        existing: {
            // docType: { ele: document.getElementById("ctl00_PlaceHolderMain_DocType_ctl00_TextField"), newVal: "FSE774 CCAP-Wkr Income Calc" },
            docBox: { ele: document.getElementById("ctl00_PlaceHolderMain_DocBox_DropDownChoice"), },
            fileToEFC: { ele: document.getElementById("ctl00_PlaceHolderMain_File_x0020_to_x0020_EFC_DropDownChoice"), newVal: "Yes" },
            // shortNote: { ele: document.getElementById("ctl00_PlaceHolderMain_Short_x0020_Note_x002F_Next_x0020_Step_ctl00_TextField"), },
            priority: { ele: document.getElementById("ctl00_PlaceHolderMain_P_ctl00_BooleanField"), },
            reviewed: { ele: document.getElementById("ctl00_PlaceHolderMain_Reviewed_DropDownChoice"), },
        },
    };
    scanEles.existing.fileToEFC.ele.closest('table').append(createNewEle('style', { textContent: "@scope { tr div :is(label, input[type=radio]) { height: 26px; line-height: 26px; } }" }))
    let radioConverts = [scanEles.existing.fileToEFC.ele, scanEles.existing.priority.ele, scanEles.existing.reviewed.ele].forEach(ele => { radioKilledTheOtherinputsStar(ele) });
    scanEles.existing.docBox.ele?.closest('tr').append( scanEles.newEles.docBoxSelfButtonStyle )
    scanEles.newEles.docBoxSelfButton.addEventListener('click', () => { scanEles.existing.docBox.ele.value = caseWonksDataSet.data.userName })
    scanEles.existing.docBox.ele?.closest('td').append(scanEles.newEles.docBoxSelfButton)

    //     !function updateFieldsForCCAP() {
    //         triggerEventOnValueAssigned(scanEles.docBox.ele)?.addEventListener('valueassigned', () => checkAndUpdateFields) // doesn't trigger - might have event that prevents propagation? //
    //      // triggerEventOnValueAssigned(scanEles.docBox.ele)?.addEventListener('valueassigned', ({ value: detail } = {}) => checkAndUpdateFields)
    //         function checkAndUpdateFields() {
    //             verbose('check and update fields')
    //             if (scanEles.docType.ele.value === scanEles.docType.newVal) {
    //                 if (caseWonksDataSet?.data.userName) { scanEles.docBox.ele.value = caseWonksDataSet.data.userName };
    //                 scanEles.fileToEFC.ele.value = scanEles.fileToEFC.newVal
    //                 scanEles.shortNote.ele.select()
    //             };
    //         };
    // }();
};
function Subs() {
    !async function compareSubLists() {
        let previouslySubmittedList = JSON.parse(sessionStorage.getItem('CaseWonks.subList')) ?? ""
        const compareOpenButton = createNewEle('button', { type: "button", textContent: "Compare", classList: "wonks-button" }),
              compareResetButton = createNewEle('button', { type: "button", textContent: "Reset", classList: "hidden wonks-button" }),
              hideButtonContainer = createNewEle('div', { style: "display: flex; gap: 5px; flex-direction: column; margin-top: 25px; width: 130px;", classList: "hidden wonks" }),
              hideMatchedButton = createNewEle('button', { type: "button", textContent: "Hide Matched", id: "hideMatched", style: "margin: 0;", classList: "wonks-button" }, { hiding: "no" }),
              hideMatchedStyle = createNewEle('style', { textContent: "@scope (#scriptWPQ1 table tbody) { :scope { .compareMatch, .newerEntry { display: none !important; } } } #hideMatched { color: red !important; } #hideWarning { display: block !important; }" }),
              hideUnmatchedButton = createNewEle('button', { type: "button", textContent: "Hide Unmatched", id: "hideUnmatched", style: "margin: 0;", classList: "wonks-button" }, { hiding: "no" }),
              hideUnmatchedStyle = createNewEle('style', { textContent: "@scope (#scriptWPQ1 table tbody) { :scope { .unmatched, .duplicateMatch { display: none !important; } } } #hideUnmatched { color: red !important; } #hideWarning { display: block !important; }" }),
              hideWarning = createNewEle('span', { textContent: "Don't drag-down while hiding rows.", id: "hideWarning", style: "font-style: italic; display: none;" }),
              compareDialog = createNewEle('dialog', { id: "compareDialog" }),
              compareTextarea = createNewEle('textarea', { id: "compareTextarea", value: previouslySubmittedList, placeholder: "1234567, 4567890, 7654321, ..." }),
              compareOkButton = createNewEle('button', { type: "button", textContent: "OK", classList: "wonks-button" }),
              compareCancelButton = createNewEle('button', { type: "button", textContent: "Cancel", classList: "wonks-button" }),
              compareContainer = createNewEle('div', { style: "margin: 70px 0 0 25px; display: flex; flex-direction: column; gap: 10px;", classList: "hidden wonks" }),
              dupeCaseContainer = createNewEle('div', { textContent: "Duplicate List:" }), dupeCaseList = createNewEle('div', { style: "margin-left: 5px;"}),
              colorCoding = createNewEle('div', { textContent: "Color legend:"}),
              uniqueCases = createNewEle('div'), matchedCount = createNewEle('div'),
              compareMissingContainer = createNewEle('div', { textContent: "Missing Case Numbers:" }),
              compareMissingList = createNewEle('div', { style: "margin-left: 5px;"})

        gbl.eles.navContainer.append( ...arrangeElements( [createNewEle('div'), [ compareOpenButton, compareResetButton ], ]) );
        gbl.eles.navContainer.append(hideButtonContainer);
        !function addElesToPage() {
            mainBody.querySelector('#contentRow')?.append(
                ...arrangeElements(
                    [createNewEle('style', { textContent: "@scope (#compareDialog) { :scope { dialog[open] { display: flex; flex-direction: column; gap: 10px; } textarea { width: 600px; height: 400px; } } } #scriptWPQ1 table tbody tr { font-weight: 550 !important; } .newerEntry {&,& * { color: light-dark(#339f33, #76f776) !important; }} .compareMatch {&,& * { color: light-dark(#a36139, #ffa700) !important; }} .duplicateMatch {&,& * { color: light-dark(#ee0000, #ff2626) !important; }}" }),
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
                        createNewEle('div', { classList: 'newerEntry', textContent: 'Newer Entry' }),
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
                      hideButtonContainer,
                      [hideMatchedButton,
                       hideUnmatchedButton,
                       hideWarning
                      ],
                     ],
                    ])
            );
        }();
        let today = Date.now()
        let tableAncestor = await tableLocator('#scriptWPQ1', mainBody)
        const editLinkText = () => tableAncestor.querySelector('#Hero-WPQ1 .ms-heroCommandLink[title="Edit this list using Quick Edit mode."], #Hero-WPQ1 .ms-heroCommandLink[title="Stop editing and save changes."]')?.textContent?.slice(0, 4).toUpperCase()
        let editMode = editLinkText()
        let existingTableQuery = ['#spgridcontainer_WPQ1_leftpane_mainTable > tbody', 'table[summary] > tbody', ]
        let existingTable = await tableLocator(existingTableQuery, tableAncestor)
        !function subAssistCheck() {
            if (!gbl.refVars.wonksSubAssistLS) { return };
            Array.from(existingTable.querySelectorAll('tbody tr'), ele => {
                let subsCaseNum = ele.children[4].textContent
                if (/[^ ]/.test(subsCaseNum)) { ele.classList.add(subsCaseNum) };
            });
            let alreadySubbed = existingTable.getElementsByClassName(gbl.refVars.wonksSubAssistLS.maxis)?.[0]
            if (alreadySubbed) {
                alreadySubbed?.scrollIntoView({ block: "center" })
                alreadySubbed.style.backgroundColor = "yellow"
                localStorage.removeItem('CaseWonks.subAssist')
            } else {
                mainBody.getElementById('idHomePageNewItem')?.click()
            };
        }();
        const rowMap = new Map()
        monitorForTableDestruction(existingTable, existingTableQuery, tableAncestor, ifTableDestroyed)
        function ifTableDestroyed(newTable) {
            existingTable = newTable
            editMode = editLinkText()
            if (!rowMap.size) { return }; // if not already done, don't auto run check //
            checkForDuplicateSubs(true)
        };
        function setVarsBasedOnEditMode(tr) {
            switch(editMode) {
                case "EDIT": return { caseIdNum: tr?.children[4]?.textContent?.trim(), entryDate: tr?.children[6]?.textContent?.trim() };
                case "STOP": return { caseIdNum: tr?.children[3]?.textContent?.trim(), entryDate: tr?.children[5]?.textContent?.trim() };
            };
        };
        async function checkForDuplicateSubs(followWithOkEvent) {
            dupeCaseList.replaceChildren()
            const caseListTrs = Array.from( existingTable?.querySelectorAll('tr:not(.ms-viewheadertr)') )
            rowMap.clear()
            caseListTrs.forEach(tr => {
                let caseIdNum = testCaseNumValidity(setVarsBasedOnEditMode(tr).caseIdNum)
                if (!caseIdNum) { return };
                if (rowMap.has(caseIdNum)) {
                    tr.classList.add('duplicateMatch')
                    dupeCaseList.append( createNewEle('div', { textContent: caseIdNum }) )
                    return;
                };
                rowMap.set(caseIdNum, tr)
            });
            uniqueCases.textContent = "Unique Count: " + rowMap.size
            showElement(compareContainer, true)
            showElement(hideButtonContainer, true)
            if (followWithOkEvent) { okEvent() };
        };
        function resetSubsTable() { Array.from( existingTable.querySelectorAll('tr:is(.duplicateMatch, .compareMatch, .newerEntry, .unmatched)'), ele => ele.classList.remove('duplicateMatch', 'compareMatch', 'newerEntry', 'unmatched') ); };
        compareOpenButton.addEventListener('click', () => {
            resetSubsTable()
            compareDialog.showModal()
            checkForDuplicateSubs()
            showElement(compareResetButton, true)
        });
        compareResetButton.addEventListener('click', () => {
            resetSubsTable()
            compareMissingList.replaceChildren()
            dupeCaseList.replaceChildren();
            showElement(compareResetButton, false)
            showElement(compareContainer, false)
            showElement(hideButtonContainer, false)
            matchedCount.textContent = ""
            rowMap.clear()
        });
        compareTextarea.addEventListener('keydown', keydownEvent => {
            switch(keydownEvent.key) {
                case "Enter": keydownEvent.preventDefault(); okEvent(); break;
                case "Escape": keydownEvent.preventDefault(); cancelEvent(); break;
            };
        })
        compareOkButton.addEventListener('click', okEvent);
        compareCancelButton.addEventListener('click', cancelEvent );
        hideButtonContainer.addEventListener('click', ({ target: clickedButton } = {}) => {
            switch(clickedButton) {
                case hideMatchedButton: { hideMatched(); return; }
                case hideUnmatchedButton: { hideUnmatched(); return; }
                default: break;
            };
            function hideMatched() {
                if (hideUnmatchedButton.dataset.hiding === "yes") { hideUnmatchedStyle?.remove(); hideUnmatchedButton.dataset.hiding = "no" };
                if (hideMatchedButton.dataset.hiding === "no") { document.head.append(hideMatchedStyle); hideMatchedButton.dataset.hiding = "yes" }
                else { hideMatchedStyle?.remove(); hideMatchedButton.dataset.hiding = "no" };
            };
            function hideUnmatched() {
                if (hideMatchedButton.dataset.hiding === "yes") { hideMatchedStyle?.remove(); hideMatchedButton.dataset.hiding = "no" };
                if (hideUnmatchedButton.dataset.hiding === "no") { document.head.append(hideUnmatchedStyle); hideUnmatchedButton.dataset.hiding = "yes" }
                else { hideUnmatchedStyle?.remove(); hideUnmatchedButton.dataset.hiding = "no" };
            };
        });
        function updateMatchedStyles(caseNumberListHasValue) {
            switch (caseNumberListHasValue) {
                case true:
                    hideMatchedStyle.textContent = "@scope (#scriptWPQ1 table tbody) { :scope { .compareMatch, .newerEntry { display: none !important; } } } #hideMatched { color: red !important; } #hideWarning { display: block !important; }"
                    hideUnmatchedStyle.textContent = "@scope (#scriptWPQ1 table tbody) { :scope { .unmatched, .duplicateMatch { display: none !important; } } } #hideUnmatched { color: red !important; } #hideWarning { display: block !important; }"
                    break;
                case false:
                    hideMatchedStyle.textContent = "@scope (#scriptWPQ1 table tbody) { :scope { .duplicateMatch { display: none !important; } } } #hideMatched { color: red !important; } #hideWarning { display: block !important; }"
                    hideUnmatchedStyle.textContent = "@scope (#scriptWPQ1 table tbody) { :scope { .unmatched { display: none !important; } } } #hideUnmatched { color: red !important; } #hideWarning { display: block !important; }"
                    break;
            };
        };
        function okEvent() {
            if (!compareTextarea?.value) { cancelEvent(); return };
            updateMatchedStyles(true)
            compareTextarea.value = compareTextarea.value.trim().replace(/\n/g, '')
            if ( (/[^0-9, ]/).test(compareTextarea.value) ) { alert("List contains invalid characters. Only numbers, commas, and spaces allowed."); return };
            let missingCasesFromPasted = []
            let pastedCaseList = compareTextarea.value?.trim().split(/, ?/)?.filter(e => e)
            sessionStorage.setItem('CaseWonks.subList', JSON.stringify(pastedCaseList))
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
            compareMissingList.append(...missingCasesFromPasted.map(caseNum => createNewEle('div', { textContent: caseNum + "," }) ))
            matchedCount.textContent = "Match Count: " + (pastedCaseList.length - missingCasesFromPasted.length) + '/' + pastedCaseList.length
            Array.from(existingTable.querySelectorAll('tr:not(.compareMatch, .duplicateMatch, .ms-viewheadertr)'), tr => {
                let entryDate = Date.parse(setVarsBasedOnEditMode(tr).entryDate)
                if ((today - entryDate) < 2592000000) { tr.classList.add('newerEntry') } // less than 30 days //
                else { tr.classList.add('unmatched') }
            });
        };
        function cancelEvent() {
            Array.from(existingTable.querySelectorAll('tr:not(.compareMatch, .duplicateMatch, .ms-viewheadertr)'), ele => ele.classList.add('unmatched') );
            updateMatchedStyles(false)
            compareDialog.close();
        };
    }();
};
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ PAGE_SPECIFIC SECTION END /////////////////////////////////////////////////////////////////////////////////////////////
// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓

// Merge for Mailing (adding to output): (Probably after settings are added. Could add a select with Team name options.)
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
const copySymbol = () => createNewEle('span', { textContent: ' ❐', style: 'padding-left: 2px; cursor: pointer;', onclick: function(clickEvent) { clickEvent.preventDefault(); snackBar(clickEvent.target.previousElementSibling?.textContent, "Copied!", true); clickEvent.target.style.filter = 'invert(1)'; setTimeout(() => { clickEvent.target.style.filter = "unset"; }, 2000); }, })
async function mainTableVariables(tr) {
    let checkbox, title, name, uselessMenu, firstName, lastName, shortNote, docBoxCaseNum, docBox, createdDate, createdBy, receivedDate, taxonomy, modifiedDate, modifiedBy, birthDate, reviewed, intCase, mnsureId
    switch(editionCode) {
        case "fse":
            switch(page.alias) {
                case "Home": [ checkbox,,, title, name, uselessMenu, firstName, lastName, shortNote, docBoxCaseNum, taxonomy, createdDate, receivedDate, createdBy ] = tr.children; break;
                case "CaseFile": [,,, title, name, uselessMenu, firstName, lastName, shortNote,, taxonomy, createdDate, receivedDate, createdBy ] = tr.children; break;
                case "Pending":
                case "WorkingDocs":
                case "AllItems": [ checkbox,,, reviewed, title, name, uselessMenu, firstName, lastName, shortNote, docBoxCaseNum, taxonomy, createdDate, createdBy ] = tr.children; break;
                case "DocBox": [ checkbox,,, reviewed, title, name, uselessMenu, firstName, lastName, shortNote, docBoxCaseNum, taxonomy, createdDate, receivedDate, createdBy ] = tr.children; break;
                case "eSign": [ checkbox,,, title, name, uselessMenu, firstName, lastName,, shortNote, docBoxCaseNum, taxonomy,,, modifiedDate, modifiedBy ] = tr.children; break;
                case "AllDpcDocs": [ checkbox,,,, title, name, uselessMenu, firstName, lastName,, shortNote, docBoxCaseNum ] = tr.children; break;
                case "DocDisc": [ checkbox,, title, name,, firstName, lastName, docBox, shortNote, docBoxCaseNum,,, birthDate, taxonomy, createdDate, receivedDate ] = tr.children; break;
                case "Appeals": [ checkbox,, title, name,, firstName, lastName, shortNote, docBoxCaseNum,, createdDate ] = tr.children; break;
                case "Trash": [ checkbox,, title, name,, firstName, lastName, shortNote, docBoxCaseNum, createdDate, modifiedDate, modifiedBy ] = tr.children; break;
                case "RecentEFC":
                case "AllEFCNinetyDays": [ checkbox,, title, name,, firstName, lastName, shortNote, docBoxCaseNum, taxonomy, createdDate, receivedDate, createdBy, modifiedDate, modifiedBy ] = tr.children; break;
                case "Subs":
                    switch(mainBody.querySelector('#scriptWPQ1 #Hero-WPQ1 .ms-heroCommandLink[title="Edit this list using Quick Edit mode."], #Hero-WPQ1 .ms-heroCommandLink[title="Stop editing and save changes."]')?.textContent?.toUpperCase()) {
                        case "EDIT": [,,,,,, createdDate, modifiedDate, modifiedBy ] = tr.children; break;
                        case "STOP": [,,,,, createdDate, modifiedDate, modifiedBy ] = tr.children; break;
                    }; break;
                default: break;
            }; break;
        case "mse":
            switch(page.alias) {
                case "Home": [ checkbox,,, title, name, uselessMenu, firstName, lastName, shortNote, intCase, mnsureId, docBoxCaseNum, taxonomy, createdDate, receivedDate, createdBy ] = tr.children; break;
                case "CaseFile": [,,, title, name, uselessMenu, firstName, lastName, shortNote,,,, taxonomy, createdDate, receivedDate, createdBy ] = tr.children; break;
                case "Author":
                case "DocBox": [ checkbox,,, reviewed, title, name, uselessMenu, firstName, lastName, shortNote, intCase, taxonomy, createdDate, receivedDate, createdBy ] = tr.children; break;
                case "WorkingDocs": [ checkbox,,, reviewed, title, name, uselessMenu, firstName, lastName, shortNote, intCase, taxonomy, createdDate, createdBy ] = tr.children; break;
                case "AllItems": [ checkbox,,, reviewed, title, name, uselessMenu, firstName, lastName, shortNote, intCase, taxonomy, createdDate, createdBy, receivedDate ] = tr.children; break;
                case "eSign": [ checkbox,,, title, name, uselessMenu, firstName, lastName,, shortNote, intCase, taxonomy,,, modifiedDate, modifiedBy ] = tr.children; break;
                case "DocDisc": [ checkbox,, title, name,, firstName, lastName, docBox, shortNote, intCase, docBoxCaseNum,, taxonomy, createdDate, receivedDate ] = tr.children; break;
                case "DocDiscDPC": [ checkbox,, title, name,, firstName, lastName, docBox, shortNote, intCase, docBoxCaseNum, taxonomy, createdDate ] = tr.children; break;
                case "ViewbyDocSet": [ checkbox,,, title, name, uselessMenu, firstName, lastName, shortNote, intCase, taxonomy, createdDate, receivedDate, createdBy ] = tr.children; break;
                case "PendingStatus": [ checkbox,,, title, name, uselessMenu, firstName, lastName, shortNote, intCase, taxonomy, createdDate, createdBy, receivedDate ] = tr.children; break;
                case "RecentEFC":
                case "AllEFCNinetyDays": [ checkbox,, title, name,, firstName, lastName, shortNote, intCase, mnsureId, docBoxCaseNum, taxonomy, createdDate, receivedDate, createdBy, modifiedDate, modifiedBy ] = tr.children; break;
                default: break;
            }; break;
        case "cse":
            break;
        case "sse":
            break;
    };
    return { checkbox, title, name, uselessMenu, firstName, lastName, shortNote, docBoxCaseNum, docBox, createdDate, createdBy, receivedDate, taxonomy, modifiedDate, modifiedBy, birthDate, reviewed, intCase, mnsureId };
};
async function secondaryTableVariables(tr) {
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
    gbl.refVars.currentTbody = await waitForTableCells(tableBody)
    if ( modifiedTables.includes(gbl.refVars.currentTbody) ) { return };
    modifyTableHeaders(gbl.refVars.currentTbody)
    modifiedTables.push(gbl.refVars.currentTbody)
    let sortedByCaseNum = gbl.refVars.currentTbody?.closest('table')?.querySelector('.ms-headerSortTitleLink:has(+span:not([style="display: none;"]))')?.textContent === "MAXIS" ?? false
    const tableBodyTrs = Array.from(gbl.refVars.currentTbody.querySelectorAll('tr'), tr => { // for await? // Array.fromAsync? //
        !async function fetchVarsThenDoModifications() {
            if (tr.querySelector('th')) { return }; // because some table headers are in the table body //
            mainTableVariables(tr).then( ({ checkbox, title, name, uselessMenu, firstName, lastName, shortNote, docBoxCaseNum, docBox, createdDate, createdBy, receivedDate, taxonomy, modifiedDate, modifiedBy, reviewed, birthDate, intCase, mnsureId } = {}) => {
                if (["DocDisc"].includes(page.alias)) { addClassToNotificationRows(name, tr); addClassToDeletedRows(docBox, tr) };
                if (sortedByCaseNum) { gbl.refVars.lastCaseNum = groupByCaseNumIfSorted(gbl.refVars.currentTbody, gbl.refVars.lastCaseNum, docBoxCaseNum, tr) };
                doModifications({ currentTbody: gbl.refVars.currentTbody, checkbox, title, name, firstName, lastName, shortNote, docBox, createdDate, createdBy, receivedDate, taxonomy, modifiedDate, modifiedBy, reviewed, birthDate, docBoxCaseNum, intCase, mnsureId })
            });
        }();
    });
    if (page.alias !== "Subs") { // subs has their own call //
        monitorForTableDestruction(tableBody, 'tbody', gbl.refVars.primaryTableLoc).catch(err => { console.log("monitor error"); console.log(err) })
    };
};
async function modifyDocumentTablesSecondary(tableBody) {
    gbl.refVars.currentTbody = await waitForTableCells(tableBody)
    if ( modifiedTables.includes(gbl.refVars.currentTbody) ) { return };
    const tableBodyTrs = Array.from(gbl.refVars.currentTbody.querySelectorAll('tr'), tr => {
        !async function fetchVarsThenDoModifications() {
            if (tr.querySelector('th')) { return };
            secondaryTableVariables(tr).then(({ checkbox, title, name, uselessMenu, firstName, lastName, shortNote, docBoxCaseNum, docBox, createdDate, createdBy, receivedDate, taxonomy, modifiedDate, modifiedBy, reviewed, intCase, mnsureId } = {}) => {
                doModifications({ currentTbody: gbl.refVars.currentTbody, title, name, shortNote, createdDate, receivedDate, modifiedDate })
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

function doModifications({ currentTbody, checkbox, title, name, firstName, lastName, shortNote, docBox, createdDate, createdBy, receivedDate, taxonomy, modifiedDate, modifiedBy, reviewed, birthDate, docBoxCaseNum, intCase, mnsureId, }={}) {
    modifyReviewed(reviewed)
    modifyTitles(title, shortNote)
    modifyShortNote(shortNote)
    modifyName(name)
    switch(editionCode) {
        case "fse": { modifyCaseNum(currentTbody, docBoxCaseNum, checkbox, docBox); break; }
        case "mse": { modifyCaseNum(currentTbody, intCase, checkbox, docBox); break; }
        default: break;
    };
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
        if (title.textContent?.includes('BULK SCAN') && shortNote.textContent?.includes('IM ')) {
            let bulkNoteTitle = shortNote.textContent.replace(/ (-|incl) DHH?S ?[0-9]{4}[A-Z]?/, "")
            replaceChildrenSpan(title, { title: originalTdText, textContent: bulkNoteTitle })
            replaceChildrenSpan(shortNote, { title: shortNote.textContent, textContent: "bulk" })
            return 1
        } else if (title.textContent?.includes('MNB00') && title.textContent?.includes('Application')) {
            let { appType, remainingShortNote } = determineAppType(shortNote.textContent)
            replaceChildrenSpan(title, { title: originalTdText, textContent: appType })
            replaceChildrenSpan(shortNote, { title: shortNote.textContent, textContent: remainingShortNote })
            return 1
        } else if (!shortNote?.textContent?.length) { return 0 };
    };
    if (modifyBadTitle()) { return };
    let matches = [...newTdText.matchAll(docTypeRegExp)].map(match => [ match[0], Object.entries(match.groups).filter(([key, val] = []) => val)?.[0]?.[0] ]);
    matches.forEach(([ patternMatch, group ] = []) => {
        let [ regExPattern, regExReplacement ] = docTypeSwaps[group]
        let regEx = docTypeSwaps[group][2]; if (!regEx) { regEx = new RegExp(regExPattern); docTypeSwaps[group].push(regEx) };
        newTdText = newTdText.replace(regEx, regExReplacement)
    });
    replaceChildrenSpan(title, { title: originalTdText, textContent: newTdText })
    function determineAppType(shortNoteText) {
        let mnbNumbIdx = title.textContent.indexOf('MNB00'), mnbNumb = title.textContent.slice(mnbNumbIdx, mnbNumbIdx+6);
        if (shortNoteText?.includes("CCAP")) { return { appType: "CCAP App. (" + mnbNumb + ")", remainingShortNote: "CCAP " + shortNoteText.replace(/[A-Z0-9_]+_(?:CAF|CCAP)_?/, '') } }
        else if (shortNoteText?.includes("CAF")) { return { appType: "CAF (" + mnbNumb + ")", remainingShortNote: "CAF " + shortNoteText.replace(/[A-Z0-9_]+_(?:CAF|CCAP)_?/, '') } }
        else { return { appType: "??? (" + mnbNumb + ")", remainingShortNote: shortNoteText } };
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
    newTdText = newTdText.replace(/(?<=[a-z])\.(?=[A-Z])(?![A-Za-z.]+\@)/g, ". ")
    replaceChildrenSpan(shortNote, { title: originalTdText, textContent: newTdText })
};
function modifyName(name) { // name = file link //
    if (!name || !name?.textContent) { return };
    let nameA = name.querySelector('a')
    let nameNewText = nameA?.textContent?.match(/^([A-Z]{1,3}[0-9]{3,4}[A-Z]? [A-Za-z0-9- ]+|Portal\d00 General [A-Z][a-z]|RG3F01\d IM MNS R3 39)__(?<filenum>[0-9]{4,})_[0-9-]+/)?.groups?.filenum
    nameA.textContent = "(view_" + (nameNewText ?? "item") + ")"
    if ( nameA.href.indexOf("Notification%20-%20Actio__") > -1 || ["txt", "jpg"].includes(nameA.href.slice(-3)) ) { nameA.target = "_blank" }; // Action Item Notes - load in new tab. // or jpg image //
    // nameA.addEventListener('click', clickEvent => {}) // can't get click event to properly trigger the ribbon on CaseFile //
};
function modifyCaseNum(currentTbody, tdCaseNum, tdCheckbox, tdDocBox) {
    if (!tdCaseNum) { return };
    let tdTableRow = tdCaseNum.closest('tr')
    let highlightClass = tdCaseNum.textContent ? tdCaseNum.textContent.replace(" ", "") : "noHighlight"
    let validCaseNum = testCaseNumValidity(highlightClass)
    if ("DocDisc".includes(page.alias) && window.location.search.indexOf(edition.docDiscSearch) > -1) { // if on DocDisc doing a search by case # // removes spaces as highlight will be grouped by docbox, which can have spaces //
        let caseNumLink = tdCaseNum.querySelector('a')
        caseNumLink && Object.assign(caseNumLink, { href: openLinkFormatter("CaseFile", validCaseNum), target: "_blank" })
        highlightClass = tdDocBox.textContent ? tdDocBox.textContent.replace(" ", "") : "noHighlight"
        tdTableRow.classList.add(highlightClass)
        highlightEvent({ currentTbody, highlightClass, tdTableRow, tdCheckbox })
        return;
    };
    let newLinkTd = createNewEle('td', { role: "gridcell", classList: "ms-cellstyle ms-vb2 ms-noWrap" })
    tdCaseNum.replaceWith(newLinkTd)
    if (!validCaseNum) { // invalid case number -> don't make into a link //
        if (highlightClass && highlightClass !== "noHighlight") { verbWarn("modifyCaseNum: !validCaseNum", highlightClass) };
        newLinkTd.append( createNewEle('span', { textContent: tdCaseNum.textContent, style: "color: red !important;" }) )
        highlightEvent({ currentTbody, highlightClass: "noHighlight", tdTableRow, tdCheckbox })
        return;
    };
    let newLinkA = createNewEle('a', { textContent: highlightClass, style: "cursor: pointer;" })
    newLinkTd.append(newLinkA, copySymbol())
    tdTableRow.classList.add(highlightClass)
    highlightEvent({ currentTbody, highlightClass, tdTableRow, tdCheckbox })
    newLinkA?.addEventListener('click', clickEvent => { clickAndCopy(clickEvent); window.open(openLinkFormatter("CaseFile", validCaseNum), "_self") });
    newLinkA?.addEventListener('contextmenu', contextmenuEvent => {
        contextmenuEvent.preventDefault(); contextmenuEvent.stopPropagation(); contextmenuEvent.stopImmediatePropagation();
        clickAndCopy(contextmenuEvent); window.open(openLinkFormatter("CaseFile", validCaseNum), "_blank")
    });
    function clickAndCopy(event) {
        copy(tdCaseNum.textContent)
        tdTableRow.click()
    };
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

async function modifyTablesAsLoaded() {
    if (!page.hasOwnProperty('primaryTableLoc')) { return };
    gbl.refVars.primaryTableLoc ??= tableLocQuery('primaryTableLoc')
    if (!gbl.refVars.primaryTableLoc) { return };
    gbl.refVars.primaryTableLoc.classList.add('dpcTableLoc')
    gbl.refVars.primaryTableLoc.addEventListener('mouseleave', () => { visualIndicatorIfPdfSelected() });
    let primaryTbodLoadedEles = tbodLoadedEles(gbl.refVars.primaryTableLoc)
    if (primaryTbodLoadedEles) { Array.fromAsync(primaryTbodLoadedEles, async tbod => await modifyDocumentTables(tbod) ) };
    const watchForTablesBeingLoaded = new MutationObserver(() => {
        tbodLoadedEles(gbl.refVars.primaryTableLoc)?.forEach(tbod => { modifyDocumentTables(tbod) })
    });
    watchForTablesBeingLoaded.observe(gbl.refVars.primaryTableLoc, { childList: true, subtree: true });

    if (["CaseFile", "Subs"].includes(page.alias)) { return};
    const watchForPrimaryTableLocExistence = new MutationObserver(async () => { // if !primaryTableLoc.isConnected, disconnect other observer, reset primaryTableLoc, restart observer //
        if (gbl.refVars.primaryTableLoc.isConnected && gbl.refVars.primaryTableLoc.parentElement) { return };
        watchForTablesBeingLoaded.disconnect()
        gbl.refVars.primaryTableLoc = tableLocQuery('primaryTableLoc')
        let primaryTbodLoadedEles = tbodLoadedEles(gbl.refVars.primaryTableLoc)
        if (primaryTbodLoadedEles) { Array.fromAsync(primaryTbodLoadedEles, async tbod => await modifyDocumentTables(tbod) ) };
        watchForTablesBeingLoaded.observe(gbl.refVars.primaryTableLoc, { childList: true, subtree: true });
    });
    watchForPrimaryTableLocExistence.observe(mainBody, { childList: true, subtree: true });
};
function modifyTablesAsLoadedSecondary() {
    if (!page.hasOwnProperty('secondaryTableLoc')) { return };
    gbl.refVars.secondaryTableLoc ??= tableLocQuery('secondaryTableLoc')
    if (!gbl.refVars.secondaryTableLoc.length) { return };
    gbl.refVars.secondaryTableLoc?.forEach( tableLoc => { tableLoc.classList.add('secondaryTableLoc') })
    let secondaryTbodLoadedEles = tbodLoadedElesSecondary(gbl.refVars.secondaryTableLoc)
    if (secondaryTbodLoadedEles) { Array.fromAsync(secondaryTbodLoadedEles, async tbod => await modifyDocumentTablesSecondary(tbod) ) };
    const watchForTablesBeingLoaded = new MutationObserver(() => { tbodLoadedElesSecondary()?.forEach(tbod => { modifyDocumentTablesSecondary(tbod) }) });
    gbl.refVars.secondaryTableLoc.forEach( tableLoc => { watchForTablesBeingLoaded.observe(tableLoc, { childList: true, subtree: true }); })
};
modifyTablesAsLoaded().then(() => { modifyTablesAsLoadedSecondary() })
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ MODIFICATIONS END /////////////////////////////////////////////////////////////////////////////////////////////////
// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓


// 〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓〓
// ///////////////////////////////////////////////////////////////////////////// FUNCTION_LIBRARY SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
function getTypeof(testSubject) {
    switch(true) {
        case !testSubject: return "Null";
        case Number(testSubject): return "Number"
    };
    return String(testSubject.constructor).match(/(?<=function )[A-Za-z]+(?=\(\))/)?.[0];
};
function openLinkFormatter(pageName, openLinkCaseNum) { // change "casenum" to something more generic?
    return new Map([
        ["CaseFile", "/CWRF/Case%20File.aspx?SystemRecordID=CASENUM&SOR=" + edition.SOR + "#DPC"],
        ["DocumentDiscovery", "/CWRF/Document%20Discovery.aspx?" + edition.docDiscSearch + "=CASENUM"],
        ["Home", "https://" + editionCode + countyCode + ".caseworkscloud.com/CWRF/Home.aspx"],
        // ["Subs", "/Lists/Subscription/Subscriptions.aspx#InplviewHasha58096de-cccd-44dd-9312-4b41ef7cdffc=CASENUM" + openLinkCaseNum],
    ]).get(pageName)?.replace("CASENUM", openLinkCaseNum)
};
function testCaseNumValidity(caseNumber) { caseNumber = caseNumber?.replace(/\s/g, ''); return (edition.caseNumFormat)?.test(caseNumber) ? caseNumber : undefined }; // MAXIS/MEC2: 1-7 digits. METS: 8 digits. PRISM: 10 + 2 digits.
function triggerEventOnValueAssigned(ele) { // triggers on: input (user, program), select (program) // works in MEC2, does not work in CW. The CW change is probably set to not bubble/stopProp //
    ele = sanitize.query(ele)
    if (!ele) { return };
    const { get, set } = Object.getOwnPropertyDescriptor(ele.constructor.prototype, 'value');
    Object.defineProperty(ele, 'value', {
        get() { return get.call(this) },
        set(newValue) {
            set.call(this, newValue); // Set the actual value using the native setter //
            this.dispatchEvent(new CustomEvent('valueassigned', { detail: newValue }));
        },
        configurable: true,
        enumerable: true,
    });
    return ele;
};

// element locators //
function tbodLoadedEles() {
    return page.singleTable
        ? [ gbl.refVars.primaryTableLoc.querySelector('tbody') ] // single table: first table body found in primaryTableLoc, no #id //
        : page.alias === "DocDisc" // DocDisc doesn't use 'isloaded' //
            ? Array.from(gbl.refVars.primaryTableLoc?.querySelectorAll('tbody:has(>tr.ms-itmhover)')) // DocDisc //
            : Array.from(gbl.refVars.primaryTableLoc?.querySelectorAll('tbody[id^=tbod]'))?.filter(ele => ele.getAttribute('isloaded') === "true") // multiple tables: all tbody elements with #id that starts with tbod //
};
function tbodLoadedElesSecondary() {
    return Array.from(gbl.refVars.secondaryTableLoc, loc => loc.querySelectorAll('tbody[id^=tbod]'))?.flatMap( nodeList => [...nodeList] )?.filter(ele => ele.getAttribute('isloaded') === "true");
};
async function tableLocator(tableQueryStr, tableAncestor = document) {
    let foundQuery = [tableQueryStr].flat().reduce((found, query) => found ?? tableAncestor.querySelector(query) ?? found, null); // for single tables that have multiple locations, which need to be prioritized //
    return !foundQuery ? undefined : await waitForTableCells(foundQuery)
};
function tableLocQuery(loc) {
    switch(loc) {
        case "primaryTableLoc": return mainBody.querySelector(page[loc]);
        case "secondaryTableLoc": return mainBody.querySelectorAll(page[loc])
    };
}
// element creators / manipulators //
function addCSSStyleSheet(rules) {
    const newStyleSheet = new CSSStyleSheet();
    rules && newStyleSheet.replaceSync(rules)
    document.adoptedStyleSheets.push(newStyleSheet)
    return newStyleSheet;
};
function addStyling(ele, styleObj) {
    if (!ele) { return };
    Object.entries(styleObj).forEach(([property, value] = []) => { ele.style[property] = value });
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
function createNewEle(nodeName, attribObj={}, dataObj={}) {
    let newEle = Object.assign(document.createElement(nodeName), attribObj);
    Object.entries(dataObj)?.forEach(([dataName, dataValue] = []) => { newEle.dataset[dataName] = dataValue });
    return newEle;
};
function createSlider({ textContent, title, id, checked, fontSize, classes: extraClasses, styles: extraStyles } = {}) {
    let sliderContainer = createNewEle('div', { classList: ["toggle-slider", extraClasses].flat().join(' '), style: extraStyles }), sliderCheckbox = createNewEle('input', { type: "checkbox", id, checked })
    sliderContainer.append(
        ...arrangeElements(
            [createNewEle('label', { title, textContent }),
             createNewEle('label', { classList: "switch", style: (fontSize && "font-size: " + fontSize + ";") }),
             [sliderCheckbox,
              createNewEle('span', { classList: "slider round" })
             ]
            ]
        )
    );
    return { container: sliderContainer, checkbox: sliderCheckbox };
};
function doWrap({ ele, type='div', classList='' } = {}) {
    ele = ele.nodeName === "#text" ? ele : sanitize.query(ele)
    const wrappingElement = createNewEle(type, { classList });
    ele.replaceWith(wrappingElement);
    wrappingElement.append(ele);
    return wrappingElement;
};
function radioKilledTheOtherinputsStar(origEle) {
    if (!origEle || !origEle instanceof HTMLElement) { return };
    let origEleName = origEle?.nodeName,
        radName = origEle.id + "Rad"
    let startingYes = ( origEle.value === "Yes" || origEle.checked === true) ? { checked: true } : {},
        startingNo = ( origEle.value === "No" ) ? { checked: true } : {}
    let repRadCont = createNewEle('div', { style: "display: flex; gap: 5px;", classList: "wonks" }),
        repRadNo = createNewEle( 'input', Object.assign({ type: "radio", id: radName + "IdNo", name: radName + "Name", value: "No", style: "margin-right: 5px;", }, startingNo) ),
        repLabelNo = createNewEle('label', { htmlFor: repRadNo.id, textContent: "No" }),
        repRadYes = createNewEle( 'input', Object.assign({ type: "radio", id: radName + "IdYes", name: radName + "Name", value: "Yes" }, startingYes) ),
        repLabelYes = createNewEle('label', { htmlFor: repRadYes.id, textContent: "Yes" })

    repRadCont.append( repLabelNo, repRadNo, repLabelYes, repRadYes )
    origEle?.closest('tr')?.append( repRadCont )
    origEle.closest('td').style.display = "none"
    !function setStartingValue() {}();
    repRadCont.addEventListener('click', clickEvent => {
        if (clickEvent.target.nodeName === "LABEL" || !clickEvent.target.value) { return };
        switch(clickEvent.target.value) {
            case "No": switchOrigToNo(); break;
            case "Yes": switchOrigToYes(); break;
        };
    });
    function switchOrigToNo() {
        switch(origEleName) {
            case "INPUT": origEle.checked = false; break;
            case "SELECT": origEle.value = "No"; break;
        };
    };
    function switchOrigToYes() {
        switch(origEleName) {
            case "INPUT": origEle.checked = true; break;
            case "SELECT": origEle.value = "Yes"; break;
        };
    };
};
function replaceChildrenSpan(td, spanProperties) {
    td.replaceChildren( createNewEle('span', spanProperties) )
};
function toggleSliderVisibility(isChecked, styleName, styleSheet) {
    switch(isChecked) {
        case true: styleSheet.replaceSync("." + styleName + " { display: none; }"); break;
        case false: styleSheet.replaceSync("." + styleName + " {}"); break;
    };
};
function toggleVisible(element, trueFalse) {
    element = Array.isArray(element) ? element : element instanceof NodeList ? [...element] : [element]
    element.forEach( ele => { ele = sanitize.query(ele); ele.style.visibility = trueFalse ? 'visible' : 'hidden' } );
};
function showElement(element, trueFalse) { (Array.isArray(element) || element instanceof NodeList ? [...element] : [element]).forEach( ele => { ele = sanitize.query(ele); trueFalse ? ele.classList.remove('hidden') : ele.classList.add('hidden') } ) }; // true to remove hidden, false to add hidden;

// Output: text / visual indicators //
function visualIndicatorIfPdfSelected() {
    let selectedLength = document.querySelectorAll('tr.s4-itm-selected:has(td.ms-vb-icon > img[alt="pdf File"])').length
    switch(selectedLength) {
        case 0: ribbon.classList.remove('pdfSelected'); break;
        default: ribbon.classList.add('pdfSelected'); break;
    };
};
function verbose() { console.info( ...arguments, "  (Verbose line: " + (Number((new Error).stack.split('\n')[2].split(':').toReversed()[1])-1) + ")" ) }; // Edge version //
function verbWarn() { console.warn( ...arguments, "  (VerbWarn line: " + (Number((new Error).stack.split('\n')[2].split(':').toReversed()[1])-1) + ")" ) }; // Edge version //
function copy(text) { if (typeof text !== 'string') { return }; navigator.clipboard.writeText(text) };
function snackBar(sbText, title="Copied!", doCopy=true) {
    if (!sbText) { return };
    document.getElementById('snackBarDiv')?.remove()
    let style = ""
    let snackBarDivs = {
        container: createNewEle('div', { id: "snackBarDiv", classList: "wonks" }),
        title: createNewEle('span', { textContent: title }),
        textarea: createNewEle('div'),
    };
    title !== "notitle" && snackBarDivs.container.appendChild( snackBarDivs.title )
    snackBarDivs.container.append( snackBarDivs.textarea )
    snackBarDivs.textarea.append( ...(sbText?.toString().split('\n').map( textLine => createNewEle('span', { textContent: textLine }) )) )
    mainBody.appendChild(snackBarDivs.container)
    doCopy && copy(snackBarDivs.textarea.textContent)
};

// Mutation Observers //
async function monitorForTableDestruction(existingTable, existingTableQuery, tableAncestor = document, ifTableDestroyedFn) {
    const waitForOldTableToBeDestroyed = new MutationObserver(async () => {
        if (existingTable?.isConnected && existingTable?.parentElement) { return };
        existingTable = tableLocator(existingTableQuery, tableAncestor).then(replacementTable => {
            modifyDocumentTables(replacementTable)
            if (ifTableDestroyedFn) { ifTableDestroyedFn(replacementTable) };
            return replacementTable;
        });
    });
    waitForOldTableToBeDestroyed.observe(tableAncestor, { childList: true, subtree: true });
};
async function waitForTableCells(awaitedTable) {
    return new Promise((resolve, reject) => {
        if (!awaitedTable) { reject("table does not exist") };
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

// row count / highlighting //
async function countDocs() { // For those pages where no total doc count exists, adds the count to the link located directly above the table //
    let docTableArea = tableLocQuery('primaryTableLoc'), docTable = await waitForEleWithAncestor('table[summary="Document Processing Center"].ms-listviewtable > tbody', docTableArea),
        currentPageLink = mainBody.querySelector('a.ms-pivotControl-surfacedOpt-selected')
    if (!currentPageLink) { return };
    currentPageLink.textContent = currentPageLink?.textContent + " (" + (docTable.querySelectorAll('tr').length ?? '') + ")"
};
function highlightAdd(highlightClass, currentTbody) {
    const trMatched = currentTbody?.getElementsByClassName(highlightClass)
    highlightClickCount(trMatched.length)
    Array.from(trMatched, tr => { tr.classList.add('selectedDocs')} );
};
function highlightRemove() {
    Array.from(mainBody.querySelectorAll('tr.selectedDocs'), tr => { tr.classList.remove('selectedDocs') });
};
function highlightEvent({ currentTbody, highlightClass, tdTableRow, tdCheckbox } = {}) {
    tdTableRow.addEventListener('click', highlightOnClickEvent);
    tdCheckbox?.addEventListener('click', highlightOnClickEvent);
    function highlightOnClickEvent(clickEvent) {
        if (highlightClass === gbl.refVars.highlight.selectedClass && !tdTableRow.className?.includes('s4-itm-selected') && tdTableRow.className?.includes('selectedDocs')) { return }; // highlighted: yes && selected: no //
        gbl.refVars.highlight.selectedClass = highlightClass // sets the global variable //
        highlightRemove()
        if (highlightClass === "noHighlight" || tdTableRow.className?.includes('s4-itm-selected')) { return highlightClickCount('') };
        highlightAdd(highlightClass, currentTbody)
    };
};
async function highlightClickCount(rowCount) {
    gbl.eles.clickedCount.textContent = rowCount;
    if (!gbl.eles.clickedCountCont.isConnected || !gbl.eles.clickedCountCont.parentElement) { waitForEleWithAncestor('#NCTCaseWorksGroup > .ms-cui-groupContainer > .ms-cui-groupTitle', ribbon).then(ribbonEle => ribbonEle.append( gbl.eles.clickedCountCont )) };
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
