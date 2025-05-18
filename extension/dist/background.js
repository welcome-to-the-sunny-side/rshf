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

/***/ "./src/background/background.ts":
/*!**************************************!*\
  !*** ./src/background/background.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _utils_cache__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/cache */ \"./src/utils/cache.ts\");\n/* harmony import */ var webextension_polyfill__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! webextension-polyfill */ \"./node_modules/webextension-polyfill/dist/browser-polyfill.js\");\n/* harmony import */ var webextension_polyfill__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(webextension_polyfill__WEBPACK_IMPORTED_MODULE_1__);\n\n\nconsole.log('[RSHF-EXT] Background script initialized!');\n// Notify that the background script is ready\nself.postMessage({ type: 'BACKGROUND_READY' });\n// Set up message listeners for communication with content scripts\nwebextension_polyfill__WEBPACK_IMPORTED_MODULE_1___default().runtime.onMessage.addListener(async (message, sender) => {\n    console.log('[RSHF-EXT] Background script received message:', message);\n    try {\n        // Handle different message types\n        switch (message.type) {\n            case 'GET_RATINGS':\n                // Request to get ratings for a list of usernames\n                const usernames = message.usernames;\n                const settings = await _utils_cache__WEBPACK_IMPORTED_MODULE_0__.CacheService.getSettings();\n                // Limit number of usernames based on settings\n                const limitedUsernames = usernames.slice(0, settings.maxReplacementsPerPage);\n                // Get ratings from cache/API\n                const ratings = await _utils_cache__WEBPACK_IMPORTED_MODULE_0__.CacheService.getRatings(limitedUsernames);\n                return ratings;\n            case 'CLEAR_CACHE':\n                // Request to clear the cache\n                await _utils_cache__WEBPACK_IMPORTED_MODULE_0__.CacheService.clearCache();\n                return { success: true };\n            case 'GET_SETTINGS':\n                // Request to get current settings\n                return await _utils_cache__WEBPACK_IMPORTED_MODULE_0__.CacheService.getSettings();\n            case 'SAVE_SETTINGS':\n                // Request to save settings\n                await _utils_cache__WEBPACK_IMPORTED_MODULE_0__.CacheService.saveSettings(message.settings);\n                return { success: true };\n        }\n        return false;\n    }\n    catch (error) {\n        console.error('[RSHF-EXT] Background script error:', error);\n        return { error: error.message || 'Unknown error' };\n    }\n});\n// Set up alarm for periodic cache cleanup (once a day)\nwebextension_polyfill__WEBPACK_IMPORTED_MODULE_1___default().alarms.create('cleanupCache', { periodInMinutes: 24 * 60 });\n// Listen for alarm events\nwebextension_polyfill__WEBPACK_IMPORTED_MODULE_1___default().alarms.onAlarm.addListener(async (alarm) => {\n    if (alarm.name === 'cleanupCache') {\n        console.log('Running scheduled cache cleanup');\n        const cache = await _utils_cache__WEBPACK_IMPORTED_MODULE_0__.CacheService.getCache();\n        const settings = await _utils_cache__WEBPACK_IMPORTED_MODULE_0__.CacheService.getSettings();\n        const now = Date.now();\n        const maxAge = settings.cacheThresholdMinutes * 60 * 1000 * 7; // 7 times the threshold\n        // Remove entries older than maxAge\n        const updatedCache = { ...cache };\n        let removedCount = 0;\n        Object.entries(cache).forEach(([username, entry]) => {\n            if (now - entry.time > maxAge) {\n                delete updatedCache[username];\n                removedCount++;\n            }\n        });\n        if (removedCount > 0) {\n            await webextension_polyfill__WEBPACK_IMPORTED_MODULE_1___default().storage.local.set({ cache: updatedCache });\n            console.log(`Removed ${removedCount} old cache entries`);\n        }\n    }\n});\n\n\n//# sourceURL=webpack://rshf-ext/./src/background/background.ts?");

/***/ }),

