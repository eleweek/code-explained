import _ from 'lodash';
import * as React from 'react';
import {observer} from 'mobx-react';
import {reaction} from 'mobx';
import {win} from './store';

import classNames from 'classnames';

import {ErrorBoundary} from 'react-error-boundary';
import bowser from 'bowser';
import ReactCSSTransitionReplace from 'react-css-transition-replace';

export const OLIVE = '#3D9970';
export const RED = '#FF4136';
export const BLUE = '#0074D9';

export const COLOR_FOR_READ_OPS = '#13920b';

export function doubleRAF(callback) {
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(callback);
    });
}

export class CrossFade extends React.Component {
    render() {
        return (
            <ReactCSSTransitionReplace
                transitionName="cross-fade"
                transitionEnterTimeout={200}
                transitionLeaveTimeout={200}
            >
                {this.props.children}
            </ReactCSSTransitionReplace>
        );
    }
}

export class DynamicP extends React.PureComponent {
    HIGHLIGHT_TIMEOUT = 1500;

    // TODO: hacky margin hack
    constructor() {
        super();
        this.ref = React.createRef();
        this.timeoutId = null;
        this.state = {highlight: false, key: null};

        this.resizeReaction = reaction(() => win.width, () => this.setState({height: undefined}));
    }

    static getDerivedStateFromProps(props, state) {
        const oldKey = state.key;
        const newKey = React.Children.only(props.children).key;
        // CrossFade / ReactCSSTransitionReplace relies on key changing
        if (oldKey !== newKey) {
            const firstRender = oldKey == null;
            return {...state, key: newKey, highlight: !firstRender};
        } else {
            return null;
        }
    }

    render() {
        const className = classNames('dynamic-p-inner-wrapper', {highlight: this.state.highlight});
        return (
            <MyErrorBoundary>
                <div className={className} ref={this.ref} style={{minHeight: this.state.height}}>
                    <CrossFade>{this.props.children}</CrossFade>
                </div>
                <div style={{marginBottom: 16}} />
            </MyErrorBoundary>
        );
    }

    removeHighlight = () => {
        this.setState({
            highlight: false,
        });
    };

    updateHeight = () => {
        const {height} = this.ref.current.getBoundingClientRect();
        this.setState({height});
    };

    componentDidUpdate() {
        if (this.state.highlight) {
            if (this.timeoutId != null) {
                clearTimeout(this.timeoutId);
            }
            this.timeoutId = setTimeout(this.removeHighlight, this.HIGHLIGHT_TIMEOUT);
        }
        this.updateHeight();
    }

    componentDidMount() {
        this.updateHeight();
    }
}

@observer
export class DebounceWhenOutOfView extends React.Component {
    render() {
        return <DebounceWhenOutOfViewImpl {...this.props} scrollY={win.scrollY} />;
    }
}

const LEEWAY_Y = 100;
class DebounceWhenOutOfViewImpl extends React.Component {
    DEBOUNCE_TIMEOUT = 500;

    constructor() {
        super();

        this.ref = React.createRef();
        this.timeoutId = null;

        this.state = {};
    }

    static getDerivedStateFromProps(props, state) {
        let isVisible;
        if (state.height != null && state.top != null) {
            const top = state.top;
            const bottom = state.top + state.height;
            const {windowHeight, scrollY} = props;
            isVisible =
                (scrollY - LEEWAY_Y <= top && top <= scrollY + windowHeight + LEEWAY_Y) ||
                (scrollY - LEEWAY_Y <= bottom && bottom <= scrollY + windowHeight + LEEWAY_Y);
        }

        if (isVisible == null || state.isVisible == null || isVisible || state.isVisible) {
            return {
                isVisible,
                childProps: props.childProps,
            };
        } else {
            return null;
        }
    }

    render() {
        const childProps = this.state.childProps;
        return this.props.childFunc(childProps, this.ref);
    }

    componentDidUpdate() {
        this.updateGeometry();
        this.checkDebounceProps();
    }

