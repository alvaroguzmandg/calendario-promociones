import { readFile, writeFile } from "node:fs/promises";

const html = await readFile("index.html", "utf8");
const css = await readFile("styles.css", "utf8");
const js = await readFile("app.js", "utf8");

const standalone = html
  .replace(/    <link rel="stylesheet" href="\.\/styles\.css(?:\?[^"]*)?" \/>/, `    <style>\n${css}\n    </style>`)
  .replace(/    <script src="\.\/app\.js(?:\?[^"]*)?"><\/script>/, `    <script>\n${js}\n    </script>`);

await writeFile("calendario-promos-standalone.html", standalone);