/***/ "./src/shared/constants.ts":
/*!*********************************!*\
  !*** ./src/shared/constants.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   API: () => (/* binding */ API),\n/* harmony export */   DEFAULT_SETTINGS: () => (/* binding */ DEFAULT_SETTINGS),\n/* harmony export */   DEFAULT_USER: () => (/* binding */ DEFAULT_USER),\n/* harmony export */   NO_GROUP_RATING_COLOR: () => (/* binding */ NO_GROUP_RATING_COLOR),\n/* harmony export */   SELECTORS: () => (/* binding */ SELECTORS),\n/* harmony export */   STORAGE_KEYS: () => (/* binding */ STORAGE_KEYS)\n/* harmony export */ });\n// Shared constants for the extension\n// Default settings\nconst DEFAULT_SETTINGS = {\n    group: '',\n    showAlternativeRating: true,\n    noGroupRatingStyle: 'opacity',\n    maxReplacementsPerPage: 2000,\n    cacheThresholdMinutes: 30\n};\n// Storage keys\nconst STORAGE_KEYS = {\n    SETTINGS: 'settings',\n    CACHE: 'cache',\n    USER: 'user'\n};\n// Default user (until login is implemented)\nconst DEFAULT_USER = 'TestUser';\n// Codeforces DOM selectors\nconst SELECTORS = {\n    RATED_USER: '.rated-user'\n};\n// Special color for users without group ratings\nconst NO_GROUP_RATING_COLOR = '#964B00'; // Brown\n// API endpoints (will be replaced with real endpoints later)\nconst API = {\n    BASE_URL: 'https://api.example.com', // Placeholder\n    GET_RATINGS: '/ratings'\n};\n\n\n//# sourceURL=webpack://rshf-ext/./src/shared/constants.ts?");

/***/ }),

/***/ "./src/utils/api.ts":
/*!**************************!*\
  !*** ./src/utils/api.ts ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   ApiService: () => (/* binding */ ApiService)\n/* harmony export */ });\n/* harmony import */ var _shared_constants__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../shared/constants */ \"./src/shared/constants.ts\");\n\n/**\n * Mock API service for development\n * Will be replaced with actual API calls later\n */\nclass ApiService {\n    /**\n     * Fetch ratings for a list of usernames in a specific group\n     * @param usernames List of usernames to fetch ratings for\n     * @param group Group name to fetch ratings from\n     * @returns Promise with user ratings\n     */\n    static async fetchRatings(usernames, group) {\n        // This is a mock implementation that generates random ratings\n        console.log(`Fetching ratings for ${usernames.length} users in group \"${group}\"`);\n        // Simulate API delay\n        await new Promise(resolve => setTimeout(resolve, 500));\n        // Generate mock data\n        const users = usernames.map(username => {\n            // Randomly decide if a user is part of the group (80% chance)\n            const isInGroup = Math.random() < 0.8;\n            return {\n                username,\n                // Generate random rating between 0-4000 if in group, otherwise null\n                rating: isInGroup ? Math.floor(Math.random() * 4000) : -1\n            };\n        });\n        return { users };\n    }\n    /**\n     * Get the currently logged in user\n     * For now, it's always TestUser\n     */\n    static getCurrentUser() {\n        return _shared_constants__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_USER;\n    }\n}\n\n\n//# sourceURL=webpack://rshf-ext/./src/utils/api.ts?");

/***/ }),

