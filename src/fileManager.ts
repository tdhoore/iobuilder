import { FileType, Uri, workspace } from "vscode";
const { kebabCase, pascalCase } = require("case-anything");
const { minimatch } = require("minimatch");
import * as fs from "fs";
import { cssFolders, mainCssFileNames, cssExts, boilerplates, rootPath } from "./config";
import { addIndexFileToFolder } from "./cssManager";
import { camelCase } from "case-anything";

interface transformFileType {
  file: Uri;
  urlParts: string[];
  fileName: string;
  boilerplate: string;
}

let cssType: string = "css";
export let mainCssPath: string = "";

const encoder = new TextEncoder();

const createLinkCssFile = (mainPath: string, files: string[]) => {
  const fileContent: string = files.map((file) => `@import '${file}';`).join(`\n`);

  workspace.fs.writeFile(Uri.file(`${mainPath}imports.${cssType}`), encoder.encode(fileContent));
};

const getFilesinFolder = async (mainPath: string) => {
  const allFolders: string[] = [];
  const allFiles: string[] = [];
  const mainFiles = await workspace.fs.readDirectory(Uri.file(mainPath));
  const promises: Promise<[string, FileType]>[] = [];

  mainFiles.forEach((file) => {
    if (!file[0].includes(".")) {
      allFolders.push(file[0]);
      //is folder so return files
      promises.push(
        //@ts-ignore
        workspace.fs.readDirectory(Uri.file(`${mainPath}${file[0]}/`))
      );
    }
  });

  const subFiles = await Promise.all(promises);

  subFiles.forEach((folder, index) => {
    const folderName = allFolders[index];

    folder.forEach((file) => {
      //@ts-ignore
      const fileName = file[0].replaceAll("_", "");

      allFiles.push(`${folderName}/${fileName.substring(0, fileName.lastIndexOf("."))}`);
    });
  });

  return allFiles;
};

export const linkCssFiles = async (): Promise<string> => {
  const cssMainFiles = cssFolders.filter((cssFolder) => fs.existsSync(`${rootPath}${cssFolder.replace("*", "")}`));

  if (cssMainFiles[0]) {
    const pathParts = cssMainFiles[0].split("/");
    pathParts.pop();

    if (pathParts) {
      //for the main path we need the full path to the folder not just the relative path
      //@ts-ignore
      const mainPath = `${rootPath}${pathParts.join("/")}/`;

      mainCssPath = mainPath;
      cssType = await getExtensionFromMainCssFile();

      const files = await getFilesinFolder(mainPath);

      //build the import file with the present files in the main folder
      await createLinkCssFile(mainPath, files);
    }
  }

  return mainCssPath;
};

export const getExtensionFromMainCssFile = () => {
  return workspace.fs.readDirectory(Uri.file(`${mainCssPath}`)).then((files) => {
    let extension = "css";

    files.forEach((file) => {
      const fileName = file[0].split(".")[0];

      if (file[0].includes(".") && mainCssFileNames.includes(fileName)) {
        //is the main index css file
        extension = file[0].split(".")[1];
      }
    });

    return extension;
  });
};

//get the clean class name
//we do this so that we can make as meany mistakes as we like while naming the file the extension will pickup the slack
const getCleanFileName = (fileName: string): string => {
  const fileNameParts = fileName.split(".");

  //has atleast an extension
  //get the file name
  if (fileNameParts.length > 1) {
    fileName = fileNameParts[fileNameParts.length - 2];
  }

  return kebabCase(fileName.toLowerCase().replace(/[^a-z0-9]/g, ""));
};

