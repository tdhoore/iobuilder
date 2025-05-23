import { ConfigurationTarget, Uri, workspace } from "vscode";
import { boilerplateType, boilerplates } from "./config";

let newBoilerplates: boilerplateType[] | undefined = boilerplates;

const buildBoilerplate = async (file: Uri, ext: string) => {
  const newBoilerPlate = {
    extensions: [ext],
    boilerplate: "",
  };

  const doc = await workspace.openTextDocument(file);

  newBoilerPlate.boilerplate = doc.getText();

  return newBoilerPlate;
};

export default async (file: Uri) => {
  const pathParts = file.path.split(".");
  const ext = pathParts[pathParts.length - 1];

  //check if there is a boilerplate
  if (Array.isArray(newBoilerplates)) {
    let toUpdateIndex = -1;

    newBoilerplates.forEach((boilerplate, index) => {
      if (boilerplate.extensions.some((bExts) => bExts.includes(ext))) {
        //boilerplate exists
        toUpdateIndex = index;
      }
    });

    if (toUpdateIndex !== -1) {
      const newBoilerplate = await buildBoilerplate(file, ext);

      newBoilerplates[toUpdateIndex] = {
        ...newBoilerplate,
        extensions: [...new Set([...newBoilerplates[toUpdateIndex].extensions, ...newBoilerplate.extensions])],
      };
    }
  } else {
    newBoilerplates = [];
  }

  workspace.getConfiguration().update("ioBuilder.boilerplates", newBoilerplates, ConfigurationTarget.Global);
};
