import * as React from 'react';
import _ from 'lodash';
import {List as ImmutableList} from 'immutable';

import {EQ, BreakpointFunction, displayStr} from './hash_impl_common';
import {
    LineOfBoxesComponent,
    HashBoxesComponent,
    HashBoxesBrokenComponent,
    TetrisFactory,
    VisualizedCode,
    SimpleCodeInline,
} from './code_blocks';
import {PyListInput, ParsableInput, BlockInputToolbar, InputTryAnother} from './inputs';
import {
    ChapterComponent,
    DynamicP,
    Subcontainerize,
    singularOrPluralRus,
    CrossFade,
    COLOR_FOR_READ_OPS,
    randint,
    randomChoice,
} from './util';
import {chapter1_2_FormatCheckCollision, commonFormatCheckNotFound} from './common_formatters';
import {ProbingVisualization, GenerateProbingLinks} from './probing_visualization';
import {parsePyNumber} from './py_obj_parsing';

import {BigNumber} from 'bignumber.js';

import memoizeOne from 'memoize-one';
import {observer} from 'mobx-react';
import {win} from './store';

const CHAPTER1_MAXNUM = 999;

export const SIMPLE_LIST_SEARCH = [
    ['def simple_search(simple_list, key):', '', 0],
    ['    idx = 0', 'start-from-zero', 1],
    ['    while idx < len(simple_list):', 'check-boundary', 2],
    ['        if simple_list[idx] == key:', 'check-found', 2],
    ['            return True', 'found-key', 2],
    ['        idx += 1', 'next-idx', 2],
    ['    return False', 'found-nothing', 1],
];

function _parseSmallInt(value) {
    const b = parsePyNumber(value);
    const error = chapter1valueRangeValidator(b);
    if (error) {
        throw new Error(error);
    }

    return +b.toString();
}

function chapter1valueRangeValidator(num) {
    if (!BigNumber.isBigNumber(num) && typeof num !== 'number') {
        return 'Expected an integer';
    }
    if (num.lt(-CHAPTER1_MAXNUM) || num.gt(CHAPTER1_MAXNUM)) {
        return `In chapter 1 only small integers are supported (between -${CHAPTER1_MAXNUM} and ${CHAPTER1_MAXNUM})`;
    }
}

export function PySmallIntInput({inputComponentRef, ...restProps}) {
    return (
        <ParsableInput {...restProps} dumpValue={JSON.stringify} parseValue={_parseSmallInt} ref={inputComponentRef} />
    );
}

function simpleListSearch(l, key) {
    let defaultBPInfo = {
        type: 'breakpoint',
        arg: key,
        data: l,
        size: l.length,
    };
    let breakpoints = [];
    let newBP = (point, idx, extraInfo) => {
        return {...defaultBPInfo, ...{point: point, idx: idx, atIdx: l[idx]}, ...extraInfo};
    };

    let idx = 0;
    breakpoints.push(newBP('start-from-zero', idx));

    while (true) {
        breakpoints.push(newBP('check-boundary', idx));
        if (idx >= l.length) {
            break;
        }
        if (EQ(l[idx], key)) {
            breakpoints.push(newBP('check-found', idx, {found: true}));
            breakpoints.push(newBP('found-key', idx));

            return {bp: breakpoints, result: true};
        } else {
            breakpoints.push(newBP('check-found', idx, {found: false}));
        }

        idx += 1;
        breakpoints.push(newBP('next-idx', idx));
    }

    breakpoints.push(newBP('found-nothing', idx));

    return {bp: breakpoints, result: false};
}

export let formatSimpleListSearchBreakpointDescription = function(bp) {
    switch (bp.point) {
        case 'iteration':
            return `Проверим ячейку с индексом ${bp.idx} (<code>${bp.atIdx}</code>)`;
        case 'start-from-zero':
            return `Начинаем с нулевого элемента списка`;
        case 'check-boundary':
            return bp.idx < bp.size
                ? `[Попытка №${bp.idx + 1}] <code>${bp.idx} < ${
                      bp.size
                  }</code>, значит, обработаны еще не все элементы, и искомое число может находиться дальше`
                : `<code>${bp.idx} == ${bp.size}</code>, значит все элементы обработаны`;
        case 'check-found':
            return bp.found
                ? `<code>${bp.atIdx} == ${bp.arg}</code> &mdash; искомое число найдено`
                : `<code>${bp.atIdx} != ${bp.arg}</code> &mdash; искомое число еще не найдено`;
        case 'found-key':
            return `Поэтому возвращаем <code>True</code>`;
        case 'found-nothing':
            return `Искомое число <code>${bp.arg}</code> не найдено, поэтому возвращаем значение<code>False</code>`;
        case 'next-idx':
            return `Переходим к следующему индексу: <code>${bp.idx}</code> == <code>${bp.idx - 1} + 1</code>`;
    }
};

