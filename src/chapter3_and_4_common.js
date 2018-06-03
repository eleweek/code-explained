import * as React from 'react';
import _ from 'lodash'

import {
    HashBoxesComponent, LineOfBoxesComponent, Tetris,
    SimpleCodeBlock, VisualizedCode, dummyFormat
} from './code_blocks.js';

import {HashBreakpointFunction, pyHash} from './hash_impl_common.js';


function postBpTransform(bp) {
    let cloned = _.cloneDeep(bp);
    const mapHashes = s => s.hashCode != null ? s.hashCode.toString() : null;

    cloned.hashCodes = bp.self.slots.map(mapHashes)
    cloned.keys = bp.self.slots.map(s => s.key)
    cloned.values = bp.self.slots.map(s => s.value)
    if (bp.oldSlots) {
        cloned.oldHashCodes = bp.oldSlots.map(mapHashes);
        cloned.oldKeys = bp.oldSlots.map(s => s.key);
        cloned.oldValues = bp.oldSlots.map(s => s.value);
    }

    return cloned;
}

function formatHashClassLookdictRelated(bp) {
    switch (bp.point) {
        case 'check-not-found':
            if (bp.self.slots[bp.idx].key === null) {
                return `The slot <code>${bp.idx}</code> is empty, no more slots to check`;
            } else {
                return `We haven't hit an empty slot yet, the slot <code>${bp.idx}</code> is occupied, so check it`;
            }
        case 'check-hash': {
            const slotHash = bp.self.slots[bp.idx].hashCode;
            if (slotHash.toString() /*FIXME toString */ === bp.hashCode) {
                return `<code>${slotHash} == ${bp.hashCode}</code>, so the slot might be occupied by the same key`;
            } else {
                return `<code>${slotHash} != ${bp.hashCode}</code>, so the slot definitely contains a different key`;
            }
        }
        case 'check-key': {
            const slotKey = bp.self.slots[bp.idx].key;
            if (slotKey== bp.key) {
                return `<code>${slotKey} == ${bp.key}</code>, so the key is found`;
            } else {
                return `<code>${slotKey} != ${bp.key}</code>, so there is a different key with the same hash`;
            }
        }
        case 'return-idx':
            return `Return current index, <code>${bp.idx}</code>`;
        case 'raise':
            return `Throw an exception, because no key was found`;
        /* __delitem__ */
        case 'dec-used':
            return `We're about to put a dummy placeholder in the slot, so set the counter of <code>used</code> slots to ${bp.self.used}`;
        case 'replace-key-dummy':
            return `Replace key at <code>${bp.idx}</code> with DUMMY placeholder`;
        case 'replace-value-empty':
            return `Replace value at <code>${bp.idx}</code> with EMPTY`;
        /* __getitem__ */
        case 'return-value':
            return `Return <code>${bp.self.slots[bp.idx].value}</code>`;
        /* misc common */
        case 'start-execution-lookdict':
        case 'start-execution-getitem':
        case 'start-execution-delitem':
            return '';
    }
}

