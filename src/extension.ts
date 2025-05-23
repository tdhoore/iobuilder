import * as vscode from "vscode";
import { linkCssFiles, onUpdateFile, onDeleteFile } from "./fileManager";
import createBoilerplate from "./boilerplateGenerator";
import { addCssFolder } from "./cssManager";
import convertFonts from "./FontConverter";
import { buildCssFilesFromContent } from "./extractCssClasses";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  //this function is used to set some default values we'll use throughout the extension
  //we need it to setup first and then start listening for events
  linkCssFiles().then(() => {
    context.subscriptions.push(
      vscode.workspace.onDidCreateFiles(function (e) {
        onUpdateFile(e.files[0]);
      })
    );

    context.subscriptions.push(
      vscode.workspace.onDidDeleteFiles(function (e) {
        onDeleteFile();
      })
    );

    context.subscriptions.push(
      vscode.workspace.onDidRenameFiles(function (e) {
        onUpdateFile(e.files[0].newUri);
      })
    );
  });

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json

  //we need this command to start the extension and listen for events
  const disposable = vscode.commands.registerCommand("iobuilder.init", () => {});

  //add context option to create a template from file
  context.subscriptions.push(
    vscode.commands.registerCommand("iobuilder.createTemplate", (file) => {
      createBoilerplate(file);
    })
  );

  //add context option to add css folder to css folders
  context.subscriptions.push(
    vscode.commands.registerCommand("iobuilder.addCssFolders", (file) => {
      addCssFolder(file);
    })
  );

  //get all the classes of a file
  context.subscriptions.push(
    vscode.commands.registerCommand("iobuilder.buildCssFiles", (file) => {
      buildCssFilesFromContent(file);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("iobuilder.buildFonts", (folder) => {
      convertFonts(folder);
    })
  );

  context.subscriptions.push(disposable);

  //used to start running instantly
  vscode.commands.executeCommand("iobuilder.init");
}

// This method is called when your extension is deactivated
export function deactivate() {}