export const SimpleListSearchStateVisualization = TetrisFactory([
    [LineOfBoxesComponent, [{labels: ['simple_list']}, 'data', 'idx']],
]);

const UnnamedListVisualizationImpl = TetrisFactory([[LineOfBoxesComponent, [{labels: [null]}, 'data']]]);

function UnnamedListVisualization(props) {
    const serverSide = props.windowHeight == null;
    return <UnnamedListVisualizationImpl {...props} overflow={serverSide} />;
}

export const SIMPLIFIED_INSERT_ALL_BROKEN_CODE = [
    ['def build_no_collision_resolution(original_list):', 'start-execution', 0],
    ['    new_list = [None] * len(original_list)', 'create-new-list', 1],
    ['', ''],
    ['    for number in original_list:', 'for-loop', 2],
    ['        idx = number % len(new_list)', 'compute-idx', 2],
    ['        new_list[idx] = number', 'assign-elem', 2],
    ['    return new_list', 'return-created-list', 1],
];

export const SIMPLIFIED_INSERT_ALL_CODE = [
    ['def build_insert_all(original_list):', 'start-execution', 0],
    ['    new_list = [None] * (2 * len(original_list))', 'create-new-list', 1],
    ['', ''],
    ['    for number in original_list:', 'for-loop', 2],
    ['        idx = number % len(new_list)', 'compute-idx', 2],
    ['        while new_list[idx] is not None:', 'check-collision', 3],
    ['            idx = (idx + 1) % len(new_list)', 'next-idx', 3],
    ['        new_list[idx] = number', 'assign-elem', 2],
    ['    return new_list', 'return-created-list', 1],
];

class SimplifiedInsertAll extends BreakpointFunction {
    constructor() {
        super();

        this._overwritten = [];
    }

    run(_originalList, isBroken = false, overrideSize = null) {
        this.fmtIsBroken = isBroken;
        this.originalList = new ImmutableList(_originalList);
        this.newList = new ImmutableList();
        if (isBroken) {
            this.fmtMissingNumbers = new ImmutableList();
            this.newListWithReplacements = new ImmutableList();
        }
        let startSize;

        if (!overrideSize) {
            startSize = (isBroken ? 1 : 2) * this.originalList.size;
        } else {
            overrideSize = startSize;
        }
        for (let i = 0; i < startSize; ++i) {
            this.newList = this.newList.push(null);
            if (isBroken) {
                this.newListWithReplacements = this.newListWithReplacements.push(new ImmutableList());
            }
        }
        this.addBP('create-new-list', true);

        for ([this.originalListIdx, this.number] of this.originalList.entries()) {
            this.fmtCollisionCount = 0;

            this.addBP('for-loop');
            this.newListIdx = ((this.number % this.newList.size) + this.newList.size) % this.newList.size;
            this.addBP('compute-idx');
            if (!isBroken) {
                while (true) {
                    this.addBP('check-collision');
                    if (this.newList.get(this.newListIdx) === null) {
                        break;
                    }

                    this.fmtCollisionCount += 1;
                    this.newListIdx = (this.newListIdx + 1) % this.newList.size;
                    this.addBP('next-idx');
                }
            }
            const prevNumber = this.newList.get(this.newListIdx);
            if (prevNumber != null) {
                if (!isBroken) {
                    throw new Error(`!isBroken and overwriting a number - this should not happen`);
                }
                this.fmtMissingNumbers = this.fmtMissingNumbers.push(prevNumber);
                this._overwritten.push([this.originalListIdx, prevNumber, this.number]);
            }

            this.newList = this.newList.set(this.newListIdx, this.number);
            if (isBroken) {
                this.newListWithReplacements = this.newListWithReplacements.updateIn([this.newListIdx], arr =>
                    arr.insert(0, this.number)
                );
            }
            this.newList = this.newList.set(this.newListIdx, this.number);
            this.addBP('assign-elem', true);
        }

        this.addBP('return-created-list');

        return this.newList;
    }

