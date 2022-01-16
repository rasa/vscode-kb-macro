'use strict';
const assert = require('assert');
const vscode = require('vscode');
const { endOfFileDetectorUtil } = require('../../src/end_of_file_detector.js');

describe('endOfFileDetectorUtil', () => {
    describe('getCursorPosition', () => {
        const getCursorPosition = endOfFileDetectorUtil.getCursorPosition;
        it('should return the cursor position', () => {
            const Input = { selections: [ new vscode.Selection(3, 5, 3, 5) ] };
            const Expected = new vscode.Position(3, 5);
            assert.strictEqual(getCursorPosition(Input).isEqual(Expected), true);
        });
        it('should return the active position of current selection range (1)', () => {
            const Input = { selections: [ new vscode.Selection(3, 5, 6, 8) ] };
            const Expected = new vscode.Position(6, 8);
            assert.strictEqual(getCursorPosition(Input).isEqual(Expected), true);
        });
        it('should return the active position of current selection range (2)', () => {
            const Input = { selections: [ new vscode.Selection(6, 8, 3, 5) ] };
            const Expected = new vscode.Position(3, 5);
            assert.strictEqual(getCursorPosition(Input).isEqual(Expected), true);
        });
        it('should return the position of the last cursor in multi-cursor (1)', () => {
            const Input = { selections: [
                new vscode.Selection(1, 4, 1, 4),
                new vscode.Selection(2, 4, 2, 4),
                new vscode.Selection(3, 4, 3, 4)
            ] };
            const Expected = new vscode.Position(3, 4);
            assert.strictEqual(getCursorPosition(Input).isEqual(Expected), true);
        });
        it('should return the position of the last cursor in multi-cursor (2)', () => {
            const Input = { selections: [
                new vscode.Selection(3, 4, 3, 4),
                new vscode.Selection(2, 4, 2, 4),
                new vscode.Selection(1, 4, 1, 4)
            ] };
            const Expected = new vscode.Position(1, 4);
            assert.strictEqual(getCursorPosition(Input).isEqual(Expected), true);
        });
    });
    describe('calculateDistanceBelow', () => {
        const calculateDistanceBelow = endOfFileDetectorUtil.calculateDistanceBelow;
        it('should return [0, 0] if the editor is null', () => {
            assert.deepStrictEqual(calculateDistanceBelow(null), [0, 0]);
        });
        it('should return the number of lines below the cursor and the number of characters right of the cursor', () => {
            const editorMock = {
                document: {
                    lineCount: 10,
                    lineAt: () => ({ text: ' '.repeat(15) })
                },
                selections: [
                    new vscode.Selection(5, 3, 5, 3)
                ]
            };
            assert.deepStrictEqual(calculateDistanceBelow(editorMock), [4, 12]);
        });
        it('should return [0, 0] if the cursor is at the end of the document', () => {
            const editorMock = {
                document: {
                    lineCount: 10,
                    lineAt: () => ({ text: ' '.repeat(15) })
                },
                selections: [
                    new vscode.Selection(9, 15, 9, 15)
                ]
            };
            assert.deepStrictEqual(calculateDistanceBelow(editorMock), [0, 0]);
        });
    });
    describe('compareDistance', () => {
        const compareDistance = endOfFileDetectorUtil.compareDistance;
        it('should return 0 if two arguments are the same distance', () => {
            assert.strictEqual(compareDistance([3, 4], [3, 4]), 0);
            assert.strictEqual(compareDistance([0, 1], [0, 1]), 0);
            assert.strictEqual(compareDistance([10, 0], [10, 0]), 0);
            assert.strictEqual(compareDistance([8, 5], [8, 5]), 0);
        });
        it('should return a positive integer if first one is greater', () => {
            assert.strictEqual(compareDistance([4, 1], [3, 1]) > 0, true);
            assert.strictEqual(compareDistance([4, 5], [3, 7]) > 0, true);
            assert.strictEqual(compareDistance([4, 7], [3, 5]) > 0, true);
            assert.strictEqual(compareDistance([5, 8], [5, 4]) > 0, true);
        });
        it('should return a negative integer if first one is smaller', () => {
            assert.strictEqual(compareDistance([3, 1], [4, 1]) < 0, true);
            assert.strictEqual(compareDistance([3, 7], [4, 5]) < 0, true);
            assert.strictEqual(compareDistance([3, 5], [4, 7]) < 0, true);
            assert.strictEqual(compareDistance([5, 4], [5, 8]) < 0, true);
        });
    });
});
