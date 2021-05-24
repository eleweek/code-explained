import * as React from 'react';
import classnames from 'classnames';
import SmoothScrollbar from 'react-smooth-scrollbar';

import './player.css';

import Slider from 'rc-slider/lib/Slider';
import 'rc-slider/assets/index.css';

import rightArrow from './icons/keyboard_arrow_right.svg';
import leftArrow from './icons/keyboard_arrow_left.svg';
import playArrow from './icons/play_arrow.svg';
import pauseButton from './icons/pause.svg';

import {CodeBlockWithActiveLineAndAnnotations} from './code_blocks';
import {Redirect} from 'react-router';
import {doubleRAF, isDefinedSmallBoxScreen} from './util';
import _ from 'lodash';

export class Player extends React.Component {
    SLIDER_MULTIPLIER = 1000;
    SLIDER_AUTOPLAY_UPDATE_MS = 5;
    SLIDER_AUTOPLAY_BASE_MS = 750;

    MAX_WIDTH = 1300;

    constructor(props) {
        super(props);

        const timeStr = localStorage.getItem(props.lessonId + '_time');
        const sliderTime = Math.min(+timeStr || 0, this.maxTime());
        this.state = {
            time: Math.round(sliderTime),
            sliderTime: sliderTime,
            autoPlaying: false,
            showingTheory: false,

            // react router stuff
            navigatingHome: false,
        };

        this.componentRef = React.createRef();
    }

    navigateHome = () => {
        this.setState({navigatingHome: true});
    };

    maxTime = () => {
        return this.props.breakpoints.length - 1;
    };

    unixtimestamp() {
        return new Date().getTime();
    }

    static getDerivedStateFromProps(nextProps, state) {
        return {time: nextProps.time};
    }

    handleSliderValueChange = value => {
        this.stop();
        const sliderTime = value / this.SLIDER_MULTIPLIER;
        this.handleTimeChange(sliderTime);
    };

    handleTimeChange = (sliderTime, autoPlaying = false, onStateChange) => {
        console.log('handleTimeChange', sliderTime, autoPlaying);
        const time = Math.round(sliderTime);
        this.setState(() => ({time, sliderTime, autoPlaying}), onStateChange);
        setTimeout(
            _.throttle(() => localStorage.setItem(this.props.lessonId + '_time', sliderTime.toString()), 500),
            0
        );
        // this.props.handleTimeChange(value);
    };

    prevStep = () => {
        this.stop();
        if (this.state.time > 0) {
            const newTime = this.state.time - 1;
            this.handleTimeChange(newTime);
        }
    };

    nextStep = () => {
        this.stop();
        if (this.state.time < this.maxTime()) {
            const newTime = this.state.time + 1;
            this.handleTimeChange(newTime);
        }
    };

    singleAutoPlayIteration = () => {
        console.log('autoplay iteration', this.state);
        if (!this.state.autoPlaying) {
            return;
        }
        this.timeoutId = setTimeout(this.autoPlay, this.SLIDER_AUTOPLAY_UPDATE_MS);
    };

    autoPlay = () => {
        if (this.state.sliderTime < this.maxTime()) {
            const delta =
                (1.0 / this.SLIDER_AUTOPLAY_BASE_MS) *
                (performance.now() - (this.lastTimeChange ? this.lastTimeChange : performance.now()));
            console.log('autoPlay', this.state.time, delta);
            let newSliderTime = Math.min(this.maxTime(), this.state.sliderTime + delta);
            if (newSliderTime < this.maxTime()) {
                if (this.timeoutId) {
                    clearTimeout(this.timeoutId);
                }
                this.lastTimeChange = performance.now();
                this.handleTimeChange(newSliderTime, true, this.singleAutoPlayIteration);
            } else {
                this.resetTimer();
                this.handleTimeChange(newSliderTime, false);
            }
        }
    };

    repeatPlay = () => {
        this.handleTimeChange(0, true);
        this.timeoutId = setTimeout(this.autoPlay, this.SLIDER_AUTOPLAY_UPDATE_MS);
    };

    forceAutoPlay = () => {
        console.log('autoplay');
        if (this.state.time < this.maxTime()) {
            this.autoPlay();
        } else {
            this.repeatPlay();
        }
    };

    toggleAutoPlay = () => {
        console.log('toggleAutoPlay', this.state.autoPlaying);
        if (!this.state.autoPlaying) {
            this.forceAutoPlay();
        } else {
            this.stop();
        }
    };

