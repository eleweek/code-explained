import * as React from 'react';
import memoizeOne from 'memoize-one';
import {List as ImmutableList} from 'immutable';

import {Subcontainerize, COLOR_FOR_READ_OPS, singularOrPluralRus} from './util';
import {Chapter2_HashTableFunctions} from './chapter2_hash_table_functions';
import {joinBreakpoints, BreakpointFunction} from './hash_impl_common';
import {VisualizedCode, TetrisFactory, LineOfBoxesComponent, HashBoxesComponent, dummyFormat} from './code_blocks';

export const BUBBLE_SORT_CODE = [
    ['def bubble_sort(a):', '', 0],
    ['    for i in range(len(a)):', 'for-i', 1],
    ['        swapped = False', 'swapped-false', 1],
    ['        for j in range(len(a) - i - 1):', 'for-j', 2],
    ['            if a[j] > a[j + 1]:', 'compare', 2],
    ['                a[j], a[j + 1] = a[j + 1], a[j]', 'swap', 2],
    ['                swapped = True', 'swapped-true', 2],
    ['        if not swapped:', 'check-swapped', 1],
    ['            break', 'break-swapped', 1],
    ['', 'end', -1],
];

export class BubbleSort extends BreakpointFunction {
    constructor() {
        super();
    }

    run(_a, granular = false) {
        this.a = new ImmutableList(_a);
        const n = _a.length;

        for (this.i = 0; this.i < n; ++this.i) {
            this.addBP('for-i');
            this.swapped = false;
            this.addBP('swapped-false');
            for (this.j = 0; this.j < n - 1 - this.i; ++this.j) {
                this.jplus1 = this.j + 1;
                if (granular) {
                    this.addBP('for-j');
                }
                const aj = this.a.get(this.j);
                const ajplus1 = this.a.get(this.j + 1);
                if (granular) {
                    this.addBP('compare');
                }
                if (aj > ajplus1) {
                    this.a = this.a.set(this.j, ajplus1);
                    this.a = this.a.set(this.j + 1, aj);
                    if (granular) {
                        this.addBP('swap');
                    }
                    this.swapped = true;
                    if (granular) {
                        this.addBP('swapped-true');
                    }
                }
            }
            this.j = undefined;
            this.jplus1 = undefined;
            this.addBP('check-swapped');
            if (!this.swapped) {
                this.addBP('break-swapped');
                return;
            }
            this.swapped = undefined;
        }
        this.addBP('end');

        return this.a;
    }
}

export function formatBubbleSort(bp) {
    switch (bp.point) {
        case 'for-i':
            return `Делаем <code>${bp.i + 1}</code>-ю итерацию сортировки`;
        case 'swapped-false':
            return `На этой итерации элементы еще не меняли местами`;
        case 'for-j':
            return `Посмотрим на <code>${bp.j}</code>-й элемент, <code>${bp.a.get(bp.j)}</code>`;
        case 'compare': {
            const aj = bp.a.get(bp.j);
            const aj1 = bp.a.get(bp.j + 1);
            return `<code>${aj} ${formatComparison(aj, aj1)} ${aj1}</code>, сравниваем его с соседним`;
        }
        case 'swap': {
            return `Поменяем соседей местами`;
        }
        case 'swapped-true': {
            return `Запомним, что поменяли местами`;
        }
        case 'check-swapped': {
            return bp.swapped
                ? `На этой итерации мы делали обмены, поэтому продолжаем`
                : `На этой итерации мы не сделали обменов, поэтому массив отсортирован`;
        }
        case 'break-swapped':
            return 'Выходим';
        case 'end':
            return 'Массив отсортирован';
    }
}

export const INSERTION_SORT_CODE = [
    ['def insertion_sort(a):', '', 0],
    ['    for i in range(1, len(a)):', 'for-i', 2],
    ['        currentValue = array[i]', 'assign-current-value', 2],
    ['        pos = i', 'assign-pos', 2],
    ['', '', -1],
    ['        while pos > 0 and a[pos - 1] > currentValue:', 'while', 3],
    ['            a[pos] = a[pos - 1]', 'swap', 3],
    ['            pos -= 1', 'dec-pos', 3],
    ['', '', -1],
    ['        a[pos] = currentValue', 'assign-a-found-pos', 2],
    ['', 'end', -1],
];

