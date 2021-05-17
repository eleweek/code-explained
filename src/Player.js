import * as React from 'react';
import './player.css';

import Slider from 'rc-slider/lib/Slider';
import 'rc-slider/assets/index.css';

export class Player extends React.Component {
    render() {
        return (
            <div className="player">
                <div className="player-header">
                    <div className="player-title">Объясняем</div>
                    <div className="player-lesson-name">сортировку пузырьком</div>
                </div>
                <Slider
                    marks={undefined}
                    onChange={this.handleSliderValueChange}
                    min={0}
                    max={15}
                    value={5}
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
        );
    }
}
