import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';

import {BigNumber} from 'bignumber.js';

import low from 'lowlight/lib/core';

import unified from 'unified';
import rehypestringify from 'rehype-stringify';

import pythonHl from 'highlight.js/lib/languages/python';
low.registerLanguage('python', pythonHl);

import HighLightJStyle from 'highlight.js/styles/default.css';

import Slider from 'rc-slider/lib/Slider';
import 'rc-slider/assets/index.css';

import SmoothScrollbar from 'react-smooth-scrollbar';

import {MyErrorBoundary, getUxSettings} from './util';
import {isNone, isDummy} from './hash_impl_common';

import {library} from '@fortawesome/fontawesome-svg-core';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faPlay,
    faStepForward,
    faStepBackward,
    faFastForward,
    faFastBackward,
    faPause,
    faRedoAlt,
} from '@fortawesome/free-solid-svg-icons';

library.add(faPlay);
library.add(faStepForward);
library.add(faStepBackward);
library.add(faFastForward);
library.add(faFastBackward);
library.add(faPause);
library.add(faRedoAlt);

function doubleRAF(callback) {
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(callback);
    });
}

function reflow(node) {
    if (!node) {
        console.error('Not reflowing non-existant node!');
        return;
    }
    node && node.scrollTop;
}

function renderPythonCode(codeString) {
    let lowAst = low.highlight('python', codeString).value;

    const processor = unified().use(rehypestringify);
    return processor.stringify({
        type: 'root',
        children: lowAst,
    });
}

export function dummyFormat(bp) {
    /* return JSON.stringify(bp); */
    return '';
}

export function SimpleCodeBlock(props) {
    return (
        <pre>
            <code dangerouslySetInnerHTML={{__html: renderPythonCode(props.children)}} />
        </pre>
    );
}

const BOX_SIZE = 40;
const SPACING_X = 2;
const SPACING_Y_SLOT = 5;

function computeBoxX(idx) {
    return (SPACING_X + BOX_SIZE) * idx;
}

function computeBoxTransformProperty(idx, y) {
    let x = computeBoxX(idx);
    return `translate(${x}px, ${y}px)`;
}

function pyObjToReactKey(obj) {
    let res;
    if (typeof obj === 'number') {
        res = ['int', obj];
    } else if (typeof obj === 'string') {
        res = ['string', obj];
    } else if (isNone(obj)) {
        res = ['none'];
    } else if (isDummy(obj)) {
        res = ['dummy'];
    } else if (BigNumber.isBigNumber(obj)) {
        res = ['bignumber.js', obj.toFixed()];
    } else {
        throw new Error(`Unknown key: ${JSON.stringify(obj)}`);
    }

    return JSON.stringify(res);
}

function pyObjToDisplayedString(obj, quoteString = true) {
    if (typeof obj === 'number' || isNone(obj) || isDummy(obj)) {
        return obj.toString();
    } else if (BigNumber.isBigNumber(obj)) {
        return obj.toFixed();
    } else if (typeof obj === 'string') {
        if (quoteString) {
            return JSON.stringify(obj);
        } else {
            return obj;
        }
    } else {
        throw new Error(`Unknown key: ${JSON.stringify(obj)}`);
    }
}

class ActiveBoxSelectionUnthrottled extends React.PureComponent {
    render() {
        let {extraClassName, idx, status, transitionDuration} = this.props;
        let yOffset = this.props.yOffset || 0;

        const animatedClass = 'active-box-selection-animated';
        let classes = ['active-box-selection', extraClassName, animatedClass];

        let visibility;
        switch (status) {
            case 'removing':
                visibility = 'hidden';
                break;
            case 'created':
                visibility = 'hidden';
                break;
            case 'adding':
                visibility = 'visible';
                break;
        }
        const style = {
            visibility: visibility,
            transitionDuration: `${transitionDuration}ms`,
            // TODO: the part after : is weird/wrong
            transform: idx != null ? computeBoxTransformProperty(idx, yOffset) : undefined,
        };
        return <div ref={this.props.setInnerRef} className={classNames(classes)} style={style} />;
    }
}

class ActiveBoxSelectionThrottled extends React.Component {
    constructor() {
        super();
        this.state = {
            transitionRunning: false,
            currentIdx: null,
            currentStatus: null,
        };
    }

    handleRef = node => {
        this.node = node;
    };

