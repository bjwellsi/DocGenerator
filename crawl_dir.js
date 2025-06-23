import { writeFile, appendFile, readFile, stat, readdir } from "fs/promises";

let discoverDir = async (dir) => {
  let dirContents = await readdir(dir);
  return await Promise.all(
    dirContents.map(async (item) => {
      //find out if the item is a folder or a file
      let fullPath = dir + item;
      let stats = await stat(fullPath);
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
      if (currentArr[i].rule.order == null || currentArr[i].rule.order >= 0) {
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
  return i;
};

let parseDir = (rules, dirMetaData) => {
  let docs = [];
  let recurse = (dirMetaData) => {
    dirMetaData.forEach((item) => {
      //basically find the rule for the item, put the item into the doc in the correct order,
      //and then either move on to the next item or crawl the subdir
      //find the rule for the given item
      let rule = rules.rules.find((rule) => {
        if (item.fullPath == rules.baseDir + rule.file) return true;
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
      rule.notes = rule.notes == null ? item.fullPath : rule.notes;
      if (item.type == "file") {
        //file defaults
        rule.handling = rule.handling == null ? "embed" : rule.handling;
      }
      if (item.type == "folder") {
        //folder defaults    console.log(fullDoc);

        rule.handling = rule.handling == null ? "compress" : rule.handling;
      }

      //now build the ordered rule array
      if (rule.handling != "ignore") {
        if (item.type == "folder" && rule.handling == "fan-out") {
          recurse(item.contents);
        } else if (
          (item.type == "file" &&
            (rule.handling == "embed" || rule.handling == "attach")) ||
          (item.type == "folder" && rule.handling == "compress")
        ) {
          let docContents = { rule: rule, contents: item };
          let index = findItemIndex(docs, rule);
          docs.splice(index, 0, docContents);
        } else {
          throw "Invalid rule handling or item type";
        }
      }
    });
  };
  recurse(dirMetaData);
  return docs;
};

let populateDocFromArray = async (baseDir, docDefinitionArray, docFile) => {
  let docFileFullPath = baseDir + docFile;
  //overwrite any existing doc
  await writeFile(docFileFullPath, "", "utf8");
  for (let item of docDefinitionArray) {
    //add the object's note
    await appendFile(
      docFileFullPath,
      "todo - handle object notes - " + item.rule.notes + "\n",
      "utf8",
    );
    //handle according to the rules
    if (item.contents.type == "folder" && item.rule.handling == "compress") {
      let todo = "todo, folder compress rule - ";
      console.log(todo);
      await appendFile(docFileFullPath, todo + item.contents.fullPath, "utf8");
    } else if (item.contents.type == "file" && item.rule.handling == "embed") {
      let todo = "todo, file embed rule - ";
      console.log(todo);
      let fileContent = await readFile(item.contents.fullPath, "utf8");
      await appendFile(
        docFileFullPath,
        todo + item.contents.fullPath + "\n" + fileContent,
        "utf8",
      );
    } else if (item.contents.type == "file" && item.rule.handling == "attach") {
      let todo = "todo, file attach rule - ";
      console.log(todo);
      await appendFile(docFileFullPath, todo + item.contents.fullPath, "utf8");
    }
    await appendFile(docFileFullPath, "\n\n", "utf8");
  }
  //add footer
  await appendFile(docFileFullPath, "", "utf8");
};

export async function buildDoc(baseDir, ruleFile, docFile) {
  let rules = JSON.parse(await readFile(baseDir + ruleFile, "utf8"));
  let dirContents = await discoverDir(rules.baseDir);

  //okay now you've got an array of rules and an object that matches your folder structure.
  //so now you can walk through that array, building the ordered array of rules that the doc will use
  let fullDoc = parseDir(rules, dirContents);

  //now that you have the full doc in order, you can just build it according to the rules given
  populateDocFromArray(baseDir, fullDoc, docFile);
  console.log("todo");
}