    overwrittenNumbers() {
        return this._overwritten;
    }
}

export let formatSimplifiedInsertAllDescription = function(bp, prevBp) {
    switch (bp.point) {
        case 'create-new-list':
            return `Создаем новый список из <code>${bp.newList.size}</code> пустых ячеек`;
        case 'for-loop':
            return `[${bp.originalListIdx + 1}/${bp.originalList.size}] Вставляем <code>${bp.number}</code>`;
        case 'compute-idx':
            return `Вычисляем индекс ячейки: <code>${bp.newListIdx}</code> == <code>${bp.number} % ${
                bp.newList.size
            }</code>`;
        case 'check-collision':
            return chapter1_2_FormatCheckCollision(bp.newList, bp.newListIdx, bp.fmtCollisionCount);
        case 'next-idx':
            return `Продолжаем, индекс следующего элемента <code>${bp.newListIdx}</code> == <code>(${
                prevBp.newListIdx
            } + 1) % ${bp.newList.size}</code>`;
        case 'assign-elem': {
            const prevNumber = prevBp.newList.get(bp.newListIdx);
            if (prevNumber != null) {
                return `Коллизия чисел <code>${
                    bp.number
                }</code> и <code>${prevNumber}</code> в ячейке с индексом <code>${
                    bp.newListIdx
                }</code> — значение перезаписано`;
            } else {
                return `Помещаем <code>${bp.number}</code> в ячейку с индексом <code>${bp.newListIdx}</code>`;
            }
        }
        case 'return-created-list':
            if (bp.fmtMissingNumbers && bp.fmtMissingNumbers.size > 0) {
                return `Возвращаем созданный список, следующие числа в нем были перезаписаны: ${bp.fmtMissingNumbers
                    .map(number => `<code>${number}</code>`)
                    .join(', ')}`;
            } else {
                return `Возвращаем созданный список со всеми исходными числами`;
            }
    }
};

export const SimplifiedInsertStateVisualization = TetrisFactory([
    [
        LineOfBoxesComponent,
        [
            {labels: ['original_list']},
            'originalList',
            'originalListIdx',
            undefined,
            {selection1color: COLOR_FOR_READ_OPS},
        ],
    ],
    [HashBoxesComponent, [{labels: ['new_list']}, 'newList', 'newListIdx']],
]);

export const SimplifiedInsertBrokenStateVisualization = TetrisFactory([
    [
        LineOfBoxesComponent,
        [
            {labels: ['original_list']},
            'originalList',
            'originalListIdx',
            undefined,
            {selection1color: COLOR_FOR_READ_OPS},
        ],
    ],
    [HashBoxesBrokenComponent, [{labels: ['new_list']}, 'newListWithReplacements', 'newListIdx']],
]);

export const SIMPLIFIED_SEARCH_CODE = [
    ['def has_number(new_list, number):', 'start-execution', 0],
    ['    idx = number % len(new_list)', 'compute-idx', 1],
    ['    while new_list[idx] is not None:', 'check-not-found', 2],
    ['        if new_list[idx] == number:', 'check-found', 2],
    ['            return True', 'found-key', 2],
    ['        idx = (idx + 1) % len(new_list)', 'next-idx', 2],
    ['    return False', 'found-nothing', 1],
];

const HideSpanWhenJsLoaded = observer(function HideWhenJsLoaded({children, tag}) {
    return <span style={{opacity: win.jsLoaded ? 0 : 1, transition: 'opacity 1s ease'}}>{children}</span>;
});

class SimplifiedSearch extends BreakpointFunction {
    run(_newList, _number) {
        this.newList = new ImmutableList(_newList);
        this.number = _number;

        this.fmtCollisionCount = 0;
        this.newListIdx = ((this.number % this.newList.size) + this.newList.size) % this.newList.size;
        this.addBP('compute-idx');

        while (true) {
            this.addBP('check-not-found');
            if (this.newList.get(this.newListIdx) === null) {
                break;
            }
            this.addBP('check-found');
            if (EQ(this.newList.get(this.newListIdx), this.number)) {
                this.addBP('found-key');
                return true;
            }

            this.fmtCollisionCount += 1;
            this.newListIdx = (this.newListIdx + 1) % this.newList.size;
            this.addBP('next-idx');
        }

        this.addBP('found-nothing');

        return false;
    }
}

