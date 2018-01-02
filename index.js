var React = require('react');
var ReactDOM = require('react-dom');
import {pyHash, MyHash} from './hash_impl.js';
import ReactCSSTransitionReplace from 'react-css-transition-replace';

function doubleRAF(callback) {
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(callback);
    });
}


class BoxesBase {
    constructor(element, boxSize) {
        this.$element = $(element);
        // TODO: compute box size?
        this.boxSize = boxSize;
        this.boxValues = [];
        this.$boxDivs = [];

        this.updatedBoxValues = [];
        this.$updatedBoxDivs = [];

        this.JUST_ADDED_CLASS = 'box-just-added';
        this.REMOVED_CLASS = 'box-removed';
        this.ACTIVE_CLASS = 'box-active';
        this.EMPTY = 'box-empty';
        this.FULL = 'box-full';
    }

    init(values) {
        console.log("init");
        console.log(values);
        this.boxValues = [];

        for (let [i, value] of values.entries()) {
            let $box = this.makeNewBox(value);
            $box.removeClass(this.JUST_ADDED_CLASS);
            this._setBoxIdxAndPos($box, i);
            this.$element.append($box);

            this.boxValues.push(value);
            this.$boxDivs.push($box);
        }
    }

    findBoxIndex(val) {
        if (val === null)
            return null

        // TODO: store a map from value to box
        for (let [i, boxVal] of this.boxValues.entries()) {
            if (boxVal === val) {
                return i;
            }
        }

        return null;
    }

    _setBoxIdxAndPos($box, idx, type) {
        // Kind of shitty way of launching animations...
        // This function was a simple setter originally
        // TODO: Refactor?
        let startY = 0;
        let endY = 0;
        if (type == "added") {
            startY = -this.boxSize;
        } else if (type == "removed") {
            endY = -this.boxSize;
        }
        $box.css({top: 0, left: 0});
        // $box.css({top: startY, left: idx * this.boxSize});
        let endX = idx * this.boxSize;
        $box.css("transform", `translate(${endX}px, ${startY}px)`);
        if (startY != endY) {
            console.log("Scheduling translate");
            doubleRAF(() => {
                $box.css("transform", `translate(${endX}px, ${endY}px)`);
            });
        }
        $box.attr('data-index', idx);
    }

    makeNewBox(value) {
        // TODO: unhardcode class names?
        let $box = $(`<div class="box box-animated ${this.JUST_ADDED_CLASS}"></div>`);
        if (value !== null) {
            $box.html('<span class="box-content">' + value + '</span>');
            $box.attr('data-value', value);
            $box.addClass(this.FULL);
        } else {
            $box.addClass(this.EMPTY);
        }

        return $box;
    }

    addBox(idx, value) {
        let $box = this.makeNewBox(value);

        this.$updatedBoxDivs[idx] = $box;
        this.updatedBoxValues[idx] = value;

        this.$element.append($box);
        this._setBoxIdxAndPos($box, idx, (value !== null ? "added" : "empty-added"));
        doubleRAF(() => {
            $box.removeClass(this.JUST_ADDED_CLASS);
        });
    }

    removeBox(idx) {
        // TODO: garbage collect
        let $box = this.$boxDivs[idx];
        $box.addClass(this.REMOVED_CLASS);
        this._setBoxIdxAndPos($box, idx, (this.boxValues[idx] !== null ? "removed" : "empty-removed"));
    }

    moveBox(fromIdx, toIdx) {
        let $box = this.$boxDivs[fromIdx];
        if (fromIdx != toIdx) {
            this._setBoxIdxAndPos($box, toIdx);
        }
        this.$updatedBoxDivs[toIdx] = $box;
        this.updatedBoxValues[toIdx] = this.boxValues[fromIdx];
    }

    startModifications(numBoxes) {
        /* TODO: garbage collect old removed and faded out divs */
        // this.resetZIndex();
        this.updatedBoxValues = [];
        this.$updatedBoxDivs = [];

        for (let i = 0; i < numBoxes; ++i) {
            this.updatedBoxValues.push(null);
            this.$updatedBoxDivs.push(null);
        }
    }

    doneModifications() {
        this.boxValues = this.updatedBoxValues;
        this.$boxDivs = this.$updatedBoxDivs;
    }

    removeAllActive() {
        this.$element.find('.' + this.ACTIVE_CLASS).removeClass(this.ACTIVE_CLASS);
    }

    makeActive(idx) {
        this.$boxDivs[idx].addClass(this.ACTIVE_CLASS);
    }
}


