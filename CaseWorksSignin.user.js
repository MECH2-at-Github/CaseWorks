// ==UserScript==
// @name         CaseWorks Credentials
// @namespace    http://github.com/MECH2-at-Github
// @version      2024-10-22-01
// @description  Auto-select Credentials
// @author       MECH2-at-Github
// @match        https://fsestlouis.caseworkscloud.com/_login/default.aspx*
// @grant        none
// ==/UserScript==

function sanitizeQuery(query) {
    function getSanitizedQuery(queryInput) {
        let sanitizedQuery
        if (typeof queryInput === "string") {
            let queryFromTextInput = queryInput.indexOf(',') === -1 && queryInput.indexOf('#') === 0 ? document.getElementById(queryInput.slice(1)) : document.querySelectorAll(queryInput)
            sanitizedQuery = queryFromTextInput instanceof HTMLElement || queryFromTextInput instanceof NodeList ? queryFromTextInput : undefined
        } else { sanitizedQuery = queryInput }
        return sanitizedQuery
    }
    if (!(typeof query === "string" || query instanceof HTMLElement || query instanceof NodeList)) { console.trace("sanitizeQuery: argument 1 invalid (" + query + ") - must be a valid query string, an HTMLElement, or a NodeList") }
    return getSanitizedQuery(query)
};
const changeEvent = new Event('change');
const doEvent = (element) => sanitizeQuery(element)?.dispatchEvent(changeEvent);

let credentialsSelect = document.getElementById('ctl00_PlaceHolderMain_ClaimsLogonSelector')
credentialsSelect.value = "TrustedMicrosoftEntraTrustStLouis"
doEvent(credentialsSelect)
