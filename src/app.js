import _ from 'lodash';
import {createBrowserHistory} from 'history';
import Bootstrap from 'bootstrap/dist/css/bootstrap.min.css';
import './mainpage.css';
import './styles.css';
import classnames from 'classnames';

import * as React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter as Router, Switch, Route, Link, Redirect, withRouter} from 'react-router-dom';
import {MyErrorBoundary, initUxSettings, getUxSettings, BootstrapAlert, doubleRAF} from './util';
import {win, globalSettings} from './store';
import {ForeverAnimation, dummyFormat, TetrisFactory, HashBoxesComponent, LineOfBoxesComponent} from './code_blocks';
import {
    BubbleSort,
    BUBBLE_SORT_CODE,
    InsertionSort,
    INSERTION_SORT_CODE,
    QUICK_SORT_CODE,
    QuickSort,
    formatQuickSort,
    formatBubbleSort,
} from './new_demos';
import {Player} from './player';
import {
    Chapter1_SimplifiedHash,
    SIMPLE_LIST_SEARCH,
    SIMPLIFIED_INSERT_ALL_BROKEN_CODE,
    SIMPLIFIED_INSERT_ALL_CODE,
    SIMPLIFIED_SEARCH_CODE,
    formatSimpleListSearchBreakpointDescription,
    formatSimplifiedInsertAllDescription,
    formatSimplifiedSearchDescription,
    SimpleListSearchStateVisualization,
    SimplifiedInsertStateVisualization,
    SimplifiedSearchStateVisualization,
    SimplifiedInsertBrokenStateVisualization,
} from './chapter1_simplified_hash';
import {
    Chapter2_HashTableFunctions,
    HASH_CREATE_NEW_CODE,
    HASH_SEARCH_CODE,
    HASH_REMOVE_CODE,
    HASH_RESIZE_CODE,
    formatHashCreateNewAndInsert,
    formatHashRemoveSearch,
    formatHashResize,
    HashCreateNewStateVisualization,
    HashNormalStateVisualization,
    HashResizeStateVisualization,
} from './chapter2_hash_table_functions';
import {CollisionsTheory, SimplifiedHashTheory, HashTheory, BubbleSortTheory, QuickSortTheory} from './theory';

function getWindowDimensions() {
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    return {width, height};
}

function logViewportStats() {
    console.log(`DIMENSIONS: window inner: ${window.innerWidth}x${window.innerHeight}`);
    console.log(
        `DIMENSIONS: document.documentElement: ${document.documentElement.clientWidth}x${
            document.documentElement.clientHeight
        }`
    );
    const vv = window.visualViewport;
    console.log(`DIMENSIONS: visualViewport: ${vv != null ? vv.width + 'x' + vv.height : vv}`);

    const {width, height} = getWindowDimensions();
    console.log(`DIMENSIONS: used: ${width}x${height}`);
    // TODO FIXME: this is for debugging only
    /*const url = `/viewports?wi=${window.innerWidth}x${window.innerHeight}&de=${document.documentElement.clientWidth}x${document.documentElement.clientHeight}&vv=${vv.width}x${vv.height}`;
    const Http = new XMLHttpRequest();
    Http.open("GET", url);
    Http.send();*/
}

function Footer() {
    return (
        <footer>
            <a className="link" href="https://bureau.ru/school/designers/12/">
                ?????????????? ?? 2021 ???????? ?? ?????????? ???????? ?????????????????? ???
            </a>
        </footer>
    );
}

function sendGA(location) {
    console.log('Calling sendGA');
    const gtag = window.gtag;
    if (typeof gtag === 'function') {
        gtag('event', 'page_view');
    }
}

// mainly to prevent addressbar stuff on mobile changing things excessively
const SIGNIFICANT_HEIGHT_CHANGE = 0;
export class App extends React.Component {
    constructor() {
        super();

        this.state = {
            mounted: false,
            windowWidth: null,
            windowHeight: null,
        };
    }

    handleWindowSizeChange = () => {
        logViewportStats();
        const dimensions = getWindowDimensions();
        const windowWidth = dimensions.width;
        const windowHeight = dimensions.height;
        if (this.state.windowWidth !== windowWidth || this.state.windowHeight !== windowHeight) {
            console.log('Processing window size change', windowWidth, windowHeight);
            if (
                this.state.windowWidth != windowWidth ||
                this.state.windowHeight > windowHeight ||
                windowHeight - this.state.windowHeight > SIGNIFICANT_HEIGHT_CHANGE
            ) {
                console.log('App size changed from', this.state);
                this.setState({
                    windowWidth,
                    windowHeight,
                });
                if (win.width !== windowWidth || win.height !== windowHeight) {
                    win.setWH(windowWidth, windowHeight);
                }
            }
        }
    };

