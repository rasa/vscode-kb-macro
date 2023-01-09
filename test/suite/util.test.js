'use strict';
const assert = require('assert');
const vscode = require('vscode');
const util = require('../../src/util.js');

describe('util', () => {
    const Selection = (l1,c1,l2,c2) => new vscode.Selection(l1,c1,l2,c2);
    const Range = (l1,c1,l2,c2) => new vscode.Range(l1,c1,l2,c2);

    describe('isEqualSelections', () => {
        it('should return true if two selections are equal (1)', async () => {
            const sel1 = [ Selection(0, 1, 2, 3) ];
            const sel2 = [ Selection(0, 1, 2, 3) ];

            assert.strictEqual(util.isEqualSelections(sel1, sel2), true);
        });
        it('should return true if two selections are equal (2)', async () => {
            const sel1 = [ Selection(0, 1, 2, 3), Selection(1, 2, 3, 4) ];
            const sel2 = [ Selection(0, 1, 2, 3), Selection(1, 2, 3, 4) ];

            assert.strictEqual(util.isEqualSelections(sel1, sel2), true);
        });
        it('should return false if two selections are different (1)', async () => {
            const sel1 = [ Selection(0, 1, 2, 3) ];
            const sel2 = [ Selection(0, 1, 2, 4) ];

            assert.strictEqual(util.isEqualSelections(sel1, sel2), false);
        });
        it('should return false if two selections are different (2)', async () => {
            const sel1 = [ Selection(0, 1, 2, 3), Selection(1, 2, 3, 4) ];
            const sel2 = [ Selection(0, 1, 2, 3), Selection(1, 2, 3, 5) ];

            assert.strictEqual(util.isEqualSelections(sel1, sel2), false);
        });
        it('should return false if two selections are different in length (1)', async () => {
            const sel1 = [ Selection(0, 1, 2, 3) ];
            const sel2 = [ Selection(0, 1, 2, 3), Selection(1, 2, 3, 4) ];

            assert.strictEqual(util.isEqualSelections(sel1, sel2), false);
        });
        it('should return false if two selections are different in length (2)', async () => {
            const sel1 = [ Selection(0, 1, 2, 3), Selection(1, 2, 3, 4) ];
            const sel2 = [ Selection(0, 1, 2, 3) ];

            assert.strictEqual(util.isEqualSelections(sel1, sel2), false);
        });
        it('should return false if two selections are different even if they are equal as ranges', async () => {
            const sel1 = [ Selection(0, 1, 2, 3) ];
            const sel2 = [ Selection(2, 3, 0, 1) ];

            assert.strictEqual(util.isEqualSelections(sel1, sel2), false);
        });
    });
    describe('sortSelections', () => {
        it('should return copy of given selections', async () => {
            const input = [ Selection(1, 2, 3, 4) ];
            const result = util.sortSelections(input);
            assert.notStrictEqual(result, input);
        });
        it('should sort selections in ascending order', async () => {
            const input = [
                Selection(2, 1, 2, 1),
                Selection(3, 2, 3, 2),
                Selection(1, 2, 1, 2)
            ];
            const result = util.sortSelections(input);
            const expected = [
                Selection(1, 2, 1, 2),
                Selection(2, 1, 2, 1),
                Selection(3, 2, 3, 2)
            ];
            assert.deepStrictEqual(result, expected);
        });
    });
    describe('makeIndexOfSortedSelections', () => {
        it('should return an array of indices', async () => {
            const input = [ Selection(1, 2, 3, 4) ];
            const result = util.makeIndexOfSortedSelections(input);
            assert.deepStrictEqual(result, [0]);
        });
        it('should indices of sorted array', async () => {
            const input = [
                Selection(1, 1, 1, 1),
                Selection(3, 3, 3, 3),
                Selection(4, 4, 4, 4),
                Selection(2, 2, 2, 2)
            ];
            const result = util.makeIndexOfSortedSelections(input);
            assert.deepStrictEqual(result, [0, 3, 1, 2]);
        });
    });
    describe('makeSelectionsAfterTyping', () => {
        it('should calculate predicted locations where cursors should move to after typing', () => {
            const changes = [ { range: Range(3, 0, 3, 0), text: 'a' } ];
            const expected = [ Selection(3, 1, 3, 1) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (multiple characters)', () => {
            const changes = [ { range: Range(3, 0, 3, 0), text: 'abcde' } ];
            const expected = [ Selection(3, 5, 3, 5) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (multi-cursor)', () => {
            const changes = [
                { range: Range(3, 1, 3, 1), text: 'a' },
                { range: Range(4, 1, 4, 1), text: 'a' }
            ];
            const expected = [ Selection(3, 2, 3, 2), Selection(4, 2, 4, 2) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (multi-cursor in the same line)', () => {
            const changes = [
                { range: Range(3, 1, 3, 1), text: 'ab' },
                { range: Range(3, 5, 3, 5), text: 'ab' }
            ];
            const expected = [ Selection(3, 3, 3, 3), Selection(3, 9, 3, 9) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (typing with a selection that contains line-breaks)', () => {
            const changes = [ { range: Range(12, 1, 14, 5), text: 'x' } ];
            const expected = [ Selection(12, 2, 12, 2) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (typing with multiple selections)', () => {
            const changes = [
                { range: Range(12, 1, 12, 5), text: 'x' },
                { range: Range(13, 1, 13, 5), text: 'x' }
            ];
            const expected = [ Selection(12, 2, 12, 2), Selection(13, 2, 13, 2) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (typing with multiple selections that contains line-breaks) (1)', () => {
            const changes = [
                { range: Range(12, 1, 14, 5), text: 'x' },
                { range: Range(15, 1, 16, 5), text: 'x' }
            ];
            const expected = [ Selection(12, 2, 12, 2), Selection(13, 2, 13, 2) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (typing with multiple selections that contains line-breaks) (2)', () => {
            const changes = [
                { range: Range(12, 1, 14, 5), text: 'x' },
                { range: Range(14, 7, 16, 5), text: 'x' }
            ];
            const expected = [ Selection(12, 2, 12, 2), Selection(12, 5, 12, 5) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (typing with multiple selections in a single line)', () => {
            const changes = [
                { range: Range(12, 1, 12, 3), text: 'x' },
                { range: Range(12, 6, 12, 8), text: 'x' }
            ];
            const expected = [ Selection(12, 2, 12, 2), Selection(12, 6, 12, 6) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (typing of multi-line text with multiple selections)', () => {
            const changes = [
                { range: Range(12, 1, 12, 5), text: 'x\ny' },
                { range: Range(13, 1, 13, 5), text: 'x\ny' }
            ];
            const expected = [ Selection(13, 1, 13, 1), Selection(15, 1, 15, 1) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (typing of multi-line text with multiple multi-line selections) (1)', () => {
            const changes = [
                { range: Range(12, 1, 14, 2), text: 'x\ny' },
                { range: Range(15, 1, 17, 2), text: 'x\ny' }
            ];
            const expected = [ Selection(13, 1, 13, 1), Selection(15, 1, 15, 1) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
        it('should make prediction (typing of multi-line text with multiple multi-line selections) (2)', () => {
            const changes = [
                { range: Range(12, 1, 14, 2), text: 'x\ny' },
                { range: Range(14, 5, 16, 2), text: 'x\ny' }
            ];
            const expected = [ Selection(13, 1, 13, 1), Selection(14, 1, 14, 1) ];
            assert.deepStrictEqual(util.makeSelectionsAfterTyping(changes), expected);
        });
    });
    describe('validatePositiveIntegerInput', () => {
        const validatePositiveIntegerInput = util.validatePositiveIntegerInput;
        it('should return undefined if input is a valid string representing positive integer', () => {
            assert.strictEqual(validatePositiveIntegerInput('1'), undefined);
            assert.strictEqual(validatePositiveIntegerInput('42'), undefined);
            assert.strictEqual(validatePositiveIntegerInput('9999'), undefined);
        });
        it('should return undefined if input is empty', () => {
            assert.strictEqual(validatePositiveIntegerInput(''), undefined);
        });
        it('should return diagnostic message if input does not reprensent an integer', () => {
            assert.strictEqual(typeof validatePositiveIntegerInput('abc'), 'string');
            assert.strictEqual(typeof validatePositiveIntegerInput('123m'), 'string');
            assert.strictEqual(typeof validatePositiveIntegerInput('1.5'), 'string');
            assert.strictEqual(typeof validatePositiveIntegerInput('1e7'), 'string');
            assert.strictEqual(typeof validatePositiveIntegerInput(' '), 'string');
        });
        it('should return diagnostic message if input reprensents a negative integer', () => {
            assert.strictEqual(typeof validatePositiveIntegerInput('-123'), 'string');
        });
    });
    describe('makeCommandSpec', () => {
        const makeCommandSpec = util.makeCommandSpec;
        it('should return null if not a valid command spec object', () => {
            assert.strictEqual(makeCommandSpec({}), null);
            assert.strictEqual(makeCommandSpec([]), null);
            assert.strictEqual(makeCommandSpec('x'), null);
            assert.strictEqual(makeCommandSpec(null), null);
            assert.strictEqual(makeCommandSpec(undefined), null);
            assert.strictEqual(makeCommandSpec({ foo: 'foo' }), null);
            assert.strictEqual(makeCommandSpec({ command: 123 }), null);
            assert.strictEqual(makeCommandSpec({ command: 'aaa', 'await': 123  }), null);
            assert.strictEqual(makeCommandSpec({ command: 'aaa', 'await': [ 'xxx' ]  }), null);
            assert.strictEqual(makeCommandSpec({ command: 'aaa', record: 123  }), null);
            assert.strictEqual(makeCommandSpec({ command: 'aaa', record: [ 'xxx' ]  }), null);
        });
        it('should return a new Object', () => {
            const input = { command: 'foo' };
            const result = makeCommandSpec(input);
            assert.notStrictEqual(result, input);
            assert.strictEqual(typeof(result), 'object');
        });
        it('should return a command spec that is exactly the same as the input', () => {
            assert.deepStrictEqual(
                makeCommandSpec({ command: 'a' }),
                { command: 'a' }
            );
            assert.deepStrictEqual(
                makeCommandSpec({ command: 'a', args: {} }),
                { command: 'a', args: {} }
            );
            assert.deepStrictEqual(
                makeCommandSpec({ command: 'a', args: [ 1, 2, 3 ] }),
                { command: 'a', args: [ 1, 2, 3 ] }
            );
            assert.deepStrictEqual(
                makeCommandSpec({ command: 'a', args: { x: 4, y: 5, z: 6 } }),
                { command: 'a', args: { x: 4, y: 5, z: 6 } }
            );
            assert.deepStrictEqual(
                makeCommandSpec({ command: 'a', args: { b: 42 }, 'await': 'ccc' }),
                { command: 'a', args: { b: 42 }, 'await': 'ccc' }
            );
        });
        it('should accept \'record\' properties as well', () => {
            assert.deepStrictEqual(
                makeCommandSpec({ command: 'a', record: 'side-effect' }),
                { command: 'a', record: 'side-effect' }
            );
        });
        it('should drop properties that are not relevant to a command spec', () => {
            assert.deepStrictEqual(
                makeCommandSpec({ command: 'a', foo: 'bar', baz: 'zoo' }),
                { command: 'a' }
            );
        });
    });
    describe('areEqualCommandSpec', () => {
        it('should return true only if given two specs are equal', () => {
            assert.strictEqual(util.areEqualCommandSpec(
                { command: 'a' },
                { command: 'a' }
            ), true);
            assert.strictEqual(util.areEqualCommandSpec(
                { command: 'a', args: 123 },
                { command: 'a', args: 123 }
            ), true);
            assert.strictEqual(util.areEqualCommandSpec(
                { command: 'a', args: [ 1, 2, 3] },
                { command: 'a', args: [ 1, 2, 3] }
            ), true);
            assert.strictEqual(util.areEqualCommandSpec(
                { command: 'a', args: { x: 123 } },
                { command: 'a', args: { x: 123 } }
            ), true);
            assert.strictEqual(util.areEqualCommandSpec(
                { command: 'a', await: 'selection' },
                { command: 'a', await: 'selection' }
            ), true);
            assert.strictEqual(util.areEqualCommandSpec(
                { command: 'a', record: 'side-effect' },
                { command: 'a', record: 'side-effect' }
            ), true);
        });
        it('should return false if given two specs are not equal', () => {
            const s1 = { command: 'a' };
            const s2 = { command: 'b' };
            const s3 = { command: 'a', args: 123 };
            const s4 = { command: 'a', args: [ 1, 2, 3 ] };
            const s5 = { command: 'a', args: [ 1, 2, 3, 4 ] };
            const s6 = { command: 'a', args: { x: 123 } };
            const s7 = { command: 'a', args: { x: 456 } };
            const s8 = { command: 'a', await: 'document' };
            const s9 = { command: 'a', await: 'document selection' };
            const s10 = { command: 'a', record: '' };
            const s11 = { command: 'a', record: 'side-effect' };

            assert.strictEqual(util.areEqualCommandSpec(s1, s2), false);
            assert.strictEqual(util.areEqualCommandSpec(s1, s3), false);
            assert.strictEqual(util.areEqualCommandSpec(s3, s4), false);
            assert.strictEqual(util.areEqualCommandSpec(s3, s6), false);
            assert.strictEqual(util.areEqualCommandSpec(s4, s5), false);
            assert.strictEqual(util.areEqualCommandSpec(s4, s6), false);
            assert.strictEqual(util.areEqualCommandSpec(s6, s7), false);
            assert.strictEqual(util.areEqualCommandSpec(s1, s8), false);
            assert.strictEqual(util.areEqualCommandSpec(s8, s9), false);
            assert.strictEqual(util.areEqualCommandSpec(s1, s10), false);
            assert.strictEqual(util.areEqualCommandSpec(s10, s11), false);
        });
    });
});
