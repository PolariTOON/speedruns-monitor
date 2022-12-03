import fs from "fs";
import jsdom from "jsdom";
import serialize from "w3c-xmlserializer";
const {JSDOM} = jsdom;
const dates = JSON.parse(await fs.promises.readFile("cache/dates.json"));
const players = JSON.parse(await fs.promises.readFile("cache/players.json"));
const {window} = new JSDOM(`\
<html xmlns="http://www.w3.org/1999/xhtml">
	<head>
		<title>Watch</title>
		<meta charset="utf-8" />
		<style>
			* {
				box-sizing: border-box;
			}
			body {
				font: 16px / 1.25 serif;
			}
			table {
				table-layout: fixed;
				border-collapse: collapse;
				text-align: center;
				vertical-align: middle;
			}
			col {
				background: repeating-linear-gradient(45deg, var(--android, #0000) 0 2px, var(--ios, #0000) 0 4px);
			}
			col[data-android] {
				--android: #ffc;
			}
			col[data-ios] {
				--ios: #ccf;
			}
			thead {
				writing-mode: sideways-lr;
			}
			th,
			td {
				min-width: 40px;
				min-height: 40px;
				padding: 0;
				border: 1px solid #000;
			}
			th {
				padding: 10px;
			}
			th[data-android]::after {
				content: " (" attr(data-android) ")";
			}
			th[data-ios]::after {
				content: " (" attr(data-ios) ")";
			}
			th[data-android][data-ios]::after {
				content: " (" attr(data-android) ", " attr(data-ios) ")";
			}
			td:not(:first-of-type:empty, :last-of-type:empty) {
				background: #3333;
			}
			a {
				display: block;
				padding: 10px;
				background: #6f6;
				color: #000;
			}
			a[data-platform="ios"] {
				outline: 5px solid #66f;
				outline-offset: -5px;
			}
			a:empty {
				background: #f66
			}
			a:empty::before {
				content: "?";
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
const colgroup = document.createElement("colgroup");
const col = document.createElement("col");
const thead = document.createElement("thead");
const tr = document.createElement("tr");
const th = document.createElement("th");
colgroup.append(col);
tr.append(th);
for (const [date, platforms] of Object.entries(dates)) {
	const col = document.createElement("col");
	const th = document.createElement("th");
	th.textContent = date;
	for (const platform in platforms) {
		col.setAttribute(`data-${platform}`, platforms[platform]);
		th.setAttribute(`data-${platform}`, platforms[platform]);
	}
	colgroup.append(col);
	tr.append(th);
}
thead.append(tr);
table.append(colgroup);
table.append(thead);
const tbody = document.createElement("tbody");
for (const [player, {dates: playerDates}] of Object.entries(players)) {
	const tr = document.createElement("tr");
	const th = document.createElement("th");
	th.textContent = player;
	tr.append(th);
	let span = 0;
	for (const date of Object.keys(dates)) {
		if (Object.hasOwn(playerDates, date)) {
			if (span > 0) {
				const td = document.createElement("td");
				td.colSpan = span;
				tr.append(td);
			}
			const td = document.createElement("td");
			for (const run of playerDates[date] ?? []) {
				const p = document.createElement("p");
				const a = document.createElement("a");
				a.href = run.href;
				a.textContent = run.textContent;
				a.setAttribute("data-platform", run.platform);
				p.append(a);
				td.append(p);
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