    componentDidMount() {
        const dimensions = getWindowDimensions();
        const windowWidth = dimensions.width;
        const windowHeight = dimensions.height;
        console.log('componentDidMount() window geometry', windowWidth, windowHeight);

        window.addEventListener('resize', _.throttle(this.handleWindowSizeChange, 500));
        globalSettings.maxCodePlaySpeed = getUxSettings().MAX_CODE_PLAY_SPEED;

        this.setState({
            windowWidth,
            windowHeight,
            mounted: true,
        });
        win.setAll(windowWidth, windowHeight, window.scrollY, true);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.handleWindowSizeChange);
    }

    render() {
        console.log('App.render()');
        const {windowWidth, windowHeight} = this.state.mounted ? this.state : {};
        console.log('Window sizes', windowWidth, windowHeight);

        if (!this.state.mounted) {
            return <div>Loading...</div>;
        }
        return (
            <Router>
                <Route path="/" render={sendGA} />
                <Switch>
                    <Route path="/lesson/:id">
                        <Lesson windowWidth={windowWidth} windowHeight={windowHeight} />
                    </Route>
                    <Route path="/">
                        <MainPage windowWidth={windowWidth} windowHeight={windowHeight} />
                    </Route>
                </Switch>
            </Router>
        );
    }
}

function runBubbleSort(a, granular = false) {
    const bs = new BubbleSort();
    bs.run(a, granular);
    const bp = bs.getBreakpoints();
    return {bp};
}

function runInsertionSort(a, granular = false) {
    const is = new InsertionSort();
    is.run(a, granular);
    const bp = is.getBreakpoints();
    return {bp};
}

function runQuickSort(a) {
    const qs = new QuickSort();
    qs.run(a);
    const bp = qs.getBreakpoints();
    console.log('quicksort bp', bp);
    return {bp};
}

const InsertionSortVisualisation = TetrisFactory([[LineOfBoxesComponent, [{labels: [null]}, 'a', 'i', undefined]]]);
export const MinimalSortVisualisation = TetrisFactory([[HashBoxesComponent, [{labels: [null]}, 'a']]]);
export const QuickSortVisualisation = TetrisFactory([
    [HashBoxesComponent, [{labels: [null]}, 'array', 'left', 'right']],
]);
export const BubbleSortVisualisation = TetrisFactory([[HashBoxesComponent, [{labels: [null]}, 'a', 'j', 'jplus1']]]);

const chapter1 = new Chapter1_SimplifiedHash();
const chapter2 = new Chapter2_HashTableFunctions();

// const GLOBAL_STATE = {
//     simplifiedHash: /*...*/,
//     simplifiedKeyToSearch: /* ... */,
// };

// const inputsToPass = {
//     inputs:
// }

const SIMPLIFIED_HASH_ORIGINAL_LIST_INPUT = {
    label: 'original_list',
    type: 'array_int',
    id: 'simplified-hash-original-list',
    default: '1 56 50 2 44 25 17 4',
};

const SORTS_LIST_INPUT = {
    label: '',
    type: 'array_int',
    id: 'sorts-list',
    default: '42 13 11 92 27 87 14 67 1 12 44 9 20 7',
};

const HASH_FROM_KEYS_INPUT = {
    label: 'from_keys',
    type: 'array',
    id: 'hash-from-keys',
    default: "'uname' 'mv' 1 'time' -6 'ps' 'mkdir' 'less'",
};