export let formatSimplifiedSearchDescription = function(bp) {
    switch (bp.point) {
        case 'compute-idx':
            return `Вычисляем индекс ячейки: <code>${bp.newListIdx}</code> == <code>${bp.number} % ${
                bp.newList.size
            }</code>`;
        case 'check-not-found':
            return commonFormatCheckNotFound(bp.newList, bp.newListIdx, bp.fmtCollisionCount);
        case 'check-found':
            let found = EQ(bp.newList.get(bp.newListIdx), bp.number);
            if (found) {
                return `Число найдено: <code>${bp.newList.get(bp.newListIdx)} == ${bp.number}</code>`;
            } else {
                return `Число пока не найдено: <code>${bp.newList.get(bp.newListIdx)} != ${bp.number}</code>`;
            }
        case 'found-key':
            return 'Теперь просто возвращаем <code>True</code>';
        case 'found-nothing':
            return 'Теперь просто возвращаем <code>False</code>';
        case 'next-idx':
            return `Продолжаем, индекс следующего элемента <code>${bp.newListIdx}</code>`;
        case 'return-created-list':
            return `Возвращаем созданный список`;
    }
};

export const SimplifiedSearchStateVisualization = TetrisFactory([
    [HashBoxesComponent, [{labels: ['new_list']}, 'newList', 'newListIdx']],
]);

function DynamicSimplifiedInsertAllBrokenOverwrittenExample({originalNumbers, addedNumber, overwrittenNumbers}) {
    let exampleOverwrite;
    let includedList;
    let [idx, n1, n2] = overwrittenNumbers[0];
    n1 = displayStr(n1);
    n2 = displayStr(n2);
    if (addedNumber === null) {
        includedList = false;
        exampleOverwrite = (
            <React.Fragment>
                For example, <code>{n1}</code> will get the same slot index (<code>{idx}</code>) as <code>{n2}</code>,
                and it will be overwritten.
            </React.Fragment>
        );
    } else {
        includedList = true;
        const anStr = displayStr(addedNumber);
        exampleOverwrite = (
            <React.Fragment>
                For the current list (
                <code dangerouslySetInnerHTML={{__html: '[' + originalNumbers.join(', ') + ']'}} />) it would work. But
                if we append a single number to it, for example <code>{anStr}</code>, then <code>{n1}</code> would get
                overwritten by <code>{n2}</code>, and the simple algorithm breaks.
            </React.Fragment>
        );
    }

    return (
        <DynamicP>
            <p
                className="dynamic-p"
                key={`oe-p-${addedNumber}-${n1}-${n2}-${idx}-${includedList ? JSON.stringify(originalNumbers) : null}`}
            >
                Would this approach work, however? Not entirely. {exampleOverwrite} Situations like these are called{' '}
                <em>collisions</em>.
            </p>
        </DynamicP>
    );
}

export class Ops {
    static createNew(numbers) {
        let sia = new SimplifiedInsertAll();
        const keys = sia.run(numbers);
        const bp = sia.getBreakpoints();
        return {keys, bp};
    }

    static createNewBroken(numbers) {
        let sia = new SimplifiedInsertAll();
        const keys = sia.run(numbers, true);
        return {bp: sia.getBreakpoints(), overwrittenNumbers: sia.overwrittenNumbers(), keys};
    }

    static hasKey(keys, number) {
        let ss = new SimplifiedSearch();
        const result = ss.run(keys, number);
        const bp = ss.getBreakpoints();
        return {bp, result, keys};
    }

    static linearSearch(numbers, searchedNumber) {
        return simpleListSearch(numbers, searchedNumber);
    }
}

function anotherValue(array, RANDOM_NUMBER_CHANCE = 0.3) {
    if (Math.random() > RANDOM_NUMBER_CHANCE) {
        return +randomChoice(array).toString();
    } else {
        return randint(Math.floor(-CHAPTER1_MAXNUM / 10), Math.floor(CHAPTER1_MAXNUM / 10));
    }
}