class HashBoxes extends BoxesBase {
    constructor(element, boxSize) {
        super(element, boxSize);
    }

    changeTo(newValues) {
        this.startModifications(newValues.length)
        let diff = arraysDiff(this.boxValues, newValues);
        for (let val of diff.removed) {
            this.removeBox(this.findBoxIndex(val));
        }

        for (let [i, [oldVal, newVal]] of _.zip(this.boxValues, newValues).entries()) {
            if (oldVal === null && newVal !== null) {
                this.removeBox(i);
            }
            if (oldVal !== null && newVal === null) {
                this.addBox(i, null);
            }
            if (oldVal === null && newVal === null) {
                this.moveBox(i, i);
            }
        }

        for (let [i, val] of newValues.entries()) {
            let existingBoxIdx = this.findBoxIndex(val);
            if (val !== null) {
                if (existingBoxIdx === null) {
                    this.addBox(i, val);
                } else {
                    this.moveBox(existingBoxIdx, i);
                }
            }
        }

        this.doneModifications();
    }
}


class LineOfBoxes extends BoxesBase {
    constructor(element, boxSize) {
        super(element, boxSize);
    }

    changeTo(newValues) {
        let diff = arraysDiff(this.boxValues, newValues);

        this.startModifications(newValues.length);
        for (let val of diff.removed) {
            this.removeBox(this.findBoxIndex(val));
        }

        for (let [i, val] of newValues.entries()) {
            let existingBoxIdx = this.findBoxIndex(val);
            if (existingBoxIdx === null) {
                this.addBox(i, val);
            } else {
                this.moveBox(existingBoxIdx, i);
            }
        }
        this.doneModifications();
    }
}

function arraysDiff(arrayFrom, arrayTo)
{
    // TODO: O(n + m) algo instead of O(nm)
    let remaining = [];
    let removed = [];
    let added = [];

    for (let af of arrayFrom) {
        if (af === null) {
            continue;
        }

        if (arrayTo.includes(af)) {
            remaining.push(af);
        } else {
            removed.push(af);
        }
    }

    for (let at of arrayTo) {
        if (at === null) {
            continue;
        }

        if (arrayTo.includes(at) && !remaining.includes(at)) {
            added.push(at);
        }
    }

    return {
        remaining: remaining,
        removed: removed,
        added: added,
    }
}

class LineOfBoxesComponent extends React.Component {
    componentDidMount() {
        this.$el = $(this.el);
        this.lineOfBoxes = new LineOfBoxes(this.$el, 40);
        this.lineOfBoxes.init(this.props.array);
    }

    componentWillUnmount() {
        this.$el.html('');
    }

    componentWillUpdate(nextProps, nextState) {
        this.lineOfBoxes.changeTo(nextProps.array);
    }

    render() {
        return <div className="clearfix array-vis" ref={el => this.el = el} />;
    }
}

class HashBoxesComponent extends React.Component {
    componentDidMount() {
        this.$el = $(this.el);

        this.hashBoxes = new HashBoxes(this.$el, 40);
        this.hashBoxes.init(this.props.array);
        this.changeActiveBox(this.props.idx);
    }

    changeActiveBox(idx) {
        this.hashBoxes.removeAllActive();
        if (idx !== null && idx !== undefined) {
            this.hashBoxes.makeActive(idx);
        }
    }

    componentWillUnmount() {
        this.$el.html('');
    }

    componentWillUpdate(nextProps, nextState) {
        this.hashBoxes.changeTo(nextProps.array);
        this.changeActiveBox(nextProps.idx);
    }

    render() {
        return <div className="clearfix hash-vis" ref={el => this.el = el} />;
    }
}

class AddOpBreakpoint extends React.Component {
    render() {
        return <div
                className={this.props.active ? "highlight" : null}
                onMouseEnter={this.props.onMouseEnter}
                dangerouslySetInnerHTML={{__html: this.formatBpDesc(this.props.bpDesc)}} 
               />
    }

    formatBpDesc(bp) {
        switch (bp.point) {
            case 'compute-idx':
                return `Compute idx: <code>${bp.idx} = ${bp.hash} % ${bp.capacity}</code>`;
            case 'check-collision':
                return `Check collision at <code>${bp.idx}</code> -- ` + (bp.tableAtIdx === null ? `empty slot` : `occupied by <code>${bp.tableAtIdx}</code>`);
            case 'assign-elem':
                return `Set element at <code>${bp.idx}</code> to <code>${bp.elem}</code>`;
            case 'rehash':
                return `Rehash`;
            case 'check-load-factor':
                return `Compare <code>${bp.size} + 1</code> with <code>${bp.capacity} * ${bp.maxLoadFactor}</code>`;
            case 'next-idx':
                return `Compute next idx: <code>${bp.idx}</code>`;
            default:
                throw "Unknown bp type: " + bp.point;
        }
    }
}

