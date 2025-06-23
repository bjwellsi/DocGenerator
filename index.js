import { Command } from "commander";
import { initDir, initFile } from "./init.js";
import { buildDoc } from "./crawl_dir.js";

const program = new Command();

const baseDir = "./testdir/"; //this will be root
const RULE_FILE = "files.json";
const NOTES_FILE = "notes.md";
const DOC_NAME = "generated-doc.html";

program
  .name("doc-generator")
  .description("Generate docs from a directory full of scrips")
  .version("1.0.0");

program
  .command("init")
  .description("Initialize directory")
  .action(async () => {
    await initDir(baseDir, RULE_FILE, NOTES_FILE, DOC_NAME);
  });

program
  .command("init-file")
  .description("Create instructions in for a new file")
  .argument("<string>", "file name")
  .action(async (fileName) => {
    let fullPath = baseDir + fileName;
    await initFile(fullPath);
  });

program
  .command("document")
  .description("Document directory based on instructions in files.json")
  .action(async () => {
    await buildDoc(baseDir, RULE_FILE, DOC_NAME);
  });

program.parse();
