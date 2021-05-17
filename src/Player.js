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
        );
    }
}