function formatHashClassSetItemAndCreate(bp) {
    switch (bp.point) {
        case 'target-idx-none':
            return `Initialize <code>target_idx</code> - this is the index of the slot where we'll put the item`;
        case 'check-collision':
            if (bp.self.slots[bp.idx].key === null) {
                return `The slot <code>${bp.idx}</code> is empty, so don't loop`;
            } else {
                return `We haven't hit an empty slot yet, the slot <code>${bp.idx}</code> is occupied`;
            }
        case 'check-dup-hash': {
            const slotHash = bp.self.slots[bp.idx].hashCode;
            if (slotHash.toString() /*FIXME toString */=== bp.hashCode) {
                return `<code>${slotHash} == ${bp.hashCode}</code>, we cannot rule out the slot being occupied by the same key`;
            } else {
                return `<code>${slotHash} != ${bp.hashCode}</code>, so there is a collision with a different key`;
            }
        }
        case 'check-dup-key': {
            const slotKey = bp.self.slots[bp.idx].key;
            if (slotKey === bp.key) {
                return `<code>${slotKey} == ${bp.key}</code>, so the key is already present in the table`;
            } else {
                return `<code>${slotKey} != ${bp.key}</code>, so there is a collision`;
            }
        }
        case 'check-should-recycle': {
            const slotKey = bp.self.slots[bp.idx].key;
            if (bp.targetIdx != null) {
                return `<code>target_idx == ${bp.targetIdx}</code> - we have already found a dummy slot that we may replace`;
            } else if (key != "DUMMY") {
                return `<code>target_idx is None</code> - we haven't found a dummy slot, but the current slot's key is <code>${slotKey}, i.e. not dummy</code>`;
            } else {
                return `We found the first dummy slot,`;
            }
        }
        case 'set-target-idx-recycle':
            return `So save its index`;
        case 'set-target-idx-found':
            return `We will put the value in the slot <code>${bp.targetIdx}</code>`
        case 'check-dup-break':
            return "Because the key is found, stop"
        case 'check-target-idx-is-none':
            if (bp.idx == null) {
                return `<code>target_idx is None</code>, and this means that we haven't found nor dummy slot neither existing slot`;
            } else {
                return `<code>target_idx is not None</code>, and this means we already know where to put the item`;
            }
        case 'after-probing-assign-target-idx':
            return `So we'll put the item in the current slot (<code>${bp.idx}</code>), which is empty`;
        case 'check-used-fill-increased':
            return "If we're putting the item in an empty slot " + (bp.self.slots[bp.targetIdx].key == null ? "(and we are)" : "(and we aren't)");
        case 'inc-used':
        case 'inc-used-2':
            return `Then we need to increment used, which makes it <code>${bp.self.used}</code>`;
        case 'inc-fill':
            return `and increment fill, which makes it <code>${bp.self.fill}</code>`;
        case 'check-recycle-used-increased':
            return `If we're putting the item in dummy slot ` + (bp.self.slots[bp.targetIdx].key == "DUMMY" ? "(and we are)" : "(and we aren't)");
        case 'assign-slot':
            return `Put the item in the slot <code>${bp.targetIdx}</code>`;
        case 'check-resize': {
            const fillQ = bp.self.fill * 3;
            const sizeQ = bp.self.slots.length * 2;
            let compStr;
            let noRunResizeStr = ""; 
            if (fillQ > sizeQ) {
                compStr = "is greater than"
            } else if (fillQ === sizeQ) {
                compStr = "is equals to";
            } else {
                compStr = "is less than";
                noRunResizeStr = ", so no need to run <code>resize()</code>";
            }

            return `<code> ${bp.self.fill} * 3</code> (== <code>${fillQ}</code>) ` + compStr + ` <code>${bp.self.slots.length} * 2</code> (== ${sizeQ})` + noRunResizeStr;
        }
        case 'resize':
            return "Do a resize";
        case 'done-no-return':
            return "";
    }
}

function formatHashClassResize(bp) {
    switch (bp.point) {
        case 'assign-old-slots':
            return "Copy reference to slots (no actual copying is done)"
        case 'assign-fill':
            return `Set fill to <code>${bp.self.used}</code>, because we know we'll be filtering out any removed "dummy" slots`;
        case 'compute-new-size':
            return `Compute an optimal size: <code>${bp.newSize}</code>. TODO: explain calculation`;
        case 'new-empty-slots':
            return `Create new list of empty slots of size <code>${bp.self.slots.length}</code>`
        case 'for-loop': {
            const {key, hashCode} = bp.oldSlots[bp.oldIdx];
            return `[${bp.oldIdx + 1}/${bp.oldSlots.length}] The current key to insert is <code>${key === null ? "EMPTY" : key}</code>, its hash is <code>${hashCode === null ? "EMPTY" : hashCode}</code>`;
        }
        case 'check-skip-empty-dummy': {
            const slotKey = bp.oldSlots[bp.oldIdx].key;
            if (slotKey === null) {
                return `The current slot is empty`;
            } else if (slotKey == "DUMMY") {
                return `The current slot contains DUMMY placeholder`;
            } else {
                return `The current slot is a normal slot containing an item`;
            }
        }
        case 'continue': /* FIXME not currently used */
            return 'So skip it';
        case 'check-collision':
            if (bp.self.slots[bp.idx].key === null) {
                return `The slot <code>${bp.idx}</code> is empty, so don't loop`;
            } else {
                return `We haven't hit an empty slot yet, the slot <code>${bp.idx}</code> is occupied`;
            }
        case 'assign-slot':
            return `Put the item in the empty slot ${bp.idx}`;
        case 'done-no-return':
        case 'start-execution':
            return '';
    }
}

function hashClassConstructor() {
    let self = {
        slots: [],
        used: 0,
        fill: 0,
    };

    for (let i = 0; i < 8; ++i) {
        self.slots.push(new Slot());
    }

    return self;
}

class Slot {
    constructor(hashCode=null, key=null, value=null) {
        this.hashCode = hashCode;
        this.key = key;
        this.value = value;
    }
}

function findOptimalSize(used, quot=2) {
    let newSize = 8;
    while (newSize <= quot * used) {
        newSize *= 2;
    }

    return newSize;
}

