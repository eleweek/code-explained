import * as React from 'react';

import {Subcontainerize, COLOR_FOR_READ_OPS} from './util';
import {Chapter2_HashTableFunctions} from './chapter2_hash_table_functions';
import {joinBreakpoints} from './hash_impl_common';
import {VisualizedCode, TetrisFactory, LineOfBoxesComponent, HashBoxesComponent} from './code_blocks';
import {
    HASH_CREATE_NEW_CODE,
    formatHashCreateNewAndInsert,
    HashCreateNewStateVisualization,
} from './chapter2_hash_table_functions';

const TwoHashCreateNewStateVisualization = TetrisFactory([
    [
        LineOfBoxesComponent,
        [
            {labels: ['from_keys'], marginBottom: 20},
            'plus1_fromKeys',
            'plus1_fromKeysIdx',
            'double_fromKeysIdx',
            {selection1color: COLOR_FOR_READ_OPS},
        ],
    ],
    [HashBoxesComponent, [{labels: ['keys'], marginBottom: 7}, 'plus1_keys', 'plus1_idx']],
    [HashBoxesComponent, [{labels: ['hash_codes']}, 'plus1_hashCodes', 'plus1_idx']],
    [HashBoxesComponent, [{labels: ['keys'], marginBottom: 7}, 'double_keys', 'double_idx']],
    [HashBoxesComponent, [{labels: ['hash_codes']}, 'double_hashCodes', 'double_idx']],
]);

export class NewDemos extends Chapter2_HashTableFunctions {
    constructor() {
        super();
        this.state = {
            // array: ["ps", "du", "ls", "cat", "top", "ping", "chmod", "grep", "gzip", "dd", "chown", "at", "awk"]
            array: ['ps', 'du', 'ls', 'cat', 'top', 'ping', 'chmod', 'grep', 'gzip'],
        };
    }

    render() {
        console.log('New demos', this.state.array);
        const newPlus1 = this.runCreateNew(this.state.array, this.state.array.length);
        const newDouble = this.runCreateNew(this.state.array, 3 * this.state.array.length);
        const joinedBp = joinBreakpoints([newPlus1.bp, newDouble.bp], ['plus1', 'double']);
        console.log('!!!', joinedBp.bp);
        return (
            <div className="chapter new_demos">
                <h2>Demos</h2>
                <Subcontainerize>
                    <p>Filling hash demo</p>
                    <VisualizedCode
                        breakpoints={joinedBp}
                        stateVisualization={TwoHashCreateNewStateVisualization}
                        {...this.props}
                    />
                    {/* <VisualizedCode
                        code={HASH_CREATE_NEW_CODE}
                        breakpoints={newDefault.bp}
                        formatBpDesc={formatHashCreateNewAndInsert}
                        stateVisualization={HashCreateNewStateVisualization}
                        {...this.props}
                    /> */}
                </Subcontainerize>
            </div>
        );
    }
}
