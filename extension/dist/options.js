/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/options/options.tsx":
/*!*********************************!*\
  !*** ./src/options/options.tsx ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact/jsx-runtime */ \"./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js\");\n/* harmony import */ var preact__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! preact */ \"./node_modules/preact/dist/preact.module.js\");\n/* harmony import */ var _shared_constants__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../shared/constants */ \"./src/shared/constants.ts\");\n/* harmony import */ var webextension_polyfill__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! webextension-polyfill */ \"./node_modules/webextension-polyfill/dist/browser-polyfill.js\");\n/* harmony import */ var webextension_polyfill__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(webextension_polyfill__WEBPACK_IMPORTED_MODULE_3__);\n\n\n\n\n/**\n * Options page component\n */\nconst OptionsPage = () => {\n    return ((0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(\"div\", {}));\n};\n/**\n * Initialize preview examples with their respective colors\n */\nfunction initializeColorExamples() {\n    const exampleStyles = {\n        'newbie-example': '#808080',\n        'pupil-example': '#008000',\n        'specialist-example': '#03A89E',\n        'expert-example': '#0000ff',\n        'cm-example': '#a0a',\n        'master-example': '#FF8C00',\n        'im-example': '#FF8C00',\n        'gm-example': '#ff0000',\n        'igm-example': '#ff0000',\n        'lgm-example': '#ff0000',\n        'no-rating-example': '#964B00'\n    };\n    Object.entries(exampleStyles).forEach(([id, color]) => {\n        const element = document.getElementById(id);\n        if (element) {\n            element.style.color = color;\n        }\n    });\n}\n/**\n * Update the examples based on the selected no-rating style\n */\nfunction updateNoRatingExamples(style) {\n    const noRatingExample = document.getElementById('no-rating-example');\n    if (!noRatingExample)\n        return;\n    // Reset styles\n    noRatingExample.removeAttribute('style');\n    if (noRatingExample.textContent?.endsWith('*')) {\n        noRatingExample.textContent = 'NoRating';\n    }\n    // Apply selected style\n    switch (style) {\n        case 'opacity':\n            noRatingExample.style.color = '#0000ff'; // Example color (Expert)\n            noRatingExample.style.opacity = '0.5';\n            break;\n        case 'strikethrough':\n            noRatingExample.style.color = '#0000ff'; // Example color (Expert)\n            noRatingExample.style.textDecoration = 'line-through';\n            break;\n        case 'brown':\n            noRatingExample.style.color = '#964B00'; // Brown\n            break;\n        case 'asterisk':\n            noRatingExample.style.color = '#0000ff'; // Example color (Expert)\n            noRatingExample.textContent = 'NoRating*';\n            break;\n    }\n}\n/**\n * Show status message\n */\nfunction showStatus(message, isError = false) {\n    const status = document.getElementById('status');\n    if (!status)\n        return;\n    status.textContent = message;\n    status.className = isError ? 'error' : 'success';\n    status.style.display = 'block';\n    setTimeout(() => {\n        status.style.display = 'none';\n    }, 3000);\n}\n/**\n * Initialize event listeners for the options page\n */\nfunction initializeEventListeners() {\n    // Group name input\n    const groupNameInput = document.getElementById('group-name');\n    // Toggle ratings checkbox\n    const toggleRatings = document.getElementById('toggle-ratings');\n    // No rating style select\n    const noRatingStyle = document.getElementById('no-rating-style');\n    noRatingStyle?.addEventListener('change', (e) => {\n        updateNoRatingExamples(e.target.value);\n    });\n    // Max replacements input\n    const maxReplacements = document.getElementById('max-replacements');\n    // Cache threshold input\n    const cacheThreshold = document.getElementById('cache-threshold');\n    // Save settings button\n    const saveButton = document.getElementById('save-settings');\n    saveButton?.addEventListener('click', async () => {\n        try {\n            const settings = {\n                group: groupNameInput?.value || '',\n                showAlternativeRating: toggleRatings?.checked || true,\n                noGroupRatingStyle: (noRatingStyle?.value || 'opacity'),\n                maxReplacementsPerPage: parseInt(maxReplacements?.value || '2000', 10),\n                cacheThresholdMinutes: parseInt(cacheThreshold?.value || '30', 10)\n            };\n            await webextension_polyfill__WEBPACK_IMPORTED_MODULE_3___default().runtime.sendMessage({\n                type: 'SAVE_SETTINGS',\n                settings\n            });\n            // Notify content scripts\n            const tabs = await webextension_polyfill__WEBPACK_IMPORTED_MODULE_3___default().tabs.query({ url: '*://*.codeforces.com/*' });\n            tabs.forEach(tab => {\n                if (tab.id) {\n                    webextension_polyfill__WEBPACK_IMPORTED_MODULE_3___default().tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' });\n                }\n            });\n            showStatus('Settings saved successfully!');\n        }\n        catch (error) {\n            console.error('Error saving settings:', error);\n            showStatus('Error saving settings', true);\n        }\n    });\n    // Clear cache button\n    const clearCacheButton = document.getElementById('clear-cache');\n    clearCacheButton?.addEventListener('click', async () => {\n        try {\n            await webextension_polyfill__WEBPACK_IMPORTED_MODULE_3___default().runtime.sendMessage({ type: 'CLEAR_CACHE' });\n            showStatus('Cache cleared successfully!');\n        }\n        catch (error) {\n            console.error('Error clearing cache:', error);\n            showStatus('Error clearing cache', true);\n        }\n    });\n    // Restore defaults button\n    const restoreDefaultsButton = document.getElementById('restore-defaults');\n    restoreDefaultsButton?.addEventListener('click', async () => {\n        try {\n            // Reset form fields to defaults\n            if (groupNameInput)\n                groupNameInput.value = _shared_constants__WEBPACK_IMPORTED_MODULE_2__.DEFAULT_SETTINGS.group;\n            if (toggleRatings)\n                toggleRatings.checked = _shared_constants__WEBPACK_IMPORTED_MODULE_2__.DEFAULT_SETTINGS.showAlternativeRating;\n            if (noRatingStyle)\n                noRatingStyle.value = _shared_constants__WEBPACK_IMPORTED_MODULE_2__.DEFAULT_SETTINGS.noGroupRatingStyle;\n            if (maxReplacements)\n                maxReplacements.value = _shared_constants__WEBPACK_IMPORTED_MODULE_2__.DEFAULT_SETTINGS.maxReplacementsPerPage.toString();\n            if (cacheThreshold)\n                cacheThreshold.value = _shared_constants__WEBPACK_IMPORTED_MODULE_2__.DEFAULT_SETTINGS.cacheThresholdMinutes.toString();\n            // Update example\n            updateNoRatingExamples(_shared_constants__WEBPACK_IMPORTED_MODULE_2__.DEFAULT_SETTINGS.noGroupRatingStyle);\n            // Don't automatically save to avoid confusion\n            showStatus('Default settings restored. Click Save to apply.');\n        }\n        catch (error) {\n            console.error('Error restoring defaults:', error);\n            showStatus('Error restoring defaults', true);\n        }\n    });\n}\n// Initialize the options page\ndocument.addEventListener('DOMContentLoaded', async () => {\n    console.log('[RSHF-EXT] Options page loaded, initializing...');\n    try {\n        // Check if background script is available\n        let retries = 0;\n        const maxRetries = 3;\n        let settings;\n        while (retries < maxRetries) {\n            try {\n                // Load settings\n                console.log('[RSHF-EXT] Attempting to load settings, attempt:', retries + 1);\n                settings = await webextension_polyfill__WEBPACK_IMPORTED_MODULE_3___default().runtime.sendMessage({ type: 'GET_SETTINGS' });\n                console.log('[RSHF-EXT] Settings loaded successfully:', settings);\n                break;\n            }\n            catch (err) {\n                console.warn(`[RSHF-EXT] Failed to load settings, attempt ${retries + 1}:`, err);\n                retries++;\n                if (retries >= maxRetries) {\n                    throw err;\n                }\n                // Wait before retrying\n                await new Promise(resolve => setTimeout(resolve, 500));\n            }\n        }\n        // Set form values\n        const groupNameInput = document.getElementById('group-name');\n        if (groupNameInput)\n            groupNameInput.value = settings.group;\n        const toggleRatings = document.getElementById('toggle-ratings');\n        if (toggleRatings)\n            toggleRatings.checked = settings.showAlternativeRating;\n        const noRatingStyle = document.getElementById('no-rating-style');\n        if (noRatingStyle)\n            noRatingStyle.value = settings.noGroupRatingStyle;\n        const maxReplacements = document.getElementById('max-replacements');\n        if (maxReplacements)\n            maxReplacements.value = settings.maxReplacementsPerPage.toString();\n        const cacheThreshold = document.getElementById('cache-threshold');\n        if (cacheThreshold)\n            cacheThreshold.value = settings.cacheThresholdMinutes.toString();\n        // Initialize color examples\n        initializeColorExamples();\n        // Initialize no-rating example\n        updateNoRatingExamples(settings.noGroupRatingStyle);\n        // Initialize event listeners\n        initializeEventListeners();\n    }\n    catch (error) {\n        console.error('Error initializing options page:', error);\n        showStatus('Error loading settings', true);\n    }\n});\n// Render Preact component\n(0,preact__WEBPACK_IMPORTED_MODULE_1__.render)((0,preact_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(OptionsPage, {}), document.body);\n\n\n//# sourceURL=webpack://rshf-ext/./src/options/options.tsx?");