    shouldComponentUpdate() {
        return !this.state.transitionRunning;
    }

    render() {
        let idx, status;
        if (this.state.transitionRunning) {
            idx = this.state.currentIdx;
            status = this.state.currentStatus;
        } else {
            idx = this.props.idx;
            status = this.props.status;
        }
        const extraClassName = this.props.extraClassName;
        const yOffset = this.props.yOffset;
        return (
            <ActiveBoxSelectionUnthrottled
                setInnerRef={this.handleRef}
                extraClassName={extraClassName}
                idx={idx}
                status={status}
                yOffset={yOffset}
                transitionDuration={this.props.transitionDuration}
            />
        );
    }

    handleTransitionEnd = () => {
        this.setState({
            transitionRunning: false,
        });
    };

    componentDidUpdate() {
        const targetIdx = this.props.idx;
        const targetStatus = this.props.status;

        if (
            !this.state.transitionRunning &&
            (this.state.currentIdx != targetIdx || this.state.currentStatus != targetStatus)
        ) {
            const statusAllowsTransition = targetStatus === 'adding' && this.state.currentStatus === 'adding';
            this.setState({
                transitionRunning: statusAllowsTransition && this.state.currentIdx != targetIdx,
                currentIdx: targetIdx,
                currentStatus: targetStatus,
            });
        }
    }

    componentDidMount() {
        this.setState({
            transitionRunning: false,
            currentIdx: this.props.idx,
            currentStatus: this.props.status,
        });

        this.node.addEventListener('transitionend', this.handleTransitionEnd, false);
    }
}

function ActiveBoxSelection(props) {
    const isThrottled = getUxSettings().THROTTLE_SELECTION_TRANSITIONS;

    const isDynamicDuration = getUxSettings().DYNAMIC_SELECTION_TRANSITION_DURATION;
    const Component = isThrottled ? ActiveBoxSelectionThrottled : ActiveBoxSelectionUnthrottled;

    if (isDynamicDuration) {
        return <ActiveBoxSelectionDynamicTransition {...props} componentClass={Component} />;
    } else {
        return <Component {...props} transitionDuration={300} />;
    }
}

class ActiveBoxSelectionDynamicTransition extends React.Component {
    constructor() {
        super();
        this.lastRender = null;
    }

    render() {
        let transitionDuration = 300;
        if (this.lastRender != null && performance.now() - this.lastRender < 200) {
            transitionDuration = 200;
        }
        this.lastRender = performance.now();

        const Component = this.props.componentClass;
        return <Component {...this.props} transitionDuration={transitionDuration} />;
    }
}

class Box extends React.PureComponent {
    shortDisplayedString(value) {
        const extraType =
            value === 'DUMMY' || value === 'EMPTY' || (typeof value === 'string' && /^[-+]?[0-9]+$/.test(value));
        const maxLen = extraType ? 8 : 13;
        // TODO: add hover?
        let s = pyObjToDisplayedString(value, false);
        if (s.length <= maxLen) {
            return {
                shortenedValue: s,
                extraType,
            };
        }

        const cutCharsCount = extraType ? 3 : 4;

        return {
            shortenedValue: s.substring(0, cutCharsCount) + '\u22EF' + s.substring(s.length - cutCharsCount, s.length),
            extraType,
        };
    }

    render() {
        const {value, idx, status} = this.props;
        let yOffset = this.props.yOffset || 0;

        let classes = ['box', 'box-animated'];
        let content;
        if (value != null) {
            const {shortenedValue, extraType} = this.shortDisplayedString(value);
            console.log('SSS', shortenedValue, extraType);
            const extraTypeSpan = extraType ? <span className="box-content-extra-type">(str)</span> : null;
            classes.push('box-full');
            content = (
                <span className="box-content">
                    {shortenedValue} {extraTypeSpan}
                </span>
            );
        } else {
            classes.push('box-empty');
        }

        let y;

        switch (status) {
            case 'removing':
                classes.push('box-removed');
                y = value != null ? yOffset - BOX_SIZE : yOffset;
                break;
            case 'created':
                classes.push('box-just-added');
                y = value != null ? yOffset - BOX_SIZE : yOffset;
                break;
            case 'adding':
                y = yOffset;
                break;
        }

        return (
            <div style={{transform: computeBoxTransformProperty(this.props.idx, y)}} className={classNames(classes)}>
                {content}
            </div>
        );
    }
}

