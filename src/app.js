import _ from 'lodash';
import Bootstrap from 'bootstrap/dist/css/bootstrap.min.css';
import './mainpage.css';
import './styles.css';

import * as React from 'react';
import ReactDOM from 'react-dom';

import {MyErrorBoundary, initUxSettings, getUxSettings, BootstrapAlert, doubleRAF} from './util';
import {win, globalSettings} from './store';
import {ForeverAnimation, dummyFormat, TetrisFactory, HashBoxesComponent, LineOfBoxesComponent} from './code_blocks';
import {BubbleSort, InsertionSort, INSERTION_SORT_CODE} from './new_demos';
import {Player} from './player';

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
        <footer className="footer">
            <div className="footer-container container-fluid">
                <div className="footer-list">
                    {/* <div className="footer-list-item">Сделано в Школе Бюро Горбунова</div> */}
                </div>
            </div>
        </footer>
    );
}

// mainly to prevent addressbar stuff on mobile changing things excessively
const SIGNIFICANT_HEIGHT_CHANGE = 100;
export class App extends React.Component {
    constructor() {
        super();
        this.state = {
            mounted: false,
            windowWidth: null,
            windowHeight: null,
            isPlayer: true,
        };
    }

    windowSizeChangeHandle = () => {
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

        window.addEventListener('resize', _.throttle(this.windowSizeChangeHandle, 500));
        globalSettings.maxCodePlaySpeed = getUxSettings().MAX_CODE_PLAY_SPEED;

        this.setState({
            windowWidth,
            windowHeight,
            mounted: true,
        });
        win.setAll(windowWidth, windowHeight, window.scrollY, true);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.windowSizeChangeHandle);
    }

    render() {
        console.log('App.render()');
        // Make sure SSR works
        const {windowWidth, windowHeight} = this.state.mounted ? this.state : {};

        return (
            <React.Fragment>
                {this.state.isPlayer ? (
                    <Player
                        headerTitle="сортировку вставками"
                        breakpoints={insertionSortResGranular.bp}
                        formatBpDesc={dummyFormat}
                        stateVisualization={InsertionSortVisualisation}
                        code={INSERTION_SORT_CODE}
                    />
                ) : (
                    <MainPage />
                )}
                <Footer />
            </React.Fragment>
        );
    }
}

function runBubbleSort(a) {
    const bs = new BubbleSort();
    bs.run(a);
    const bp = bs.getBreakpoints();
    return {bp};
}

function runInsertionSort(a, granular = false) {
    const is = new InsertionSort();
    is.run(a, granular);
    const bp = is.getBreakpoints();
    return {bp};
}

const InsertionSortVisualisation = TetrisFactory([[LineOfBoxesComponent, [{labels: [null]}, 'a', 'i', undefined]]]);

const MAIN_PAGE_ARRAY = [42, 11, 92, 27, 87, 14, 67, 1];
const bubbleSortRes = runBubbleSort(MAIN_PAGE_ARRAY);
const insertionSortRes = runInsertionSort(MAIN_PAGE_ARRAY);
const insertionSortResGranular = runInsertionSort(MAIN_PAGE_ARRAY, true);
const MAX_PAGE_TIME = Math.max(...[bubbleSortRes, insertionSortRes].map(res => res.bp.length));
console.log('Max page time', MAX_PAGE_TIME);

console.log('BS res', bubbleSortRes);
console.log('IS res', insertionSortRes);

export const MinimalSortVisualisation = TetrisFactory([[HashBoxesComponent, [{labels: [null]}, 'a']]]);

export class MainPage extends React.Component {
    constructor() {
        super();
        this.state = {
            time: 0,
        };
        this.timerId = setInterval(() => {
            const newTime = this.state.time + 1;
            if (newTime <= MAX_PAGE_TIME) {
                this.setState({time: newTime});
            } else {
                this.setState({time: 0});
            }
        }, 2000);
    }

    render() {
        console.log('render time', this.state.time);
        return (
            <div className="page">
                <div className="header">
                    <div className="title">Объясняем</div>
                    <div className="definition">
                        Интерактивные визуализации
                        <br /> с комментариями к коду
                    </div>
                </div>
                <div className="sorts">
                    <h1>Сортировки</h1>
                    <div className="panes-container">
                        <div className="pane bubble-sort">
                            <h2>Пузырьком</h2>
                            <div className="vis-wrapper">
                                <ForeverAnimation
                                    breakpoints={bubbleSortRes.bp}
                                    stateVisualization={MinimalSortVisualisation}
                                    time={Math.min(this.state.time, bubbleSortRes.bp.length - 1)}
                                    {...this.props}
                                />
                            </div>
                        </div>
                        <div className="pane insertion-sort">
                            <h2>Вставками</h2>
                            <div className="vis-wrapper">
                                <ForeverAnimation
                                    breakpoints={insertionSortRes.bp}
                                    stateVisualization={MinimalSortVisualisation}
                                    time={Math.min(this.state.time, insertionSortRes.bp.length - 1)}
                                    {...this.props}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
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