/***/ "./src/utils/cache.ts":
/*!****************************!*\
  !*** ./src/utils/cache.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   CacheService: () => (/* binding */ CacheService)\n/* harmony export */ });\n/* harmony import */ var _shared_constants__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../shared/constants */ \"./src/shared/constants.ts\");\n/* harmony import */ var _api__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./api */ \"./src/utils/api.ts\");\n/* harmony import */ var webextension_polyfill__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! webextension-polyfill */ \"./node_modules/webextension-polyfill/dist/browser-polyfill.js\");\n/* harmony import */ var webextension_polyfill__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(webextension_polyfill__WEBPACK_IMPORTED_MODULE_2__);\n\n\n\n/**\n * Handles caching and retrieval of user ratings\n */\nclass CacheService {\n    /**\n     * Get cached ratings and determine which usernames need to be requested\n     * @param usernames List of usernames to get ratings for\n     * @returns Promise with usernames that need to be requested\n     */\n    static async getUsernamesToRequest(usernames) {\n        const settings = await this.getSettings();\n        const cache = await this.getCache();\n        const now = Date.now();\n        const threshold = settings.cacheThresholdMinutes * 60 * 1000; // convert to ms\n        // Filter usernames that need to be requested:\n        // 1. Not in cache\n        // 2. Cache entry older than threshold\n        return usernames.filter(username => {\n            const cacheEntry = cache[username];\n            return !cacheEntry || (now - cacheEntry.time > threshold);\n        });\n    }\n    /**\n     * Update cache with new ratings\n     * @param userRatings Object mapping usernames to ratings\n     */\n    static async updateCache(userRatings) {\n        const cache = await this.getCache();\n        const now = Date.now();\n        // Update cache with new data\n        Object.entries(userRatings).forEach(([username, rating]) => {\n            cache[username] = {\n                rating,\n                time: now\n            };\n        });\n        // Save updated cache\n        await webextension_polyfill__WEBPACK_IMPORTED_MODULE_2___default().storage.local.set({ [_shared_constants__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.CACHE]: cache });\n    }\n    /**\n     * Get ratings for a list of usernames, using cache when possible\n     * @param usernames List of usernames to get ratings for\n     * @returns Promise with map of usernames to ratings\n     */\n    static async getRatings(usernames) {\n        const settings = await this.getSettings();\n        const cache = await this.getCache();\n        // Get usernames that need to be requested\n        const usernamesToRequest = await this.getUsernamesToRequest(usernames);\n        // If there are usernames to request, fetch them from API\n        if (usernamesToRequest.length > 0) {\n            const response = await _api__WEBPACK_IMPORTED_MODULE_1__.ApiService.fetchRatings(usernamesToRequest, settings.group);\n            // Update cache with new data\n            const newRatings = {};\n            response.users.forEach(user => {\n                newRatings[user.username] = user.rating;\n            });\n            await this.updateCache(newRatings);\n            // Refresh cache\n            const updatedCache = await this.getCache();\n            return this.getCachedRatings(usernames, updatedCache);\n        }\n        // If all usernames are in cache, return cached ratings\n        return this.getCachedRatings(usernames, cache);\n    }\n    /**\n     * Get ratings from cache\n     * @param usernames List of usernames to get ratings for\n     * @param cache Cache data\n     * @returns Map of usernames to ratings\n     */\n    static getCachedRatings(usernames, cache) {\n        const ratings = {};\n        usernames.forEach(username => {\n            const cacheEntry = cache[username];\n            ratings[username] = cacheEntry ? cacheEntry.rating : -1;\n        });\n        return ratings;\n    }\n    /**\n     * Get the current cache\n     * @returns Cache data\n     */\n    static async getCache() {\n        const result = await webextension_polyfill__WEBPACK_IMPORTED_MODULE_2___default().storage.local.get(_shared_constants__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.CACHE);\n        return result[_shared_constants__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.CACHE] || {};\n    }\n    /**\n     * Clear the cache\n     */\n    static async clearCache() {\n        await webextension_polyfill__WEBPACK_IMPORTED_MODULE_2___default().storage.local.set({ [_shared_constants__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.CACHE]: {} });\n    }\n    /**\n     * Get extension settings\n     * @returns Extension settings\n     */\n    static async getSettings() {\n        const result = await webextension_polyfill__WEBPACK_IMPORTED_MODULE_2___default().storage.local.get(_shared_constants__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.SETTINGS);\n        return { ..._shared_constants__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_SETTINGS, ...result[_shared_constants__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.SETTINGS] };\n    }\n    /**\n     * Save extension settings\n     * @param settings Settings to save\n     */\n    static async saveSettings(settings) {\n        const currentSettings = await this.getSettings();\n        const updatedSettings = { ...currentSettings, ...settings };\n        await webextension_polyfill__WEBPACK_IMPORTED_MODULE_2___default().storage.local.set({ [_shared_constants__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.SETTINGS]: updatedSettings });\n    }\n}\n\n\n//# sourceURL=webpack://rshf-ext/./src/utils/cache.ts?");

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
/******/ 			"background": 0
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
/******/ 	var __webpack_exports__ = __webpack_require__.O(undefined, ["vendors-node_modules_webextension-polyfill_dist_browser-polyfill_js"], () => (__webpack_require__("./src/background/background.ts")))
/******/ 	__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 	
/******/ })()
;