/* TODO: make these functions static methods */
function slotBoxes(keys, value) {
    const slot = value;
    return [
        [keys[0], {value: slot.hashCode, yOffset: 0}],
        [keys[1], {value: slot.key, yOffset: BOX_SIZE + SPACING_Y_SLOT}],
        [keys[2], {value: slot.value, yOffset: 2 * (BOX_SIZE + SPACING_Y_SLOT)}],
    ];
}

function oneBox(keys, value) {
    return [[keys[0], {value}]];
}

class SlotSelection extends React.PureComponent {
    render() {
        const {extraClassName, idx, status} = this.props;

        return [
            <ActiveBoxSelection
                key={`${extraClassName}-hashCode`}
                extraClassName={extraClassName}
                idx={idx}
                status={status}
                yOffset={0}
            />,
            <ActiveBoxSelection
                key={`${extraClassName}-key`}
                extraClassName={extraClassName}
                idx={idx}
                status={status}
                yOffset={BOX_SIZE + SPACING_Y_SLOT}
            />,
            <ActiveBoxSelection
                key={`${extraClassName}-value`}
                extraClassName={extraClassName}
                idx={idx}
                status={status}
                yOffset={2 * (BOX_SIZE + SPACING_Y_SLOT)}
            />,
        ];
    }
}

class BaseBoxesComponent extends React.PureComponent {
    // Use slightly lower number than the actual 1000
    // Because it seems to produce less "stupid" looking results
    static ANIMATION_DURATION_TIMEOUT = 900;

    constructor() {
        super();

        this.state = {
            status: {},
            keyModId: {},
            keyBox: {},
            activeBoxSelection1: null,
            activeBoxSelection1status: null,
            activeBoxSelection2: null,
            activeBoxSelection2status: null,
            lastIdx: null,
            lastIdx2: null,
            needProcessCreatedAfterRender: false,
            firstRender: true,
            modificationId: 0,
        };
        this.ref = React.createRef();
        this.gcTimeout = null;
    }

