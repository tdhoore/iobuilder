import { workspace } from "vscode";

export interface boilerplateType {
  extensions: string[];
  boilerplate: string;
}

export const rootPath = workspace.workspaceFolders![0].uri.path + "/";

export const cssFolders: string[] =
  //@ts-ignore
  workspace.getConfiguration().get("ioBuilder.fileExtentions.cssFolders").replaceAll(" ", "").split(",") || [];

export const cssExts: string[] =
  //@ts-ignore
  workspace.getConfiguration().get("ioBuilder.fileExtentions.mainCssFileNames").replaceAll(" ", "").split(",") || [];

export const mainCssFileNames: string[] =
  //@ts-ignore
  workspace.getConfiguration().get("ioBuilder.fileExtentions.mainCssFileNames").replaceAll(" ", "").split(",") || [];

export const boilerplates: boilerplateType[] | undefined = workspace.getConfiguration().get("ioBuilder.boilerplates");

export const inputPaths: string[] =
  //@ts-ignore
  workspace.getConfiguration().get("ioBuilder.cssBuilder.inputs").replaceAll(" ", "").split(",") || [];

export const folders: string[] =
  //@ts-ignore
  workspace.getConfiguration().get("ioBuilder.cssBuilder.folders").replaceAll(" ", "").split(",") || [];
