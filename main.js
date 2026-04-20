// =====================================================================
// GLOBAL ERROR HANDLING (Error Boundary)
// =====================================================================
(function () {
	let errorCount = 0;
	const MAX_ERRORS = 5;
	const ERROR_RESET_TIME = 60000;

	setInterval(() => {
		errorCount = 0;
	}, ERROR_RESET_TIME);

	window.addEventListener("error", (event) => {
		errorCount++;
		if (errorCount <= MAX_ERRORS) {
			console.error("Application Error:", {
				message: event.message,
				filename: event.filename,
				lineno: event.lineno,
				colno: event.colno,
				error: event.error
			});
			if (event.error && event.error.stack) {
				const toastEl = document.getElementById("toast");
				if (toastEl) {
					showErrorToast("An error occurred. The page can be refreshed.");
				}
			}
		}
	});

	window.addEventListener("unhandledrejection", (event) => {
		errorCount++;
		if (errorCount <= MAX_ERRORS) {
			console.error("Unhandled Promise Error:", event.reason);
			const toastEl = document.getElementById("toast");
			if (toastEl) {
				showErrorToast("An operation failed.");
			}
		}
	});

	window.showErrorToast = function (message) {
		const toast = document.getElementById("toast");
		if (toast && typeof showToast === "function") {
			showToast("⚠️ " + message, "error");
		} else if (toast) {
			toast.textContent = "⚠️ " + message;
			toast.className = "toast show error";
			setTimeout(() => {
				toast.classList.remove("show", "error");
			}, 3000);
		}
	};

	window.addEventListener("load", () => {
		const criticalElements = ["bg-canvas", "custom-bg", "panel", "rain-audio"];
		const missing = criticalElements.filter((id) => !document.getElementById(id));
		if (missing.length > 0) {
			console.error("Critical elements are missing:", missing);
			showErrorToast("The page could not be loaded properly. Please refresh.");
		}
	});
})();

// =====================================================================
// RAINDROPS.JS LOADER & INITIALIZER
// =====================================================================
let raindropInstance = null;
let raindropsInitialized = false;
let raindropsRetryCount = 0;
const MAX_RAINDROPS_RETRY = 10;

function loadRaindrops() {
	return new Promise((resolve, reject) => {
		const sources = [
			"https://fyildiz1974.github.io/web/files/raindrops.js",
			"assets/js/raindrops.js",
			"https://fthyldz.com/bio/js/raindrops.js"
		];

		let currentIndex = 0;

		function tryLoadScript() {
			if (currentIndex >= sources.length) {
				console.error("All Raindrops sources failed");
				reject(new Error("Raindrops.js could not be loaded"));
				return;
			}

			const script = document.createElement("script");
			script.src = sources[currentIndex];

			script.onload = () => {
				console.log("✓ Raindrops.js loaded:", sources[currentIndex]);
				// Wait a bit for parsing
				setTimeout(resolve, 100);
			};

			script.onerror = () => {
				console.warn("Raindrops source failed:", sources[currentIndex]);
				currentIndex++;
				tryLoadScript();
			};

			document.head.appendChild(script);
		}

		tryLoadScript();
	});
}

