import * as React from 'react';
import './player.css';

import Slider from 'rc-slider/lib/Slider';
import 'rc-slider/assets/index.css';

export class Player extends React.Component {
    AUTOPLAY_TIMEOUT = 1000;

    constructor() {
        super();

        this.state = {
            time: 0,
            autoPlaying: true,
            speed: 1,
        };
    }

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
        this.props.handleTimeChange(value);
    };

    prevStep = () => {
        this.stop();
        if (this.props.time > 0) {
            const newTime = this.props.time - 1;
            this.handleTimeChange(newTime);
        }
    };

    nextStep = () => {
        this.stop();
        if (this.props.time < this.props.maxTime) {
            const newTime = this.props.time + 1;
            this.handleTimeChange(newTime);
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

    getAutoplayTimeout = speed => {
        return this.AUTOPLAY_TIMEOUT;
    };

    autoPlayNextStep = () => {
        if (this.state.time < this.props.maxTime) {
            let newTime = this.state.time + 1;
            if (newTime < this.props.maxTime) {
                this.timeoutId = setTimeout(this.autoPlayNextStep, this.getAutoplayTimeout());
                this.timeoutStarted = this.unixtimestamp();
            } else {
                this.timeoutId = null;
            }
            this.handleTimeChange(newTime, newTime < this.props.maxTime);
        }
    };

    repeatPlay = () => {
        this.handleTimeChange(0, true);
        this.timeoutId = setTimeout(this.autoPlayNextStep, this.getAutoplayTimeout());
        this.timeoutStarted = this.unixtimestamp();
    };

    autoPlay = () => {
        if (this.props.time < this.props.maxTime) {
            this.autoPlayNextStep();
        } else {
            this.repeatPlay();
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
        if (state.autoPlaying && props.time === props.maxTime) {
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
        if (this.props.autoplayByDefault) {
            this.autoPlay();
        }
    }

    render() {
        return (
            <div className="player">
                <div className="player-header">
                    <div className="player-title">Объясняем</div>
                    <div className="player-lesson-name">сортировку пузырьком</div>
                </div>
                <div className="player-slider-wrapper">
                    <Slider
                        marks={undefined}
                        onChange={this.handleTimeChange}
                        min={0}
                        max={this.props.breakpoints.length - 1}
                        value={this.state.time}
                        dotStyle={{
                            top: -1,
                            height: 12,
                            width: 12,
                        }}
                        handleStyle={{
                            height: 10,
                            width: 10,
                            marginTop: -3.5,
                            backgroundColor: '#416287',
                            border: '2px solid white',
                        }}
                        railStyle={{
                            height: 3,
                            backgroundColor: '#E6E6E6',
                        }}
                        trackStyle={{
                            height: 3,
                            backgroundColor: '#416287',
                        }}
                    />
                </div>
            </div>
        );
    }
}