class HashClassSetItemBase extends HashBreakpointFunction {
    run(_self, _key, _value, useRecycling, Resize, optimalSizeQuot) {
        this.self = _self;
        this.key = _key;
        this.value = _value;

        this.hashCode = pyHash(this.key);
        this.addBP('compute-hash');

        this.computeIdxAndSave(this.hashCode, this.self.slots.length);
        this.targetIdx = null;
        this.addBP('target-idx-none');

        while (true) {
            this.addBP('check-collision');
            if (this.self.slots[this.idx].key === null) {
                break;
            }

            this.addBP('check-dup-hash');
            if (this.self.slots[this.idx].hashCode.eq(this.hashCode)) {
                this.addBP('check-dup-key');
                if (this.self.slots[this.idx].key == this.key) {
                    this.targetIdx = this.idx;
                    this.addBP('set-target-idx-found');
                    this.addBP('check-dup-break');
                    break;
                }
            }

            if (useRecycling) {
                if (this.targetIdx === null && this.self.slots[this.idx].key === "DUMMY") {
                    this.targetIdx = this.idx;
                    this.addBP('set-target-idx-recycle');
                }
            }
            
            this.nextIdxAndSave();
        }

        this.addBP('check-target-idx-is-none');
        if (this.targetIdx === null) {
            this.targetIdx = this.idx;
            this.addBP("after-probing-assign-target-idx");
        }

        this.addBP('check-used-fill-increased');
        if (this.self.slots[this.targetIdx].key === null) {
            this.self.used += 1;
            this.addBP('inc-used');
            this.self.fill += 1;
            this.addBP('inc-fill');
        } else {
            if (useRecycling) {
                this.addBP('check-recycle-used-increased');
                if (this.self.slots[this.targetIdx].key === "DUMMY") {
                    this.self.used += 1;
                    this.addBP("inc-used-2");
                }
            }
        }

        this.self.slots[this.targetIdx] = new Slot(this.hashCode, this.key, this.value);
        this.addBP('assign-slot');
        this.addBP('check-resize');
        if (this.self.fill * 3 >= this.self.slots.length * 2) {
            let hashClassResize = new Resize();
            let _oldSelf = _.cloneDeep(this.self);
            this.self = hashClassResize.run(this.self, optimalSizeQuot);

            this._resize = {
                'oldSelf': _oldSelf,
                'self': _.cloneDeep(this.self),
                'breakpoints': hashClassResize.getBreakpoints(),
            };

            this.addBP('resize');
        }
        this.addBP("done-no-return");
        return this.self;
    }

    getResize() {
        return this._resize !== undefined ? this._resize : null;
    }
}

class HashClassLookdictBase extends HashBreakpointFunction {
    run(_self, _key) {
        this.self = _self;
        this.key = _key;

        this.addBP('start-execution-lookdict');
        this.hashCode = pyHash(this.key);
        this.addBP('compute-hash');
        this.computeIdxAndSave(this.hashCode, this.self.slots.length);

        while (true) {
            this.addBP('check-not-found');
            if (this.self.slots[this.idx].key === null) {
                break;
            }

            this.addBP('check-hash');
            if (this.self.slots[this.idx].hashCode.eq(this.hashCode)) {
                this.addBP('check-key');
                if (this.self.slots[this.idx].key == this.key) {
                    this.addBP('return-idx');
                    return this.idx;
                }
            }

            this.nextIdxAndSave();
        }

        this.addBP('raise');
        return null;
    }
}

class HashClassGetItem extends HashBreakpointFunction {
    run(_self, _key, Lookdict) {
        this.self = _self;
        this.key = _key;
        this.addBP("start-execution-getitem");

        let hcld = new Lookdict();
        this.idx = hcld.run(this.self, this.key)
        this._breakpoints = [...this._breakpoints, ...hcld.getBreakpoints()]
        if (this.idx !== null) {
            // did not throw exception
            this.addBP("return-value");
            return this.self.slots[this.idx].value;
        }
    }
}

class HashClassDelItem extends HashBreakpointFunction {
    run(_self, _key, Lookdict) {
        this.self = _self;
        this.key = _key;
        this.addBP("start-execution-delitem");

        let hcld = new Lookdict();
        this.idx = hcld.run(this.self, this.key)
        this._breakpoints = [...this._breakpoints,...hcld.getBreakpoints()]
        if (this.idx !== null) {
            // did not throw exception
            this.self.used -= 1;
            this.addBP("dec-used");
            this.self.slots[this.idx].key = "DUMMY";
            this.addBP("replace-key-dummy");
            this.self.slots[this.idx].value = null;
            this.addBP("replace-value-empty");
        }
        return this.self;
    }
}

class HashClassInsertAll extends HashBreakpointFunction {
    constructor() {
        super();

        this._resizes = [];
    }