    static getDerivedStateFromProps(nextProps, state) {
        const modificationId = state.modificationId + 1;
        const Selection = nextProps.selectionClass;
        const boxFactory = nextProps.boxFactory;

        let newState;
        if (!state.firstRender) {
            let newStatus = _.clone(state.status);
            let newKeyModId = _.clone(state.keyModId);
            let newKeyBox = {};
            for (let key in state.keyBox) {
                newKeyBox[key] = state.keyBox[key];
            }

            const nextArray = nextProps.array || [];
            let needProcessCreatedAfterRender = false;
            const nextArrayKeys = nextProps.getKeys(nextArray);
            let nextKeysSet = new Set();
            for (let idx = 0; idx < nextArray.length; ++idx) {
                const keys = nextArrayKeys[idx];
                const idxBoxesProps = boxFactory(keys, nextArray[idx]);
                for (const [key, someProps] of idxBoxesProps) {
                    nextKeysSet.add(key);
                    let status;
                    if (!(key in state.status)) {
                        status = 'created';
                        // console.log("Creating", key);
                        needProcessCreatedAfterRender = true;
                        newKeyBox[key] = <Box idx={idx} status={status} key={key} {...someProps} />;
                    } else {
                        status = 'adding';
                        newKeyBox[key] = React.cloneElement(state.keyBox[key], {idx, status, ...someProps});
                    }
                    newStatus[key] = status;
                    newKeyModId[key] = modificationId;
                }
            }

            let needGarbageCollection = false;
            for (let key in state.keyBox) {
                const status = newStatus[key];
                if (!nextKeysSet.has(key)) {
                    if (status !== 'removing') {
                        newStatus[key] = 'removing';
                        newKeyModId[key] = modificationId;
                        newKeyBox[key] = React.cloneElement(state.keyBox[key], {status: 'removing'});
                        needGarbageCollection = true;
                    }
                }
            }

            newState = {
                firstRender: false,
                status: newStatus,
                keyBox: newKeyBox,
                keyModId: newKeyModId,
                needProcessCreatedAfterRender: needProcessCreatedAfterRender,
                needGarbageCollection: needGarbageCollection,
                modificationId: modificationId,
            };
        } else {
            let newStatus = {};
            let newKeyModId = {};
            let newKeyBox = {};
            let arrayBoxKeys = nextProps.getKeys(nextProps.array);
            for (let [idx, value] of nextProps.array.entries()) {
                const keys = arrayBoxKeys[idx];
                const idxBoxesProps = boxFactory(keys, value);
                for (const [key, someProps] of idxBoxesProps) {
                    newStatus[key] = 'adding';
                    newKeyModId[key] = modificationId;
                    newKeyBox[key] = <Box idx={idx} key={key} status={'adding'} {...someProps} />;
                }
            }

            newState = {
                firstRender: false,
                status: newStatus,
                keyBox: newKeyBox,
                keyModId: newKeyModId,
                needProcessCreatedAfterRender: false,
                needGarbageCollection: false,
                modificationId: modificationId,
            };
        }

        let activeBoxSelection1 = state.activeBoxSelection1;
        let activeBoxSelection2 = state.activeBoxSelection2;

        let activeBoxSelection1status = state.activeBoxSelection1status;
        let activeBoxSelection2status = state.activeBoxSelection2status;

        // FIXME: handling active selection is extremely ugly, should be rewritten in a much cleaner fashion
        // FIXME: probably better to get rid of created/removing/adding statuses here
        //
        // TODO: it may be a good idea to combine it with Selection component
        const getOrModSelection = (selection, extraClassName, oldIdx, _idx, status) => {
            if (_idx == null) {
                status = 'removing';
            } else if (status === 'created' || _idx != null) {
                status = 'adding';
            }

            const idx = _idx != null ? _idx : oldIdx;
            if (!selection) {
                return [
                    <Selection
                        key={extraClassName}
                        keyTemplate={extraClassName}
                        extraClassName={extraClassName}
                        idx={idx}
                        status={status}
                    />,
                    status,
                ];
            } else {
                return [React.cloneElement(selection, {idx, status}), status];
            }
        };

        if (activeBoxSelection1 || nextProps.idx != null) {
            [activeBoxSelection1, activeBoxSelection1status] = getOrModSelection(
                activeBoxSelection1,
                'active-box-selection-1',
                state.lastIdx,
                nextProps.idx,
                activeBoxSelection1status
            );
        }

        if (activeBoxSelection2 || nextProps.idx2 != null) {
            [activeBoxSelection2, activeBoxSelection2status] = getOrModSelection(
                activeBoxSelection2,
                'active-box-selection-2',
                state.lastIdx2,
                nextProps.idx2,
                activeBoxSelection1status
            );
        }

        if (nextProps.idx != null) {
            newState.lastIdx = nextProps.idx;
        } else {
            newState.lastIdx = state.lastIdx;
        }

        if (nextProps.idx2 != null) {
            newState.lastIdx2 = nextProps.idx2;
        } else {
            newState.lastIdx2 = state.lastIdx2;
        }

        newState.activeBoxSelection1status = activeBoxSelection1status;
        newState.activeBoxSelection2status = activeBoxSelection2status;
        newState.activeBoxSelection1 = activeBoxSelection1;
        newState.activeBoxSelection2 = activeBoxSelection2;

        return newState;
    }

    garbageCollectAfterAnimationDone(targetModId) {
        this.gcTimeout = null;
        this.setState(state => {
            const removed = [];

            for (const [key, modId] of Object.entries(state.keyModId)) {
                if (state.status[key] === 'removing' && modId <= targetModId) {
                    removed.push(key);
                }
            }

            /*console.log(`garbage collecting older than ${targetModId}`);
            console.log(removed);
            */
            if (removed.length > 0) {
                let {status, keyBox, keyModId} = _.clone(state);
                for (const key of removed) {
                    delete status[key];
                    delete keyModId[key];
                    delete keyBox[key];
                }

                return {status, keyBox, keyModId, needGarbageCollection: false};
            } else {
                return state;
            }
        });
    }