/***/ }),

/***/ "./src/shared/constants.ts":
/*!*********************************!*\
  !*** ./src/shared/constants.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   API: () => (/* binding */ API),\n/* harmony export */   DEFAULT_SETTINGS: () => (/* binding */ DEFAULT_SETTINGS),\n/* harmony export */   DEFAULT_USER: () => (/* binding */ DEFAULT_USER),\n/* harmony export */   NO_GROUP_RATING_COLOR: () => (/* binding */ NO_GROUP_RATING_COLOR),\n/* harmony export */   SELECTORS: () => (/* binding */ SELECTORS),\n/* harmony export */   STORAGE_KEYS: () => (/* binding */ STORAGE_KEYS)\n/* harmony export */ });\n// Shared constants for the extension\n// Default settings\nconst DEFAULT_SETTINGS = {\n    group: '',\n    showAlternativeRating: true,\n    noGroupRatingStyle: 'opacity',\n    maxReplacementsPerPage: 2000,\n    cacheThresholdMinutes: 30\n};\n// Storage keys\nconst STORAGE_KEYS = {\n    SETTINGS: 'settings',\n    CACHE: 'cache',\n    USER: 'user'\n};\n// Default user (until login is implemented)\nconst DEFAULT_USER = 'TestUser';\n// Codeforces DOM selectors\nconst SELECTORS = {\n    RATED_USER: '.rated-user'\n};\n// Special color for users without group ratings\nconst NO_GROUP_RATING_COLOR = '#964B00'; // Brown\n// API endpoints (will be replaced with real endpoints later)\nconst API = {\n    BASE_URL: 'https://api.example.com', // Placeholder\n    GET_RATINGS: '/ratings'\n};\n\n\n//# sourceURL=webpack://rshf-ext/./src/shared/constants.ts?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"options": 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		__webpack_require__.O.j = (chunkId) => (installedChunks[chunkId] === 0);
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			return __webpack_require__.O(result);
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunkrshf_ext"] = self["webpackChunkrshf_ext"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 	var __webpack_exports__ = __webpack_require__.O(undefined, ["vendors-node_modules_webextension-polyfill_dist_browser-polyfill_js","vendors-node_modules_preact_jsx-runtime_dist_jsxRuntime_module_js"], () => (__webpack_require__("./src/options/options.tsx")))
/******/ 	__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 	
/******/ })()
;