function initRaindrops() {
	// Don't retry if already successfully initialized
	if (raindropsInitialized && raindropInstance) {
		return raindropInstance;
	}

	const canvas = document.getElementById("bg-canvas");
	const bg = document.getElementById("custom-bg");

	if (!canvas || !bg) {
		console.error("Canvas or background element not found");
		return null;
	}

	// Check for Raindrops class
	if (typeof Raindrops === "undefined") {
		raindropsRetryCount++;

		if (raindropsRetryCount >= MAX_RAINDROPS_RETRY) {
			// Maximum retry reached, stop silently
			console.log(
				"Raindrops: Maximum retry limit exceeded, effect may be running in manual mode"
			);
			return null;
		}

		// Show warning only for the first 2 retries
		if (raindropsRetryCount <= 2) {
			console.log(
				"Waiting for Raindrops... (" +
					raindropsRetryCount +
					"/" +
					MAX_RAINDROPS_RETRY +
					")"
			);
		}

		setTimeout(initRaindrops, 300);
		return null;
	}

	// Set canvas dimensions
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	// Wait until the image is loaded
	if (!bg.complete || bg.naturalWidth === 0) {
		bg.addEventListener(
			"load",
			() => {
				if (!raindropsInitialized) {
					initRaindrops();
				}
			},
			{ once: true }
		);
		return null;
	}

	try {
		// Clean up the previous instance
		if (raindropInstance && typeof raindropInstance.destroy === "function") {
			raindropInstance.destroy();
		}

		raindropInstance = new Raindrops(canvas, canvas.width, canvas.height, {
			renderDropsOnTop: true,
			brightness: 1.04,
			alphaMultiply: 6,
			alphaSubtract: 3,
			minR: 10,
			maxR: 40,
			rainChance: 0.35,
			rainLimit: 6,
			dropletsRate: 50,
			dropletsSize: [3, 5.5],
			trailRate: 1,
			trailScaleRange: [0.2, 0.45],
			fg: bg,
			bg: bg
		});

		raindropsInitialized = true;
		raindropsRetryCount = 0;
		console.log("✓ Raindrops successfully initialized");
		return raindropInstance;
	} catch (e) {
		console.error("Raindrops initialization error:", e.message);
		raindropsInitialized = true; // Stop retrying even if there's an error
		return null;
	}
}

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================
function throttle(func, limit) {
	let inThrottle;
	return function (...args) {
		if (!inThrottle) {
			func.apply(this, args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}

function debounce(func, wait) {
	let timeout;
	return function (...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
}

function isValidUrl(string) {
	if (!string || typeof string !== "string") {
		return false;
	}
	try {
		const url = new URL(string);
		return ["http:", "https:"].includes(url.protocol);
	} catch {
		return false;
	}
}

function sanitizeUrl(url) {
	if (!isValidUrl(url)) {
		return null;
	}
	try {
		const parsed = new URL(url);
		return parsed.href;
	} catch {
		return null;
	}
}

// =====================================================================
// DEVICE DETECTION
// =====================================================================
const DeviceInfo = {
	isMobile: function () {
		return (
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
				navigator.userAgent
			) || window.innerWidth <= 768
		);
	},
	isIOS: function () {
		return /iPad|iPhone|iPod/.test(navigator.userAgent);
	},
	getMaxBlur: function () {
		// Limit blur for performance on mobile
		return this.isMobile() ? 15 : 25;
	}
};

// =====================================================================
// FULLSCREEN API HELPERS (Cross-browser support) - FINAL
// =====================================================================
const FullscreenAPI = {
	isFullscreen: function () {
		return !!(
			document.fullscreenElement ||
			document.webkitFullscreenElement ||
			document.mozFullScreenElement ||
			document.msFullscreenElement
		);
	},

	enter: function (element) {
		element = element || document.documentElement;

		const requestMethod =
			element.requestFullscreen ||
			element.webkitRequestFullscreen ||
			element.mozRequestFullScreen ||
			element.msRequestFullscreen;

		if (!requestMethod) {
			showToast("❌ Fullscreen is not supported", "error");
			return Promise.reject(new Error("Not supported"));
		}

		try {
			const result = requestMethod.call(element);

			if (result && typeof result.then === "function") {
				return result.catch(function (err) {
					console.warn("Fullscreen error:", err.message);
					showToast("❌ Fullscreen cannot be used", "error");
				});
			}
			return Promise.resolve();
		} catch (err) {
			console.error("Fullscreen exception:", err);
			return Promise.reject(err);
		}
	},

	exit: function () {
		const exitMethod =
			document.exitFullscreen ||
			document.webkitExitFullscreen ||
			document.mozCancelFullScreen ||
			document.msExitFullscreen;

		if (exitMethod && this.isFullscreen()) {
			try {
				const result = exitMethod.call(document);
				if (result && typeof result.then === "function") {
					return result.catch(function (err) {
						console.warn("Fullscreen exit error:", err.message);
					});
				}
				return Promise.resolve();
			} catch (err) {
				return Promise.reject(err);
			}
		}
		return Promise.resolve();
	},

	toggle: function () {
		return this.isFullscreen() ? this.exit() : this.enter();
	},

	updateButtonIcon: function (isFullscreen) {
		const btn = document.getElementById("btn-fullscreen");
		if (!btn) return;

		// Update the content
		while (btn.firstChild) {
			btn.removeChild(btn.firstChild);
		}
		btn.appendChild(document.createTextNode(isFullscreen ? "✕" : "⛶"));

		// Update attributes
		btn.setAttribute(
			"aria-label",
			isFullscreen ? "Exit fullscreen" : "Enter fullscreen mode"
		);
		btn.title = isFullscreen ? "Exit Fullscreen" : "Fullscreen";
		btn.classList.toggle("active", isFullscreen);
	},

	init: function () {
		const self = this;

		[
			"fullscreenchange",
			"webkitfullscreenchange",
			"mozfullscreenchange",
			"MSFullscreenChange"
		].forEach(function (eventName) {
			document.addEventListener(
				eventName,
				function () {
					self.updateButtonIcon(self.isFullscreen());
				},
				false
			);
		});

		[
			"fullscreenerror",
			"webkitfullscreenerror",
			"mozfullscreenerror",
			"MSFullscreenError"
		].forEach(function (eventName) {
			document.addEventListener(
				eventName,
				function () {
					showToast("❌ Fullscreen error", "error");
				},
				false
			);
		});
	}
};

// =====================================================================
// AUDIO MANAGER - SAFE FALLBACK CONTROL
// =====================================================================
const AudioManager = {
	audio: null,
	sources: [],
	currentSourceIndex: 0,
	allSourcesFailed: false,
	loadAttempts: 0,
	maxLoadAttempts: 3,

	init: function (audioElement) {
		this.audio = audioElement;
		this.sources = Array.from(audioElement.querySelectorAll("source")).map(
			(s) => s.src
		);
		this.setupEventListeners();
	},

	setupEventListeners: function () {
		const self = this;

		this.audio.addEventListener(
			"error",
			function (e) {
				console.warn("Audio source error:", self.audio.currentSrc);
				self.tryNextSource();
			},
			true
		);

		this.audio.addEventListener("loadeddata", function () {
			console.log("Audio successfully loaded:", self.audio.currentSrc);
			self.loadAttempts = 0;
			self.allSourcesFailed = false;
		});

		this.audio.addEventListener("canplaythrough", function () {
			console.log("Audio is ready to play");
		});
	},

	tryNextSource: function () {
		this.loadAttempts++;

		// Prevent too many retries for the same source
		if (this.loadAttempts > this.maxLoadAttempts) {
			this.currentSourceIndex++;
			this.loadAttempts = 0;
		}

		// If all sources have been tried
		if (this.currentSourceIndex >= this.sources.length) {
			if (!this.allSourcesFailed) {
				this.allSourcesFailed = true;
				console.error("All audio sources failed");
				showToast(
					"⚠️ Audio could not be loaded – please check your internet connection",
					"error"
				);

				// Update the state
				if (typeof state !== "undefined") {
					state.soundOn = false;
					if (typeof syncSoundUI === "function") {
						syncSoundUI();
					}
				}
			}
			return;
		}

		// Try the next source
		console.log(
			"Trying fallback audio source:",
			this.sources[this.currentSourceIndex]
		);
		this.audio.src = this.sources[this.currentSourceIndex];
		this.audio.load();
	},

	play: function () {
		if (this.allSourcesFailed) {
			showToast("⚠️ Audio sources could not be loaded", "error");
			return Promise.reject(new Error("All audio sources failed"));
		}
		return this.audio.play();
	},

	pause: function () {
		this.audio.pause();
	},

	setVolume: function (volume) {
		this.audio.volume = Math.max(0, Math.min(1, volume));
	},

	isReady: function () {
		return !this.allSourcesFailed && this.audio.readyState >= 2;
	}
};

// =====================================================================
// RESOURCE MANAGER - MEMORY LEAK PREVENTER
// =====================================================================
const ResourceManager = {
	blobUrls: new Set(),
	eventListeners: new Map(),
	abortControllers: new Map(),

	// Blob URL management
	createBlobUrl: function (blob) {
		const url = URL.createObjectURL(blob);
		this.blobUrls.add(url);
		return url;
	},

	revokeBlobUrl: function (url) {
		if (url && this.blobUrls.has(url)) {
			URL.revokeObjectURL(url);
			this.blobUrls.delete(url);
			console.log("Blob URL revoked:", url);
		}
	},

	revokeAllBlobUrls: function () {
		this.blobUrls.forEach((url) => {
			URL.revokeObjectURL(url);
		});
		this.blobUrls.clear();
		console.log("All Blob URLs have been revoked");
	},

	// Event listener management
	addManagedEventListener: function (element, event, handler, options = {}) {
		const key = `${element.id || "anonymous"}-${event}`;
		const controller = new AbortController();

		// Clean up the existing listener
		this.removeManagedEventListener(element, event);

		element.addEventListener(event, handler, {
			...options,
			signal: controller.signal
		});

		this.abortControllers.set(key, controller);
		this.eventListeners.set(key, { element, event, handler });
	},

	removeManagedEventListener: function (element, event) {
		const key = `${element.id || "anonymous"}-${event}`;
		const controller = this.abortControllers.get(key);

		if (controller) {
			controller.abort();
			this.abortControllers.delete(key);
			this.eventListeners.delete(key);
		}
	},

	// Clean up all resources
	cleanup: function () {
		// Clean up Blob URLs
		this.revokeAllBlobUrls();

		// Clean up event listeners
		this.abortControllers.forEach((controller) => controller.abort());
		this.abortControllers.clear();
		this.eventListeners.clear();

		// Clean up Raindrops instance
		if (raindropInstance && typeof raindropInstance.destroy === "function") {
			raindropInstance.destroy();
			raindropInstance = null;
		}

		console.log("All resources have been cleaned up");
	}
};

// =====================================================================
// LOADING CONTROLLER (Prevents Race Conditions)
// =====================================================================
const LoadingController = {
	currentLoadId: null,

	startLoading: function () {
		const loadId = Date.now() + "-" + Math.random().toString(36).substr(2, 9);
		this.currentLoadId = loadId;
		return loadId;
	},

	isCurrentLoading: function (loadId) {
		return this.currentLoadId === loadId;
	},

	cancelLoading: function (loadId) {
		if (this.currentLoadId === loadId) {
			this.currentLoadId = null;
		}
	},

	cancelAll: function () {
		this.currentLoadId = null;
	}
};

// =====================================================================
// PWA & SERVICE WORKER
// =====================================================================
const PWAManager = {
	deferredPrompt: null,
	installButton: null,

	init: function () {
		this.installButton = document.getElementById("btn-install");
		this.registerServiceWorker();
		this.setupInstallPrompt();
	},

	registerServiceWorker: function () {
		if ("serviceWorker" in navigator) {
			window.addEventListener("load", () => {
				navigator.serviceWorker
					.register("sw.js")
					.then((registration) => {
						console.log("ServiceWorker registered:", registration.scope);
					})
					.catch((error) => {
						console.warn("ServiceWorker registration failed:", error);
					});
			});
		}
	},

	setupInstallPrompt: function () {
		const self = this;

		window.addEventListener("beforeinstallprompt", (e) => {
			e.preventDefault();
			self.deferredPrompt = e;

			// Show the install button
			if (self.installButton) {
				self.installButton.classList.add("show");
			}

			console.log("PWA is installable");
		});

		// Install button click
		if (this.installButton) {
			this.installButton.addEventListener("click", () => {
				self.promptInstall();
			});
		}

		// When installation is complete
		window.addEventListener("appinstalled", () => {
			console.log("PWA installed");
			self.deferredPrompt = null;
			if (self.installButton) {
				self.installButton.classList.remove("show");
			}
			showToast("✓ App added to home screen!", "success");
		});
	},

	promptInstall: async function () {
		if (!this.deferredPrompt) {
			showToast("ℹ️ App is already installed or not supported", "info");
			return;
		}

		this.deferredPrompt.prompt();

		const { outcome } = await this.deferredPrompt.userChoice;
		console.log("User choice:", outcome);

		if (outcome === "accepted") {
			showToast("✓ Installing app...", "success");
		}

		this.deferredPrompt = null;
	}
};

// =====================================================================
// CONFIGURATION
// =====================================================================
const CONFIG = {
	// Use this URL if running on CodePen (auto-detects if left empty)
	codepenUrl: "https://codepen.io/fyildiz1974/pen/RNRgjpj",

	// Production URL (your own server)
	productionUrl: "https://fthyldz.com/rainy" // or your domain
};

// =====================================================================
// PRESET BACKGROUNDS - Local priority + Fallback
// =====================================================================
const PRESETS = [
	{
		type: "image",
		label: "City",
		url:
			"https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80",
		urlFallback: "assets/images/bg/city.jpg",
		thumb:
			"https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=300&q=60",
		thumbFallback: "assets/images/thumbs/city.jpg"
	},
	{
		type: "image",
		label: "Forest",
		url:
			"https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80",
		urlFallback: "assets/images/bg/forest.jpg",
		thumb:
			"https://images.unsplash.com/photo-1448375240586-882707db888b?w=300&q=60",
		thumbFallback: "assets/images/thumbs/forest.jpg"
	},
	{
		type: "image",
		label: "Mountain",
		url:
			"https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80",
		urlFallback: "assets/images/bg/mountain.jpg",
		thumb:
			"https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&q=60",
		thumbFallback: "assets/images/thumbs/mountain.jpg"
	},
	{
		type: "image",
		label: "Towers",
		url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1920&q=80",
		urlFallback: "assets/images/bg/lights.jpg",
		thumb: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=300&q=60",
		thumbFallback: "assets/images/thumbs/lights.jpg"
	},
	{
		type: "image",
		label: "Future",
		url:
			"https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1920&q=80",
		urlFallback: "assets/images/bg/road.jpg",
		thumb:
			"https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=300&q=60",
		thumbFallback: "assets/images/thumbs/road.jpg"
	},
	{
		type: "image",
		label: "Sky",
		url:
			"https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=1920&q=80",
		urlFallback: "assets/images/bg/sky.jpg",
		thumb:
			"https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=300&q=60",
		thumbFallback: "assets/images/thumbs/sky.jpg"
	},
	{
		type: "video",
		label: "Hurricane",
		url: "https://cdn.pixabay.com/video/2019/03/18/22070-325253460_large.mp4",
		urlFallback: "assets/videos/traffic.mp4",
		thumb: "https://cdn.pixabay.com/video/2019/03/18/22070-325253460_tiny.jpg",
		thumbFallback: "assets/images/thumbs/traffic.jpg"
	},
	{
		type: "video",
		label: "River",
		url: "https://cdn.pixabay.com/video/2020/12/01/58020-486900427_large.mp4",
		urlFallback: "assets/videos/cityrain.mp4",
		thumb: "https://cdn.pixabay.com/video/2020/12/01/58020-486900427_tiny.jpg",
		thumbFallback: "assets/images/thumbs/cityrain.jpg"
	},
	{
		type: "video",
		label: "Beach",
		url:
			"https://videos.pexels.com/video-files/2439510/2439510-hd_1920_1080_30fps.mp4",
		urlFallback: "assets/videos/nature.mp4",
		thumb:
			"https://images.pexels.com/videos/2439510/free-video-2439510.jpg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1",
		thumbFallback: "assets/images/thumbs/nature.jpg"
	}
];

// =====================================================================
// DEFAULT STATE - Mobile blur limit added
// =====================================================================
const DEFAULT_STATE = {
	blur: 5,
	brightness: 30,
	rain: 70,
	overlayColor: "none",
	overlayOpacity: 0,
	volume: 50,
	soundOn: true,
	currentType: "image",
	currentUrl: PRESETS[0].url,
	currentPresetIndex: 0
};

// Current state with reactive updates
let state = new Proxy(
	{ ...DEFAULT_STATE },
	{
		set(target, property, value) {
			const oldValue = target[property];

			// Apply blur limit on mobile
			if (property === "blur") {
				const maxBlur = DeviceInfo.getMaxBlur();
				value = Math.min(value, maxBlur);
			}

			target[property] = value;

			if (oldValue !== value) {
				const visualProperties = [
					"blur",
					"brightness",
					"rain",
					"overlayColor",
					"overlayOpacity"
				];
				if (visualProperties.includes(property)) {
					if (typeof updateFilters === "function") {
						updateFilters();
					}
				}
			}
			return true;
		},
		get(target, property) {
			return target[property];
		}
	}
);

// =====================================================================
// DOM ELEMENTS
// =====================================================================
const customBg = document.getElementById("custom-bg");
const customVideo = document.getElementById("custom-video");
const colorOverlay = document.getElementById("color-overlay");
const canvas = document.getElementById("bg-canvas");
const panel = document.getElementById("panel");
const presetGrid = document.getElementById("preset-grid");
const rainAudio = document.getElementById("rain-audio");
const toast = document.getElementById("toast");
const soundToggleIcon = document.getElementById("sound-toggle");
const soundBtn = document.getElementById("btn-sound");
const loadingOverlay = document.getElementById("loading-overlay");
const settingsBtn = document.getElementById("btn-settings");

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================
function showToast(message, type = "info") {
	toast.textContent = message;
	toast.className = "toast show";
	if (type === "error") toast.classList.add("error");
	if (type === "success") toast.classList.add("success");
	setTimeout(() => toast.classList.remove("show", "error", "success"), 2500);
}

function showLoader(text = "Loading...") {
	loadingOverlay.querySelector(".loader-text").textContent = text;
	loadingOverlay.classList.add("active");
}

function hideLoader() {
	loadingOverlay.classList.remove("active");
}

function isVideoUrl(url) {
	return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

// Blob URL temizleme - ResourceManager kullanarak
function cleanupBlobUrl() {
	ResourceManager.revokeAllBlobUrls();
}

// Updates CSS filters based on state (throttled)
const updateFilters = throttle(function () {
	const filter = `blur(${state.blur}px) brightness(${state.brightness / 100})`;
	customBg.style.filter = filter;
	customVideo.style.filter = filter;
	canvas.style.opacity = state.rain / 100;

	if (state.overlayColor !== "none" && state.overlayOpacity > 0) {
		colorOverlay.style.backgroundColor = state.overlayColor;
		colorOverlay.style.opacity = state.overlayOpacity / 100;
	} else {
		colorOverlay.style.opacity = 0;
	}
}, 16);

// Switches between Image and Video mode
function setBackground(url, type = "image", presetIndex = -1) {
	LoadingController.cancelAll();
	const loadId = LoadingController.startLoading();

	state.currentType = type;
	state.currentUrl = url;
	state.currentPresetIndex = presetIndex;

	if (presetIndex === -1) {
		document
			.querySelectorAll(".preset-item")
			.forEach((el) => el.classList.remove("active"));
	}

	if (type === "video") {
		showLoader("Loading video...");

		customBg.classList.add("hidden");
		customVideo.classList.remove("hidden");
		customVideo.classList.add("active");

		customVideo.muted = true;
		customVideo.loop = true;
		customVideo.playsInline = true;
		customVideo.setAttribute("playsinline", "");
		customVideo.setAttribute("webkit-playsinline", "");

		customVideo.pause();
		customVideo.removeAttribute("src");
		customVideo.load();

		customVideo.src = url;

		const playVideo = () => {
			if (!LoadingController.isCurrentLoading(loadId)) {
				return;
			}

			const playPromise = customVideo.play();

			if (playPromise !== undefined) {
				playPromise
					.then(() => {
						if (!LoadingController.isCurrentLoading(loadId)) {
							customVideo.pause();
							return;
						}
						hideLoader();
					})
					.catch((error) => {
						if (!LoadingController.isCurrentLoading(loadId)) return;

						console.warn("Video could not autoplay:", error);
						hideLoader();

						if (error.name === "NotAllowedError") {
							showToast("🎬 Tap the screen to start the video", "info");

							const startVideo = () => {
								customVideo.play().catch(() => {});
								document.removeEventListener("click", startVideo);
								document.removeEventListener("touchstart", startVideo);
							};
							document.addEventListener("click", startVideo, { once: true });
							document.addEventListener("touchstart", startVideo, {
								once: true,
								passive: true
							});
						} else {
							showToast("❌ Video could not be played", "error");
						}
					});
			}
		};

		const canPlayHandler = () => {
			if (LoadingController.isCurrentLoading(loadId)) {
				playVideo();
			}
		};

		if (customVideo.readyState >= 3) {
			playVideo();
		} else {
			customVideo.addEventListener("canplay", canPlayHandler, { once: true });
		}
	} else {
		showLoader("Loading image...");

		customVideo.pause();
		customVideo.classList.add("hidden");
		customVideo.classList.remove("active");

		customBg.classList.remove("hidden");

		const imgLoadHandler = () => {
			if (LoadingController.isCurrentLoading(loadId)) {
				hideLoader();
				// Sadece henüz init edilmediyse çağır
				if (!raindropsInitialized && typeof initRaindrops === "function") {
					setTimeout(() => initRaindrops(), 100);
				}
			}
		};

		const imgErrorHandler = () => {
			if (LoadingController.isCurrentLoading(loadId)) {
				hideLoader();
				showToast("❌ Image could not be loaded", "error");

				if (state.currentPresetIndex !== 0) {
					setBackground(PRESETS[0].url, PRESETS[0].type, 0);
					document.querySelectorAll(".preset-item")[0]?.classList.add("active");
				}
			}
		};

		customBg.onload = imgLoadHandler;
		customBg.onerror = imgErrorHandler;

		customBg.src = url;

		if (customBg.complete) {
			imgLoadHandler();
		}
	}

	updateFilters();
}

// Error handlers for media elements
function setupMediaErrorHandlers() {
	customVideo.onerror = function (e) {
		hideLoader();
		console.error("Video loading error", e);
		showToast("❌ Video could not be loaded", "error");

		if (state.currentPresetIndex !== 0) {
			setBackground(PRESETS[0].url, PRESETS[0].type, 0);
			document.querySelectorAll(".preset-item")[0]?.classList.add("active");
		}
	};

	customVideo.addEventListener("loadeddata", () => {
		console.log("Video data loaded");
	});

	customVideo.addEventListener("waiting", () => {
		showLoader("Video buffering...");
	});

	customVideo.addEventListener("playing", () => {
		hideLoader();
	});

	customVideo.addEventListener("canplay", () => {
		hideLoader();
	});

	customVideo.addEventListener("stalled", () => {
		console.warn("Video stream stalled");
		showLoader("Waiting for video connection...");
	});
}

// Updates sound UI based on state
function syncSoundUI() {
	const isOn = state.soundOn;

	soundBtn.classList.toggle("active", isOn);
	soundBtn.textContent = isOn ? "🔊" : "🔇";
	soundBtn.setAttribute("aria-pressed", isOn);

	soundToggleIcon.textContent = isOn ? "🔊" : "🔇";
	soundToggleIcon.setAttribute("aria-pressed", isOn);
}

// Sets sound on/off
function setSound(on) {
	state.soundOn = !!on;
	syncSoundUI();

	if (state.soundOn) {
		AudioManager.setVolume(state.volume / 100);
		AudioManager.play().catch(() => {
			state.soundOn = false;
			syncSoundUI();
			showToast("🔇 Autoplay audio blocked — click to enable", "info");
		});
	} else {
		AudioManager.pause();
	}
}

// LocalStorage functions
function saveToLocalStorage() {
	try {
		const saveData = {
			blur: state.blur,
			brightness: state.brightness,
			rain: state.rain,
			overlayColor: state.overlayColor,
			overlayOpacity: state.overlayOpacity,
			volume: state.volume,
			soundOn: state.soundOn,
			currentPresetIndex: state.currentPresetIndex,
			savedAt: Date.now()
		};

		const dataString = JSON.stringify(saveData);
		localStorage.setItem("rainSettings", dataString);
		showToast("✓ Settings saved", "success");
		return true;
	} catch (e) {
		if (
			e.name === "QuotaExceededError" ||
			e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
			e.code === 22 ||
			e.code === 1014
		) {
			showToast("❌ Storage is full!", "error");

			if (confirm("Storage is full. Delete old settings and try again?")) {
				try {
					localStorage.removeItem("rainSettings");
					return saveToLocalStorage();
				} catch (retryError) {
					showToast("❌ Cleanup failed", "error");
				}
			}
		} else {
			showToast("❌ Settings could not be saved", "error");
			console.error("localStorage save error:", e);
		}
		return false;
	}
}

function loadFromLocalStorage() {
	try {
		const saved = localStorage.getItem("rainSettings");
		if (saved) {
			const data = JSON.parse(saved);

			if (typeof data !== "object" || data === null) {
				localStorage.removeItem("rainSettings");
				return false;
			}

			const maxBlur = DeviceInfo.getMaxBlur();
			state.blur = Math.min(
				maxBlur,
				Math.max(0, parseInt(data.blur) || DEFAULT_STATE.blur)
			);
			state.brightness = Math.min(
				120,
				Math.max(20, parseInt(data.brightness) || DEFAULT_STATE.brightness)
			);
			state.rain = Math.min(
				100,
				Math.max(20, parseInt(data.rain) || DEFAULT_STATE.rain)
			);
			state.volume = Math.min(
				100,
				Math.max(0, parseInt(data.volume) || DEFAULT_STATE.volume)
			);
			state.overlayOpacity = Math.min(
				80,
				Math.max(0, parseInt(data.overlayOpacity) || DEFAULT_STATE.overlayOpacity)
			);
			state.overlayColor = data.overlayColor || DEFAULT_STATE.overlayColor;
			state.soundOn =
				typeof data.soundOn === "boolean" ? data.soundOn : DEFAULT_STATE.soundOn;
			state.currentPresetIndex =
				data.currentPresetIndex ?? DEFAULT_STATE.currentPresetIndex;

			if (
				state.currentPresetIndex >= 0 &&
				state.currentPresetIndex < PRESETS.length
			) {
				state.currentUrl = PRESETS[state.currentPresetIndex].url;
				state.currentType = PRESETS[state.currentPresetIndex].type;
			} else {
				state.currentPresetIndex = 0;
				state.currentUrl = PRESETS[0].url;
				state.currentType = PRESETS[0].type;
			}

			return true;
		}
	} catch (e) {
		console.warn("localStorage read error:", e);
		try {
			localStorage.removeItem("rainSettings");
		} catch (removeError) {}
	}
	return false;
}

function resetToDefaults() {
	// Reset the state
	Object.keys(DEFAULT_STATE).forEach((key) => {
		state[key] = DEFAULT_STATE[key];
	});

	// Apply filters IMMEDIATELY
	const filter = `blur(${state.blur}px) brightness(${state.brightness / 100})`;
	customBg.style.filter = filter;
	customVideo.style.filter = filter;
	canvas.style.opacity = state.rain / 100;
	colorOverlay.style.opacity = 0;

	// Update the UI
	applyStateToUI();

	// Update preset selection
	document.querySelectorAll(".preset-item").forEach((el, i) => {
		el.classList.toggle("active", i === 0);
	});

	// Clear LocalStorage
	try {
		localStorage.removeItem("rainSettings");
	} catch (e) {}

	// Return to default image
	setBackground(PRESETS[0].url, PRESETS[0].type, 0);

	// Apply sound settings
	AudioManager.setVolume(state.volume / 100);
	setSound(state.soundOn);

	showToast("✓ Reset to defaults", "success");
}

// Apply state values to UI controls
function applyStateToUI() {
	const maxBlur = DeviceInfo.getMaxBlur();
	const blurRange = document.getElementById("blur-range");
	blurRange.max = maxBlur;
	blurRange.value = state.blur;
	document.getElementById("blur-val").textContent = state.blur + "px";

	document.getElementById("brightness-range").value = state.brightness;
	document.getElementById("brightness-val").textContent = state.brightness + "%";

	document.getElementById("rain-range").value = state.rain;
	document.getElementById("rain-val").textContent = state.rain + "%";

	document.getElementById("overlay-range").value = state.overlayOpacity;
	document.getElementById("overlay-val").textContent =
		state.overlayOpacity + "%";

	document.getElementById("volume-range").value = state.volume;
	document.getElementById("volume-val").textContent = state.volume + "%";

	document.querySelectorAll(".color-btn").forEach((btn) => {
		const isActive = btn.dataset.color === state.overlayColor;
		btn.classList.toggle("active", isActive);
		btn.setAttribute("aria-checked", isActive);
	});

	updateFilters();
	syncSoundUI();

	// Volume'u AudioManager'a uygula
	if (typeof AudioManager !== "undefined" && AudioManager.setVolume) {
		AudioManager.setVolume(state.volume / 100);
	}
}

function generateShareUrl() {
	const params = new URLSearchParams();
	params.set("blur", state.blur);
	params.set("brightness", state.brightness);
	params.set("rain", state.rain);
	params.set("volume", state.volume);
	params.set("sound", state.soundOn ? "1" : "0");

	if (state.overlayColor !== "none") {
		params.set("color", state.overlayColor.replace("#", ""));
		params.set("colorOpacity", state.overlayOpacity);
	}

	if (state.currentPresetIndex >= 0) {
		params.set("preset", state.currentPresetIndex);
	}

	// Base URL belirle
	let baseUrl;
	const hostname = window.location.hostname;

	if (hostname.includes("cdpn.io") || hostname.includes("codepen.io")) {
		// CodePen
		baseUrl = CONFIG.codepenUrl || "https://codepen.io/fyildiz1974/pen/RNRgjpj";
	} else if (hostname === "127.0.0.1" || hostname === "localhost") {
		// Local development
		baseUrl = window.location.origin + window.location.pathname;
	} else {
		// Production
		baseUrl =
			CONFIG.productionUrl || window.location.origin + window.location.pathname;
	}

	return baseUrl + "?" + params.toString();
}

function loadFromUrl() {
	const params = new URLSearchParams(window.location.search);
	let hasUrlParams = false;

	if (params.has("blur")) {
		const maxBlur = DeviceInfo.getMaxBlur();
		const blurVal = parseInt(params.get("blur"));
		// 0 değerini de kabul et (NaN kontrolü yap)
		state.blur = !isNaN(blurVal)
			? Math.min(maxBlur, Math.max(0, blurVal))
			: DEFAULT_STATE.blur;
		hasUrlParams = true;
	}

	if (params.has("brightness")) {
		const brightnessVal = parseInt(params.get("brightness"));
		state.brightness = !isNaN(brightnessVal)
			? Math.min(120, Math.max(20, brightnessVal))
			: DEFAULT_STATE.brightness;
		hasUrlParams = true;
	}

	if (params.has("rain")) {
		const rainVal = parseInt(params.get("rain"));
		state.rain = !isNaN(rainVal)
			? Math.min(100, Math.max(20, rainVal))
			: DEFAULT_STATE.rain;
		hasUrlParams = true;
	}

	if (params.has("volume")) {
		const volumeVal = parseInt(params.get("volume"));
		state.volume = !isNaN(volumeVal)
			? Math.min(100, Math.max(0, volumeVal))
			: DEFAULT_STATE.volume;
		hasUrlParams = true;
	}

	if (params.has("color")) {
		state.overlayColor = "#" + params.get("color");
		hasUrlParams = true;
	}

	if (params.has("colorOpacity")) {
		const opacityVal = parseInt(params.get("colorOpacity"));
		state.overlayOpacity = !isNaN(opacityVal)
			? Math.min(80, Math.max(0, opacityVal))
			: 30;
		hasUrlParams = true;
	}

	if (params.has("preset")) {
		const presetIdx = parseInt(params.get("preset"));
		if (!isNaN(presetIdx) && presetIdx >= 0 && presetIdx < PRESETS.length) {
			state.currentPresetIndex = presetIdx;
			state.currentUrl = PRESETS[presetIdx].url;
			state.currentType = PRESETS[presetIdx].type;
		}
		hasUrlParams = true;
	}

	return hasUrlParams;
}

function copyToClipboard(text) {
	if (navigator.clipboard) {
		navigator.clipboard
			.writeText(text)
			.then(() => {
				showToast("✓ Link copied!", "success");
			})
			.catch(() => {
				fallbackCopy(text);
			});
	} else {
		fallbackCopy(text);
	}
}

function fallbackCopy(text) {
	const input = document.createElement("input");
	input.value = text;
	document.body.appendChild(input);
	input.select();
	try {
		document.execCommand("copy");
		showToast("✓ Link copied!", "success");
	} catch (e) {
		showToast("❌ Copy failed", "error");
	}
	document.body.removeChild(input);
}

function togglePanel(forceState) {
	const shouldOpen =
		typeof forceState === "boolean"
			? forceState
			: !panel.classList.contains("open");

	if (shouldOpen) {
		panel.classList.add("open");
		document.body.classList.add("panel-active");
		panel.setAttribute("aria-hidden", "false");
		settingsBtn.setAttribute("aria-expanded", "true");

		setTimeout(() => {
			document.getElementById("panel-close").focus();
		}, 100);
	} else {
		panel.classList.remove("open");
		document.body.classList.remove("panel-active");
		panel.setAttribute("aria-hidden", "true");
		settingsBtn.setAttribute("aria-expanded", "false");

		settingsBtn.focus();
	}
}

function setupFocusTrap() {
	panel.addEventListener("keydown", (e) => {
		if (e.key !== "Tab") return;
		if (!panel.classList.contains("open")) return;

		const focusableElements = panel.querySelectorAll(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);
		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		if (e.shiftKey && document.activeElement === firstElement) {
			e.preventDefault();
			lastElement.focus();
		} else if (!e.shiftKey && document.activeElement === lastElement) {
			e.preventDefault();
			firstElement.focus();
		}
	});
}

// =====================================================================
// INITIALIZATION & EVENT LISTENERS
// =====================================================================
function createPresets() {
	PRESETS.forEach((preset, index) => {
		const item = document.createElement("div");
		item.className =
			"preset-item" +
			(index === state.currentPresetIndex ? " active" : "") +
			(preset.type === "video" ? " video" : "");
		item.dataset.label = preset.label;
		item.dataset.index = index;
		item.style.backgroundImage = `url(${preset.thumb})`;
		item.setAttribute("role", "option");
		item.setAttribute("aria-selected", index === state.currentPresetIndex);
		item.setAttribute("tabindex", "0");
		item.setAttribute(
			"aria-label",
			`${preset.label} ${preset.type === "video" ? "video" : "image"}`
		);

		const selectPreset = () => {
			document.querySelectorAll(".preset-item").forEach((el, i) => {
				el.classList.remove("active");
				el.setAttribute("aria-selected", "false");
			});
			item.classList.add("active");
			item.setAttribute("aria-selected", "true");
			cleanupBlobUrl();
			setBackground(preset.url, preset.type, index);
		};

		item.addEventListener("click", selectPreset);
		item.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				selectPreset();
			}
			// Arrow key navigation for preset grid
			if (e.key === "ArrowRight" || e.key === "ArrowDown") {
				e.preventDefault();
				const nextIndex = (index + 1) % PRESETS.length;
				const nextItem = presetGrid.children[nextIndex];
				if (nextItem) nextItem.focus();
			}
			if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
				e.preventDefault();
				const prevIndex = (index - 1 + PRESETS.length) % PRESETS.length;
				const prevItem = presetGrid.children[prevIndex];
				if (prevItem) prevItem.focus();
			}
		});

		presetGrid.appendChild(item);
	});
}

