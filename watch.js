import fs from "fs";
import jsdom from "jsdom";
import serialize from "w3c-xmlserializer";
const {JSDOM} = jsdom;
const dates = JSON.parse(await fs.promises.readFile("cache/dates.json"));
const players = JSON.parse(await fs.promises.readFile("cache/players.json"));
const leaderboards = JSON.parse(await fs.promises.readFile("cache/leaderboards.json"));
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
function watch(scope, title, data) {
	const {window} = new JSDOM(`\
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
			body {
				margin: 20px;
				font: 16px / 1.25 serif;
				background: var(--canvas-background);
				color: var(--canvas-foreground);
			}
			body &gt; div {
				position: fixed;
				inset: 0 auto auto 0;
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
				background: var(--canvas-background);
			}
			col {
				background: repeating-linear-gradient(45deg, var(--first-platform, #0000) 0 2px, var(--second-platform, #0000) 0 4px, var(--third-platform, #0000) 0 6px);
			}
			col[data-android] {
				--first-platform: var(--android);
			}
			col[data-ios] {
				--second-platform: var(--ios);
			}
			col[data-switch] {
				--third-platform: var(--switch);
			}
			thead {
				writing-mode: sideways-lr;
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
			td {
				padding: 0;
			}
			th:not(:empty),
			td:not(:empty) {
				border: 1px solid var(--canvas-foreground);
				background: var(--highlighted);
			}
			th:empty,
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
			a[data-status="rejected"]:is([data-annotation="Old run that was obsoleted by a tons of updates now"], [data-annotation="Old run that was obsoleted by a tons of updates now\\0A Moreover, the video is not available anymore"], [data-annotation="Obsolete"], [data-annotation="Obsolete post-update"], [data-annotation="Old run that was obsoleted by a ton of updates now"], [data-annotation="Runs exploiting the bugs affecting Viper in version 1.9.4 are now invalid"], [data-annotation="To preserve the competition, the current rules state you must not use version 1.9.4 to speedrun Viper"], [data-annotation="The bug, on which the exploit used in this speedrun is based, has been quickly fixed in the next version, 1.9.9\\0A This run is thus rejected to keep the competition going"], [data-annotation="Runs should be made in the last version allowed by the subcategory, that is to say 1.9.7.3. Older versions, even if they are faster, should not be used for new submissions."]) {
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
				async function importDataScript(dataScriptUrl) {
					if (documentUrl.protocol !== "file:") {
						const response = await fetch(dataScriptUrl);
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
						function handleError(event) {
							delete window[name];
							dataScript.removeEventListener("load", handleLoad);
							dataScript.remove();
							const error = event.error;
							reject(error);
						}
						function handleLoad(event) {
							delete window[name];
							dataScript.removeEventListener("error", handleError);
							dataScript.remove();
							resolve(data);
						}
						dataScript.addEventListener("error", handleError, {
							once: true,
						});
						dataScript.addEventListener("load", handleLoad, {
							once: true,
						});
						script.after(dataScript);
					});
				}
				document.addEventListener("DOMContentLoaded", async (event) =&gt; {
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
					const {players, leaderboards} = await (async () =&gt; {
						try {
							const cachedPlayers = sessionStorage.getItem(playersKey);
							const cachedLeaderboards = sessionStorage.getItem(leaderboardsKey);
							if (cachedPlayers == null || cachedLeaderboards == null) {
								throw new Error();
							}
							const players = JSON.parse(cachedPlayers);
							const leaderboards = JSON.parse(cachedLeaderboards);
							return {players, leaderboards};
						} catch {}
						try {
							const players = Object.create(null);
							const leaderboards = Object.create(null);
							const games = ["9d3rrxyd", "w6jl2ned"];
							for (const gameId of games) {
								const {data} = await importDataScript(\`https://www.speedrun.com/api/v1/games/\${gameId}?embed=categories,levels,variables\`);
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
								await new Promise((resolve) =&gt; {
									setTimeout(resolve, 800);
								});
								const slice = 200;
								for (let offset = 0;; offset += slice) {
									const {data, pagination} = await importDataScript(\`https://www.speedrun.com/api/v1/runs?game=\${gameId}&amp;orderby=date&amp;direction=asc&amp;embed=players&amp;offset=\${offset}&amp;max=\${slice}\`);
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
									await new Promise((resolve) =&gt; {
										setTimeout(resolve, 800);
									});
								}
							}
							try {
								const cachedPlayers = JSON.stringify(players);
								const cachedLeaderboards = JSON.stringify(leaderboards);
								sessionStorage.setItem(playersKey, cachedPlayers);
								sessionStorage.setItem(leaderboardsKey, cachedLeaderboards);
							} catch {}
							return {players, leaderboards};
						} catch {}
						const players = null;
						const leaderboards = null;
						return {players, leaderboards};
					})();
					if (players == null || leaderboards == null) {
						const input = document.createElement("input");
						input.type = "checkbox";
						input.autocomplete = "off";
						input.disabled = true;
						input.indeterminate = true;
						progress.replaceWith(input);
						span.textContent = "Unavailable names";
						return;
					}
					const hasPlayerThs = titleContent === "Players";
					const hasLeaderboardThs = titleContent === "Leaderboards";
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
`, {
		contentType: "application/xhtml+xml",
	});
	const {document} = window;
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
		th.textContent = date;
		for (const platform of Object.keys(datePlatforms)) {
			col.setAttribute(`data-${platform}`, datePlatforms[platform]);
			th.setAttribute(`data-${platform}`, datePlatforms[platform]);
		}
		colbody.append(col);
		tr.append(th);
	}
	thead.append(tr);
	for (const [datum, datumDates] of Object.entries(data)) {
		const tr = document.createElement("tr");
		const th = document.createElement("th");
		th.textContent = datum;
		tr.append(th);
		let span = 0;
		const arrival = Object.keys(datumDates)[0];
		const departure = Object.keys(datumDates)[Object.keys(datumDates).length - 1];
		for (const date of Object.keys(dates)) {
			if (date >= arrival && date <= departure && (datumDates[date] != null || Object.keys(dates[date]).length !== 0)) {
				while (span > 0) {
					const td = document.createElement("td");
					td.colSpan = Math.min(span, 1000);
					tr.append(td);
					span -= 1000;
				}
				const td = document.createElement("td");
				if (datumDates[date] != null) {
					for (const run of datumDates[date]) {
						const p = document.createElement("p");
						const a = document.createElement("a");
						a.href = run.href;
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
			td.colSpan = Math.min(span, 1000);
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
	const formattedData = serialize(root, {
		requireWellFormed: true,
	});
	return formattedData;
}
const formattedPlayers = watch("../", "Players", players);
const formattedLeaderboards = watch("../", "Leaderboards", leaderboards);
await fs.promises.mkdir("watch", {
	recursive: true,
});
await fs.promises.writeFile("watch/players.xhtml", `${formattedPlayers}\n`);
await fs.promises.writeFile("watch/leaderboards.xhtml", `${formattedLeaderboards}\n`);