    resetTimer = () => {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
        this.lastTimeChange = null;
    };

    stop = () => {
        if (this.timeoutId != null) {
            this.resetTimer();
        }
        if (this.state.autoPlaying) {
            this.setState({autoPlaying: false});
        }
    };

    static getDerivedStateFromProps(props, state) {
        if (state.autoPlaying && props.time === props.breakpoints.length - 1) {
            return {...state, autoPlaying: false};
        } else {
            return null;
        }
    }

    componentDidUpdate() {
        setTimeout(() => this.removeHackTransition(), 200);
        if (!this.state.autoPlaying && this.timeoutId) {
            this.stop();
        }
    }

    componentDidMount() {
        document.addEventListener('keydown', this.handleKeyboard);
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleKeyboard);
    }

    hackTransition = () => {
        const track = document.getElementsByClassName('rc-slider-track')[0];
        const handle = document.getElementsByClassName('rc-slider-handle')[0];
        if (track && handle) {
            track.classList.add('slider-transition');
            handle.classList.add('slider-transition');
        }
        this._transitionHackStarted = performance.now();
    };

    removeHackTransition = _.debounce(() => {
        const track = document.getElementsByClassName('rc-slider-track')[0];
        const handle = document.getElementsByClassName('rc-slider-handle')[0];
        if (track && handle && performance.now() - this._transitionHackStarted > 150) {
            track.classList.remove('slider-transition');
            handle.classList.remove('slider-transition');
        }
    }, 250);

    handleKeyboard = event => {
        console.log('keyboard', event);
        if (event.target.nodeName === 'INPUT') {
            return; // Don't mess with inputs
        }

        const keyCode = event.keyCode;
        const isNext = keyCode === 38 || keyCode === 39;
        const isPrev = keyCode === 40 || keyCode === 37;
        const isSpace = keyCode === 32;

        if (isNext || isPrev || isSpace) {
            event.preventDefault();
            this.hackTransition();
            if (isNext) {
                this.nextStep();
            } else if (isPrev) {
                this.prevStep();
            } else if (isSpace) {
                this.toggleAutoPlay();
            }
        }
    };

    toggleTheory = () => {
        if (!this.state.showingTheory) {
            this.stop();
        }

        this.setState({showingTheory: !this.state.showingTheory});
    };

    isMobile = () => {
        return this.props.windowWidth <= 480;
    };

    render() {
        console.log('Player', this.props, this.state);
        if (this.state.navigatingHome) {
            return <Redirect push to="/" />;
        }
        const maxTime = this.props.breakpoints.length;

        const StateVisualization = this.props.stateVisualization;
        const {windowHeight, windowWidth} = this.props;
        console.log('Player window size', windowHeight, windowWidth);
        const totalWidth = Math.min(this.MAX_WIDTH, windowWidth);

        const time = this.state.time;

        const bp = this.props.breakpoints[time];

        let codeHeight, innerTheoryHeight, theoryWidth, codeVisWidth;
        const controlsHeight = isMobile ? 45 : 35;
        const approximateSliderAndControlsHeight = controlsHeight + 16;
        const adjustTheoryTop = 5;
        const approximateHorizontalPaddings = 24;
        const MIN_THEORY_WIDTH = 300;
        let isMobile = false;
        if (windowHeight) {
            const expectedVisHeight = 1.1 * StateVisualization.getExpectedHeight(totalWidth, windowHeight);
            codeHeight = this.props.windowHeight - expectedVisHeight - approximateSliderAndControlsHeight;
            console.log('Expected vis height', expectedVisHeight);
            codeVisWidth = totalWidth - approximateHorizontalPaddings;

            if (this.isMobile()) {
                isMobile = true;
                theoryWidth = windowWidth - 1;
            } else {
                theoryWidth = Math.max(0.3 * totalWidth, MIN_THEORY_WIDTH);
            }
            innerTheoryHeight = windowHeight - approximateSliderAndControlsHeight - 15 /* IDK why 15 */;
        }

        // const theoryPosition = approximateSliderAndControlsHeight - adjustTheoryTop;

        let playerHeaderStyle, mobileVisWrapperStyle, mobileHeaderTitle;
        if (isMobile) {
            playerHeaderStyle = {position: 'absolute', bottom: 0};
            mobileVisWrapperStyle = {position: 'absolute', bottom: 80, width: '100%'};
            mobileHeaderTitle = this.props.mobileHeaderTitle || this.props.playerHeaderTitle;
            mobileHeaderTitle = mobileHeaderTitle.charAt(0).toUpperCase() + mobileHeaderTitle.slice(1);
        }

        console.log('mobile header title', mobileHeaderTitle);

        const biggerFont = !isDefinedSmallBoxScreen(windowWidth, windowHeight) || isMobile;
        return (
            <div className="player">
                <div
                    className={classnames('player-header', !isMobile && 'player-header-desktop')}
                    style={playerHeaderStyle}
                >
                    {(!this.state.showingTheory || !isMobile) && (
                        <a className="player-title" href="/" onClick={this.navigateHome}>
                            Объясняем
                        </a>
                    )}
                    {!isMobile && (
                        <div className="player-lesson-name">
                            {'\u00A0'}
                            {this.props.playerHeaderTitle}
                        </div>
                    )}
                    {(!this.state.showingTheory || !isMobile) && (
                        <div
                            className={classnames(
                                'player-buttons',
                                isMobile ? 'player-buttons-mobile' : 'player-buttons-desktop'
                            )}
                        >
                            <div className="player-button player-play-button" onClick={this.toggleAutoPlay}>
                                <img src={this.state.autoPlaying ? pauseButton : playArrow} />
                            </div>
                            <div className="player-button player-prev" onClick={this.prevStep}>
                                <img src={leftArrow} />
                            </div>
                            <div className="player-counters">
                                <span>
                                    {time + 1}/{maxTime}
                                </span>
                            </div>
                            <div className="player-button player-next" onClick={this.nextStep}>
                                <img src={rightArrow} />
                            </div>
                        </div>
                    )}
                    {this.props.theory && (
                        <div
                            className={classnames(
                                'player-theory-button',
                                this.state.showingTheory && 'player-button-active'
                            )}
                            onClick={this.toggleTheory}
                        >
                            Теория
                        </div>
                    )}
                </div>
                <div className="player-slider-wrapper">
                    <Slider
                        // marks={marks}
                        onChange={this.handleSliderValueChange}
                        min={0}
                        max={this.maxTime() * this.SLIDER_MULTIPLIER}
                        value={this.state.sliderTime * this.SLIDER_MULTIPLIER}
                        style={{paddingBottom: 15, paddingTop: 20}}
                        dotStyle={{
                            top: 0,
                            height: 3,
                            width: 3,
                            borderRadius: 0,
                            backgroundColor: 'white',
                            border: 'none',
                        }}
                        handleStyle={{
                            height: 10,
                            width: 10,
                            marginTop: -4.5,
                            backgroundColor: '#416287',
                            border: 'none',
                        }}
                        railStyle={{
                            height: 1,
                            backgroundColor: 'rgba(157, 187, 220, 0.5)',
                        }}
                        trackStyle={{
                            height: 1,
                            backgroundColor: '#416287',
                        }}
                        className={classnames(isMobile && 'slider-mobile-extra')}
                    />
                </div>
                <div className="player-main">
                    <div className="player-code-and-visualisation" style={{width: codeVisWidth}}>
                        <CodeBlockWithActiveLineAndAnnotations
                            height={codeHeight}
                            time={time}
                            code={this.props.code}
                            overflow={false}
                            fontSize={14}
                            lineVerticalPadding={2}
                            breakpoints={this.props.breakpoints}
                            formatBpDesc={this.props.formatBpDesc}
                            withShortExplanation={isMobile}
                            mobileHeaderTitle={mobileHeaderTitle}
                        />
                        <div className="player-state-vis-wrapper" style={mobileVisWrapperStyle}>
                            <StateVisualization
                                bp={bp}
                                epoch={this.state.breakpointsUpdatedCounter}
                                innerRef={this.componentRef}
                                windowWidth={windowWidth}
                                windowHeight={windowHeight}
                                overflow={false}
                            />
                        </div>
                    </div>
                    {this.state.showingTheory && (
                        <div
                            className="player-theory"
                            style={{
                                position: 'absolute',
                                background: 'white',
                                zIndex: 1,
                                right: 1,
                                width: theoryWidth,
                                minWidth: MIN_THEORY_WIDTH,
                            }}
                        >
                            <div className="player-theory-border-wrapper">
                                <SmoothScrollbar alwaysShowTracks={true}>
                                    <div className="player-theory-inner" style={{height: innerTheoryHeight}}>
                                        {this.props.theory}
                                    </div>
                                </SmoothScrollbar>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