class AddOpBreakpointsList extends React.Component {
    render() {
        let elems = [];
        for (let [bpTime, bpDesc] of this.props.breakpoints.entries()) {
            elems.push(
                <AddOpBreakpoint
                 bpDesc={bpDesc}
                 active={this.props.time == bpDesc.time}
                 onMouseEnter={this.handleBreakpointHover.bind(this, bpDesc.time)}
                />
            );
        }
        return <div> {elems} </div>
    }

    handleBreakpointHover(bpTime) {
        this.props.onTimeChange(bpTime);
    }
}

function InsertionHistory(props) {
    let ih = props.insertionHistory;

    if (ih.rehash) {
        let rehashDescription = <p><span>The hash table reaches target fill ratio of 0.66 after this insert. So we will have to rehash everything. </span></p>;
    }

    let collisionsDescription = null;

    if (ih.collisions.length == 0) {
        collisionsDescription = (<p> The slot at the index <code>{ih.originalIdx}</code> is empty, so we can put the element there right away</p>);
    } else if (ih.collisions.length == 1) {
        collisionsDescription = (<p> The slot at the index <code>{ih.collisions[0].idx}</code> is occupied by {ih.collisions[0].object}, but the next slot at <code>{ih.finalIdx}</code> is empty </p>);
    } else {
        let baseDesc = "While inserting the element multiple collisions happen: with ";
        let colDescs = [];
        for (let i = 0; i < ih.collisions.length; ++i) {
            let c = ih.collisions[i];
            let nextIdx = i < ih.collisions.length - 1 ? ih.collisions[i + 1].idx : ih.finalIdx;
            colDescs.push(<code>{c.object}</code>);
            if (i != ih.collisions.length - 1) {
                colDescs.push(",");
            }
        }
        collisionsDescription = <p> {baseDesc} {colDescs} </p>;
    }

    return (
        <div className="row">
            <div className="col">
                <p>
                    Its hash is <code>{ih.hash.toString()}</code>, getting it modulo hash capacity <code>{ih.capacity}</code> results in <code>{ih.originalIdx}</code>
                </p>
                {collisionsDescription}
            </div>
        </div>
    )
}

class JsonInput extends React.Component {
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
        // TODO: this is a hack
        // there should probably be a single source of truth
        this.state = {
            value: JSON.stringify(this.props.value)
        }
    }

    handleChange(event) {
        try {
            this.setState({
                value: event.target.value
            })
            let value = JSON.parse(event.target.value);
            console.log("Change " + value);
            this.props.onChange(value);
        } catch (e) {
            // TODO: add error?
            return;
        }
    }

    render() {
        let className = this.props.inline ? "form-control fc-inline" : "form-control";
        return <input type="text" className={className} value={this.state.value} onChange={this.handleChange} />;
    }
}


const ADD_CODE = [
    ["def insert(self, elem):", ""],
    ["    if self.size + 1 > len(self.table) * self.MAX_LOAD_FACTOR:", "check-load-factor"],
    ["        self.rehash()", "rehash"],
    ["", ""],
    ["    idx = hash(elem) % len(self.table)", "compute-idx"],
    ["    while self.table[idx] is not None:", "check-collision"],
    ["        idx = (idx + 1) % len(self.table)", "next-idx"],
    ["    self.table[idx] = elem", "assign-elem"]
];

function CodeBlock(props) {
    let lines = [];
    let maxLen = _.max(props.code.map(([line, bpPoint]) => line.length));

    for (let [line, bpPoint] of props.code) {
        let className = bpPoint;
        if (bpPoint == props.bpPoint) {
            className += " code-highlight";
        }

        let paddedLine = _.padEnd(line, maxLen);

        lines.push(`<span class="${className}">${paddedLine}</span>`);
    }
    return <pre><code dangerouslySetInnerHTML={{__html: lines.join("\n")}} /></pre>
}

class CrossFade extends React.Component {
    render() {
      return <ReactCSSTransitionReplace
        transitionName="cross-fade"
        transitionEnterTimeout={500} transitionLeaveTimeout={500}>
          {this.props.children}
      </ReactCSSTransitionReplace>
    }
}