export class Chapter1_SimplifiedHash extends ChapterComponent {
    constructor() {
        super();

        this.state = {
            numbers: [
                BigNumber(1),
                BigNumber(56),
                BigNumber(50),
                BigNumber(2),
                BigNumber(44),
                BigNumber(25),
                BigNumber(17),
                BigNumber(4),
            ],
            simpleSearchNumber: 25,
            simplifiedHashSearchNumber: 2,
        };
    }

    runSimplifiedInsertAll = memoizeOne(numbers => {
        return Ops.createNew(numbers);
    });

    generateAlternativeDataForInsertAllBroken = memoizeOne(numbers => {
        let {bp, overwrittenNumbers} = this.runSimplifiedInsertAllBroken(numbers);
        if (overwrittenNumbers.length > 0) {
            return {originalNumbers: numbers, numbers, bp, addedNumber: null, overwrittenNumbers};
        } else {
            const minNum = BigNumber.max(...numbers);

            const addedNumber = minNum.plus(numbers.length + 1);
            const newNumbers = [...numbers, addedNumber];
            ({bp, overwrittenNumbers} = this.runSimplifiedInsertAllBroken(newNumbers));
            return {originalNumbers: numbers, numbers: newNumbers, bp, addedNumber, overwrittenNumbers};
        }
    });

    runProbingSimple = memoizeOne(slotsCount => {
        let g = new GenerateProbingLinks();
        const {links} = g.run(slotsCount, '', 'i+1');

        return {
            links,
            bp: g.getBreakpoints(),
        };
    });

    runSimplifiedInsertAllBroken = memoizeOne(numbers => {
        return Ops.createNewBroken(numbers);
    });

    runSimplifiedSearch = memoizeOne((keys, number) => {
        return Ops.hasKey(keys, number);
    });

    runSimpleListSearch = memoizeOne((numbers, searchedNumber) => {
        const {bp} = Ops.linearSearch(numbers, searchedNumber);
        return {bp};
    });

