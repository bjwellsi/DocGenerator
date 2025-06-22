const { Command } = require("commander");
const fs = require("fs").promises;

const program = new Command();

const baseDir = "./testdir/"; //this will be root
const RULE_FILE = "files.json";
const NOTES_FILE = "notes.md";

program
  .name("doc-generator")
  .description("Generate docs from a directory full of scrips")
  .version("1.0.0");

program
  .command("init")
  .description("Initialize directory")
  .action(async () => {
    //make a notes.md and a files.json
    //check if the file exists
    //if so, throw err
    //if not, create
    let alreadyExists = false;
    try {
      let content = await fs.readfile(baseDir + RULE_FILE, "utf8");
      if (content != null) {
        alreadyExists = true;
      }
    } catch (e) {
      //do nothing
    }
    if (alreadyExists) {
      throw Error("Directory already initialized");
    } else {
      try {
        let baseConfigJSON = {
          baseDir: baseDir,
          rules: [
            { file: NOTES_FILE, handling: "embed", order: 0, notes: "" },
            { file: RULE_FILE, handling: "ignore" },
          ],
        };
        await fs.writeFile(
          baseDir + RULE_FILE,
          JSON.stringify(baseConfigJSON, null, 2),
        );
        await fs.appendFile(baseDir + NOTES_FILE, "", "utf8");
      } catch (e) {
        //let the program err out
        throw e;
      }
    }
  });

program
  .command("create-file")
  .description("Create a file with instructions in files.json")
  .action(async () => {
    //fill in the default options in files.json
    console.log("todo");
  });

program
  .command("scan")
  .description(
    "Scan directory for files without instruction sets, creating those defaults",
  )
  .action(async () => {
    //crawl the directory, adding defaults for non-initialized files.
    //if the parent dir of a file is initialized in a way that ignores child files, then don't init those child files
    console.log("todo");
  });

program
  .command("document")
  .description("Document directory based on instructions in files.json")
  .action(async () => {
    //walk thru every option in files.json, adding them to the document per their instruction set
    //you need to find the rules by rule order, but also respect folder rules.

    //get the directory structure
    let discoverDir = async (dir) => {
      let dirContents = await fs.readdir(dir);
      return await Promise.all(
        dirContents.map(async (item) => {
          //find out if the item is a folder or a file
          let fullPath = dir + item;
          let stats = await fs.stat(fullPath);
          if (stats.isFile()) {
            return { type: "file", fullPath: fullPath };
          } else if (stats.isDirectory()) {
            fullPath += "/";
            return {
              type: "folder",
              fullPath: fullPath,
              contents: await discoverDir(fullPath),
            };
          } else throw "Invalid item type";
        }),
      );
    };

    let rules = JSON.parse(await fs.readFile(baseDir + RULE_FILE, "utf8"));
    let dirContents = await discoverDir(rules.baseDir);
    console.log("todo - validate ruleset before applying rules");
    console.log("dir structure\n", dirContents);
    console.log("rules\n", rules);

    //okay now you've got an array of rules and an object that matches your folder structure.
    //so now you can walk through that object, following the rules of the given object in that rule object

    let fullDoc = [];
    let parseDir = async (docs, dir) => {
      let findItemIndex = (currentArr, rule) => {
        //find the order that this item belongs in the master array
        //will return the index where the new item belongs.
        //so if current array is [a, b, c],
        //and d needs to be inserted right before b,
        //the returned index will be 1
        //if instead it belongs at the end of the array, it returns 3. (a currently out of bounds index)
        let i;
        if (rule.order == null) {
          //start from the end, walk until you find an element that is null or has order >= 0 or the start of the arr
          i = currentArr.length - 1;
          while (i >= 0) {
            if (
              currentArr[i].rule.order == null ||
              currentArr[i].rule.order >= 0
            ) {
              break;
            }
            i--;
          }
          //the new item needs to be inserted right after the current value of i - so if i is 0, new item ends up at 1
          i++;
        } else if (rule.order < 0) {
          //start from the end, walk until you find an element that is less than it, or is null, or is positive, or the start of the arr
          //-1 order means you go closer to the end of the array than -2
          i = currentArr.length - 1;
          while (i >= 0) {
            if (
              currentArr[i].rule.order < rule.order ||
              currentArr[i].rule.order == null ||
              currentArr[i].rule.order >= 0
            ) {
              break;
            }
            i--;
          }
          //the new item needs to be inserted right after the current value of i - so if i is 0, new item ends up at 1
          i++;
        } else {
          //order is positive
          //start from the start of the array, walk until you find an element that is null, or has an order that is greater than it, or is negative (or the end of the arr)
          i = 0;
          while (i < currentArr.length) {
            if (
              currentArr[i].rule.order > rule.order ||
              currentArr[i].rule.order == null ||
              currentArr[i].rule.order < 0
            ) {
              //i is at the right index. shift the array to the right
              break;
            }
            i++;
          }
        }
        return index;
      };
      await Promise.all(
        dir.foreach(async (item) => {
          //basically find the rule for the item, put the item into the doc in the correct order,
          //and then either move on to the next item or crawl the subdir
          //find the rule for the given item
          let rule = rules.rules.find((rule) => {
            if (item.name == rules.baseDir + rule.file) return true;
            else return false;
          });
          if (rule == null) {
            //if no rule exists, create it
            rule = {
              handling: null,
              order: null,
              notes: null,
            };
          }
          //set rule defaults
          //universal defaults
          rule.order = rule.order == null ? -1 : rule.order;
          rule.notes = rule.notes == null ? item.name : rule.notes;
          if (item.type == "file") {
            //file defaults
            rule.handling = rule.handling == null ? "embed" : rule.handling;
          }
          if (item.type == "folder") {
            //folder defaults
            rule.handling = rule.handling == null ? "compress" : rule.handling;
          }
          //now apply the rules
          if (rule.handling != "ignore") {
            if (item.type == "file") {
              let docContents = { rule: rule, contents: null };
              if (rule.handling == "embed") {
                console.log("todo - add the exact contents of the file");
                docContents.contents = null;
              } else if (rule.handling == "attach") {
                console.log("todo - add the file itself");
                docContents.contents = null;
              }
              let index = findItemIndex(fullDoc, rule);
              docs.splice(index, 0, docContents);
            } else if (item.type == "folder") {
              //if its treatment calls for including the folder itself
              if (rule.handling == "compress") {
                let docContents = { rule: rule, contents: null };
                console.log("todo - compress folder");
                docs.splice(index, 0, docContents);
              } else if (rule.handling == "fan-out") {
                await parseDir(docs, item.contents);
              }
            }
          }
        }),
      );
    };

    console.log("todo");
  });

program.parse();
