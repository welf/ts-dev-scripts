import { ExportedDeclarations, Node, Project, SourceFile } from 'ts-morph';

interface ConsoleTableEntry {
  ["File"]: string;
  ["Line"]: number;
  ["Type"]: string;
  ["Name"]: string;
}

interface DeclarationEntry extends ConsoleTableEntry {
  declaration: ExportedDeclarations;
}

const main = async (glob: string, fix: boolean) => {
  // If no file glob was provided, print an error message with an example of how to use the script
  if (!glob) {
    console.error(
      `Please provide a file glob where to search for unused exports. Example:\
      \nts-node [ path-to-no-unused-exports-script ] --glob='./(src|apps|libs)/**/*.(ts|tsx)'`,
    );
    // Exit the process with an error code
    process.exit(1);
  }
  // Create a new project instance
  const project = new Project({
    // Specify the path to the tsconfig.json file
    tsConfigFilePath: './tsconfig.json',
    // Skip adding files from the tsconfig.json file because we add them manually later
    skipAddingFilesFromTsConfig: true
  });

  // Add source files where to search for unused entities
  // project.addSourceFilesAtPaths('./(src|apps|libs)/**/*.(ts|tsx)');
  project.addSourceFilesAtPaths(glob);

  // Get the root directory full path. We need it to get a relative path to the source file
  const rootDirectoryPath = getRootDirectoryPath(project);

  const unusedExports: ConsoleTableEntry[] = [];

  // Walk through all source files
  project.getSourceFiles().forEach((sourceFile) => {
    const unusedExportDeclarations = getUnusedExportDeclarations(
      sourceFile,
      rootDirectoryPath
    );

    unusedExportDeclarations.forEach((declarationEntry) => {
      const { declaration, ...rest } = declarationEntry;

      // add the information to the unusedExports array
      unusedExports.push(rest);

      // If the --fix or --removeUnusedExportsOnly flag is set to true, remove the export from the declaration
      if (fix) {
        const { ["Name"]: name } = declarationEntry;

        // Get the grandparent of the declaration if it is a variable declaration
        // because the variable declaration is wrapped in a variable statement
        const decl = declaration.getKindName() === "VariableDeclaration"
          ? declaration.getParent()?.getParent()
          : declaration;

        if (decl && Node.isExportable(decl)) {
          console.warn(`Removing export from ${decl.getKindName()} ${name}`);
          decl.setIsExported(false);
        }
      }
    });

    !sourceFile.isSaved() && sourceFile.save();

  });

  if (unusedExports.length === 0) {
    console.log("No unused exports found");
    return;
  }

  if (unusedExports.length > 0 && !fix) {
    console.warn("The following exports have no external references and the export keyword can be removed:");
    console.table(unusedExports);
    console.warn("Pass the --fix flag to the script to remove unused exports");
    return;
  }

  if (fix) {
    console.log("\nThe following exports have been removed:");
    console.table(unusedExports);
    console.log("You have no unused exports now!");
  }
};

const getUnusedExportDeclarations = (
  sourceFile: SourceFile,
  rootDirectoryPath: string): DeclarationEntry[] => {
  const unusedExports: DeclarationEntry[] = [];

  // Walk through all exported entities of the source file
  for (const [name, declarations] of sourceFile.getExportedDeclarations()) {
    // Walk through all declarations of the exported entity
    declarations.forEach(declaration => {
      // Check if the declaration is reference findable
      if (Node.isReferenceFindable(declaration)) {
        // Check if the declaration has at least one external reference
        const hasExternalReference = declaration
          .findReferencesAsNodes()
          .some(reference => reference.getSourceFile() !== sourceFile);

        // If the declaration has at least one external reference, skip it
        if (hasExternalReference) {
          return;
        }

        // Here is a workaround to get the relative path of the file to the root directory
        const relativePathToSourceFile = '.' + sourceFile.getFilePath().split(rootDirectoryPath)[1];

        unusedExports.push({
          ["File"]: relativePathToSourceFile,
          ["Line"]: declaration.getStartLineNumber(),
          ["Type"]: declaration.getKindName(),
          ["Name"]: name,
          declaration
        });
      }
    });
  }

  return unusedExports;
};

const getRootDirectoryPath = (project: Project): string => {
  try {
    return project.getRootDirectories()[0]
      .getPath()
      .split("/")
      .slice(0, -1)
      .join("/");
  } catch (error) {
    console.error("Failed to get the root directory path. Check the --glob argument passed and try again");
    process.exit(1);
  }
};

// get arguments from the command line
const args = process.argv.slice(2);
// get the glob argument
const glob = args.find(arg => arg.startsWith("--glob="))?.split("=")[1] ?? "";
// get the --fix argument
const fix = args.includes("--fix");

main(glob, fix);