    render() {
        /*console.log("BaseBoxesComponent.render()")
        console.log(this.state);
        console.log(this.props);*/
        if (this.state.needGarbageCollection) {
            /*console.log("Scheduling garbage collection");
            console.log(this.state);*/
            const currentModificationId = this.state.modificationId;
            if (this.gcTimeout) {
                clearTimeout(this.gcTimeout);
            }
            this.gcTimeout = setTimeout(
                () => this.garbageCollectAfterAnimationDone(currentModificationId),
                BaseBoxesComponent.ANIMATION_DURATION_TIMEOUT
            );
        }

        const boxes = [];
        for (let key in this.state.keyBox) {
            boxes.push(this.state.keyBox[key]);
        }

        if (this.state.activeBoxSelection1) {
            boxes.push(this.state.activeBoxSelection1);
        }
        if (this.state.activeBoxSelection2) {
            boxes.push(this.state.activeBoxSelection2);
        }

        return (
            <div className="hash-vis" style={{height: this.props.height, width: 1000}} ref={this.ref}>
                {boxes}
            </div>
        );
    }

    componentDidUpdate() {
        if (this.state.needProcessCreatedAfterRender) {
            const node = this.ref.current;
            reflow(node);

            this.setState(state => {
                let newStatus = _.clone(state.status);
                for (let [key, status] of Object.entries(newStatus)) {
                    if (status === 'created') {
                        newStatus[key] = 'adding';
                    }
                }
                return {status: newStatus};
            });
        }
    }
}

function deepGet(obj, path) {
    const parts = path.split('.');
    let node = obj;
    for (const part of parts) {
        node = node[part];
    }

    return node;
}

export class Tetris extends React.PureComponent {
    render() {
        const props = this.props;
        let elems = [];
        const transformedBp = props.bp;
        this.height = 0;
        for (let [i, [Component, [dataLabel, dataName, idxName, idx2Name]]] of props.lines.entries()) {
            elems.push(
                <div className="tetris-row" key={`row-${i}`}>
                    <div className="tetris-row-label-div">
                        <p className="tetris-row-label">{dataLabel ? dataLabel + ':' : ''}</p>
                    </div>
                    <Component array={deepGet(props.bp, dataName)} idx={props.bp[idxName]} idx2={props.bp[idx2Name]} />
                </div>
            );
        }

        // TODO: width/height stuff here
        return (
            <SmoothScrollbar alwaysShowTracks={true}>
                <div style={{width: '700px'}}>
                    <div className="some-hacky-padding" style={{height: 40}} />
                    <div className="tetris">{elems}</div>
                </div>
            </SmoothScrollbar>
        );
    }
}

export function TetrisSingleRowWrap(component, dataLabel, dataName, idxName) {
    return class extends React.Component {
        render() {
            return <Tetris lines={[[component, [dataLabel, dataName || 'data', idxName || 'idx']]]} {...this.props} />;
        }
    };
}

// TODO: parts of this function may be optimized/memoized
class CodeBlockWithActiveLineAndAnnotations extends React.PureComponent {
    HEIGHT = 300;

    constructor() {
        super();
        this.ssRef = React.createRef();
    }

    getCodeWithExplanationHtmlLines(visibleBreakpoints, activeBp) {
        let lines = [];
        let maxLen = _.max(this.props.code.map(([line, bpPoint]) => line.length));

        for (let [line, bpPoint] of this.props.code) {
            let className = activeBp.point;
            let explanation = '';
            if (bpPoint === activeBp.point) {
                className += ' code-highlight';
            }

            if (bpPoint in visibleBreakpoints) {
                const bpType = visibleBreakpoints[bpPoint];
                let desc = null;
                if (typeof this.props.formatBpDesc === 'function') {
                    desc = this.props.formatBpDesc(bpType);
                } else {
                    for (const formatBpDesc of this.props.formatBpDesc) {
                        desc = formatBpDesc(bpType);
                        if (desc != null) break;
                    }
                }

                if (desc == null) {
                    throw new Error('Unknown bp type: ' + bp.point);
                }

                if (desc) {
                    explanation = `<span class="code-explanation"> ~ ${desc}</span>`;
                }
            }

            let paddedLine = _.padEnd(line, maxLen);
            let htCodeHtml = renderPythonCode(paddedLine);

            let formattedLine = `<pre class="code-line-container"><code><span class="${className}">${htCodeHtml}</span></code></pre>`;
            formattedLine += explanation + '<br>';
            lines.push(formattedLine);
        }

        return lines;
    }

