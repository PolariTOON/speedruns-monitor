import {mkdir, writeFile} from "node:fs/promises";
import {DOMParser} from "linkedom";
import dates from "./cache/dates.json" with {type: "json"};
import players from "./cache/players.json" with {type: "json"};
import leaderboards from "./cache/leaderboards.json" with {type: "json"};
const blocks = ["body", "table", "colgroup", "thead", "tbody", "tr", "td"];
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
		return Object.keys(datum[1])[0];
	});
	return data;
}
function sortDatumDates(datumDates) {
	sort(datumDates, (datumDate) => {
		return datumDate[0];
	});
	return datumDates;
}
function watch(scope, title, data) {
	const sortedData = Object.fromEntries(sortData(Object.entries(data).map(([datum, dates]) => {
		return [
			datum,
			Object.fromEntries(sortDatumDates(Object.entries(dates))),
		];
	})));
	const document = new DOMParser().parseFromString(`\
<html xmlns="http://www.w3.org/1999/xhtml" dir="ltr" lang="en">
	<head>
		<title>${title}</title>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width" />
		<meta name="color-scheme" content="dark light" />
		<style>
			*,
			::before,
			::after {
				box-sizing: border-box;
			}
			:root {
				width: min-content;
				height: min-content;
			}
			:root::before,
			:root::after {
				content: "";
				position: fixed;
				z-index: 4;
				left: 0;
				top: 0;
				background: var(--canvas-background);
			}
			:root::before {
				width: 100%;
				height: 20px;
			}
			:root::after {
				width: 20px;
				height: 100%;
			}
			body {
				margin: 20px;
				font: 16px / 1.25 serif;
				background: var(--canvas-background);
				color: var(--canvas-foreground);
			}
			body &gt; div {
				position: fixed;
				z-index: 5;
				left: 0;
				top: 0;
				margin: 20px;
				border: 1px solid var(--canvas-foreground);
				background: var(--highlighted);
				font: 16px / 1.25 serif;
				transition: opacity 1s;
				pointer-events: auto;
			}
			body:is(:hover, :focus-within) div:not(:hover, :focus-within) {
				opacity: 0;
				pointer-events: none;
			}
			body &gt; div &gt; p {
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
			body &gt; table {
				table-layout: fixed;
				border-collapse: collapse;
			}
			col[data-android],
			th:not(:empty)[data-android] {
				--first-platform: var(--android);
			}
			col[data-ios],
			th:not(:empty)[data-ios] {
				--second-platform: var(--ios);
			}
			col[data-switch],
			th:not(:empty)[data-switch] {
				--third-platform: var(--switch);
			}
			col {
				background: repeating-linear-gradient(45deg, var(--first-platform, #0000) 0 2px, var(--second-platform, #0000) 0 4px, var(--third-platform, #0000) 0 6px) var(--canvas-background);
			}
			th,
			td {
				min-width: 42px;
				min-height: 42px;
				text-align: center;
				vertical-align: middle;
			}
			th {
				padding: 10px;
			}
			th:not(:empty) {
				outline: 1px solid var(--canvas-foreground);
				outline-offset: -.5px;
				border: 1px solid #0000;
				background: linear-gradient(var(--highlighted) 0 100%), repeating-linear-gradient(45deg, var(--first-platform, #0000) 0 2px, var(--second-platform, #0000) 0 4px, var(--third-platform, #0000) 0 6px) var(--canvas-background);
			}
			th:not(:empty)[data-android]:not([data-ios]):not([data-switch])::after {
				content: " (" attr(data-android) ")";
			}
			th:not(:empty):not([data-android])[data-ios]:not([data-switch])::after {
				content: " (" attr(data-ios) ")";
			}
			th:not(:empty):not([data-android]):not([data-ios])[data-switch]::after {
				content: " (" attr(data-switch) ")";
			}
			th:not(:empty)[data-android][data-ios]:not([data-switch])::after {
				content: " (" attr(data-android) ", " attr(data-ios) ")";
			}
			th:not(:empty)[data-android]:not([data-ios])[data-switch]::after {
				content: " (" attr(data-android) ", " attr(data-switch) ")";
			}
			th:not(:empty):not([data-android])[data-ios][data-switch]::after {
				content: " (" attr(data-ios) ", " attr(data-switch) ")";
			}
			th:not(:empty)[data-android][data-ios][data-switch]::after {
				content: " (" attr(data-android) ", " attr(data-ios) ", " attr(data-switch) ")";
			}
			th:empty {
				outline: 1px dashed var(--canvas-foreground);
				outline-offset: -.5px;
				border: 1px dashed #0000;
				background: var(--canvas-background);
			}
			th:not([scope]) {
				position: sticky;
				z-index: 4;
				left: 20px;
				top: 20px;
			}
			th[scope="row"],
			th[scope="col"] {
				position: sticky;
				z-index: 3;
			}
			th[scope="row"] {
				left: 20px;
				top: auto;
			}
			th[scope="col"] {
				left: auto;
				top: 20px;
				writing-mode: sideways-lr;
			}
			td {
				padding: 0;
			}
			td:not(:empty) {
				border: 1px solid var(--canvas-foreground);
				background: var(--highlighted);
			}
			td:empty:is(:not(:nth-child(1 of td:not(:empty)) ~ *), :nth-last-child(1 of td:not(:empty)) ~ *) {
				border: 1px dashed var(--canvas-foreground);
				background: var(--canvas-background);
			}
			td:empty:not(:not(:nth-child(1 of td:not(:empty)) ~ *), :nth-last-child(1 of td:not(:empty)) ~ *) {
				border-left: 1px dashed var(--canvas-foreground);
				border-right: 1px dashed var(--canvas-foreground);
				border-top: 1px solid var(--canvas-foreground);
				border-bottom: 1px solid var(--canvas-foreground);
				background: var(--highlighted);
			}
			td:empty[colspan] + td:empty[colspan] {
				border-left-style: hidden;
			}
			p {
				margin: 0;
			}
			p + p {
				margin-top: 10px;
			}
			a {
				position: relative;
				display: block;
				padding: 10px;
				background: var(--status);
				color: inherit;
			}
			a[data-status="verified"] {
				--status: var(--verified);
			}
			a[data-status="rejected"] {
				--status: var(--rejected);
			}
			a[data-status="rejected"]:is([data-annotation="Runs exploiting the bugs affecting Viper in version 1.9.4 are now invalid"], [data-annotation="To preserve the competition, the current rules state you must not use version 1.9.4 to speedrun Viper"], [data-annotation="The bug, on which the exploit used in this speedrun is based, has been quickly fixed in the next version, 1.9.9\\0A This run is thus rejected to keep the competition going"], [data-annotation="Runs should be made in the last version allowed by the subcategory, that is to say 1.9.7.3. Older versions, even if they are faster, should not be used for new submissions."], [data-annotation="The bug, on which the exploit used in this speedrun is based, has been quickly fixed in the next version, 11.0.0 This run is thus rejected to keep the competition going"], [data-annotation="The bug, on which the exploit used in this speedrun is based, has been quickly fixed in the next version, 11.1.0 This run is thus rejected to keep the competition going"], [data-annotation="Wall running on vines is preventively disallowed in this category to keep the competition going in case it gets fixed."], [data-annotation="One of the bug this speedrun exploits has been quickly fixed in the next version, 12.0.2. This run is thus rejected to keep the competition going"], [data-annotation="The bug this speedrun exploits has been quickly fixed in the next version, 12.0.4. This run is thus rejected to keep the competition going"], [data-annotation="The timer bug this speedrun exploits has been fixed in a later version."]) {
				--status: var(--contentious);
			}
			a[data-status="rejected"]:is([data-annotation="Automatically moved to the new individual level"], [data-annotation="Automatically moved to the new category extensions"]) {
				--status: var(--faded);
			}
			a::before {
				content: "";
				position: absolute;
				z-index: 1;
				left: calc(100% - 5px);
				top: -5px;
				width: 12px;
				height: 12px;
				padding: 5px;
				border-radius: 6px;
				border: 1px solid var(--canvas-foreground);
				background: var(--platform, #0000);
			}
			a[data-platform="android"]::before {
				--platform: var(--android);
			}
			a[data-platform="ios"]::before {
				--platform: var(--ios);
			}
			a[data-platform="switch"]::before {
				--platform: var(--switch);
			}
			a[data-annotation]:is(:hover, :focus-within)::after {
				content: attr(data-annotation);
				position: absolute;
				z-index: 2;
				left: -20px;
				top: 100%;
				width: calc(100% + 40px);
				padding: 5px;
				border-radius: 5px;
				background: var(--canvas-background);
				box-shadow: 0 0 5px var(--canvas-foreground);
				pointer-events: none;
			}
			@media (prefers-color-scheme: dark) {
				:root {
					--canvas-background: #000;
					--canvas-foreground: #ccc;
					--android: #630;
					--ios: #036;
					--switch: #666;
					--highlighted: #6663;
					--faded: #9993;
					--verified: #363;
					--rejected: #636;
					--contentious: #666;
				}
			}
			@media (prefers-color-scheme: light) {
				:root {
					--canvas-background: #fff;
					--canvas-foreground: #333;
					--android: #fc9;
					--ios: #9cf;
					--switch: #999;
					--highlighted: #9993;
					--faded: #6663;
					--verified: #9c9;
					--rejected: #c9c;
					--contentious: #999;
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
						const dataScript = document.createElement("script");
						dataScript.src = \`\${dataScriptUrl}&amp;callback=\${name}\`;
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
					const titleElement = document.querySelector("title");
					const titleContent = titleElement.textContent;
					const thElements = Array.from(document.querySelectorAll("tbody &gt; tr &gt; th:first-of-type"));
					const thContents = thElements.map((thElement) =&gt; {
						const thContent = thElement.textContent;
						return thContent;
					});
					const aElements = Array.from(document.querySelectorAll("a[data-annotation]"));
					const aContents = aElements.map((aElement) =&gt; {
						const aContent = aElement.dataset.annotation;
						return aContent;
					});
					const body = document.querySelector("body");
					const div = document.createElement("div");
					const p = document.createElement("p");
					const label = document.createElement("label");
					const progress = document.createElement("progress");
					label.append(progress);
					const span = document.createElement("span");
					span.textContent = "Loading names";
					label.append(span);
					p.append(label);
					div.prepend(p);
					body.prepend(div);
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
						const input = document.createElement("input");
						input.type = "checkbox";
						input.autocomplete = "off";
						input.disabled = true;
						input.indeterminate = true;
						progress.replaceWith(input);
						span.textContent = "Unavailable names";
						return;
					}
					const {players, leaderboards} = session;
					const hasPlayerThs = titleContent.includes(" by player");
					const hasLeaderboardThs = titleContent.includes(" by leaderboard");
					const ths = thElements.map((thElement, k) =&gt; {
						const thContent = thContents[k];
						const th = {
							element: thElement,
							contentWithIds: thContent,
							contentWithNames: hasPlayerThs ? players[thContent] ?? thContent : hasLeaderboardThs ? leaderboards[thContent] ?? thContent : thContent,
						};
						return th;
					});
					const as = aElements.map((aElement, k) =&gt; {
						const aContent = aContents[k];
						const a = {
							element: aElement,
							contentWithIds: aContent,
							contentWithNames: aContent.replaceAll(/@([0-9_a-z]+)/g, ($0, $1) =&gt; {
								return \`@\${players[$1] ?? $1}\`;
							}),
						};
						return a;
					});
					const input = document.createElement("input");
					input.type = "checkbox";
					input.autocomplete = "off";
					input.addEventListener("change", () =&gt; {
						input.disabled = true;
						if (input.checked) {
							for (const th of ths) {
								th.element.textContent = th.contentWithNames;
							}
							for (const a of as) {
								a.element.dataset.annotation = a.contentWithNames;
							}
						} else {
							for (const th of ths) {
								th.element.textContent = th.contentWithIds;
							}
							for (const a of as) {
								a.element.dataset.annotation = a.contentWithIds;
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
	</head>
</html>
`, "application/xhtml+xml");
	const root = document.documentElement;
	const body = document.createElement("body");
	const table = document.createElement("table");
	const colhead = document.createElement("colgroup");
	const colbody = document.createElement("colgroup");
	const thead = document.createElement("thead");
	const tbody = document.createElement("tbody");
	const col = document.createElement("col");
	const tr = document.createElement("tr");
	const th = document.createElement("th");
	colhead.append(col);
	tr.append(th);
	for (const [date, datePlatforms] of Object.entries(dates)) {
		const col = document.createElement("col");
		const th = document.createElement("th");
		th.setAttribute("scope", "col");
		th.textContent = date;
		for (const platform of Object.keys(datePlatforms)) {
			col.setAttribute(`data-${platform}`, "");
			th.setAttribute(`data-${platform}`, datePlatforms[platform]);
		}
		colbody.append(col);
		tr.append(th);
	}
	thead.append(tr);
	for (const [datum, datumDates] of Object.entries(sortedData)) {
		const tr = document.createElement("tr");
		const th = document.createElement("th");
		th.setAttribute("scope", "row");
		th.textContent = datum;
		tr.append(th);
		let span = 0;
		const arrival = Object.keys(datumDates)[0];
		const departure = Object.keys(datumDates)[Object.keys(datumDates).length - 1];
		for (const date of Object.keys(dates)) {
			if (date >= arrival && date <= departure && (datumDates[date] != null || Object.keys(dates[date]).length !== 0)) {
				while (span > 0) {
					const td = document.createElement("td");
					td.setAttribute("colspan", `${Math.min(span, 1000)}`);
					tr.append(td);
					span -= 1000;
				}
				const td = document.createElement("td");
				if (datumDates[date] != null) {
					for (const run of datumDates[date]) {
						const p = document.createElement("p");
						const a = document.createElement("a");
						a.setAttribute("href", run.href);
						a.textContent = run.version;
						if (run.platform != null) {
							a.setAttribute("data-platform", run.platform);
						}
						if (run.status != null) {
							a.setAttribute("data-status", run.status);
						}
						if (run.annotation != null) {
							a.setAttribute("data-annotation", run.annotation);
						}
						p.append(a);
						td.append(p);
					}
				}
				tr.append(td);
				span = 0;
			} else {
				++span;
			}
		}
		while (span > 0) {
			const td = document.createElement("td");
			td.setAttribute("colspan", `${Math.min(span, 1000)}`);
			tr.append(td);
			span -= 1000;
		}
		tbody.append(tr);
	}
	table.append(colhead);
	table.append(colbody);
	table.append(thead);
	table.append(tbody);
	body.append(table);
	root.append(body);
	indent(body, 1, true);
	const formattedData = root.toString();
	return formattedData;
}
function watchRuns(scope, title, data) {
	const newData = Object.create(null);
	for (const [datum, datumDates] of Object.entries(data)) {
		for (const [date, dateRuns] of Object.entries(datumDates)) {
			for (const run of dateRuns) {
				if (run.status !== "verified") {
					continue;
				}
				const newDatumDates = newData[datum] ??= Object.create(null);
				newDatumDates[date] ??= [];
				newDatumDates[date].push(run);
			}
		}
	}
	const formattedData = watch(scope, title, newData);
	return formattedData;
}
function watchSubmissions(scope, title, data) {
	const formattedData = watch(scope, title, data);
	return formattedData;
}
const formattedRunsByPlayer = watchRuns("../", "Runs by player", players);
const formattedRunsByLeaderboard = watchRuns("../", "Runs by leaderboard", leaderboards);
const formattedSubmissionsByPlayer = watchSubmissions("../", "Submissions by player", players);
const formattedSubmissionsByLeaderboard = watchSubmissions("../", "Submissions by leaderboard", leaderboards);
await mkdir("watch", {
	recursive: true,
});
await writeFile("watch/player-runs.xhtml", `${formattedRunsByPlayer}\n`);
await writeFile("watch/leaderboard-runs.xhtml", `${formattedRunsByLeaderboard}\n`);
await writeFile("watch/player-submissions.xhtml", `${formattedSubmissionsByPlayer}\n`);
await writeFile("watch/leaderboard-submissions.xhtml", `${formattedSubmissionsByLeaderboard}\n`);
await writeFile(`watch/readme.md`, `\
# Watch

- [Runs by player](player-runs.xhtml)
- [Runs by leaderboard](leaderboard-runs.xhtml)
- [Submissions by player](player-submissions.xhtml)
- [Submissions by leaderboard](leaderboard-submissions.xhtml)
`);
