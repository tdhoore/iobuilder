import { minimatch } from "minimatch";
import { ConfigurationTarget, Uri, workspace } from "vscode";
import { inputPaths, cssFolders, mainCssFileNames, cssExts } from "./config";
import { mainCssPath } from "./fileManager";
import * as fs from "fs";

const encoder = new TextEncoder();

const isPartOfCssBuilder = (uri: Uri) => {
  let result = false;

  [...inputPaths, ...cssFolders].forEach((path: string) => {
    if (minimatch(uri.fsPath, path)) {
      result = true;
    }
  });

  console.log(result);

  return result;
};

const addFileToConfig = (uri: Uri, configName: string) => {
  //@ts-ignore
  const inputPaths: string[] = workspace.getConfiguration().get(configName).split(",");
  const rootPath = workspace.workspaceFolders![0].uri.path + "/";

  workspace.getConfiguration().update(configName, [...inputPaths, `${uri.fsPath.replace(rootPath, "")}/*`].join(","), ConfigurationTarget.Global);
};

export const addCssInput = async (uri: Uri) => {
  if (!isPartOfCssBuilder(uri)) {
    //is not present so add it
    addFileToConfig(uri, "ioBuilder.cssBuilder.inputs");
  }
};

export const addIndexFileToFolder = async (uri: Uri) => {
  const folderfiles = fs.readdirSync(uri.path.substring(1));

  if (!folderfiles.filter((folderfile) => cssExts.some((cssExt) => folderfile.includes(cssExt)) && mainCssFileNames.some((mainCssFileName) => folderfile.includes(mainCssFileName))).length) {
    //no file present so create one
    workspace.fs.writeFile(Uri.file(`${uri.path}/index.css`), encoder.encode(""));
  }
};

export const addCssFolder = async (uri: Uri) => {
  if (!isPartOfCssBuilder(uri)) {
    //is not present so add it
    addFileToConfig(uri, "ioBuilder.fileExtentions.cssFolders");

    //make sure a main css is present
    addIndexFileToFolder(uri);
  }
};
