import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW_PATH = path.join(ROOT, ".github", "workflows", "ci.yml");
const WORKFLOW = fs.readFileSync(WORKFLOW_PATH, "utf8").replace(/\r\n/g, "\n");
const CHECKOUT_SHA = "9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0";
const SETUP_NODE_SHA = "249970729cb0ef3589644e2896645e5dc5ba9c38";

test("le workflow CI conserve son identite et ses seuls declencheurs", () => {
    assert.equal(fs.existsSync(WORKFLOW_PATH), true);
    assert.match(WORKFLOW, /^name: CI$/m);
    assert.match(WORKFLOW, /^    name: Validate MeteoSignal$/m);

    const eventBlock = topLevelBlock("on");
    const events = [...eventBlock.matchAll(/^  ([a-z_]+):$/gm)].map((match) => match[1]);
    const branches = [...eventBlock.matchAll(/^      - (.+)$/gm)].map((match) => match[1]);
    assert.deepEqual(events, ["pull_request", "push"]);
    assert.deepEqual(branches, ["main", "main"]);
    assert.doesNotMatch(WORKFLOW, /^\s*(?:pull_request_target|workflow_run|repository_dispatch):/m);
});

test("les permissions et le contexte du code de Pull Request restent minimaux", () => {
    const permissionLines = topLevelBlock("permissions")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    assert.deepEqual(permissionLines, ["contents: read"]);
    assert.doesNotMatch(WORKFLOW, /:\s*write\b/);
    assert.doesNotMatch(WORKFLOW, /\bsecrets\b/i);
    assert.doesNotMatch(WORKFLOW, /github\.(?:head_ref|base_ref|actor)\b/);
    assert.doesNotMatch(WORKFLOW, /github\.event\.(?:pull_request\.(?:title|body|head\.ref|user)|head_commit\.message)/);
});

test("toutes les actions tierces sont epinglees sur les SHA officiels resolus", () => {
    const uses = [...WORKFLOW.matchAll(/^\s*uses:\s*([^\s#]+)\s+#\s+(v\d+)\s*$/gm)]
        .map((match) => ({ reference: match[1], version: match[2] }));

    assert.deepEqual(uses, [
        { reference: `actions/checkout@${CHECKOUT_SHA}`, version: "v7" },
        { reference: `actions/setup-node@${SETUP_NODE_SHA}`, version: "v6" }
    ]);
    assert.ok(uses.every(({ reference }) => /@[a-f0-9]{40}$/.test(reference)));
    assert.equal((WORKFLOW.match(/^\s*uses:/gm) ?? []).length, uses.length);
});

test("le checkout ne persiste aucun credential et conserve l'historique fiable", () => {
    assert.match(WORKFLOW, /^          persist-credentials: false$/m);
    assert.match(WORKFLOW, /^          fetch-depth: 0 # Required for PR base and push-before diffs\.$/m);
    assert.match(WORKFLOW, /git config --local --get-regexp '[^']*extraheader[^']*' >\/dev\/null/);
    assert.match(WORKFLOW, /git remote get-url origin/);
    assert.match(WORKFLOW, /^          node-version: 24$/m);
    assert.match(WORKFLOW, /^          package-manager-cache: false$/m);
    assert.match(WORKFLOW, /^    timeout-minutes: 5$/m);
});

test("les controles locaux restent complets sans installation ni publication", () => {
    assert.match(WORKFLOW, /git diff --check "\$BASE_SHA\.\.\.HEAD"/);
    assert.match(WORKFLOW, /git diff --check "\$BEFORE_SHA\.\.HEAD"/);
    assert.match(WORKFLOW, /git diff-tree --check --root -r HEAD/);
    assert.match(WORKFLOW, /node --check/);
    assert.match(WORKFLOW, /^        run: npm test$/m);
    assert.doesNotMatch(WORKFLOW, /\bnpm\s+(?:install|ci)\b/);

    const runCommands = runBlocks().join("\n");
    assert.doesNotMatch(runCommands, /\bgit\s+push\b|\bgh\s+|\bdeploy\b/i);
    assert.doesNotMatch(WORKFLOW, /actions\/(?:cache|upload-artifact|download-artifact)@/);
    assert.doesNotMatch(WORKFLOW, /^\s*(?:container|services):/m);
    assert.doesNotMatch(runCommands, /\b(?:curl|wget)\b|Invoke-WebRequest/);
});

test("le YAML conserve une mise en forme deterministe et ses expressions sures", () => {
    assert.doesNotMatch(WORKFLOW, /\t/);
    assert.equal((WORKFLOW.match(/^name:/gm) ?? []).length, 1);
    assert.equal((WORKFLOW.match(/^on:/gm) ?? []).length, 1);
    assert.equal((WORKFLOW.match(/^permissions:/gm) ?? []).length, 1);
    assert.equal((WORKFLOW.match(/^jobs:/gm) ?? []).length, 1);
    assert.match(WORKFLOW, /ci-\$\{\{ github\.workflow \}\}-\$\{\{ github\.ref \}\}/);
    assert.match(WORKFLOW, /EVENT_NAME: \$\{\{ github\.event_name \}\}/);
    assert.match(WORKFLOW, /BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
    assert.match(WORKFLOW, /BEFORE_SHA: \$\{\{ github\.event\.before \}\}/);
});

function topLevelBlock(key) {
    const lines = WORKFLOW.split("\n");
    const start = lines.indexOf(`${key}:`);
    const block = [];

    assert.ok(start >= 0, `bloc YAML absent: ${key}`);
    for (let index = start + 1; index < lines.length; index += 1) {
        const line = lines[index];
        if (line !== "" && !/^\s/.test(line)) {
            break;
        }
        block.push(line);
    }

    return block.join("\n");
}

function runBlocks() {
    const lines = WORKFLOW.split("\n");
    const blocks = [];

    for (let index = 0; index < lines.length; index += 1) {
        const match = lines[index].match(/^(\s*)run:\s*(.*)$/);
        if (!match) {
            continue;
        }

        if (match[2] !== "|") {
            blocks.push(match[2]);
            continue;
        }

        const indentation = match[1].length;
        const block = [];
        for (index += 1; index < lines.length; index += 1) {
            const line = lines[index];
            const currentIndentation = line.match(/^\s*/)[0].length;
            if (line !== "" && currentIndentation <= indentation) {
                index -= 1;
                break;
            }
            block.push(line);
        }
        blocks.push(block.join("\n"));
    }

    return blocks;
}