    getVisibleBreakpoints(activeBp) {
        let visibleBreakpoints = {};
        let pointToLevel = {};
        for (let [line, bpPoint, level] of this.props.code) {
            if (line === '' || bpPoint === '') {
                continue;
            }
            if (level === undefined) {
                pointToLevel = null;
                break;
            }
            pointToLevel[bpPoint] = level;
        }

        for (let [time, bp] of this.props.breakpoints.entries()) {
            if (time > this.props.time) {
                break;
            }

            if (bp.point in visibleBreakpoints) {
                let level = pointToLevel[bp.point];
                for (let visibleBpPoint in visibleBreakpoints) {
                    if (pointToLevel[visibleBpPoint] >= level) {
                        delete visibleBreakpoints[visibleBpPoint];
                    }
                }
            }

            visibleBreakpoints[bp.point] = bp;
        }

        return visibleBreakpoints;
    }

    render() {
        let activeBp = this.props.breakpoints[this.props.time];

        const visibleBreakpoints = this.getVisibleBreakpoints(activeBp);
        const lines = this.getCodeWithExplanationHtmlLines(visibleBreakpoints, activeBp);

        return (
            <SmoothScrollbar
                ref={this.ssRef}
                alwaysShowTracks={true}
                className="code-block-with-annotations-scrollbar-container"
            >
                <div
                    style={{maxHeight: `${this.HEIGHT}px`, transform: 'translateZ(0)'}}
                    className="code-block-with-annotations"
                    dangerouslySetInnerHTML={{__html: lines.join('\n')}}
                />
            </SmoothScrollbar>
        );
    }

    getScrollTopTarget() {
        const scrollbar = this.ssRef.current.scrollbar;
        const totalLines = this.props.code.length;
        let activeLine = 0;

        // TODO: remove copy&paste
        let activeBp = this.props.breakpoints[this.props.time];
        for (let [i, [_, bpPoint]] of this.props.code.entries()) {
            if (bpPoint === activeBp.point) {
                activeLine = i;
            }
        }

        if (!scrollbar.size) return {scrollTopTarget: null, needsUpdating: false};

        const scrollHeight = scrollbar.size.content.height;
        const scrollTop = scrollbar.scrollTop;

        const scrollBottom = scrollTop + this.HEIGHT;

        const activeLinePos = (activeLine / totalLines) * scrollHeight;
        // TODO: use actual height
        const kindOfLineHeight = 25;
        const needsUpdating =
            activeLinePos < scrollTop + 2 * kindOfLineHeight || activeLinePos > scrollBottom - 2 * kindOfLineHeight;

        let scrollTopTarget = activeLinePos - this.HEIGHT / 2;
        if (scrollTopTarget < 0) {
            scrollTopTarget = 0;
        } else if (scrollTopTarget > scrollHeight) {
            scrollTopTarget = scrollHeight;
        }

        return {scrollTopTarget, needsUpdating};
    }

    updateScroll = () => {
        const {scrollTopTarget, needsUpdating} = this.getScrollTopTarget();
        if (needsUpdating) {
            this.ssRef.current.scrollbar.scrollTo(0, scrollTopTarget, 500);
        }
    };

    updateScrollDebounced = _.debounce(this.updateScroll, getUxSettings().CODE_SCROLL_DEBOUNCE_TIME);

    componentDidUpdate() {
        this.updateScrollDebounced();
    }
}

// TODO: remove time from state?
class TimeSliderWithControls extends React.PureComponent {
    AUTOPLAY_BASE_TIMEOUT = 1000;

    constructor() {
        super();
        this.state = {time: null, autoPlaying: false, speed: 1};
        this.timeoutId = null;
    }

    static getDerivedStateFromProps(nextProps, state) {
        return {time: nextProps.time};
    }

    handleSliderValueChange = value => {
        this.setState({autoPlaying: false});
        this.handleTimeChange(value);
    };

    handleTimeChange = value => {
        this.props.handleTimeChange(value);
        this.setState({time: value});
    };

    prevStep = () => {
        this.stop();
        if (this.state.time > 0) {
            const newTime = this.state.time - 1;
            this.props.handleTimeChange(newTime);
        }
    };

    nextStep = () => {
        this.stop();
        if (this.state.time < this.props.maxTime) {
            const newTime = this.state.time + 1;
            this.props.handleTimeChange(newTime);
        }
    };

    firstStep = () => {
        this.stop();
        this.handleTimeChange(0);
    };

    lastStep = () => {
        this.stop();
        this.handleTimeChange(this.props.maxTime);
    };

