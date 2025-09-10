// ==UserScript==
// @name         [Netsuite] Visual aid for items on transaction page
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Highlight rows based on Back Ordered and Fulfilled; highlight Invoiced column green if fully invoiced; skip rows with empty Available; show summary counts above table
// @author       You
// @match        https://*.app.netsuite.com/app/accounting/transactions/salesord.nl?id=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=netsuite.com
// @grant        GM_addStyle
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/jmak-bw/TampermonkeyScriptsJSM/main/Netsuite-Highlight-Item-Line-Status.user.js
// @downloadURL  https://raw.githubusercontent.com/jmak-bw/TampermonkeyScriptsJSM/main/Netsuite-Highlight-Item-Line-Status.user.js
// ==/UserScript==

(function () {
    'use strict';

    const TABLE_ID = 'item_splits';
    const HIGHLIGHT_CLASSES = {
        GREEN: 'tm-highlight-green-cell',
        RED: 'tm-highlight-red-row',
        YELLOW: 'tm-highlight-yellow-row'
    };

    const css = `
        #${TABLE_ID} td.${HIGHLIGHT_CLASSES.GREEN} { background-color: #d4edda !important; }
        #${TABLE_ID} tr.${HIGHLIGHT_CLASSES.RED} td,
        #${TABLE_ID} tr.${HIGHLIGHT_CLASSES.RED} th { background-color: #ffe6e6 !important; }
        #${TABLE_ID} tr.${HIGHLIGHT_CLASSES.YELLOW} td,
        #${TABLE_ID} tr.${HIGHLIGHT_CLASSES.YELLOW} th { background-color: #fff3cd !important; }

        .tm-summary-box {
            margin: 8px 0;
            padding: 6px 10px;
            border: 1px solid #ccc;
            border-radius: 6px;
            background: #f9f9f9;
            font-size: 13px;
            font-family: sans-serif;
        }
        .tm-summary-box span { margin-right: 15px; }
        .tm-summary-red { color: #cc0000; font-weight: bold; }
        .tm-summary-yellow { color: #b58900; font-weight: bold; }
        .tm-summary-green { color: #228b22; font-weight: bold; }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    function parseNumber(text) {
        if (!text) return 0;
        const clean = text.replace(/\u00A0/g, ' ').replace(/,/g, '').trim();
        const num = parseFloat(clean);
        return Number.isFinite(num) ? num : 0;
    }

    function makeCellGetter(table, columnName) {
        return function getCell(row) {
            return row.querySelector(`td[data-ns-tooltip="${columnName}"]`);
        };
    }

    function getSummaryBox(table) {
        if (!table.__tmSummaryBox) {
            const box = document.createElement('div');
            box.className = 'tm-summary-box';
            table.parentNode.insertBefore(box, table);
            table.__tmSummaryBox = box;
        }
        return table.__tmSummaryBox;
    }

    function scanAndHighlight(table) {
        const getQuantity = makeCellGetter(table, 'Quantity');
        const getFulfilled = makeCellGetter(table, 'Fulfilled');
        const getInvoiced = makeCellGetter(table, 'Invoiced');
        const getBackOrdered = makeCellGetter(table, 'Back Ordered');
        const getAvailable = makeCellGetter(table, 'Available');
        const getPicked = makeCellGetter(table, 'Picked');

        const rows = table.querySelectorAll('tr.uir-machine-row');

        let redCount = 0;
        let yellowCount = 0;
        let greenCount = 0;

        rows.forEach(row => {
            // Remove previous highlights
            Object.values(HIGHLIGHT_CLASSES).forEach(cls => row.classList.remove(cls));
            const invoicedCell = getInvoiced(row);
            if (invoicedCell) invoicedCell.classList.remove(HIGHLIGHT_CLASSES.GREEN);

            const quantity = parseNumber(getQuantity(row)?.textContent);
            const fulfilled = parseNumber(getFulfilled(row)?.textContent);
            const invoiced = parseNumber(invoicedCell?.textContent);
            const backOrdered = parseNumber(getBackOrdered(row)?.textContent);

            const availableCell = getAvailable(row);
            const pickedCell = getPicked(row);
            const availableBlank = !availableCell || availableCell.textContent.trim() === '';
            const pickedBlank = !pickedCell || pickedCell.textContent.trim() === '';

            // Green for Invoiced cell
            if (invoiced === quantity && quantity !== 0 && invoicedCell) {
                invoicedCell.classList.add(HIGHLIGHT_CLASSES.GREEN);
                greenCount++;
            }

            // Skip red/yellow if Available and Picked are blank
            if (availableBlank && pickedBlank) return;

            // Row highlight logic
            if (backOrdered > 0) {
                row.classList.add(HIGHLIGHT_CLASSES.RED);
                redCount++;
            } else if (fulfilled < quantity) {
                row.classList.add(HIGHLIGHT_CLASSES.YELLOW);
                yellowCount++;
            }
        });

        // Update summary box
        const total = rows.length;
        const summaryBox = getSummaryBox(table);
        summaryBox.innerHTML = `
            <span class="tm-summary-red">Back Ordered: ${redCount}/${total}</span>
            <span class="tm-summary-yellow">To be dispatched: ${yellowCount}/${total}</span>
            <span class="tm-summary-green">Invoiced: ${greenCount}/${total}</span>
        `;
    }

    function observeTable(table) {
        const obs = new MutationObserver(() => scanAndHighlight(table));
        obs.observe(table, { childList: true, subtree: true });
        table.__tmBackorderObserver = obs;
    }

    function bootstrap() {
        const table = document.getElementById(TABLE_ID);
        if (table) {
            scanAndHighlight(table);
            observeTable(table);
            return;
        }
        const waitObs = new MutationObserver(() => {
            const t = document.getElementById(TABLE_ID);
            if (t) {
                scanAndHighlight(t);
                observeTable(t);
                waitObs.disconnect();
            }
        });
        waitObs.observe(document.body, { childList: true, subtree: true });
    }

    bootstrap();
    window.addEventListener('load', bootstrap);
})();