export class InsertionSort extends BreakpointFunction {
    constructor() {
        super();
    }

    run(_a, granular = false) {
        this.a = new ImmutableList(_a);
        const n = _a.length;

        for (this.i = 1; this.i < n; ++this.i) {
            this.addBP('for-i');
            this.currentValue = this.a.get(this.i);
            // this.addBP('assign-current-value');
            this.pos = this.i;
            if (granular) {
                this.addBP('assign-pos');
                this.addBP('while');
            }
            while (this.pos > 0 && this.a.get(this.pos - 1) > this.currentValue) {
                this.a = this.a.set(this.pos, this.a.get(this.pos - 1));
                if (granular) {
                    this.addBP('swap');
                }
                this.pos--;
                if (granular) {
                    this.addBP('dec-pos');
                }
            }

            this.a = this.a.set(this.pos, this.currentValue);
            if (granular) {
                this.addBP('assign-a-found-pos');
            }
        }
        this.i = null;
        this.pos = null;
        this.addBP('end');
        return this.a;
    }
}

export const MERGE_SORT_CODE = [
    ['def merge_sort(a, l, r):', 'def-merge-sort', 0],
    ['    if r - l > 1:', 'compare-size', 1],
    ['        m = (l + r) // 2', 'compute-m', 1],
    ['        merge_sort(a, l, m)', 'merge-sort-left', 2],
    ['        merge_sort(a, m, r)', 'merge-sort-right', 2],
    ['        merge(a, l, m, r)', 'merge', 2],
    ['', 'end', -1],
    ['', '', -1],
    ['def merge(a, l, m, r):', 'def-merge', 0],
    ['   left_a = a[l:m]', 'left-copy', 1],
    ['   right_a = a[m:r]', 'right-copy', 1],
    ['   li = 0', 'assign-li', 1],
    ['   ri = 0', 'assign-ri', 1],
    ['   for i in range(l,r):', 'for-i', 2],
    ['        if ri >= len(right_a) or \\', 'if-right-ended', 3],
    ['           (li < len(left_a) and left_a[li] < right_a[ri]):', 'if-left-not-ended-smaller', 3],
    ['            a[i] = left_a[li]', 'assign-left-a', 3],
    ['            li += 1', 'inc-li', 3],
    ['        else:', '', 3],
    ['            a[i] = right_a[ri]', 'assign-right-a', 3],
    ['            ri += 1', 'inc-ri', 3],
];

class MergeSort extends BreakpointFunction {
    constructor() {
        super();
    }

    merge() {
        this.left_a = this.a.slice(this.l, this.m);
        this.addBP('left-copy');
        this.right_a = this.a.slice(this.m, this.r);
        console.log('right_a', this.left_a, this.right_a);
        this.addBP('right-copy');
        this.li = 0;
        this.addBP('assign-li');
        this.ri = 0;
        this.addBP('assign-ri');
        this.addBP('for-i');
        for (this.i = this.l; this.i < this.r; ++this.i) {
            this.addBP('if-right-ended');
            let isLeftSide = false;
            if (this.ri >= this.right_a.size) {
                this.addBP('if-left-not-ended-smaller');
                isLeftSide = true;
            } else {
                if (this.li < this.left_a.size && this.left_a.get(this.li) < this.right_a.get(this.ri)) {
                    isLeftSide = true;
                } else {
                    isLeftSide = false;
                }
            }
            if (isLeftSide) {
                this.a = this.a.set(this.i, this.left_a.get(this.li));
                this.addBP('assign-left-a');
                this.li++;
                this.addBP('inc-li');
            } else {
                this.a = this.a.set(this.i, this.right_a.get(this.ri));
                this.addBP('assign-left-a');
                this.ri++;
                this.addBP('inc-ri');
            }
        }
        this.i = null;
        this.left_a = new ImmutableList();
        this.right_a = new ImmutableList();
        this.li = null;
        this.ri = null;
    }

    run(_a) {
        this.a = new ImmutableList(_a);
        this.left_a = new ImmutableList();
        this.right_a = new ImmutableList();
        this.mergeSort(0, _a.length);
    }

