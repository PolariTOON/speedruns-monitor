import fs from "fs";
import jsdom from "jsdom";
import serialize from "w3c-xmlserializer";
const {JSDOM} = jsdom;
const dates = JSON.parse(await fs.promises.readFile("cache/dates.json"));
const players = JSON.parse(await fs.promises.readFile("cache/players.json"));
const {window} = new JSDOM(`\
<html xmlns="http://www.w3.org/1999/xhtml" dir="ltr" lang="en">
	<head>
		<title>Watch</title>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width" />
		<meta name="color-scheme" content="dark light" />
		<style>
			* {
				box-sizing: border-box;
			}
			html {
				width: min-content;
				height: min-content;
			}
			body {
				margin: 20px;
				font: 16px / 1.25 serif;
				background: var(--canvas-background);
				color: var(--canvas-foreground);
			}
			table {
				table-layout: fixed;
				border-collapse: collapse;
				background: var(--canvas-background);
			}
			col {
				background: repeating-linear-gradient(45deg, var(--first-platform, #0000) 0 2px, var(--last-platform, #0000) 0 4px);
			}
			col[data-android] {
				--first-platform: var(--android);
			}
			col[data-ios] {
				--last-platform: var(--ios);
			}
			thead {
				writing-mode: sideways-lr;
			}
			th,
			td {
				min-width: 40px;
				min-height: 40px;
				text-align: center;
				vertical-align: middle;
			}
			th {
				padding: 10px;
			}
			th:not(:empty)[data-android]:not([data-ios])::after {
				content: " (" attr(data-android) ")";
			}
			th:not(:empty):not([data-android])[data-ios]::after {
				content: " (" attr(data-ios) ")";
			}
			th:not(:empty)[data-android][data-ios]::after {
				content: " (" attr(data-android) ", " attr(data-ios) ")";
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
			td:empty:is(:first-of-type, :last-of-type) {
				border: 1px dashed var(--canvas-foreground);
				background: var(--canvas-background);
			}
			td:empty:not(:first-of-type, :last-of-type) {
				border-left: 1px dashed var(--canvas-foreground);
				border-right: 1px dashed var(--canvas-foreground);
				border-top: 1px solid var(--canvas-foreground);
				border-bottom: 1px solid var(--canvas-foreground);
				background: var(--highlighted);
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
				width: 10px;
				height: 10px;
				border-radius: 5px;
				border: 1px solid var(--canvas-foreground);
				background: var(--platform, #0000);
			}
			a[data-platform="android"]::before {
				--platform: var(--android);
			}
			a[data-platform="ios"]::before {
				--platform: var(--ios);
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
					--highlighted: #9993;
					--faded: #6663;
					--verified: #9c9;
					--rejected: #c9c;
					--contentious: #999;
				}
			}
		</style>
	</head>
</html>
`, {
	contentType: "application/xhtml+xml",
});
const {document} = window;
const html = document.documentElement;
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
for (const [player, playerDates] of Object.entries(players)) {
	const tr = document.createElement("tr");
	const th = document.createElement("th");
	th.textContent = player;
	tr.append(th);
	let span = 0;
	const arrival = Object.keys(playerDates)[0];
	const departure = Object.keys(playerDates)[Object.keys(playerDates).length - 1];
	for (const date of Object.keys(dates)) {
		if (date >= arrival && date <= departure && (playerDates[date] != null || Object.keys(dates[date]).length !== 0)) {
			if (span > 0) {
				const td = document.createElement("td");
				td.colSpan = span;
				tr.append(td);
			}
			const td = document.createElement("td");
			if (playerDates[date] != null) {
				for (const run of playerDates[date]) {
					const p = document.createElement("p");
					const a = document.createElement("a");
					a.href = run.href;
					a.textContent = run.version != null ? run.version : "?";
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
	if (span > 0) {
		const td = document.createElement("td");
		td.colSpan = span;
		tr.append(td);
	}
	tbody.append(tr);
}
table.append(colhead);
table.append(colbody);
table.append(thead);
table.append(tbody);
body.append(table);
html.append(body);
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
indent(body, 1, true);
await fs.promises.writeFile("watch.xhtml", `${serialize(html, {
	requireWellFormed: true,
})}\n`);
