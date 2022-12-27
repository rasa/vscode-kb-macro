'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { TestUtil } = require('./test_util.js');
const { AwaitController } = require('../../src/await_controller.js');
const { KeyboardMacro } = require('../../src/keyboard_macro.js');

describe('KeybaordMacro', () => {
    const awaitController = AwaitController();
    const keyboardMacro = KeyboardMacro({ awaitController });

    before(async () => {
        vscode.window.showInformationMessage('Started test for KeyboardMacro.');
    });

    describe('onChangeRecordingState', () => {
        beforeEach(async () => {
            keyboardMacro.cancelRecording();
        });
        it('should set callback function', async () => {
            const logs = [];
            keyboardMacro.onChangeRecordingState(({ recording, reason }) => {
                logs.push([ recording, reason ]);
            });

            keyboardMacro.startRecording();
            keyboardMacro.finishRecording();
            keyboardMacro.startRecording();
            keyboardMacro.cancelRecording();

            assert.deepStrictEqual(logs, [
                [ true, keyboardMacro.RecordingStateReason.Start ],
                [ false, keyboardMacro.RecordingStateReason.Finish ],
                [ true, keyboardMacro.RecordingStateReason.Start ],
                [ false, keyboardMacro.RecordingStateReason.Cancel ]
            ]);
        });
    });
    describe('onChangeActiveState', () => {
        beforeEach(async () => {
            keyboardMacro.cancelRecording();
        });
        it('should set callback function', async () => {
            const logs = [];
            keyboardMacro.onChangeActiveState(({ active }) => {
                logs.push(active);
            });

            keyboardMacro.startRecording();
            keyboardMacro.finishRecording();
            keyboardMacro.startRecording();
            keyboardMacro.cancelRecording();

            assert.deepStrictEqual(logs, [
                true,
                false,
                true,
                false
            ]);
        });
    });
    describe('onChangePlaybackState', () => {
        beforeEach(async () => {
            keyboardMacro.cancelRecording();
        });
        it('should set callback function', async () => {
            const logs = [];
            keyboardMacro.onChangePlaybackState((event) => {
                logs.push(event);
            });
            keyboardMacro.registerInternalCommand('internal:delay', async () => {
                await TestUtil.sleep(100);
            });

            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:delay' });
            keyboardMacro.finishRecording();

            await keyboardMacro.playback();
            const promise = keyboardMacro.playback();
            keyboardMacro.abortPlayback();
            await promise;

            assert.deepStrictEqual(logs, [
                { playing: true, reason: keyboardMacro.PlaybackStateReason.Start },
                { playing: false, reason: keyboardMacro.PlaybackStateReason.Finish },
                { playing: true, reason: keyboardMacro.PlaybackStateReason.Start },
                { playing: false, reason: keyboardMacro.PlaybackStateReason.Abort }
            ]);
        });
    });
    describe('onBeginWrappedCommand, onEndWrappedCommand', () => {
        const logs = [];
        beforeEach(async () => {
            keyboardMacro.cancelRecording();
            logs.length = 0;
            keyboardMacro.registerInternalCommand('internal:log', () => {
                logs.push('invoked');
            });
        });
        afterEach(async () => {
            keyboardMacro.onBeginWrappedCommand(null);
            keyboardMacro.onEndWrappedCommand(null);
        });
        it('should set callback function', async () => {
            keyboardMacro.onBeginWrappedCommand(() => { logs.push('begin'); });
            keyboardMacro.onEndWrappedCommand(() => { logs.push('end'); });

            keyboardMacro.startRecording();
            await keyboardMacro.wrapSync({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [ 'begin', 'invoked', 'end' ]);
        });
    });
    describe('startRecording', () => {
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
        });
        it('should activate recording state', async () => {
            keyboardMacro.startRecording();

            assert.strictEqual(keyboardMacro.isRecording(), true);
        });
        it('should invoke callback function', async () => {
            const logs = [];
            keyboardMacro.onChangeRecordingState(({ recording, reason }) => {
                logs.push({ recording, reason });
            });

            keyboardMacro.startRecording();

            assert.deepStrictEqual(logs, [
                { recording: true, reason: keyboardMacro.RecordingStateReason.Start }
            ]);
        });
        it('should ignore multiple calls', async () => {
            const logs = [];
            keyboardMacro.onChangeRecordingState(({ recording, reason }) => {
                logs.push({ recording, reason });
            });

            keyboardMacro.startRecording(); // 1
            keyboardMacro.startRecording(); // 2

            assert.strictEqual(keyboardMacro.isRecording(), true);
            assert.deepStrictEqual(logs, [
                { recording: true, reason: keyboardMacro.RecordingStateReason.Start }
            ]);
        });
    });
    describe('cancelRecording', () => {
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
        });
        it('should deactivate recording state', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.cancelRecording();

            assert.strictEqual(keyboardMacro.isRecording(), false);
        });
        it('should invoke callback function', async () => {
            const logs = [];
            keyboardMacro.startRecording();
            keyboardMacro.onChangeRecordingState(({ recording, reason }) => {
                logs.push({ recording, reason });
            });

            keyboardMacro.cancelRecording();

            assert.deepStrictEqual(logs, [
                { recording: false, reason: keyboardMacro.RecordingStateReason.Cancel }
            ]);
        });
        it('should ignore multiple calls', async () => {
            const logs = [];
            keyboardMacro.startRecording();
            keyboardMacro.onChangeRecordingState(({ recording, reason }) => {
                logs.push({ recording, reason });
            });

            keyboardMacro.cancelRecording(); // 1
            keyboardMacro.cancelRecording(); // 2

            assert.strictEqual(keyboardMacro.isRecording(), false);
            assert.deepStrictEqual(logs, [
                { recording: false, reason: keyboardMacro.RecordingStateReason.Cancel }
            ]);
        });
        it('should discard pushed commands', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'example:command' });
            keyboardMacro.cancelRecording();

            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), []);
        });
    });
    describe('finishRecording', () => {
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
        });
        it('should deactivate recording state', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.finishRecording();

            assert.strictEqual(keyboardMacro.isRecording(), false);
        });
        it('should invoke callback function', async () => {
            const logs = [];
            keyboardMacro.startRecording();
            keyboardMacro.onChangeRecordingState(({ recording, reason }) => {
                logs.push({ recording, reason });
            });

            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [
                { recording: false, reason: keyboardMacro.RecordingStateReason.Finish }
            ]);
        });
        it('should ignore multiple calls', async () => {
            const logs = [];
            keyboardMacro.startRecording();
            keyboardMacro.onChangeRecordingState(({ recording, reason }) => {
                logs.push({ recording, reason });
            });

            keyboardMacro.finishRecording(); // 1
            keyboardMacro.finishRecording(); // 2

            assert.strictEqual(keyboardMacro.isRecording(), false);
            assert.deepStrictEqual(logs, [
                { recording: false, reason: keyboardMacro.RecordingStateReason.Finish }
            ]);
        });
        it('should record the pushed commands', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'example:command1' });
            keyboardMacro.push({ command: 'example:command2', args: { opt1: 'opt1' } });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'example:command1' },
                { command: 'example:command2', args: { opt1: 'opt1' } }
            ]);
        });
    });
    describe('push', () => {
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
        });
        afterEach(async () => {
            keyboardMacro.cancelRecording();
        });
        it('should add specified command to sequence', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'example:command1' });
            keyboardMacro.push({ command: 'example:command2', args: { opt1: 'opt1' } });

            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'example:command1' },
                { command: 'example:command2', args: { opt1: 'opt1' } }
            ]);
        });
        it('should do nothing if not recording', async () => {
            keyboardMacro.push({ command: 'example:command1' });
            keyboardMacro.push({ command: 'example:command2', args: { opt1: 'opt1' } });

            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), []);
        });
        it('should do nothing if side-effect mode', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'example:command1', record: 'side-effect' });
            keyboardMacro.push({ command: 'example:command2', record: 'side-effect', args: { opt1: 'opt1' } });

            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), []);
        });
    });
    describe('copyMacroAsKeybinding', () => {
        const logs = [];
        let old;
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
            logs.length = 0;
            old = keyboardMacro.setShowMessage(async (message) => {
                logs.push(message);
            });
        });
        afterEach(() => {
            keyboardMacro.setShowMessage(old);
        });
        it('should write the recorded macro to the clipboard', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'command1' });
            keyboardMacro.push({ command: 'command2', args: 'arg2' });
            keyboardMacro.push({ command: 'command3', args: 'arg3', 'await': 'await3' });
            keyboardMacro.finishRecording();

            await keyboardMacro.copyMacroAsKeybinding();
            assert.strictEqual(
                await vscode.env.clipboard.readText(),
                '{\n' +
                '    "key": "",\n' +
                '    "command": "kb-macro.playback",\n' +
                '    "args": {\n' +
                '        "sequence": [\n' +
                '            { "command": "command1" },\n' +
                '            { "command": "command2", "args": "arg2" },\n' +
                '            { "command": "command3", "args": "arg3", "await": "await3" }\n' +
                '        ]\n' +
                '    }\n' +
                '}'
            );
            assert.deepStrictEqual(logs, [ 'Copied the recorded macro to the clipboard!' ]);
        });
        it('should show a message if no recorded macro', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.finishRecording();

            await vscode.env.clipboard.writeText('should_not_modified');
            await keyboardMacro.copyMacroAsKeybinding();
            assert.strictEqual(await vscode.env.clipboard.readText(), 'should_not_modified');
            assert.deepStrictEqual(logs, [ 'There\'s no recorded macro.' ]);
        });
    });
    describe('validatePlaybackArgs', () => {
        const validatePlaybackArgs = keyboardMacro.validatePlaybackArgs;
        const logs = [];
        let old;
        beforeEach(async () => {
            logs.length = 0;
            old = keyboardMacro.setShowMessage(async (message) => {
                logs.push(message);
            });
        });
        afterEach(() => {
            keyboardMacro.setShowMessage(old);
        });
        it('should return an args valid for playback command', () => {
            assert.deepStrictEqual(validatePlaybackArgs(), {});
            assert.deepStrictEqual(validatePlaybackArgs({}), {});
            assert.deepStrictEqual(validatePlaybackArgs([]), {});
            assert.deepStrictEqual(validatePlaybackArgs(''), {});
            assert.deepStrictEqual(validatePlaybackArgs(123), {});
            assert.deepStrictEqual(validatePlaybackArgs(null), {});
            assert.deepStrictEqual(validatePlaybackArgs(undefined), {});
            assert.deepStrictEqual(logs, []);
        });
        it('should drop invalid properties', () => {
            assert.deepStrictEqual(validatePlaybackArgs({ hello: 5 }), {});
            assert.deepStrictEqual(logs, []);
        });
        it('should return an args that express the same as the input', () => {
            assert.deepStrictEqual(validatePlaybackArgs({ repeat: 5 }), { repeat: 5 });
            assert.deepStrictEqual(validatePlaybackArgs({ repeat: 0 }), { repeat: 0 });
        });
        it('should drop invalid repeat option', () => {
            assert.deepStrictEqual(validatePlaybackArgs({ repeat: '123' }), {});
        });
        it('should accept sequence option', () => {
            assert.deepStrictEqual(validatePlaybackArgs({ sequence: [] }), { sequence: [] });
            const s1 = [ { command: 'foo' } ];
            assert.deepStrictEqual(validatePlaybackArgs({ sequence: s1 }), { sequence: s1 });
            const s2 = [ { command: 'foo' }, { command: 'bar', args: 'baz' } ];
            assert.deepStrictEqual(validatePlaybackArgs({ sequence: s2 }), { sequence: s2 });
            assert.deepStrictEqual(logs, []);
        });
        it('should treat an invalid sequence option as an empty', () => {
            // see: https://github.com/tshino/vscode-kb-macro/issues/52
            assert.deepStrictEqual(validatePlaybackArgs({ sequence: '123' }), { sequence: [] });
            assert.deepStrictEqual(logs, [ 'Invalid \'sequence\' argument: "123"' ]);

            logs.length = 0;
            assert.deepStrictEqual(validatePlaybackArgs({ sequence: [ 3, 4 ] }), { sequence: [] });
            assert.deepStrictEqual(logs, [ 'Invalid \'sequence\' argument: [3,4]' ]);

            logs.length = 0;
            const invalid1 = [
                { 'command': 'valid' },
                { 'COMMAND': 'invalid' }
            ];
            assert.deepStrictEqual(validatePlaybackArgs({ sequence: invalid1 }), { sequence: [] });
            assert.deepStrictEqual(logs, [
                'Invalid \'sequence\' argument: [{"command":"valid"},{"COMMAND":"invalid"}]'
            ]);
        });
    });
    describe('playback', () => {
        const logs = [];
        let oldPrintError;
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
            logs.length = 0;
            keyboardMacro.registerInternalCommand('internal:log', async () => {
                logs.push('begin');
                await TestUtil.sleep(50);
                logs.push('end');
            });
            oldPrintError = keyboardMacro.setPrintError(() => {
                logs.push('error');
            });
        });
        afterEach(() => {
            keyboardMacro.setPrintError(oldPrintError);
        });
        it('should invoke recorded command', async () => {
            const logs = [];
            keyboardMacro.registerInternalCommand('internal:log', () => {
                logs.push('invoked');
            });
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            await keyboardMacro.playback();
            assert.deepStrictEqual(logs, [ 'invoked' ]);
        });
        it('should invoke recorded commands sequentially', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            await keyboardMacro.playback();
            assert.deepStrictEqual(logs, [
                'begin',
                'end',
                'begin',
                'end'
            ]);
        });
        it('should repeat 5 times (repeat argument)', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            await keyboardMacro.playback({ repeat: 5 });
            assert.deepStrictEqual(logs, [
                'begin',
                'end',
                'begin',
                'end',
                'begin',
                'end',
                'begin',
                'end',
                'begin',
                'end'
            ]);
        });
        it('should abort playback if command execution failed', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.push({ command: 'INVALID' });
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            await keyboardMacro.playback();
            assert.deepStrictEqual(logs, [ 'begin', 'end', 'error' ]);
        });
        it('should abort playback with repeat argument if command execution failed', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.push({ command: 'INVALID' });
            keyboardMacro.finishRecording();

            await keyboardMacro.playback({ repeat: 5 });
            assert.deepStrictEqual(logs, [ 'begin', 'end', 'error' ]);
        });
        it('should do nothing when recording is ongoing', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            await keyboardMacro.playback();
            keyboardMacro.finishRecording();
            assert.deepStrictEqual(logs, []);
        });
        it('should prevent reentry', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            const promise1 = keyboardMacro.playback();
            const promise2 = keyboardMacro.playback();
            await Promise.all([promise1, promise2]);
            assert.deepStrictEqual(logs, [
                'begin',
                'end'
            ]);
        });
        it('should prevent other commands to preempt (startRecording)', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            const promise1 = keyboardMacro.playback();
            keyboardMacro.startRecording(); // <--
            await promise1;

            assert.deepStrictEqual(logs, [
                'begin',
                'end'
            ]);
            assert.strictEqual(keyboardMacro.isRecording(), false);
        });
        it('should ignore invalid args', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            await keyboardMacro.playback({ repeat: '123' }); // repeat option should not be a string
            assert.deepStrictEqual(logs, [
                'begin',
                'end'
            ]);
        });
    });
    describe('playback with sequence option', () => {
        const logs = [];
        let oldPrintError;
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
            logs.length = 0;
            keyboardMacro.registerInternalCommand('internal:log', async args => {
                logs.push('begin' + (args ? ':' + JSON.stringify(args) : ''));
                await TestUtil.sleep(50);
                logs.push('end');
            });
            keyboardMacro.startRecording();
            keyboardMacro.finishRecording();
            oldPrintError = keyboardMacro.setPrintError(() => {
                logs.push('error');
            });
        });
        afterEach(async () => {
            keyboardMacro.onBeginWrappedCommand(null);
            keyboardMacro.onEndWrappedCommand(null);
            keyboardMacro.setPrintError(oldPrintError);
        });
        it('should invoke commands according to the specified sequence option', async () => {
            keyboardMacro.registerInternalCommand('internal:log1', () => logs.push('1'));
            keyboardMacro.registerInternalCommand('internal:log2', () => logs.push('2'));
            const sequence = [
                { command: 'internal:log1' },
                { command: 'internal:log', args: 'hello' },
                { command: 'internal:log2' }
            ];
            await keyboardMacro.playback({ sequence });
            assert.deepStrictEqual(logs, [ '1', 'begin:"hello"', 'end', '2' ]);
        });
        it('should record the commands if it called during recording', async () => {
            const sequence = [
                { command: 'internal:log', args: 'hello' },
                { command: 'internal:log', args: 'world' }
            ];
            keyboardMacro.startRecording();
            await keyboardMacro.playback({ sequence });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [
                'begin:"hello"',
                'end',
                'begin:"world"',
                'end'
            ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'internal:log', args: 'hello' },
                { command: 'internal:log', args: 'world' }
            ]);
        });
        it('should call onBegin/EndWrappedCommand callback with wrapMode="command" if called during recording', async () => {
            keyboardMacro.onBeginWrappedCommand((wrapMode) => { logs.push(`onbeginwrap: ${wrapMode}`); });
            keyboardMacro.onEndWrappedCommand((wrapMode) => { logs.push(`onendwrap: ${wrapMode}`); });
            const sequence = [
                { command: 'internal:log', args: 'hello' },
                { command: 'internal:log', args: 'world' }
            ];
            keyboardMacro.startRecording();
            await keyboardMacro.playback({ sequence });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [
                'onbeginwrap: command',
                'begin:"hello"',
                'end',
                'begin:"world"',
                'end',
                'onendwrap: command'
            ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'internal:log', args: 'hello' },
                { command: 'internal:log', args: 'world' }
            ]);
        });
        it('should not record commands that failed to invoke', async () => {
            keyboardMacro.onBeginWrappedCommand(() => { logs.push('onbeginwrap'); });
            keyboardMacro.onEndWrappedCommand(() => { logs.push('onendwrap'); });
            const sequence = [
                { command: 'internal:log', args: 'hello' },
                { command: 'INVALID' },
                { command: 'internal:log', args: 'world' }
            ];
            keyboardMacro.startRecording();
            await keyboardMacro.playback({ sequence });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [
                'onbeginwrap',
                'begin:"hello"',
                'end',
                'error',
                'onendwrap'
            ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'internal:log', args: 'hello' }
            ]);
        });
        it('should record the commands specified times if repeat option specified', async () => {
            const sequence = [
                { command: 'internal:log', args: 'hello' }
            ];
            const repeat = 3;
            keyboardMacro.startRecording();
            await keyboardMacro.playback({ sequence, repeat });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [
                'begin:"hello"',
                'end',
                'begin:"hello"',
                'end',
                'begin:"hello"',
                'end'
            ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'internal:log', args: 'hello' },
                { command: 'internal:log', args: 'hello' },
                { command: 'internal:log', args: 'hello' }
            ]);
        });
    });
    describe('wrap with playback with sequence option', () => {
        const logs = [];
        let oldPrintError;
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
            logs.length = 0;
            keyboardMacro.registerInternalCommand('internal:log', async args => {
                logs.push('begin' + (args ? ':' + JSON.stringify(args) : ''));
                await TestUtil.sleep(50);
                logs.push('end');
            });
            keyboardMacro.startRecording();
            keyboardMacro.finishRecording();
            oldPrintError = keyboardMacro.setPrintError(() => {
                logs.push('error');
            });
        });
        afterEach(async () => {
            keyboardMacro.onBeginWrappedCommand(null);
            keyboardMacro.onEndWrappedCommand(null);
            keyboardMacro.setPrintError(oldPrintError);
        });
        it('should playback the command sequence and record the whole', async () => {
            keyboardMacro.registerInternalCommand('internal:log1', () => logs.push('1'));
            keyboardMacro.registerInternalCommand('internal:log2', () => logs.push('2'));
            const sequence = [
                { command: 'internal:log1' },
                { command: 'internal:log', args: 'hello' },
                { command: 'internal:log2' }
            ];
            keyboardMacro.startRecording();
            await keyboardMacro.wrapSync({
                command: 'kb-macro.playback',
                args: { sequence }
            });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [ '1', 'begin:"hello"', 'end', '2' ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), sequence);
        });
        it('should not record commands that failed to invoke', async () => {
            keyboardMacro.onBeginWrappedCommand(() => { logs.push('onbeginwrap'); });
            keyboardMacro.onEndWrappedCommand(() => { logs.push('onendwrap'); });
            const sequence = [
                { command: 'internal:log', args: 'hello' },
                { command: 'INVALID' },
                { command: 'internal:log', args: 'world' }
            ];
            keyboardMacro.startRecording();
            await keyboardMacro.wrapSync({
                command: 'kb-macro.playback',
                args: { sequence }
            });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [
                'onbeginwrap',
                'begin:"hello"',
                'end',
                'error',
                'onendwrap'
            ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'internal:log', args: 'hello' }
            ]);
        });
    });
    describe('isPlaying', () => {
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
        });
        it('should be false if playback is not ongoing', async () => {
            assert.strictEqual(keyboardMacro.isPlaying(), false);
        });
        it('should be true while playback is ongoing', async () => {
            const logs = [];
            keyboardMacro.registerInternalCommand('internal:checkIsPlaying', () => {
                logs.push([ 'while playback', keyboardMacro.isPlaying() ]);
            });
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:checkIsPlaying' });
            keyboardMacro.finishRecording();

            logs.push([ 'before playback', keyboardMacro.isPlaying() ]);
            await keyboardMacro.playback();
            logs.push([ 'after playback', keyboardMacro.isPlaying() ]);

            assert.deepStrictEqual(logs, [
                [ 'before playback', false ],
                [ 'while playback', true ],
                [ 'after playback', false ]
            ]);
        });
    });
    describe('abortPlayback', () => {
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
        });
        it('should abort playback', async () => {
            const logs = [];
            keyboardMacro.registerInternalCommand('internal:log', async () => {
                logs.push('begin');
                await TestUtil.sleep(50);
                logs.push('end');
            });
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();
            const promise = keyboardMacro.playback({ repeat: 3 });
            assert.strictEqual(keyboardMacro.isPlaying(), true);
            await TestUtil.sleep(100);
            keyboardMacro.abortPlayback();
            await promise;
            assert.strictEqual(keyboardMacro.isPlaying(), false);

            assert.strictEqual(logs.length < 2 * 3 * 3, true);
        });
    });
    describe('repeatPlayback', () => {
        const logs = [];
        let spyInputBoxInvoked = false;
        let spyInputBoxValue = '';
        let orgShowInputBox = null;
        before(() => {
            keyboardMacro.registerInternalCommand('internal:log', async () => {
                logs.push('invoked');
            });
            orgShowInputBox = keyboardMacro.setShowInputBox(async () => {
                spyInputBoxInvoked = true;
                return spyInputBoxValue;
            });
        });
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
            spyInputBoxInvoked = false;
            logs.length = 0;
        });
        after(() => {
            keyboardMacro.setShowInputBox(orgShowInputBox);
        });
        it('should invoke showInputBox', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            spyInputBoxValue = '1';
            await keyboardMacro.repeatPlayback();

            assert.strictEqual(spyInputBoxInvoked, true);
            assert.deepStrictEqual(logs, [ 'invoked' ]);
        });
        it('should perform playback specified number of times', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            spyInputBoxValue = '4';
            await keyboardMacro.repeatPlayback();

            assert.strictEqual(spyInputBoxInvoked, true);
            assert.deepStrictEqual(logs, [ 'invoked', 'invoked', 'invoked', 'invoked' ]);
        });
        it('should do nothing if recording is ongoing', async () => {
            spyInputBoxValue = '1';
            keyboardMacro.startRecording();
            await keyboardMacro.repeatPlayback();

            assert.strictEqual(spyInputBoxInvoked, false);
            assert.deepStrictEqual(logs, []);
        });
        it('should not perform playback if the number input is canceled', async () => {
            keyboardMacro.startRecording();
            keyboardMacro.push({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            spyInputBoxValue = undefined;
            await keyboardMacro.repeatPlayback();

            assert.strictEqual(spyInputBoxInvoked, true);
            assert.deepStrictEqual(logs, []);
        });
    });
    describe('wrap', () => {
        const logs = [];
        let oldPrintError;
        beforeEach(async () => {
            keyboardMacro.onChangeRecordingState(null);
            keyboardMacro.cancelRecording();
            logs.length = 0;
            keyboardMacro.registerInternalCommand('internal:log', async () => {
                logs.push('begin');
                await TestUtil.sleep(10);
                logs.push('end');
            });
            oldPrintError = keyboardMacro.setPrintError(() => {
                logs.push('error');
            });
        });
        afterEach(() => {
            keyboardMacro.onBeginWrappedCommand(null);
            keyboardMacro.onEndWrappedCommand(null);
            keyboardMacro.setPrintError(oldPrintError);
        });
        it('should invoke and record specified command', async () => {
            keyboardMacro.startRecording();
            await keyboardMacro.wrapSync({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [ 'begin', 'end' ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'internal:log' },
            ]);
        });
        it('should not invoke specified command if not recording', async () => {
            await keyboardMacro.wrapSync({ command: 'internal:log' });

            assert.deepStrictEqual(logs, []);
        });
        it('should call onBegin/EndWrappedCommand callback with wrapMode="command"', async () => {
            keyboardMacro.onBeginWrappedCommand((wrapMode) => { logs.push(`onbeginwrap: ${wrapMode}`); });
            keyboardMacro.onEndWrappedCommand((wrapMode) => { logs.push(`onendwrap: ${wrapMode}`); });
            keyboardMacro.startRecording();
            await keyboardMacro.wrapSync({ command: 'internal:log' });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [
                'onbeginwrap: command',
                'begin',
                'end',
                'onendwrap: command'
            ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'internal:log' },
            ]);
        });
        it('should not crash even if the argument is invalid', async () => {
            keyboardMacro.startRecording();
            await keyboardMacro.wrapSync({ command: '' });
            await keyboardMacro.wrapSync({ command: 'INVALID' });
            await keyboardMacro.wrapSync({ });
            await keyboardMacro.wrapSync();
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [ 'error' ]);
            assert.strictEqual(keyboardMacro.isRecording(), false);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), []);
        });
        it('should invoke and record specified command synchronously', async () => {
            keyboardMacro.startRecording();
            await keyboardMacro.wrapSync({ command: 'internal:log' });
            await keyboardMacro.wrapSync({ command: 'internal:log', args: { test: '1' } });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [ 'begin', 'end', 'begin', 'end' ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'internal:log' },
                { command: 'internal:log', args: { test: '1' } }
            ]);
        });
        it('should enqueue and serialize concurrent calls', async () => {
            keyboardMacro.startRecording();
            const promise1 = keyboardMacro.wrapSync({ command: 'internal:log' });
            const promise2 = keyboardMacro.wrapSync({ command: 'internal:log' });
            await Promise.all([promise1, promise2]);
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [
                'begin', 'end',
                'begin', 'end'
            ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'internal:log' },
                { command: 'internal:log' }
            ]);
        });
        it('should be able to enqueue and serialize concurrent call up to WrapQueueSize', async () => {
            keyboardMacro.startRecording();
            const promises = [];
            promises.push(keyboardMacro.wrapSync({ command: 'internal:log' })); // (1)
            for (let i = 0; i < keyboardMacro.WrapQueueSize; i++) {
                promises.push(keyboardMacro.wrapSync({ command: 'internal:log' })); // (2) to (WrapQueueSize + 1)
            }
            await Promise.all(promises);
            await keyboardMacro.wrapSync({ command: 'internal:log' }); // (WrapQueueSize + 2)
            keyboardMacro.finishRecording();

            const expectedLog = Array(keyboardMacro.WrapQueueSize + 2).fill(['begin', 'end']).flat();
            const expectedSequence = Array(keyboardMacro.WrapQueueSize + 2).fill({ command: 'internal:log' });
            assert.deepStrictEqual(logs, expectedLog);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), expectedSequence);
        });
        it('should overflow when over WrapQueueSize concurrent calls made', async () => {
            keyboardMacro.startRecording();
            const promises = [];
            promises.push(keyboardMacro.wrapSync({ command: 'internal:log' })); // (1)
            for (let i = 0; i < keyboardMacro.WrapQueueSize + 1; i++) { // <-- PLUS ONE!
                promises.push(keyboardMacro.wrapSync({ command: 'internal:log' })); // (2) to (WrapQueueSize + 2)
            }
            await Promise.all(promises);
            await keyboardMacro.wrapSync({ command: 'internal:log' }); // (WrapQueueSize + 3)
            keyboardMacro.finishRecording();

            const expectedLog = Array(keyboardMacro.WrapQueueSize + 2).fill(['begin', 'end']).flat();
            const expectedSequence = Array(keyboardMacro.WrapQueueSize + 2).fill({ command: 'internal:log' });
            assert.deepStrictEqual(logs, expectedLog);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), expectedSequence);
        });
        it('should prevent other commands from interrupting wrap command (cancelRecording)', async () => {
            keyboardMacro.startRecording();
            const promise1 = keyboardMacro.wrapSync({ command: 'internal:log' });
            keyboardMacro.cancelRecording(); // <--
            await promise1;

            assert.deepStrictEqual(logs, [ 'begin', 'end' ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'internal:log' }
            ]);
            assert.strictEqual(keyboardMacro.isRecording(), true);
        });
        it('should prevent other commands from interrupting wrap command (finishRecording)', async () => {
            keyboardMacro.startRecording();
            const promise1 = keyboardMacro.wrapSync({ command: 'internal:log' });
            keyboardMacro.finishRecording(); // <--
            await promise1;

            assert.deepStrictEqual(logs, [ 'begin', 'end' ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'internal:log' }
            ]);
            assert.strictEqual(keyboardMacro.isRecording(), true);
        });
        it('should prevent direct recursive calls', async () => {
            keyboardMacro.startRecording();
            await keyboardMacro.wrapSync({
                command: 'kb-macro.wrap',
                args: { command: 'internal:log' }
            });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, []);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), []);
        });
        it('should prevent indirect recursive calls', async () => {
            // For design details, see https://github.com/tshino/vscode-kb-macro/issues/63
            keyboardMacro.registerInternalCommand('internal:indirectWrap', async () => {
                await vscode.commands.executeCommand('kb-macro.wrap', {
                    command: 'internal:log'
                });
            });
            keyboardMacro.startRecording();
            await keyboardMacro.wrapSync({
                command: 'internal:indirectWrap'
            });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, []);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), [
                { command: 'internal:indirectWrap' }
            ]);
        });
        it('should invoke but not record the target command if side-effect mode', async () => {
            keyboardMacro.startRecording();
            await keyboardMacro.wrapSync({ command: 'internal:log', record: 'side-effect' });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [ 'begin', 'end' ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), []);
        });
        it('should call onBegin/EndWrappedCommand callback with wrapMode="side-effect" if side-effect mode', async () => {
            keyboardMacro.onBeginWrappedCommand((wrapMode) => { logs.push(`onbeginwrap: ${wrapMode}`); });
            keyboardMacro.onEndWrappedCommand((wrapMode) => { logs.push(`onendwrap: ${wrapMode}`); });
            keyboardMacro.startRecording();
            await keyboardMacro.wrapSync({ command: 'internal:log', record: 'side-effect' });
            keyboardMacro.finishRecording();

            assert.deepStrictEqual(logs, [
                'onbeginwrap: side-effect',
                'begin',
                'end',
                'onendwrap: side-effect'
            ]);
            assert.deepStrictEqual(keyboardMacro.getCurrentSequence(), []);
        });
    });
});