    mergeSort(_l, _r) {
        this.l = _l;
        this.r = _r;
        console.log('mergeSort', _l, _r);

        this.addBP('compare-size');
        if (this.r - this.l > 1) {
            this.m = Math.trunc((this.l + this.r) / 2);
            this.addBP('compute-m');
            const savedM = this.m;
            const savedL = this.l;
            const saverR = this.r;
            this.addBP('merge-sort-left');
            this.mergeSort(this.l, this.m);
            this.m = savedM;
            this.l = savedL;
            this.r = saverR;
            this.addBP('merge-sort-right');
            this.mergeSort(this.m, this.r);
            this.m = savedM;
            this.l = savedL;
            this.r = saverR;
            this.merge();
        }
        this.addBP('end');
    }
}

export const BubbleSortVisualisationFactory = withLabel =>
    TetrisFactory([
        [
            HashBoxesComponent,
            [
                {labels: withLabel ? ['a'] : [null]},
                'a',
                'j',
                'jplus1',
                {selection1color: 'red', selection2color: 'red'},
            ],
        ],
    ]);

export const BubbleSortVisualisation = BubbleSortVisualisationFactory(true);
export const BubbleSortVisualisationNoLabel = BubbleSortVisualisationFactory(false);

const InsertionSortVisualisation = TetrisFactory([[HashBoxesComponent, [{labels: ['a']}, 'a', 'i', undefined]]]);

const MergeSortVisualisation = TetrisFactory([
    [HashBoxesComponent, [{labels: ['a']}, 'a', 'l', 'r']],
    [HashBoxesComponent, [{labels: ['left_a']}, 'left_a', 'li']],
    [HashBoxesComponent, [{labels: ['right_a']}, 'right_a', 'ri']],
]);

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
            array: ['ps', 'du', 'ls', 'cat', 'top', 'ping', 'chmod', 'grep', 'gzip', 'dd', 'chown', 'at', 'awk', 'rm'],
            arrayNum: [42, 13, 27, 89, 14, 67, 92, 54, 11, 45, 29, 33],
            // array: ['ps', 'du', 'ls', 'cat', 'top', 'ping', 'chmod', 'grep', 'gzip'],
        };
    }

    runBubbleSort = memoizeOne(a => {
        const bs = new BubbleSort();
        bs.run(a);
        const bp = bs.getBreakpoints();
        return {bp};
    });

    runInsertionSort = memoizeOne((a, granular) => {
        const is = new InsertionSort();
        is.run(a, granular);
        const bp = is.getBreakpoints();
        return {bp};
    });

    runMergeSort = memoizeOne(a => {
        const ms = new MergeSort();
        ms.run(a);
        const bp = ms.getBreakpoints();
        return {bp};
    });

    render() {
        console.log('New demos', this.state.array);
        const newPlus1 = this.runCreateNew(this.state.array, this.state.array.length);
        const newDouble = this.runCreateNew(this.state.array, 2 * this.state.array.length);
        const joinedBp = joinBreakpoints([newPlus1.bp, newDouble.bp], ['plus1', 'double']);

        const bubbleSortRes = this.runBubbleSort(this.state.arrayNum);
        console.log('!!!', joinedBp.bp);
        const insertionSortRes = this.runInsertionSort(this.state.arrayNum);

        const insertionSortGranularRes = this.runInsertionSort(this.state.arrayNum, true);
        const mergeSortRes = this.runMergeSort(this.state.arrayNum);
        console.log('!!! merge bp', mergeSortRes);

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
                    <VisualizedCode
                        code={BUBBLE_SORT_CODE}
                        breakpoints={bubbleSortRes.bp}
                        formatBpDesc={dummyFormat}
                        stateVisualization={BubbleSortVisualisation}
                        {...this.props}
                    />
                    <VisualizedCode
                        code={INSERTION_SORT_CODE}
                        breakpoints={insertionSortRes.bp}
                        formatBpDesc={dummyFormat}
                        stateVisualization={InsertionSortVisualisation}
                        {...this.props}
                    />
                    <VisualizedCode
                        code={INSERTION_SORT_CODE}
                        breakpoints={insertionSortGranularRes.bp}
                        formatBpDesc={dummyFormat}
                        stateVisualization={InsertionSortVisualisation}
                        {...this.props}
                    />
                    <VisualizedCode
                        code={MERGE_SORT_CODE}
                        breakpoints={mergeSortRes.bp}
                        formatBpDesc={dummyFormat}
                        stateVisualization={MergeSortVisualisation}
                        {...this.props}
                    />
                </Subcontainerize>
            </div>
        );
    }
}

