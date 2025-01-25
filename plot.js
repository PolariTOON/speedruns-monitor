import fs from "fs";
import jsdom from "jsdom";
import serialize from "w3c-xmlserializer";
const {JSDOM} = jsdom;
const players = JSON.parse(await fs.promises.readFile("cache/players.json"));
const leaderboards = JSON.parse(await fs.promises.readFile("cache/leaderboards.json"));
const tiers = JSON.parse(await fs.promises.readFile("cache/tiers.json"));
const blocks = ["foreignObject", "svg", "g", "path"];
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
	const {window} = new JSDOM(`\
<svg xmlns="http://www.w3.org/2000/svg" lang="en" style="color-scheme: dark light;">
	<title>${title}</title>
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
		foreignObject &gt; div {
			position: absolute;
			left: 0;
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
		}
		progress,
		input[type="checkbox"] {
			display: table-cell;
			width: 16px;
			height: 16px;
			margin: 2px;
			accent-color: var(--canvas-foreground);
			vertical-align: top;
		}
		progress + span,
		input[type="checkbox"] + span {
			display: table-cell;
			vertical-align: top;
		}
		input[type="checkbox"]:not(:disabled):is(:hover, :focus-within) + span {
			text-decoration: underline;
		}
		foreignObject &gt; svg {
			width: calc(100% - 40px);
			height: calc(100% - 40px);
			margin: 20px;
			padding: 10px;
			border: 1px dashed var(--canvas-foreground);
			background: var(--canvas-background);
			pointer-events: auto;
		}
		g &gt; rect[tabindex] {
			vector-effect: non-scaling-stroke;
			fill: var(--tier, #0000);
			stroke: none;
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
			vector-effect: non-scaling-stroke;
			fill: none;
			stroke: none;
			pointer-events: none;
		}
		g &gt; path[tabindex]:first-of-type:is(:hover, :focus-within) + rect {
			fill: var(--highlighted);
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
</svg>
`, {
		contentType: "image/svg+xml",
	});
	const {document} = window;
	const root = document.documentElement;
	const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
	foreignObject.setAttribute("x", "0");
	foreignObject.setAttribute("y", "0");
	foreignObject.setAttribute("width", "100%");
	foreignObject.setAttribute("height", "100%");
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("viewBox", `0 0 ${maxDuration} ${maxValue}`);
	svg.setAttribute("preserveAspectRatio", "none");
	svg.setAttribute("overflow", "visible");
	const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
	const gCount = Object.keys(sortedData).length;
	g.setAttribute("transform", "scale(1 -1)");
	g.setAttribute("transform-origin", "center center");
	g.setAttribute("style", `--count: ${gCount};`);
	if (timed && goals != null) {
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
	const formattedData = serialize(root, {
		requireWellFormed: true,
	});
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
function plotRecordCountByPlayer(scope, title, leaderboards) {
	const players = Object.create(null);
	for (const leaderboardDates of Object.values(leaderboards)) {
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
function plotRecordTimeByLeaderboard(scope, title, leaderboards) {
	const newLeaderboards = Object.create(null);
	for (const [leaderboard, leaderboardDates] of Object.entries(leaderboards)) {
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
	const formattedTimeByPlayer = plotTimeByDatumKey("../../", `Time by player for leaderboard ${leaderboard}`, leaderboardDates, "player", tiers[leaderboard]);
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
const formattedRecordCountByPlayer = plotRecordCountByPlayer("../", "Record count by player", leaderboards);
const formattedRecordTimeByLeaderboard = plotRecordTimeByLeaderboard("../", "Record time by leaderboard", leaderboards);
const formattedTotalTimeByPlayer = plotTotalTimeByPlayer("../", "Total time by player", players, tiers);
const formattedTotalRankByPlayer = plotTotalRankByPlayer("../", "Total rank by player", rankByLeaderboardByPlayer, tiers);
await fs.promises.mkdir("plot", {
	recursive: true,
});
await fs.promises.rm("plot/players", {
	force: true,
	recursive: true,
});
await fs.promises.mkdir("plot/players", {
	recursive: true,
});
await fs.promises.rm("plot/leaderboards", {
	force: true,
	recursive: true,
});
await fs.promises.mkdir("plot/leaderboards", {
	recursive: true,
});
await fs.promises.writeFile(`plot/player-runs.svg`, `${formattedRunCountByPlayer}\n`);
await fs.promises.writeFile(`plot/leaderboard-runs.svg`, `${formattedRunCountByLeaderboard}\n`);
await fs.promises.writeFile(`plot/player-leaderboards.svg`, `${formattedLeaderboardCountByPlayer}\n`);
await fs.promises.writeFile(`plot/leaderboard-players.svg`, `${formattedPlayerCountByLeaderboard}\n`);
for (const [player, formattedTimeByLeaderboard] of Object.entries(formattedTimeByLeaderboardByPlayer)) {
	await fs.promises.writeFile(`plot/players/${player}-leaderboard-times.svg`, `${formattedTimeByLeaderboard}\n`);
}
for (const [player, formattedRankByLeaderboard] of Object.entries(formattedRankByLeaderboardByPlayer)) {
	await fs.promises.writeFile(`plot/players/${player}-leaderboard-ranks.svg`, `${formattedRankByLeaderboard}\n`);
}
for (const [leaderboard, formattedTimeByPlayer] of Object.entries(formattedTimeByPlayerByLeaderboard)) {
	await fs.promises.writeFile(`plot/leaderboards/${leaderboard}-player-times.svg`, `${formattedTimeByPlayer}\n`);
}
for (const [leaderboard, formattedRankByPlayer] of Object.entries(formattedRankByPlayerByLeaderboard)) {
	await fs.promises.writeFile(`plot/leaderboards/${leaderboard}-player-ranks.svg`, `${formattedRankByPlayer}\n`);
}
await fs.promises.writeFile(`plot/player-records.svg`, `${formattedRecordCountByPlayer}\n`);
await fs.promises.writeFile(`plot/leaderboard-records.svg`, `${formattedRecordTimeByLeaderboard}\n`);
await fs.promises.writeFile(`plot/player-times.svg`, `${formattedTotalTimeByPlayer}\n`);
await fs.promises.writeFile(`plot/player-ranks.svg`, `${formattedTotalRankByPlayer}\n`);
await fs.promises.writeFile(`plot/readme.md`, `\
# Plot

- [Run count by player](player-runs.svg)
- [Run count by leaderboard](leaderboard-runs.svg)
- [Leaderboard count by player](player-leaderboards.svg)
- [Player count by leaderboard](leaderboard-players.svg)
- [Record count by player](player-records.svg)
- [Record time by leaderboard](leaderboard-records.svg)
- [Total time by player](player-times.svg)
- [Total rank by player](player-ranks.svg)
- [Players](players)
- [Leaderboards](leaderboards)
`);
await fs.promises.writeFile(`plot/players/readme.md`, `\
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
await fs.promises.writeFile(`plot/leaderboards/readme.md`, `\
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
