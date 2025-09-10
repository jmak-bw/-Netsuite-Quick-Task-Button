// ==UserScript==
// @name         [Netsuite]Autofill Search Bar
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Autofills search box based buttons and resize search bar and role buttons (responsive absolute positioning)
// @author       JSM
// @match        https://*.app.netsuite.com/*
// @grant        GM_addStyle
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/jmak-bw/TampermonkeyScriptsJSM/main/Netsuite-Autofill-SearchBar.user.js
// @downloadURL  https://raw.githubusercontent.com/jmak-bw/TampermonkeyScriptsJSM/main/Netsuite-Autofill-SearchBar.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ⛔ Skip the "My Roles" page
    if (window.location.href.includes('/app/login/secure/myroles/myroles.nl')) {
        console.log("🚫 Script disabled on My Roles page.");
        return;
    }

    let stackPanel;
    let searchBarContainer;
    let soButton;
    let invButton;
    let poButton;
    let buttonWrapper;
    let searchInput;

    //Header positioning
    function positionButton() {
        if (!buttonWrapper || !searchBarContainer || !stackPanel) return;

        const searchBarRect = searchBarContainer.getBoundingClientRect();
        const stackPanelRect = stackPanel.getBoundingClientRect();

        buttonWrapper.style.left = `${searchBarRect.right - stackPanelRect.left + 5}px`;
        buttonWrapper.style.top = `${searchBarRect.top - stackPanelRect.top}px`;
        buttonWrapper.style.position = 'absolute';
    }

    // Helper: get current year
    function getCurrentYear() {
        return new Date().getFullYear().toString();
    }

    // Adjust the year in the input while preserving user input
    function adjustYear(input, delta) {
        const pattern = /(SO|INV|PO)-BWUK-(\d{4})(-.*)?/;
        const match = input.value.match(pattern);
        if (match) {
            const prefix = match[1];
            const oldYear = parseInt(match[2]);
            const suffix = match[3] || '';
            const newYear = oldYear + delta;
            input.value = `${prefix}-BWUK-${newYear}${suffix}`;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.focus();
        }
    }

    // Create +/- year buttons if not present
    function createYearButtons(searchInput, wrapper) {
        const increaseYear = document.createElement('button');
        increaseYear.textContent = '+1';
        const decreaseYear = document.createElement('button');
        decreaseYear.textContent = '-1';

        [increaseYear, decreaseYear].forEach(btn => {
            Object.assign(btn.style, {
                padding: '5px 7px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer',
                backgroundColor: '#ddd',
                color: '#333',
                marginLeft: '3px'
            });
        });

        increaseYear.addEventListener('click', () => adjustYear(searchInput, 1));
        decreaseYear.addEventListener('click', () => adjustYear(searchInput, -1));

        wrapper.appendChild(decreaseYear);
        wrapper.appendChild(increaseYear);
    }

    // MutationObserver to add buttons & resize search bar container
    const buttonObserver = new MutationObserver(() => {
        stackPanel = document.querySelector('[data-widget="StackPanel"]');
        searchBarContainer = document.querySelector('[data-automation-id="GlobalSearchTextBox"]');

        if (stackPanel && searchBarContainer) {
            buttonObserver.disconnect();

            if (window.getComputedStyle(stackPanel).position === 'static') {
                stackPanel.style.position = 'relative';
            }

            searchInput = searchBarContainer.querySelector('input[type="text"], input[type="search"]');

            if (searchInput) {
                // Create buttons
                soButton = document.createElement('button');
                soButton.textContent = 'SO';
                invButton = document.createElement('button');
                invButton.textContent = 'INV';
                poButton = document.createElement('button');
                poButton.textContent = 'PO';

                // Basic styling
                [soButton, invButton, poButton].forEach(btn => {
                    Object.assign(btn.style, {
                        padding: '7px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        backgroundColor: '#eee',
                        color: '#333',
                        margin: '0'
                    });
                });

                // Wrapper div
                buttonWrapper = document.createElement('div');
                buttonWrapper.style.position = 'absolute';
                buttonWrapper.style.display = 'flex';
                buttonWrapper.style.gap = '5px';
                buttonWrapper.style.alignItems = 'center';
                buttonWrapper.appendChild(soButton);
                buttonWrapper.appendChild(invButton);
                buttonWrapper.appendChild(poButton);

                stackPanel.appendChild(buttonWrapper);
                setTimeout(positionButton, 550);
                window.addEventListener('resize', positionButton);

                // Add event listener for each main button
                function setupMainButton(btn, prefix) {
                    btn.addEventListener('click', () => {
                        const text = `${prefix}-BWUK-${getCurrentYear()}-`;
                        searchInput.value = text;
                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
                        searchInput.focus();
                        setTimeout(() => {
                            searchInput.selectionStart = text.length;
                            searchInput.selectionEnd = text.length;
                        }, 0);

                        if (!document.getElementById('yearButtonsWrapper')) {
                            const yearWrapper = document.createElement('div');
                            yearWrapper.id = 'yearButtonsWrapper';
                            yearWrapper.style.display = 'inline-flex';
                            yearWrapper.style.marginLeft = '5px';
                            buttonWrapper.appendChild(yearWrapper);
                            createYearButtons(searchInput, yearWrapper);
                        }
                    });
                }

                setupMainButton(soButton, 'SO');
                setupMainButton(invButton, 'INV');
                setupMainButton(poButton, 'PO');
            } else {
                console.error('Search input element not found.');
            }
        }
    });

    // Observer to remove Help/Feedback
    const removalObserver = new MutationObserver(() => {
        const stableSelectors = '[data-automation-id="HelpMenuItem"], [data-automation-id="FeedbackMenuItem"]';
        document.querySelectorAll(stableSelectors).forEach(el => el.remove());
    });

    buttonObserver.observe(document.body, { childList: true, subtree: true });
    removalObserver.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('unload', () => {
        window.removeEventListener('resize', positionButton);
        buttonObserver.disconnect();
        removalObserver.disconnect();
    });

    // --- Resize Global Search Box Logic ---
    const widthThreshold = 1400;
    let initialContainerWidth, initialInputWidth, initialRoleWidth;

    function checkAndResize() {
        const container = document.querySelector('[data-automation-id="GlobalSearchTextBox"]');
        const input = container?.querySelector('input[type="text"], input[type="search"]');
        const roleMenu = document.querySelector('[data-automation-id="RoleMenuItem"]');
        const currentWindowWidth = window.innerWidth;

        if (container) {
            if (!initialContainerWidth) initialContainerWidth = container.getBoundingClientRect().width;
            if (currentWindowWidth < widthThreshold) {
                container.style.position = 'absolute';
                container.style.left = '200px';
                container.style.top = '10px';
                container.style.flexGrow = '0';
                container.style.minWidth = '30px';
                container.style.width = `${Math.max(initialContainerWidth / 2, 400)}px`;
            } else {
                container.style.position = '';
                container.style.left = '';
                container.style.top = '';
                container.style.flexGrow = '1';
                container.style.minWidth = '';
                container.style.width = '';
            }
        }

        if (input) {
            if (!initialInputWidth) initialInputWidth = input.getBoundingClientRect().width;
            input.style.width = currentWindowWidth < widthThreshold ? `${initialInputWidth / 2}px` : '';
        }

        if (roleMenu) {
            if (!initialRoleWidth) initialRoleWidth = roleMenu.getBoundingClientRect().width;
            roleMenu.style.position = currentWindowWidth < widthThreshold ? 'relative' : '';
            roleMenu.style.top = currentWindowWidth < widthThreshold ? '10px' : '';
            roleMenu.style.width = currentWindowWidth < widthThreshold ? `${initialRoleWidth / 3}px` : '';
        }
    }

    window.addEventListener('resize', checkAndResize);
    window.addEventListener('load', () => {
        setTimeout(checkAndResize, 50);
        setTimeout(positionButton, 100);
    });

})();
