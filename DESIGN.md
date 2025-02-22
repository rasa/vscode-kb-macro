# Design

## Overview

The aim of this extension is simple, making keyboard macro recording possible on VS Code.

For years no one seemed to have achieved this in a suitable way for practical use. Through this challenge, I have found a couple of difficulties that justify the absence of this kind of extension.

This document covers some of the difficulties and my solutions.

## Recording keystrokes vs. recording commands

First of all, we don't have any VS Code API that allows us to capture command executions at this moment. But, we could imagine that we have an event API for that. Let's name it `onDidExecuteCommand`.

If we could capture all the command executions, is it possible to reproduce the scenario by simply executing all the captured commands by `vscode.commands.executeCommand` API?

No, probably not.

A command may trigger another command. It happens by directly invoking `vscode.commands.executeCommand` in a command or in some way indirectly like making side-effects like document change. So we must distinguish them to execute only the commands that are triggered directly by the user.

On the other hand, capturing keystrokes could be a good solution for reproducing recorded scenarios since a keystroke is always made directly by the user. A keystroke does not trigger another keystroke.

However, we don't have any VS Code API to capture keystrokes directly.

## Capturing keystrokes

We have Keybindings on VS Code. Using that feature we can associate keystrokes with commands.

However, we can't associate every possible keystroke by defining a single keybinding rule (imagine kind of using wildcard `"key": "*"`).

So we end up defining a bunch of wrapper keybindings to capture the whole set of the default keybindings of VS Code.

## Wrapper keybindings

A wrapper keybinding associates a particular combination of `key` and `when` with the `kb-macro.wrap` command with `args` parameter that specifies the target command to be invoked. The `kb-macro.wrap` command executes the target command. This indirect execution makes it possible to capture the command that has been triggered by user's keystrokes.

```json
    {
        "key": "ctrl+shift+a",
        "command": "kb-macro.wrap",
        "args": {
            "command": "editor.action.selectToBracket"
        },
        "when": "kb-macro.active && editorTextFocus"
    }
```

Since we want to use the wrapper command only when needed, we add the `kb-macro.active` context to every wrapper keybinding.

Why don't we use the wrapper keybindings always to simplify things? Because we want to keep the original behavior of each command for the keybindings as much as possible. It is not clear but the indirect execution may not be perfectly transparent.

## Default keybindings wrappers

This extension defines a large set of keybindings to capture all the default keyboard shortcuts of VS Code.

The list of default keybindings wrappers is defined in the [`package.json` of this extension](package.json). The list is automatically generated by a script [`generator/gen_wrapper.js`](generator/gen_wrapper.js). The script takes three keybindings JSON files where each one contains the default keybindings of VS Code for Windows, Linux, and macOS respectively, and combines all the keybindings in them with additional context such as `isWindows`, `isLinux`, or `isMac` as needed, and convert them to wrappers and write them into `keybindings` section of the `package.json`.

| Related files |     |
| ------------- | --- |
| `generator/default-keybindings-win.json` | the default keybindings of VS Code for Windows |
| `generator/default-keybindings-linux.json` | the default keybindings of VS Code for Linux |
| `generator/default-keybindings-mac.json` | the default keybindings of VS Code for macOS |
| `generator/gen_wrapper.js` | a script to generate default keybindings wrappers and write them in `package.json` |
| `generator/verify_wrapper.js` | a script to verify the output of `gen_wrapper.js` |

