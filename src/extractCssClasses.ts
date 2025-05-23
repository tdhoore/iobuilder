import { Uri, workspace } from "vscode";
import { getExtensionFromMainCssFile, linkCssFiles, mainCssPath } from "./fileManager";
import { folders, rootPath } from "./config";
import * as fs from "fs";
import { addIndexFileToFolder } from "./cssManager";

interface cssFileClassType {
  base: string;
  path: string;
  classes: string[];
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const extractClassesFromFile = async (file: Uri): Promise<string[]> => {
  const prefixes: string[] = folders.map((name: string) => name[0]);
  const classes: string[] = [];

  await workspace.fs.readFile(Uri.file(file.path)).then((c) => {
    const content = decoder.decode(c);

    const regex = new RegExp(`[${prefixes.join("")}]-[a-z0-9-_]+`, "gi");
    const matches: RegExpExecArray[] = Array.from(content.matchAll(regex));

    matches.forEach((match) => {
      //require a min lenght of 4 in total
      if (match[0].length > 4) {
        classes.push(match[0]);
      }
    });
  });

  return classes;
};
const addMissingClassesToFileContent = (fileContent: string, classes: string[]) => {
  classes.forEach((className) => {
    if (!fileContent.includes(className)) {
      //the class is not present so add it to the content

      if (fileContent !== "") {
        //not empty so add an 2 enters first
        fileContent += `\n\n`;
      }

      fileContent += `.${className} {\n\n}`;
    }
  });

  return fileContent;
};

const writeCssFile = async (cssFileClass: cssFileClassType) => {
  let fileContent: string = "";
  const fileUri: Uri = Uri.file(cssFileClass.path);

  if (fs.existsSync(`${rootPath}${cssFileClass.path}`)) {
    //add the content to the file
    const existingContent = await workspace.fs.readFile(fileUri);

    fileContent = decoder.decode(existingContent);
  }

  //add any missing classes
  fileContent = addMissingClassesToFileContent(fileContent, cssFileClass.classes);

  return workspace.fs.writeFile(fileUri, encoder.encode(fileContent));
};

const buildCssFiles = async (cssFileClasses: cssFileClassType[]) => {
  const promises: Thenable<void>[] = [];

  cssFileClasses.forEach((cssFileClass) => {
    promises.push(writeCssFile(cssFileClass));
  });
};

const createCssFilesBasedOnClasses = async (classes: string[]) => {
  const cssType: string = await getExtensionFromMainCssFile();
  const fileNames: string[] = [];
  const filePaths: string[] = [];
  const cssFileClasses: cssFileClassType[] = [];
  console.log(mainCssPath, cssType);
  //make sure that all base files exist
  //if not create them
  classes.forEach((className: string) => {
    const baseName = className.split("__")[0].split("--")[0];

    if (!fileNames.includes(baseName)) {
      //@ts-ignore
      const folder: string = folders.filter((folderName: any) => folderName[0] === baseName[0])[0];

      //add to files
      fileNames.push(baseName);

      //check if there is a folder for this one
      const filePath: string = `${mainCssPath}${folder}/_${folder}.${baseName.split("-").slice(1).join("-")}.${cssType}`;

      //add to paths
      filePaths.push(filePath);

      cssFileClasses.push({
        base: baseName,
        path: filePath,
        classes: [className],
      });
    } else {
      cssFileClasses.forEach((file) => {
        if (className.includes(file.base)) {
          //is part of this content
          file.classes.push(className);
        }
      });
    }
  });

  return cssFileClasses;
};

export const buildCssFilesFromContent = async (file: Uri) => {
  //make sure there is an index file
  await addIndexFileToFolder(Uri.file(mainCssPath));

  const classes: string[] = await extractClassesFromFile(file);
  const fileClasses: cssFileClassType[] = await createCssFilesBasedOnClasses(classes);

  await buildCssFiles(fileClasses);

  //link the css files
  linkCssFiles();
};