    componentDidMount() {
        this.updateGeometry();
        this.checkDebounceProps();
    }

    updateGeometry() {
        const node = this.ref.current;
        const rect = node.getBoundingClientRect();
        const {height} = rect;
        const top = window.scrollY + rect.top;
        console.log('DebounceWhenOutOfView updateGeometry top', top);
        this.setState(state => {
            if (state.height !== height || state.top !== top) {
                return {height, top};
            } else {
                return null;
            }
        });
    }

    updateChildProps = () => {
        const childProps = this.props.childProps;
        this.setState(state => {
            if (childProps !== state.childProps) {
                return {
                    childProps,
                };
            } else {
                return null;
            }
        });
    };

    checkDebounceProps() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        if (this.props.childProps !== this.state.childProps) {
            this.timeoutId = setTimeout(this.updateChildProps, this.DEBOUNCE_TIMEOUT);
        }
    }
}

function linebreaks(s) {
    return s
        .split('\n')
        .map((l, i) => [l, <br key={`br-${i}`} />])
        .flat();
}

function MyFallbackComponent({componentStack, error}) {
    return (
        <div style={{backgroundColor: 'pink'}}>
            <h3 className="text-danger">
                An error occured. This should not happen. Please file a bug report{' '}
                <a href="https://github.com/eleweek/inside_python_dict">on github</a>{' '}
            </h3>
            <p>{linebreaks(error.message)}</p>
            <h6 className="text-danger">Component stack</h6>
            <p>{linebreaks(componentStack)}</p>
        </div>
    );
}

export function MyErrorBoundary(props) {
    const onError = (error, componentStack) => {
        console.error('ErrorBoundary caught error\n\n', error, '\n\n\nComponent stack', componentStack);
    };

    return (
        <ErrorBoundary onError={onError} FallbackComponent={MyFallbackComponent}>
            {props.children}
        </ErrorBoundary>
    );
}

// TODO: This does not seem to be better than _.debounce(..., 0)
// TODO: should probably get rid of this function and use debounce()
function squashUpdates(func) {
    let queue = [];
    let epoch = 0;
    return value => {
        let currentEpoch = epoch;
        queue.push(value);
        setTimeout(() => {
            if (queue.length > 0 && currentEpoch === epoch) {
                func(queue[queue.length - 1]);
                queue = [];
                epoch++;
            }
        }, 0);
    };
}

export class ChapterComponent extends React.Component {
    setterFuncs = {};

    setter(name, throttled = false, incId = false) {
        if (!(name in this.setterFuncs)) {
            let updateState;
            if (!incId) {
                updateState = value => this.setState({[name]: value});
            } else {
                updateState = value =>
                    this.setState(state => {
                        const idKey = `${name}IdHack`;
                        let id = state[idKey];
                        id++;
                        return {[name]: value, [idKey]: id};
                    });
            }
            const updateStateDebounced = squashUpdates(updateState);
            if (throttled) {
                this.setterFuncs[name] = _.throttle(updateStateDebounced, 50);
            } else {
                this.setterFuncs[name] = updateStateDebounced;
            }
        }
        return this.setterFuncs[name];
    }
}

export function Subcontainerize({children}) {
    let accumulatedChildren = [];
    let res = [];
    const dropAccumulated = () => {
        if (accumulatedChildren.length > 0) {
            res.push(
                <div className="subcontainer" key={`subcontainer-${res.length}`}>
                    {accumulatedChildren}
                </div>
            );
            accumulatedChildren = [];
        }
    };
    let ebCount = 0;
    const wrapEbIfNeeded = child => {
        if (child.type && child.type.EXTRA_ERROR_BOUNDARY) {
            return <MyErrorBoundary key={child.key || `subcontainerize-eb-${++ebCount}`}>{child}</MyErrorBoundary>;
        } else {
            return child;
        }
    };

    for (let child of children) {
        if (typeof child.type === 'string' || typeof child.type === 'undefined' || !child.type.FULL_WIDTH) {
            accumulatedChildren.push(wrapEbIfNeeded(child));
        } else {
            dropAccumulated();
            res.push(wrapEbIfNeeded(child));
        }
    }

    dropAccumulated();

    return res;
}