    getAutoplayTimeout = () => {
        return this.AUTOPLAY_BASE_TIMEOUT / this.state.speed;
    };

    autoPlayNextStep = () => {
        console.log('this.autoPlayNextStep()');
        if (this.state.time < this.props.maxTime) {
            const newTime = this.state.time + 1;
            let newState = {time: newTime};
            this.handleTimeChange(newTime);
            if (newState.time < this.props.maxTime) {
                console.log('Setting timeout', this.timeoutId);
                this.timeoutId = setTimeout(this.autoPlayNextStep, this.getAutoplayTimeout());
            } else {
                this.timeoutId = null;
                newState.autoPlaying = false;
            }
            console.log(this.timeoutId, newState);
            this.setState(newState);
        }
    };

    repeatPlay = () => {
        this.setState({autoPlaying: true});
        this.handleTimeChange(0);
        this.timeoutId = setTimeout(this.autoPlayNextStep, this.getAutoplayTimeout());
    };

    autoPlay = () => {
        if (this.state.time < this.props.maxTime) {
            this.autoPlayNextStep();
            this.setState({autoPlaying: true});
        } else {
            this.repeatPlay();
        }
    };

    stop = () => {
        if (this.timeoutId != null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
            this.setState({autoPlaying: false});
        }
    };

    setSpeed = speed => {
        this.setState({speed: speed});
    };

    render() {
        let marks = {};
        if (this.props.maxTime < 30) {
            for (let i of _.range(this.props.maxTime + 1)) {
                marks[i] = '';
            }
        }
        const time = this.state.time != null ? this.state.time : this.props.time;

        const button = (label, onClick, iconId, iconOnTheRight) => {
            let elems = [];
            if (iconId) {
                elems.push(<FontAwesomeIcon icon={iconId} />);
            }
            elems.push(label);
            return (
                <button type="button" className="btn btn-outline-primary slider-controls-button" onClick={onClick}>
                    {iconOnTheRight ? elems.reverse() : elems}
                </button>
            );
        };

        let timeControls = [];
        timeControls.push(button(' First step', this.firstStep, 'fast-backward'));
        timeControls.push(button(' step', this.prevStep, 'step-backward'));
        if (!this.state.autoPlaying) {
            const playIcon = this.state.time === this.props.maxTime ? 'redo-alt' : 'play';
            timeControls.push(button(' Play', this.autoPlay, playIcon));
        } else {
            timeControls.push(button(' Pause', this.stop, 'pause'));
        }
        timeControls.push(button('step ', this.nextStep, 'step-forward', true));
        timeControls.push(button('Last step ', this.lastStep, 'fast-forward', true));

        let speedControls = [];

        const speeds = [0.5, 1, 2, 4];
        for (let i = 0; i < speeds.length; ++i) {
            const speed = speeds[i];
            const isActive = speed === this.state.speed;
            let label = i === 0 ? `Autoplay speed ${speed}x` : `${speed}x`;
            speedControls.push(
                <label className={classNames('btn', 'btn-outline-primary', {active: isActive})}>
                    <input type="radio" checked={isActive} onClick={() => this.setSpeed(speed)} /> {label}
                </label>
            );
        }

        return (
            <React.Fragment>
                <div className="row">
                    <div className="col-sm-12 col-md-12">
                        <div className="btn-toolbar slider-controls">
                            <div className="btn-group btn-group-sm mr-2">{timeControls}</div>
                            <div className="btn-group btn-group-sm btn-group-toggle mr-2">{speedControls}</div>
                        </div>
                    </div>
                </div>
                <div className="row slider-row">
                    <div className="col-md-6 col-sm-12">
                        <Slider
                            marks={marks}
                            onChange={this.handleSliderValueChange}
                            min={0}
                            max={this.props.maxTime}
                            value={time}
                            dotStyle={{
                                top: -2,
                                height: 14,
                                width: 14,
                            }}
                            handleStyle={{
                                height: 20,
                                width: 20,
                                marginTop: -6,
                            }}
                            railStyle={{height: 10}}
                            trackStyle={{
                                height: 10,
                            }}
                        />
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

export class VisualizedCode extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            time: props.breakpoints.length - 1,
            userAdjustedToMax: true,
        };
        this.handleTimeChangeThrottled = _.throttle(this.handleTimeChange, getUxSettings().TIME_SLIDER_THROTTLE_TIME);
    }