const LESSONS = {
    bubble_sort: {
        mainPagePaneHeaderTitle: '??????????????????',
        mainPagePaneClassName: 'bubble-sort',
        playerHeaderTitle: '???????????????????? ??????????????????',
        mobilePlayerHeaderTitle: '???????????????????? ??????????????????',
        getBreakpoints: numbers => {
            return runBubbleSort(numbers.map(n => n.toNumber()), true).bp;
        },
        inputs: [SORTS_LIST_INPUT],
        formatBpDesc: formatBubbleSort,
        stateVisualization: BubbleSortVisualisation,
        code: BUBBLE_SORT_CODE,
        resetToZero: true,

        theory: <BubbleSortTheory />,
    },

    quick_sort: {
        mainPagePaneHeaderTitle: '??????????????',
        mainPagePaneClassName: 'quick-sort',
        playerHeaderTitle: '?????????????? ????????????????????',
        mobilePlayerHeaderTitle: '?????????????? ????????????????????',
        getBreakpoints: numbers => {
            return runQuickSort(numbers.map(n => n.toNumber())).bp;
        },
        inputs: [SORTS_LIST_INPUT],
        formatBpDesc: formatQuickSort,
        stateVisualization: QuickSortVisualisation,
        code: QUICK_SORT_CODE,
        resetToZero: true,

        theory: <QuickSortTheory />,
    },

    // linear_search: {
    //     mainPagePaneHeaderTitle: '???????????????? ??????????',
    //     mainPagePaneClassName: 'linear-search',
    //     playerHeaderTitle: '???????????????? ??????????',
    //     mobilePlayerHeaderTitle: '???????????????? ??????????',
    //     code: SIMPLE_LIST_SEARCH,
    //     breakpoints: slsRes.bp,
    //     formatBpDesc: formatSimpleListSearchBreakpointDescription,
    //     stateVisualization: SimpleListSearchStateVisualization,
    // },

    simplified_hash_collisions: {
        mainPagePaneHeaderTitle: '????????????????',
        mainPagePaneClassName: 'simplified-hash-collisions',
        playerHeaderTitle: '???????????????? ?? ??????-????????????????',
        code: SIMPLIFIED_INSERT_ALL_BROKEN_CODE,
        getBreakpoints: original_list => {
            return chapter1.runSimplifiedInsertAllBroken(original_list).bp;
        },
        inputs: [SIMPLIFIED_HASH_ORIGINAL_LIST_INPUT],
        formatBpDesc: formatSimplifiedInsertAllDescription,
        stateVisualization: SimplifiedInsertBrokenStateVisualization,

        theory: <CollisionsTheory />,
    },

    simplified_hash_create: {
        mainPagePaneHeaderTitle: '????????????????',
        mainPagePaneClassName: 'simplified-hash-create',
        playerHeaderTitle: '???????????????? ???????????????????? ??????-??????????????',
        code: SIMPLIFIED_INSERT_ALL_CODE,
        getBreakpoints: original_list => chapter1.runSimplifiedInsertAll(original_list).bp,

        inputs: [SIMPLIFIED_HASH_ORIGINAL_LIST_INPUT],
        formatBpDesc: formatSimplifiedInsertAllDescription,
        stateVisualization: SimplifiedInsertStateVisualization,

        theory: <SimplifiedHashTheory active="simplified_hash_create" />,
    },

    simplified_hash_search: {
        mainPagePaneHeaderTitle: '??????????',
        mainPagePaneClassName: 'simplified-hash-search',
        playerHeaderTitle: '?????????? ?? ???????????????????? ??????-??????????????',
        code: SIMPLIFIED_SEARCH_CODE,
        getBreakpoints: (original_list, number) => {
            const keys = chapter1.runSimplifiedInsertAll(original_list).keys;
            return chapter1.runSimplifiedSearch(keys, number).bp;
        },
        inputs: [
            SIMPLIFIED_HASH_ORIGINAL_LIST_INPUT,
            {
                label: 'number',
                type: 'int',
                id: 'simplified-hash-search-number',
                default: '25',
            },
        ],
        formatBpDesc: formatSimplifiedSearchDescription,
        stateVisualization: SimplifiedSearchStateVisualization,

        theory: <SimplifiedHashTheory active="simplified_hash_search" />,
    },

    hash_create: {
        mainPagePaneHeaderTitle: '????????????????',
        mainPagePaneClassName: 'hash-create',
        playerHeaderTitle: '???????????????? ??????-??????????????',

        code: HASH_CREATE_NEW_CODE,
        getBreakpoints: from_keys => {
            return chapter2.runCreateNew(from_keys).bp;
        },
        inputs: [HASH_FROM_KEYS_INPUT],
        formatBpDesc: formatHashCreateNewAndInsert,
        stateVisualization: HashCreateNewStateVisualization,

        theory: <HashTheory />,
    },

    hash_search: {
        mainPagePaneHeaderTitle: '??????????',
        mainPagePaneClassName: 'hash-search',
        playerHeaderTitle: '?????????? ?? ??????-??????????????',
        code: HASH_SEARCH_CODE,
        getBreakpoints: (from_keys, key) => {
            const {hashCodes, keys} = chapter2.runCreateNew(from_keys);
            return chapter2.runSearch(hashCodes, keys, key).bp;
        },
        inputs: [
            HASH_FROM_KEYS_INPUT,
            {
                label: 'key',
                type: 'int_str_none',
                id: 'hash-search-key',
                default: "'less'",
            },
        ],
        formatBpDesc: formatHashRemoveSearch,
        stateVisualization: HashNormalStateVisualization,

        theory: <HashTheory />,
    },

    hash_remove: {
        mainPagePaneHeaderTitle: '????????????????',
        mainPagePaneClassName: 'hash-remove',
        playerHeaderTitle: '???????????????? ???? ??????-??????????????',
        code: HASH_REMOVE_CODE,
        getBreakpoints: (from_keys, key) => {
            const {hashCodes, keys} = chapter2.runCreateNew(from_keys);
            return chapter2.runRemove(hashCodes, keys, key).bp;
        },
        inputs: [
            HASH_FROM_KEYS_INPUT,
            {
                label: 'key',
                type: 'int_str_none',
                id: 'hash-remove-key',
                default: "'ps'",
            },
        ],
        formatBpDesc: formatHashRemoveSearch,
        stateVisualization: HashNormalStateVisualization,

        theory: <HashTheory />,
    },

    hash_resize: {
        mainPagePaneHeaderTitle: '????????????????????',
        mainPagePaneClassName: 'hash-resize',
        playerHeaderTitle: '???????????????????? ??????-??????????????',
        code: HASH_RESIZE_CODE,
        getBreakpoints: from_keys => {
            const {hashCodes, keys} = chapter2.runCreateNew(from_keys);
            return chapter2.runResize(hashCodes, keys).bp;
        },
        inputs: [HASH_FROM_KEYS_INPUT],
        formatBpDesc: formatHashResize,
        stateVisualization: HashResizeStateVisualization,

        theory: <HashTheory />,
    },
};

