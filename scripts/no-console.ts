import { Node, Project } from 'ts-morph';

interface ConsoleTableEntry {
  "File": string;
  "Line": number;
  "Statement": string;
}

const main = async (glob: string, fix: boolean) => {
  // If no file glob was provided, print an error message with an example of how to use the script
  if (!glob) {
    console.error(
      `Please provide a file glob where to search for console statements. Example:\
      \nts-node [ path-to-no-console-script ] --glob='./(src|apps|libs)/**/!(*.test|*.spec).(ts|tsx)'`,
    );
    // Exit the process with an error code
    process.exit(1);
  }

  // Create a new Project instance
  const project = new Project({
    // Set the path to the tsconfig
    tsConfigFilePath: "./tsconfig.json",
    // Don't add files from tsconfig.json because we add them manually
    skipAddingFilesFromTsConfig: true,
  });

  // Add files that match the pattern
  project.addSourceFilesAtPaths(glob);


  // Get the root directory full path. We need it to get a relative path to the source file
  const rootDirectoryPath = getRootDirectoryPath(project);

  const table: ConsoleTableEntry[] = [];

  // Walk through all source files
  // biome-ignore lint/complexity/noForEach: for..of supports in ES2015+ only
  project.getSourceFiles().forEach(async (sourceFile) => {
    const path = `.${sourceFile.getFilePath().split(rootDirectoryPath)[1]}`;
    console.log(`Checking ${path}...`);
    // Walk through all descendants of the source file
    sourceFile.forEachDescendant((node, _traversal) => {
      // Check if the node we are visiting is an expression statement
      if (Node.isExpressionStatement(node)) {
        // Get the expression of the expression statement
        const expression = node.getExpression();
        // Check if the expression starts with "console."
        if (expression.getText().startsWith("console.")) {
          // Here is a workaround to get the relative path of the file
          const relativePathToSourceFile = `.${sourceFile.getFilePath().split(rootDirectoryPath)[1]}`;
          // Push the relative path of the file, line number, and the console statement to the table
          table.push({
            File: relativePathToSourceFile,
            Line: node.getStartLineNumber(),
            Statement: expression.getText().split("(")[0],
          });

          // If expression contains `console.`, and if the `--fix` argument was passed to the script, remove the expression statement
          if (fix) {
            console.warn(
              `Removing console statement in ${relativePathToSourceFile} on line ${node.getStartLineNumber()} ...`,
            );
            node.remove();
          }
        }
      }
    });
    // Save the source file if it has been modified
    !sourceFile.isSaved() && await sourceFile.save();
  });

  // If the `--fix` argument was not passed to the script, print a warning with the total number of console statements found
  if (!fix && table.length > 0) {
    console.warn(`Found ${table.length} console statements:`);
    console.table(table);
    console.warn("Pass a --fix argument to the script to remove all console statements");
  } else {
    console.log(`Congratulations! You have no console statements in ${glob}`);
  }

  if (fix && table.length > 0) {
    console.log(`\nRemoved ${table.length} console statements:`);
    console.table(table);
  }
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