class App extends React.Component {
    constructor() {
        super();

        this.state = {
            exampleArrayIdx: 0,
            exampleArray: ["abde","cdef","world","hmmm","hello","xxx","ya","hello,world!","well","meh"],
            howToAddObj: 'py',
            bpTime: null,
            exampleArrayHashAfterInsertionIdx: null,
        }
    }

    render() {
        let myhash = new MyHash();

        myhash.bpDisabled = true;
        myhash.addArray(this.state.exampleArray);
        console.log("myhash: " + myhash.data);
        let exampleArrayHashVis = {
            array: _.cloneDeep(myhash.data),  // TODO: better add some sort of reflection to MyHash? 
        }

        myhash.bpDisabled = false;
        let howToAddInsertionHistory = myhash.add(this.state.howToAddObj);
        let breakpoints = myhash.breakpoints;

        console.log('this.bpTime = ' + this.state.bpTime);
        let exampleArrayHashAfterInsertionVis = null;
        let bpPoint = null;

        if (this.state.bpTime >= breakpoints.length) {
            // TODO: reset bpTime when hash is changed
            this.state.bpTime = null;
        }

        if (this.state.bpTime !== null) {
            exampleArrayHashAfterInsertionVis = {
                array: breakpoints[this.state.bpTime].data,
                idx: breakpoints[this.state.bpTime].idx,
            }
            bpPoint = breakpoints[this.state.bpTime].point;
        } else {
            exampleArrayHashAfterInsertionVis = {
                array: myhash.data,
                idx: null,
            }
        }

        return(
            <div>
              <h4> A trip inside python dictionary internals. Part 1: hash tables </h4>
              <h6> What's so great about lists and arrays? </h6>
              <br/>
              <div className="sticky-top">
                <JsonInput value={this.state.exampleArray} onChange={(value) => this.setState({exampleArray: value})} />
              </div>
              <p>
                Picture a typical python list.
                <br/>
                Python lists are actually arrays: continigous chunks of memory. Which means that it's easy to find elements by index.
              </p>
              <LineOfBoxesComponent array={this.state.exampleArray} />
              <p>
                Getting element by index is very fast. However, searching for a specific value can be slow. 
                For example, to find [mid element] we would sometimes need to scan 50% of elements. 
                And to check that [missing element] is missing, we would need to scan the whole list.
              </p>
              <p>
                What if instead of using a plain list we could organize our data in a different way? 
                The super simple solution is to create a huge list looking like this [None, None, 2, 3, None, 5 ... ]
                Then we could simple check a[idx] to find if idx is present.
              </p>
              <p>
                Okay, we can search faster. But we waste a lot of memory. If we take, a large number, 100000, we would need at least X MB to store just this integer alone, because we store Nones for all other values.
              </p>
              <p> TODO: Explain using modulo operation to shrink everything</p>
              <p> How would it work for strings? TODO: explain what is a hash function, why python hash(x) = x for most ints.</p>
              <p>
                What we could do instead is organize everything in a hashtable!
              </p>
              <HashBoxesComponent array={exampleArrayHashVis.array} idx={null} />
              <h6>
                How does adding to a hash table work? 
              </h6>
              <p>
                Let's say we want to add
                <JsonInput inline={true} value={this.state.howToAddObj} onChange={(value) => this.setState({howToAddObj: value})} />
                to the hashtable. 
              </p>

              <CrossFade>
                  <InsertionHistory insertionHistory={howToAddInsertionHistory} key={JSON.stringify(howToAddInsertionHistory)}/>
              </CrossFade>
              <div className="row">
                <div className="col-md-6">
                  <CodeBlock code={ADD_CODE} bpPoint={bpPoint} />
                </div>
                <div className="col-md-6">
                  <CrossFade>
                      <AddOpBreakpointsList
                        key={JSON.stringify(breakpoints)}
                        breakpoints={breakpoints}
                        time={this.state.bpTime}
                        onTimeChange={(bpTime) => this.setState({bpTime: bpTime})}
                      />
                  </CrossFade>
                </div>
              </div>
              <HashBoxesComponent array={exampleArrayHashAfterInsertionVis.array} idx={exampleArrayHashAfterInsertionVis.idx} />
          </div>)
    }
}

$(document).ready(function() {
    /* TODO: properly apply stickyfill */
    /*let elements = $('.sticky-top');
    Stickyfill.add(elements);*/

    ReactDOM.render(
      <App />,
      document.getElementById('root')
    );
});