export const QUICK_SORT_CODE = [
    ['def quicksort(a, start, stop):', '', 0],
    ['    if start >= stop:', 'compare-size', 1],
    ['        return', 'return', 2],
    ['', '', -1],
    ['    pivot = a[(start + stop) // 2]', 'select-pivot', 1],
    ['    left = start', 'left-start', 1],
    ['    right = stop', 'right-stop', 1],
    ['', '', -1],
    ['    while left <= right:', 'while-left-right', 2],
    ['        while a[left] < pivot:', 'while-left', 3],
    ['            left += 1', 'inc-left-first', 3],
    ['        while a[right] > pivot:', 'while-right', 3],
    ['            right -= 1', 'dec-right-first', 3],
    ['        if left <= right:', 'compare-left-right', 2],
    ['            a[left], a[right] = a[right], a[left]', 'swap', 3],
    ['            left += 1', 'inc-left-second', 3],
    ['            right -= 1', 'dec-right-second', 3],
    ['    quicksort(a, start, right)', 'sort-left', 1],
    ['    quicksort(a, left, stop)', 'sort-right', 1],
    ['    ', 'exit', 1],
];

function formatComparison(num1, num2) {
    if (num1 === num2) {
        return '==';
    } else if (num1 < num2) {
        return '<';
    } else {
        return '>';
    }
}

export function formatQuickSort(bp) {
    switch (bp.point) {
        case 'compare-size': {
            const len = bp.stop - bp.start + 1;
            const explanation =
                len <= 0
                    ? 'пустой подмассив уже отсортирован'
                    : len === 1
                    ? `${bp.recursionLevel > 0 ? 'под' : ''}массив из одного элемента уже отсортирован`
                    : `сортируем ${bp.recursionLevel > 0 ? 'под' : ''}массив длины <code>${len}</code>`;
            return `<code>${bp.start} ${formatComparison(bp.start, bp.stop)} ${bp.stop}</code>: ${explanation}`;
        }
        case 'return':
            return 'Ничего делать не нужно — выходим';
        case 'select-pivot':
            return `Выбираем элемент-разделитель: <code>${bp.pivot}</code>`;
        case 'left-start':
            return `Левый указатель: <code>${bp.left}</code>`;
        case 'right-stop':
            return `Правый указатель: <code>${bp.right}</code>`;
        case 'while-left-right': {
            const len = bp.right - bp.left + 1;
            const explanation =
                len <= 0
                    ? `все элементы слева от разделителя меньше него, а все справа — больше`
                    : `остается обработать ${len} ${singularOrPluralRus(len, 'элемент', 'элемента', 'элементов')}`;
            return `<code>${bp.left} ${bp.left <= bp.right ? '<=' : '>'} ${bp.right}</code>: ${explanation}`;
        }
        case 'while-left': {
            const a = bp.array.get(bp.left);
            const explanation =
                a < bp.pivot
                    ? 'элемент слева от разделителя уже меньше'
                    : `слева должны быть элементы меньше разделителя, а мы натолкнулись на ${
                          a === bp.pivot ? 'равный' : 'больший'
                      } элемент`;
            return `<code>${a} ${formatComparison(a, bp.pivot)} ${bp.pivot}</code>: ${explanation}`;
        }
        case 'while-right': {
            const a = bp.array.get(bp.right);
            console.log('While right', a, bp.array, bp.array.get(bp.right));
            const explanation =
                a > bp.pivot
                    ? 'элемент справа от разделителя уже больше'
                    : `справа должны быть элементы больше разделителя, а мы натолкнулись на ${
                          a === bp.pivot ? 'равный' : 'меньший'
                      } элемент`;
            return `<code>${a} ${formatComparison(a, bp.pivot)} ${bp.pivot}</code>: ${explanation}`;
        }
        case 'inc-left-first':
        case 'inc-left-second':
            return `Сдвигаем левый указатель вправо на <code>${bp.left}</code> элемент`;
        case 'dec-right-first':
        case 'dec-right-second':
            return `Сдвигаем правый указатель влево на <code>${bp.right}</code> элемент`;
        case 'compare-left-right': {
            const len = bp.right - bp.left + 1;
            return `<code>${bp.left} ${formatComparison(bp.left, bp.right)} ${
                bp.right
            }</code>: еще ${len} ${singularOrPluralRus(len, 'элемент', 'элемента', 'элементов')} для обработки`;
        }
        case 'swap': {
            const isSame = bp.left === bp.right;
            if (isSame) {
                return `Ничего не происходит: меняем элемент сам с собой`;
            } else {
                return `Меняем местами элементы, на которые наткнулись: <code>${bp.array.get(
                    bp.right
                )}</code> и <code>${bp.array.get(bp.left)}</code>`;
            }
        }
        case 'sort-left':
            return `Рекурсивно сортируем левый подмассив <code>${bp.start}..${bp.right}</code>`;
        case 'sort-right':
            return `Рекурсивно сортируем правый подмассив <code>${bp.left}..${bp.stop}</code>`;
        case 'exit': {
            if (bp.recursionLevel > 0) {
                return `Подмассив <code>${bp.start}..${
                    bp.stop
                }</code> отсортирован. Выходим из рекурсии (текущая глубина: ${bp.recursionLevel})`;
            } else {
                return `Весь массив отсортирован, выходим`;
            }
        }
    }
}

