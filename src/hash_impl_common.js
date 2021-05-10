import {BigNumber} from 'bignumber.js';
import _ from 'lodash';

export function repr(obj, allowNull = false) {
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
    } else if (obj === null && allowNull) {
        res = ['jsnull', obj];
    } else {
        throw new Error(`Unknown key: ${JSON.stringify(obj)}`);
    }

    return JSON.stringify(res);
}

export function displayStr(obj, quoteString = true) {
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

class Int64 {
    SIZE = 64;
    JS_NUM_MAX_SIZE = 32;

    constructor(jsNumInt32 = 0) {
        this.JS_NUM_MAX_SIZE = 32;

        this.data = [];
        let signBit = jsNumInt32 >= 0 ? 0 : 1;

        for (let i = 0; i < this.JS_NUM_MAX_SIZE; ++i) {
            let bit = jsNumInt32 & (1 << i) ? 1 : 0;
            this.data.push(bit);
        }

        for (let i = this.JS_NUM_MAX_SIZE; i < this.SIZE; ++i) {
            this.data.push(signBit);
        }
    }

    xor(other) {
        for (let i = 0; i < this.SIZE; ++i) {
            this.data[i] ^= other.data[i];
        }

        return this;
    }

    sign() {
        return this.data[this.data.length - 1] == 1 ? -1 : 1;
    }

    inc() {
        this.data[0] += 1;
        this._carryOverAll();
    }

    eq(other) {
        for (let i = 0; i < this.SIZE; ++i) {
            if (this.data[i] != other.data[i]) {
                return false;
            }
        }
        return true;
    }

    add(other) {
        let carry = 0;
        for (let i = 0; i < this.SIZE; ++i) {
            this.data[i] += other.data[i] + carry;
            carry = (this.data[i] / 2) | 0;
            this.data[i] %= 2;
        }

        return this;
    }

    complement() {
        for (let i = 0; i < this.SIZE; ++i) {
            this.data[i] = this.data[i] == 0 ? 1 : 0;
        }

        return this;
    }

    mul(other) {
        let newData = [];

        for (let i = 0; i < this.SIZE; ++i) {
            newData[i] = 0;
        }

        for (let i = 0; i < this.SIZE; ++i) {
            if (this.data[i] === 0) {
                continue;
            }

            for (let j = 0; j < this.SIZE - i; ++j) {
                newData[i + j] += this.data[i] * other.data[j];
            }
        }

        this.data = newData;
        this._carryOverAll();

        return this;
    }

    toNumber() {
        let res = 0;
        for (let i = 0; i < 32; ++i) {
            if (this.data[i]) {
                res |= 1 << i;
            }
        }

        return res;
    }

    toStringDestroying() {
        let sign = this.sign();
        if (sign < 0) {
            this.complement().inc();
        }

        let decPower = [1];
        let decRes = [0];
        for (let i = 0; i < this.SIZE; ++i) {
            let carry = 0;
            if (this.data[i]) {
                for (let j = 0; j < decPower.length; ++j) {
                    if (j >= decRes.length) decRes.push(0);

                    decRes[j] += decPower[j] + carry;
                    carry = (decRes[j] / 10) | 0;
                    decRes[j] %= 10;
                }
            }
            if (carry) {
                decRes.push(carry);
            }

            carry = 0;
            for (let j = 0; j < decPower.length; ++j) {
                decPower[j] = decPower[j] * 2 + carry;
                carry = (decPower[j] / 10) | 0;
                decPower[j] %= 10;
            }
            if (carry) {
                decPower.push(carry);
            }
        }

        this.data = null;

        let res = [];
        if (sign < 0) res.push('-');
        for (let j = decRes.length - 1; j >= 0; j--) {
            res.push(String.fromCharCode('0'.charCodeAt(0) + decRes[j]));
        }

        return res.join('');
    }

    _carryOverAll() {
        let carry = 0;
        for (let i = 0; i < this.SIZE; ++i) {
            this.data[i] += carry;
            carry = (this.data[i] / 2) | 0;
            this.data[i] %= 2;
        }
    }
}

function pyHashStringAndUnicode(s) {
    let res = new Int64(s.charCodeAt(0) << 7);
    let magic = new Int64(1000003);

    for (let i = 0; i < s.length; ++i) {
        res.mul(magic).xor(new Int64(s.charCodeAt(i)));
    }

    res.xor(new Int64(s.length));

    if (res.eq(new Int64(-1))) {
        return '-2';
    } else {
        return res.toStringDestroying();
    }
}

export function pyHashString(s) {
    let sUtf8 = unescape(encodeURIComponent(s));
    return pyHashStringAndUnicode(sUtf8);
}

export function pyHashUnicode(s) {
    return pyHashStringAndUnicode(s);
}

export function pyHashLong(num) {
    const twoToPyLong_SHIFT = BigNumber(2).pow(30);
    const BASE = twoToPyLong_SHIFT;
    const _PyHASH_MODULUS = BigNumber(2)
        .pow(61)
        .minus(1);

    let x = BigNumber(0);
    let sign = 1;
    if (num.lt(0)) {
        sign = -1;
        num = num.negated();
    }

    let digits = [];
    while (num.gt(0)) {
        const d = num.mod(BASE);
        num = num.idiv(BASE);
        digits.push(d);
    }

    for (const d of digits.reverse()) {
        x = x
            .times(twoToPyLong_SHIFT)
            .plus(d)
            .modulo(_PyHASH_MODULUS);
    }

    if (sign < 0) {
        x = x.negated();
    }
    if (x.gte(BigNumber(2).pow(63))) {
        x = BigNumber(2)
            .pow(64)
            .minus(x);
    }

    if (x.eq(-1)) {
        x = BigNumber(-2);
    }

    return x;
}

export function pyHash(o) {
    if (typeof o === 'string') {
        return BigNumber(pyHashUnicode(o));
    } else if (typeof o === 'number') {
        // TODO:
        // throw new Error(`Plain JS numbers are not supported, use BigNumber`)
        return pyHashLong(BigNumber(o));
    } else if (BigNumber.isBigNumber(o)) {
        return pyHashLong(o);
    } else if (isNone(o)) {
        // TODO: for None hash seems to be always different
        return BigNumber(o._hashCode);
    } else {
        throw new Error('pyHash called with an object of unknown type: ' + JSON.stringify(o));
    }
}

export class BreakpointFunction {
    constructor() {
        this._breakpoints = [];
        this._extraBpContext = null;
    }

    addBP(point) {
        let bp = {
            point: point,
        };

        for (let key in this) {
            if (key[0] !== '_') {
                const value = this[key];
                if (value !== undefined && typeof value !== 'function') {
                    bp[key] = value;
                }
            }
        }

        if (this._extraBpContext) {
            for (let key in this._extraBpContext) {
                bp[key] = this._extraBpContext[key];
            }
        }

        this._breakpoints.push(bp);
    }

    setExtraBpContext(extraBpContext) {
        this._extraBpContext = extraBpContext;
    }

    getBreakpoints() {
        return this._breakpoints;
    }
}

export function joinBreakpoints(breakpointsList, prefixes) {
    const bps = [];
    const maxTime = Math.max(...breakpointsList.map(l => l.length));
    for (let i = 0; i < maxTime; ++i) {
        const newBp = {};
        for (const [breakpoints, prefix] of _.zip(breakpointsList, prefixes)) {
            const bp = breakpoints[Math.min(i, breakpoints.length - 1)];
            for (let key in bp) {
                newBp[prefix + '_' + key] = bp[key];
            }
        }
        bps.push(newBp);
    }
    console.log(bps);
    return bps;
}

export function computeIdx(hashCodeBig, len) {
    return +hashCodeBig
        .mod(len)
        .plus(len)
        .mod(len)
        .toString();
}

export class HashBreakpointFunction extends BreakpointFunction {
    computeIdx(hashCodeBig, len) {
        return computeIdx(hashCodeBig, len);
    }
}

class DummyClass {
    toString() {
        return 'DUMMY';
    }
}

class NoneClass {
    _hashCode = '-9223372036581563745';

    toString() {
        return 'None';
    }
}

export const DUMMY = new DummyClass();
export const None = new NoneClass();

export function isNone(o) {
    return o instanceof NoneClass;
}

export function isDummy(o) {
    return o instanceof DummyClass;
}

export function EQ(o1, o2) {
    if (BigNumber.isBigNumber(o1) && (BigNumber.isBigNumber(o2) || typeof o2 === 'number')) {
        return o1.eq(o2);
    } else if (BigNumber.isBigNumber(o2) && typeof o1 === 'number') {
        return o2.eq(o1);
    }

    return o1 === o2;
}

function signedToUnsigned(num) {
    if (num.lt(0)) {
        return num.plus(BigNumber(2).pow(64));
    } else {
        return num;
    }
}

export function computePerturb(hashCode) {
    return signedToUnsigned(hashCode);
}

export function nextIdxPerturb(idx, perturb, size) {
    return +BigNumber(5 * idx + 1)
        .plus(perturb)
        .mod(size)
        .toString();
}

export function perturbShift(perturb) {
    return perturb.idiv(BigNumber(2).pow(5)); // >>= 5
}
