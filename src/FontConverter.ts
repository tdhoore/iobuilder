import { Uri, workspace } from "vscode";
import ttfMeta from "ttfmeta";
const { kebabCase } = require("case-anything");
const { convertAllFonts } = require("@hayes0724/web-font-converter");

interface fontInfoType {
  fontPath: string;
  fontFamily: string;
  weight: number;
  isItalic: boolean;
  fontCode: string;
}

const rootPath = workspace.workspaceFolders![0].uri.fsPath;
const encoder = new TextEncoder();

const getFontInfo = async (fontPath: string): Promise<fontInfoType> => {
  const fontData = await ttfMeta.promise(fontPath);

  return {
    fontPath: fontPath,
    fontFamily: fontData.meta.property[0].text,
    weight: parseInt(fontData.tables.os2.weightClass),
    //@ts-ignore
    isItalic: fontData.tables.post.italicAngle > 0 || fontPath.includes("italic"),
    fontCode: "",
  };
};

const createScssContent = (fontInfo: fontInfoType) => {
  let result = "";
  const fontTypes: string[] = ["woff2", "woff"];
  const fontPath: string = fontInfo.fontPath.replace(rootPath, "").replace(/\..*$/, "");

  result += `@font-face {\n`;
  result += `  font-family: '${fontInfo.fontFamily}';\n`;
  result += `  src: `;

  fontTypes.forEach((fontType, index) => {
    result += `url('@${fontPath}.${fontType}') format('${fontType}')`;

    if (index < fontTypes.length - 1) {
      //is not last item so add comma
      result += `, `;
    }
  });

  result += `;\n`;
  result += `  font-weight: ${fontInfo.weight};\n`;
  result += `  font-style: ${fontInfo.isItalic ? "italic" : "normal"};\n`;
  result += `}\n`;

  return result;
};

const createCssFontFile = (fontInfos: fontInfoType[], folder: string) => {
  const content: string = fontInfos.map((fontInfo) => fontInfo.fontCode).join("\n");

  const folderParts: string[] = folder.split("/");
  folderParts.length = folderParts.length - 1; //remove last item

  workspace.fs.writeFile(Uri.file(`${rootPath}/${folderParts.join("/")}/settings/_settings.fonts.css`), encoder.encode(content));
};

const buildCssFontFiles = (fontInfos: fontInfoType[]) => {
  //find all existing css output folders
  //@ts-ignore
  const cssFolders: string[] = workspace.getConfiguration().get("ioBuilder.fileExtentions.cssFolders").split(",");

  cssFolders.forEach((folder: string) => {
    workspace.findFiles(folder).then((files: Uri[]) => {
      //if files present that meas the folder exists
      if (files.length) {
        createCssFontFile(fontInfos, folder);
      }
    });
  });
};

const convertFont = async (folderPath: string, fontPath: string) => {
  const fontInfo: fontInfoType = await getFontInfo(fontPath);
  const fontPathParts: string[] = fontPath.split("/");
  const fontName: string = fontPathParts[fontPathParts.length - 1];
  const newFontPath = `${folderPath}/${kebabCase(fontName.split(".")[0])}.${fontName.split(".")[1]}`;

  await workspace.fs.rename(Uri.file(fontPath), Uri.file(newFontPath));

  return { ...fontInfo, path: newFontPath, fontCode: createScssContent(fontInfo) };
};

export default async (folder: Uri) => {
  const files = await workspace.fs.readDirectory(folder);
  const fileDataPromises: Thenable<any>[] = [];

  files.forEach((fileContent) => {
    const fileName: string = fileContent[0];

    if (fileName.includes("otf") || fileName.includes("ttf")) {
      //needs to be converted
      fileDataPromises.push(convertFont(folder.path, `${folder.path}/${fileName}`));
    }
  });

  Promise.all(fileDataPromises).then((fontInfos) => {
    //
    buildCssFontFiles(fontInfos);

    //convert all the fonts
    convertAllFonts({
      pathIn: folder.path,
      pathOut: folder.path,
      inputFormats: [".ttf", ".otf"],
      outputFormats: [".woff", ".woff2"],
      debug: false,
    });
  });
};