export class QuickSort extends BreakpointFunction {
    constructor() {
        super();
    }

    run(_a) {
        this.array = new ImmutableList(_a);
        this.recursionLevel = 0;
        this.quickSort(0, _a.length - 1);
    }

    quickSort(_start, _stop) {
        this.start = _start;
        this.stop = _stop;
        this.addBP('compare-size');
        console.log('quicksort', this.start, this.stop);
        if (this.stop <= this.start) {
            this.addBP('return');
            return;
        }
        this.pivot = this.array.get(Math.trunc((this.start + this.stop) / 2));
        this.addBP('select-pivot');
        this.left = this.start;
        this.addBP('left-start');
        this.right = this.stop;
        this.addBP('right-stop');

        while (true) {
            this.addBP('while-left-right');
            if (this.left > this.right) {
                break;
            }

            while (true) {
                this.addBP('while-left');
                if (this.array.get(this.left) >= this.pivot) {
                    break;
                }
                this.left++;
                this.addBP('inc-left-first');
            }

            while (true) {
                this.addBP('while-right');
                if (this.array.get(this.right) <= this.pivot) {
                    break;
                }
                this.right--;
                this.addBP('dec-right-first');
            }

            this.addBP('compare-left-right');
            if (this.left <= this.right) {
                const _al = this.array.get(this.left);
                const _ar = this.array.get(this.right);
                this.array = this.array.set(this.left, _ar);
                this.array = this.array.set(this.right, _al);
                this.addBP('swap');
                this.left += 1;
                this.addBP('inc-left-second');
                this.right -= 1;
                this.addBP('dec-right-second');
            }
        }

        console.log(this.start, this.left, this.right, this.stop);
        const savedPivot = this.pivot;
        const savedLeft = this.left;
        const savedRight = this.right;
        const savedStop = this.stop;
        const savedStart = this.start;

        this.pivot = undefined;
        this.left = undefined;
        this.addBP('sort-left');
        this.recursionLevel++;
        this.quickSort(this.start, this.right);
        this.recursionLevel--;

        this.pivot = savedPivot;
        this.left = savedLeft;
        this.right = savedRight;
        this.stop = savedStop;
        this.start = savedStart;

        this.pivot = undefined;
        this.right = undefined;
        this.addBP('sort-right');
        this.recursionLevel++;
        this.quickSort(this.left, this.stop);
        this.recursionLevel--;

        this.addBP('exit');
    }
}
