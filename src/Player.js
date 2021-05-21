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
import {isDefinedSmallBoxScreen} from './util';

export class Player extends React.Component {
    AUTOPLAY_TIMEOUT = 1500;
    MAX_BREAKPOINTS_BEFORE_CONT = 300;

    constructor() {
        super();

        this.state = {
            time: 0,
            autoPlaying: false,
            showingTheory: true,
            speed: 1,

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
        this.handleTimeChange(value);
    };

    handleTimeChange = (value, autoPlaying = false) => {
        this.setState(state => ({time: value, autoPlaying}));
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

    getAutoplayTimeout = speed => {
        return this.AUTOPLAY_TIMEOUT;
    };

    autoPlayNextStep = () => {
        if (this.state.time < this.maxTime()) {
            let newTime = this.state.time + 1;
            if (newTime < this.maxTime()) {
                console.log('Launching autoplay');
                this.timeoutId = setTimeout(this.autoPlayNextStep, this.getAutoplayTimeout());
                this.timeoutStarted = this.unixtimestamp();
            } else {
                this.timeoutId = null;
            }
            this.handleTimeChange(newTime, newTime < this.maxTime());
        }
    };

    repeatPlay = () => {
        this.handleTimeChange(0, true);
        this.timeoutId = setTimeout(this.autoPlayNextStep, this.getAutoplayTimeout());
        this.timeoutStarted = this.unixtimestamp();
    };

    autoPlay = () => {
        console.log('autoplay');
        if (this.state.time < this.maxTime()) {
            this.autoPlayNextStep();
        } else {
            this.repeatPlay();
        }
    };

    toggleAutoPlay = () => {
        console.log('toggleAutoPlay', this.state.autoPlaying);
        if (!this.state.autoPlaying) {
            this.autoPlay();
        } else {
            this.stop();
        }
    };

    stop = () => {
        if (this.timeoutId != null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
            this.timeoutStarted = null;
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
        if (!this.state.autoPlaying && this.timeoutId) {
            this.stop();
        }
    }

    componentDidMount() {
        document.addEventListener('keydown', this.handleKeyboard);

        if (this.props.autoplayByDefault) {
            this.autoPlay();
        }
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleKeyboard);
    }

    handleKeyboard = event => {
        console.log('keyboard', event);
        event.preventDefault();
        const keyCode = event.keyCode;
        const isNext = keyCode == 38 || keyCode == 39;
        const isPrev = keyCode == 40 || keyCode == 37;

        if (isNext) {
            this.nextStep();
        }
        if (isPrev) {
            this.prevStep();
        }
    };

    toggleTheory = () => {
        this.setState({showingTheory: !this.state.showingTheory});
    };

    render() {
        console.log('Player', this.props, this.state);
        if (this.state.navigatingHome) {
            return <Redirect push to="/" />;
        }
        const maxTime = this.props.breakpoints.length;

        const marks = {};
        if (this.props.breakpoints.length < this.MAX_BREAKPOINTS_BEFORE_CONT) {
            // Skip erasing the last mark
            for (let i = 1; i < this.props.breakpoints.length - 1; ++i) {
                marks[i] = '';
            }
        }

        const StateVisualization = this.props.stateVisualization;
        const {windowHeight, windowWidth} = this.props;
        console.log('Player window size', windowHeight, windowWidth);

        const time = this.state.time;

        const bp = this.props.breakpoints[time];

        const smallerFont = false;

        let codeHeight;
        const approximateSliderAndControlsHeight = 45;
        if (windowHeight) {
            codeHeight =
                this.props.windowHeight -
                StateVisualization.getExpectedHeight(windowWidth, windowHeight) -
                approximateSliderAndControlsHeight;
        }

        return (
            <div className="player">
                <div className="player-header">
                    <a className="player-title" href="/" onClick={this.navigateHome}>
                        Объясняем
                    </a>
                    <div className="player-lesson-name">{this.props.playerHeaderTitle}</div>
                    <div className="player-buttons">
                        <div className="player-button player-play-button">
                            <img src={this.state.autoPlaying ? pauseButton : playArrow} onClick={this.toggleAutoPlay} />
                        </div>
                        <div className="player-button player-prev">
                            <img src={leftArrow} onClick={this.prevStep} />
                        </div>
                        <div className="player-counters">
                            <span>
                                {time + 1}/{maxTime}
                            </span>
                        </div>
                        <div className="player-button player-next">
                            <img src={rightArrow} onClick={this.nextStep} />
                        </div>
                    </div>
                    <div
                        className={classnames(
                            'player-theory-button',
                            this.state.showingTheory && 'player-theory-button-active'
                        )}
                        onClick={this.toggleTheory}
                    >
                        {this.state.showingTheory ? 'Убрать теорию' : 'Теория'}
                    </div>
                </div>
                <div className="player-slider-wrapper">
                    <Slider
                        marks={marks}
                        onChange={this.handleTimeChange}
                        min={0}
                        max={this.props.breakpoints.length - 1}
                        value={time}
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
                            marginTop: -3.5,
                            backgroundColor: '#416287',
                            border: 'none',
                        }}
                        railStyle={{
                            height: 3,
                            backgroundColor: 'rgba(157, 187, 220, 0.5)',
                        }}
                        trackStyle={{
                            height: 3,
                            backgroundColor: '#416287',
                        }}
                    />
                </div>
                <div className="player-main">
                    <div className="player-code-and-visualisation">
                        <CodeBlockWithActiveLineAndAnnotations
                            height={codeHeight}
                            time={time}
                            code={this.props.code}
                            overflow={false}
                            fontSize={isDefinedSmallBoxScreen(windowWidth, windowHeight) ? 10 : 14}
                            lineHeight={isDefinedSmallBoxScreen(windowWidth, windowHeight) ? 1.0 : 1.15}
                            breakpoints={this.props.breakpoints}
                            formatBpDesc={this.props.formatBpDesc}
                        />
                        <div className="player-state-vis-wrapper">
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
                            style={{height: this.props.windowHeight - approximateSliderAndControlsHeight}}
                        >
                            {' '}
                            <SmoothScrollbar alwaysShowTracks={true}>{this.props.theory}</SmoothScrollbar>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