class LessonPane extends React.Component {
    constructor() {
        super();
        this.state = {
            navigatingPlayer: false,
        };
    }

    render() {
        const id = this.props.id;
        const lesson = LESSONS[id];
        console.log('Lesson pane', id, LESSONS[id]);

        if (this.state.navigatingPlayer) {
            return <Redirect to={`lesson/${id}`} />;
        }
        return (
            <a
                href={`/lesson/${id}`}
                className={classnames('pane', lesson.mainPagePaneClassName)}
                onClick={this.navigatePlayer}
            >
                <h2>{lesson.mainPagePaneHeaderTitle}</h2>
            </a>
        );
    }
}

const Lesson = withRouter(
    class extends React.Component {
        render() {
            console.log('withRouter', this.props);
            const id = this.props.match.params.id;
            const {windowWidth, windowHeight} = this.props;
            console.log('Lesson', id, LESSONS[id]);
            return <Player {...LESSONS[id]} windowWidth={windowWidth} windowHeight={windowHeight} lessonId={id} />;
        }
    }
);

export class MainPage extends React.Component {
    constructor() {
        super();
        // this.timerId = setInterval(() => {
        //     const newTime = this.state.time + 1;
        //     if (newTime <= MAX_PAGE_TIME) {
        //         this.setState({time: newTime});
        //     } else {
        //         this.setState({time: 0});
        //     }
        // }, 2000);
    }

    render() {
        return (
            <div className="frontpage">
                <div className="header">
                    <div className="title">?????????????????? ??????</div>
                    <div className="definition">
                        <div className="definition-1">?????????????????????????? ????????????????????????</div>
                        <div className="definition-2">?? ?????????????????????????? ?? ????????</div>
                    </div>
                </div>
                {/* <div className="sorts">
                    <h1>????????????????????</h1>
                    <div className="panes-container">
                        <LessonPane lessonId="bubble_sort" />
                        <div className="pane insertion-sort">
                            <h2>??????????????????</h2>
                        </div>
                    </div>
                </div> */}
                <div className="section">
                    <h1>???????????????????? ??????-??????????????</h1>
                    <div className="pane-collection simplified-hash-collection">
                        <div className="simplified-hash-collection-left">
                            <LessonPane id="simplified_hash_collisions" />
                        </div>

                        <div className="simplified-hash-collection-right">
                            <LessonPane id="simplified_hash_create" />
                            <LessonPane id="simplified_hash_search" />
                        </div>
                    </div>
                </div>

                <div className="section">
                    <h1>??????-?????????????? ?? ???????????????? ????????????????????</h1>
                    <div className="pane-collection hash-collection">
                        <div className="hash-collection-top">
                            <LessonPane id="hash_create" />
                            <LessonPane id="hash_search" />
                        </div>

                        <div className="hash-collection-bottom">
                            <LessonPane id="hash_remove" />
                            <LessonPane id="hash_resize" />
                        </div>
                    </div>
                </div>
                <div className="section">
                    <h1>????????????????????</h1>
                    <div className="pane-collection sorts-collection">
                        <div className="sort-1">
                            <LessonPane id="bubble_sort" />
                        </div>

                        <div className="sort-2">
                            <LessonPane id="quick_sort" />
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    componentWillUnmount() {
        clearInterval(this.timerId);
    }
}

export function initAndRender() {
    if (typeof window !== 'undefined') {
        initUxSettings();

        window.addEventListener('load', () => {
            logViewportStats();
            const root = document.getElementById('root');
            const isSSR = root.hasChildNodes();
            ReactDOM.render(<App />, root);

            /*if (isSSR) {
                console.log('Rehydrating');
                ReactDOM.hydrate(<App {...props} />, root);
            } else {
                console.log('Rendering from scratch');
                ReactDOM.render(<App {...props} />, root);
            }*/
        });
    }
}