    handleTimeChange = time => {
        const userAdjustedToMax = time === this.props.breakpoints.length - 1;
        this.setState({
            time: time,
            userAdjustedToMax,
        });
    };

    // TODO: getDerivedStateFromProps
    componentWillReceiveProps(nextProps) {
        if (nextProps.breakpoints !== this.props.breakpoints && !this.props.keepTimeOnNewBreakpoints) {
            this.setState({
                time: nextProps.breakpoints.length - 1,
            });
        }
    }

    render() {
        let bp = this.props.breakpoints[this.state.time];
        const StateVisualization = this.props.stateVisualization;

        let time = this.props.keepTimeOnNewBreakpoints
            ? this.state.userAdjustedToMax
                ? this.props.breakpoints.length - 1
                : Math.min(this.state.time, this.props.breakpoints.length - 1)
            : this.state.time;

        return (
            <MyErrorBoundary>
                <div className="visualized-code">
                    <TimeSliderWithControls
                        handleTimeChange={this.handleTimeChangeThrottled}
                        time={time}
                        maxTime={this.props.breakpoints.length - 1}
                    />
                    <div className="row code-block-row">
                        <div className="col">
                            <CodeBlockWithActiveLineAndAnnotations
                                time={time}
                                code={this.props.code}
                                breakpoints={this.props.breakpoints}
                                formatBpDesc={this.props.formatBpDesc}
                            />
                        </div>
                    </div>
                    <StateVisualization
                        bp={bp}
                        /* the breakpoints and bpIdx is for chapter4 probing visualization */ breakpoints={
                            this.props.breakpoints
                        }
                        bpIdx={time}
                    />
                    {this.props.comment}
                </div>
            </MyErrorBoundary>
        );
    }
}

export class HashBoxesComponent extends React.PureComponent {
    static HEIGHT = BOX_SIZE;

    static getKeys(array) {
        return array.map((value, idx) => {
            if (value != null) {
                return [pyObjToReactKey(value)];
            } else {
                return [`empty-${idx}`];
            }
        });
    }

    render() {
        return (
            <BaseBoxesComponent
                {...this.props}
                getKeys={HashBoxesComponent.getKeys}
                boxFactory={oneBox}
                selectionClass={ActiveBoxSelection}
                height={HashBoxesComponent.HEIGHT}
            />
        );
    }
}

export class HashSlotsComponent extends React.PureComponent {
    static HEIGHT = 3 * BOX_SIZE + 2 * SPACING_Y_SLOT;

    static getKeys(array) {
        let counters = {hashCode: {}, key: {}, value: {}};
        const emptyOrKey = (v, idx, name, keyKey) => {
            if (v != null) {
                const key = pyObjToReactKey(v);
                return `${key}-${name}-${keyKey}`;
            } else {
                return `empty-${idx}-${name}`;
            }
        };
        return array.map((slot, idx) => {
            const keyKey = slot.key != null ? pyObjToReactKey(slot.key) : null;
            return [
                emptyOrKey(slot.hashCode, idx, 'hashCode', keyKey),
                emptyOrKey(slot.key, idx, 'key', keyKey),
                emptyOrKey(slot.value, idx, 'value', keyKey),
            ];
        });
    }

    render() {
        return (
            <BaseBoxesComponent
                {...this.props}
                getKeys={HashSlotsComponent.getKeys}
                boxFactory={slotBoxes}
                selectionClass={SlotSelection}
                height={HashSlotsComponent.HEIGHT}
            />
        );
    }
}

export class LineOfBoxesComponent extends React.PureComponent {
    static HEIGHT = BOX_SIZE;

    static getKeys(array) {
        let counter = {};
        let keys = [];
        // Does not support nulls/"empty"
        for (let [idx, value] of array.entries()) {
            const keyPart = pyObjToReactKey(value);
            if (!(value in counter)) {
                counter[value] = 0;
            } else {
                counter[value]++;
            }

            const key = `${keyPart}-${counter[value]}`;
            keys.push([key]);
        }

        return keys;
    }

    render() {
        return (
            <BaseBoxesComponent
                {...this.props}
                getKeys={LineOfBoxesComponent.getKeys}
                boxFactory={oneBox}
                selectionClass={ActiveBoxSelection}
                height={LineOfBoxesComponent.HEIGHT}
            />
        );
    }
}
