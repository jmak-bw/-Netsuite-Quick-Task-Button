// ==UserScript==
// @name         [Netsuite] Task Page Shortcuts
// @namespace    http://tampermonkey.net/
// @version      4.1.1
// @description  Adds shortcuts to Netsuite task pages.
// @author       JSM
// @match        https://*.netsuite.com/app/crm/calendar/task.nl?l=T&*
// @grant        GM_addStyle
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/jmak-bw/TampermonkeyScriptsJSM/main/Netsuite-Task-Page-Shortcuts.user.js
// @downloadURL  https://raw.githubusercontent.com/jmak-bw/TampermonkeyScriptsJSM/main/Netsuite-Task-Page-Shortcuts.user.js
// ==/UserScript==

(function() {
    'use strict';

    let SOID = null;
    let SDate = null;
    let itemTitle = null; // new fallback variable
    const currentYear = new Date().getFullYear();

    const dispatchMessages = {
        "Ship (DAP)": { message: "Hi Vaughan,\n\nCan this order go out on *SDate* please?\n\nThank you.", title: " – To be dispatched", priority: "Medium" },
        "Urgent AM": { message: "Hi Vaughan,\n\nCan this order go out on *SDate* for pre-9am delivery please?\n\nThank you.", title: " – Pre-9am – To be dispatched", priority: "High" },
        Taxi: { message: "Hi Vaughan,\n\nCan you pick and pack this order for *SDate* please? Wayne is coming to collect.\n\nThank you.", title: " – Urgent – Taxi collection", priority: "High" },
        International: { message: "Hi Vaughan,\n\nThis is an international order. \nCould you please pick and pack this order? Once done, please let us know and we will handle the commercial invoice and shipping.\n\nThank you.", title: " – To pick & pack – International Order", priority: "Medium" },
        "EX-WORKS": { message: "Hi Vaughan,\n\nCan you pick and pack this order and let us know once it's done please? \nThe client will be collecting this order.\n\nThank you.", title: " – To pick & pack – Client to collect", priority: "Medium" },
        "Engineer (F1)": { message: "Hi Vaughan,\n\nCan this go out to [ENGINEER]'s home address please?\n\nThank you!", title: " – Dispatch to [E] home address", priority: "Low" },
        "Lutts Collection": { message: "Hi Trevor,\n\nLutts will be coming to collect this order on *SDate*. Would you be able to prepare the order for collection please?\n\nThank you!", title: " – To be collected via Lutts", priority: "High" },
        "Bin collection": { message: "Hi Vaughan,\n\nCould you please pick this order and leave it in the BIN outside to be collected?\n\nThank you!", title: " – To be collected from BIN", priority: "Low" }
    };

    const invoiceMessages = {
        "Supply Only": { message: "Hi Wendy,\n\nCan this order be invoiced as is please?\n\nThank you.", title: " – Supply only – To be invoiced", priority: "Medium" },
        "Labour Only (T&M)": { message: "Hi Wendy,\n\nCan this order be invoiced under time and materials please?\n\nThank you.", title: " – Labour only – To be invoiced", priority: "Medium" },
        Project: { message: "Hi Wendy,\nCan this order be invoiced as a 1 line item please?\n\nThank you.", title: " – Project – To be invoiced", priority: "Medium" },
        "Supply & Fit": { message: "Hi Wendy,\n\nCan this order be invoiced as is please? (Showing labour + parts)\n\nThank you", title: " – Supply & Fit – To be invoiced", priority: "Medium" },
        "£0.00 Invoice": { message: "Hi Wendy,\n\nCan this order be invoiced as £0.00 please?\n\nThank you", title: " – Supply & Fit – To be invoiced", priority: "Medium" },
        "Proforma Invoice": {message: "Hi Wendy,\n\nCan this order be invoiced as is, please? It has been dispatched and paid via proforma invoice.\n\nThank you.", title: " – Proforma order – To be invoiced", priority: "Medium" },
        "Credit Note": {message: "Hi Wendy,\n\nCan you raise a credit note for this order, please? I will give you the signed form.\n\nThank you.", title: " – Credit Note", priority: "Medium" }
    };
    const purchaseMessages = {
        "No stock": { message: "Hi Matt,\n\nCould you please raise an order for more off [PT No.]? There's none left in stock.\n\nThank you!", title: " – PO to be raise – None left in stock", priority: "Medium" },
        PO: { message: "Hi Matt,\n\nCould you please raise a PO for the below item(s) please?\n\n\n\nThank you!", title: " – PO to be raised", priority: "High" },
        "Pt No. + PO": { message: "Hi Matt,\n\nCan you please raise a new part number and PO for the items below please?\n\n[PT No.]\n\nThank you!", title: " – Part no. + PO to be raise – PDR items", priority: "Medium" },
        ETA: { message: "Hi Matt,\n\nWould you be able to provide an ETA for the below items please?\nThe client is chasing us. \n\n\n\n\nThank you!", title: " – ETA delivery", priority: "High" }

    };



    // Function to extract SOID from the inpt_transaction_9 input field
    function extractSOID() {
        console.log("extractSOID: Running... ", new Date().toLocaleString());

        // Try to get the transaction_display element first
        let transactionDisplayElement = document.getElementById('transaction_display');

        // If not found, fallback to inpt_transaction_9
        if (!transactionDisplayElement) {
            transactionDisplayElement = document.getElementById('inpt_transaction_9');
        }

        if (transactionDisplayElement) {
            SOID = transactionDisplayElement.value;
            console.log('extractSOID: Success. Extracted value:', SOID);

            // Check if SOID contains "Work Order"
            if (SOID.includes("Work Order")) {
                const match = SOID.match(/Work Order #(\d+)/);
                if (match) {
                    SOID = "WO #" + match[1];  // Update with "WO" + number
                    console.log('extractSOID: Complete. Updated SOID for Work Order:', SOID);
                } else {
                    console.log('extractSOID: Failed. No number found after "Work Order #"');
                }
            }

            // Check if SOID contains "Sales Order #SO-BWUK-2025-"
            else if (/Sales Order #SO-BWUK-\d{4}-/.test(SOID)) {
                const match = SOID.match(/Sales Order #SO-BWUK-(\d{4})-(\d{5})/);
                if (match) {
                    const year = parseInt(match[1], 10);
                    if (year <= currentYear) {
                        SOID = "SO-" + match[2]; // Use last 5 digits
                        console.log(`extractSOID: Complete. Updated SOID for Sales Order (${year}):`, SOID);
                    } else {
                        console.log(`extractSOID: Ignored future year (${year}).`);
                    }
                }
            }
            // Check if SOID contains "Sales Order #SO<4-digit number>"
            else if (SOID.match(/Sales Order #SO\d{4}/)) {
                const match = SOID.match(/Sales Order #SO(\d{4})/);
                if (match) {
                    SOID = "SO-" + match[1];
                    console.log('extractSOID: Complete. Updated SOID for Sales Order (4-digit):', SOID);
                } else {
                    console.log('extractSOID: Failed. No matching number found after "Sales Order #SO"');
                }
            }
            // Invoice
            else if (/Invoice #INV-BWUK-\d{4}-/.test(SOID)) {
                const match = SOID.match(/Invoice #INV-BWUK-(\d{4})-(\d{5})/);
                if (match) {
                    const year = parseInt(match[1], 10);
                    if (year <= currentYear) {
                        SOID = "INV #" + match[2];
                        console.log(`extractSOID: Complete. Updated SOID for Invoice (${year}):`, SOID);
                    }
                }
            }

            // Purchase Order
            else if (/Purchase Order #PO-BWUK-\d{4}-/.test(SOID)) {
                const match = SOID.match(/Purchase Order #PO-BWUK-(\d{4})-(\d{5})/);
                if (match) {
                    const year = parseInt(match[1], 10);
                    if (year <= currentYear) {
                        SOID = "PO-" + match[2];
                        console.log(`extractSOID: Complete. Updated SOID for Purchase Order (${year}):`, SOID);
                    }
                }
            }
            // Check if SOID contains "Inventory Transfer #"
            else if (SOID.includes("Inventory Transfer #")) {
                const match = SOID.match(/Inventory Transfer #IT(\d{3})/);
                if (match) {
                    SOID = "Inventory Transfer #IT" + match[1];  // Update with "Inventory Transfer #" + last 3 digits
                    console.log('extractSOID: Complete. Updated SOID for Inventory Transfer:', SOID);
                } else {
                    console.log('extractSOID: Failed. No number found after "Inventory Transfer"');
                }
            }
            // Return Authorisation
            else if (/Return Authorisation #RMA-BWUK-\d{4}-/.test(SOID)) {
                const match = SOID.match(/Return Authorisation #RMA-BWUK-(\d{4})-(\d{5})/);
                if (match) {
                    const year = parseInt(match[1], 10);
                    if (year <= currentYear) {
                        SOID = "RMA-" + match[2];
                        console.log(`extractSOID: Complete. Updated SOID for Return Authorisation (${year}):`, SOID);
                    }
                }
            }
        } else {
            console.log('extractSOID: transaction_display and inpt_transaction_9 not found.');
        }

        // Fallback if SOID is still null/empty
        if (!SOID) {
            const relatedItemElement = document.getElementById('relateditem_display');
            if (relatedItemElement) {
                itemTitle = relatedItemElement.value;
                console.log('extractSOID: Fallback success. Extracted itemTitle:', itemTitle);
            } else {
                console.log('extractSOID: Fallback failed. relateditem_display not found.');
            }
        }
    }

    // Example of using the global SOID after extraction
    function logSOID() {
        console.log("Function logSOID: ", new Date());
        console.log('Current SOID:', SOID);
    }

    // Check if the event listener on body prevents links
    document.body.addEventListener('click', function(event) {
    }, false);


    function pasteSOID() {
        console.log("Function pasteSOID: ", new Date());
        let titleInput = document.getElementById("title");

        if (titleInput) {
            if (SOID) {
                titleInput.value = SOID + " - ";
            } else if (itemTitle) {
                titleInput.value = itemTitle + " - ";
            } else {
                console.log("pasteSOID: Nothing to paste. SOID and itemTitle are both empty.");
            }
        }
    }

    function addFillButton() {
        console.log("addFillButton: Running... ", new Date().toLocaleString());
        let button = document.createElement("button");
        button.innerText = "Fill";
        button.style.position = "absolute";
        button.style.top = "203px";
        button.style.left = "295px";
        button.style.zIndex = "9999"; // Ensure it stays on top
        button.style.background = "#007bff";
        button.style.color = "white";
        button.style.border = "none";
        button.style.padding = "3px 10px";
        button.style.cursor = "pointer";
        button.style.borderRadius = "5px";
        button.style.opacity = "0.2"; // Adjust opacity
        button.onmouseover = function() { button.style.opacity = "1.0"; };
        button.onmouseout = function() { button.style.opacity = "0.2"; }; // Adjust opacity
        button.style.boxShadow = "0px 4px 6px rgba(0,0,0,0.1)";
        button.onclick = pasteSOID;
        document.body.appendChild(button);
    }



    function extractSDate() {
        console.log("extractSDate: Running... ", new Date().toLocaleString());
        let dueDateInput = document.getElementById("duedate");
        if (dueDateInput) {
            SDate = dueDateInput.value;
            console.log("extractSDate: Success.: ", SDate);
        }
    }

    function extractDate(text) {
        console.log("extractDate: Running... ", new Date().toLocaleString());
        const regex = /\b(\d{2})\/(\d{2})\/(\d{2,4})\b/g;
        let match;
        let dates = [];

        while ((match = regex.exec(text)) !== null) {
            dates.push(match[0]);
        }
        return dates.length > 0 ? dates[0] : null; // Return the first matched date
    }
    // Define engineer options
    const engineerOptions = [
        { name: "Steve NIMMO", code: "SAN" },
        { name: "Ian GRUBB", code: "IG" },
        { name: "Ian COPE", code: "IC" },
        { name: "Mark MURGATROYD", code: "MBM" },
        { name: "Phil WILSON", code: "PW" },
        { name: "Duncan ATKINSON", code: "DA" },
        { name: "Joe GALLAGHER", code: "JAG" },
        { name: "John IRVINE", code: "JI" },
        { name: "Mark HORRIDGE", code: "MH" },
        { name: "Matthew TERRY", code: "MT" },
        { name: "Corey DOMAN", code: "CDD" },
        { name: "Ben PEPLOW", code: "BP" },
        { name: "Robert MCGINTY", code: "RM" },
        { name: "Bill GIBBONS", code: "BG" }
    ];
    // Add engineer dropdown after "Engineer (F1)" is selected
    function createEngineerDropdown() {
        console.log("createEngineerDropdown: Running... ", new Date().toLocaleString());
        let container = document.createElement("div");
        container.style.position = "fixed";
        container.style.top = "80px"; // Adjust to position below Dispatch dropdown
        container.style.right = "160px";
        container.style.zIndex = "1000";

        let select = document.createElement("select");
        select.style.padding = "8px";
        select.style.fontSize = "14px";
        select.style.fontWeight = "bold";
        select.style.borderRadius = "5px";
        select.style.border = "2px solid black";
        select.style.backgroundColor = "#FF5733";
        select.style.color = "white";

        let defaultOption = document.createElement("option");
        defaultOption.innerText = "Select Engineer";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);

        engineerOptions.forEach(option => {
            let optionElement = document.createElement("option");
            optionElement.value = option.code;
            optionElement.innerText = option.name;
            select.appendChild(optionElement);
        });

        select.onchange = function() {
            const selectedEngineer = engineerOptions.find(e => e.code === select.value);
            if (selectedEngineer) {
                updateEngineerDetails(selectedEngineer);
                container.remove(); // Remove the dropdown after selection
            }
        };

        container.appendChild(select);
        document.body.appendChild(container);
    }

    // Function to update message and title based on selected engineer
    function updateEngineerDetails(engineer) {
        console.log("updateEngineerDetails: Running... ", new Date().toLocaleString());
        const titleInput = document.getElementById("title");
        const messageInput = document.getElementById("message");

        if (titleInput && messageInput) {
            const dispatchMessage = dispatchMessages["Engineer (F1)"];
            titleInput.value = SOID + " – Dispatch to " + engineer.code + " home address";
            messageInput.value = dispatchMessage.message.replace("[ENGINEER]", engineer.name).replace("[E]", engineer.code);
            console.log("updateEngineerDetails: Success. Engineer updated: ", { title: titleInput.value, message: messageInput.value });
            showPopup('Success. Engineer updated.', 'green');
        }
    }

    // Function to simulate a click on the center of an image
    function clickImageCentre() {
        console.log("clickImageCentre: Running... ", new Date().toLocaleString());
        // Find the image element by its source URL
        const imgElement = document.querySelector('img.checkboximage[src="/images/nav/ns_x.gif"]');

        if (!imgElement) {
            console.error("Image with source '/images/nav/ns_x.gif' not found.");
            return;
        }

        // Get the image's position and dimensions
        const rect = imgElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Create a synthetic mouse event at the center of the image
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientX: centerX,
            clientY: centerY
        });

        // Dispatch the click event on the image element
        imgElement.dispatchEvent(clickEvent);
        console.log("clickImageCentre: Success. 'Notify Assignee by Email' ticked.");
    }


    // Check if the URL contains the correct string
    if (window.location.href.includes('/app/crm/calendar/task.nl?l=T&')) {
        let savedDueDate = null;

        // Combined window load listener
        window.addEventListener("load", function() {
            // Extract SOID and SDate
            extractSOID();

            // Create dropdowns for Dispatch and Invoice
            createDropdown("Dispatch", dispatchMessages, key => updateFields("dispatch", dispatchMessages[key]), "#FF5733");
            console.log("createDropdown: Success. Dropdown created. (Dispatch)", new Date().toLocaleString());
            createDropdown("Invoice", invoiceMessages, key => updateFields("invoice", invoiceMessages[key]), "#3388FF");
            console.log("createDropdown: Success. Dropdown created. (Invoice)", new Date().toLocaleString());
            createDropdown("Purchase", purchaseMessages, key => updateFields("Purchase", purchaseMessages[key]), "#34c3eb");
            console.log("createDropdown: Success. Dropdown created. (Purchase) ", new Date().toLocaleString());
            addFillButton();
            console.log("addFillButton: Success. Button created. (Fill)", new Date().toLocaleString());

            // Create the "Update Date" button
            const updateButton = document.createElement('button');
            updateButton.innerHTML = 'Update';  // Break the text into two lines using <br>
            updateButton.style.position = 'absolute';
            updateButton.style.top = '482px';
            updateButton.style.left = '320px';
            updateButton.style.padding = '5px 10px';  // Smaller padding for a smaller button
            updateButton.style.backgroundColor = '#ffa600';
            updateButton.style.color = 'white';
            updateButton.style.border = 'none';
            updateButton.style.borderRadius = '5px';
            updateButton.style.fontSize = '12px';  // Smaller font size
            updateButton.style.fontWeight = 'bold';
            updateButton.style.cursor = 'pointer';
            updateButton.style.whiteSpace = 'normal';  // Allows the text to wrap
            updateButton.style.textAlign = 'center';  // Center-align the text
            updateButton.style.lineHeight = '1.2';  // Adjust line height for better spacing
            document.body.appendChild(updateButton);

            // Button click handler
            updateButton.addEventListener('click', function() {
                // Trigger the first click
                handleUpdateClick();
                console.log("handleUpdateClick: Success. ", new Date().toLocaleString());
            });

            function handleUpdateClick() {
                console.log("handleUpdateClick: Running... ", new Date().toLocaleString());
                const dueDateElement = document.querySelector('[name="duedate"]'); // Ensure this element is selected
                if (dueDateElement) {
                    const currentDueDate = dueDateElement.value;
                    const messageElement = document.getElementById('message');
                    if (messageElement) {
                        const messageText = messageElement.value;
                        const messageDate = extractDate(messageText);
                        if (messageDate) {
                            if (messageDate === savedDueDate) {
                                showPopup('Nothing updated. Same date.', 'red');
                                console.log("extractDate: Success. ", new Date().toLocaleString());
                                console.log("showPopup: Success. (Nothing updated. Same date.)', 'green ", new Date().toLocaleString());

                            } else {
                                const updatedMessage = messageText.replace(messageDate, currentDueDate);
                                messageElement.value = updatedMessage;
                                showPopup('Success. Date in message updated.', 'green');
                                console.log("extractDate: Success. ", new Date().toLocaleString());
                                console.log("showPopup: Success. (Success. Date in message updated.)', 'green ", new Date().toLocaleString());

                            }
                            savedDueDate = currentDueDate;
                        } else {
                            showPopup('Nothing updated. No date found in message.', 'red');
                            console.log("extractDate: Success. ", new Date().toLocaleString());
                            console.log("showPopup: Success. (Nothing updated. No date found in message.)", new Date().toLocaleString());

                        }
                    } else {
                        console.log('handleUpdateClick: Message element not found!');

                    }
                }
            }

            const imgElement = document.querySelector('img.checkboximage[src="/images/nav/ns_x.gif"]');
            if (imgElement) {
                clickImageCentre(imgElement);
            } else {
                console.log("clickImageCentre: (Error) Image not found.");
            }
        });
    }

    function updatePriority(priorityType) {
        console.log("updatePriority: Running... ", new Date().toLocaleString());
        let priorityInput = document.getElementById("inpt_priority_2");
        let priorityHidden = document.getElementById("hddn_priority_2");
        let priorityIndex = document.getElementById("indx_priority_2");

        console.log("updatePriority: Updating priority...");

        // Check if elements exist
        if (!priorityInput || !priorityHidden || !priorityIndex) {
            console.error("Priority fields not found on the page.");
            return;
        }

        if (priorityType === "Medium") {
            // Set priority to "Medium" for Dispatch, International, and Collection
            console.log("updatePriority: Setting Medium priority.");
            priorityInput.value = "Medium";
            priorityHidden.value = "MEDIUM";
            priorityIndex.value = "2";
        } else if (priorityType === "High") {
            // Set priority to "High" for Urgent AM and Taxi
            console.log("updatePriority: Setting High priority.");
            priorityInput.value = "High";
            priorityHidden.value = "HIGH";
            priorityIndex.value = "3";
        } else if (priorityType === "Low") {
            // Set priority to "High" for Urgent AM and Taxi
            console.log("updatePriority: Setting Low priority.");
            priorityInput.value = "Low";
            priorityHidden.value = "LOW";
            priorityIndex.value = "1";
        }

        // Log values to verify changes
        console.log("updatePriority: priorityInput.value:", priorityInput.value);
        console.log("updatePriority: priorityHidden.value:", priorityHidden.value);
        console.log("updatePriority: priorityIndex.value:", priorityIndex.value);
    }
    const positions = {
        Dispatch: "250px",
        Invoice: "152px",
        Purchase: "40px"
    };

    function createDropdown(name, options, handler, color) {
        console.log("createDropdown: Running... (", name,")", new Date().toLocaleString());

        let container = document.createElement("div");
        container.style.position = "fixed";
        container.style.top = "10px";
        container.style.right = positions[name] || "0px";
        container.style.zIndex = "1000";

        // Check if the button already exists. If it does, return to prevent creating a new one.
        let existingMainButton = document.getElementById(name);
        if (existingMainButton) return;

        // Create a main button (like Dispatch or Invoice)
        let mainButton = document.createElement("button");
        mainButton.id = name;  // Set an ID to identify this button
        mainButton.innerText = name;
        mainButton.style.padding = "8px 20px";
        mainButton.style.fontSize = "14px";
        mainButton.style.fontWeight = "bold";
        mainButton.style.borderRadius = "5px";
        mainButton.style.border = "0px";
        mainButton.style.backgroundColor = color;
        mainButton.style.color = "white";
        mainButton.style.cursor = "pointer";
        mainButton.style.position = "relative"; // Ensures the dropdown appears below it
        mainButton.style.minWidth = "50px";

        // Create a container for the option buttons (initially hidden)
        let optionContainer = document.createElement("div");
        optionContainer.style.display = "none";  // Hidden by default
        optionContainer.style.flexDirection = "column";
        optionContainer.style.gap = "5px"; // Space between buttons (reduced to make them smaller)
        optionContainer.style.position = "absolute"; // Position the dropdown content absolutely
        optionContainer.style.top = "100%"; // Position it right below the main button
        optionContainer.style.left = "0"; // Align to the left edge of the main button
        optionContainer.style.marginTop = "5px"; // Slightly move the options down for spacing
        optionContainer.style.zIndex = '9999';
        optionContainer.style.minWidth = "50px";

        mainButton.onclick = function () {
            // Only toggle the dropdown if it's not already visible
            optionContainer.style.display = optionContainer.style.display === "none" ? "flex" : "none";
        };

        Object.keys(options).forEach(key => {
            let optionButton = document.createElement("button");
            optionButton.innerText = key;
            optionButton.style.padding = "5px 10px";
            optionButton.style.fontSize = "12px";
            optionButton.style.fontWeight = "normal";
            optionButton.style.borderRadius = "4px";
            optionButton.style.border = "1px solid white";
            optionButton.style.backgroundColor = lightenColor(color, 0.2);
            optionButton.style.color = "white";
            optionButton.style.cursor = "pointer";
            optionButton.style.width = "100px";
            optionButton.style.height = "50px";

            optionButton.onclick = () => {
                handler(key);
                optionContainer.style.display = "none";
                if (key === "Engineer (F1)") {
                    createEngineerDropdown();
                } else {
                    const engineerDropdown = document.querySelector("div select");
                    if (engineerDropdown) engineerDropdown.remove();
                }
            };

            optionContainer.appendChild(optionButton);
        });

        container.appendChild(mainButton);
        container.appendChild(optionContainer);
        document.body.appendChild(container);
    }

    // Function to lighten a given color by a percentage
    function lightenColor(color, percent) {
        let r, g, b;

        // Check if the color is in hex format
        if (color[0] === '#') {
            color = color.substring(1);
            r = parseInt(color.substring(0, 2), 16);
            g = parseInt(color.substring(2, 4), 16);
            b = parseInt(color.substring(4, 6), 16);
        }
        // If the color is in rgb format
        else if (color.startsWith('rgb')) {
            let match = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
            r = parseInt(match[1]);
            g = parseInt(match[2]);
            b = parseInt(match[3]);
        }

        // Lighten the color by a percentage
        r = Math.min(255, Math.floor(r + (255 - r) * percent));
        g = Math.min(255, Math.floor(g + (255 - g) * percent));
        b = Math.min(255, Math.floor(b + (255 - b) * percent));

        return `rgb(${r}, ${g}, ${b})`;
    }
    function updateFields(type, messageData) {
        console.log("updateFields: Running... ", new Date().toLocaleString());
        extractSDate();
        let titleInput = document.getElementById("title");
        let messageInput = document.getElementById("message");
        let assignedDisplay = document.getElementById("assigned_display");
        let assignedHidden = document.getElementById("hddn_assigned_fs");

        if (titleInput && messageInput && assignedDisplay && assignedHidden) {
            let updated = false;

            // Update title and message
            // ✅ Use fallback if SOID is missing
            if (SOID) {
                titleInput.value = SOID + messageData.title;
            } else if (itemTitle) {
                titleInput.value = itemTitle + messageData.title;
            } else {
                titleInput.value = messageData.title; // last resort
            }

            messageInput.value = messageData.message.replace("*SDate*", SDate);


            // Set assignedDisplay and assignedHidden based on the type of message
            if (type === "invoice") {
                assignedDisplay.value = "Wendy Hollands";
                assignedHidden.value = "2382";
            } else if (type === "dispatch") {
                assignedDisplay.value = "Vaughan Wonnacot";
                assignedHidden.value = "2182";
            } else if (type === "Purchase") {
                assignedDisplay.value = "Matt Shillito";
                assignedHidden.value = "2181";
            }

            updated = true;

            console.log("updateFields: Success: ", {
                title: titleInput.value,
                message: messageInput.value,
                assigned: assignedDisplay.value
            }); // Log the updated fields

            // Update priority based on the message data
            if (messageData.priority) {
                updatePriority(messageData.priority);
            }

            showPopup(updated ? 'Success. Fields updated.' : 'Nothing changed.', updated ? 'green' : 'red');
        }
    }

    // Function to show popup messages
    function showPopup(message, color, borderRadius="5px") {
        console.log("showPopup: Running... ", new Date().toLocaleString());
        // First, remove any existing popup if it's present
        const existingPopup = document.querySelector('.popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        // Create the new popup element
        const popup = document.createElement('div');
        popup.classList.add('popup'); // Add a class for easy reference and styling
        popup.textContent = message;
        popup.style.position = 'fixed';
        popup.style.bottom = '20px';
        popup.style.left = '50%';
        popup.style.transform = 'translateX(-50%)';
        popup.style.padding = '10px 50px';
        popup.style.backgroundColor = color;
        popup.style.color = 'white';
        popup.style.borderRadius = borderRadius;
        popup.style.fontSize = '16px';
        popup.style.minWidth = '200px';
        popup.style.maxWidth = '80%';
        popup.style.textAlign = 'center';
        popup.style.whiteSpace = 'nowrap';
        popup.style.opacity = '0';  // Start with opacity 0
        popup.style.transition = 'opacity 1s';

        popup.style.zIndex = '9999';
        popup.style.overflow = 'hidden';

        // Append the popup to the body
        document.body.appendChild(popup);

        // Fade in the popup
        setTimeout(() => {
            popup.style.opacity = '1';
        }, 0);

        // After 3 seconds, fade it out and then remove it
        setTimeout(() => {
            popup.style.opacity = '0';  // Start fade out
            setTimeout(() => {
                popup.remove();  // Remove the popup completely after fade-out
            }, 1000);  // Wait for the fade-out transition before removing it
        }, 1500);  // Popup is visible for 1.5 seconds
    }

    // Ensure that the script executes on page load
})();