function setupSlider(id, stateKey, suffix) {
	const slider = document.getElementById(id + "-range");
	const display = document.getElementById(id + "-val");

	const throttledUpdate = throttle(() => {
		updateFilters();
	}, 16);

	slider.addEventListener("input", (e) => {
		state[stateKey] = parseInt(e.target.value);
		display.textContent = state[stateKey] + suffix;
		throttledUpdate();
	});
}

// Touch / Swipe support
function setupTouchSupport() {
	let touchStartX = 0;
	let touchEndX = 0;
	const threshold = 50;

	document.addEventListener(
		"touchstart",
		(e) => {
			touchStartX = e.changedTouches[0].screenX;
		},
		{ passive: true }
	);

	document.addEventListener(
		"touchend",
		(e) => {
			touchEndX = e.changedTouches[0].screenX;
			handleSwipe();
		},
		{ passive: true }
	);

	function handleSwipe() {
		const diff = touchStartX - touchEndX;

		if (diff > threshold && touchStartX > window.innerWidth - 50) {
			togglePanel(true);
		}

		if (diff < -threshold && panel.classList.contains("open")) {
			togglePanel(false);
		}
	}
}

// Main initialization
document.addEventListener("DOMContentLoaded", () => {
	// Initialize AudioManager
	AudioManager.init(rainAudio);

	// Initialize PWA Manager
	PWAManager.init();

	// Setup error handlers for media
	setupMediaErrorHandlers();

	// Setup focus trap for accessibility
	setupFocusTrap();

	// Try to load from URL first, then localStorage
	const hasUrlParams = loadFromUrl();
	if (!hasUrlParams) {
		loadFromLocalStorage();
	}

	// Update blur slider max value on mobile
	const blurSlider = document.getElementById("blur-range");
	blurSlider.max = DeviceInfo.getMaxBlur();

	// Create preset items
	createPresets();

	// Apply state to UI
	applyStateToUI();

	// Set initial background
	if (
		state.currentPresetIndex >= 0 &&
		state.currentPresetIndex < PRESETS.length
	) {
		setBackground(
			PRESETS[state.currentPresetIndex].url,
			PRESETS[state.currentPresetIndex].type,
			state.currentPresetIndex
		);
	}

	// If loaded from URL, force-apply effects after DOM is ready
	if (hasUrlParams) {
		// Apply effects with a short delay (wait for DOM rendering)
		setTimeout(() => {
			// Apply filters
			const filter = `blur(${state.blur}px) brightness(${state.brightness / 100})`;
			customBg.style.filter = filter;
			customVideo.style.filter = filter;
			canvas.style.opacity = state.rain / 100;

			// Color overlay
			if (state.overlayColor !== "none" && state.overlayOpacity > 0) {
				colorOverlay.style.backgroundColor = state.overlayColor;
				colorOverlay.style.opacity = state.overlayOpacity / 100;
			} else {
				colorOverlay.style.opacity = 0;
			}

			// Volume
			AudioManager.setVolume(state.volume / 100);
		}, 100);
	}

	// Load and initialize Raindrops.js
	loadRaindrops()
		.then(() => {
			setTimeout(() => {
				// Set canvas size
				canvas.width = window.innerWidth;
				canvas.height = window.innerHeight;
				initRaindrops();
			}, 500);
		})
		.catch((err) => {
			console.warn("Raindrops.js could not be loaded:", err);
		});

	// Setup touch/swipe
	setupTouchSupport();

	// Setup sliders with throttling
	setupSlider("blur", "blur", "px");
	setupSlider("brightness", "brightness", "%");
	setupSlider("rain", "rain", "%");
	setupSlider("overlay", "overlayOpacity", "%");

	// Volume slider
	const volumeSlider = document.getElementById("volume-range");
	const volumeDisplay = document.getElementById("volume-val");

	volumeSlider.addEventListener("input", (e) => {
		state.volume = parseInt(e.target.value);
		volumeDisplay.textContent = state.volume + "%";
		AudioManager.setVolume(state.volume / 100);
	});

	// Start ambient sound ON
	setSound(true);

	// Retry audio on first user gesture if blocked
	const retryAudioOnce = () => {
		if (!state.soundOn) setSound(true);
		window.removeEventListener("pointerdown", retryAudioOnce);
		window.removeEventListener("keydown", retryAudioOnce);
		window.removeEventListener("touchstart", retryAudioOnce);
	};
	window.addEventListener("pointerdown", retryAudioOnce, { once: true });
	window.addEventListener("keydown", retryAudioOnce, { once: true });
	window.addEventListener("touchstart", retryAudioOnce, {
		once: true,
		passive: true
	});

	// Panel toggle button
	settingsBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		togglePanel();
	});

	// Close panel button
	document.getElementById("panel-close").addEventListener("click", () => {
		togglePanel(false);
	});

	// Click outside panel to close (desktop)
	document.addEventListener("click", (e) => {
		if (
			window.innerWidth > 480 &&
			!panel.contains(e.target) &&
			!e.target.closest(".ui-btn") &&
			panel.classList.contains("open")
		) {
			togglePanel(false);
		}
	});

	// Color buttons logic
	document.querySelectorAll(".color-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			document.querySelectorAll(".color-btn").forEach((b) => {
				b.classList.remove("active");
				b.setAttribute("aria-checked", "false");
			});
			btn.classList.add("active");
			btn.setAttribute("aria-checked", "true");
			state.overlayColor = btn.dataset.color;

			if (state.overlayColor === "none") {
				state.overlayOpacity = 0;
				document.getElementById("overlay-range").value = 0;
				document.getElementById("overlay-val").textContent = "0%";
			} else if (state.overlayOpacity === 0) {
				state.overlayOpacity = 30;
				document.getElementById("overlay-range").value = 30;
				document.getElementById("overlay-val").textContent = "30%";
			}

			updateFilters();
		});
	});

	// Load URL button
	document.getElementById("url-btn").addEventListener("click", () => {
		const rawUrl = document.getElementById("url-input").value.trim();

		if (!rawUrl) {
			showToast("❌ Please enter a URL", "error");
			return;
		}

		const safeUrl = sanitizeUrl(rawUrl);
		if (!safeUrl) {
			showToast("❌ Invalid or unsafe URL", "error");
			return;
		}

		cleanupBlobUrl();
		const type = isVideoUrl(safeUrl) ? "video" : "image";
		setBackground(safeUrl, type, -1);
		document.getElementById("url-input").value = "";
		showToast(type === "video" ? "✓ Video loaded" : "✓ Image loaded", "success");
	});

	// Enter key on input
	document.getElementById("url-input").addEventListener("keypress", (e) => {
		if (e.key === "Enter") document.getElementById("url-btn").click();
	});

	// File upload logic
	document.getElementById("file-btn").addEventListener("click", () => {
		document.getElementById("file-input").click();
	});

	document.getElementById("file-input").addEventListener("change", (e) => {
		const file = e.target.files[0];
		if (file) {
			if (file.size > 50 * 1024 * 1024) {
				showToast("❌ File is too large (max 50MB)", "error");
				return;
			}

			cleanupBlobUrl();
			const blobUrl = ResourceManager.createBlobUrl(file);
			const type = file.type.startsWith("video/") ? "video" : "image";
			setBackground(blobUrl, type, -1);
			showToast(type === "video" ? "✓ Video loaded" : "✓ Image loaded", "success");
		}
		e.target.value = "";
	});

	// Sound controls
	soundBtn.addEventListener("click", () => setSound(!state.soundOn));
	soundToggleIcon.addEventListener("click", () => setSound(!state.soundOn));

	// Share button
	document.getElementById("btn-share").addEventListener("click", () => {
		const url = generateShareUrl();
		copyToClipboard(url);
	});

	// Save button
	document
		.getElementById("btn-save")
		.addEventListener("click", saveToLocalStorage);

	// Reset button
	document.getElementById("btn-reset").addEventListener("click", () => {
		if (confirm("All settings will be reset to defaults. Are you sure?")) {
			resetToDefaults();
		}
	});

	// ========== FULLSCREEN SETUP ==========
	// Call init first (set up event listeners)
	FullscreenAPI.init();

	const fullscreenBtn = document.getElementById("btn-fullscreen");
	if (fullscreenBtn) {
		fullscreenBtn.addEventListener("click", function (e) {
			e.preventDefault();
			FullscreenAPI.toggle();
		});
	}

	// Keyboard shortcuts
	document.addEventListener("keydown", (e) => {
		if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
			return;
		}

		if (e.key === "Escape") {
			togglePanel(false);
		}
		if (e.key === "s" && !e.ctrlKey && !e.metaKey) {
			e.preventDefault();
			setSound(!state.soundOn);
		}
		if (e.key === "f" && !e.ctrlKey && !e.metaKey) {
			e.preventDefault();
			FullscreenAPI.toggle();
		}
		if (e.key === "p" && !e.ctrlKey && !e.metaKey) {
			e.preventDefault();
			togglePanel();
		}
	});

	// Cleanup on page unload
	window.addEventListener("beforeunload", () => {
		ResourceManager.cleanup();
	});

	// Handle visibility change (pause/resume video)
	document.addEventListener("visibilitychange", () => {
		if (state.currentType === "video") {
			if (document.hidden) {
				customVideo.pause();
			} else {
				customVideo.play().catch(() => {});
			}
		}
	});

	// Window resize handler - resize the canvas
	const handleResize = debounce(() => {
		if (raindropInstance && typeof raindropInstance.resize === "function") {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			// Some implementations may have a resize method
			try {
				raindropInstance.resize();
			} catch (e) {
				// If no resize method, re-initialize
				initRaindrops();
			}
		}
	}, 250);

	window.addEventListener("resize", handleResize);
	/* =========================================================
   Widgets loader (loads AFTER core app is ready)
   - Does NOT block raindrops or core initialization
   ========================================================= */
	(function () {
		function loadScript(src) {
			return new Promise((resolve, reject) => {
				const s = document.createElement("script");
				s.src = src;
				s.async = true;
				s.onload = () => resolve();
				s.onerror = () => reject(new Error("Failed to load: " + src));
				document.head.appendChild(s);
			});
		}

		function startWidgets() {
			// Load widgets in idle time (or a small delay fallback)
			const run = () => {
				loadScript("https://fyildiz1974.github.io/web/files/widgets.js")
					.then(() => {
						if (window.Widgets && typeof window.Widgets.init === "function") {
							return window.Widgets.init();
						}
					})
					.catch((e) => console.warn("[WidgetsLoader]", e.message));
			};

			if ("requestIdleCallback" in window) {
				requestIdleCallback(run, { timeout: 4000 });
			} else {
				setTimeout(run, 1500);
			}
		}

		window.addEventListener("load", startWidgets, { once: true });
	})();
});