    render() {
        const slsRes = this.runSimpleListSearch(this.state.numbers, this.state.simpleSearchNumber);
        const siaBrokenRes = this.generateAlternativeDataForInsertAllBroken(this.state.numbers);
        const siaRes = this.runSimplifiedInsertAll(this.state.numbers);
        const ssRes = this.runSimplifiedSearch(siaRes.keys, this.state.simplifiedHashSearchNumber);

        const probingVisSlotsCount = 8;
        const probingSimple = this.runProbingSimple(probingVisSlotsCount);

        return (
            <div className="chapter chapter1">
                <h5>Contents</h5>
                {this.props.contents}
                <h2>Introduction</h2>
                <Subcontainerize>
                    <p>
                        Hi! This is <em>an explorable explanation</em> of Python dictionaries. This page is dynamic and
                        interactive &mdash; you can plug in your data and see how the algorithms work on it.{' '}
                        <HideSpanWhenJsLoaded>(Once the javascript loads)</HideSpanWhenJsLoaded>
                    </p>
                    <p className="mb-2">
                        To start with, let's say we have a simple list of distinct integers (change it if you want - the
                        page will update):
                    </p>
                    <BlockInputToolbar
                        input={PyListInput}
                        inputProps={{
                            allowDuplicates: false,
                            minSize: 1,
                            extraValueValidator: chapter1valueRangeValidator,
                        }}
                        initialValue={this.state.numbers}
                        onChange={this.setter('numbers', true)}
                        bottomBoundary=".chapter1"
                        {...this.props}
                    />
                    <p className="mb-0">
                        Python lists are actually arrays &mdash; contiguous chunks of memory. The name "list" may be
                        misleading to people who know about double-linked lists but are unfamiliar with Python. You can
                        picture a Python list as a row of slots, where each slot can hold a Python object:
                    </p>
                    <UnnamedListVisualization
                        bp={{data: this.state.numbers}}
                        compensateTopPadding={25}
                        windowWidth={this.props.windowWidth}
                        windowHeight={this.props.windowHeight}
                    />
                    <p>
                        To check if an element is present in a list, we can use the <code>in</code> operator like this:{' '}
                        <code className="text-nowrap">number in simple_list</code>, which returns either{' '}
                        <code>True</code> or <code>False</code>. Under the hood this short snippet does a linear scan.
                        This can be a lot of work. To see this, let's reimplement it in Python.
                    </p>
                    <div className="div-p">
                        Let's say we're looking for the following number in the original list:
                        <PySmallIntInput
                            inline={true}
                            value={this.state.simpleSearchNumber}
                            onChange={this.setter('simpleSearchNumber')}
                            anotherValue={() => anotherValue(this.state.numbers)}
                        />
                    </div>
                    <VisualizedCode
                        code={SIMPLE_LIST_SEARCH}
                        breakpoints={slsRes.bp}
                        formatBpDesc={formatSimpleListSearchBreakpointDescription}
                        stateVisualization={SimpleListSearchStateVisualization}
                        autoplayByDefault={true}
                        {...this.props}
                    />
                    <p>
                        (The visualization is interactive. The buttons allow you to step through the code. Notice here
                        that the time slider is draggable - feel free to rewind the time or move it forward. Also, feel
                        free to mess with the input and the original list - the visualization will update automatically)
                    </p>
                    <p>
                        What's not so great about linear scans? If we have a million distinct numbers, in the worst case
                        scenario, we may need to scan the whole list. But scanning over a few elements is no big deal.
                        We need to have some order and predictability to make the search fast. We need to have some idea
                        of where the searched element is located.
                    </p>
                    <p>
                        A Python dict implementation is basically a scan of a list (but a pretty weird scan). We'll
                        build the actual algorithm and data structure inside Python dictionary step by step, starting
                        with the code above, which is intentionally verbose.{' '}
                    </p>
                    <h2>Chapter 1: searching efficiently in a list</h2>
                    <p>
                        A Python dict is a collection of key-value pairs. And, the most important part of it is handling
                        keys. Keys need to be organized in such a way that efficient searching, inserting and deleting
                        is possible.
                    </p>
                    <p>
                        In this chapter, to keep things simple, we won't have any values, and "keys" will just be plain
                        integers. So, the simplified problem is to check if a number is present in a list, but we have
                        to do this{' '}
                        <em>
                            <strong>fast</strong>
                        </em>
                        . We'll tackle the real problem in the following chapters. But for now, bear with me.
                    </p>
                    <p>
                        Accessing a single element by index is very fast. Accessing only a few elements would be fast
                        too. We don't want to be doing a linear scan over the whole list every time we look up a number,
                        so we need to organize our data in a clever way.
                    </p>
                    <p> Here's how. </p>
                    <p>
                        Let's begin by creating a new list of slots. Each slot will either hold a number from the
                        original list or be empty (empty slots will hold <code>None</code>). We'll use the number itself
                        to compute an index of a slot. The simplest way to do this is to take the remainder of{' '}
                        <code>number</code> divided by <code>len(the_list)</code>:{' '}
                        <code className="text-nowrap">number % len(the_list)</code> and put our number in slot with this
                        index. To check if the number is there we could compute the slot index again and see if it is
                        empty.
                    </p>
                    <DynamicSimplifiedInsertAllBrokenOverwrittenExample
                        key="overwritten-example-component"
                        {...siaBrokenRes}
                    />
                    <VisualizedCode
                        code={SIMPLIFIED_INSERT_ALL_BROKEN_CODE}
                        breakpoints={siaBrokenRes.bp}
                        formatBpDesc={formatSimplifiedInsertAllDescription}
                        stateVisualization={SimplifiedInsertBrokenStateVisualization}
                        {...this.props}
                    />
                    <p>
                        To make this approach viable, we need to somehow <em>resolve collisions</em>. Let's do the
                        following: if the slot is already occupied by some other number, we'll just check the slot that
                        comes right after it. And if that slot is empty, we'll put the number there. But, what if that
                        slot is also occupied? Once again, we'll go ahead and check the next slot. We'll keep repeating
                        this process until we finally hit an empty slot. This process is called <em>probing</em>. And
                        because we do it linearly, it is called <em>linear probing</em>. In code, we would write this as{' '}
                        <code className="text-nowrap">(idx + 1) % len(simple_list)</code>, so it wraps around back to
                        the beginning at the last index:
                    </p>
                    <ProbingVisualization
                        slotsCount={probingVisSlotsCount}
                        links={probingSimple.links}
                        adjustTop={-70}
                        fixedHeight={170}
                        {...this.props}
                    />
                    <p>
                        If we make the new list the same size as the original list, we'll have too many collisions. If
                        we make it 10x larger, we'll have very few collisions, but we'll waste a lot of memory. So what
                        size should it be? We want to hit the sweet spot where we don't use up too much memory but also
                        don't have too many collisions. Twice the size of the original list is reasonable.
                    </p>
                    <p>
                        Let's transform the original list using this method (when reading this code, keep in mind that{' '}
                        <code>original_list</code> is a list of <em>distinct numbers</em>, so we don't need to handle
                        duplicates just yet).
                    </p>
                    <VisualizedCode
                        code={SIMPLIFIED_INSERT_ALL_CODE}
                        breakpoints={siaRes.bp}
                        formatBpDesc={formatSimplifiedInsertAllDescription}
                        stateVisualization={SimplifiedInsertStateVisualization}
                        {...this.props}
                    />
                    <p>
                        To search for a number, we retrace all the steps necessary to insert it: we start from the slot{' '}
                        <code className="text-nowrap">number % len(new_list)</code> and do linear probing. We either end
                        up finding the number or hitting an empty slot. The latter situation means that the number is
                        not present.
                    </p>
                    <div className="div-p">
                        Let's say we want to search for
                        <PySmallIntInput
                            inline={true}
                            value={this.state.simplifiedHashSearchNumber}
                            onChange={this.setter('simplifiedHashSearchNumber')}
                            anotherValue={() => anotherValue(this.state.numbers, 0.4)}
                        />
                    </div>
                    <VisualizedCode
                        code={SIMPLIFIED_SEARCH_CODE}
                        breakpoints={ssRes.bp}
                        formatBpDesc={formatSimplifiedSearchDescription}
                        stateVisualization={SimplifiedSearchStateVisualization}
                        {...this.props}
                    />
                    <p>
                        Calculating an index based on the value of the number and resolving collisions by linear probing
                        is an incredibly powerful idea. What we've just implemented is a simple <em>hash table</em>{' '}
                        (more about the term in the next chapter). Python dict uses a hash table internally, albeit a
                        more complex variant.
                    </p>
                    <p>
                        We still haven't discussed adding more elements (what happens if a table overflows?), removing
                        elements (removing an element without a trace would cause a hole to appear, wouldn't this cause
                        the search algorithm to stop prematurely in many cases?), and perhaps most importantly, handling
                        objects other than integers - strings, tuples, floats. We'll do this in the next chapters.
                    </p>
                    <h6>Collision resolution via separate chaining</h6>
                    <p>
                        There is a different method of collision resolution, called{' '}
                        <a href="https://en.wikipedia.org/wiki/Hash_table#Separate_chaining" target="_blank">
                            separate chaining
                        </a>
                        . It is also a good strategy which is commonly used. But that's not how Python resolves
                        collision in dicts, so it is beyond the scope of this explanation.{' '}
                    </p>
                    <h6>A couple of the notes about the explanation</h6>
                    <p>
                        First, this explanation discusses <code>dict</code> as it is implemented in{' '}
                        <a href="http://python.org/" target="_blank">
                            CPython
                        </a>{' '}
                        &mdash; the "default" and most common implementation of the Python language (if you are not sure
                        what implementation you use, it is almost certainly CPython). Some other implementations are{' '}
                        <a href="https://pypy.org/" target="_blank">
                            PyPy
                        </a>
                        ,{' '}
                        <a href="http://www.jython.org/" target="_blank">
                            Jython
                        </a>{' '}
                        and{' '}
                        <a href="http://ironpython.net/" target="_blank">
                            IronPython
                        </a>
                        . The way dicts works in each of these implementations may be similar to CPython (in the case of
                        PyPy) or very different from CPython (in the case of Jython).
                    </p>
                    <p>
                        Second, even though dict in CPython is implemented in C, this explanation uses Python for code
                        snippets. The goal of this page is to help you understand the algorithms and the underlying data
                        structures, not the minutiae of the C code (these details are interesting too - they are just
                        are beyond the scope of this explanation).
                    </p>
                </Subcontainerize>
            </div>
        );
    }
}