    run(_self, _pairs, useRecycling, SetItem, Resize, optimalSizeQuot) {
        this.self = _self;
        this.pairs = _pairs;
        let fromKeys = this.pairs.map(p => p[0]);
        let fromValues = this.pairs.map(p => p[1]);
        for ([this.oldIdx, [this.oldKey, this.oldValue]] of this.pairs.entries()) {
            let hcsi = new SetItem();
            hcsi.setExtraBpContext({
                oldIdx: this.oldIdx,
                fromKeys: fromKeys,
                fromValues: fromValues,
            });
            this.self = hcsi.run(this.self, this.oldKey, this.oldValue, useRecycling, Resize, optimalSizeQuot);
            if (hcsi.getResize()) {
                this._resizes.push(hcsi.getResize());
            }
            this._breakpoints = [...this._breakpoints,...hcsi.getBreakpoints()]
        }
        return this.self;
    }

    getResizes() {
        return this._resizes;
    }
}

function HashClassNormalStateVisualization(props) {
    return <Tetris
        lines={
            [
                [HashBoxesComponent, ["self.slots[*].hash", "hashCodes", "idx", "targetIdx"]],
                [HashBoxesComponent, ["self.slots[*].key", "keys", "idx", "targetIdx"]],
                [HashBoxesComponent, ["self.slots[*].value", "values", "idx", "targetIdx"]],
            ]
        }
        bpTransform={postBpTransform}
        {...props}
    />;
}

function HashClassInsertAllVisualization(props) {
    return <Tetris
        lines={
            [
                [LineOfBoxesComponent, ["from_keys", "fromKeys", "oldIdx"]],
                [LineOfBoxesComponent, ["from_values", "fromValues", "oldIdx"]],
                [HashBoxesComponent, ["self.slots[*].hash", "hashCodes", "idx"]],
                [HashBoxesComponent, ["self.slots[*].key", "keys", "idx"]],
                [HashBoxesComponent, ["self.slots[*].value", "values", "idx"]],
            ]
        }
        bpTransform={postBpTransform}
        {...props}
    />;
}

function HashClassResizeVisualization(props) {
    return <Tetris
        lines={
            [
                [HashBoxesComponent, ["oldSlots[*].hash", "oldHashCodes", "oldIdx"]],
                [HashBoxesComponent, ["oldSlots[*].key", "oldKeys", "oldIdx"]],
                [HashBoxesComponent, ["oldSlots[*].value", "oldValues", "oldIdx"]],
                [HashBoxesComponent, ["self.slots[*].hash", "hashCodes", "idx"]],
                [HashBoxesComponent, ["self.slots[*].key", "keys", "idx"]],
                [HashBoxesComponent, ["self.slots[*].value", "values", "idx"]],
            ]
        }
        bpTransform={postBpTransform}
        {...props}
    />;
}

class HashClassResizeBase extends HashBreakpointFunction {
    run(_self, optimalSizeQuot) {
        this.self = _self;

        this.oldSlots = [];
        this.addBP("start-execution");
        this.oldSlots = this.self.slots;
        this.addBP("assign-old-slots");
        this.newSize = findOptimalSize(this.self.used, optimalSizeQuot);
        this.addBP("compute-new-size");

        this.self.slots = [];

        for (let i = 0; i < this.newSize; ++i) {
            this.self.slots.push(new Slot());
        }
        this.addBP("new-empty-slots");

        this.self.fill = this.self.used;
        this.addBP("assign-fill");

        for ([this.oldIdx, this.slot] of this.oldSlots.entries()) {
            /* For consistency with other functions, add these names */
            this.hashCode = this.slot.hashCode;
            this.key = this.slot.key;
            this.value = this.slot.value;

            this.addBP('for-loop');
            this.addBP('check-skip-empty-dummy');
            if (this.slot.key === null || this.slot.key === "DUMMY") {
                this.addBP('continue');
                continue;
            }
            this.computeIdxAndSave(this.slot.hashCode, this.self.slots.length);

            while (true) {
                this.addBP('check-collision');
                if (this.self.slots[this.idx].key === null) {
                    break;
                }

                this.nextIdxAndSave();
            }

            this.self.slots[this.idx] = new Slot(this.slot.hashCode, this.slot.key, this.slot.value);
            this.addBP('assign-slot');
        }
        this.oldIdx = null;
        this.idx = null;
        this.addBP('done-no-return');

        return this.self;
    }
};

export {
    hashClassConstructor, Slot, findOptimalSize,
    HashClassResizeBase, HashClassSetItemBase, HashClassDelItem, HashClassGetItem, HashClassLookdictBase, HashClassInsertAll,
    HashClassNormalStateVisualization, HashClassInsertAllVisualization, HashClassResizeVisualization,
    formatHashClassSetItemAndCreate, formatHashClassLookdictRelated, formatHashClassResize
}
