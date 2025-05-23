import { minimatch } from "minimatch";
import { ConfigurationTarget, Uri, workspace } from "vscode";
import { inputPaths, cssFolders, mainCssFileNames, cssExts } from "./config";

const encoder = new TextEncoder();

const isPartOfCssBuilder = (uri: Uri) => {
  let result = false;

  [...inputPaths, ...cssFolders].forEach((path: string) => {
    if (minimatch(uri.fsPath, path)) {
      result = true;
    }
  });

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

const addIndexFileToFolder = async (uri: Uri) => {
  //@ts-ignore
  const path = `**${uri.path}/{${mainCssFileNames.join(",")}}.{${cssExts.join(",")}}`.replace(workspace.workspaceFolders[0].uri.path, "");

  const indexFiles = await workspace.findFiles(path);

  if (!indexFiles.length) {
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
