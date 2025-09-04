import {mkdir, rm, writeFile} from "node:fs/promises";
import {DOMParser} from "linkedom";
import players from "./cache/players.json" with {type: "json"};
import leaderboards from "./cache/leaderboards.json" with {type: "json"};
import bears from "./cache/bears.json" with {type: "json"};
import missions from "./cache/missions.json" with {type: "json"};
import races from "./cache/races.json" with {type: "json"};
import sublevels from "./cache/sublevels.json" with {type: "json"};
const blocks = ["foreignObject", "svg", "g", "rect", "path"];
function indent(element, level, block) {
	if (element == null) {
		return;
	}
	const nextSibling = element.nextElementSibling;
	const stack = [block];
	while (element != null && element !== nextSibling) {
		const block = stack[stack.length - 1];
		if (block) {
			element.before("\t".repeat(level));
			element.after("\n");
		}
		while (element.firstElementChild != null) {
			const block = blocks.includes(element.tagName);
			if (block) {
				++level;
				element.prepend("\n");
			}
			stack.push(block);
			element = element.firstElementChild;
			if (block) {
				element.before("\t".repeat(level));
				element.after("\n");
			}
		}
		while (stack.length !== 1 && element.nextElementSibling == null) {
			element = element.parentElement;
			const block = stack[stack.length - 1];
			if (block) {
				--level;
				element.append("\t".repeat(level));
			}
			stack.pop();
		}
		element = element.nextElementSibling;
	}
}
function sort(array, hash) {
	array.sort((a, b) => {
		const aHash = hash(a);
		const bHash = hash(b);
		if (aHash < bHash) {
			return -1;
		}
		if (aHash > bHash) {
			return 1;
		}
		return 0;
	});
	return array;
}
function sortData(data) {
	sort(data, (datum) => {
		return Object.keys(datum[1])[0] || Object.keys(datum[1])[1];
	});
	return data;
}
function sortDatumDates(datumDates) {
	sort(datumDates, (datumDate) => {
		return datumDate[0];
	});
	return datumDates;
}
function plot(scope, title, data, cumulative, extended, timed, goals) {
	const sortedData = Object.fromEntries(sortData(Object.entries(data).map(([datum, dates]) => {
		return [
			datum,
			Object.fromEntries(sortDatumDates(Object.entries(dates))),
		];
	})));
	let minDate = null;
	let maxDate = null;
	let maxValue = null;
	for (const datumDates of Object.values(sortedData)) {
		let currentValue = "" in datumDates ? datumDates[""] : 0;
		if (extended && (maxValue == null || currentValue > maxValue)) {
			maxValue = currentValue;
		}
		for (const [date, dateValueOrDiff] of Object.entries(datumDates)) {
			if (date === "") {
				continue;
			}
			if (minDate == null || date.length < minDate.length || date < minDate) {
				minDate = date;
			}
			if (maxDate == null || date.length > maxDate.length || date > maxDate) {
				maxDate = date;
			}
			if (!cumulative) {
				currentValue = dateValueOrDiff;
			} else {
				currentValue += dateValueOrDiff;
				datumDates[date] = currentValue;
			}
			if (maxValue == null || currentValue > maxValue) {
				maxValue = currentValue;
			}
		}
	}
	const maxDuration = Math.round((Date.parse(maxDate) - Date.parse(minDate)) / 86400000);
	const document = new DOMParser().parseFromString(`\
<svg xmlns="http://www.w3.org/2000/svg" lang="en">
	<title>${title}</title>
	<metadata>
		<meta xmlns="http://www.w3.org/1999/xhtml" charset="utf-8" />
		<meta xmlns="http://www.w3.org/1999/xhtml" name="viewport" content="width=device-width" />
		<meta xmlns="http://www.w3.org/1999/xhtml" name="color-scheme" content="dark light" />
	</metadata>
	<style>
		*,
		::before,
		::after {
			box-sizing: border-box;
		}
		:root {
			background: var(--canvas-background);
			color: var(--canvas-foreground);
			fill: var(--canvas-background);
			stroke: var(--canvas-foreground);
			stroke-linejoin: round;
			stroke-linecap: round;
		}
		foreignObject {
			pointer-events: none;
		}
		foreignObject::before,
		foreignObject::after {
			content: "";
			position: absolute;
			z-index: 1;
			left: 20px;
			bottom: 20px;
			pointer-events: auto;
		}
		foreignObject::before {
			width: calc(100% - 40px);
			height: calc(20px + var(--date-size) * 1px);
		}
		foreignObject::after {
			width: calc(20px + var(--value-size) * 1px);
			height: calc(100% - 40px);
		}
		foreignObject &gt; div {
			position: absolute;
			z-index: 4;
			right: 0;
			top: 0;
			margin: 20px;
			border: 1px solid var(--canvas-foreground);
			background: var(--highlighted);
			font: 16px / 1.25 serif;
			transition: opacity 1s;
			pointer-events: auto;
		}
		foreignObject:is(:hover, :focus-within) &gt; div:not(:hover, :focus-within) {
			opacity: 0;
			pointer-events: none;
		}
		foreignObject &gt; div &gt; p {
			margin: 0;
		}
		label {
			display: table;
			border-collapse: separate;
			border-spacing: 10px;
			direction: rtl;
		}
		progress,
		input[type="checkbox"] {
			display: table-cell;
			width: 16px;
			height: 16px;
			margin: 2px;
			accent-color: var(--canvas-foreground);
			vertical-align: top;
			direction: ltr;
		}
		progress + span,
		input[type="checkbox"] + span {
			display: table-cell;
			vertical-align: top;
			direction: ltr;
		}
		input[type="checkbox"]:not(:disabled):is(:hover, :focus-within) + span {
			text-decoration: underline;
		}
		foreignObject &gt; svg:first-of-type,
		foreignObject &gt; svg:first-of-type + svg,
		foreignObject &gt; svg:first-of-type + svg + svg,
		foreignObject &gt; svg:first-of-type + svg + svg + svg {
			position: absolute;
			z-index: 2;
			margin: 0;
			padding: 10px;
			background: var(--highlighted);
			font: 16px / 1.25 serif;
			font-weight: bold;
			pointer-events: auto;
		}
		foreignObject &gt; svg:first-of-type,
		foreignObject &gt; svg:first-of-type + svg + svg {
			border-top: 1px solid #0000;
			border-bottom: 1px solid var(--canvas-foreground);
		}
		foreignObject &gt; svg:first-of-type + svg,
		foreignObject &gt; svg:first-of-type + svg + svg + svg {
			border-top: 1px dashed var(--canvas-foreground);
			border-bottom: 1px dashed #0000;
		}
		foreignObject &gt; svg:first-of-type,
		foreignObject &gt; svg:first-of-type + svg {
			width: calc(20px + var(--date-size) * 1px);
			height: 42px;
			bottom: 20px;
		}
		foreignObject &gt; svg:first-of-type {
			left: calc(40px + var(--value-size) * 1px);
			transform: rotate(90deg) translate(-100%, 0);
			transform-origin: left bottom;
		}
		foreignObject &gt; svg:first-of-type + svg {
			right: 20px;
			transform: rotate(90deg) translate(0, 100%);
			transform-origin: right bottom;
		}
		foreignObject &gt; svg:first-of-type + svg + svg,
		foreignObject &gt; svg:first-of-type + svg + svg + svg {
			width: calc(20px + var(--value-size) * 1px);
			height: 42px;
			left: 20px;
		}
		foreignObject &gt; svg:first-of-type + svg + svg {
			bottom: calc(40px + var(--date-size) * 1px);
		}
		foreignObject &gt; svg:first-of-type + svg + svg + svg {
			top: 20px;
		}
		foreignObject &gt; svg:first-of-type > text,
		foreignObject &gt; svg:first-of-type + svg > text,
		foreignObject &gt; svg:first-of-type + svg + svg > text,
		foreignObject &gt; svg:first-of-type + svg + svg + svg > text {
			fill: var(--canvas-foreground);
			stroke: none;
		}
		foreignObject &gt; svg:first-of-type > text,
		foreignObject &gt; svg:first-of-type + svg > text {
			cursor: vertical-text;
		}
		foreignObject &gt; svg:first-of-type + svg + svg + svg + svg {
			position: relative;
			z-index: 3;
			width: calc(100% - 60px - var(--value-size) * 1px);
			height: calc(100% - 60px - var(--date-size) * 1px);
			margin: 20px 20px calc(40px + var(--date-size) * 1px) calc(40px + var(--value-size) * 1px);
			border-left: 1px solid var(--canvas-foreground);
			border-right: 1px dashed var(--canvas-foreground);
			border-top: 1px dashed var(--canvas-foreground);
			border-bottom: 1px solid var(--canvas-foreground);
			background: var(--canvas-background);
			pointer-events: auto;
		}
		g &gt; rect {
			vector-effect: non-scaling-stroke;
			fill: var(--highlighted);
			stroke: none;
		}
		g &gt; rect[tabindex] {
			fill: var(--tier, #0000);
			cursor: help;
		}
		g &gt; rect[tabindex][data-tier="diamond"] {
			--tier: var(--diamond);
		}
		g &gt; rect[tabindex][data-tier="gold"] {
			--tier: var(--gold);
		}
		g &gt; rect[tabindex][data-tier="silver"] {
			--tier: var(--silver);
		}
		g &gt; rect[tabindex][data-tier="bronze"] {
			--tier: var(--bronze);
		}
		g &gt; path[tabindex] {
			vector-effect: non-scaling-stroke;
			fill: none;
			stroke: hsl(calc(var(--index) / var(--count) * 360), 50%, 50%);
			cursor: help;
		}
		g:is(:hover, :focus-within) &gt; path[tabindex] {
			stroke: var(--canvas-foreground);
		}
		g &gt; path[tabindex]:is(:hover, :focus-within) {
			outline: 0;
		}
		g &gt; path[tabindex]:first-of-type {
			stroke-width: 2;
		}
		g &gt; path[tabindex]:first-of-type:is(:hover, :focus-within) {
			stroke-width: 4;
		}
		g &gt; path[tabindex]:first-of-type:not(:last-of-type) {
			stroke-dasharray: 4 8;
		}
		g &gt; path[tabindex]:first-of-type + rect {
			fill: none;
		}
		g &gt; path[tabindex]:first-of-type:is(:hover, :focus-within) + rect {
			fill: var(--highlighted);
			pointer-events: none;
		}
		g &gt; path[tabindex]:first-of-type ~ path[tabindex] {
			stroke-width: 8;
		}
		g &gt; path[tabindex]:first-of-type ~ path[tabindex]:is(:hover, :focus-within) {
			stroke-width: 16;
		}
		g &gt; path[tabindex]:first-of-type ~ path[tabindex] + line,
		g &gt; path[tabindex]:first-of-type ~ path[tabindex] + line + line {
			vector-effect: non-scaling-stroke;
			fill: none;
			stroke: none;
			stroke-width: 2;
			stroke-dasharray: 4 8;
			pointer-events: none;
		}
		g &gt; path[tabindex]:first-of-type:is(:hover, :focus-within) + rect + path[tabindex] + line,
		g &gt; path[tabindex]:first-of-type:is(:hover, :focus-within) + rect + path[tabindex] + line + line,
		g &gt; path[tabindex]:first-of-type:is(:hover, :focus-within) ~ path[tabindex]:last-of-type + line,
		g &gt; path[tabindex]:first-of-type:is(:hover, :focus-within) ~ path[tabindex]:last-of-type + line + line,
		g &gt; path[tabindex]:first-of-type ~ path[tabindex]:is(:hover, :focus-within) + line,
		g &gt; path[tabindex]:first-of-type ~ path[tabindex]:is(:hover, :focus-within) + line + line {
			stroke: var(--faded);
		}
		@media (prefers-color-scheme: dark) {
			:root {
				--canvas-background: #000;
				--canvas-foreground: #ccc;
				--diamond: #0363;
				--gold: #6303;
				--silver: #3633;
				--bronze: #6363;
				--highlighted: #6663;
				--faded: #9993;
			}
		}
		@media (prefers-color-scheme: light) {
			:root {
				--canvas-background: #fff;
				--canvas-foreground: #333;
				--diamond: #9cf3;
				--gold: #fc93;
				--silver: #9c93;
				--bronze: #c9c3;
				--highlighted: #9993;
				--faded: #6663;
			}
		}
	</style>
	<script>
		"use strict";
		{
			const script = document.currentScript;
			const documentUrl = location.href;
			const scope = new URL("${scope}", documentUrl).pathname;
			const playersKey = \`\${scope}#players\`;
			const leaderboardsKey = \`\${scope}#leaderboards\`;
			const sessionKey = \`\${scope}#session\`;
			const lockKey = \`\${scope}#lock\`;
			async function importDataScript(dataScriptUrl, signal) {
				signal.throwIfAborted();
				if (documentUrl.protocol !== "file:") {
					const response = await fetch(dataScriptUrl, {
						signal,
					});
					if (!response.ok) {
						throw new Error(response.statusText);
					}
					const data = await response.json();
					return data;
				}
				return await new Promise((resolve, reject) =&gt; {
					const name = \`callback\${Math.random() * 2 ** 53}\`;
					let called = false;
					let data = null;
					function callback(value) {
						if (!called) {
							called = true;
							data = value;
						}
					}
					window[name] = callback;
					const dataScript = document.createElementNS("http://www.w3.org/2000/svg", "script");
					dataScript.href = \`\${dataScriptUrl}&amp;callback=\${name}\`;
					function handleAbort(event) {
						delete window[name];
						dataScript.removeEventListener("error", handleError);
						dataScript.removeEventListener("load", handleLoad);
						dataScript.remove();
						const reason = signal.reason;
						reject(reason);
					}
					function handleError(event) {
						delete window[name];
						signal.removeEventListener("abort", handleAbort);
						dataScript.removeEventListener("load", handleLoad);
						dataScript.remove();
						const error = event.error;
						reject(error);
					}
					function handleLoad(event) {
						delete window[name];
						signal.removeEventListener("abort", handleAbort);
						dataScript.removeEventListener("error", handleError);
						dataScript.remove();
						resolve(data);
					}
					signal.addEventListener("abort", handleAbort, {
						once: true,
					});
					dataScript.addEventListener("error", handleError, {
						once: true,
					});
					dataScript.addEventListener("load", handleLoad, {
						once: true,
					});
					script.after(dataScript);
				});
			}
			async function waitForTimeout(delay, signal) {
				signal.throwIfAborted();
				return await new Promise((resolve, reject) =&gt; {
					let timeout = null;
					function handleAbort() {
						clearTimeout(timeout);
						const reason = signal.reason;
						reject(reason);
					}
					function handleTimeout() {
						signal.removeEventListener("abort", handleAbort);
						resolve(delay);
					}
					signal.addEventListener("abort", handleAbort, {
						once: true,
					});
					timeout = setTimeout(handleTimeout, delay);
				});
			}
			window.addEventListener("pageshow", (event) =&gt; {
				if (event.persisted) {
					console.log(\`Successfully restored page from cache\`);
				} else {
					console.log(\`Unsuccessfully restored page from cache\`);
				}
			});
			window.addEventListener("pagehide", (event) =&gt; {
				if (event.persisted) {
					console.log(\`Successfully saved page to cache\`);
				} else {
					console.log(\`Unsuccessfully saved page to cache\`);
				}
			});
			window.addEventListener("pageshow", async (event) =&gt; {
				const rootTitleElement = document.querySelector("title");
				const rootTitleContent = rootTitleElement.textContent;
				const pathTitleElements = Array.from(document.querySelectorAll("g &gt; path[tabindex]:first-of-type &gt; title"));
				const pathTitleContents = pathTitleElements.map((pathTitleElement) =&gt; {
					const pathTitleContent = pathTitleElement.textContent;
					return pathTitleContent;
				});
				const foreignObject = document.querySelector("foreignObject");
				const div = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
				div.dir = "ltr";
				const p = document.createElementNS("http://www.w3.org/1999/xhtml", "p");
				const label = document.createElementNS("http://www.w3.org/1999/xhtml", "label");
				const progress = document.createElementNS("http://www.w3.org/1999/xhtml", "progress");
				label.append(progress);
				const span = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
				span.textContent = "Loading names";
				label.append(span);
				p.append(label);
				div.append(p);
				foreignObject.prepend(div);
				let lock = false;
				let session = null;
				const broadcastChannel = new BroadcastChannel(sessionKey);
				const abortController = new AbortController();
				const signal = abortController.signal;
				const abort = abortController.abort.bind(abortController);
				const {promise, resolve} = Promise.withResolvers();
				broadcastChannel.addEventListener("message", (event) =&gt; {
					const data = event.data;
					const type = data.type;
					switch (type) {
						case "request": {
							if (lock &amp;&amp; signal.aborted) {
								broadcastChannel.postMessage({
									type: "response",
									session,
								});
							}
							break;
						}
						case "response": {
							if (!signal.aborted) {
								session = data.session;
								if (session != null) {
									const {players, leaderboards} = session;
									try {
										const cachedPlayers = JSON.stringify(players);
										const cachedLeaderboards = JSON.stringify(leaderboards);
										sessionStorage.setItem(playersKey, cachedPlayers);
										sessionStorage.setItem(leaderboardsKey, cachedLeaderboards);
									} catch {}
									console.log(\`Successfully loaded names from peer\`);
									abort();
									resolve();
								} else {
									console.log(\`Unsuccessfully loaded names from peer\`);
									abort();
									resolve();
								}
							}
							break;
						}
					}
				});
				try {
					const cachedPlayers = sessionStorage.getItem(playersKey);
					const cachedLeaderboards = sessionStorage.getItem(leaderboardsKey);
					if (cachedPlayers == null || cachedLeaderboards == null) {
						throw new Error();
					}
					const players = JSON.parse(cachedPlayers);
					const leaderboards = JSON.parse(cachedLeaderboards);
					session = {players, leaderboards};
				} catch {}
				if (session != null) {
					broadcastChannel.postMessage({
						type: "response",
						session,
					});
					console.log(\`Successfully loaded names from local\`);
					abort();
					resolve();
				} else {
					broadcastChannel.postMessage({
						type: "request",
					});
					console.log(\`Unsuccessfully loaded names from local\`);
				}
				(async () =&gt; {
					for (;;) {
						await navigator.locks.request(lockKey, async () =&gt; {
							lock = true;
							console.log(\`Acquired lock\`);
							if (!signal.aborted) {
								try {
									const players = Object.create(null);
									const leaderboards = Object.create(null);
									const games = ["9d3rrxyd", "w6jl2ned"];
									for (const gameId of games) {
										const {data} = await importDataScript(\`https://www.speedrun.com/api/v1/games/\${gameId}?embed=categories,levels,variables\`, signal);
										const versions = data.variables.data.find((variable) =&gt; {
											return variable.name === "Version";
										});
										const levels = Object.fromEntries(data.levels.data.map((level) =&gt; {
											return [level.id, level];
										}));
										const categories = Object.fromEntries(data.categories.data.map((category) =&gt; {
											return [category.id, category];
										}));
										const variables = Object.fromEntries(data.variables.data.map((variable) =&gt; {
											return [variable.id, variable];
										}));
										console.log(\`Got game\`);
										await waitForTimeout(800, signal);
										const slice = 200;
										for (let offset = 0;; offset += slice) {
											const {data, pagination} = await importDataScript(\`https://www.speedrun.com/api/v1/runs?game=\${gameId}&amp;orderby=date&amp;direction=asc&amp;embed=players&amp;offset=\${offset}&amp;max=\${slice}\`, signal);
											const {size} = pagination;
											if (size === 0) {
												break;
											}
											for (const run of data) {
												const status = run.status.status;
												if (status == null || status === "new") {
													continue;
												}
												const player = run.players.data[0].rel === "user" ? run.players.data[0].id : "814p2558";
												const playerName = run.players.data[0].rel === "user" ? run.players.data[0].names.international : "anonymous";
												players[player] ??= playerName;
												const level = run.level;
												const category = run.category;
												const values = Object.entries(run.values).filter(([variable]) =&gt; {
													return variables[variable]?.["is-subcategory"] ?? false;
												}).map(([variable, value]) =&gt; {
													return \`-\${variable}.\${value}\`;
												});
												const leaderboard = \`\${level != null ? \`l_\${level}-\` : ""}\${category}\${values.join("")}\`;
												const levelName = run.level != null ? levels[run.level]?.name ?? null : null;
												const categoryName = categories[run.category]?.name ?? null;
												const valueNames = Object.entries(run.values).filter(([variable]) =&gt; {
													return variables[variable]?.["is-subcategory"] ?? false;
												}).map(([variable, value]) =&gt; {
													return variables[variable]?.values.values[value]?.label ?? null;
												}).filter((valueName) =&gt; {
													return valueName != null;
												});
												const leaderboardName = \`\${levelName != null ? \`\${levelName}: \` : ""}\${categoryName ?? ""}\${values.length !== 0 ? \` - \${valueNames.join(", ")}\` : ""}\`;
												leaderboards[leaderboard] ??= leaderboardName;
											}
											console.log(\`Got runs \${offset}-\${offset + size - 1}\`);
											await waitForTimeout(800, signal);
										}
									}
									session = {players, leaderboards};
								} catch {}
								if (!signal.aborted) {
									if (session != null) {
										const {players, leaderboards} = session;
										try {
											const cachedPlayers = JSON.stringify(players);
											const cachedLeaderboards = JSON.stringify(leaderboards);
											sessionStorage.setItem(playersKey, cachedPlayers);
											sessionStorage.setItem(leaderboardsKey, cachedLeaderboards);
										} catch {}
										broadcastChannel.postMessage({
											type: "response",
											session,
										});
										console.log(\`Successfully loaded names from remote\`);
										abort();
										resolve();
									} else {
										broadcastChannel.postMessage({
											type: "response",
											session,
										});
										console.log(\`Unsuccessfully loaded names from remote\`);
										abort();
										resolve();
									}
								}
							}
							await new Promise((resolve) =&gt; {
								window.addEventListener("beforeunload", () =&gt; {
									resolve();
								}, {
									once: true,
								});
							});
						});
						lock = false;
						console.log(\`Released lock\`);
						await new Promise((resolve) =&gt; {
							window.addEventListener("pagehide", () =&gt; {
								resolve();
							}, {
								once: true,
							});
						});
						await new Promise((resolve) =&gt;{
							window.addEventListener("pageshow", () =&gt; {
								resolve();
							}, {
								once: true,
							});
						});
					}
				})();
				await promise;
				if (session == null) {
					const input = document.createElementNS("http://www.w3.org/1999/xhtml", "input");
					input.type = "checkbox";
					input.autocomplete = "off";
					input.disabled = true;
					input.indeterminate = true;
					progress.replaceWith(input);
					span.textContent = "Unavailable names";
					return;
				}
				const {players, leaderboards} = session;
				const hasPlayerRoot = rootTitleContent.includes(" for player");
				const hasLeaderboardRoot = rootTitleContent.includes(" for leaderboard");
				const rootTitle = {
					element: rootTitleElement,
					contentWithIds: rootTitleContent,
					contentWithNames: hasPlayerRoot ? rootTitleContent.replace(/ for player ([0-9_a-z]+)/, ($0, $1) =&gt; {
						return \` for player \${players[$1] ?? $1}\`;
					}) : hasLeaderboardRoot ? rootTitleContent.replace(/ for leaderboard ((?:l_[0-9_a-z]+-)?[0-9_a-z]+(-[0-9_a-z]+\\.[0-9_a-z]+)*)/, ($0, $1) =&gt; {
						return \` for leaderboard \${leaderboards[$1] ?? $1}\`;
					}) : rootTitleContent,
				};
				const hasPlayerPaths = rootTitleContent.includes(" by player");
				const hasLeaderboardPaths = rootTitleContent.includes(" by leaderboard");
				const pathTitles = pathTitleElements.map((pathTitleElement, k) =&gt; {
					const pathTitleContent = pathTitleContents[k];
					const pathTitle = {
						element: pathTitleElement,
						contentWithIds: pathTitleContent,
						contentWithNames: hasPlayerPaths ? players[pathTitleContent] ?? pathTitleContent : hasLeaderboardPaths ? leaderboards[pathTitleContent] ?? pathTitleContent : pathTitleContent,
					};
					return pathTitle;
				});
				const input = document.createElementNS("http://www.w3.org/1999/xhtml", "input");
				input.type = "checkbox";
				input.autocomplete = "off";
				input.addEventListener("change", () =&gt; {
					input.disabled = true;
					if (input.checked) {
						rootTitle.element.textContent = rootTitle.contentWithNames;
						for (const pathTitle of pathTitles) {
							pathTitle.element.textContent = pathTitle.contentWithNames;
						}
					} else {
						rootTitle.element.textContent = rootTitle.contentWithIds;
						for (const pathTitle of pathTitles) {
							pathTitle.element.textContent = pathTitle.contentWithIds;
						}
					}
					input.disabled = false;
				});
				progress.replaceWith(input);
				span.textContent = "Reveal names";
			}, {
				once: true,
			});
		}
	</script>
	<script>
		"use strict";
		{
			document.addEventListener("DOMContentLoaded", (event) =&gt; {
				const minDateText = document.querySelector("foreignObject &gt; svg:first-of-type &gt; text");
				const maxDateText = document.querySelector("foreignObject &gt; svg:first-of-type + svg &gt; text");
				const startX = Math.round(Date.parse(minDateText.textContent) / 86400000);
				function xToDate(x) {
					const datetime = new Date((startX + x) * 86400000);
					const year = \`\${datetime.getUTCFullYear()}\`.padStart(4, "0");
					const month = \`\${datetime.getUTCMonth() + 1}\`.padStart(2, "0");
					const day = \`\${datetime.getUTCDate()}\`.padStart(2, "0");
					const date = \`\${year}-\${month}-\${day}\`;
					const size = date.length * 10;
					return {date, size};
				}
				function setMinDate(x) {
					const {date, size} = xToDate(Math.floor(x));
					minDateText.textLength.baseVal.value = size;
					minDateText.textContent = date;
				}
				function setMaxDate(x) {
					const {date, size} = xToDate(Math.ceil(x));
					maxDateText.textLength.baseVal.value = size;
					maxDateText.textContent = date;
				}
				const minValueText = document.querySelector("foreignObject &gt; svg:first-of-type + svg + svg &gt; text");
				const maxValueText = document.querySelector("foreignObject &gt; svg:first-of-type + svg + svg + svg &gt; text");
				const timed = minValueText.textContent.includes(":");
				function yToValue(y) {
					if (timed) {
						const minutes = \`\${(y - y % 6000) / 6000}\`.padStart(2, "0");
						const seconds = \`\${(y - y % 100) / 100 % 60}\`.padStart(2, "0");
						const centiseconds = \`\${y % 100}\`.padStart(2, "0");
						const value = \`\${minutes}:\${seconds}.\${centiseconds}\`;
						const size = value.length * 10;
						return {value, size};
					} else {
						const value = \`\${y}\`;
						const size = value.length * 10;
						return {value, size};
					}
				}
				function setMinValue(y) {
					const {value, size} = yToValue(Math.floor(y));
					minValueText.textLength.baseVal.value = size;
					minValueText.textContent = value;
				}
				function setMaxValue(y) {
					const {value, size} = yToValue(Math.ceil(y));
					maxValueText.textLength.baseVal.value = size;
					maxValueText.textContent = value;
				}
				const svg = document.querySelector("foreignObject &gt; svg:first-of-type + svg + svg + svg + svg");
				svg.tabIndex = -1;
				svg.style.setProperty("outline", "0");
				if (CSS.supports("overflow-clip-margin", "8px")) {
					svg.style.setProperty("overflow", "clip");
					svg.style.setProperty("overflow-clip-margin", "8px");
				}
				svg.style.setProperty("touch-action", "none");
				const {x: baseX, y: baseY, width: baseWidth, height: baseHeight} = svg.viewBox.baseVal;
				let pointerCount = 0;
				const pointers = Object.create(null);
				const xPointerIds = [];
				const yPointerIds = [];
				let x = null;
				let y = null;
				let width = null;
				let height = null;
				svg.addEventListener("pointerdown", (event) =&gt; {
					const {pointerId} = event;
					if (pointerId in pointers) {
						return;
					}
					let {x: animX, y: animY, width: animWidth, height: animHeight} = svg.viewBox.baseVal;
					svg.setPointerCapture(pointerId);
					++pointerCount;
					const offsetX = event.offsetX;
					const offsetY = event.offsetY;
					pointers[pointerId] = {
						offsetX,
						offsetY,
					};
					xPointerIds.splice(xPointerIds.findLastIndex((pointerId) =&gt; {
						return pointers[pointerId].offsetX &lt;= offsetX;
					}) + 1, 0, pointerId);
					yPointerIds.splice(yPointerIds.findLastIndex((pointerId) =&gt; {
						return pointers[pointerId].offsetY &lt;= offsetY;
					}) + 1, 0, pointerId);
					const minOffsetX = pointers[xPointerIds[0]].offsetX;
					const minOffsetY = pointers[yPointerIds[0]].offsetY;
					const maxClientWidth = pointers[xPointerIds[pointerCount - 1]].offsetX - minOffsetX;
					const maxClientHeight = pointers[yPointerIds[pointerCount - 1]].offsetY - minOffsetY;
					width = Math.min(maxClientWidth / svg.clientWidth * animWidth, baseWidth);
					height = Math.min(maxClientHeight / svg.clientHeight * animHeight, baseHeight);
					x = Math.max(Math.min(animX + minOffsetX / svg.clientWidth * animWidth, baseX + baseWidth), baseX);
					y = Math.max(Math.min(animY + minOffsetY / svg.clientHeight * animHeight, baseY + baseHeight), baseY);
				});
				svg.addEventListener("pointerup", (event) =&gt; {
					const {pointerId} = event;
					if (!(pointerId in pointers)) {
						return;
					}
					let {x: animX, y: animY, width: animWidth, height: animHeight} = svg.viewBox.baseVal;
					svg.releasePointerCapture(pointerId);
					--pointerCount;
					delete pointers[pointerId];
					xPointerIds.splice(xPointerIds.lastIndexOf(pointerId), 1);
					yPointerIds.splice(yPointerIds.lastIndexOf(pointerId), 1);
					const minOffsetX = pointerCount !== 0 ? pointers[xPointerIds[0]].offsetX : null;
					const minOffsetY = pointerCount !== 0 ? pointers[yPointerIds[0]].offsetY : null;
					const maxClientWidth = pointerCount !== 0 ? pointers[xPointerIds[pointerCount - 1]].offsetX - minOffsetX : null;
					const maxClientHeight = pointerCount !== 0 ? pointers[yPointerIds[pointerCount - 1]].offsetY - minOffsetY : null;
					width = pointerCount !== 0 ? Math.min(maxClientWidth / svg.clientWidth * animWidth, baseWidth) : null;
					height = pointerCount !== 0 ? Math.min(maxClientHeight / svg.clientHeight * animHeight, baseHeight) : null;
					x = pointerCount !== 0 ? Math.max(Math.min(animX + minOffsetX / svg.clientWidth * animWidth, baseX + baseWidth), baseX) : null;
					y = pointerCount !== 0 ? Math.max(Math.min(animY + minOffsetY / svg.clientHeight * animHeight, baseY + baseHeight), baseY) : null;
				});
				svg.addEventListener("pointermove", (event) =&gt; {
					const {pointerId} = event;
					if (!(pointerId in pointers)) {
						return;
					}
					let {x: animX, y: animY, width: animWidth, height: animHeight} = svg.viewBox.baseVal;
					event.preventDefault();
					const offsetX = event.offsetX;
					const offsetY = event.offsetY;
					pointers[pointerId].offsetX = offsetX;
					pointers[pointerId].offsetY = offsetY;
					const oldXIndex = xPointerIds.lastIndexOf(pointerId);
					let newXIndex = oldXIndex;
					while (newXIndex &gt; 0 &amp;&amp; pointers[xPointerIds[newXIndex - 1]].offsetX &gt; offsetX) {
						--newXIndex;
					}
					xPointerIds.copyWithin(newXIndex + 1, newXIndex, oldXIndex);
					xPointerIds[newXIndex] = pointerId;
					while (newXIndex &lt; pointerCount - 1 &amp;&amp; pointers[xPointerIds[newXIndex + 1]].offsetX &lt; offsetX) {
						++newXIndex;
					}
					xPointerIds.copyWithin(oldXIndex, oldXIndex + 1, newXIndex + 1);
					xPointerIds[newXIndex] = pointerId;
					const oldYIndex = yPointerIds.lastIndexOf(pointerId);
					let newYIndex = oldYIndex;
					while (newYIndex &gt; 0 &amp;&amp; pointers[yPointerIds[newYIndex - 1]].offsetY &gt; offsetY) {
						--newYIndex;
					}
					yPointerIds.copyWithin(newYIndex + 1, newYIndex, oldYIndex);
					yPointerIds[newYIndex] = pointerId;
					while (newYIndex &lt; pointerCount - 1 &amp;&amp; pointers[yPointerIds[newYIndex + 1]].offsetY &lt; offsetY) {
						++newYIndex;
					}
					yPointerIds.copyWithin(oldYIndex, oldYIndex + 1, newYIndex + 1);
					yPointerIds[newYIndex] = pointerId;
					const minOffsetX = pointers[xPointerIds[0]].offsetX;
					const minOffsetY = pointers[yPointerIds[0]].offsetY;
					const maxClientWidth = pointers[xPointerIds[pointerCount - 1]].offsetX - minOffsetX;
					const maxClientHeight = pointers[yPointerIds[pointerCount - 1]].offsetY - minOffsetY;
					animWidth = width === 0 ? animWidth : maxClientWidth === 0 ? baseWidth : Math.min(svg.clientWidth / maxClientWidth * width, baseWidth);
					animHeight = height === 0 ? animHeight : maxClientHeight === 0 ? baseHeight : Math.min(svg.clientHeight / maxClientHeight * height, baseHeight);
					animX = Math.max(Math.min(x - minOffsetX / svg.clientWidth * animWidth, baseX + baseWidth - animWidth), baseX);
					animY = Math.max(Math.min(y - minOffsetY / svg.clientHeight * animHeight, baseY + baseHeight - animHeight), baseY);
					svg.viewBox.baseVal.x = animX;
					svg.viewBox.baseVal.y = animY;
					svg.viewBox.baseVal.width = animWidth;
					svg.viewBox.baseVal.height = animHeight;
					setMinDate(animX);
					setMaxDate(animX + animWidth);
					setMinValue(baseY * 2 + baseHeight - animHeight - animY);
					setMaxValue(baseY * 2 + baseHeight - animY);
				});
				const zoomIntensity = 1.25;
				svg.addEventListener("wheel", (event) =&gt; {
					let {x: animX, y: animY, width: animWidth, height: animHeight} = svg.viewBox.baseVal;
					const {ctrlKey, shiftKey} = event;
					event.preventDefault();
					if (pointerCount !== 0) {
						return;
					}
					if (!ctrlKey) {
						const vectorX = (shiftKey ? event.deltaY : event.deltaX) / svg.clientWidth * animWidth;
						const vectorY = (shiftKey ? 0 : event.deltaY) / svg.clientHeight * animHeight;
						animX = Math.max(Math.min(animX + vectorX, baseX + baseWidth - animWidth), baseX);
						animY = Math.max(Math.min(animY + vectorY, baseY + baseHeight - animHeight), baseY);
						svg.viewBox.baseVal.x = animX;
						svg.viewBox.baseVal.y = animY;
						setMinDate(animX);
						setMaxDate(animX + animWidth);
						setMinValue(baseY * 2 + baseHeight - animHeight - animY);
						setMaxValue(baseY * 2 + baseHeight - animY);
						return;
					}
					const ratioX = zoomIntensity ** Math.sign(shiftKey ? event.deltaY : event.deltaX);
					const ratioY = zoomIntensity ** Math.sign(shiftKey ? 0 : event.deltaY);
					const positionX = Math.max(0, Math.min(event.offsetX / svg.clientWidth, 1)) * animWidth;
					const positionY = Math.max(0, Math.min(event.offsetY / svg.clientHeight, 1)) * animHeight;
					animWidth = Math.min(animWidth * ratioX, baseWidth);
					animHeight = Math.min(animHeight * ratioY, baseHeight);
					animX = Math.max(Math.min(animX + positionX * (1 - ratioX), baseX + baseWidth - animWidth), baseX);
					animY = Math.max(Math.min(animY + positionY * (1 - ratioY), baseY + baseHeight - animHeight), baseY);
					svg.viewBox.baseVal.x = animX;
					svg.viewBox.baseVal.y = animY;
					svg.viewBox.baseVal.width = animWidth;
					svg.viewBox.baseVal.height = animHeight;
					setMinDate(animX);
					setMaxDate(animX + animWidth);
					setMinValue(baseY * 2 + baseHeight - animHeight - animY);
					setMaxValue(baseY * 2 + baseHeight - animY);
				}, {
					passive: false,
				});
				svg.addEventListener("keydown", (event) =&gt; {
					let {x: animX, y: animY, width: animWidth, height: animHeight} = svg.viewBox.baseVal;
					const {ctrlKey, shiftKey} = event;
					switch (event.code) {
						case "Space": {
							event.preventDefault();
							if (pointerCount !== 0) {
								return;
							}
							const vectorY = shiftKey ? -animHeight : animHeight;
							animY = Math.max(Math.min(animY + vectorY, baseY + baseHeight - animHeight), baseY);
							svg.viewBox.baseVal.y = animY;
							setMinValue(baseY * 2 + baseHeight - animHeight - animY);
							setMaxValue(baseY * 2 + baseHeight - animY);
							return;
						}
						case "Equal":
						case "NumpadAdd":
						case "Minus":
						case "NumpadSubtract": {
							event.preventDefault();
							if (pointerCount !== 0) {
								return;
							}
							const ratio = event.code === "Minus" || event.code === "NumpadSubtract" ? zoomIntensity : 1 / zoomIntensity;
							if (!shiftKey) {
								animHeight = Math.min(animHeight * ratio, baseHeight);
								animY = Math.max(Math.min(animY, baseY + baseHeight - animHeight), baseY);
								svg.viewBox.baseVal.y = animY;
								svg.viewBox.baseVal.height = animHeight;
								setMinValue(baseY * 2 + baseHeight - animHeight - animY);
								setMaxValue(baseY * 2 + baseHeight - animY);
								return;
							}
							animWidth = Math.min(animWidth * ratio, baseWidth);
							animX = Math.max(Math.min(animX, baseX + baseWidth - animWidth), baseX);
							svg.viewBox.baseVal.x = animX;
							svg.viewBox.baseVal.width = animWidth;
							setMinDate(animX);
							setMaxDate(animX + animWidth);
							return;
						}
						case "Digit0":
						case "Numpad0": {
							event.preventDefault();
							if (pointerCount !== 0) {
								return;
							}
							if (!shiftKey) {
								animY = baseY;
								animHeight = baseHeight;
								svg.viewBox.baseVal.y = animY;
								svg.viewBox.baseVal.height = animHeight;
								setMinValue(baseY * 2 + baseHeight - animHeight - animY);
								setMaxValue(baseY * 2 + baseHeight - animY);
								return;
							}
							animX = baseX;
							animWidth = baseWidth;
							svg.viewBox.baseVal.x = animX;
							svg.viewBox.baseVal.width = animWidth;
							setMinDate(animX);
							setMaxDate(animX + animWidth);
							return;
						}
					}
					switch (event.key) {
						case "ArrowRight": {
							event.preventDefault();
							if (pointerCount !== 0) {
								return;
							}
							const vectorX = 50 / svg.clientWidth * animWidth;
							animX = Math.max(Math.min(animX + vectorX, baseX + baseWidth - animWidth), baseX);
							svg.viewBox.baseVal.x = animX;
							setMinDate(animX);
							setMaxDate(animX + animWidth);
							return;
						}
						case "ArrowLeft": {
							event.preventDefault();
							if (pointerCount !== 0) {
								return;
							}
							const vectorX = -50 / svg.clientWidth * animWidth;
							animX = Math.max(Math.min(animX + vectorX, baseX + baseWidth - animWidth), baseX);
							svg.viewBox.baseVal.x = animX;
							setMinDate(animX);
							setMaxDate(animX + animWidth);
							return;
						}
						case "ArrowDown": {
							if (!ctrlKey) {
								event.preventDefault();
								if (pointerCount !== 0) {
									return;
								}
								const vectorY = 50 / svg.clientHeight * animHeight;
								animY = Math.max(Math.min(animY + vectorY, baseY + baseHeight - animHeight), baseY);
								svg.viewBox.baseVal.y = animY;
								setMinValue(baseY * 2 + baseHeight - animHeight - animY);
								setMaxValue(baseY * 2 + baseHeight - animY);
								return;
							}
						}
						case "End": {
							event.preventDefault();
							if (pointerCount !== 0) {
								return;
							}
							animY = baseY + baseHeight - animHeight;
							svg.viewBox.baseVal.y = animY;
							setMinValue(baseY * 2 + baseHeight - animHeight - animY);
							setMaxValue(baseY * 2 + baseHeight - animY);
							return;
						}
						case "ArrowUp": {
							if (!ctrlKey) {
								event.preventDefault();
								if (pointerCount !== 0) {
									return;
								}
								const vectorY = -50 / svg.clientHeight * animHeight;
								animY = Math.max(Math.min(animY + vectorY, baseY + baseHeight - animHeight), baseY);
								svg.viewBox.baseVal.y = animY;
								setMinValue(baseY * 2 + baseHeight - animHeight - animY);
								setMaxValue(baseY * 2 + baseHeight - animY);
								return;
							}
						}
						case "Home": {
							event.preventDefault();
							if (pointerCount !== 0) {
								return;
							}
							animY = baseY;
							svg.viewBox.baseVal.y = animY;
							setMinValue(baseY * 2 + baseHeight - animHeight - animY);
							setMaxValue(baseY * 2 + baseHeight - animY);
							return;
						}
						case "PageDown":
						case "PageUp":
						case " ": {
							event.preventDefault();
							if (pointerCount !== 0) {
								return;
							}
							const vectorY = event.key === "PageUp" || event.key === " " &amp;&amp; shiftKey ? -animHeight : animHeight;
							animY = Math.max(Math.min(animY + vectorY, baseY + baseHeight - animHeight), baseY);
							svg.viewBox.baseVal.y = animY;
							setMinValue(baseY * 2 + baseHeight - animHeight - animY);
							setMaxValue(baseY * 2 + baseHeight - animY);
							return;
						}
						case "+":
						case "-": {
							event.preventDefault();
							if (pointerCount !== 0) {
								return;
							}
							const ratio = event.key === "-" ? 1 / zoomIntensity : zoomIntensity;
							animWidth = Math.min(animWidth * ratio, baseWidth);
							animHeight = Math.min(animHeight * ratio, baseHeight);
							animX = Math.max(Math.min(animX, baseX + baseWidth - animWidth), baseX);
							animY = Math.max(Math.min(animY, baseY + baseHeight - animHeight), baseY);
							svg.viewBox.baseVal.x = animX;
							svg.viewBox.baseVal.y = animY;
							svg.viewBox.baseVal.width = animWidth;
							svg.viewBox.baseVal.height = animHeight;
							setMinDate(animX);
							setMaxDate(animX + animWidth);
							setMinValue(baseY * 2 + baseHeight - animHeight - animY);
							setMaxValue(baseY * 2 + baseHeight - animY);
							return;
						}
						case "0": {
							event.preventDefault();
							if (pointerCount !== 0) {
								return;
							}
							animX = baseX;
							animY = baseY;
							animWidth = baseWidth;
							animHeight = baseHeight;
							svg.viewBox.baseVal.x = animX;
							svg.viewBox.baseVal.y = animY;
							svg.viewBox.baseVal.width = animWidth;
							svg.viewBox.baseVal.height = animHeight;
							setMinDate(animX);
							setMaxDate(animX + animWidth);
							setMinValue(baseY * 2 + baseHeight - animHeight - animY);
							setMaxValue(baseY * 2 + baseHeight - animY);
							return;
						}
					}
				});
				svg.addEventListener("focusin", (event) =&gt; {
					if (!event.target.matches(":focus-visible")) {
						return;
					}
					event.preventDefault();
					if (pointerCount !== 0) {
						return;
					}
					let {x: animX, y: animY, width: animWidth, height: animHeight} = svg.viewBox.baseVal;
					let {x, y, width, height} = event.target.getBBox();
					width = Math.round(width);
					height = Math.round(height);
					x = Math.round(x);
					y = baseY * 2 + baseHeight - height - Math.round(y);
					if (x + width &lt; animX) {
						animX = x;
						if (width &gt; animWidth) {
							animX += (width - animWidth) / 2;
						}
					} else if (x &gt; animX + animWidth) {
						animX = x + width - animWidth;
						if (width &gt; animWidth) {
							animX -= (width - animWidth) / 2;
						}
					}
					if (y + height &lt; animY) {
						animY = y;
						if (height &gt; animHeight) {
							animY += (height - animHeight) / 2;
						}
					} else if (y &gt; animY + animHeight) {
						animY = y + height - animHeight;
						if (height &gt; animHeight) {
							animY -= (height - animHeight) / 2;
						}
					}
					svg.viewBox.baseVal.x = animX;
					svg.viewBox.baseVal.y = animY;
					setMinDate(animX);
					setMaxDate(animX + animWidth);
					setMinValue(baseY * 2 + baseHeight - animHeight - animY);
					setMaxValue(baseY * 2 + baseHeight - animY);
				});
			}, {
				once: true,
			});
		}
	</script>
</svg>
`, "image/svg+xml");
	const root = document.documentElement;
	const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
	const dateSize = Math.max(minDate.length, maxDate.length) * 10;
	const valueSize = (timed ? Math.max(8, 7 + `${(maxValue - maxValue % 60000) / 60000}`.length) : Math.max(1, `${maxValue}`.length)) * 10;
	foreignObject.setAttribute("x", "0");
	foreignObject.setAttribute("y", "0");
	foreignObject.setAttribute("width", "100%");
	foreignObject.setAttribute("height", "100%");
	foreignObject.setAttribute("style", `--date-size: ${dateSize}; --value-size: ${valueSize};`);
	for (const date of [minDate, maxDate]) {
		const size = date.length * 10;
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", `0 0 ${dateSize} 20`);
		const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
		text.setAttribute("x", `${dateSize / 2}`);
		text.setAttribute("y", "10");
		text.setAttribute("dx", "0");
		text.setAttribute("dy", "2");
		text.setAttribute("textLength", `${size}`);
		text.setAttribute("lengthAdjust", "spacingAndGlyphs");
		text.setAttribute("text-anchor", "middle");
		text.setAttribute("dominant-baseline", "middle");
		text.textContent = date;
		svg.append(text);
		foreignObject.append(svg);
	}
	for (const value of [0, maxValue]) {
		const size = (timed ? 7 + `${(value - value % 60000) / 60000}`.length : `${value}`.length) * 10;
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", `0 0 ${valueSize} 20`);
		const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
		text.setAttribute("x", `${valueSize / 2}`);
		text.setAttribute("y", "10");
		text.setAttribute("dx", "0");
		text.setAttribute("dy", "2");
		text.setAttribute("textLength", `${size}`);
		text.setAttribute("lengthAdjust", "spacingAndGlyphs");
		text.setAttribute("text-anchor", "middle");
		text.setAttribute("dominant-baseline", "middle");
		if (timed) {
			const minutes = `${(value - value % 6000) / 6000}`.padStart(2, "0");
			const seconds = `${(value - value % 100) / 100 % 60}`.padStart(2, "0");
			const centiseconds = `${value % 100}`.padStart(2, "0");
			const time = `${minutes}:${seconds}.${centiseconds}`;
			text.textContent = time;
		} else {
			text.textContent = `${value}`;
		}
		svg.append(text);
		foreignObject.append(svg);
	}
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("viewBox", `0 0 ${maxDuration} ${maxValue}`);
	svg.setAttribute("preserveAspectRatio", "none");
	svg.setAttribute("overflow", "visible");
	const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
	const gCount = Object.keys(sortedData).length;
	g.setAttribute("transform", `translate(0 ${maxValue}) scale(1 -1)`);
	g.setAttribute("style", `--count: ${gCount};`);
	if (timed) {
		if (goals != null) {
			const subG = document.createElementNS("http://www.w3.org/2000/svg", "g");
			let currentGoal = 0;
			for (const [tier, goal] of Object.entries(goals)) {
				const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
				rect.setAttribute("x", "0");
				rect.setAttribute("y", `${currentGoal}`);
				rect.setAttribute("width", `${maxDuration}`);
				rect.setAttribute("height", `${Math.min(goal, maxValue) - currentGoal}`);
				rect.setAttribute("tabindex", "0");
				rect.setAttribute("data-tier", tier);
				const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
				const minutes = `${(goal - goal % 6000) / 6000}`.padStart(2, "0");
				const seconds = `${(goal - goal % 100) / 100 % 60}`.padStart(2, "0");
				const centiseconds = `${goal % 100}`.padStart(2, "0");
				const time = `${minutes}:${seconds}.${centiseconds}`;
				title.textContent = `${time} for ${tier}`;
				rect.append(title);
				subG.append(rect);
				currentGoal = Math.min(goal, maxValue);
			}
			g.append(subG);
		}
	} else {
		const subG = document.createElementNS("http://www.w3.org/2000/svg", "g");
		const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		rect.setAttribute("x", "0");
		rect.setAttribute("y", "0");
		rect.setAttribute("width", `${maxDuration}`);
		rect.setAttribute("height", `${maxValue}`);
		subG.append(rect);
		g.append(subG);
	}
	let gIndex = 0;
	for (const [datum, datumDates] of Object.entries(sortedData)) {
		const subG = document.createElementNS("http://www.w3.org/2000/svg", "g");
		subG.setAttribute("style", `--index: ${gIndex};`);
		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		const d = [];
		let currentValue = null;
		if (extended) {
			currentValue = "" in datumDates ? datumDates[""] : 0;
			d.push(`M0,${currentValue}`);
		}
		const subPaths = [];
		for (const [date, dateValue] of Object.entries(datumDates)) {
			if (date === "") {
				continue;
			}
			const duration = Math.round((Date.parse(date) - Date.parse(minDate)) / 86400000);
			if (currentValue != null) {
				d.push(`L${duration},${currentValue}`);
				currentValue = dateValue;
				d.push(`L${duration},${currentValue}`);
			} else {
				currentValue = dateValue;
				d.push(`M${duration},${currentValue}`);
			}
			if (timed) {
				const subPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
				subPath.setAttribute("d", `M${duration},${currentValue}L${duration},${currentValue}`);
				subPath.setAttribute("tabindex", "0");
				const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
				const minutes = `${(currentValue - currentValue % 6000) / 6000}`.padStart(2, "0");
				const seconds = `${(currentValue - currentValue % 100) / 100 % 60}`.padStart(2, "0");
				const centiseconds = `${currentValue % 100}`.padStart(2, "0");
				const time = `${minutes}:${seconds}.${centiseconds}`;
				title.textContent = `${time} on ${date}`;
				subPath.append(title);
				subPaths.push(subPath);
				const horizontalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
				horizontalLine.setAttribute("x1", "0");
				horizontalLine.setAttribute("y1", `${currentValue}`);
				horizontalLine.setAttribute("x2", `${maxDuration}`);
				horizontalLine.setAttribute("y2", `${currentValue}`);
				subPaths.push(horizontalLine);
				const verticalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
				verticalLine.setAttribute("x1", `${duration}`);
				verticalLine.setAttribute("y1", "0");
				verticalLine.setAttribute("x2", `${duration}`);
				verticalLine.setAttribute("y2", `${maxValue}`);
				subPaths.push(verticalLine);
			}
		}
		if (extended) {
			d.push(`L${maxDuration},${currentValue}`);
		}
		path.setAttribute("d", d.join(""));
		path.setAttribute("tabindex", "0");
		const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
		title.textContent = datum;
		path.append(title);
		subG.append(path);
		if (timed) {
			const datumDatesEntries = Object.entries(datumDates);
			const [firstDate, firstValue] = datumDatesEntries[0];
			const firstDuration = Math.round((Date.parse(firstDate) - Date.parse(minDate)) / 86400000);
			const [lastDate, lastValue] = datumDatesEntries[datumDatesEntries.length - 1];
			const lastDuration = Math.round((Date.parse(lastDate) - Date.parse(minDate)) / 86400000);
			const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			rect.setAttribute("x", `${Math.min(firstDuration, lastDuration)}`);
			rect.setAttribute("y", `${Math.min(firstValue, lastValue)}`);
			rect.setAttribute("width", `${Math.abs(lastDuration - firstDuration)}`);
			rect.setAttribute("height", `${Math.abs(lastValue - firstValue)}`);
			subG.append(rect);
		}
		for (const subPath of subPaths) {
			subG.append(subPath);
		}
		g.append(subG);
		++gIndex;
	}
	svg.append(g);
	foreignObject.append(svg);
	root.append(foreignObject);
	indent(foreignObject, 1, true);
	const formattedData = root.toString();
	return formattedData;
}
function plotSubmissionAndRunCounts(scope, title, data) {
	const newData = Object.create(null);
	for (const datumDates of Object.values(data)) {
		for (const [date, dateRuns] of Object.entries(datumDates)) {
			for (const run of dateRuns) {
				const submissionsDates = newData.submissions ??= Object.create(null);
				submissionsDates[date] ??= 0;
				++submissionsDates[date];
				if (run.status !== "rejected" || run.annotation == null || run.annotation !== "Automatically moved to the new individual level" && run.annotation !== "Automatically moved to the new category extensions") {
					const manualSubmissionsDates = newData.manualSubmissions ??= Object.create(null);
					manualSubmissionsDates[date] ??= 0;
					++manualSubmissionsDates[date];
				}
				if (run.status !== "verified") {
					continue;
				}
				const runsDates = newData.runs ??= Object.create(null);
				runsDates[date] ??= 0;
				++runsDates[date];
			}
		}
	}
	const formattedData = plot(scope, title, newData, true, true, false, null);
	return formattedData;
}
function plotRunCountByDatum(scope, title, data) {
	const newData = Object.create(null);
	for (const [datum, datumDates] of Object.entries(data)) {
		for (const [date, dateRuns] of Object.entries(datumDates)) {
			for (const run of dateRuns) {
				if (run.status !== "verified") {
					continue;
				}
				const newDatumDates = newData[datum] ??= Object.create(null);
				newDatumDates[date] ??= 0;
				++newDatumDates[date];
			}
		}
	}
	const formattedData = plot(scope, title, newData, true, true, false, null);
	return formattedData;
}
function plotKeyCountByDatum(scope, title, data, key) {
	const newData = Object.create(null);
	for (const [datum, datumDates] of Object.entries(data)) {
		const values = new Set();
		let currentSize = 0;
		for (const [date, dateRuns] of Object.entries(datumDates)) {
			for (const run of dateRuns) {
				if (run.status !== "verified") {
					continue;
				}
				values.add(run[key]);
				const newDatumDates = newData[datum] ??= Object.create(null);
				newDatumDates[date] ??= 0;
				newDatumDates[date] += values.size - currentSize;
				currentSize = values.size;
			}
		}
	}
	const formattedData = plot(scope, title, newData, true, true, false, null);
	return formattedData;
}
function plotTimeByDatumKey(scope, title, datumDates, key, times) {
	const keyData = Object.create(null);
	for (const [date, dateRuns] of Object.entries(datumDates)) {
		for (const run of dateRuns) {
			if (run.status !== "verified") {
				continue;
			}
			const time = run.time;
			const [minutes, seconds, centiseconds] = time.split(/:|\./).map((part) => {
				return Number(part);
			});
			const currentTime = minutes * 6000 + seconds * 100 + centiseconds;
			const minTime = run[key] in keyData ? keyData[run[key]][Object.keys(keyData[run[key]])[Object.keys(keyData[run[key]]).length - 1]] : null;
			if (minTime == null || currentTime < minTime) {
				const datumDates = keyData[run[key]] ??= Object.create(null);
				datumDates[date] ??= Number.POSITIVE_INFINITY;
				datumDates[date] = Math.min(datumDates[date], currentTime);
			}
		}
	}
	if (Object.keys(keyData).length === 0) {
		return null;
	}
	const goals = times != null ? Object.fromEntries(Object.entries(times).map(([tier, time]) => {
		const [minutes, seconds, centiseconds] = time.split(/:|\./).map((part) => {
			return Number(part);
		});
		const goal = minutes * 6000 + seconds * 100 + centiseconds;
		return [tier, goal];
	})) : null;
	const formattedData = plot(scope, title, keyData, false, false, true, goals);
	return formattedData;
}
function computeRankByLeaderboardByPlayerAndRankByPlayerByLeaderboard(players, leaderboards) {
	const newPlayers = Object.create(null);
	const newLeaderboards = Object.create(null);
	for (const [leaderboard, leaderboardDates] of Object.entries(leaderboards)) {
		const players = Object.create(null);
		const times = Object.create(null);
		const ranks = [];
		for (const [date, dateRuns] of Object.entries(leaderboardDates)) {
			for (const run of dateRuns) {
				if (run.status !== "verified") {
					continue;
				}
				const time = run.time;
				const player = run.player;
				let lowerTime = player in players ? times[player] : null;
				if (lowerTime == null || time.length < lowerTime.length || time < lowerTime) {
					lowerTime = time;
					times[player] = lowerTime;
					const rank = player in players ? players[player][Object.keys(players[player])[Object.keys(players[player]).length - 1]] : ranks.push(null) - 1;
					let currentRank = rank;
					let lowerPlayer = currentRank >= 1 ? ranks[currentRank - 1] : null;
					lowerTime = lowerPlayer != null ? times[lowerPlayer] : null;
					while (lowerTime != null && (time.length < lowerTime.length || time < lowerTime)) {
						const playerDates = players[lowerPlayer];
						playerDates[date] = currentRank;
						ranks[currentRank] = lowerPlayer;
						--currentRank;
						lowerPlayer = currentRank >= 1 ? ranks[currentRank - 1] : null;
						lowerTime = lowerPlayer != null ? times[lowerPlayer] : null;
					}
					lowerPlayer = player;
					const playerDates = players[lowerPlayer] ??= Object.assign(Object.create(null), {
						"": rank,
					});
					playerDates[date] = currentRank;
					ranks[currentRank] = lowerPlayer;
				}
			}
		}
		newLeaderboards[leaderboard] = players;
	}
	for (const [player, playerDates] of Object.entries(players)) {
		const leaderboards = Object.create(null);
		for (const dateRuns of Object.values(playerDates)) {
			for (const run of dateRuns) {
				if (run.status !== "verified") {
					continue;
				}
				const leaderboard = run.leaderboard;
				leaderboards[leaderboard] ??= newLeaderboards[leaderboard][player];
			}
		}
		newPlayers[player] = leaderboards;
	}
	return [newPlayers, newLeaderboards];
}
function plotRankByDatum(scope, title, data) {
	if (Object.keys(data).length === 0) {
		return null;
	}
	const formattedData = plot(scope, title, data, false, true, false, null);
	return formattedData;
}
function plotRecordCountByPlayer(scope, title, leaderboards, tiers) {
	const players = Object.create(null);
	for (const [leaderboard, leaderboardDates] of Object.entries(leaderboards)) {
		if (tiers != null && !(leaderboard in tiers)) {
			continue;
		}
		let minTime = null;
		let minPlayer = null;
		for (const [date, dateRuns] of Object.entries(leaderboardDates)) {
			for (const run of dateRuns) {
				if (run.status !== "verified") {
					continue;
				}
				const time = run.time;
				const player = run.player;
				if (minTime == null || time.length < minTime.length || time < minTime) {
					if (minPlayer != null) {
						const playerDates = players[minPlayer] ??= Object.create(null);
						playerDates[date] ??= 0;
						--playerDates[date];
					}
					minTime = time;
					minPlayer = player;
					const playerDates = players[minPlayer] ??= Object.create(null);
					playerDates[date] ??= 0;
					++playerDates[date];
				}
			}
		}
	}
	const formattedPlayers = plot(scope, title, players, true, true, false, null);
	return formattedPlayers;
}
function plotRecordTimeByLeaderboard(scope, title, leaderboards, tiers) {
	const newLeaderboards = Object.create(null);
	for (const [leaderboard, leaderboardDates] of Object.entries(leaderboards)) {
		if (tiers != null && !(leaderboard in tiers)) {
			continue;
		}
		let minTime = null;
		for (const [date, dateRuns] of Object.entries(leaderboardDates)) {
			for (const run of dateRuns) {
				if (run.status !== "verified") {
					continue;
				}
				const time = run.time;
				const [minutes, seconds, centiseconds] = time.split(/:|\./).map((part) => {
					return Number(part);
				});
				const currentTime = minutes * 6000 + seconds * 100 + centiseconds;
				if (minTime == null || currentTime < minTime) {
					const newLeaderboardDates = newLeaderboards[leaderboard] ??= Object.create(null);
					newLeaderboardDates[date] ??= Number.POSITIVE_INFINITY;
					newLeaderboardDates[date] = Math.min(newLeaderboardDates[date], currentTime);
					minTime = currentTime;
				}
			}
		}
	}
	const formattedLeaderboards = plot(scope, title, newLeaderboards, false, false, true, null);
	return formattedLeaderboards;
}
function plotTotalTimeByPlayer(scope, title, players, tiers) {
	const tierCount = Object.keys(tiers).length;
	const newPlayers = Object.create(null);
	for (const [player, playerDates] of Object.entries(players)) {
		let leaderboardCount = 0;
		let playerTime = 0;
		const leaderboards = Object.create(null);
		for (const [date, dateRuns] of Object.entries(playerDates)) {
			for (const run of dateRuns) {
				if (run.status !== "verified" || !(run.leaderboard in tiers)) {
					continue;
				}
				const time = run.time;
				const leaderboard = run.leaderboard;
				const [minutes, seconds, centiseconds] = time.split(/:|\./).map((part) => {
					return Number(part);
				});
				const currentTime = minutes * 6000 + seconds * 100 + centiseconds;
				const minTime = leaderboard in leaderboards ? leaderboards[leaderboard] : null;
				if (minTime == null || currentTime < minTime) {
					if (minTime == null) {
						++leaderboardCount;
					} else {
						playerTime -= minTime;
					}
					playerTime += currentTime;
					leaderboards[leaderboard] = currentTime;
					if (leaderboardCount === tierCount) {
						const newPlayerDates = newPlayers[player] ??= Object.create(null);
						newPlayerDates[date] = playerTime;
					}
				}
			}
		}
	}
	const goals = Object.create(null);
	for (const times of Object.values(tiers)) {
		for (const [tier, time] of Object.entries(times)) {
			const [minutes, seconds, centiseconds] = time.split(/:|\./).map((part) => {
				return Number(part);
			});
			const goal = minutes * 6000 + seconds * 100 + centiseconds;
			goals[tier] ??= 0;
			goals[tier] += goal;
		}
	}
	const formattedData = plot(scope, title, newPlayers, false, false, true, goals);
	return formattedData;
}
function plotTotalRankByPlayer(scope, title, players, tiers) {
	const tierCount = Object.keys(tiers).length;
	const newPlayers = Object.create(null);
	for (const [player, playerLeaderboards] of Object.entries(players)) {
		let leaderboardCount = 0;
		const playerDates = Object.create(null);
		for (const [playerLeaderboard, playerLeaderboardDates] of Object.entries(playerLeaderboards)) {
			if (!(playerLeaderboard in tiers)) {
				continue;
			}
			++leaderboardCount;
			for (const [date, dateRank] of Object.entries(playerLeaderboardDates)) {
				playerDates[date] ??= [];
				playerDates[date].push(Object.assign(Object.create(null), {
					rank: dateRank,
					leaderboard: playerLeaderboard,
				}));
			}
		}
		if (leaderboardCount !== tierCount) {
			continue;
		}
		const sortedPlayerDates = Object.fromEntries(sortDatumDates(Object.entries(playerDates)));
		let playerRank = 0;
		const leaderboards = Object.create(null);
		for (const [date, dateRuns] of Object.entries(sortedPlayerDates)) {
			for (const run of dateRuns) {
				const rank = run.rank;
				const leaderboard = run.leaderboard;
				const currentRank = rank;
				const previousRank = leaderboard in leaderboards ? leaderboards[leaderboard] : null;
				if (previousRank != null) {
					playerRank -= previousRank;
				}
				playerRank += currentRank;
				leaderboards[leaderboard] = currentRank;
				const newPlayerDates = newPlayers[player] ??= Object.create(null);
				newPlayerDates[date] = playerRank;
			}
		}
	}
	const formattedPlayers = plot(scope, title, newPlayers, false, true, false, null);
	return formattedPlayers;
}
const formattedSubmissionAndRunCounts = plotSubmissionAndRunCounts("../", "Submission and run counts", players);
const formattedRunCountByPlayer = plotRunCountByDatum("../", "Run count by player", players);
const formattedRunCountByLeaderboard = plotRunCountByDatum("../", "Run count by leaderboard", leaderboards);
const formattedLeaderboardCountByPlayer = plotKeyCountByDatum("../", "Leaderboard count by player", players, "leaderboard");
const formattedPlayerCountByLeaderboard = plotKeyCountByDatum("../", "Player count by leaderboard", leaderboards, "player");
const [rankByLeaderboardByPlayer, rankByPlayerByLeaderboard] = computeRankByLeaderboardByPlayerAndRankByPlayerByLeaderboard(players, leaderboards);
const formattedTimeByLeaderboardByPlayer = Object.create(null);
for (const [player, playerDates] of Object.entries(players)) {
	const formattedTimeByLeaderboard = plotTimeByDatumKey("../../", `Time by leaderboard for player ${player}`, playerDates, "leaderboard", null);
	if (formattedTimeByLeaderboard == null) {
		continue;
	}
	formattedTimeByLeaderboardByPlayer[player] = formattedTimeByLeaderboard;
}
const formattedRankByLeaderboardByPlayer = Object.create(null);
for (const [player, playerLeaderboards] of Object.entries(rankByLeaderboardByPlayer)) {
	const formattedRankByLeaderboard = plotRankByDatum("../../", `Rank by leaderboard for player ${player}`, playerLeaderboards);
	if (formattedRankByLeaderboard == null) {
		continue;
	}
	formattedRankByLeaderboardByPlayer[player] = formattedRankByLeaderboard;
}
const formattedTimeByPlayerByLeaderboard = Object.create(null);
for (const [leaderboard, leaderboardDates] of Object.entries(leaderboards)) {
	const formattedTimeByPlayer = plotTimeByDatumKey("../../", `Time by player for leaderboard ${leaderboard}`, leaderboardDates, "player", bears[leaderboard] ?? missions[leaderboard] ?? races[leaderboard] ?? sublevels[leaderboard]);
	if (formattedTimeByPlayer == null) {
		continue;
	}
	formattedTimeByPlayerByLeaderboard[leaderboard] = formattedTimeByPlayer;
}
const formattedRankByPlayerByLeaderboard = Object.create(null);
for (const [leaderboard, leaderboardPlayers] of Object.entries(rankByPlayerByLeaderboard)) {
	const formattedRankByPlayer = plotRankByDatum("../../", `Rank by player for leaderboard ${leaderboard}`, leaderboardPlayers);
	if (formattedRankByPlayer == null) {
		continue;
	}
	formattedRankByPlayerByLeaderboard[leaderboard] = formattedRankByPlayer;
}
const formattedRecordCountByPlayer = plotRecordCountByPlayer("../", "Record count by player", leaderboards, null);
const formattedRecordCountByPlayerForBears = plotRecordCountByPlayer("../", "Record count by player (bears)", leaderboards, bears);
const formattedRecordCountByPlayerForMissions = plotRecordCountByPlayer("../", "Record count by player (missions)", leaderboards, missions);
const formattedRecordCountByPlayerForRaces = plotRecordCountByPlayer("../", "Record count by player (races)", leaderboards, races);
const formattedRecordCountByPlayerForSublevels = plotRecordCountByPlayer("../", "Record count by player (sublevels)", leaderboards, sublevels);
const formattedRecordTimeByLeaderboard = plotRecordTimeByLeaderboard("../", "Record time by leaderboard", leaderboards, null);
const formattedRecordTimeByLeaderboardForBears = plotRecordTimeByLeaderboard("../", "Record time by leaderboard (bears)", leaderboards, bears);
const formattedRecordTimeByLeaderboardForMissions = plotRecordTimeByLeaderboard("../", "Record time by leaderboard (missions)", leaderboards, missions);
const formattedRecordTimeByLeaderboardForRaces = plotRecordTimeByLeaderboard("../", "Record time by leaderboard (races)", leaderboards, races);
const formattedRecordTimeByLeaderboardForSublevels = plotRecordTimeByLeaderboard("../", "Record time by leaderboard (sublevels)", leaderboards, sublevels);
const formattedTotalTimeByPlayerForBears = plotTotalTimeByPlayer("../", "Total time by player (bears)", players, bears);
const formattedTotalTimeByPlayerForMissions = plotTotalTimeByPlayer("../", "Total time by player (missions)", players, missions);
const formattedTotalTimeByPlayerForRaces = plotTotalTimeByPlayer("../", "Total time by player (races)", players, races);
const formattedTotalTimeByPlayerForSublevels = plotTotalTimeByPlayer("../", "Total time by player (sublevels)", players, sublevels);
const formattedTotalRankByPlayerForBears = plotTotalRankByPlayer("../", "Total rank by player (bears)", rankByLeaderboardByPlayer, bears);
const formattedTotalRankByPlayerForMissions = plotTotalRankByPlayer("../", "Total rank by player (missions)", rankByLeaderboardByPlayer, missions);
const formattedTotalRankByPlayerForRaces = plotTotalRankByPlayer("../", "Total rank by player (races)", rankByLeaderboardByPlayer, races);
const formattedTotalRankByPlayerForSublevels = plotTotalRankByPlayer("../", "Total rank by player (sublevels)", rankByLeaderboardByPlayer, sublevels);
await mkdir("plot", {
	recursive: true,
});
await rm("plot/players", {
	force: true,
	recursive: true,
});
await mkdir("plot/players", {
	recursive: true,
});
await rm("plot/leaderboards", {
	force: true,
	recursive: true,
});
await mkdir("plot/leaderboards", {
	recursive: true,
});
await writeFile(`plot/submissions-and-runs.svg`, `${formattedSubmissionAndRunCounts}\n`);
await writeFile(`plot/player-runs.svg`, `${formattedRunCountByPlayer}\n`);
await writeFile(`plot/leaderboard-runs.svg`, `${formattedRunCountByLeaderboard}\n`);
await writeFile(`plot/player-leaderboards.svg`, `${formattedLeaderboardCountByPlayer}\n`);
await writeFile(`plot/leaderboard-players.svg`, `${formattedPlayerCountByLeaderboard}\n`);
for (const [player, formattedTimeByLeaderboard] of Object.entries(formattedTimeByLeaderboardByPlayer)) {
	await writeFile(`plot/players/${player}-leaderboard-times.svg`, `${formattedTimeByLeaderboard}\n`);
}
for (const [player, formattedRankByLeaderboard] of Object.entries(formattedRankByLeaderboardByPlayer)) {
	await writeFile(`plot/players/${player}-leaderboard-ranks.svg`, `${formattedRankByLeaderboard}\n`);
}
for (const [leaderboard, formattedTimeByPlayer] of Object.entries(formattedTimeByPlayerByLeaderboard)) {
	await writeFile(`plot/leaderboards/${leaderboard}-player-times.svg`, `${formattedTimeByPlayer}\n`);
}
for (const [leaderboard, formattedRankByPlayer] of Object.entries(formattedRankByPlayerByLeaderboard)) {
	await writeFile(`plot/leaderboards/${leaderboard}-player-ranks.svg`, `${formattedRankByPlayer}\n`);
}
await writeFile(`plot/player-records.svg`, `${formattedRecordCountByPlayer}\n`);
await writeFile(`plot/player-bear-records.svg`, `${formattedRecordCountByPlayerForBears}\n`);
await writeFile(`plot/player-mission-records.svg`, `${formattedRecordCountByPlayerForMissions}\n`);
await writeFile(`plot/player-race-records.svg`, `${formattedRecordCountByPlayerForRaces}\n`);
await writeFile(`plot/player-sublevel-records.svg`, `${formattedRecordCountByPlayerForSublevels}\n`);
await writeFile(`plot/leaderboard-records.svg`, `${formattedRecordTimeByLeaderboard}\n`);
await writeFile(`plot/leaderboard-bear-records.svg`, `${formattedRecordTimeByLeaderboardForBears}\n`);
await writeFile(`plot/leaderboard-mission-records.svg`, `${formattedRecordTimeByLeaderboardForMissions}\n`);
await writeFile(`plot/leaderboard-race-records.svg`, `${formattedRecordTimeByLeaderboardForRaces}\n`);
await writeFile(`plot/leaderboard-sublevel-records.svg`, `${formattedRecordTimeByLeaderboardForSublevels}\n`);
await writeFile(`plot/player-bear-times.svg`, `${formattedTotalTimeByPlayerForBears}\n`);
await writeFile(`plot/player-mission-times.svg`, `${formattedTotalTimeByPlayerForMissions}\n`);
await writeFile(`plot/player-race-times.svg`, `${formattedTotalTimeByPlayerForRaces}\n`);
await writeFile(`plot/player-sublevel-times.svg`, `${formattedTotalTimeByPlayerForSublevels}\n`);
await writeFile(`plot/player-bear-ranks.svg`, `${formattedTotalRankByPlayerForBears}\n`);
await writeFile(`plot/player-mission-ranks.svg`, `${formattedTotalRankByPlayerForMissions}\n`);
await writeFile(`plot/player-race-ranks.svg`, `${formattedTotalRankByPlayerForRaces}\n`);
await writeFile(`plot/player-sublevel-ranks.svg`, `${formattedTotalRankByPlayerForSublevels}\n`);
await writeFile(`plot/readme.md`, `\
# Plot

- [Submission and run counts](submissions-and-runs.svg)
- [Run count by player](player-runs.svg)
- [Run count by leaderboard](leaderboard-runs.svg)
- [Leaderboard count by player](player-leaderboards.svg)
- [Player count by leaderboard](leaderboard-players.svg)
- [Record count by player](player-records.svg)
- [Record count by player (bears)](player-bear-records.svg)
- [Record count by player (missions)](player-mission-records.svg)
- [Record count by player (races)](player-race-records.svg)
- [Record count by player (sublevels)](player-sublevel-records.svg)
- [Record time by leaderboard](leaderboard-records.svg)
- [Record time by leaderboard (bears)](leaderboard-bear-records.svg)
- [Record time by leaderboard (missions)](leaderboard-mission-records.svg)
- [Record time by leaderboard (races)](leaderboard-race-records.svg)
- [Record time by leaderboard (sublevels)](leaderboard-sublevel-records.svg)
- [Total time by player (bears)](player-bear-times.svg)
- [Total time by player (missions)](player-mission-times.svg)
- [Total time by player (races)](player-race-times.svg)
- [Total time by player (sublevels)](player-sublevel-times.svg)
- [Total rank by player (bears)](player-bear-ranks.svg)
- [Total rank by player (missions)](player-mission-ranks.svg)
- [Total rank by player (races)](player-race-ranks.svg)
- [Total rank by player (sublevels)](player-sublevel-ranks.svg)
- [Players](players)
- [Leaderboards](leaderboards)
`);
await writeFile(`plot/players/readme.md`, `\
# Players

${sort(Object.keys(formattedTimeByLeaderboardByPlayer), (player) => {
	return player;
}).map((player) => {
	return `\
- [Time by leaderboard for player \`${player}\`](${player}-leaderboard-times.svg)
`;
}).join("")}\
${sort(Object.keys(formattedRankByLeaderboardByPlayer), (player) => {
	return player;
}).map((player) => {
	return `\
- [Rank by leaderboard for player \`${player}\`](${player}-leaderboard-ranks.svg)
`;
}).join("")}\
`);
await writeFile(`plot/leaderboards/readme.md`, `\
# Leaderboards

${sort(Object.keys(formattedTimeByPlayerByLeaderboard), (leaderboard) => {
	return !leaderboard.startsWith("l_") ? `l_-${leaderboard}` : leaderboard;
}).map((leaderboard) => {
	return `\
- [Time by player for leaderboard \`${leaderboard}\`](${leaderboard}-player-times.svg)
`;
}).join("")}\
${sort(Object.keys(formattedRankByPlayerByLeaderboard), (leaderboard) => {
	return !leaderboard.startsWith("l_") ? `l_-${leaderboard}` : leaderboard;
}).map((leaderboard) => {
	return `\
- [Rank by player for leaderboard \`${leaderboard}\`](${leaderboard}-player-ranks.svg)
`;
}).join("")}\
`);
