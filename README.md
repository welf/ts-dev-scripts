# TypeScript Developer Tools

## Description

A collection of AST ([Abstract Syntax Tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree)) transformation scripts to automate tedious tasks in TypeScript codebases.

As your codebase grows, it becomes difficult to make a refactoring, enforce a certain coding style, or add some new functionality in many places. This repository contains scripts that help you to automate these tasks using scripts that traverse the AST of your TypeScript codebase, detect certain patterns, and modify the codebase accordingly. These scripts are written in TypeScript and use [ts-morph](https://github.com/dsherret/ts-morph) library to traverse and modify the codebase.

You can paste (the part) of your code into the [TypeScript AST Viewer](https://ts-ast-viewer.com/) to see the AST of your code. This will help you to understand how the scripts work.

## Usage

First, you need to install dev dependencies:

```bash
npm install typescript ts-node ts-morph --save-dev
```

Then copy the script you want to use to your project. I suggest you to put scripts to the separate directory (e.g. `./scripts/`) and add exclude it from compilation in `tsconfig.json`:

```json
{
  "compilerOptions": {
    // ...
  },
  "exclude": ["node_modules", "dist", "scripts"]
}
```

Then you can add commands to your `package.json`. You may look at the [`package.json`](./package.json) file in this repository for inspiration.

### Common patterns in scripts usage

Here are some common patterns used in any script:

1. To run the script, run `ts-node ./<your-scripts-directory>/<script-name> --glob='<your-glob>'`.
2. Every script needs a `glob` parameter, which is a path to the files you want to be traversed by the script. E.g. if you want the script to traverse all `.ts` and `.tsx` files in `src/` directory and its subdirectories, you can use `--glob='src/**/*.(ts|tsx)'`. If you don't provide the `glob` parameter, the script will print the help message to the `stderr` and exits with code 1.
3. Running any script with `glob` parameter only **is not destructive**! The script **will not modify** your codebase. It only prints the table with the changes it will make if you pass the `--fix` parameter. E.g. if you run a `no-console` script with the `glob` parameter only, it will print the table with files and line numbers where the `console` calls are found.
4. If you want to apply the changes, you need to run the script with `--fix` parameter. E.g. `ts-node ./<your-scripts-directory>/<script-name> --glob='src/**/*.(ts|tsx)' --fix`. It will print the table with files and line numbers where the `console` calls were removed.

**NOTE**: Exclude in your `glob` parameter the `node_modules` and the `dist` directories. Or pass only those directories where **your** code is located. E.g. `prisma` generates a lot of the boilerplate code and you definitely don't want to touch it with the script.

## Scripts

### [`no-console`](./scripts/no-console.ts)

Parses the code to the Abstract Syntax Tree and traverses all its nodes to find `console.*` calls.

If you don't pass the `--fix` parameter, it will only print the table with files and line numbers where the `console` calls are found.

Pass the `--fix` parameter to remove all `console` calls from the codebase. The script will notify you about the changes it made.

### [`no-unused-exports`](./scripts/no-console.ts)

Although you can add to the `compilerOptions` in `tsconfig.json` the `noUnusedLocals` option, developers often bypass it by exporting unused variables, classes, enums, interfaces, etc. As your codebase grows, the number of unused exports will grow too.

This script finds all the exports with no references in other files and removes the `export` keyword from such the exported declarations (if you pass the `--fix` parameter to the script). If the `--fix` parameter is not passed, the script will only print the table with files, line numbers, and unused declaration types and names, where the unused exports are found.

**NOTE:** Let the script traverse all your codebase. If you exclude some directories, the script will not be able to check for an external reference of the exported declaration in excluded files. This can result in false positives.

**NOTE:** The script **will not remove** the unused exported declarations. It only removes the `export` keyword from the declaration and leaves the declaration in the codebase even if it has no references at all. Set the `noUnusedLocals` option in the `compilerOptions` in `tsconfig.json` to `true` to let the TypeScript compiler notify you about unused declarations after the script had removed the `export` keyword from them.