The `default-keybindings-*.json` files are retrieved by running the `Open Default Keyboard Shortcuts (JSON)` command on VS Code on each OS. In order to mitigate manual work to update these three files for every new release of vscode, [an automated workflow on GitHub Actions](https://github.com/tshino/vscode-kb-macro/actions/workflows/get-default-keybindings.yml) is used. I have created this automated workflow inspired by [this project](https://github.com/codebling/vs-code-default-keybindings). The project provided me with the knowledge of how to retrieve the default keybindings JSON without contamination by extensions or user profiles. I appreciate the great effort for the project.

The following command updates the default keybindings wrappers in the `package.json` based on the default keybindings files.

```
npm run gen-wrapper
```

This script also performs some optimizations, something like tree shaking, to reduce the number of keybinding rules in the `package.json`.

## Keymap wrappers

Many people use their favorite keymap on VS Code by using keymap extensions, such as one for Emacs keybindings. So this extension should work together with those keymap extensions.

A keymap extension defines its keybindings in its `package.json`.

To enable those keybindings to be recorded by this extension, we need to define corresponding wrapper keybindings for each keybinding in the keymap extension. So we did it for some popular keymap extensions. See [Keymap wrappers](keymap-wrapper/README.md).

Making the wrapper keybindings for a keymap extension is not a trivial task, because some of them may require custom `await` options. So we made a configuration file for each keymap extension to customize the generation of the wrappers.

The following command generates the keymap wrappers for all the keymap extensions we support.

```
npm run update-keymap-wrapper
```

This script needs to be run on Bash. Each keymap wrapper is generated based on the latest `package.json` of the keymap extension.

### Why keymap wrappers should be in the user's `keybindings.json` instead of in extensions

A wrapper keybinding should override the original keybinding during recording. If it fails, the keystrokes can't be recorded.

Keybindings in VS Code are defined in at least three different types of sources.

  1. Default keybindings that are built in VS Code
  2. Extensions
  3. User keybindings (`keybindings.json`)

User keybindings have priority over any extensions. And any extensions have priority over the default keybindings.

But as far as I know, it is not defined which extension has priority over other extensions. We don't have even a way to specify which one should have priority over other ones.

This extension defines default keybindings wrappers. They override the default keybindings correctly during recording.

A keymap extension defines its keybindings. They override the default keybindings of VS Code. This is also important.

A keymap wrapper defines wrapper keybindings for the target keymap extension. It should override the keymap extension during recording. It should override the default keybindings wrappers as well. So it can't be defined in any extensions. Consequently, it must be defined in the user keybindings.

## Capturing typed characters

On VS Code, typed characters in text editors are treated differently than other keystrokes. We don't put every possible character in the keybindings. When you type characters in a text editor, for each character, the `type` built-in command is invoked internally. The `type` command performs inserting each character into the document.

As far as I know, an extension is allowed to override the `type` built-in command using `vscode.commands.registerCommand` API. Actually, the [VSCodeVim](https://marketplace.visualstudio.com/items?itemName=vscodevim.vim) extension seems to do that to customize the behavior for typed characters.

It was not clear whether overriding the `type` command to capture typed characters is a good way for this extension. Especially if you use this extension combined with another extension that is overriding the `type` command too, there would be a conflict, and likely they will not work correctly. See [vscode#13441](https://github.com/Microsoft/vscode/issues/13441).

So this extension took another way to capture typed characters. That is to listen to the events on changes on the text document. Basically this is possible through the `vscode.workspace.onDidChangeTextDocument` event.

This is implemented in [`src/typing_detector.js`](src/typing_detector.js).

## Dealing with re-entrance

In VS Code, commands defined in an extension are invoked asynchronously. It means that if multiple keystrokes are made quickly corresponding commands might be invoked concurrently. If a command consists of asynchronous operations such as using `await` for something but still needs to be serialized execution among other commands in the extension, we must deal with re-entrance.

In terms of re-entrance, there are three types of commands that this extension implements.

1. Commands that will fail to execute if other commands are running:
    - `kb-macro.startRecording`
    - `kb-macro.finishRecording`
    - `kb-macro.cancelRecording`
    - `kb-macro.copyMacroAsKeybinding`
    - `kb-macro.playback`
    - `kb-macro.repeatPlayback`
    - `kb-macro.repeatPlaybackTillEndOfFile`
2. Commands that will be processed in FIFO manner with an internal command queue:
    - `kb-macro.wrap`
3. Commands that can be executed anytime without restriction:
    - `kb-macro.abortPlayback`

For example, the command `kb-macro.playback` could take even multiple seconds or more due to a long sequence of a macro, and if the user requests another playback during playback it is not expected to start the new playback immediately. We could delay it and execute it after the former one is finished, however thinking about the case of key repeating, the queued executions can easily become too many than the user expects. So we simply discard the latter request.

In other examples, the command `kb-macro.abortPlayback` is another type of command, and it should be able to be executed during playback to stop it immediately.

These command patterns are implemented in [`src/reentrant_guard.js`](src/reentrant_guard.js).

## Testing

This repository contains a set of tests for this extension.
Tests are in [`test/suite`](test/suite) directory.
```
test/
    suite/
        *.test.js
```
They can be categorized roughly into two types. One is unit tests, and the other is integration tests. A test that has the name `playback_*.test.js` is an integration test, which checks the recording and playback functionality focusing on a certain category of target commands/keybindings or on a functionality of this extension.

The following command runs the tests:
```
npm test
```
And it's [running on GitHub Actions](https://github.com/tshino/vscode-kb-macro/actions/workflows/node.js.yml).

### End-to-end tests

Unfortunately, we don't have any end-to-end tests which are critical for this kind of extension. Because we use [`vscode-test`](https://github.com/microsoft/vscode-test) and it doesn't provide UI level testing functionalities such as sending keystrokes to VS Code.

The lack of end-to-end tests means we can't test the validity of the keybindings defined in the `package.json` through the test based on `vscode-test`.

In order to check the correctness of the keybindings itself, we are running the script `generator/verify_wrapper.js` just after the script `generator/gen_wrapper.js` updates the `package.json` in [the automated workflow](https://github.com/tshino/vscode-kb-macro/actions/workflows/get-default-keybindings.yml). See [Default keybindings wrappers](#default-keybindings-wrappers).
