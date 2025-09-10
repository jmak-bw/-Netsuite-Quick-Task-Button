// ==UserScript==
// @name         Netsuite: Quick Task Button [WORKING]
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Adds a "Task" button for transactions and item records
// @author       jmak
// @match        https://*.netsuite.com/app/accounting/*
// @match        https://*.netsuite.com/app/common/item/*
// @grant        GM_addStyle
// @run-at       document-idle
// @updateURL    https://github.com/jmak-bw/-Netsuite-Quick-Task-Button/raw/refs/heads/main/%5BNetsuite%7D-Quick-Task-Button.user.js
// @downloadURL  
// ==/UserScript==

(function() {
    'use strict';

    // Extract ID from URL (?id=xxxx)
    function getRecordId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    // Extract company ID (only exists on transactions)
    function getCompanyId() {
        const companyInput = document.querySelector('input[name="companyid"]');
        if (companyInput) {
            console.log("Extracted Company ID:", companyInput.value);
            return companyInput.value;
        }
        console.log("Company ID not found (likely not a transaction page)");
        return null;
    }

    // Decide if this page is a transaction or item
    function getPageType() {
        const path = window.location.pathname;
        if (path.includes('/accounting/transactions/')) return 'transaction';
        if (path.includes('/common/item/')) return 'item';
        return null;
    }

    // Create the "Task" button
    function createTaskButton(recordId, companyId, pageType) {
        if (!recordId) return; // must always have an ID

        const taskButton = document.createElement('button');
        taskButton.textContent = 'Task';
        taskButton.style.position = 'fixed';
        taskButton.style.bottom = '20px';
        taskButton.style.left = '70px';
        taskButton.style.padding = '10px 20px';
        taskButton.style.fontSize = '14px';
        taskButton.style.backgroundColor = '#4CAF50';
        taskButton.style.color = 'white';
        taskButton.style.border = 'none';
        taskButton.style.borderRadius = '5px';
        taskButton.style.cursor = 'pointer';
        taskButton.style.zIndex = '1000';
        taskButton.style.opacity = '0.5';
        taskButton.style.transition = 'opacity 0.3s';

        taskButton.addEventListener('mouseover', () => taskButton.style.opacity = '1');
        taskButton.addEventListener('mouseout', () => taskButton.style.opacity = '0.5');

        taskButton.addEventListener('click', () => {
            let taskUrl;

            if (pageType === 'transaction') {
                // Transaction-based task
                taskUrl = `https://7142405.app.netsuite.com/app/crm/calendar/task.nl?l=T&transaction=${recordId}`;
                if (companyId) {
                    taskUrl += `&invitee=${companyId}&company=${companyId}`;
                }
                taskUrl += `&refresh=activities`;
            } else if (pageType === 'item') {
                // Item-based task
                taskUrl = `https://7142405.app.netsuite.com/app/crm/calendar/task.nl?l=T&relateditem=${recordId}&refresh=activities`;
            }

            if (taskUrl) {
                window.open(taskUrl, '_blank', 'width=800,height=600');
            }
        });

        document.body.appendChild(taskButton);
    }

    // Run
    const recordId = getRecordId();
    const companyId = getCompanyId();
    const pageType = getPageType();

    if (recordId && pageType) {
        createTaskButton(recordId, companyId, pageType);
    }

    console.log('[RUNNING] Quick Task');
})();