export class BootstrapAlert extends React.Component {
    ALERT_REMOVAL_TIMEOUT = 150;

    constructor() {
        super();

        this.state = {
            dismissed: false,
            dismissedDone: false,
        };
    }

    dismiss = () => {
        this.setState({dismissed: true});
        setTimeout(() => this.setState({dismissedDone: true}), this.ALERT_REMOVAL_TIMEOUT);
    };

    render() {
        let {hide, sticky, alertType, boldText, regularText} = this.props;
        alertType = alertType || 'warning';

        if (!this.state.dismissedDone) {
            return (
                <div
                    className={classNames(
                        'alert',
                        `alert-${alertType}`,
                        {'alert-dismissible': !this.props.nondismissible},
                        'fade',
                        {'force-stick-to-top': sticky && !hide},
                        {show: !this.state.dismissed && !hide},
                        this.props.extraclassName
                    )}
                >
                    {this.props.children}
                    {!this.props.nondismissible ? (
                        <button type="button" className="close" onClick={this.dismiss}>
                            <span>&times;</span>
                        </button>
                    ) : null}
                </div>
            );
        } else {
            return null;
        }
    }
}

const defaultUxSettings = {
    TIME_SLIDER_THROTTLE_TIME: 50,
    CODE_SCROLL_DEBOUNCE_TIME: 200,
    THROTTLE_SELECTION_TRANSITIONS: true,
    THROTTLE_SELECTION_TIMEOUT: 150,
    MAX_CODE_PLAY_SPEED: 8,
};

let insidePythonDictUxSettings;

export function initUxSettings() {
    const browser = bowser.getParser(window.navigator.userAgent).parse().parsedResult;
    console.log('Detected browser', browser);

    const engine = browser.engine.name;
    const osName = browser.os.name;
    const platformType = browser.platform.type;
    console.log('Detected engine', engine, 'on', osName);
    let settings = {...defaultUxSettings};

    // 'Throttling' transitions for selection is important because they can be buggy as heck
    // The problem is jumpiness (if transform: translate(...) is changed while transition is running, it resets)
    // This works fine in Chrome/Blink-based browsers
    // (I think there is a similar problem for boxes, but it is less acute, because boxes transitions are longer)
    switch (engine) {
        case 'Blink':
            settings.THROTTLE_SELECTION_TRANSITIONS = false;
            settings.THROTTLE_SELECTION_TIMEOUT = 0;
            break;
        case 'Gecko': {
            settings.THROTTLE_SELECTION_TRANSITIONS = true;
            switch (osName) {
                // Somehow Firefox doesn't do this stuff nearly as bad on Linux
                case 'Linux':
                    settings.THROTTLE_SELECTION_TIMEOUT = 125;
                    break;
                // It seems to be as bad on macOS as on Windows (maybe somewhat worse on macOS)
                // It's pretty bad on mobile too
                case 'macOS':
                    settings.THROTTLE_SELECTION_TIMEOUT = 'transitionend';
                    break;
                default:
                    settings.THROTTLE_SELECTION_TIMEOUT = 275; // almost 'transitionend'
                    break;
            }
            break;
        }
        case 'EdgeHTML':
            settings.THROTTLE_SELECTION_TRANSITIONS = true;
            // 150 is kind of ok, but 225-275 seems better
            settings.THROTTLE_SELECTION_TIMEOUT = 250;
            break;
        case 'WebKit': {
            settings.THROTTLE_SELECTION_TRANSITIONS = true;
            switch (osName) {
                case 'Linux':
                    settings.THROTTLE_SELECTION_TIMEOUT = 150;
                    break;
                case 'macOS':
                    settings.THROTTLE_SELECTION_TIMEOUT = 'transitionend';
                    break;
                default:
                    settings.THROTTLE_SELECTION_TIMEOUT = 275;
                    break;
            }
            break;
        }
    }

    switch (engine) {
        case 'Blink':
        case 'WebKit':
            // kind of ended up optimizing for chrome
            settings.TIME_SLIDER_THROTTLE_TIME = null;
            settings.CODE_SCROLL_DEBOUNCE_TIME = 150;
            settings.MAX_CODE_PLAY_SPEED = 16;
            break;
        case 'Gecko':
            settings.TIME_SLIDER_THROTTLE_TIME = null;
            // Firefox doesn't seems to tolerate auto-scrolling
            settings.CODE_SCROLL_DEBOUNCE_TIME = 200;
            break;
    }

    if (platformType === 'mobile') {
        settings.MAX_CODE_PLAY_SPEED = Math.min(settings.MAX_CODE_PLAY_SPEED, 8);
    }

    insidePythonDictUxSettings = settings;
    window.insidePythonDictBrowser = browser;
    console.log('UX settings', getUxSettings());
}

