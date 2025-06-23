import { readFile, writeFile, appendFile } from "fs/promises";

export async function initFile(fullPath) {
  //fill in the default options in files.json
  //the point of this is that you can check on save
  //you could hook this into nvim, making it so that
  //every time you save a file, this will check if it has been inited
  //if it hasn't, it will
  //that way you get sane ordering. they get imported in the order they're created, unless you override that behavior
  console.log("todo");
}

export async function initDir(baseDir, ruleFile, notesFile, docFile) {
  //make a notes.md and a files.json
  //check if the file exists
  //if so, throw err
  //if not, create
  let alreadyExists = false;
  try {
    let content = await readFile(baseDir + ruleFile, "utf8");
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
          { file: notesFile, handling: "embed", order: 0, notes: "" },
          { file: ruleFile, handling: "ignore" },
          { file: generatedDoc, handling: "ignore" },
        ],
      };
      //create rule file
      await writeFile(
        baseDir + ruleFile,
        JSON.stringify(baseConfigJSON, null, 2),
      );
      //create doc file
      await writeFile(baseDir + docFile, "", "utf8");
      //append notes, these could already exist
      await appendFile(baseDir + notesFile, "", "utf8");
    } catch (e) {
      //let the program err out
      throw e;
    }
  }
}
