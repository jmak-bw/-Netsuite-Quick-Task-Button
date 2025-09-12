// ==UserScript==
// @name         [Salesforce] Floating Info Button
// @version      1.0
// @description  Floating button to display extracted info from #links_splits table
// @match        https://*.app.netsuite.com/app/accounting/transactions/salesord.nl?id=*
// @author       JSM
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/jmak-bw/TampermonkeyScriptsJSM/main/Salesforce/Salesforce-Floating-Info-Box-Related-Records.user.js
// @downloadURL  https://raw.githubusercontent.com/jmak-bw/TampermonkeyScriptsJSM/main/Salesforce/Salesforce-Floating-Info-Box-Related-Records.user.js
// ==/UserScript==

(function () {
  'use strict';

  // --- Create Floating Action Button ---
  const fab = document.createElement('button');
  fab.innerHTML = '+';
  Object.assign(fab.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#6200EE',
    color: 'white',
    fontSize: '24px',
    border: 'none',
    cursor: 'pointer',
    zIndex: 9999,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  });

  // --- Create Info Panel ---
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed',
    bottom: '90px',
    right: '20px',
    width: '480px',      // increased so amounts fit
    maxHeight: '480px',
    overflowY: 'auto',
    backgroundColor: '#fff',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    display: 'none',
    zIndex: 9999,
  });

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  function extractInfo() {
    const table = document.getElementById('links_splits');
    if (!table) return '<p style="color:red;">Table with id="links_splits" not found.</p>';

    let rowIndex = 0;
    const rows = [];

    while (true) {
      const row = document.getElementById('linksrow' + rowIndex);
      if (!row) break;
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        const link = cells[0].querySelector('a');
        let status = cells[3].innerText.trim();
        if (status === 'Pending Bill') status = 'Pending Billing';
        if (status === 'Paid In Full') status = 'Paid';

        const type = cells[1].innerText.trim();
        const amount = (type === 'Invoice' && cells.length >= 6) ? cells[5].innerText.trim() : '';

        rows.push({
          date: cells[0].innerText.trim(),
          type,
          id: cells[2].innerText.trim(),
          status,
          amount,
          href: link ? link.href : '#'
        });
      }
      rowIndex++;
    }

    if (!rows.length) return '<p>No rows found.</p>';

    // Group rows by type
    const groups = {};
    rows.forEach(r => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    });

    const typeOrder = ['Item Fulfillment', 'Purchase Order', 'Invoice', 'Return Authorisation'];

    // Build HTML with consistent colgroup but NO ellipsis on Amount.
    let html = `
      <style>
        .floating-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          margin-bottom: 12px;
          table-layout: fixed;
        }
        .floating-table th,
        .floating-table td {
          padding: 6px 8px;
          border-bottom: 1px solid #eee;
          vertical-align: middle;
          text-align: left;
        }
        .floating-table th {
          background-color: #f6f6f6;
          border-bottom: 2px solid #ddd;
          font-weight: 600;
        }
        .table-title {
          font-weight: 700;
          margin: 8px 0 6px;
          padding: 4px 6px;
          background: #e9e9e9;
          border-radius: 4px;
        }

        /* Column widths (sum ≈ 100%) */
        .floating-table col.c1 { width: 7%; }   /* No. */
        .floating-table col.c2 { width: 22%; }  /* Date – gave more space */
        .floating-table col.c3 { width: 36%; }  /* ID */
        .floating-table col.c4 { width: 20%; }  /* Status */
        .floating-table col.c5 { width: 15%; }  /* Amount */


        /* Keep No. tiny */
        .floating-table td:nth-child(1) {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Allow Date to show fully (wraps if needed) */
        .floating-table td:nth-child(2) {
          white-space: normal;
          overflow: visible;
          text-overflow: unset;
        }

        /* ID: allow wrapping or clipped with tooltip (title attr) */
        .floating-table td:nth-child(3) {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Status: allow wrapping (helps longer statuses) */
        .floating-table td:nth-child(4) {
          white-space: normal;
        }

        /* IMPORTANT: Amount should NOT be ellipsed — show full value, right-aligned */
        .floating-table td.amount {
          text-align: right;
          white-space: nowrap;    /* keep currency on one line */
          overflow: visible;      /* allow the full amount to show */
        }

        .floating-table tr[data-href] { cursor: pointer; }
        .floating-table tr[data-href]:hover { background: #fafafa; }

        .floating-table thead th.subhdr {
          background: #fafafa;
          font-weight: 600;
          font-size: 12px;
        }
      </style>
    `;

    // Render per-type subtables (same colgroup so columns align)
    typeOrder.forEach(type => {
      if (!groups[type]) return;
      const isInvoice = type === 'Invoice';

      html += `<div class="table-title">${type}(s)</div>`;
      html += `<table class="floating-table"><colgroup>
                 <col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5">
               </colgroup>
               <thead>
                 <tr>
                   <th class="subhdr">No.</th>
                   <th class="subhdr">Date</th>
                   <th class="subhdr">ID</th>
                   <th class="subhdr">Status</th>
                   ${isInvoice ? '<th class="subhdr">Amount</th>' : '<th class="subhdr" style="visibility:hidden"></th>'}
                 </tr>
               </thead>
               <tbody>`;

      groups[type].forEach((r, i) => {
        // Format amount: ensure £ prefix, don't double-up
        const formattedAmount = isInvoice && r.amount
          ? '£' + r.amount.replace(/^£/, '')
          : '';

        html += `<tr data-href="${r.href}">
                   <td>${i + 1}</td>
                   <td>${r.date}</td>
                   <td title="${r.id}">${r.id}</td>
                   <td>${r.status}</td>
                   ${isInvoice ? `<td class="amount">${formattedAmount}</td>` : `<td class="amount"></td>`}
                 </tr>`;
      });

      html += `</tbody></table>`;
      delete groups[type];
    });

    // Any other types (not in typeOrder)
    Object.keys(groups).forEach(type => {
      html += `<div class="table-title">${type}(s)</div>`;
      html += `<table class="floating-table"><colgroup>
                 <col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5">
               </colgroup>
               <thead>
                 <tr>
                   <th class="subhdr">No.</th>
                   <th class="subhdr">Date</th>
                   <th class="subhdr">ID</th>
                   <th class="subhdr">Status</th>
                   <th class="subhdr" style="visibility:hidden"></th>
                 </tr>
               </thead>
               <tbody>`;

      groups[type].forEach((r, i) => {
        html += `<tr data-href="${r.href}">
                   <td>${i + 1}</td>
                   <td>${r.date}</td>
                   <td title="${r.id}">${r.id}</td>
                   <td>${r.status}</td>
                   <td class="amount"></td>
                 </tr>`;
      });

      html += `</tbody></table>`;
    });

    return html;
  }

  function attachRowListeners() {
    panel.querySelectorAll('tr[data-href]').forEach(row => {
      row.addEventListener('click', () => {
        const href = row.getAttribute('data-href');
        if (href && href !== '#') window.open(href, '_blank');
      });
    });
  }

  // Toggle button click
  fab.addEventListener('click', () => {
    if (panel.style.display === 'none') {
      panel.innerHTML = extractInfo();
      attachRowListeners();
      panel.style.display = 'block';
      fab.innerHTML = '×';
    } else {
      panel.style.display = 'none';
      fab.innerHTML = '+';
    }
  });

})();
