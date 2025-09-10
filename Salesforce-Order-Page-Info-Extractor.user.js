// ==UserScript==
// @name         [Salesforce] Order Page Info Extractor
// @namespace    http://tampermonkey.net/
// @version      0.1.2
// @description  Extract contract references, Branch, and description from order page
// @author       JSM
// @match        https://*.lightning.force.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/jmak-bw/TampermonkeyScriptsJSM/main/Salesforce-Order-Page-Info-Extractor.user.js
// @downloadURL  https://raw.githubusercontent.com/jmak-bw/TampermonkeyScriptsJSM/main/Salesforce-Order-Page-Info-Extractor.user.js
// ==/UserScript==

(function () {
    'use strict';

    let contractResults = [];
    let projectResults = [];
    let descriptionResults = [];
    let branchResults = [];

    // Inject CSS for animation and layout
    const style = document.createElement('style');
    style.textContent = `
    .sf-circle-btn {
        position: fixed;
        bottom: 30px;
        left: 30px;
        width: 56px;
        height: 56px;
        background: #4998f3ff;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 9999;
        transition: box-shadow 0.2s;
    }
    .sf-circle-btn img {
        width: 32px;
        height: 32px;
    }
    .sf-floating-box {
        position: fixed;
        bottom: 90px;
        left: 40px;
        min-width: 180px;
        max-width: 260px;
        background: #fff;
        border: 1px solid #ccc;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        padding: 18px 16px 16px 16px;
        font-family: Arial, sans-serif;
        word-break: break-word;
        max-height: 60vh;
        overflow-y: auto;
        z-index: 9999;
        opacity: 0;
        transform: translateX(-40px) scale(0.95);
        pointer-events: none;
        transition: opacity 0.3s, transform 0.3s;
    }
    .sf-floating-box.active {
        opacity: 1;
        transform: translateX(0) scale(1);
        pointer-events: auto;
    }
    .sf-floating-box .copyable {
        cursor: pointer;
        background: none;
        transition: background 0.2s;
        padding: 2px 4px;
        border-radius: 4px;
        display: inline-block;
    }
    .sf-floating-box .copyable.copied {
        background: #e0ffe0;
    }
    .sf-floating-box-label {
        font-weight: bold;
        margin-right: 3px;
    }
    `;
    document.head.appendChild(style);

    // Create circle button
    const circleBtn = document.createElement('div');
    circleBtn.className = 'sf-circle-btn';
    circleBtn.innerHTML = `<img src="https://babcock-wanson.lightning.force.com/img/icon/t4v35/standard/custom_120.png" alt="Show Data" />`;
    document.body.appendChild(circleBtn);

    // Create floating box
    const floatingBox = document.createElement('div');
    floatingBox.className = 'sf-floating-box';
    floatingBox.innerHTML = `<div class="sf-floating-content"></div>`;
    document.body.appendChild(floatingBox);

    // Show/hide logic
    circleBtn.onclick = () => {
        floatingBox.classList.toggle('active');
    };

    // Helper to update box content
    function updateBox() {
        const contract = contractResults[0] || '';
        const project = projectResults[0] || '';
        const branch = branchResults[0] || '';
        const description = descriptionResults[0] || '';
        floatingBox.querySelector('.sf-floating-content').innerHTML = `
            <div><span class="sf-floating-box-label">Contract:</span> <span class="copyable">${contract}</span></div>
            <div><span class="sf-floating-box-label">Project:</span> <span class="copyable">${project}</span></div>
            <div><span class="sf-floating-box-label">Branch:</span> <span class="copyable">${branch}</span></div>
            <div><span class="sf-floating-box-label">Description:</span> <span class="copyable">${description}</span></div>
        `;
        // Add click-to-copy
        floatingBox.querySelectorAll('.copyable').forEach(el => {
            el.onclick = function() {
                navigator.clipboard.writeText(el.textContent);
                el.classList.add('copied');
                setTimeout(() => { el.classList.remove('copied'); }, 500);
            };
        });
    }
    window.updateContractFloatingBox = updateBox;

    // XHR interception (your existing logic)
    function searchData() {
        const originalXHR = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function (method, url, async, user, pass) {
            this._url = url;
            return originalXHR.apply(this, arguments);
        };
        const originalSend = window.XMLHttpRequest.prototype.send;
        window.XMLHttpRequest.prototype.send = function (body) {
            this.addEventListener('load', function () {
                try {
                    if (this._url && this._url.includes('aura.RecordUi.getRecordWithFields')) {
                        const json = JSON.parse(this.responseText);
                        contractResults = [];
                        projectResults = [];
                        descriptionResults = [];
                        branchResults = [];
                        if (json.actions && Array.isArray(json.actions)) {
                            json.actions.forEach((action) => {
                                try {
                                    const fields = action.returnValue?.fields || {};
                                    const desc = fields.ORD_JobReference__c?.value || '';
                                    const project = fields.ORD_Affaire__r?.displayValue || '';
                                    const description = fields.ORD_Description_complementaire__c?.value || '';
                                    const branch = fields.ORD_Agence_Regionale_BW__c?.displayValue || '';
                                    contractResults.push(desc);
                                    projectResults.push(project);
                                    descriptionResults.push(description);
                                    branchResults.push(branch);
                                } catch (e) {
                                    contractResults.push('');
                                    projectResults.push('');
                                    descriptionResults.push('');
                                    branchResults.push('');
                                }
                            });
                            window.updateContractFloatingBox();
                        }
                    }
                } catch (e) {
                    // Silent fail
                }
            });
            return originalSend.apply(this, arguments);
        };
    }
    searchData();
})();