const transformCssFile = async (file: Uri, pathParts: string[], fileName: string) => {
  const parentFolder = pathParts[pathParts.length - 2];
  const cleanFileName = getCleanFileName(fileName);

  let isMainFolder = false;
  let newName = "";

  //don't edit the main css file
  if (!mainCssFileNames.includes(fileName.split(".")[0])) {
    //check if present in subfolder
    if (
      cssExts.includes(parentFolder) ||
      cssFolders.some((folderPath) => {
        const pathParts = folderPath.split("/").filter((part) => !part.includes("*"));

        return pathParts[pathParts.length - 1] === parentFolder;
      })
    ) {
      isMainFolder = true;

      //is in main folder
      newName = `${cleanFileName}.`;
    } else {
      //is in subfolder
      newName = `_${parentFolder}.${cleanFileName}.`;
    }

    //set extension
    newName += cssType;

    const fileUri = Uri.file(
      pathParts
        .map((part, index) => {
          if (pathParts.length - 1 <= index) {
            //is file name to be edited
            return newName;
          }

          return part;
        })
        .join("/")
    );

    //rename the file
    workspace.fs.rename(file, fileUri).then(() => {
      //link the file
      linkCssFiles();

      //add boiler plate if empty
      cssBoilerPlate(fileUri, { isMainFolder });
    });
  }
};

const fileIsEmpty = async (fileUri: Uri) => {
  const fileContent = await workspace.fs.readFile(fileUri);

  return fileContent.length === 0;
};

const cssBoilerPlate = async (fileUri: Uri, options: any = {}) => {
  if (await fileIsEmpty(fileUri)) {
    const urlParts = fileUri.path.split("/");
    const fileName = urlParts[urlParts.length - 1];
    const fileNameParts = fileName.split(".");

    let css: string = "";

    if (Array.isArray(boilerplates)) {
      boilerplates.forEach((boilerplate) => {
        if (boilerplate.extensions.some((ext) => cssExts.includes(ext))) {
          css = boilerplate.boilerplate.replaceAll("$0", options.isMainFolder ? "" : `${fileNameParts[0][1]}-`).replaceAll("$1", options.isMainFolder ? fileNameParts[0] : fileNameParts[1]);
        }
      });
    }

    await workspace.fs.writeFile(fileUri, encoder.encode(css));
  }
};

const addBoilerPlate = async (fileUri: Uri, boilerplate: string) => {
  if (await fileIsEmpty(fileUri)) {
    const urlParts = fileUri.path.split("/");
    const fileName = urlParts[urlParts.length - 1];

    boilerplate = boilerplate.replaceAll("$0", fileName.split(".")[0]);

    await workspace.fs.writeFile(fileUri, encoder.encode(boilerplate));
  }
};

const transformFile = ({ file, urlParts, fileName, boilerplate }: transformFileType) => {
  const fileParts = fileName.split(".");

  const fileUri = Uri.file(
    urlParts
      .map((part, index) => {
        if (urlParts.length - 1 <= index) {
          //is file name to be edited
          return `${camelCase(fileParts[0])}.${fileParts[fileParts.length - 1]}`;
        }

        return part;
      })
      .join("/")
  );

  //rename the file
  workspace.fs.rename(file, fileUri).then(() => {
    //add boiler plate if empty
    addBoilerPlate(fileUri, boilerplate);
  });
};

export const onUpdateFile = async (file: Uri) => {
  const urlParts = file.path.split("/");
  const fileName = urlParts[urlParts.length - 1];

  //make sure there is an index file
  await addIndexFileToFolder(Uri.file(mainCssPath));

  console.log(
    cssExts,
    urlParts,
    urlParts.some((part) => cssExts.includes(part))
  );

  if (urlParts.some((part) => cssExts.includes(part)) || cssFolders.some((folderPath) => minimatch(file.path, folderPath))) {
    //is part of a css structure
    transformCssFile(file, urlParts, fileName);
  } else if (Array.isArray(boilerplates)) {
    boilerplates.forEach((boilerplate) => {
      if (boilerplate.extensions.some((ext) => fileName.includes(`.${ext}`))) {
        //has boilerplate
        transformFile({
          file,
          urlParts,
          fileName,
          boilerplate: boilerplate.boilerplate,
        });
      }
    });
  }
};

export const onDeleteFile = () => {
  //is part of a css structure
  linkCssFiles();
};