export function getUxSettings() {
    if (typeof window === 'undefined' || !insidePythonDictUxSettings) {
        return defaultUxSettings;
    }
    return insidePythonDictUxSettings;
}

export function singularOrPlural(num, singular, plural) {
    return num === 1 ? singular : plural;
}

export function singularOrPluralRus(num, singular, plural1, plural2) {
    if (num < 0) {
        throw new Error('Negative number');
    }
    const r100 = num % 100;
    if (10 <= r100 && r100 <= 20) {
        return plural2;
    }

    if (r100 % 10 === 1) {
        return singular;
    }

    const r10 = r100 % 10;
    if (2 <= r10 && r10 <= 4) {
        return plural1;
    }

    return plural2;
}

export function randint(a, b) {
    if (b <= a) {
        throw new Error(`randInt called with b (${b}) <= a (${a})`);
    }
    // TODO: check round/floor/ceil stuff
    // since it may not generate uniformly distributed numbers
    return a + Math.round(Math.random() * (b - a + 1));
}

export function randomChoice(array) {
    // TODO: check rounding
    return array[Math.floor(Math.random() * array.length)];
}

export function randomMeaningfulString() {
    return randomChoice(RANDOM_STRINGS);
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

export function randomString3len() {
    return randomChoice(LETTERS) + randomChoice(LETTERS) + randomChoice(LETTERS);
}

export const isClient = process.env.NODE_ENV !== 'ssr';

// This is useful for set first few values of a random()-like function
// Useful for SSR
export function fixFirstValues(func, values) {
    let calledCounter = 0;
    return function() {
        let res;
        if (calledCounter < values.length) {
            res = values[calledCounter];
        } else {
            res = func.apply(null, arguments);
        }

        calledCounter++;

        return res;
    };
}

export function isDefinedSmallBoxScreen(windowWidth, windowHeight) {
    return windowWidth && windowHeight && (windowWidth < 950 || windowHeight < 520);
}

const RANDOM_STRINGS = [
    'bash',
    'cat',
    'chmod',
    'cp',
    'date',
    'df',
    'echo',
    'ed',
    'expr',
    'link',
    'ls',
    'mkdir',
    'mv',
    'ps',
    'pwd',
    'rm',
    'rmdir',
    'sh',
    'sleep',
    'test',
    'zsh',
    'alias',
    'apply',
    'at',
    'atrm',
    'awk',
    'batch',
    'bg',
    'bzip2',
    'cd',
    'clear',
    'cmp',
    'curl',
    'cut',
    'diff',
    'dig',
    'du',
    'egrep',
    'env',
    'ex',
    'fg',
    'file',
    'find',
    'grep',
    'grn',
    'gzip',
    'head',
    'iconv',
    'less',
    'make',
    'more',
    'nc',
    'open',
    'sed',
    'sort',
    'ssh',
    'stat',
    'sudo',
    'tail',
    'tar',
    'tee',
    'time',
    'top',
    'tr',
    'uname',
    'uniq',
    'unzip',
    'wc',
    'whois',
    'xxd',
    'yes',
];
